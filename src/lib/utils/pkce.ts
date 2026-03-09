/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0 Authorization Code flow
 * RFC 7636: https://datatracker.ietf.org/doc/html/rfc7636
 */

/**
 * Generate a cryptographically random code verifier
 * Must be between 43-128 characters, using unreserved URI characters
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a code challenge from the verifier using SHA-256
 * Returns a base64url-encoded hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64url encode a byte array (RFC 4648)
 * Different from standard base64: uses - instead of +, _ instead of /, no padding
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Storage keys for OAuth flow state
 */
export const OAUTH_STORAGE_KEYS = {
  CODE_VERIFIER: "a2a_oauth_code_verifier",
  STATE: "a2a_oauth_state",
  REDIRECT_URI: "a2a_oauth_redirect_uri",
} as const;

/**
 * Store PKCE and state parameters in sessionStorage
 */
export function storeOAuthParams(params: {
  codeVerifier: string;
  state: string;
  redirectUri: string;
}): void {
  try {
    sessionStorage.setItem(
      OAUTH_STORAGE_KEYS.CODE_VERIFIER,
      params.codeVerifier,
    );
    sessionStorage.setItem(OAUTH_STORAGE_KEYS.STATE, params.state);
    sessionStorage.setItem(OAUTH_STORAGE_KEYS.REDIRECT_URI, params.redirectUri);
  } catch {
    // Silently handle storage errors (sandboxed iframes, private browsing)
  }
}

/**
 * Retrieve stored PKCE and state parameters
 */
export function getStoredOAuthParams(): {
  codeVerifier: string | null;
  state: string | null;
  redirectUri: string | null;
} {
  try {
    return {
      codeVerifier: sessionStorage.getItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER),
      state: sessionStorage.getItem(OAUTH_STORAGE_KEYS.STATE),
      redirectUri: sessionStorage.getItem(OAUTH_STORAGE_KEYS.REDIRECT_URI),
    };
  } catch {
    return { codeVerifier: null, state: null, redirectUri: null };
  }
}

/**
 * Clear stored OAuth parameters after use
 */
export function clearOAuthParams(): void {
  try {
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.CODE_VERIFIER);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.STATE);
    sessionStorage.removeItem(OAUTH_STORAGE_KEYS.REDIRECT_URI);
  } catch {
    // Silently handle storage errors
  }
}
