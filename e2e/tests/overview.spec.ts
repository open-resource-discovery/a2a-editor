import { test, expect } from "../fixtures/playground";

test.describe("Agent Card Overview", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
  });

  test("should show agent name in header", async ({ playground }) => {
    await expect(playground.agentName).toHaveText("Echo Agent");
  });

  test("should show agent version", async ({ playground }) => {
    await expect(playground.agentVersion).toContainText("1.0.0");
  });

  test("should show agent description", async ({ playground }) => {
    await expect(playground.agentHeader).toContainText(
      "echo agent",
      { ignoreCase: true },
    );
    // The description comes from the mock agent card after connection
    await expect(playground.agentHeader).toContainText(
      "testing connectivity",
    );
  });

  test("should show skills section", async ({ playground }) => {
    await expect(playground.page.getByText(/Skills \(\d+\)/)).toBeVisible();
  });

  test("should show connection section with URL and status", async ({ playground }) => {
    await expect(playground.connectionUrl).toHaveValue("mock://echo");
    await expect(playground.connectionStatus).toHaveText("connected");
  });

  test("should show No Agent Card placeholder when empty", async ({ playground, page }) => {
    // Navigate fresh without selecting any agent
    await page.goto("/playground");
    await playground.waitForPlaygroundReady();
    await expect(page.getByText("No Agent Card")).toBeVisible();
  });
});
