import { z } from "zod";
import { owner } from "@/lib/auth";
import { sameOrigin } from "@/lib/request";
import { resolveProvider } from "@/lib/ai/config";
import { chatGroq, ProviderError } from "@/lib/ai/groq";
export const maxDuration = 120;
const schema = z.object({
  question: z.string().trim().min(1).max(4000),
  context: z.string().max(12000),
  files: z
    .array(
      z.object({ path: z.string().max(180), content: z.string().max(8000) }),
    )
    .max(5),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(12000),
      }),
    )
    .max(8),
});
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!(await owner()))
    return Response.json(
      { error: "Sign in to use the assistant." },
      { status: 401 },
    );
  const selected = resolveProvider(process.env);
  if (selected.provider !== "groq" || !selected.configured)
    return Response.json(
      { error: "The assistant requires a configured Groq provider." },
      { status: 503 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 100000)
      return Response.json(
        { error: "Conversation is too large. Start with a shorter question." },
        { status: 413 },
      );
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      return Response.json({ error: "Invalid chat request." }, { status: 400 });
    const { question, context, files, messages } = parsed.data;
    const reply = await chatGroq(
      { prompt: JSON.stringify({ question, messages }), context, files },
      {
        apiKey: process.env.GROQ_API_KEY!,
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      },
    );
    return Response.json({ reply });
  } catch (error) {
    if (error instanceof ProviderError)
      return Response.json({ error: error.message }, { status: error.status });
    return Response.json(
      { error: "Unable to process chat request." },
      { status: 502 },
    );
  }
}
