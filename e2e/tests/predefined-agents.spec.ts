import { test, expect } from "../fixtures/playground";

test.describe("Predefined Agents", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
  });

  test("should show 3 predefined mock agents", async ({ playground }) => {
    await expect(playground.agentCard("mock-echo")).toBeVisible();
    await expect(playground.agentCard("mock-translator")).toBeVisible();
    await expect(playground.agentCard("mock-calculator")).toBeVisible();
  });

  test("should filter agents by search", async ({ playground }) => {
    await playground.agentSearch.fill("echo");
    await expect(playground.agentCard("mock-echo")).toBeVisible();
    await expect(playground.agentCard("mock-translator")).toBeHidden();
    await expect(playground.agentCard("mock-calculator")).toBeHidden();
  });

  test("should clear search and show all agents", async ({ playground }) => {
    await playground.agentSearch.fill("echo");
    await expect(playground.agentCard("mock-translator")).toBeHidden();
    await playground.agentSearch.clear();
    await expect(playground.agentCard("mock-echo")).toBeVisible();
    await expect(playground.agentCard("mock-translator")).toBeVisible();
    await expect(playground.agentCard("mock-calculator")).toBeVisible();
  });

  test("should select agent on click", async ({ playground }) => {
    await playground.selectAgent("mock-echo");
    await expect(playground.agentCard("mock-echo")).toHaveClass(/border-primary/);
  });

  test("should deselect agent on second click", async ({ playground }) => {
    await playground.selectAgent("mock-echo");
    await expect(playground.agentCard("mock-echo")).toHaveClass(/border-primary/);
    await playground.agentCard("mock-echo").click();
    await expect(playground.agentCard("mock-echo")).not.toHaveClass(/border-primary/);
  });
});
