import { owner } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin } from "@/lib/request";
import { operatorAllowed, supportedFiles } from "@/lib/execution";
import { workspaceSchema } from "@/lib/domain";
import { validateRunnerFiles } from "@/lib/runner";
import { z } from "zod";
export async function GET(request: Request) {
  const id = await owner();
  if (!id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId)
    return Response.json({ error: "Project required" }, { status: 400 });
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
    enabled:
      operatorAllowed(id, process.env.EXECUTION_OPERATOR_ID) &&
      Boolean(process.env.WORKER_TOKEN_HASH),
  });
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
