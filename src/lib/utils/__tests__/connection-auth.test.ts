import { describe, it, expect } from "vitest";
import { mapStoreAuthType, buildConnHeaders } from "../connection-auth";

describe("mapStoreAuthType", () => {
  it("maps oauth2 with access token to bearer", () => {
    expect(mapStoreAuthType("oauth2", true)).toBe("bearer");
  });

  it("maps oauth2 without access token to none", () => {
    expect(mapStoreAuthType("oauth2", false)).toBe("none");
  });

  it("maps basic to basic", () => {
    expect(mapStoreAuthType("basic", false)).toBe("basic");
  });

  it("maps apiKey to apiKey", () => {
    expect(mapStoreAuthType("apiKey", false)).toBe("apiKey");
  });

  it("maps none to none", () => {
    expect(mapStoreAuthType("none", false)).toBe("none");
  });

  it("maps null to none", () => {
    expect(mapStoreAuthType(null, false)).toBe("none");
  });

  it("maps undefined to none", () => {
    expect(mapStoreAuthType(undefined, false)).toBe("none");
  });
});

describe("buildConnHeaders", () => {
  it("returns empty object for none auth type", () => {
    expect(buildConnHeaders("none", "", "", "", "")).toEqual({});
  });

  it("returns Basic auth header with valid credentials", () => {
    const headers = buildConnHeaders("basic", "user", "pass", "", "");
    expect(headers).toEqual({ Authorization: `Basic ${btoa("user:pass")}` });
  });

  it("returns empty object for basic auth with empty username", () => {
    expect(buildConnHeaders("basic", "", "pass", "", "")).toEqual({});
  });

  it("returns empty object for basic auth with empty password", () => {
    expect(buildConnHeaders("basic", "user", "", "", "")).toEqual({});
  });

  it("returns Bearer auth header with valid token", () => {
    const headers = buildConnHeaders("bearer", "", "", "my-token", "");
    expect(headers).toEqual({ Authorization: "Bearer my-token" });
  });

  it("returns empty object for bearer auth with empty token", () => {
    expect(buildConnHeaders("bearer", "", "", "", "")).toEqual({});
  });

  it("returns API key header with default header name", () => {
    const headers = buildConnHeaders("apiKey", "", "", "", "my-key");
    expect(headers).toEqual({ Authorization: "my-key" });
  });

  it("returns API key header with custom header name", () => {
    const headers = buildConnHeaders("apiKey", "", "", "", "my-key", "X-API-Key");
    expect(headers).toEqual({ "X-API-Key": "my-key" });
  });

  it("returns empty object for apiKey auth with empty key", () => {
    expect(buildConnHeaders("apiKey", "", "", "", "")).toEqual({});
  });
});
