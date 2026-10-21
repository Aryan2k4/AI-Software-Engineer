import { test } from "node:test";
import assert from "node:assert/strict";
import { chatGroq, ProviderError } from "../lib/ai/groq";
const input = {
  prompt: "Explain the tests",
  context: "Node project",
  files: [],
};
test("assistant returns bounded advice through Groq", async () => {
  const reply = await chatGroq(input, {
    apiKey: "test-secret",
    model: "model",
    fetcher: async (_, init) => {
      const request = JSON.parse(String(init?.body));
      assert.match(request.messages[0].content, /cannot change files/);
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                reply: "Run the tests in isolation; I have not executed them.",
              }),
            },
          },
        ],
      });
    },
  });
  assert.match(reply, /not executed/);
});
for (const reply of ["", null, "x".repeat(12001)])
  test(`rejects invalid assistant reply ${String(reply).length}`, async () => {
    await assert.rejects(
      chatGroq(input, {
        apiKey: "test",
        model: "model",
        fetcher: async () =>
          Response.json({
            choices: [
              {
                finish_reason: "stop",
                message: { content: JSON.stringify({ reply }) },
              },
            ],
          }),
      }),
      ProviderError,
    );
  });
