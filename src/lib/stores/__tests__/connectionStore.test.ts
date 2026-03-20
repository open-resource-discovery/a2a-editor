import { describe, it, expect, beforeEach } from "vitest";
import { useConnectionStore } from "../connectionStore";

// Reset the store before each test
beforeEach(() => {
  const store = useConnectionStore.getState();
  store.setAuthType("none");
  store.setBasicCredentials({ username: "", password: "" });
  store.setOAuth2Credentials({
    clientId: "",
    clientSecret: "",
    tokenUrl: "",
    scopes: "",
    accessToken: undefined,
  });
  store.setApiKeyCredentials({ key: "", headerName: "Authorization" });
});

describe("auth header computation", () => {
  it("returns empty headers for none auth type", () => {
    useConnectionStore.getState().setAuthType("none");
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });

  it("returns Basic header for basic auth with valid credentials", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("basic");
    store.setBasicCredentials({ username: "user", password: "pass" });
    expect(useConnectionStore.getState().authHeaders).toEqual({
      Authorization: `Basic ${btoa("user:pass")}`,
    });
  });

  it("returns empty headers for basic auth with missing password", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("basic");
    store.setBasicCredentials({ username: "user", password: "" });
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });

  it("returns empty headers for basic auth with missing username", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("basic");
    store.setBasicCredentials({ username: "", password: "pass" });
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });

  it("returns Bearer header for oauth2 with access token", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("oauth2");
    store.setOAuth2Credentials({
      clientId: "id",
      clientSecret: "secret",
      tokenUrl: "https://example.com/token",
      scopes: "read",
      accessToken: "my-token",
    });
    expect(useConnectionStore.getState().authHeaders).toEqual({
      Authorization: "Bearer my-token",
    });
  });

  it("returns empty headers for oauth2 without access token", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("oauth2");
    store.setOAuth2Credentials({
      clientId: "id",
      clientSecret: "secret",
      tokenUrl: "https://example.com/token",
      scopes: "read",
    });
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });

  it("returns API key header for apiKey with header delivery (default)", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("apiKey");
    store.setApiKeyCredentials({ key: "my-key", headerName: "X-API-Key" });
    expect(useConnectionStore.getState().authHeaders).toEqual({
      "X-API-Key": "my-key",
    });
  });

  it("returns API key header when in is explicitly header", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("apiKey");
    store.setApiKeyCredentials({ key: "my-key", headerName: "X-API-Key", in: "header" });
    expect(useConnectionStore.getState().authHeaders).toEqual({
      "X-API-Key": "my-key",
    });
  });

  it("returns empty headers for apiKey with query delivery", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("apiKey");
    store.setApiKeyCredentials({ key: "my-key", headerName: "api_key", in: "query" });
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });

  it("returns empty headers for apiKey with cookie delivery", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("apiKey");
    store.setApiKeyCredentials({ key: "my-key", headerName: "session", in: "cookie" });
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });

  it("returns empty headers for apiKey with empty key", () => {
    const store = useConnectionStore.getState();
    store.setAuthType("apiKey");
    store.setApiKeyCredentials({ key: "", headerName: "X-API-Key" });
    expect(useConnectionStore.getState().authHeaders).toEqual({});
  });
});

describe("setFromPredefined", () => {
  it("sets basic auth from predefined agent", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "basic",
      authConfig: { username: "user", password: "pass" },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("basic");
    expect(state.basicCredentials).toEqual({ username: "user", password: "pass" });
    expect(state.authHeaders).toEqual({
      Authorization: `Basic ${btoa("user:pass")}`,
    });
  });

  it("sets oauth2 client credentials from predefined agent", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "oauth2",
      authConfig: {
        clientId: "a2a-client",
        clientSecret: "a2a-secret",
        tokenUrl: "https://example.com/oauth/token",
        scopes: "a2a:invoke",
      },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("oauth2");
    expect(state.oauth2Credentials.clientId).toBe("a2a-client");
    expect(state.oauth2Credentials.clientSecret).toBe("a2a-secret");
    expect(state.oauth2Credentials.tokenUrl).toBe("https://example.com/oauth/token");
    expect(state.oauth2Credentials.scopes).toBe("a2a:invoke");
    // No access token yet — headers empty until token is fetched
    expect(state.authHeaders).toEqual({});
  });

  it("sets oauth2 with pre-existing access token from predefined agent", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "oauth2",
      authConfig: {
        clientId: "",
        clientSecret: "",
        tokenUrl: "",
        scopes: "",
        accessToken: "pre-existing-token",
      },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("oauth2");
    expect(state.oauth2Credentials.accessToken).toBe("pre-existing-token");
    expect(state.authHeaders).toEqual({
      Authorization: "Bearer pre-existing-token",
    });
  });

  it("sets oauth2 with authorization code flow config from predefined agent", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "oauth2",
      authConfig: {
        clientId: "a2a-client",
        clientSecret: "a2a-secret",
        tokenUrl: "https://example.com/oauth/token",
        scopes: "a2a:invoke",
        authorizationUrl: "https://example.com/oauth/authorize",
      },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("oauth2");
    expect(state.oauth2Credentials.authorizationUrl).toBe("https://example.com/oauth/authorize");
    // No access token yet
    expect(state.authHeaders).toEqual({});
  });

  it("sets apiKey header auth from predefined agent", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "apiKey",
      authConfig: { key: "my-key", headerName: "X-API-Key" },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("apiKey");
    expect(state.apiKeyCredentials).toEqual({ key: "my-key", headerName: "X-API-Key" });
    expect(state.authHeaders).toEqual({
      "X-API-Key": "my-key",
    });
  });

  it("sets apiKey query auth from predefined agent (no headers)", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "apiKey",
      authConfig: { key: "my-key", headerName: "api_key", in: "query" },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("apiKey");
    expect(state.apiKeyCredentials).toEqual({ key: "my-key", headerName: "api_key", in: "query" });
    // Query API keys are NOT sent as headers
    expect(state.authHeaders).toEqual({});
  });

  it("sets none auth from predefined agent", () => {
    useConnectionStore.getState().setFromPredefined({
      id: "test",
      name: "Test",
      description: "",
      url: "https://example.com",
      authType: "none",
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("none");
    expect(state.authHeaders).toEqual({});
  });
});

