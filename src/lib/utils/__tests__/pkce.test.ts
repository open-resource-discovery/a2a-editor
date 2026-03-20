import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storeOAuthParams,
  getStoredOAuthParams,
  clearOAuthParams,
  OAUTH_STORAGE_KEYS,
} from "../pkce";

describe("generateCodeVerifier", () => {
  it("returns a base64url string of expected length", () => {
    const verifier = generateCodeVerifier();
    // 32 bytes base64url encoded = 43 characters
    expect(verifier.length).toBe(43);
  });

  it("produces unique values on successive calls", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });

  it("only contains base64url-safe characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("generateCodeChallenge", () => {
  it("returns a base64url string", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is deterministic for the same verifier", async () => {
    const verifier = generateCodeVerifier();
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });

  it("produces different challenges for different verifiers", async () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    const c1 = await generateCodeChallenge(v1);
    const c2 = await generateCodeChallenge(v2);
    expect(c1).not.toBe(c2);
  });
});

describe("generateState", () => {
  it("returns a base64url string of expected length", () => {
    const state = generateState();
    // 16 bytes base64url encoded = 22 characters
    expect(state.length).toBe(22);
  });

  it("produces unique values on successive calls", () => {
    const s1 = generateState();
    const s2 = generateState();
    expect(s1).not.toBe(s2);
  });

  it("only contains base64url-safe characters", () => {
    const state = generateState();
    expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("OAuth params storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stores and retrieves OAuth params", () => {
    const params = {
      codeVerifier: "test-verifier",
      state: "test-state",
      redirectUri: "http://localhost/callback",
    };

    storeOAuthParams(params);
    const retrieved = getStoredOAuthParams();

    expect(retrieved.codeVerifier).toBe("test-verifier");
    expect(retrieved.state).toBe("test-state");
    expect(retrieved.redirectUri).toBe("http://localhost/callback");
  });

  it("returns nulls when no params stored", () => {
    const retrieved = getStoredOAuthParams();
    expect(retrieved.codeVerifier).toBeNull();
    expect(retrieved.state).toBeNull();
    expect(retrieved.redirectUri).toBeNull();
  });

  it("clears stored OAuth params", () => {
    storeOAuthParams({
      codeVerifier: "test-verifier",
      state: "test-state",
      redirectUri: "http://localhost/callback",
    });

    clearOAuthParams();

    expect(sessionStorage.getItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER)).toBeNull();
    expect(sessionStorage.getItem(OAUTH_STORAGE_KEYS.STATE)).toBeNull();
    expect(sessionStorage.getItem(OAUTH_STORAGE_KEYS.REDIRECT_URI)).toBeNull();
  });
});
