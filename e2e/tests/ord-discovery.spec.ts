import { type Page } from "@playwright/test";
import { test, expect } from "../fixtures/playground";

const ORD_HOST = "https://ord-host.example.com";

const ORD_CONFIG = {
  openResourceDiscoveryV1: {
    documents: [{ url: "/ord/v1/documents/1" }],
  },
};

const ORD_DOC = {
  agents: [
    {
      ordId: "ns:agent:my-agent:v1",
      exposedApiResources: [{ ordId: "ns:api:my-api:v1" }],
    },
  ],
  apiResources: [
    {
      ordId: "ns:api:my-api:v1",
      title: "My API",
      apiProtocol: "a2a",
      resourceDefinitions: [{ type: "a2a-agent-card", url: "/api/agents/my-agent/agent.json" }],
    },
  ],
};

const AGENT_CARD = {
  name: "Discovered ORD Agent",
  description: "Test ORD agent",
  url: ORD_HOST,
  skills: [],
};

const AGENT_ID = "ord-ns:api:my-api:v1";

async function mockOrdChain(page: Page) {
  await page.route(`${ORD_HOST}/.well-known/open-resource-discovery`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ORD_CONFIG),
    }),
  );
  await page.route(`${ORD_HOST}/ord/v1/documents/1`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ORD_DOC),
    }),
  );
  await page.route(`${ORD_HOST}/api/agents/my-agent/agent.json`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(AGENT_CARD),
    }),
  );
}

test.describe("ORD Discovery", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
  });

  test("should open and close the Discover ORD form", async ({ playground }) => {
    await playground.discoverOrdBtn.click();
    await expect(playground.ordUrlInput).toBeVisible();
    await expect(playground.discoverOrdSubmit).toBeVisible();
    // Toggle closed
    await playground.discoverOrdBtn.click();
    await expect(playground.ordUrlInput).toBeHidden();
  });

  test("should close Add form when Discover form is opened, and vice versa", async ({ playground }) => {
    // Open Add form
    await playground.addAgentBtn.click();
    await expect(playground.addAgentUrl).toBeVisible();
    // Open Discover form — Add form should close
    await playground.discoverOrdBtn.click();
    await expect(playground.ordUrlInput).toBeVisible();
    await expect(playground.addAgentUrl).toBeHidden();
    // Open Add form again — Discover form should close
    await playground.addAgentBtn.click();
    await expect(playground.addAgentUrl).toBeVisible();
    await expect(playground.ordUrlInput).toBeHidden();
  });

  test("should keep Discover submit disabled when input is empty", async ({ playground }) => {
    await playground.discoverOrdBtn.click();
    await expect(playground.discoverOrdSubmit).toBeDisabled();
    await playground.ordUrlInput.fill(ORD_HOST);
    await expect(playground.discoverOrdSubmit).toBeEnabled();
  });

  test("should discover and display ORD agent card", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    await expect(playground.agentCard(AGENT_ID)).toBeVisible({ timeout: 10000 });
    await expect(playground.agentCard(AGENT_ID)).toContainText("Discovered ORD Agent");
  });

  test("should show success message after discovery", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    await expect(playground.agentCard(AGENT_ID)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Added 1 agent")).toBeVisible();
  });

  test("should show 'No new agents found' when re-discovering same URL", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    // Wait for first discovery to complete
    await expect(playground.agentCard(AGENT_ID)).toBeVisible({ timeout: 10000 });

    // Discover again — same URL still in the input
    await playground.discoverOrdSubmit.click();
    await expect(page.getByText("No new agents found")).toBeVisible({ timeout: 10000 });
  });

  test("should show error when ORD config endpoint returns 404", async ({ playground, page }) => {
    await page.route(`${ORD_HOST}/.well-known/open-resource-discovery`, (route) =>
      route.fulfill({ status: 404, statusText: "Not Found" }),
    );

    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    await expect(page.getByText(/ORD config fetch failed/)).toBeVisible({ timeout: 10000 });
  });

  test("should remove ORD agent on hover and click X", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    const card = playground.agentCard(AGENT_ID);
    await expect(card).toBeVisible({ timeout: 10000 });

    await card.hover();
    await card.locator("button").click();

    await expect(card).toBeHidden();
  });

  test("should trigger discovery on Enter key in URL input", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.ordUrlInput.press("Enter");

    await expect(playground.agentCard(AGENT_ID)).toBeVisible({ timeout: 10000 });
  });

  test("should show 'ORD Agents' section header after discovery", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    await expect(playground.agentCard(AGENT_ID)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("ORD Agents")).toBeVisible();
  });

  test("should keep Discover form open after successful discovery", async ({ playground, page }) => {
    await mockOrdChain(page);
    await playground.discoverOrdBtn.click();
    await playground.ordUrlInput.fill(ORD_HOST);
    await playground.discoverOrdSubmit.click();

    await expect(playground.agentCard(AGENT_ID)).toBeVisible({ timeout: 10000 });
    // Unlike the Add form, the ORD form stays open to allow re-discovery
    await expect(playground.ordUrlInput).toBeVisible();
  });
});
