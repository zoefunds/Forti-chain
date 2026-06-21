import { BrevoClient } from '@getbrevo/brevo';
import axios from 'axios';
import { db } from '../../db/index.js';
import { alertsSent, protocols, users, aiJudgments } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env.js';

const LEVEL_LABELS = ['', 'Warning', 'Restricted Mode', 'Emergency Pause', 'Full Containment'];
const LEVEL_COLORS = ['', '#FF9500', '#FF6B00', '#FF3B30', '#FF0000'];

export class AlertService {
  private brevo = new BrevoClient({ apiKey: env.BREVO_API_KEY });

  async dispatchAlerts(
    judgment: typeof aiJudgments.$inferSelect,
    protocol: typeof protocols.$inferSelect,
  ) {
    const dispatches: Promise<void>[] = [];

    if (protocol.alertEmail) {
      dispatches.push(this.sendEmail(judgment, protocol));
    }

    if (protocol.webhookUrl) {
      dispatches.push(this.sendWebhook(judgment, protocol));
    }

    // Also alert protocol owner (if they haven't opted out of email alerts)
    const [owner] = await db.select().from(users)
      .where(eq(users.id, protocol.userId)).limit(1);
    if (owner?.email && owner.email !== protocol.alertEmail && owner.emailAlertsEnabled !== false) {
      dispatches.push(this.sendEmail(judgment, protocol, owner.email));
    }

    await Promise.allSettled(dispatches);
  }

  private async sendEmail(
    judgment: typeof aiJudgments.$inferSelect,
    protocol: typeof protocols.$inferSelect,
    overrideEmail?: string,
  ) {
    const destination = overrideEmail ?? protocol.alertEmail!;
    const levelLabel = LEVEL_LABELS[judgment.level] ?? 'Unknown';
    const levelColor = LEVEL_COLORS[judgment.level] ?? '#888';

    try {
      await this.brevo.transactionalEmails.sendTransacEmail({
        sender: { email: env.EMAIL_FROM, name: 'FortiChain' },
        to: [{ email: destination }],
        subject: `[FortiChain] ${levelLabel} Alert — ${protocol.name}`,
        htmlContent: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0A0E1A;padding:24px;border-radius:8px 8px 0 0">
            <h1 style="color:#00D4FF;margin:0">&#x1F6E1; FortiChain Alert</h1>
          </div>
          <div style="background:#111827;padding:24px;border-left:4px solid ${levelColor}">
            <h2 style="color:${levelColor};margin-top:0">${levelLabel}</h2>
            <p style="color:#E5E7EB"><strong>Protocol:</strong> ${protocol.name}</p>
            <p style="color:#E5E7EB"><strong>Chain:</strong> ${protocol.chain}</p>
            <p style="color:#E5E7EB"><strong>Risk Score:</strong> ${judgment.riskScore}/100</p>
            <p style="color:#E5E7EB"><strong>Action Required:</strong> ${judgment.recommendedAction}</p>
            <hr style="border-color:#374151"/>
            <p style="color:#9CA3AF;font-size:12px">
              Judgment ID: ${judgment.id}<br/>
              Consensus: ${judgment.consensusReached ? 'Reached' : 'Pending'}<br/>
              Powered by GenLayer AI Validators
            </p>
          </div>
        </div>
        `,
      });

      await db.insert(alertsSent).values({
        judgmentId: judgment.id,
        protocolId: protocol.id,
        channel: 'email',
        destination,
        delivered: true,
        deliveredAt: new Date(),
      });
    } catch (err) {
      await db.insert(alertsSent).values({
        judgmentId: judgment.id,
        protocolId: protocol.id,
        channel: 'email',
        destination,
        delivered: false,
      });
    }
  }

  private async sendWebhook(
    judgment: typeof aiJudgments.$inferSelect,
    protocol: typeof protocols.$inferSelect,
  ) {
    const payload = {
      event: 'fortichain.judgment',
      level: judgment.level,
      levelLabel: LEVEL_LABELS[judgment.level],
      riskScore: judgment.riskScore,
      protocol: { id: protocol.id, name: protocol.name, chain: protocol.chain },
      recommendedAction: judgment.recommendedAction,
      judgmentId: judgment.id,
      consensusReached: judgment.consensusReached,
      timestamp: new Date().toISOString(),
    };

    try {
      await axios.post(protocol.webhookUrl!, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'X-FortiChain-Event': 'judgment' },
      });

      await db.insert(alertsSent).values({
        judgmentId: judgment.id,
        protocolId: protocol.id,
        channel: 'webhook',
        destination: protocol.webhookUrl!,
        payload,
        delivered: true,
        deliveredAt: new Date(),
      });
    } catch (err) {
      await db.insert(alertsSent).values({
        judgmentId: judgment.id,
        protocolId: protocol.id,
        channel: 'webhook',
        destination: protocol.webhookUrl!,
        payload,
        delivered: false,
      });
    }
  }
}
