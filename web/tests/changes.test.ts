import { test } from "node:test";
import assert from "node:assert/strict";
import { seed } from "../lib/domain";
import { previousArtifact, lineChanges } from "../lib/changes";
import { workerOnline } from "../lib/execution-jobs";
test("diff resolves nearest older version, including skipped files", () => {
  const project = seed().projects[0];
  const original = project.runs[0];
  const middle = { ...original, id: "middle", output: { ...original.output, files: [original.output.files[1]] } };
  const newest = { ...original, id: "newest" };
  project.runs = [newest, middle, original];
  assert.equal(previousArtifact(project, newest, original.output.files[0].path), original.output.files[0]);
  assert.equal(previousArtifact(project, original, original.output.files[0].path), undefined);
});
test("diff preserves unchanged context", () => {
  assert.deepEqual(lineChanges("a\nb\nc", "a\nx\nc"), { contextBefore: ["a"], removed: ["b"], added: ["x"], contextAfter: ["c"] });
  assert.deepEqual(lineChanges("a", "a").removed, []);
  assert.deepEqual(lineChanges("", "new").added, ["new"]);
});
test("worker presence expires without a fresh claim", () => {
  assert.equal(workerOnline(null, 100000), false);
  assert.equal(workerOnline(new Date(0), 100000), false);
  assert.equal(workerOnline(new Date(95000), 100000), true);
});
