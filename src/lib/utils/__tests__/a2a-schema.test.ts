import { describe, it, expect } from "vitest";
import { validateAgentCardSchema } from "../a2a-schema";
import { MOCK_AGENTS } from "@lib/mock/agents";

// ===================================================================
// Test Helpers
// ===================================================================

function validV03Card(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: "Test Agent",
    version: "1.0.0",
    description: "A test agent",
    url: "https://example.com/a2a",
    protocolVersion: "0.3.0",
    capabilities: { streaming: false },
    skills: [{ id: "echo", name: "Echo", description: "Echoes back", tags: ["echo"] }],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    ...overrides,
  });
}

function validV10Card(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    name: "Test Agent",
    version: "1.0.0",
    description: "A test agent",
    supportedInterfaces: [{ url: "https://example.com/a2a", protocolBinding: "JSONRPC", protocolVersion: "1.0" }],
    capabilities: { streaming: false },
    skills: [{ id: "echo", name: "Echo", description: "Echoes back", tags: ["echo"] }],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    ...overrides,
  });
}

// ===================================================================
// v0.3 Tests
// ===================================================================

describe("validateAgentCardSchema — v0.3", () => {
  it("validates a minimal valid v0.3 card", () => {
    const results = validateAgentCardSchema(validV03Card());
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("v0.3");
  });

  it("reports missing required fields", () => {
    const card = JSON.stringify({ name: "Test" });
    const results = validateAgentCardSchema(card);
    const paths = results.map((r) => r.path).filter(Boolean);
    expect(paths).toContain("version");
    expect(paths).toContain("description");
    expect(paths).toContain("url");
    expect(paths).toContain("protocolVersion");
    expect(paths).toContain("capabilities");
    expect(paths).toContain("skills");
    expect(paths).toContain("defaultInputModes");
    expect(paths).toContain("defaultOutputModes");
    expect(results.every((r) => r.status === "fail")).toBe(true);
  });

  it("reports wrong type for name", () => {
    const results = validateAgentCardSchema(validV03Card({ name: 123 }));
    const nameError = results.find((r) => r.path === "name");
    expect(nameError).toBeDefined();
    expect(nameError!.status).toBe("fail");
    expect(nameError!.rule).toBe("Invalid type");
  });

  it("allows empty skills array (no min constraint in v0.3)", () => {
    const results = validateAgentCardSchema(validV03Card({ skills: [] }));
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
  });

  it("allows extra properties (lenient mode)", () => {
    const results = validateAgentCardSchema(validV03Card({ extraField: "hello" }));
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
  });

  it("validates with security schemes", () => {
    const results = validateAgentCardSchema(
      validV03Card({
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
          apiKey: { type: "apiKey", name: "X-API-Key", in: "header" },
          oauth: {
            type: "oauth2",
            flows: {
              authorizationCode: {
                authorizationUrl: "https://auth.example.com/authorize",
                tokenUrl: "https://auth.example.com/token",
                scopes: { read: "Read access" },
              },
            },
          },
        },
        security: [{ bearerAuth: [] }],
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
  });

  it("validates with optional fields", () => {
    const results = validateAgentCardSchema(
      validV03Card({
        provider: { organization: "Test Corp", url: "https://test.com" },
        documentationUrl: "https://docs.example.com",
        iconUrl: "https://example.com/icon.png",
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
  });
});

// ===================================================================
// v1.0 Tests
// ===================================================================

describe("validateAgentCardSchema — v1.0", () => {
  it("validates a minimal valid v1.0 card", () => {
    const results = validateAgentCardSchema(validV10Card());
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
    expect(results[0].message).toContain("v1.0");
  });

  it("reports extra properties as warnings (strict mode)", () => {
    const results = validateAgentCardSchema(validV10Card({ extraField: "hello" }));
    expect(results.some((r) => r.status === "warning")).toBe(true);
    const warning = results.find((r) => r.status === "warning");
    expect(warning!.rule).toBe("Unrecognized keys");
    expect(warning!.message).toContain("extraField");
  });

  it("validates v1.0 nested security scheme structure", () => {
    const results = validateAgentCardSchema(
      validV10Card({
        securitySchemes: {
          bearerAuth: {
            httpAuthSecurityScheme: { scheme: "bearer", bearerFormat: "JWT" },
          },
          apiKey: {
            apiKeySecurityScheme: { location: "header", name: "X-API-Key" },
          },
        },
        securityRequirements: [{ schemes: { bearerAuth: { list: [] } } }],
      }),
    );
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
  });

  it("warns on v0.3-style security in v1.0 card", () => {
    const results = validateAgentCardSchema(
      validV10Card({
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
        },
      }),
    );
    const warning = results.find((r) => r.message.includes("type"));
    expect(warning).toBeDefined();
    expect(warning!.status).toBe("warning");
  });

  it("card without supportedInterfaces is detected as v0.3", () => {
    const card = JSON.stringify({
      name: "Test",
      version: "1.0.0",
      description: "Test",
      capabilities: {},
      skills: [{ id: "s", name: "S", description: "D", tags: ["t"] }],
      defaultInputModes: ["text/plain"],
      defaultOutputModes: ["text/plain"],
    });
    const results = validateAgentCardSchema(card);
    // Detected as v0.3 — missing url and protocolVersion
    const paths = results.map((r) => r.path).filter(Boolean);
    expect(paths).toContain("url");
    expect(paths).toContain("protocolVersion");
  });
});

// ===================================================================
// Version Detection
// ===================================================================

describe("validateAgentCardSchema — version detection", () => {
  it("detects v1.0 when supportedInterfaces is present", () => {
    const results = validateAgentCardSchema(validV10Card());
    expect(results[0].message).toContain("v1.0");
  });

  it("detects v0.3 when supportedInterfaces is absent", () => {
    const results = validateAgentCardSchema(validV03Card());
    expect(results[0].message).toContain("v0.3");
  });
});

// ===================================================================
// Edge Cases
// ===================================================================

describe("validateAgentCardSchema — edge cases", () => {
  it("returns json-error for invalid JSON", () => {
    const results = validateAgentCardSchema("{ not valid json }");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("json-error");
    expect(results[0].status).toBe("fail");
  });

  it("returns not-object for array input", () => {
    const results = validateAgentCardSchema("[]");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("not-object");
    expect(results[0].status).toBe("fail");
  });

  it("returns not-object for string input", () => {
    const results = validateAgentCardSchema('"hello"');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("not-object");
    expect(results[0].status).toBe("fail");
  });

  it("returns not-object for null input", () => {
    const results = validateAgentCardSchema("null");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("not-object");
    expect(results[0].status).toBe("fail");
  });

  it("returns multiple errors for empty object", () => {
    const results = validateAgentCardSchema("{}");
    expect(results.length).toBeGreaterThan(1);
    expect(results.every((r) => r.status === "fail")).toBe(true);
  });
});

// ===================================================================
// Mock Agent Card Validation (regression test)
// ===================================================================

describe("validateAgentCardSchema — mock agents", () => {
  it.each(Object.keys(MOCK_AGENTS))("mock agent '%s' passes v0.3 schema validation", (agentId) => {
    const card = MOCK_AGENTS[agentId].card;
    // The internal AgentCard type uses protocolVersions (array) but the v0.3
    // wire format requires protocolVersion (singular string) and url (required).
    // Build a valid wire-format JSON from the internal representation.
    const wireCard = {
      ...card,
      protocolVersion: "0.3.0",
    };
    const json = JSON.stringify(wireCard);
    const results = validateAgentCardSchema(json);
    const failures = results.filter((r) => r.status === "fail");
    expect(failures).toEqual([]);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("pass");
  });
});
