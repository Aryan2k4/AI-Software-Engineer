import { test, expect } from "@playwright/test";
import { seed, demoOutput } from "../lib/domain";
test("execution panel queues tests and displays actual worker result", async ({
  page,
}) => {
  const data = seed();
  let queued = false;
  await page.route("**/api/config", (r) =>
    r.fulfill({
      json: {
        auth: true,
        signedIn: true,
        provider: "groq",
        storage: "postgres",
      },
    }),
  );
  await page.route("**/api/workspace", (r) =>
    r.fulfill({ json: { data, revision: 0 } }),
  );
  await page.route("**/api/executions**", async (r) => {
    if (r.request().method() === "POST") {
      queued = true;
      await r.fulfill({ status: 202, json: { id: "job-1", status: "queued" } });
    } else
      await r.fulfill({
        json: {
          enabled: true,
          jobs: queued
            ? [
                {
                  id: "job-1",
                  runId: "seed-0",
                  status: "failed",
                  result: {
                    exitCode: 1,
                    durationMs: 120,
                    log: "Expected true but got false",
                  },
                },
              ]
            : [],
        },
      });
  });
  await page.goto("/#view=runs&project=sample-1");
  await page.getByRole("button", { name: "Run tests in isolation" }).click();
  await expect(page.getByText("Expected true but got false")).toBeVisible({
    timeout: 10000,
  });
  await expect(
    page.getByRole("button", { name: "Tests requested" }),
  ).toBeDisabled();
});
test.beforeEach(async ({ page }, info) => {
  if (!info.title.startsWith("first visit"))
    await page.addInitScript(() =>
      localStorage.setItem("ase-guide-v1", "dismissed"),
    );
});
test("first visit guide dismisses persistently and Help reopens it", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Getting started" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss guide" }).click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Getting started" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Getting started" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Getting started" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Help", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Getting started" }),
  ).toBeVisible();
});
test("assistant replies persist in the project conversation", async ({
  page,
}) => {
  let saved = seed();
  await page.route("**/api/config", (r) =>
    r.fulfill({
      json: {
        auth: true,
        signedIn: true,
        provider: "groq",
        storage: "postgres",
      },
    }),
  );
  await page.route("**/api/workspace", async (r) => {
    if (r.request().method() === "PUT") {
      saved = r.request().postDataJSON().data;
      await r.fulfill({ json: { revision: 1 } });
    } else await r.fulfill({ json: { data: saved, revision: 0 } });
  });
  await page.route("**/api/chat", (r) =>
    r.fulfill({
      json: {
        reply: "Inspect boundary cases before executing the generated tests.",
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /PROJECT \/ 01/ }).click();
  await page.getByRole("button", { name: "Assistant", exact: true }).click();
  await page
    .getByLabel("Your question")
    .fill("How should I verify this feature?");
  await page.getByRole("button", { name: "Send to assistant" }).click();
  await expect(
    page.getByText(
      "Inspect boundary cases before executing the generated tests.",
    ),
  ).toBeVisible();
  await expect
    .poll(() => saved.projects[0].messages.at(-1)?.text)
    .toBe("Inspect boundary cases before executing the generated tests.");
  await page.reload();
  await expect(
    page.getByText(
      "Inspect boundary cases before executing the generated tests.",
    ),
  ).toBeVisible();
});
for (const succeeds of [true, false]) {
  test(`Groq live ${succeeds ? "success persists artifacts" : "quota failure does not create demo run"}`, async ({
    page,
  }) => {
    let saved = seed();
    await page.route("**/api/config", (r) =>
      r.fulfill({
        json: {
          auth: true,
          signedIn: true,
          provider: "groq",
          storage: "postgres",
        },
      }),
    );
    await page.route("**/api/workspace", async (r) => {
      if (r.request().method() === "PUT") {
        saved = r.request().postDataJSON().data;
        await r.fulfill({ json: { revision: 1 } });
      } else await r.fulfill({ json: { data: saved, revision: 0 } });
    });
    await page.route("**/api/run", (r) =>
      r.fulfill(
        succeeds
          ? {
              json: {
                mode: "groq",
                output: {
                  ...demoOutput("Generated validation"),
                  summary: "Verified live transport fixture",
                },
                checks: [],
              },
            }
          : {
              status: 429,
              json: { error: "Groq quota reached. Wait before retrying." },
            },
      ),
    );
    await page.goto("/");
    await page.getByRole("button", { name: /PROJECT \/ 01/ }).click();
    await page
      .getByLabel("Feature request")
      .fill("Implement a small validation function");
    await page.getByRole("button", { name: "Start engineering run" }).click();
    if (succeeds) {
      await expect.poll(() => saved.projects[0].runs[0].mode).toBe("groq");
      await page.reload();
      await expect(
        page
          .getByText("Verified live transport fixture", { exact: false })
          .first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("Groq quota reached. Wait before retrying."),
      ).toBeVisible();
      expect(saved.projects[0].runs.length).toBe(1);
      await expect(
        page.getByText("Demo artifacts created.", { exact: false }),
      ).toHaveCount(0);
    }
  });
}
test("projects and every tool open, edits survive reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /PROJECT \/ 01/ }).click();
  await expect(
    page.getByRole("heading", { name: "Issue desk", exact: true }),
  ).toBeVisible();
  for (const [tab, heading] of [
    ["Repository", "Working files"],
    ["Changes", "Latest proposed changes"],
    ["Task board", "Backlog"],
    ["Project context", "Project memory"],
    ["Agent runs", "Run history"],
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(
      page
        .getByRole("heading", { name: heading, exact: heading !== "Backlog" })
        .first(),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page
    .getByLabel("Feature request")
    .fill("Add paginated search to issues");
  await page.getByRole("button", { name: "Start engineering run" }).click();
  await expect(
    page.getByText("Demo artifacts created.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Project context", exact: true })
    .click();
  await page
    .getByLabel("Project context", { exact: true })
    .fill("Use cursor pagination.");
  await page.getByRole("button", { name: "Save context" }).click();
  await page.reload();
  await expect(page.getByLabel("Project context", { exact: true })).toHaveValue(
    "Use cursor pagination.",
  );
  await page.getByRole("button", { name: "Task board", exact: true }).click();
  await page.getByLabel("New task").fill("Review pagination");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByLabel("Status for Review pagination").selectOption("Done");
  await page.reload();
  await expect(page.getByLabel("Status for Review pagination")).toHaveValue(
    "Done",
  );
});
test("anonymous users cannot access account data or live inference", async ({
  request,
}) => {
  expect((await request.get("/api/workspace")).status()).toBe(401);
  expect((await request.get("/api/executions?projectId=test")).status()).toBe(
    401,
  );
  expect(
    (
      await request.post("/api/executions", {
        data: { projectId: "test", runId: "test" },
      })
    ).status(),
  ).toBe(401);
  expect(
    (await request.post("/api/worker", { data: { action: "claim" } })).status(),
  ).toBe(401);
  expect(
    (await request.post("/api/chat", { data: { question: "Hello" } })).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/run", { data: { prompt: "Create a project" } })
    ).status(),
  ).toBe(401);
});
