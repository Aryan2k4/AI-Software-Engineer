import { owner } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/request";
import { operatorAllowed, supportedFiles } from "@/lib/execution";
import { workspaceSchema } from "@/lib/domain";
import { validateRunnerFiles } from "@/lib/runner";
import { z } from "zod";
import { changeJob, expireJobs, workerOnline } from "@/lib/execution-jobs";
export async function GET(request: Request) {
  const id = await owner();
  if (!id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId)
    return Response.json({ error: "Project required" }, { status: 400 });
  await expireJobs(id);
  const presence = await db.workerPresence.findUnique({ where: { ownerId: id } });
  const jobs = await db.executionJob.findMany({
    where: { ownerId: id, projectId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      runId: true,
      status: true,
      result: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return Response.json({
    jobs,
    worker: { online: workerOnline(presence?.lastSeenAt ?? null), lastSeenAt: presence?.lastSeenAt ?? null },
    enabled:
      operatorAllowed(id, process.env.EXECUTION_OPERATOR_ID) &&
      Boolean(process.env.WORKER_TOKEN_HASH),
  });
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const id = await owner();
  if (!id) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!operatorAllowed(id, process.env.EXECUTION_OPERATOR_ID))
    return Response.json({ error: "Operator access required" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 1000) return Response.json({ error: "Too large" }, { status: 413 });
    const input = z.object({ id: z.string().uuid(), action: z.enum(["retry", "cancel"]) }).parse(JSON.parse(raw));
    const changed = await changeJob(id, input.id, input.action);
    return Response.json(changed.count ? { status: input.action === "retry" ? "queued" : "cancelled" } : { error: "Job state changed. Refresh and try again." }, { status: changed.count ? 200 : 409 });
  } catch {
    return Response.json({ error: "Could not update execution." }, { status: 400 });
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const id = await owner();
  if (!id) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (
    !operatorAllowed(id, process.env.EXECUTION_OPERATOR_ID) ||
    !process.env.WORKER_TOKEN_HASH
  )
    return Response.json(
      { error: "Execution is restricted to the configured operator account." },
      { status: 403 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 2000)
      return Response.json({ error: "Request too large" }, { status: 413 });
    const { projectId, runId } = z
      .object({ projectId: z.string().max(100), runId: z.string().max(100) })
      .parse(JSON.parse(raw));
    const stored = await db.workspace.findUnique({ where: { ownerId: id } });
    const workspace = workspaceSchema.parse(stored?.data);
    const run = workspace.projects
      .find((p) => p.id === projectId)
      ?.runs.find((r) => r.id === runId);
    if (!run)
      return Response.json(
        { error: "Save the run before requesting execution." },
        { status: 404 },
      );
    const files = supportedFiles(run.output.files);
    validateRunnerFiles(files);
    const job = await db.executionJob.upsert({
      where: { ownerId_projectId_runId: { ownerId: id, projectId, runId } },
      create: { ownerId: id, projectId, runId, files },
      update: {},
      select: { id: true, status: true },
    });
    return Response.json(job, { status: 202 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Invalid execution request"
            : error instanceof Error &&
                /^(This runner supports|Supply 1|Unsupported or unsafe file path|Duplicate file path|Execution input exceeds|Include at least)/.test(error.message)
              ? error.message
              : "Could not queue execution.",
      },
      { status: 400 },
    );
  }
}
