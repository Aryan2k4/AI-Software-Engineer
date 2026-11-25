import { authConfigured, owner } from "@/lib/auth";
import { resolveProvider } from "@/lib/ai/config";
export async function GET() {
  const selected = resolveProvider(process.env);
  return Response.json({
    release: "2026.11.25.2",
    auth: authConfigured(),
    signedIn: Boolean(await owner()),
    provider: selected.configured ? selected.provider : "demo",
    storage: process.env.DATABASE_URL ? "postgres" : "browser",
  });
}
