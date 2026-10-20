import { authConfigured, owner } from "@/lib/auth";
export async function GET() {
  return Response.json({
    auth: authConfigured(),
    signedIn: Boolean(await owner()),
    provider:
      process.env.AI_PROVIDER === "ollama"
        ? "ollama"
        : process.env.OPENAI_API_KEY
          ? "openai"
          : "demo",
    storage: process.env.DATABASE_URL ? "postgres" : "browser",
  });
}
