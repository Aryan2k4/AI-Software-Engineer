import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGroq, ProviderError } from "../lib/ai/groq";
const input = {
  prompt: "Implement input validation",
  context: "Node.js",
  files: [],
};
const output = {
  summary: "Validate input",
  tasks: ["Implement validation"],
  files: [
    {
      path: "src/validate.js",
      content: "export const validate = x => Boolean(x);",
      explanation: "Validate input",
    },
  ],
  review: "Tests have not been executed.",
};
const response = (content: unknown = output, finish_reason = "stop") =>
  Response.json({
    choices: [
      {
        finish_reason,
        message: { role: "assistant", content: JSON.stringify(content) },
      },
    ],
  });
const opts = (fetcher: typeof fetch) => ({
  apiKey: "private-key",
  model: "test-model",
  fetcher,
});
test("Groq sends authenticated JSON request and returns validated artifacts", async () => {
  const value = await generateGroq(
    input,
    opts(async (url, init) => {
      assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        "Bearer private-key",
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "test-model");
      assert.equal(body.response_format.type, "json_object");
      assert.equal(body.messages[0].role, "system");
      assert.deepEqual(JSON.parse(body.messages[1].content), input);
      assert.ok(body.max_completion_tokens <= 4096);
      return response();
    }),
  );
  assert.deepEqual(value, output);
});
for (const [status, code] of [
  [401, "credentials"],
  [403, "credentials"],
  [429, "quota"],
  [503, "unavailable"],
  [400, "request"],
] as const) {
  test(`Groq ${status} is safe and does not fall back`, async () => {
    let calls = 0;
    await assert.rejects(
      generateGroq(
        input,
        opts(async () => {
          calls++;
          return new Response("private-key provider body", { status });
        }),
      ),
      (e: unknown) =>
        e instanceof ProviderError &&
        e.code === code &&
        !e.message.includes("private-key"),
    );
    assert.equal(calls, 1);
  });
}
for (const [name, make] of [
  ["malformed", () => new Response("not JSON")],
  ["missing content", () => Response.json({ choices: [] })],
  ["truncated", () => response(output, "length")],
  [
    "duplicate paths",
    () => response({ ...output, files: [...output.files, ...output.files] }),
  ],
  ["invalid schema", () => response({ summary: "only" })],
  ["oversized", () => new Response("x".repeat(1_000_001))],
  [
    "empty artifact",
    () =>
      response({ ...output, files: [{ ...output.files[0], content: " " }] }),
  ],
] as const) {
  test(`Groq rejects ${name}`, async () => {
    await assert.rejects(
      generateGroq(
        input,
        opts(async () => make()),
      ),
      ProviderError,
    );
  });
}
test("timeout errors are classified without leaking details", async () => {
  await assert.rejects(
    generateGroq(
      input,
      opts(async () => {
        throw new DOMException("private-key", "TimeoutError");
      }),
    ),
    (e: unknown) =>
      e instanceof ProviderError &&
      e.code === "timeout" &&
      !e.message.includes("private-key"),
  );
});
