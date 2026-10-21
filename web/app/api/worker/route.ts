import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { workerAuthorized } from "@/lib/execution";
const resultSchema = z.object({
  status: z.enum(["passed", "failed", "timeout", "unavailable"]),
  exitCode: z.number().int().nullable(),
  log: z.string().max(1000000),
  durationMs: z.number().min(0).max(300000),
});
export async function POST(request: Request) {
  if (
    !workerAuthorized(
      request.headers.get("authorization"),
      process.env.WORKER_TOKEN_HASH,
    )
  )
    return Response.json({ error: "Unauthorized worker" }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 1100000)
      return Response.json({ error: "Too large" }, { status: 413 });
    const input = JSON.parse(raw);
    if (input.action === "claim") {
      const operator = process.env.EXECUTION_OPERATOR_ID;
      if (!operator)
        return Response.json(
          { error: "Operator not configured" },
          { status: 503 },
        );
      // Expired leases terminate instead of executing potentially non-idempotent code twice.
      await db.executionJob.updateMany({
        where: {
          ownerId: operator,
          status: "running",
          leaseUntil: { lt: new Date() },
        },
        data: { status: "expired", leaseToken: null },
      });
      const candidate = await db.executionJob.findFirst({
        where: { ownerId: operator, status: "queued" },
        orderBy: { createdAt: "asc" },
      });
      if (!candidate) return Response.json({ job: null });
      const leaseToken = randomUUID();
      const claimed = await db.executionJob.updateMany({
        where: { id: candidate.id, status: "queued" },
        data: {
          status: "running",
          leaseToken,
          leaseUntil: new Date(Date.now() + 120000),
        },
      });
      return Response.json({
        job: claimed.count
          ? { id: candidate.id, files: candidate.files, leaseToken }
          : null,
      });
    }
    const completed = z
      .object({
        action: z.literal("complete"),
        id: z.string().uuid(),
        leaseToken: z.string().uuid(),
        result: resultSchema,
      })
      .parse(input);
    const changed = await db.executionJob.updateMany({
      where: {
        id: completed.id,
        ownerId: process.env.EXECUTION_OPERATOR_ID ?? "",
        status: "running",
        leaseToken: completed.leaseToken,
        leaseUntil: { gt: new Date() },
      },
      data: {
        status: completed.result.status,
        result: completed.result,
        leaseToken: null,
        leaseUntil: null,
      },
    });
    return Response.json(
      { accepted: Boolean(changed.count) },
      { status: changed.count ? 200 : 409 },
    );
  } catch {
    return Response.json(
      { error: "Invalid worker request or unavailable database" },
      { status: 400 },
    );
  }
}
