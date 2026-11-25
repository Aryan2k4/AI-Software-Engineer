import { db } from "../db";
// Database-backed limits work across serverless instances. No inference on DB failure.
export async function takeAiQuota(ownerId: string, now = Date.now()) {
  const hour = Math.floor(now / 3600000);
  const expiresAt = new Date((hour + 1) * 3600000);
  const key = `${ownerId}:${hour}`;
  const usage = await db.aiUsage.upsert({ where: { key }, create: { key, count: 1, expiresAt }, update: { count: { increment: 1 } } });
  await db.aiUsage.deleteMany({ where: { expiresAt: { lt: new Date(now - 86400000) } } });
  return { allowed: usage.count <= 30, retryAfter: Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)) };
}
