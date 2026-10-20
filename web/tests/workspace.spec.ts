import { test, expect } from "@playwright/test";
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
