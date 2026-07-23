import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("opens as a polished offline data app", async ({ page }) => {
  await expect(
    page.getByRole("textbox", { name: "Dataset title" }),
  ).toHaveValue("Launch tracker");
  await expect(page.getByText("Local", { exact: true })).toBeVisible();
  await expect(page.getByTestId("kanban-card")).toHaveCount(6);

  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => !url.startsWith("data:")),
  );
  expect(resources).toEqual([]);
});

test("has no automatically detectable accessibility violations", async ({
  page,
}) => {
  const violations: Array<{
    id: string;
    targets: unknown[];
    view: string;
  }> = [];

  for (const view of ["Kanban", "Grid", "Gallery"]) {
    if (view !== "Kanban") {
      await page.getByRole("button", { name: view }).click();
    }
    const results = await new AxeBuilder({ page }).analyze();

    violations.push(
      ...results.violations.map((violation) => ({
        view,
        id: violation.id,
        targets: violation.nodes.map((node) => node.target),
      })),
    );
  }

  expect(violations).toEqual([]);
});

test("searches, switches views and edits a record", async ({ page }) => {
  await page.getByTestId("search").fill("Show HN");
  await expect(page.getByTestId("kanban-card")).toHaveCount(1);

  await page.getByRole("button", { name: "Grid" }).click();
  await expect(page.getByTestId("grid-row")).toHaveCount(1);
  await page.getByTestId("grid-row").click();

  const drawer = page.getByTestId("record-drawer");
  await expect(drawer).toBeVisible();
  const nameField = drawer.getByLabel("Name");
  await nameField.fill("Publish the Show HN post");
  await drawer.getByTestId("save-record").click();

  await expect(page.getByText("Publish the Show HN post")).toBeVisible();
});

test("adds a record and supports keyboard navigation", async ({ page }) => {
  await page.getByTestId("add-record").click();
  const drawer = page.getByTestId("record-drawer");
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("Name").fill("New launch task");
  await drawer.getByLabel("Status").selectOption("Backlog");
  await drawer.getByTestId("save-record").click();

  await page.getByRole("button", { name: "Grid" }).click();
  await expect(page.getByTestId("grid-row")).toHaveCount(7);

  await page.keyboard.press("ControlOrMeta+K");
  await expect(page.getByTestId("search")).toBeFocused();
});

test("exports the edited app as a standalone HTML download", async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: undefined,
    });
  });

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("save-html").click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("launch-tracker.html");
  const path = await download.path();
  if (!path) {
    throw new Error("Playwright did not persist the downloaded Rowpack file.");
  }
  const html = await readFile(path, "utf8");
  expect(html).toContain("<!doctype html>");
  expect(html).toContain('"title":"Launch tracker"');
  expect(html).not.toContain("__ROWPACK_PAYLOAD__");
});
