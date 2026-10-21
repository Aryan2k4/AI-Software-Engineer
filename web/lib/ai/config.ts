export function resolveProvider(env: Record<string, string | undefined>): {
  provider: "groq" | "openai" | "ollama" | "demo";
  configured: boolean;
} {
  const selected =
    env.AI_PROVIDER?.trim() ||
    (env.GROQ_API_KEY?.trim()
      ? "groq"
      : env.OPENAI_API_KEY?.trim()
        ? "openai"
        : "demo");
  if (selected === "groq")
    return {
      provider: selected,
      configured: Boolean(env.GROQ_API_KEY?.trim()),
    };
  if (selected === "openai")
    return {
      provider: selected,
      configured: Boolean(env.OPENAI_API_KEY?.trim()),
    };
  if (selected === "ollama") return { provider: selected, configured: true };
  return { provider: "demo", configured: false };
}
