import axios from 'axios';
import { db } from '../db/index.js';
import { protocols, signalIngestions } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { workerHealth } from '../routes/admin.js';

// ── Etherscan — large on-chain flows ──────────────────────────────
async function ingestEtherscan(protocol: typeof protocols.$inferSelect) {
  if (!protocol.contractAddress || !env.ETHERSCAN_API_KEY) return;
  try {
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${protocol.contractAddress}&sort=desc&page=1&offset=20&apikey=${env.ETHERSCAN_API_KEY}`;
    const res = await axios.get(url, { timeout: 10000 });
    if (res.data.status !== '1') return;
    const txs = res.data.result as Array<Record<string, string>>;
    const largeFlows = txs.filter(tx => BigInt(tx.value ?? 0) > BigInt('10000000000000000000'));
    if (largeFlows.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'etherscan',
        content: {
          summary: `${largeFlows.length} large transaction(s) detected (>10 ETH)`,
          largeTransactions: largeFlows.slice(0, 5),
          count: largeFlows.length,
        },
      });
    }
  } catch {}
}

// ── Forta — security alerts ───────────────────────────────────────
async function ingestForta(protocol: typeof protocols.$inferSelect) {
  if (!protocol.contractAddress) return;
  try {
    const res = await axios.post('https://api.forta.network/graphql', {
      query: `query {
        alerts(input: {
          addresses: ["${protocol.contractAddress}"]
          first: 10
          severity: [CRITICAL, HIGH, MEDIUM]
        }) {
          alerts { alertId description severity protocol name createdAt }
        }
      }`,
    }, { timeout: 10000, headers: env.FORTA_API_KEY ? { Authorization: `Bearer ${env.FORTA_API_KEY}` } : {} });

    const alerts = res.data?.data?.alerts?.alerts ?? [];
    if (alerts.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'forta',
        content: {
          summary: `Forta: ${alerts.length} security alert(s) — highest: ${alerts[0]?.severity}`,
          alerts: alerts.slice(0, 5),
        },
      });
    }
  } catch {}
}

// ── DeFiLlama — TVL changes ───────────────────────────────────────
async function ingestDeFiLlama(protocol: typeof protocols.$inferSelect) {
  try {
    const searchRes = await axios.get('https://api.llama.fi/protocols', { timeout: 10000 });
    const all = searchRes.data as Array<{ name: string; slug: string; tvl: number; change_1d: number; change_7d: number }>;
    const match = all.find(p =>
      p.name.toLowerCase().includes(protocol.name.toLowerCase().split(' ')[0]) ||
      protocol.name.toLowerCase().includes(p.name.toLowerCase()),
    );
    if (!match) return;

    const change1d = match.change_1d ?? 0;
    if (Math.abs(change1d) >= 10) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'tvl',
        content: {
          summary: `TVL ${change1d > 0 ? 'increased' : 'dropped'} ${Math.abs(change1d).toFixed(1)}% in 24h (current: $${(match.tvl / 1e6).toFixed(1)}M)`,
          tvl: match.tvl,
          change1d,
          change7d: match.change_7d,
          protocol: match.slug,
        },
      });
    }
  } catch {}
}

// ── CoinGecko — price anomalies ───────────────────────────────────
async function ingestCoinGecko(protocol: typeof protocols.$inferSelect) {
  try {
    const query = protocol.name.split(' ')[0].toLowerCase();
    const headers: Record<string, string> = env.COINGECKO_API_KEY
      ? { 'x-cg-demo-api-key': env.COINGECKO_API_KEY }
      : {};

    const searchRes = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      { timeout: 8000, headers },
    );
    const coin = searchRes.data?.coins?.[0];
    if (!coin) return;

    const priceRes = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_24hr_change=true`,
      { timeout: 8000, headers },
    );
    const data = priceRes.data?.[coin.id];
    if (!data) return;

    const change = data.usd_24h_change ?? 0;
    if (Math.abs(change) >= 15) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'coingecko',
        content: {
          summary: `Token price ${change > 0 ? 'surged' : 'dropped'} ${Math.abs(change).toFixed(1)}% in 24h`,
          coinId: coin.id,
          symbol: coin.symbol,
          priceUsd: data.usd,
          change24h: change,
        },
      });
    }
  } catch {}
}

// ── News — DeFi security news via RSS ────────────────────────────
async function ingestNews(protocol: typeof protocols.$inferSelect) {
  try {
    const res = await axios.get(
      'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss/tag/defi&count=20',
      { timeout: 8000 },
    );
    const items = res.data?.items ?? [];
    const protocolWords = protocol.name.toLowerCase().split(/\s+/);
    const relevant = items.filter((item: any) =>
      protocolWords.some(word =>
        word.length > 3 &&
        (item.title?.toLowerCase().includes(word) || item.description?.toLowerCase().includes(word)),
      ),
    );
    if (relevant.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'news',
        content: {
          summary: `${relevant.length} news article(s) mentioning ${protocol.name}`,
          articles: relevant.slice(0, 3).map((a: any) => ({
            title: a.title,
            link: a.link,
            pubDate: a.pubDate,
          })),
        },
      });
    }
  } catch {}
}

// ── Twitter/X — social sentiment ─────────────────────────────────
async function ingestTwitter(protocol: typeof protocols.$inferSelect) {
  if (!env.TWITTER_BEARER_TOKEN) return;
  try {
    const query = encodeURIComponent(`${protocol.name} hack OR exploit OR vulnerability OR rugpull lang:en -is:retweet`);
    const res = await axios.get(
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=10&tweet.fields=created_at,public_metrics`,
      { timeout: 8000, headers: { Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}` } },
    );
    const tweets = res.data?.data ?? [];
    if (tweets.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'twitter',
        content: {
          summary: `${tweets.length} recent tweet(s) about ${protocol.name} security concerns`,
          tweets: tweets.slice(0, 5).map((t: any) => ({
            id: t.id,
            text: t.text?.slice(0, 200),
            createdAt: t.created_at,
            likes: t.public_metrics?.like_count,
            retweets: t.public_metrics?.retweet_count,
          })),
        },
      });
    }
  } catch {}
}

// ── Main tick ─────────────────────────────────────────────────────
async function tick() {
  workerHealth.signalIngestion.runs++;
  try {
    const activeProtocols = await db.select().from(protocols).where(eq(protocols.monitoringActive, true));
    await Promise.allSettled(
      activeProtocols.flatMap(p => [
        ingestEtherscan(p),
        ingestForta(p),
        ingestDeFiLlama(p),
        ingestCoinGecko(p),
        ingestNews(p),
        ingestTwitter(p),
      ]),
    );
    workerHealth.signalIngestion.lastRun = new Date();
  } catch (err) {
    workerHealth.signalIngestion.errors++;
    console.error('[signal-ingestion] tick error:', err);
  }
}

export function signalIngestionWorker() {
  tick();
  setInterval(tick, 60_000);
  console.log('  ✓ Signal ingestion worker started (60s interval, 6 sources)');
}
