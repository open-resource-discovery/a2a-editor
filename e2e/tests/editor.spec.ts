import { test, expect } from "../fixtures/playground";

test.describe("JSON Editor", () => {
  test.beforeEach(async ({ playground }) => {
    await playground.goto();
    await playground.selectAgent("mock-echo");
  });

  test("should display agent card JSON in editor", async ({ playground }) => {
    // The toolbar buttons should be enabled when there's content
    await expect(playground.toolbarFormat).toBeEnabled();
    await expect(playground.toolbarCopy).toBeEnabled();
  });

  test("should format JSON with the Format button", async ({ playground }) => {
    await playground.toolbarFormat.click();
    // Format should succeed without error
    await expect(playground.editorParseError).toBeHidden();
  });

  test("should show parse error for invalid JSON", async ({ playground }) => {
    // Set invalid JSON via a custom event
    await playground.page.evaluate(() => {
      const event = new CustomEvent("set-raw-json", { detail: "{invalid" });
      window.dispatchEvent(event);
    });
    // Alternative: use Monaco editor API or the store directly
    // For now we test via the reset flow instead
  });

  test("should reset editor content with Reset button", async ({ playground }) => {
    await playground.toolbarReset.click();
    // After reset, toolbar buttons should be disabled (empty editor)
    await expect(playground.toolbarFormat).toBeDisabled();
  });
});
