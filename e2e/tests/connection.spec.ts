import { test, expect } from "../fixtures/playground";

test.describe("Connection Flow", () => {
  test("should auto-connect when selecting Echo Agent", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await expect(playground.connectionStatus).toHaveText("connected");
  });

  test("should display agent details in overview after connecting", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await expect(playground.agentName).toHaveText("Echo Agent");
    await expect(playground.agentVersion).toContainText("1.0.0");
  });

  test("should populate editor with agent card JSON", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    // Verify the editor has content by checking the toolbar buttons are enabled
    await expect(playground.toolbarFormat).toBeEnabled();
  });

  test("should disconnect and return to disconnected state", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await expect(playground.connectionStatus).toHaveText("connected");
    await playground.disconnectBtn.click();
    await expect(playground.connectionStatus).toHaveText("disconnected");
  });
});
