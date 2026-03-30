import { describe, it, expect } from "vitest";
import { buildAddHeaders, mapAddAuth, buildPredefinedConnHeaders } from "../predefined-auth";

describe("buildAddHeaders", () => {
  it("returns undefined for none auth type", () => {
    expect(buildAddHeaders("none", "", "", "", "")).toBeUndefined();
  });

  it("returns Basic header with valid credentials", () => {
    const headers = buildAddHeaders("basic", "user", "pass", "", "");
    expect(headers).toEqual({ Authorization: `Basic ${btoa("user:pass")}` });
  });

  it("returns undefined for basic with empty username", () => {
    expect(buildAddHeaders("basic", "", "pass", "", "")).toBeUndefined();
  });

  it("returns undefined for basic with empty password", () => {
    expect(buildAddHeaders("basic", "user", "", "", "")).toBeUndefined();
  });

  it("returns Bearer header with valid token", () => {
    const headers = buildAddHeaders("bearer", "", "", "my-token", "");
    expect(headers).toEqual({ Authorization: "Bearer my-token" });
  });

  it("returns undefined for bearer with empty token", () => {
    expect(buildAddHeaders("bearer", "", "", "", "")).toBeUndefined();
  });

  it("returns API key as Authorization header", () => {
    const headers = buildAddHeaders("apiKey", "", "", "", "my-key");
    expect(headers).toEqual({ Authorization: "my-key" });
  });

  it("returns undefined for apiKey with empty key", () => {
    expect(buildAddHeaders("apiKey", "", "", "", "")).toBeUndefined();
  });
});

describe("mapAddAuth", () => {
  it("maps none to authType none with no config", () => {
    const result = mapAddAuth("none", "", "", "", "");
    expect(result).toEqual({ authType: "none" });
    expect(result.authConfig).toBeUndefined();
  });

  it("maps basic to authType basic with credentials", () => {
    const result = mapAddAuth("basic", "user", "pass", "", "");
    expect(result).toEqual({
      authType: "basic",
      authConfig: { username: "user", password: "pass" },
    });
  });

  it("maps bearer to authType oauth2 with accessToken", () => {
    const result = mapAddAuth("bearer", "", "", "my-token", "");
    expect(result.authType).toBe("oauth2");
    expect(result.authConfig).toMatchObject({ accessToken: "my-token" });
  });

  it("maps apiKey to authType apiKey with key and default header name", () => {
    const result = mapAddAuth("apiKey", "", "", "", "my-key");
    expect(result).toEqual({
      authType: "apiKey",
      authConfig: { key: "my-key", headerName: "Authorization" },
    });
  });
});

describe("buildPredefinedConnHeaders", () => {
  it("returns Basic header for basic auth", () => {
    const headers = buildPredefinedConnHeaders("basic", { username: "user", password: "pass" });
    expect(headers).toEqual({ Authorization: `Basic ${btoa("user:pass")}` });
  });

  it("returns undefined for basic auth with empty credentials", () => {
    expect(buildPredefinedConnHeaders("basic", { username: "", password: "" })).toBeUndefined();
  });

  it("returns Bearer header for oauth2 with access token", () => {
    const headers = buildPredefinedConnHeaders("oauth2", {
      clientId: "",
      clientSecret: "",
      tokenUrl: "",
      scopes: "",
      accessToken: "my-token",
    });
    expect(headers).toEqual({ Authorization: "Bearer my-token" });
  });

  it("returns undefined for oauth2 without access token", () => {
    const headers = buildPredefinedConnHeaders("oauth2", {
      clientId: "",
      clientSecret: "",
      tokenUrl: "",
      scopes: "",
    });
    expect(headers).toBeUndefined();
  });

  it("returns header for apiKey with header delivery", () => {
    const headers = buildPredefinedConnHeaders("apiKey", {
      key: "my-key",
      headerName: "X-API-Key",
      in: "header",
    });
    expect(headers).toEqual({ "X-API-Key": "my-key" });
  });

  it("uses Authorization as default header name for apiKey", () => {
    const headers = buildPredefinedConnHeaders("apiKey", {
      key: "my-key",
      headerName: "",
    });
    expect(headers).toEqual({ Authorization: "my-key" });
  });

  it("returns undefined for apiKey with query delivery", () => {
    const headers = buildPredefinedConnHeaders("apiKey", {
      key: "my-key",
      headerName: "X-API-Key",
      in: "query",
    });
    expect(headers).toBeUndefined();
  });

  it("returns undefined for apiKey with empty key", () => {
    const headers = buildPredefinedConnHeaders("apiKey", {
      key: "",
      headerName: "X-API-Key",
    });
    expect(headers).toBeUndefined();
  });

  it("returns undefined for none auth type", () => {
    expect(buildPredefinedConnHeaders("none", { username: "", password: "" })).toBeUndefined();
  });
});
