import { describe, it, expect, vi, afterEach } from "vitest";
import { isOrdUrl, discoverAgentsFromOrd } from "../ord-discovery";

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3002";

const ORD_CONFIG = {
  openResourceDiscoveryV1: { documents: [{ url: "/ord/v1/documents/test" }] },
};

const SOLAR_CARD = {
  name: "Solar System Explorer",
  description: "Space weather agent",
  url: `${BASE_URL}/solar`,
  skills: [{ id: "s1", name: "Solar Weather", tags: ["space", "weather"] }],
};

const REPAIR_CARD = {
  name: "Repair Technician",
  description: "Hull repair agent",
  url: `${BASE_URL}/repair`,
  skills: [{ id: "r1", name: "Hull Repair", tags: ["repair", "hull"] }],
};

function makeDocument(overrides: Record<string, unknown> = {}) {
  return {
    agents: [
      {
        ordId: "ns:agent:Solar:v1",
        title: "Solar Agent",
        exposedApiResources: [{ ordId: "ns:apiResource:Solar:v1" }],
      },
    ],
    apiResources: [
      {
        ordId: "ns:apiResource:Solar:v1",
        title: "Solar API",
        apiProtocol: "a2a",
        resourceDefinitions: [{ type: "a2a-agent-card", url: "/solar/agent.json" }],
      },
    ],
    ...overrides,
  };
}

// ─── isOrdUrl ─────────────────────────────────────────────────────────────────

describe("isOrdUrl", () => {
  it("returns true for a full well-known URL", () => {
    expect(isOrdUrl(`${BASE_URL}/.well-known/open-resource-discovery`)).toBe(true);
  });

  it("returns true when well-known path appears anywhere in the URL", () => {
    expect(isOrdUrl("https://example.com/.well-known/open-resource-discovery?v=1")).toBe(true);
  });

  it("returns false for a plain base URL", () => {
    expect(isOrdUrl(BASE_URL)).toBe(false);
  });

  it("returns false for an agent card URL", () => {
    expect(isOrdUrl(`${BASE_URL}/solar/agent.json`)).toBe(false);
  });
});

// ─── discoverAgentsFromOrd ────────────────────────────────────────────────────

