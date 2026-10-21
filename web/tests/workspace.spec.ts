import { test, expect } from "@playwright/test";
import { seed, demoOutput } from "../lib/domain";
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
      await expect(
        page.getByText("Model artifacts saved.", { exact: false }),
      ).toBeVisible();
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
  expect(
    (
      await request.post("/api/run", { data: { prompt: "Create a project" } })
    ).status(),
  ).toBe(401);
});
