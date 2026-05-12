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

  test("should remain selected on second click", async ({ playground }) => {
    await playground.selectAgent("mock-echo");
    await expect(playground.agentCard("mock-echo")).toHaveClass(/border-primary/);
    await playground.agentCard("mock-echo").click();
    await expect(playground.agentCard("mock-echo")).toHaveClass(/border-primary/);
  });

  test("should filter agents by URL", async ({ playground, page }) => {
    await page.route("**/unique-agent.example.com/.well-known/agent.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: "URL Search Agent",
          description: "",
          url: "https://unique-agent.example.com",
          version: "1.0.0",
          capabilities: {},
          skills: [],
          defaultInputModes: ["text"],
          defaultOutputModes: ["text"],
        }),
      });
    });

    await playground.addAgentBtn.click();
    await playground.addAgentUrl.fill("https://unique-agent.example.com");
    await playground.addAgentSubmit.click();
    await expect(
      page.locator("[data-testid^='agent-card-custom-']"),
    ).toBeVisible({ timeout: 10000 });

    await playground.agentSearch.fill("unique-agent.example");
    await expect(
      page.locator("[data-testid^='agent-card-custom-']"),
    ).toBeVisible();
    await expect(playground.agentCard("mock-echo")).toBeHidden();
  });
});
