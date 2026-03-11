import { test, expect } from "../fixtures/playground";

test.describe("Manual Connection", () => {
  test("should connect when selecting an agent", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await expect(playground.agentName).toHaveText("Echo Agent");
    await expect(playground.connectionStatus).toHaveText("connected");
  });

  test("should allow disconnect and reconnect from overview", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await playground.disconnectBtn.click();
    await expect(playground.connectionStatus).toHaveText("disconnected");
    await playground.connectBtn.click();
    await expect(playground.connectionStatus).toHaveText("connected", { timeout: 5000 });
  });

  test("should connect by typing URL in connection section", async ({ playground }) => {
    await playground.goto();
    // The connection section may not be visible without an agent, so select one first then disconnect
    await playground.selectAgent("mock-echo");
    await playground.disconnectBtn.click();
    // Clear and type a different mock URL
    await playground.connectionUrl.clear();
    await playground.connectionUrl.fill("mock://calculator");
    await playground.connectBtn.click();
    await expect(playground.connectionStatus).toHaveText("connected", { timeout: 5000 });
    await expect(playground.agentName).toHaveText("Calculator Agent");
  });
});
