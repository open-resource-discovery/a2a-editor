import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePredefinedAgentsStore } from "../predefinedAgentsStore";
import type { PredefinedAgent } from "@lib/types/connection";

vi.mock("@lib/utils/ord-discovery", () => ({
  discoverAgentsFromOrd: vi.fn(),
  isOrdUrl: vi.fn(),
}));

import { discoverAgentsFromOrd } from "@lib/utils/ord-discovery";
const mockDiscover = vi.mocked(discoverAgentsFromOrd);

function makeAgent(overrides: Partial<PredefinedAgent> = {}): PredefinedAgent {
  return {
    id: "ord-test:agent:v1",
    name: "Test Agent",
    description: "A test agent",
    url: "http://localhost:3002/agent.json",
    authType: "none",
    tags: ["ORD"],
    mocked: false,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset store state
  usePredefinedAgentsStore.setState({ agents: [], selectedId: null });
  // Clear localStorage
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadFromOrd", () => {
  it("adds discovered agents to the store", async () => {
    const agent = makeAgent();
    mockDiscover.mockResolvedValue([agent]);

    await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002");

    expect(usePredefinedAgentsStore.getState().agents).toHaveLength(1);
    expect(usePredefinedAgentsStore.getState().agents[0].name).toBe("Test Agent");
  });

  it("returns the count of newly added agents", async () => {
    mockDiscover.mockResolvedValue([makeAgent()]);

    const added = await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002");
    expect(added).toBe(1);
  });

  it("returns 0 when all discovered agents already exist (by url)", async () => {
    const agent = makeAgent();
    usePredefinedAgentsStore.setState({ agents: [agent], selectedId: null });
    mockDiscover.mockResolvedValue([makeAgent({ id: "ord-different-id" })]);

    const added = await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002");
    expect(added).toBe(0);
    expect(usePredefinedAgentsStore.getState().agents).toHaveLength(1);
  });

  it("deduplicates by url, not by id", async () => {
    const existing = makeAgent({ id: "ord-existing", url: "http://localhost:3002/agent.json" });
    usePredefinedAgentsStore.setState({ agents: [existing], selectedId: null });

    // Different id, same url → should be skipped
    const duplicate = makeAgent({ id: "ord-different", url: "http://localhost:3002/agent.json" });
    mockDiscover.mockResolvedValue([duplicate]);

    const added = await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002");
    expect(added).toBe(0);
  });

  it("persists discovered agents to localStorage under a2a-ord-agents", async () => {
    mockDiscover.mockResolvedValue([makeAgent()]);

    await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002");

    const stored = JSON.parse(localStorage.getItem("a2a-ord-agents") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe("ord-test:agent:v1");
  });

  it("does not persist non-ord agents to a2a-ord-agents", async () => {
    const customAgent = makeAgent({ id: "custom-123", url: "http://other.com/agent.json" });
    usePredefinedAgentsStore.setState({ agents: [customAgent], selectedId: null });
    mockDiscover.mockResolvedValue([makeAgent()]);

    await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002");

    const stored = JSON.parse(localStorage.getItem("a2a-ord-agents") ?? "[]");
    expect(stored.every((a: PredefinedAgent) => a.id.startsWith("ord-"))).toBe(true);
  });

  it("propagates errors thrown by discoverAgentsFromOrd", async () => {
    mockDiscover.mockRejectedValue(new Error("ORD config fetch failed: 404 Not Found"));

    await expect(
      usePredefinedAgentsStore.getState().loadFromOrd("http://bad-host.example.com"),
    ).rejects.toThrow("ORD config fetch failed");
  });

  it("forwards auth headers to discoverAgentsFromOrd", async () => {
    mockDiscover.mockResolvedValue([]);
    const headers = { Authorization: "Bearer token123" };

    await usePredefinedAgentsStore.getState().loadFromOrd("http://localhost:3002", headers);

    expect(mockDiscover).toHaveBeenCalledWith("http://localhost:3002", headers);
  });
});

describe("removeAgent for ORD agents", () => {
  it("removes an ord- agent from the store", () => {
    const agent = makeAgent({ id: "ord-ns:api:Solar:v1" });
    usePredefinedAgentsStore.setState({ agents: [agent], selectedId: null });

    usePredefinedAgentsStore.getState().removeAgent("ord-ns:api:Solar:v1");

    expect(usePredefinedAgentsStore.getState().agents).toHaveLength(0);
  });

  it("updates a2a-ord-agents in localStorage after removal", () => {
    const agent = makeAgent({ id: "ord-ns:api:Solar:v1" });
    localStorage.setItem("a2a-ord-agents", JSON.stringify([agent]));
    usePredefinedAgentsStore.setState({ agents: [agent], selectedId: null });

    usePredefinedAgentsStore.getState().removeAgent("ord-ns:api:Solar:v1");

    const stored = JSON.parse(localStorage.getItem("a2a-ord-agents") ?? "[]");
    expect(stored).toHaveLength(0);
  });

  it("keeps other agents when removing an ord- agent", () => {
    const ordAgent = makeAgent({ id: "ord-ns:api:Solar:v1", url: "http://localhost:3002/solar/agent.json" });
    const customAgent = makeAgent({ id: "custom-123", url: "http://localhost:3002/custom/agent.json" });
    usePredefinedAgentsStore.setState({ agents: [ordAgent, customAgent], selectedId: null });

    usePredefinedAgentsStore.getState().removeAgent("ord-ns:api:Solar:v1");

    expect(usePredefinedAgentsStore.getState().agents).toHaveLength(1);
    expect(usePredefinedAgentsStore.getState().agents[0].id).toBe("custom-123");
  });
});

describe("loadDefaults with persisted ORD agents", () => {
  it("restores ord agents from localStorage on loadDefaults", async () => {
    const stored = [makeAgent({ id: "ord-ns:api:Solar:v1" })];
    localStorage.setItem("a2a-ord-agents", JSON.stringify(stored));
    // Stub fetch so the predefined-agents.json load doesn't fail
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: vi.fn() }));

    await usePredefinedAgentsStore.getState().loadDefaults();

    const agents = usePredefinedAgentsStore.getState().agents;
    expect(agents.some((a) => a.id === "ord-ns:api:Solar:v1")).toBe(true);

    vi.unstubAllGlobals();
  });
});