describe("discoverAgentsFromOrd", () => {
  it("returns empty array for empty input without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverAgentsFromOrd("");
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("appends well-known path when given a plain base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found", json: vi.fn() });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverAgentsFromOrd(BASE_URL)).rejects.toThrow();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/.well-known/open-resource-discovery`);
  });

  it("does not double-append well-known path when URL already contains it", async () => {
    const ordUrl = `${BASE_URL}/.well-known/open-resource-discovery`;
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found", json: vi.fn() });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverAgentsFromOrd(ordUrl)).rejects.toThrow();
    expect(fetchMock.mock.calls[0][0]).toBe(ordUrl);
  });

  it("strips trailing slash from base URL before appending well-known path", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, statusText: "Not Found", json: vi.fn() });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverAgentsFromOrd(`${BASE_URL}/`)).rejects.toThrow();
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/.well-known/open-resource-discovery`);
  });

  it("throws when the ORD config fetch returns a non-OK response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false, status: 404, statusText: "Not Found", json: vi.fn(),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverAgentsFromOrd(BASE_URL)).rejects.toThrow("ORD config fetch failed: 404");
  });

  it("throws when the ORD config lists no documents", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: () => Promise.resolve({ openResourceDiscoveryV1: { documents: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverAgentsFromOrd(BASE_URL)).rejects.toThrow("No ORD documents found");
  });

  it("discovers an agent using the agents[] + exposedApiResources pattern", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makeDocument()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("Solar System Explorer");
    expect(agents[0].description).toBe("Space weather agent");
    expect(agents[0].id).toBe("ord-ns:apiResource:Solar:v1");
    expect(agents[0].authType).toBe("none");
    expect(agents[0].mocked).toBe(false);
  });

  it("stores the agent card URL (ending .json) as the agent url", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makeDocument()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);

    expect(agents[0].url).toBe(`${BASE_URL}/solar/agent.json`);
    expect(agents[0].url).toMatch(/\.json$/);
  });

  it("includes ORD tag and card skill tags", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makeDocument()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);

    expect(agents[0].tags).toContain("ORD");
    expect(agents[0].tags).toContain("space");
    expect(agents[0].tags).toContain("weather");
  });

  it("falls back to scanning apiResources directly when no agents[] array is present", async () => {
    const docWithoutAgents = {
      apiResources: [
        {
          ordId: "ns:apiResource:Solar:v1",
          title: "Solar API",
          apiProtocol: "a2a",
          resourceDefinitions: [{ type: "a2a-agent-card", url: "/solar/agent.json" }],
        },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(docWithoutAgents) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("Solar System Explorer");
  });

  it("recognises customType a2a:agent-card:v1 as an agent card definition", async () => {
    const docWithCustomType = {
      apiResources: [
        {
          ordId: "ns:apiResource:Solar:v1",
          apiProtocol: "a2a",
          resourceDefinitions: [{ customType: "a2a:agent-card:v1", url: "/solar/agent.json" }],
        },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(docWithCustomType) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);
    expect(agents).toHaveLength(1);
  });

  it("skips apiResources that have no agent card resource definition", async () => {
    const doc = {
      apiResources: [
        {
          ordId: "ns:apiResource:Solar:v1",
          apiProtocol: "a2a",
          resourceDefinitions: [{ type: "openapi", url: "/openapi.json" }],
        },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(doc) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);
    expect(agents).toHaveLength(0);
  });

  it("skips an agent when the card fetch returns non-OK", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makeDocument()) })
      .mockResolvedValueOnce({ ok: false, status: 404, json: vi.fn() });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);
    expect(agents).toHaveLength(0);
  });

  it("deduplicates agents that resolve to the same card URL", async () => {
    const docWithDuplicates = {
      agents: [
        { ordId: "ns:agent:A:v1", exposedApiResources: [{ ordId: "ns:api:A:v1" }] },
        { ordId: "ns:agent:B:v1", exposedApiResources: [{ ordId: "ns:api:B:v1" }] },
      ],
      apiResources: [
        { ordId: "ns:api:A:v1", apiProtocol: "a2a", resourceDefinitions: [{ type: "a2a-agent-card", url: "/solar/agent.json" }] },
        { ordId: "ns:api:B:v1", apiProtocol: "a2a", resourceDefinitions: [{ type: "a2a-agent-card", url: "/solar/agent.json" }] },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(docWithDuplicates) })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);
    expect(agents).toHaveLength(1);
  });

  it("discovers multiple distinct agents from one document", async () => {
    const docWithTwo = {
      agents: [
        { ordId: "ns:agent:Solar:v1", exposedApiResources: [{ ordId: "ns:api:Solar:v1" }] },
        { ordId: "ns:agent:Repair:v1", exposedApiResources: [{ ordId: "ns:api:Repair:v1" }] },
      ],
      apiResources: [
        { ordId: "ns:api:Solar:v1", apiProtocol: "a2a", resourceDefinitions: [{ type: "a2a-agent-card", url: "/solar/agent.json" }] },
        { ordId: "ns:api:Repair:v1", apiProtocol: "a2a", resourceDefinitions: [{ type: "a2a-agent-card", url: "/repair/agent.json" }] },
      ],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(docWithTwo) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(REPAIR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const agents = await discoverAgentsFromOrd(BASE_URL);
    expect(agents).toHaveLength(2);
    expect(agents.map((a) => a.name)).toContain("Solar System Explorer");
    expect(agents.map((a) => a.name)).toContain("Repair Technician");
  });

  it("passes auth headers to all fetch calls", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(ORD_CONFIG) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(makeDocument()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(SOLAR_CARD) });
    vi.stubGlobal("fetch", fetchMock);

    const headers = { Authorization: "Bearer token123" };
    await discoverAgentsFromOrd(BASE_URL, headers);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    fetchMock.mock.calls.forEach(([, opts]) => {
      expect(opts).toEqual({ headers });
    });
  });
});
