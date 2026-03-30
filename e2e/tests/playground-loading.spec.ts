import { test, expect } from "../fixtures/playground";

test.describe("Playground Loading", () => {
  test("should load playground at /playground", async ({ playground }) => {
    await playground.goto();
    await expect(playground.tabOverview).toBeVisible();
  });

  test("should show three panels on desktop", async ({ playground }) => {
    await playground.goto();
    await expect(playground.settingsPanel).toBeVisible();
    await expect(playground.editorPanel).toBeVisible();
    await expect(playground.tabOverview).toBeVisible();
  });

  test("should show Overview, Chat, and Raw HTTP tabs", async ({ playground }) => {
    await playground.goto();
    await expect(playground.tabOverview).toBeVisible();
    await expect(playground.tabChat).toBeVisible();
    await expect(playground.tabRawHttp).toBeVisible();
  });

  test("should default to Overview tab", async ({ playground }) => {
    await playground.goto();
    await expect(playground.tabOverview).toHaveAttribute("data-state", "active");
  });
});
