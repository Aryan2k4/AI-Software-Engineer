import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRunnerFiles, runNodeTests } from "../lib/runner";
const file = {
  path: "tests/example.test.mjs",
  content: 'import test from "node:test"; test("ok",()=>{});',
};
test("runner accepts bounded dependency-free test projects", () =>
  assert.doesNotThrow(() => validateRunnerFiles([file])));
for (const path of [
  "../escape.js",
  "/etc/test.js",
  "src/../../escape.js",
  "tests\\x.test.js",
  "tests/x:bad.test.js",
  "tests//x.test.js",
  ".github/workflows/run.yml",
  "package.json",
])
  test(`runner rejects ${path}`, () =>
    assert.throws(() => validateRunnerFiles([{ ...file, path }])));
test("runner rejects absent tests, duplicate paths and oversized content", () => {
  assert.throws(() =>
    validateRunnerFiles([{ path: "src/app.js", content: "hello" }]),
  );
  assert.throws(() => validateRunnerFiles([file, file]));
  assert.throws(() =>
    validateRunnerFiles([{ ...file, content: "x".repeat(500001) }]),
  );
});
test("runner requires pinned image before executing", async () => {
  await assert.rejects(
    runNodeTests([file], { image: "node:22-alpine" }),
    /pinned/,
  );
});
const image = process.env.RUNNER_IMAGE;
test(
  "Docker runner executes tests without secrets or network",
  { skip: !image },
  async () => {
    const result = await runNodeTests(
      [
        {
          path: "tests/isolation.test.mjs",
          content: `import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('no secrets',()=>assert.equal(process.env.GROQ_API_KEY,undefined));
test('non-root',()=>assert.notEqual(process.getuid(),0));
test('read-only workspace',()=>assert.throws(()=>fs.writeFileSync('/workspace/escape','x')));
test('no network',async()=>{await assert.rejects(fetch('https://example.com',{signal:AbortSignal.timeout(1000)}));});`,
        },
      ],
      { image: image! },
    );
    assert.equal(result.status, "passed", result.log);
  },
);
test("Docker runner records failing tests", { skip: !image }, async () => {
  const result = await runNodeTests(
    [
      {
        ...file,
        content:
          'import test from "node:test";test("intentional failure",()=>{throw new Error("expected");});',
      },
    ],
    { image: image! },
  );
  assert.equal(result.status, "failed");
  assert.notEqual(result.exitCode, 0);
});
test("Docker runner terminates hung programs", { skip: !image }, async () => {
  const result = await runNodeTests([{ ...file, content: "while(true){}" }], {
    image: image!,
    timeoutMs: 1500,
  });
  assert.equal(result.status, "timeout");
});
