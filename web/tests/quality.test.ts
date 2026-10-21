import { test } from "node:test";
import assert from "node:assert/strict";
import cases from "./fixtures/quality-cases.json";
test("quality cases provide distinct reproducible briefs and explicit criteria", () => {
  assert.equal(cases.length, 6);
  assert.equal(new Set(cases.map((c) => c.id)).size, 6);
  for (const c of cases) {
    assert.ok(c.prompt.length > 20);
    assert.ok(c.context.includes("Dependency-free Node.js"));
    assert.ok(c.expectedFiles.includes("tests/feature.test.mjs"));
    assert.ok(c.acceptanceCriteria.length >= 2);
  }
});
