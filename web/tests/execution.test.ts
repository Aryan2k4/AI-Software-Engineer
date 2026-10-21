import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  workerAuthorized,
  operatorAllowed,
  supportedFiles,
} from "../lib/execution";
test("worker credentials are fail-closed", () => {
  const hash = createHash("sha256").update("secret").digest("hex");
  assert.equal(workerAuthorized("Bearer secret", hash), true);
  for (const header of [null, "secret", "Bearer wrong"])
    assert.equal(workerAuthorized(header, hash), false);
  assert.equal(workerAuthorized("Bearer secret", undefined), false);
});
test("execution only accepts configured operator", () => {
  assert.equal(operatorAllowed("github:1", "github:1"), true);
  assert.equal(operatorAllowed("github:2", "github:1"), false);
  assert.equal(operatorAllowed(null, undefined), false);
});
test("unsupported package projects are rejected instead of silently altered", () => {
  assert.throws(
    () => supportedFiles([{ path: "package.json", content: "{}" }]),
    /dependency-free/,
  );
  assert.deepEqual(
    supportedFiles([
      { path: "README.md", content: "docs" },
      { path: "tests/a.test.mjs", content: "test" },
    ]),
    [{ path: "tests/a.test.mjs", content: "test" }],
  );
});
