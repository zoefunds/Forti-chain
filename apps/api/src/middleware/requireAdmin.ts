import { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  if ((req.user as any)?.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin access required' });
  }
}
