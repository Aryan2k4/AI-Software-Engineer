import { owner } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceSchema } from "@/lib/domain";
import { sameOrigin } from "@/lib/request";
export async function GET() {
  const id = await owner();
  if (!id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const row = await db.workspace.findUnique({ where: { ownerId: id } });
  return Response.json({
    data: row?.data ?? { projects: [] },
    revision: row?.revision ?? 0,
  });
}
export async function PUT(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const id = await owner();
  if (!id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const text = await request.text();
  if (text.length > 2_000_000)
    return Response.json({ error: "Workspace exceeds 2 MB" }, { status: 413 });
  try {
    const body = JSON.parse(text);
    const data = workspaceSchema.parse(body.data);
    const revision = body.revision;
    if (!Number.isInteger(revision) || revision < 0) throw new Error();
    await db.workspace.upsert({
      where: { ownerId: id },
      create: { ownerId: id, data: { projects: [] } },
      update: {},
    });
    const changed = await db.workspace.updateMany({
      where: { ownerId: id, revision },
      data: {
        data: JSON.parse(JSON.stringify(data)),
        revision: { increment: 1 },
      },
    });
    if (!changed.count)
      return Response.json(
        { error: "Workspace changed in another tab. Reload before saving." },
        { status: 409 },
      );
    return Response.json({ revision: revision + 1 });
  } catch {
    return Response.json(
      { error: "Invalid workspace or unavailable database" },
      { status: 400 },
    );
  }
}
