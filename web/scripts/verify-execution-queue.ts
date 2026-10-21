// Opt-in integration check. Requires DATABASE_URL; only removes its own UUID-scoped fixtures.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { POST } from "../app/api/worker/route";

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
    const completion = { action: "complete", id: job.id, leaseToken: claimed[0].job.leaseToken,
      result: { status: "passed", exitCode: 0, log: "fixture", durationMs: 1 } };
    assert.equal((await call({ ...completion, leaseToken: randomUUID() })).status, 409);
    assert.equal((await call(completion)).status, 200);
    assert.equal((await call(completion)).status, 409, "Duplicate completion must be fenced");
    await db.executionJob.update({ where: { id: job.id }, data: { status: "running", leaseToken: completion.leaseToken, leaseUntil: new Date(0) } });
    assert.equal((await call(completion)).status, 409, "Expired completion must be fenced");
    assert.equal((await (await call({ action: "claim" })).json()).job, null);
    assert.equal((await db.executionJob.findUniqueOrThrow({ where: { id: job.id } })).status, "expired");
    console.log("Queue integration passed: authentication, atomic claim, completion fencing and lease expiry.");
  } finally {
    await db.executionJob.deleteMany({ where: { ownerId } });
    await db.$disconnect();
  }
}
main().catch(() => { console.error("Queue integration failed."); process.exitCode = 1; });
