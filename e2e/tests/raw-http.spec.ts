import { test, expect } from "../fixtures/playground";

test.describe("Raw HTTP Logs", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await playground.switchToTab("chat");
    await playground.sendMessage("Hello");
    await playground.waitForAgentResponse();
    await playground.switchToTab("rawhttp");
  });

  test("should show HTTP log entry after sending a message", async ({ playground }) => {
    await expect(playground.httpLogEntries.first()).toBeVisible();
  });

  test("should show POST method in log entry", async ({ playground }) => {
    await expect(playground.httpLogEntries.first()).toContainText("POST");
  });

  test("should show 200 status for mock agents", async ({ playground }) => {
    await expect(playground.httpLogEntries.first()).toContainText("200");
  });

  test("should expand log entry to show details", async ({ playground }) => {
    // Click the log entry to expand it
    await playground.httpLogEntries.first().click();
    // Should show request/response details
    await expect(playground.page.getByText("Request")).toBeVisible();
    await expect(playground.page.getByRole("heading", { name: "Response" })).toBeVisible();
  });

  test("should show JSON-RPC method in request body", async ({ playground }) => {
    await playground.httpLogEntries.first().click();
    await expect(playground.page.getByText("message/send")).toBeVisible();
  });
});
