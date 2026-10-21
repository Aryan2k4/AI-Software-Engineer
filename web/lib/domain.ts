import { z } from "zod";
export const artifactSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(180)
    .refine(
      (p) => !p.startsWith("/") && !p.includes("..") && !p.includes("\\"),
      "Use relative paths",
    ),
  content: z.string().max(40000),
  explanation: z.string().max(2000),
});
export const outputSchema = z.object({
  summary: z.string().min(1).max(12000),
  tasks: z.array(z.string().min(1).max(500)).min(1).max(20),
  files: z.array(artifactSchema).min(1).max(12),
  review: z.string().min(1).max(8000),
});
export type Output = z.infer<typeof outputSchema>;
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().max(500),
  status: z.enum(["Backlog", "In progress", "Done"]),
});
export const runSchema = z.object({
  id: z.string(),
  prompt: z.string().max(6000),
  createdAt: z.string(),
  mode: z.enum(["demo", "openai", "ollama", "groq"]),
  output: outputSchema,
  checks: z.array(
    z.object({ name: z.string(), passed: z.boolean(), detail: z.string() }),
  ),
});
export const projectSchema = z.object({
  id: z.string().max(100),
  name: z.string().min(1).max(80),
  description: z.string().max(1000),
  context: z.string().max(12000),
  createdAt: z.string(),
  tasks: z.array(taskSchema).max(500),
  runs: z.array(runSchema).max(30),
  files: z.array(artifactSchema).max(100),
  messages: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(12000),
        role: z.enum(["user", "assistant"]),
        at: z.string(),
      }),
    )
    .max(100),
});
export const workspaceSchema = z.object({
  projects: z.array(projectSchema).max(50),
});
export type Project = z.infer<typeof projectSchema>;
export type Run = z.infer<typeof runSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export function newProject(name: string, description: string): Project {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    context: "",
    createdAt: new Date().toISOString(),
    tasks: [],
    runs: [],
    files: [],
    messages: [],
  };
}
export function demoOutput(prompt: string): Output {
  const title = prompt.trim().slice(0, 80);
  return {
    summary: `Feature brief: ${title}\n\nGoal\n${prompt}\n\nAcceptance criteria\n• Define a successful user action and its failure state.\n• Validate input before changing persisted state.\n• Keep an audit record for changes.\n\nThis is an editable deterministic demo template. Connect a model for project-specific implementation.`,
    tasks: [
      `Define acceptance criteria: ${title}`,
      `Implement ${title}`,
      "Add failure-path tests",
      "Review access control and document rollout",
    ],
    files: [
      {
        path: "src/feature.ts",
        content: `// Demo scaffold for: ${title.replace(/[\r\n]/g, " ")}\nexport function validateInput(value: string): string {\n  const trimmed = value.trim();\n  if (!trimmed) throw new Error('Input is required');\n  return trimmed;\n}\n`,
        explanation:
          "An input-validation scaffold. Extend this function to implement the requested domain behavior.",
      },
      {
        path: "docs/feature.md",
        content: `# ${title}\n\n${prompt}\n\n## Delivery checklist\n- [ ] Implement business logic\n- [ ] Run application tests\n- [ ] Review permissions\n`,
        explanation:
          "Captures the feature intent and outstanding implementation steps.",
      },
    ],
    review:
      "Demo review: the scaffold validates empty input. Business logic, authorization, integration tests, and deployment remain to be implemented. No generated code has been executed.",
  };
}
export function checkArtifacts(output: Output) {
  return [
    {
      name: "Structured output",
      passed: outputSchema.safeParse(output).success,
      detail: "Validated required artifact fields and bounded content.",
    },
    {
      name: "Unique file paths",
      passed:
        new Set(output.files.map((f) => f.path)).size === output.files.length,
      detail: "Checks for duplicate output paths.",
    },
    {
      name: "No empty artifacts",
      passed: output.files.every((f) => f.content.trim().length > 0),
      detail: "Checks that every generated file has content.",
    },
  ];
}
export function applyRun(project: Project, run: Run): Project {
  const files = new Map(project.files.map((f) => [f.path, f]));
  run.output.files.forEach((f) => files.set(f.path, f));
  return {
    ...project,
    files: [...files.values()],
    runs: [run, ...project.runs].slice(0, 30),
    tasks: [
      ...project.tasks,
      ...run.output.tasks.map((title) => ({
        id: crypto.randomUUID(),
        title,
        status: "Backlog" as const,
      })),
    ].slice(-500),
    messages: [
      ...project.messages,
      {
        id: crypto.randomUUID(),
        text: run.prompt,
        role: "user" as const,
        at: run.createdAt,
      },
      {
        id: crypto.randomUUID(),
        text: run.output.summary,
        role: "assistant" as const,
        at: run.createdAt,
      },
    ].slice(-100),
  };
}
export function seed(): Workspace {
  return {
    projects: [
      [
        "Issue desk",
        "A small issue tracker with ownership, labels, and a clear audit trail.",
      ],
      ["Usage ledger", "Track product usage and make limits understandable."],
      [
        "Team handbook",
        "Keep team decisions and engineering context together.",
      ],
    ].map(([name, description], i) => {
      const p = newProject(name, description);
      p.id = `sample-${i + 1}`;
      const output = demoOutput(description);
      return applyRun(p, {
        id: `seed-${i}`,
        prompt: description,
        createdAt: p.createdAt,
        mode: "demo",
        output,
        checks: checkArtifacts(output),
      });
    }),
  };
}
