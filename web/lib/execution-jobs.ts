import { Prisma } from "@prisma/client";
import { db } from "./db";

export async function expireJobs(ownerId: string) {
  await db.executionJob.updateMany({
    where: { ownerId, status: "running", leaseUntil: { lt: new Date() } },
    data: { status: "expired", leaseToken: null, leaseUntil: null },
  });
}

export async function changeJob(ownerId: string, id: string, action: "retry" | "cancel") {
  await expireJobs(ownerId);
  // Only queued jobs can be cancelled; running code is bounded by the runner timeout.
  // Retry retains the original immutable snapshot and invalidates previous leases.
  return db.executionJob.updateMany({
    where: { id, ownerId, status: action === "cancel" ? "queued" : { in: ["failed", "timeout", "unavailable", "expired", "cancelled"] } },
    data: action === "cancel"
      ? { status: "cancelled" }
      : { status: "queued", result: Prisma.DbNull, leaseToken: null, leaseUntil: null },
  });
}

export function workerOnline(lastSeenAt: Date | null, now = Date.now()) {
  return Boolean(lastSeenAt && now - lastSeenAt.getTime() < 90000);
}
