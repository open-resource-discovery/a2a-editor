import { describe, it, expect } from "vitest";
import { isFullyCompliant, validateAgentCard, validateResponse, validateMessageKind } from "../a2a-compliance";

// ===================================================================
// isFullyCompliant
// ===================================================================

describe("isFullyCompliant", () => {
  it("returns true when all results pass", () => {
    expect(
      isFullyCompliant([
        { rule: "a", passed: true, message: "ok" },
        { rule: "b", passed: true, message: "ok" },
      ]),
    ).toBe(true);
  });

  it("returns false when any result fails", () => {
    expect(
      isFullyCompliant([
        { rule: "a", passed: true, message: "ok" },
        { rule: "b", passed: false, message: "fail" },
      ]),
    ).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isFullyCompliant([])).toBe(false);
  });
});

// ===================================================================
// validateAgentCard
// ===================================================================

describe("validateAgentCard", () => {
  const validV03 = {
    name: "Test",
    version: "1.0.0",
    description: "A test agent",
    url: "https://example.com",
    protocolVersion: "0.3.0",
    capabilities: { streaming: false },
    skills: [{ id: "s", name: "S", description: "D", tags: ["t"] }],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
  };

  const validV10 = {
    name: "Test",
    version: "1.0.0",
    description: "A test agent",
    supportedInterfaces: [{ url: "https://example.com", protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
    capabilities: { streaming: false },
    skills: [{ id: "s", name: "S", description: "D", tags: ["t"] }],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
  };

  it("returns all passed for valid v0.3 card", () => {
    const results = validateAgentCard(validV03);
    expect(isFullyCompliant(results)).toBe(true);
  });

  it("returns all passed for valid v1.0 card", () => {
    const results = validateAgentCard(validV10);
    expect(isFullyCompliant(results)).toBe(true);
  });

  it("returns failures for card missing required fields", () => {
    const results = validateAgentCard({ name: "Test" });
    expect(isFullyCompliant(results)).toBe(false);
    expect(results.some((r) => !r.passed)).toBe(true);
  });
});

// ===================================================================
// validateResponse
// ===================================================================

describe("validateResponse", () => {
  it("passes for valid response with result", () => {
    const results = validateResponse({
      jsonrpc: "2.0",
      result: {
        id: "task-1",
        contextId: "ctx-1",
        status: { state: "completed" },
      },
    });
    expect(isFullyCompliant(results)).toBe(true);
    expect(results.find((r) => r.rule === "jsonrpc.version")?.passed).toBe(true);
    expect(results.find((r) => r.rule === "a2a.result.id")?.passed).toBe(true);
    expect(results.find((r) => r.rule === "a2a.result.status.state")?.passed).toBe(true);
    expect(results.find((r) => r.rule === "a2a.result.contextId")?.passed).toBe(true);
  });

  it("passes for valid error response", () => {
    const results = validateResponse({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
    });
    expect(isFullyCompliant(results)).toBe(true);
    expect(results.find((r) => r.rule === "jsonrpc.error.code")?.passed).toBe(true);
    expect(results.find((r) => r.rule === "jsonrpc.error.message")?.passed).toBe(true);
  });

  it("fails for non-object input", () => {
    const results = validateResponse("hello");
    expect(isFullyCompliant(results)).toBe(false);
    expect(results[0].rule).toBe("jsonrpc.object");
  });

  it("fails for null input", () => {
    const results = validateResponse(null);
    expect(isFullyCompliant(results)).toBe(false);
    expect(results[0].rule).toBe("jsonrpc.object");
  });

  it("fails when jsonrpc version is missing", () => {
    const results = validateResponse({
      result: { id: "t", contextId: "c", status: { state: "completed" } },
    });
    expect(isFullyCompliant(results)).toBe(false);
    expect(results.find((r) => r.rule === "jsonrpc.version")?.passed).toBe(false);
  });

  it("passes when neither result nor error is present (both optional in schema)", () => {
    const results = validateResponse({ jsonrpc: "2.0" });
    expect(isFullyCompliant(results)).toBe(true);
  });

  it("fails for invalid status state", () => {
    const results = validateResponse({
      jsonrpc: "2.0",
      result: { id: "t", contextId: "c", status: { state: "BOGUS" } },
    });
    expect(isFullyCompliant(results)).toBe(false);
  });

  it("fails when result.id is missing", () => {
    const results = validateResponse({
      jsonrpc: "2.0",
      result: { contextId: "c", status: { state: "completed" } },
    });
    expect(isFullyCompliant(results)).toBe(false);
  });

  it("passes for v1.0 SCREAMING_SNAKE_CASE states", () => {
    const states = [
      "TASK_STATE_SUBMITTED",
      "TASK_STATE_WORKING",
      "TASK_STATE_COMPLETED",
      "TASK_STATE_FAILED",
      "TASK_STATE_CANCELED",
      "TASK_STATE_INPUT_REQUIRED",
      "TASK_STATE_AUTH_REQUIRED",
      "TASK_STATE_REJECTED",
      "TASK_STATE_UNSPECIFIED",
    ];
    for (const state of states) {
      const results = validateResponse({
        jsonrpc: "2.0",
        result: { id: "t", contextId: "c", status: { state } },
      });
      expect(isFullyCompliant(results)).toBe(true);
    }
  });

  it("passes for all v0.3 lowercase states", () => {
    const states = [
      "pending",
      "submitted",
      "working",
      "input-required",
      "auth-required",
      "completed",
      "canceled",
      "failed",
      "rejected",
    ];
    for (const state of states) {
      const results = validateResponse({
        jsonrpc: "2.0",
        result: { id: "t", contextId: "c", status: { state } },
      });
      expect(isFullyCompliant(results)).toBe(true);
    }
  });

  it("passes for response with artifacts", () => {
    const results = validateResponse({
      jsonrpc: "2.0",
      result: {
        id: "t",
        contextId: "c",
        status: { state: "completed" },
        artifacts: [{ artifactId: "a1", parts: [{ text: "Hello" }] }],
      },
    });
    expect(isFullyCompliant(results)).toBe(true);
  });
});

// ===================================================================
// validateMessageKind
// ===================================================================

describe("validateMessageKind", () => {
  it("returns empty results when no kind field", () => {
    const results = validateMessageKind({ foo: "bar" });
    expect(results).toHaveLength(0);
  });

  it("validates task event", () => {
    const results = validateMessageKind({
      kind: "task",
      id: "t-1",
      status: { state: "completed" },
    });
    expect(isFullyCompliant(results)).toBe(true);
    expect(results.find((r) => r.rule === "a2a.task.id")?.passed).toBe(true);
  });

  it("validates status-update event", () => {
    const results = validateMessageKind({
      kind: "status-update",
      status: { state: "working" },
    });
    expect(isFullyCompliant(results)).toBe(true);
  });

  it("validates artifact-update event", () => {
    const results = validateMessageKind({
      kind: "artifact-update",
      artifact: { parts: [{ text: "Hello" }] },
    });
    expect(isFullyCompliant(results)).toBe(true);
  });

  it("validates message event", () => {
    const results = validateMessageKind({
      kind: "message",
      role: "agent",
      parts: [{ text: "Hello" }],
    });
    expect(isFullyCompliant(results)).toBe(true);
    expect(results.find((r) => r.rule === "a2a.message.role")?.passed).toBe(true);
  });

  it("accepts ROLE_AGENT for message event", () => {
    const results = validateMessageKind({
      kind: "message",
      role: "ROLE_AGENT",
      parts: [{ text: "Hello" }],
    });
    expect(isFullyCompliant(results)).toBe(true);
  });

  it("fails for unknown event kind", () => {
    const results = validateMessageKind({ kind: "unknown-kind" });
    expect(isFullyCompliant(results)).toBe(false);
    expect(results.find((r) => r.rule === "a2a.event.kind.unknown")).toBeDefined();
  });
});
