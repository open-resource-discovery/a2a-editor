import { describe, it, expect } from "vitest";
import { isTerminalTaskState, normalizeStreamEvent, buildOutboundParts } from "../a2a-protocol";
import type { Part } from "@lib/types/a2a";

// ===================================================================
// isTerminalTaskState
// ===================================================================

describe("isTerminalTaskState", () => {
  it("returns true for terminal states", () => {
    expect(isTerminalTaskState("completed")).toBe(true);
    expect(isTerminalTaskState("failed")).toBe(true);
    expect(isTerminalTaskState("canceled")).toBe(true);
    expect(isTerminalTaskState("rejected")).toBe(true);
  });

  it("returns false for non-terminal states", () => {
    expect(isTerminalTaskState("submitted")).toBe(false);
    expect(isTerminalTaskState("working")).toBe(false);
    expect(isTerminalTaskState("input-required")).toBe(false);
    expect(isTerminalTaskState("auth-required")).toBe(false);
    expect(isTerminalTaskState(undefined)).toBe(false);
  });

  it("normalizes v1.0 wire-format state names", () => {
    expect(isTerminalTaskState("TASK_STATE_COMPLETED")).toBe(true);
    expect(isTerminalTaskState("TASK_STATE_WORKING")).toBe(false);
  });
});

// ===================================================================
// normalizeStreamEvent — artifact-bearing v0.3 SSE sequence
//
// Regression: some agents stream the initial task envelope up front (state
// "submitted"), deliver the answer via an artifact-update (per spec, "Results
// SHOULD BE returned using Artifacts"), then close with a message-less terminal
// status-update. The client must not finalize on the initial submitted task.
// ===================================================================

describe("normalizeStreamEvent — artifact answer flow", () => {
  it("classifies the initial task envelope as a non-terminal task event", () => {
    const event = {
      jsonrpc: "2.0",
      result: {
        contextId: "c1",
        id: "t1",
        kind: "task",
        status: { state: "submitted" },
      },
    };
    const n = normalizeStreamEvent(event);
    expect(n?.kind).toBe("task");
    if (n?.kind === "task") {
      expect((n.task.status as { state: string }).state).toBe("submitted");
      expect(isTerminalTaskState((n.task.status as { state: string }).state)).toBe(false);
    }
  });

  it("normalizes an artifact-update carrying the agent answer", () => {
    const event = {
      jsonrpc: "2.0",
      result: {
        artifact: {
          artifactId: "a1",
          name: "agent_result",
          parts: [{ kind: "text", text: "Hello! I am here to help." }],
        },
        contextId: "c1",
        kind: "artifact-update",
        taskId: "t1",
      },
    };
    const n = normalizeStreamEvent(event);
    expect(n?.kind).toBe("artifact-update");
    if (n?.kind === "artifact-update") {
      expect(n.taskId).toBe("t1");
      expect(n.artifact.parts).toHaveLength(1);
      expect((n.artifact.parts[0] as { text: string }).text).toBe("Hello! I am here to help.");
    }
  });

  it("normalizes a final status-update with no message", () => {
    const event = {
      jsonrpc: "2.0",
      result: {
        contextId: "c1",
        final: true,
        kind: "status-update",
        status: { state: "completed" },
        taskId: "t1",
      },
    };
    const n = normalizeStreamEvent(event);
    expect(n?.kind).toBe("status-update");
    if (n?.kind === "status-update") {
      expect(n.status.state).toBe("completed");
      expect(n.status.message).toBeUndefined();
    }
  });
});

// ===================================================================
// buildOutboundParts
// ===================================================================

describe("buildOutboundParts", () => {
  describe("v0.3", () => {
    it("adds the kind discriminator to a TextPart that lacks it", () => {
      const parts: Part[] = [{ text: "Hello" }];
      const out = buildOutboundParts(parts, "0.3.0");
      expect(out).toEqual([{ kind: "text", text: "Hello" }]);
    });

    it("adds the kind discriminator to FilePart and DataPart", () => {
      const parts: Part[] = [
        { file: { uri: "https://example.com/a.png", mimeType: "image/png" } },
        { data: { foo: "bar" } },
      ];
      const out = buildOutboundParts(parts, "0.3.0") as Record<string, unknown>[];
      expect(out[0].kind).toBe("file");
      expect(out[1].kind).toBe("data");
    });

    it("preserves metadata and part contents", () => {
      const parts: Part[] = [{ text: "Hi", metadata: { locale: "en" } }];
      const out = buildOutboundParts(parts, "0.3.0");
      expect(out).toEqual([{ kind: "text", text: "Hi", metadata: { locale: "en" } }]);
    });

    it("drops the legacy `type` field in favor of `kind`", () => {
      const parts = [{ type: "text", text: "Hello" }] as unknown as Part[];
      const out = buildOutboundParts(parts, "0.3.0") as Record<string, unknown>[];
      expect(out[0].kind).toBe("text");
      expect(out[0].type).toBeUndefined();
    });

    it("keeps an existing correct kind", () => {
      const parts: Part[] = [{ kind: "text", text: "Hello" }];
      const out = buildOutboundParts(parts, "0.3.0");
      expect(out).toEqual([{ kind: "text", text: "Hello" }]);
    });
  });

  describe("v1.0", () => {
    it("converts a TextPart to the unified v1.0 shape without kind", () => {
      const parts: Part[] = [{ text: "Hello" }];
      const out = buildOutboundParts(parts, "1.0.0");
      expect(out).toEqual([{ text: "Hello" }]);
    });
  });
});
