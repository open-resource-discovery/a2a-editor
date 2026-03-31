import { describe, it, expect } from "vitest";
import { resolveJsonPathToPosition } from "../json-path-resolver";

const SAMPLE_JSON = JSON.stringify(
  {
    name: "Test Agent",
    version: "1.0.0",
    skills: [
      { id: "echo", name: "Echo", description: "Echoes", tags: ["tag1"] },
      { id: "ping", name: "Ping", description: "Pings", tags: ["tag2"] },
    ],
    capabilities: { streaming: false },
  },
  null,
  2,
);

describe("resolveJsonPathToPosition", () => {
  it("returns fallback for undefined path", () => {
    const pos = resolveJsonPathToPosition(SAMPLE_JSON, undefined);
    expect(pos.startLineNumber).toBe(1);
    expect(pos.startColumn).toBe(1);
  });

  it("resolves top-level key", () => {
    const pos = resolveJsonPathToPosition(SAMPLE_JSON, "name");
    expect(pos.startLineNumber).toBeGreaterThan(1);
    expect(pos.startColumn).toBeGreaterThan(1);
  });

  it("resolves nested path", () => {
    const pos = resolveJsonPathToPosition(SAMPLE_JSON, "capabilities.streaming");
    expect(pos.startLineNumber).toBeGreaterThan(1);
  });

  it("resolves array element", () => {
    const pos = resolveJsonPathToPosition(SAMPLE_JSON, "skills.0");
    expect(pos.startLineNumber).toBeGreaterThan(1);
  });

  it("resolves deep array path", () => {
    const pos = resolveJsonPathToPosition(SAMPLE_JSON, "skills.0.id");
    expect(pos.startLineNumber).toBeGreaterThan(1);
  });

  it("resolves second array element", () => {
    const pos0 = resolveJsonPathToPosition(SAMPLE_JSON, "skills.0.id");
    const pos1 = resolveJsonPathToPosition(SAMPLE_JSON, "skills.1.id");
    // Second element should be on a later line
    expect(pos1.startLineNumber).toBeGreaterThan(pos0.startLineNumber);
  });

  it("falls back to line 1 for nonexistent path", () => {
    const pos = resolveJsonPathToPosition(SAMPLE_JSON, "nonexistent");
    expect(pos.startLineNumber).toBe(1);
    expect(pos.startColumn).toBe(1);
  });

  it("falls back to parent for nonexistent nested path", () => {
    const parentPos = resolveJsonPathToPosition(SAMPLE_JSON, "skills.0");
    const fallbackPos = resolveJsonPathToPosition(SAMPLE_JSON, "skills.0.nonexistent");
    // Should fall back to skills.0, not line 1
    expect(fallbackPos.startLineNumber).toBe(parentPos.startLineNumber);
  });

  it("returns fallback for invalid JSON", () => {
    const pos = resolveJsonPathToPosition("{ not valid }", "name");
    expect(pos.startLineNumber).toBe(1);
    expect(pos.startColumn).toBe(1);
  });

  it("returns fallback for empty string", () => {
    const pos = resolveJsonPathToPosition("", "name");
    expect(pos.startLineNumber).toBe(1);
  });
});
