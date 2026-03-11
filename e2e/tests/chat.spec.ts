import { test, expect } from "../fixtures/playground";

test.describe("Chat Flow", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
    await playground.switchToTab("chat");
  });

  test("should enable chat input when connected", async ({ playground }) => {
    await expect(playground.chatInput).toBeEnabled();
  });

  test("should show example prompts when no messages", async ({ playground }) => {
    await expect(playground.examplePrompt(0)).toBeVisible();
  });

  test("should send a text message and get echo response", async ({ playground }) => {
    await playground.sendMessage("Hello");
    await playground.waitForAgentResponse();
    const response = await playground.getAgentResponseText();
    expect(response).toContain("Echo: Hello");
  });

  test("should handle reverse command", async ({ playground }) => {
    await playground.sendMessage("reverse: abc");
    await playground.waitForAgentResponse();
    const response = await playground.getAgentResponseText();
    expect(response).toContain("Reversed: cba");
  });

  test("should handle uppercase command", async ({ playground }) => {
    await playground.sendMessage("uppercase: hello world");
    await playground.waitForAgentResponse();
    const response = await playground.getAgentResponseText();
    expect(response).toContain("Uppercase: HELLO WORLD");
  });

  test("should send message via example prompt", async ({ playground }) => {
    await playground.examplePrompt(0).click();
    await playground.waitForAgentResponse();
    await expect(playground.userMessages).toHaveCount(1);
    await expect(playground.agentMessages).toHaveCount(1);
  });

  test("should clear chat", async ({ playground }) => {
    await playground.sendMessage("Hello");
    await playground.waitForAgentResponse();
    await playground.chatClear.click();
    await expect(playground.userMessages).toHaveCount(0);
    await expect(playground.agentMessages).toHaveCount(0);
  });
});

test.describe("Chat with Calculator Agent", () => {
  test("should handle JSON input", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-calculator");
    await playground.switchToTab("chat");
    await playground.sendMessage('{"operation":"add","a":5,"b":3}');
    await playground.waitForAgentResponse();
    const response = await playground.getAgentResponseText();
    expect(response).toContain("8");
  });
});

test.describe("Chat with Translator Agent", () => {
  test("should translate a known phrase", async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-translator");
    await playground.switchToTab("chat");
    await playground.sendMessage('Translate "Hello" to German');
    await playground.waitForAgentResponse();
    const response = await playground.getAgentResponseText();
    expect(response).toContain("Hallo");
  });
});
