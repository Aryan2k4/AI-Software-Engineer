import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  newProject,
  demoOutput,
  applyRun,
  checkArtifacts,
  workspaceSchema,
  artifactSchema,
  runSchema,
} from "../lib/domain";
test("Groq and legacy run modes survive serialization", () => {
  for (const mode of ["groq", "openai", "ollama", "demo"]) {
    const run = {
      id: "test",
      createdAt: new Date().toISOString(),
      prompt: "Test prompt",
      mode,
      output: demoOutput("Test feature"),
      checks: [],
    };
    const parsed = runSchema.parse(JSON.parse(JSON.stringify(run)));
    const project = applyRun(newProject("Persistence", "Test"), parsed);
    const restored = workspaceSchema.parse(
      JSON.parse(JSON.stringify({ projects: [project] })),
    );
    assert.equal(restored.projects[0].runs[0].mode, mode);
    assert.equal(
      restored.projects[0].files[0].content,
      run.output.files[0].content,
    );
  }
});
test("seeded projects have independent accessible artifacts", () => {
  const data = seed();
  assert.equal(new Set(data.projects.map((p) => p.id)).size, 3);
  for (const p of data.projects) {
    assert.ok(p.files.length);
    assert.ok(p.runs.length);
    assert.ok(p.tasks.length);
  }
  assert.ok(workspaceSchema.safeParse(data).success);
});
test("running a feature preserves context and records artifacts and conversation", () => {
  const p = newProject("Test", "Example");
  p.context = "Use TypeScript";
  const output = demoOutput("Add search to the issue tracker");
  const next = applyRun(p, {
    id: "run-1",
    createdAt: new Date().toISOString(),
    prompt: "Add search to the issue tracker",
    mode: "demo",
    output,
    checks: checkArtifacts(output),
  });
  assert.equal(next.context, p.context);
  assert.equal(next.messages.length, 2);
  assert.equal(next.tasks.length, 4);
  assert.equal(next.files.length, 2);
  assert.equal(p.runs.length, 0);
  assert.ok(
    workspaceSchema.safeParse(JSON.parse(JSON.stringify({ projects: [next] })))
      .success,
  );
});
test("generated paths cannot escape artifact root", () => {
  for (const path of ["../secret", "/etc/passwd", "src\\file"])
    assert.equal(
      artifactSchema.safeParse({ path, content: "x", explanation: "x" })
        .success,
      false,
    );
});
test("checks detect duplicate files without claiming tests executed", () => {
  const output = demoOutput("Create an issue tracker");
  output.files.push(output.files[0]);
  assert.equal(checkArtifacts(output)[1].passed, false);
});
