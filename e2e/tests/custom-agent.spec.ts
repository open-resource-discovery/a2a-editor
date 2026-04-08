import { test, expect } from "../fixtures/playground";

test.describe("Custom Agent", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
  });

  test("should open and close Add Agent form", async ({ playground }) => {
    await playground.addAgentBtn.click();
    await expect(playground.addAgentUrl).toBeVisible();
    await expect(playground.addAgentSubmit).toBeVisible();
    await expect(playground.addAgentCancel).toBeVisible();
    // Close the form
    await playground.addAgentCancel.click();
    await expect(playground.addAgentUrl).toBeHidden();
  });

  test("should show validation for invalid URL", async ({ playground }) => {
    await playground.addAgentBtn.click();
    await playground.addAgentUrl.fill("not-a-valid-url");
    // Submit button should be disabled for invalid URL
    await expect(playground.addAgentSubmit).toBeDisabled();
    // Should show inline validation message
    await expect(playground.page.getByText("Please enter a valid absolute")).toBeVisible();
  });

  test("should add custom agent via network mock", async ({ playground, page }) => {
    // Intercept the .well-known/agent.json fetch
    await page.route("**/example.com/.well-known/agent.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: "Test Custom Agent",
          description: "A test agent added via the form",
          url: "https://example.com",
          version: "2.0.0",
          capabilities: {},
          skills: [],
          defaultInputModes: ["text"],
          defaultOutputModes: ["text"],
        }),
      });
    });

    await playground.addAgentBtn.click();
    await playground.addAgentUrl.fill("https://example.com");
    await playground.addAgentSubmit.click();

    // Wait for the custom agent card to appear (id starts with "custom-")
    await expect(page.locator("[data-testid^='agent-card-custom-']")).toBeVisible({ timeout: 10000 });
    // The new agent should display its name
    await expect(page.locator("[data-testid^='agent-card-custom-']")).toContainText("Test Custom Agent");
    // Add form should be hidden after successful add
    await expect(playground.addAgentUrl).toBeHidden();
  });

  test("should remove custom agent", async ({ playground, page }) => {
    // First add a custom agent via network mock
    await page.route("**/example.com/.well-known/agent.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: "Removable Agent",
          description: "Will be removed",
          url: "https://example.com",
          version: "1.0.0",
          capabilities: {},
          skills: [],
          defaultInputModes: ["text"],
          defaultOutputModes: ["text"],
        }),
      });
    });

    await playground.addAgentBtn.click();
    await playground.addAgentUrl.fill("https://example.com");
    await playground.addAgentSubmit.click();

    const customCard = page.locator("[data-testid^='agent-card-custom-']");
    await expect(customCard).toBeVisible({ timeout: 10000 });

    // Hover over the custom agent card to reveal the remove button
    await customCard.hover();
    // Click the X button (remove button inside the card)
    const removeBtn = customCard.locator("button");
    await removeBtn.click();

    // Custom agent card should be gone
    await expect(customCard).toBeHidden();
  });
});