describe("setFromPredefined with dual auth (connectionAuth)", () => {
  it("sets oauth2 message auth with basic connection auth", () => {
    // Like the Dad Jokes agent: oauth2 for messages, basic for card fetch
    useConnectionStore.getState().setFromPredefined({
      id: "dad-jokes",
      name: "Dad Jokes",
      description: "",
      url: "https://example.com",
      authType: "oauth2",
      authConfig: {
        clientId: "a2a-client",
        clientSecret: "a2a-secret",
        tokenUrl: "https://example.com/oauth/token",
        scopes: "a2a:invoke",
      },
      connectionAuthType: "basic",
      connectionAuthConfig: { username: "admin", password: "secret" },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("oauth2");
    // Connection auth credentials overwrite basic credentials in the store
    expect(state.basicCredentials).toEqual({ username: "admin", password: "secret" });
    // OAuth2 config is from the message auth
    expect(state.oauth2Credentials.clientId).toBe("a2a-client");
    expect(state.connectionAuthType).toBe("basic");
  });

  it("sets oauth2 message auth with oauth2 connection auth (bearer token)", () => {
    // Like the Fitness agent: oauth2 with accessToken for both
    useConnectionStore.getState().setFromPredefined({
      id: "fitness",
      name: "Fitness",
      description: "",
      url: "https://example.com",
      authType: "oauth2",
      authConfig: {
        clientId: "",
        clientSecret: "",
        tokenUrl: "",
        scopes: "",
        accessToken: "pre-shared-token",
      },
      connectionAuthType: "oauth2",
      connectionAuthConfig: {
        clientId: "",
        clientSecret: "",
        tokenUrl: "",
        scopes: "",
        accessToken: "pre-shared-token",
      },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("oauth2");
    expect(state.oauth2Credentials.accessToken).toBe("pre-shared-token");
    expect(state.authHeaders).toEqual({
      Authorization: "Bearer pre-shared-token",
    });
  });

  it("sets apiKey message auth with apiKey connection auth (query params)", () => {
    // Like the Trivia agent: apiKey with query delivery for both
    useConnectionStore.getState().setFromPredefined({
      id: "trivia",
      name: "Trivia",
      description: "",
      url: "https://example.com",
      authType: "apiKey",
      authConfig: { key: "my-key", headerName: "api_key", in: "query" },
      connectionAuthType: "apiKey",
      connectionAuthConfig: { key: "my-key", headerName: "api_key", in: "query" },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("apiKey");
    expect(state.apiKeyCredentials.in).toBe("query");
    // Query API keys produce no auth headers
    expect(state.authHeaders).toEqual({});
  });

  it("sets apiKey message auth with apiKey connection auth (header)", () => {
    // Like the Storyteller agent: apiKey with header delivery for both
    useConnectionStore.getState().setFromPredefined({
      id: "storyteller",
      name: "Storyteller",
      description: "",
      url: "https://example.com",
      authType: "apiKey",
      authConfig: { key: "my-key", headerName: "X-API-Key" },
      connectionAuthType: "apiKey",
      connectionAuthConfig: { key: "my-key", headerName: "X-API-Key" },
    });

    const state = useConnectionStore.getState();
    expect(state.authType).toBe("apiKey");
    expect(state.apiKeyCredentials.headerName).toBe("X-API-Key");
    expect(state.authHeaders).toEqual({
      "X-API-Key": "my-key",
    });
  });
});
