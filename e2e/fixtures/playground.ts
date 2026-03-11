import { type Page, type Locator, expect } from "@playwright/test";
import { test as base } from "@playwright/test";

export class PlaygroundPage {
  readonly page: Page;
  readonly isDocusaurus: boolean;

  // Settings panel
  readonly settingsPanel: Locator;
  readonly agentSearch: Locator;
  readonly addAgentBtn: Locator;
  readonly addAgentUrl: Locator;
  readonly addAgentSubmit: Locator;
  readonly addAgentCancel: Locator;

  // Editor
  readonly editorPanel: Locator;
  readonly toolbarFormat: Locator;
  readonly toolbarCopy: Locator;
  readonly toolbarValidate: Locator;
  readonly toolbarReset: Locator;
  readonly editorParseError: Locator;

  // Right panel tabs
  readonly tabOverview: Locator;
  readonly tabChat: Locator;
  readonly tabRawHttp: Locator;
  readonly tabValidation: Locator;

  // Overview
  readonly agentHeader: Locator;
  readonly agentName: Locator;
  readonly agentVersion: Locator;

  // Connection (Overview)
  readonly connectionUrl: Locator;
  readonly connectBtn: Locator;
  readonly disconnectBtn: Locator;
  readonly connectionStatus: Locator;

  // Chat
  readonly chatInput: Locator;
  readonly chatSend: Locator;
  readonly chatMessages: Locator;
  readonly chatClear: Locator;
  readonly userMessages: Locator;
  readonly agentMessages: Locator;

  // Raw HTTP
  readonly rawHttpPanel: Locator;
  readonly httpLogEntries: Locator;

  constructor(page: Page, isDocusaurus = false) {
    this.page = page;
    this.isDocusaurus = isDocusaurus;

    // Settings
    this.settingsPanel = page.locator("[data-testid='settings-panel']");
    this.agentSearch = page.locator("[data-testid='agent-search']");
    this.addAgentBtn = page.locator("[data-testid='add-agent-btn']");
    this.addAgentUrl = page.locator("[data-testid='add-agent-url']");
    this.addAgentSubmit = page.locator("[data-testid='add-agent-submit']");
    this.addAgentCancel = page.locator("[data-testid='add-agent-cancel']");

    // Editor
    this.editorPanel = page.locator("[data-testid='editor-panel']");
    this.toolbarFormat = page.locator("[data-testid='toolbar-format']");
    this.toolbarCopy = page.locator("[data-testid='toolbar-copy']");
    this.toolbarValidate = page.locator("[data-testid='toolbar-validate']");
    this.toolbarReset = page.locator("[data-testid='toolbar-reset']");
    this.editorParseError = page.locator("[data-testid='editor-parse-error']");

    // Tabs
    this.tabOverview = page.locator("[data-testid='tab-overview']");
    this.tabChat = page.locator("[data-testid='tab-chat']");
    this.tabRawHttp = page.locator("[data-testid='tab-rawhttp']");
    this.tabValidation = page.locator("[data-testid='tab-validation']");

    // Overview
    this.agentHeader = page.locator("[data-testid='agent-header']");
    this.agentName = page.locator("[data-testid='agent-name']");
    this.agentVersion = page.locator("[data-testid='agent-version']");

    // Connection
    this.connectionUrl = page.locator("[data-testid='connection-url']");
    this.connectBtn = page.locator("[data-testid='connect-btn']");
    this.disconnectBtn = page.locator("[data-testid='disconnect-btn']");
    this.connectionStatus = page.locator("[data-testid='connection-status']");

    // Chat
    this.chatInput = page.locator("[data-testid='chat-input']");
    this.chatSend = page.locator("[data-testid='chat-send']");
    this.chatMessages = page.locator("[data-testid='chat-messages']");
    this.chatClear = page.locator("[data-testid='chat-clear']");
    this.userMessages = page.locator("[data-testid='message-user']");
    this.agentMessages = page.locator("[data-testid='message-agent']");

    // Raw HTTP
    this.rawHttpPanel = page.locator("[data-testid='raw-http-panel']");
    this.httpLogEntries = page.locator("[data-testid='http-log-entry']");
  }

  async goto() {
    await this.page.goto("/playground");
    await this.waitForPlaygroundReady();
  }

  async gotoWithAgent(agentId: string) {
    await this.page.goto(`/playground?agent=${agentId}`);
    await this.waitForPlaygroundReady();
    // The ?agent= param triggers an async useEffect that loads defaults, finds the agent,
    // and connects. Wait for the agent name to appear which indicates the full flow completed.
    await this.agentName.waitFor({ timeout: 15000 });
    // Then wait for connection status
    await expect(this.connectionStatus).toHaveText("connected", { timeout: 10000 });
  }

  async waitForPlaygroundReady() {
    if (this.isDocusaurus) {
      // Wait for the standalone bundle to load
      await this.page.waitForFunction(() => !!(window as unknown as Record<string, unknown>).A2APlayground, {
        timeout: 15000,
      });
    }
    // Wait for either settings panel or editor panel to appear
    await this.page.waitForSelector(
      "[data-testid='settings-panel'], [data-testid='editor-panel'], [data-testid='tab-overview']",
      { timeout: 15000 },
    );
    // Give the UI a moment to settle (lazy loading, agent list fetch)
    await this.page.waitForTimeout(500);
  }

  agentCard(id: string): Locator {
    return this.page.locator(`[data-testid='agent-card-${id}']`);
  }

  examplePrompt(index: number): Locator {
    return this.page.locator(`[data-testid='example-prompt-${index}']`);
  }

  async selectAgent(agentId: string) {
    const card = this.agentCard(agentId);
    await card.waitFor({ timeout: 10000 });
    await card.click();
    // Wait for connection to complete
    await this.connectionStatus.waitFor({ timeout: 10000 });
    await expect(this.connectionStatus).toHaveText("connected", { timeout: 10000 });
  }

  async switchToTab(tab: "overview" | "chat" | "rawhttp" | "validation") {
    const tabMap = {
      overview: this.tabOverview,
      chat: this.tabChat,
      rawhttp: this.tabRawHttp,
      validation: this.tabValidation,
    };
    await tabMap[tab].click();
  }

  async sendMessage(text: string) {
    await this.chatInput.fill(text);
    await this.chatSend.click();
  }

  async waitForAgentResponse(expectedCount = 1) {
    await expect(this.agentMessages).toHaveCount(expectedCount, { timeout: 10000 });
  }

  async getAgentResponseText(index = 0): Promise<string> {
    return (await this.agentMessages.nth(index).textContent()) ?? "";
  }

  async getConnectionStatusText(): Promise<string> {
    return (await this.connectionStatus.textContent()) ?? "";
  }
}

// Custom fixture that creates a PlaygroundPage with the correct isDocusaurus flag
export const test = base.extend<{ playground: PlaygroundPage }>({
  playground: async ({ page, baseURL }, use) => {
    const isDocusaurus = baseURL?.includes("3001") ?? false;
    const pg = new PlaygroundPage(page, isDocusaurus);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(pg);
  },
});

export { expect } from "@playwright/test";
