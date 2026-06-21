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

// ── GoPlus Security — contract risk scan (no API key needed) ─────
async function ingestGoPlus(protocol: typeof protocols.$inferSelect) {
  if (!protocol.contractAddress) return;
  try {
    const chainMap: Record<string, string> = {
      ethereum: '1', arbitrum: '42161', optimism: '10',
      polygon: '137', base: '8453', bnb: '56', avalanche: '43114',
    };
    const chainId = chainMap[protocol.chain?.toLowerCase()] ?? '1';
    const res = await axios.get(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${protocol.contractAddress}`,
      { timeout: 10000 },
    );
    const result = res.data?.result?.[protocol.contractAddress.toLowerCase()];
    if (!result) return;

    const risks: string[] = [];
    if (result.is_honeypot === '1') risks.push('HONEYPOT detected');
    if (result.is_blacklisted === '1') risks.push('contract blacklisted');
    if (result.is_proxy === '1') risks.push('upgradeable proxy');
    if (result.can_take_back_ownership === '1') risks.push('ownership reclaim risk');
    if (result.owner_change_balance === '1') risks.push('owner can change balances');
    if (result.hidden_owner === '1') risks.push('hidden owner');
    if (result.selfdestruct === '1') risks.push('self-destruct enabled');
    if (Number(result.buy_tax) > 10) risks.push(`high buy tax: ${result.buy_tax}%`);
    if (Number(result.sell_tax) > 10) risks.push(`high sell tax: ${result.sell_tax}%`);

    if (risks.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'goplus',
        content: {
          summary: `GoPlus: ${risks.length} risk flag(s) — ${risks.join(', ')}`,
          risks,
          contractAddress: protocol.contractAddress,
          chainId,
          raw: {
            isHoneypot: result.is_honeypot,
            buyTax: result.buy_tax,
            sellTax: result.sell_tax,
            holderCount: result.holder_count,
          },
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

// ── Reddit — community security sentiment (free, no key) ─────────
async function ingestReddit(protocol: typeof protocols.$inferSelect) {
  try {
    const query = encodeURIComponent(`${protocol.name} hack exploit vulnerability rugpull`);
    const subreddits = 'defi+ethereum+CryptoCurrency+ethfinance';
    const res = await axios.get(
      `https://www.reddit.com/r/${subreddits}/search.json?q=${query}&sort=new&limit=10&restrict_sr=1&t=day`,
      { timeout: 8000, headers: { 'User-Agent': 'FortiChain/1.0 security-monitor' } },
    );
    const posts = res.data?.data?.children ?? [];
    const relevant = posts.filter((p: any) => {
      const text = `${p.data?.title} ${p.data?.selftext}`.toLowerCase();
      const name = protocol.name.toLowerCase();
      return text.includes(name.split(' ')[0]);
    });
    if (relevant.length > 0) {
      await db.insert(signalIngestions).values({
        protocolId: protocol.id,
        source: 'reddit',
        content: {
          summary: `${relevant.length} Reddit post(s) about ${protocol.name} security concerns`,
          posts: relevant.slice(0, 5).map((p: any) => ({
            title: p.data?.title?.slice(0, 200),
            url: `https://reddit.com${p.data?.permalink}`,
            score: p.data?.score,
            comments: p.data?.num_comments,
            created: new Date(p.data?.created_utc * 1000).toISOString(),
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
        ingestGoPlus(p),
        ingestDeFiLlama(p),
        ingestCoinGecko(p),
        ingestNews(p),
        ingestReddit(p),
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
  console.log('  ✓ Signal ingestion worker started (60s interval, 6 sources: Etherscan·GoPlus·DeFiLlama·CoinGecko·News·Reddit)');
}
