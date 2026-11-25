// Opt-in integration check. Requires DATABASE_URL; only removes its own UUID-scoped fixtures.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { POST } from "../app/api/worker/route";
import { changeJob, workerOnline } from "../lib/execution-jobs";
import { takeAiQuota } from "../lib/ai/quota";

async function main() {
  const ownerId = `queue-verification:${randomUUID()}`;
  const token = randomUUID();
  process.env.EXECUTION_OPERATOR_ID = ownerId;
  process.env.WORKER_TOKEN_HASH = createHash("sha256").update(token).digest("hex");
  const call = (body: unknown, credential: string = token) => POST(new Request("http://localhost/api/worker", {
    method: "POST", headers: { authorization: `Bearer ${credential}` }, body: JSON.stringify(body),
  }));
  try {
    assert.equal((await call({ action: "claim" }, "wrong")).status, 401);
    const job = await db.executionJob.create({ data: { ownerId, projectId: randomUUID(), runId: randomUUID(), files: [] } });
    const responses = await Promise.all([call({ action: "claim" }), call({ action: "claim" })]);
    const claimed = (await Promise.all(responses.map((r) => r.json()))).filter((r) => r.job);
    assert.equal(claimed.length, 1, "Only one worker may claim a job");
    assert.equal(workerOnline((await db.workerPresence.findUniqueOrThrow({ where: { ownerId } })).lastSeenAt), true);
    assert.equal((await changeJob(ownerId, job.id, "cancel")).count, 0, "Running jobs cannot be cancelled");
    const completion = { action: "complete", id: job.id, leaseToken: claimed[0].job.leaseToken,
      result: { status: "passed", exitCode: 0, log: "fixture", durationMs: 1 } };
    assert.equal((await call({ ...completion, leaseToken: randomUUID() })).status, 409);
    assert.equal((await call(completion)).status, 200);
    assert.equal((await call(completion)).status, 409, "Duplicate completion must be fenced");
    await db.executionJob.update({ where: { id: job.id }, data: { status: "running", leaseToken: completion.leaseToken, leaseUntil: new Date(0) } });
    assert.equal((await call(completion)).status, 409, "Expired completion must be fenced");
    assert.equal((await (await call({ action: "claim" })).json()).job, null);
    assert.equal((await db.executionJob.findUniqueOrThrow({ where: { id: job.id } })).status, "expired");
    assert.equal((await changeJob("other-owner", job.id, "retry")).count, 0);
    assert.equal((await changeJob(ownerId, job.id, "retry")).count, 1);
    assert.equal((await changeJob(ownerId, job.id, "retry")).count, 0, "Duplicate retry must not reset an active job");
    assert.equal((await changeJob(ownerId, job.id, "cancel")).count, 1);
    assert.equal((await (await call({ action: "claim" })).json()).job, null, "Cancelled jobs cannot be claimed");
    const now = Date.now();
    await db.aiUsage.create({ data: { key: `${ownerId}:${Math.floor(now / 3600000)}`, count: 29, expiresAt: new Date(now + 3600000) } });
    const quotaResults = await Promise.all([takeAiQuota(ownerId, now), takeAiQuota(ownerId, now)]);
    assert.equal(quotaResults.filter((q) => q.allowed).length, 1, "Concurrent requests obey the quota");
    console.log("Queue integration passed: authentication, atomic claim, completion fencing and lease expiry.");
  } finally {
    await db.executionJob.deleteMany({ where: { ownerId } });
    await db.workerPresence.deleteMany({ where: { ownerId } });
    await db.aiUsage.deleteMany({ where: { key: { startsWith: `${ownerId}:` } } });
    await db.$disconnect();
  }
}
main().catch(() => { console.error("Queue integration failed."); process.exitCode = 1; });
