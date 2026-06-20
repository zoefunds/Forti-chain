import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { protocols, threatEvents, aiJudgments } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { GenLayerService } from '../services/genlayer/genLayerService.js';

const ProtocolSchema = z.object({
  name: z.string().min(1).max(100),
  chain: z.string().min(1),
  contractAddress: z.string().optional(),
  category: z.enum(['lending', 'dex', 'bridge', 'yield', 'derivatives', 'dao', 'other']),
  websiteUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
  alertEmail: z.string().email().optional(),
});

export async function protocolRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  // GET /protocols
  app.get('/', async (req) => {
    return db.select().from(protocols)
      .where(eq(protocols.userId, req.user.id))
      .orderBy(desc(protocols.createdAt));
  });

  // POST /protocols
  app.post('/', async (req, reply) => {
    const body = ProtocolSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const [protocol] = await db.insert(protocols).values({
      ...body.data,
      userId: req.user.id,
    }).returning();

    // Register on-chain asynchronously — don't block the HTTP response
    const genLayer = new GenLayerService();
    genLayer.registerProtocolOnChain(protocol).catch((err) =>
      console.error('[GenLayer] background register_protocol failed:', err),
    );

    return reply.status(201).send(protocol);
  });

  // GET /protocols/contract-stats — on-chain FortiChain Sentinel stats
  app.get('/contract-stats', async (_req, reply) => {
    const genLayer = new GenLayerService();
    const stats = await genLayer.getContractStats();
    if (!stats) return reply.send({ available: false, contractAddress: null });
    return { available: true, contractAddress: process.env.GENLAYER_CONTRACT_ADDRESS, stats };
  });

  // GET /protocols/:id
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [protocol] = await db.select().from(protocols)
      .where(and(eq(protocols.id, id), eq(protocols.userId, req.user.id))).limit(1);
    if (!protocol) return reply.status(404).send({ error: 'Not found' });
    return protocol;
  });

  // PUT /protocols/:id
  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = ProtocolSchema.partial().safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const [updated] = await db.update(protocols)
      .set({ ...body.data, updatedAt: new Date() })
      .where(and(eq(protocols.id, id), eq(protocols.userId, req.user.id)))
      .returning();
    if (!updated) return reply.status(404).send({ error: 'Not found' });
    return updated;
  });

  // DELETE /protocols/:id
  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [deleted] = await db.delete(protocols)
      .where(and(eq(protocols.id, id), eq(protocols.userId, req.user.id)))
      .returning({ id: protocols.id });
    if (!deleted) return reply.status(404).send({ error: 'Not found' });
    return { ok: true };
  });

  // POST /protocols/:id/analyze — triggers GenLayer judgment
  app.post('/:id/analyze', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [protocol] = await db.select().from(protocols)
      .where(and(eq(protocols.id, id), eq(protocols.userId, req.user.id))).limit(1);
    if (!protocol) return reply.status(404).send({ error: 'Not found' });

    const genLayer = new GenLayerService();
    const judgment = await genLayer.analyzeProtocol(protocol, req.user);
    return judgment;
  });

  // GET /protocols/:id/chain-risk — fetch latest judgment directly from contract
  app.get('/:id/chain-risk', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [protocol] = await db.select().from(protocols)
      .where(and(eq(protocols.id, id), eq(protocols.userId, req.user.id))).limit(1);
    if (!protocol) return reply.status(404).send({ error: 'Not found' });
    const genLayer = new GenLayerService();
    const judgment = await genLayer.getProtocolRiskFromChain(protocol.id);
    return { protocolId: protocol.id, chainJudgment: judgment };
  });

  // GET /protocols/:id/judgments
  app.get('/:id/judgments', async (req, reply) => {
    const { id } = req.params as { id: string };
    const [protocol] = await db.select().from(protocols)
      .where(and(eq(protocols.id, id), eq(protocols.userId, req.user.id))).limit(1);
    if (!protocol) return reply.status(404).send({ error: 'Not found' });
    return db.select().from(aiJudgments)
      .where(eq(aiJudgments.protocolId, id))
      .orderBy(desc(aiJudgments.createdAt))
      .limit(50);
  });
}
