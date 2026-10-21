import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveProvider } from "../lib/ai/config";
test("provider selection is explicit and never falls through a missing selected key", () => {
  assert.deepEqual(resolveProvider({}), {
    provider: "demo",
    configured: false,
  });
  assert.deepEqual(resolveProvider({ GROQ_API_KEY: "secret" }), {
    provider: "groq",
    configured: true,
  });
  assert.deepEqual(
    resolveProvider({ AI_PROVIDER: "groq", OPENAI_API_KEY: "secret" }),
    { provider: "groq", configured: false },
  );
  assert.deepEqual(
    resolveProvider({
      AI_PROVIDER: "openai",
      GROQ_API_KEY: "secret",
      OPENAI_API_KEY: "secret",
    }),
    { provider: "openai", configured: true },
  );
  assert.deepEqual(resolveProvider({ AI_PROVIDER: "ollama" }), {
    provider: "ollama",
    configured: true,
  });
  assert.deepEqual(
    resolveProvider({ AI_PROVIDER: "unknown", OPENAI_API_KEY: "secret" }),
    { provider: "demo", configured: false },
  );
});
