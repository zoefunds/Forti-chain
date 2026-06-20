import { db } from '../../db/index.js';
import { notifications } from '../../db/schema.js';

const TIER_LABELS = ['Safe', 'Warning', 'Restricted', 'Emergency', 'Critical'];

export class NotificationService {
  async create(userId: string, payload: {
    type: string;
    title: string;
    body: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }) {
    const [notif] = await db.insert(notifications).values({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      metadata: payload.metadata,
    }).returning();
    return notif;
  }

  async judgment(userId: string, protocolName: string, protocolId: string, level: number, riskScore: number, judgmentId: string) {
    const tier = Math.min(4, Math.max(0, level - 1));
    const tierLabel = TIER_LABELS[tier];
    return this.create(userId, {
      type: 'judgment',
      title: `${tierLabel} — ${protocolName}`,
      body: `AI consensus reached: risk score ${riskScore}/100. ${level >= 3 ? 'Immediate action recommended.' : 'Continue monitoring.'}`,
      link: `/dashboard/protocols/${protocolId}`,
      metadata: { judgmentId, level, riskScore, protocolId },
    });
  }

  async systemAlert(userId: string, title: string, body: string, link?: string) {
    return this.create(userId, { type: 'system', title, body, link });
  }

  async emailVerified(userId: string) {
    return this.create(userId, {
      type: 'verification',
      title: 'Email verified',
      body: 'Your email address has been verified. All features are now unlocked.',
    });
  }
}
