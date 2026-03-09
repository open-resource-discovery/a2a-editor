import { create } from "zustand";
import type {
  AuthType,
  BasicCredentials,
  OAuth2Credentials,
  ApiKeyCredentials,
  ConnectionStatus,
  PredefinedAgent,
} from "@lib/types/connection";
import type { AgentCard } from "@lib/types/a2a";
import type { HttpLogEntry } from "@lib/types/httpLog";
import { isMockUrl, getMockAgentCard } from "@lib/mock/agents";
import { useHttpLogStore } from "./httpLogStore";
import { v4 as uuidv4 } from "uuid";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storeOAuthParams,
  getStoredOAuthParams,
  clearOAuthParams,
} from "@lib/utils/pkce";

// Compute auth headers from current state
function computeAuthHeaders(
  authType: AuthType,
  basicCredentials: BasicCredentials,
  oauth2Credentials: OAuth2Credentials,
  apiKeyCredentials: ApiKeyCredentials,
): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (authType) {
    case "basic": {
      const { username, password } = basicCredentials;
      if (username && password) {
        headers["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
      }
      break;
    }
    case "oauth2": {
      const { accessToken } = oauth2Credentials;
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      break;
    }
    case "apiKey": {
      const { key, headerName } = apiKeyCredentials;
      if (key) {
        headers[headerName] = key;
      }
      break;
    }
  }

  return headers;
}

interface ConnectionState {
  url: string;
  authType: AuthType;
  connectionAuthType: AuthType | null;
  basicCredentials: BasicCredentials;
  oauth2Credentials: OAuth2Credentials;
  apiKeyCredentials: ApiKeyCredentials;
  authHeaders: Record<string, string>;
  connectionStatus: ConnectionStatus;
  errorMessage: string;
  requiredAuth: { type: AuthType; label: string } | null;
  isTokenLoading: boolean;
  tokenError: string;
  isAuthFlowInProgress: boolean;

  setUrl: (url: string) => void;
  setAuthType: (type: AuthType) => void;
  setBasicCredentials: (creds: Partial<BasicCredentials>) => void;
  setOAuth2Credentials: (creds: Partial<OAuth2Credentials>) => void;
  setApiKeyCredentials: (creds: Partial<ApiKeyCredentials>) => void;
  connect: (headers?: Record<string, string>) => Promise<AgentCard | null>;
  disconnect: () => void;
  reset: () => void;
  setFromPredefined: (agent: PredefinedAgent) => void;
  autoConfigureAuth: (card: AgentCard, schemeName?: string) => void;
  fetchOAuth2Token: () => Promise<boolean>;
  startAuthCodeFlow: () => Promise<void>;
  handleAuthCallback: (code: string, state: string) => Promise<boolean>;
  cancelAuthFlow: () => void;
}

const EMPTY_AUTH_HEADERS: Record<string, string> = {};

// Keep popup reference outside store to avoid non-serializable state
let oauthPopup: Window | null = null;

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  url: "",
  authType: "none",
  connectionAuthType: null,
  basicCredentials: { username: "", password: "" },
  oauth2Credentials: {
    clientId: "",
    clientSecret: "",
    tokenUrl: "",
    scopes: "",
  },
  apiKeyCredentials: { key: "", headerName: "Authorization" },
  authHeaders: EMPTY_AUTH_HEADERS,
  connectionStatus: "disconnected",
  errorMessage: "",
  requiredAuth: null,
  isTokenLoading: false,
  tokenError: "",
  isAuthFlowInProgress: false,

  setUrl: (url) => set({ url }),

  setAuthType: (authType) => {
    const state = get();
    const authHeaders = computeAuthHeaders(
      authType,
      state.basicCredentials,
      state.oauth2Credentials,
      state.apiKeyCredentials,
    );
    set({ authType, authHeaders });
  },

  setBasicCredentials: (creds) => {
    const state = get();
    const basicCredentials = { ...state.basicCredentials, ...creds };
    const authHeaders = computeAuthHeaders(
      state.authType,
      basicCredentials,
      state.oauth2Credentials,
      state.apiKeyCredentials,
    );
    set({ basicCredentials, authHeaders });
  },

  setOAuth2Credentials: (creds) => {
    const state = get();
    const oauth2Credentials = { ...state.oauth2Credentials, ...creds };
    const authHeaders = computeAuthHeaders(
      state.authType,
      state.basicCredentials,
      oauth2Credentials,
      state.apiKeyCredentials,
    );
    set({ oauth2Credentials, authHeaders });
  },

  setApiKeyCredentials: (creds) => {
    const state = get();
    const apiKeyCredentials = { ...state.apiKeyCredentials, ...creds };
    const authHeaders = computeAuthHeaders(
      state.authType,
      state.basicCredentials,
      state.oauth2Credentials,
      apiKeyCredentials,
    );
    set({ apiKeyCredentials, authHeaders });
  },

  connect: async (headers) => {
    const state = get();
    if (!state.url) return null;

    set({ connectionStatus: "connecting", errorMessage: "" });

    try {
      // Handle mock agents client-side
      if (isMockUrl(state.url)) {
        const card = getMockAgentCard(state.url);
        if (!card) throw new Error("Mock agent not found");
        set({ connectionStatus: "connected" });
        return card;
      }

      // Auto-discover: if URL doesn't end with .json, append well-known path
      const fetchUrl = state.url.endsWith(".json")
        ? state.url
        : `${state.url.replace(/\/$/, "")}/.well-known/agent-card.json`;

      const res = await fetch(fetchUrl, { headers: headers ?? state.authHeaders });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(`Authentication required (${res.status})`);
        }
        throw new Error(`Failed to fetch agent card (${res.status})`);
      }

      const data = await res.json();
      set({ connectionStatus: "connected" });
      return data as AgentCard;
    } catch (err) {
      set({
        connectionStatus: "error",
        errorMessage: err instanceof Error ? err.message : "Connection failed",
      });
      return null;
    }
  },

  disconnect: () =>
    set({
      connectionStatus: "disconnected",
      errorMessage: "",
      authHeaders: EMPTY_AUTH_HEADERS,
      authType: "none",
      connectionAuthType: null,
      basicCredentials: { username: "", password: "" },
      oauth2Credentials: {
        clientId: "",
        clientSecret: "",
        tokenUrl: "",
        scopes: "",
      },
      apiKeyCredentials: { key: "", headerName: "Authorization" },
      requiredAuth: null,
      isTokenLoading: false,
      tokenError: "",
    }),

  reset: () => {
    set({
      url: "",
      authType: "none",
      connectionAuthType: null,
      basicCredentials: { username: "", password: "" },
      oauth2Credentials: {
        clientId: "",
        clientSecret: "",
        tokenUrl: "",
        scopes: "",
      },
      apiKeyCredentials: { key: "", headerName: "Authorization" },
      authHeaders: EMPTY_AUTH_HEADERS,
      connectionStatus: "disconnected",
      errorMessage: "",
      requiredAuth: null,
      isTokenLoading: false,
      tokenError: "",
      isAuthFlowInProgress: false,
    });
    oauthPopup = null;
  },

  setFromPredefined: (agent) => {
    let basicCredentials: BasicCredentials = { username: "", password: "" };
    let oauth2Credentials: OAuth2Credentials = { clientId: "", clientSecret: "", tokenUrl: "", scopes: "" };
    let apiKeyCredentials: ApiKeyCredentials = { key: "", headerName: "Authorization" };

    // Populate A2A message auth credentials
    if (agent.authConfig) {
      switch (agent.authType) {
        case "basic":
          basicCredentials = agent.authConfig as BasicCredentials;
          break;
        case "oauth2":
          oauth2Credentials = agent.authConfig as OAuth2Credentials;
          break;
        case "apiKey":
          apiKeyCredentials = agent.authConfig as ApiKeyCredentials;
          break;
      }
    }

    // Also populate connection auth credentials (if different from A2A auth)
    if (agent.connectionAuthConfig && agent.connectionAuthType) {
      switch (agent.connectionAuthType) {
        case "basic":
          basicCredentials = agent.connectionAuthConfig as BasicCredentials;
          break;
        case "oauth2":
          oauth2Credentials = agent.connectionAuthConfig as OAuth2Credentials;
          break;
        case "apiKey":
          apiKeyCredentials = agent.connectionAuthConfig as ApiKeyCredentials;
          break;
      }
    }

    const authHeaders = computeAuthHeaders(agent.authType, basicCredentials, oauth2Credentials, apiKeyCredentials);

    set({
      url: agent.url,
      authType: agent.authType,
      connectionAuthType: agent.connectionAuthType ?? agent.authType,
      basicCredentials,
      oauth2Credentials,
      apiKeyCredentials,
      authHeaders,
    });
  },

  autoConfigureAuth: (card, schemeName) => {
    if (!card.securitySchemes || Object.keys(card.securitySchemes).length === 0) {
      set({ requiredAuth: { type: "none", label: "None required" } });
      return;
    }

    // Use specified scheme or default to first
    const entries = Object.entries(card.securitySchemes);
    const entry = schemeName
      ? entries.find(([n]) => n === schemeName)
      : entries[0];
    if (!entry) return;
    const [name, scheme] = entry;
    const state = get();

    switch (scheme.type) {
      case "http":
        if (scheme.scheme === "basic") {
          const authHeaders = computeAuthHeaders(
            "basic",
            state.basicCredentials,
            state.oauth2Credentials,
            state.apiKeyCredentials,
          );
          set({
            requiredAuth: { type: "basic", label: `Basic Auth (${name})` },
            authType: "basic",
            authHeaders,
          });
        } else {
          const authHeaders = computeAuthHeaders(
            "oauth2",
            state.basicCredentials,
            state.oauth2Credentials,
            state.apiKeyCredentials,
          );
          set({
            requiredAuth: { type: "oauth2", label: `Bearer Token (${name})` },
            authType: "oauth2",
            authHeaders,
          });
        }
        break;
      case "oauth2": {
        const clientCredentialsFlow = scheme.flows?.clientCredentials;
        const authCodeFlow = scheme.flows?.authorizationCode;
        // Prefer authorization code flow if available
        const flow = authCodeFlow ?? clientCredentialsFlow;
        const oauth2Credentials: OAuth2Credentials = {
          ...state.oauth2Credentials,
          tokenUrl: flow?.tokenUrl ?? state.oauth2Credentials.tokenUrl,
          scopes: flow?.scopes ? Object.keys(flow.scopes).join(" ") : state.oauth2Credentials.scopes,
          authorizationUrl: authCodeFlow?.authorizationUrl,
        };
        const authHeaders = computeAuthHeaders(
          "oauth2",
          state.basicCredentials,
          oauth2Credentials,
          state.apiKeyCredentials,
        );
        set({
          requiredAuth: { type: "oauth2", label: `OAuth 2.0 (${name})` },
          authType: "oauth2",
          oauth2Credentials,
          authHeaders,
        });
        break;
      }
      case "apiKey": {
        const apiKeyCredentials = {
          key: state.apiKeyCredentials.key,
          headerName: scheme.name ?? "Authorization",
        };
        const authHeaders = computeAuthHeaders(
          "apiKey",
          state.basicCredentials,
          state.oauth2Credentials,
          apiKeyCredentials,
        );
        set({
          requiredAuth: {
            type: "apiKey",
            label: `API Key (${scheme.in ?? "header"}: ${scheme.name ?? name})`,
          },
          authType: "apiKey",
          apiKeyCredentials,
          authHeaders,
        });
        break;
      }
      case "openIdConnect": {
        const authHeaders = computeAuthHeaders(
          "oauth2",
          state.basicCredentials,
          state.oauth2Credentials,
          state.apiKeyCredentials,
        );
        set({
          requiredAuth: { type: "oauth2", label: `OpenID Connect (${name})` },
          authType: "oauth2",
          authHeaders,
        });
        break;
      }
      default:
        set({
          requiredAuth: { type: "none", label: `${scheme.type} (${name})` },
        });
    }
  },

  fetchOAuth2Token: async () => {
    const state = get();
    const { clientId, clientSecret, tokenUrl, scopes } = state.oauth2Credentials;

    if (!tokenUrl) {
      set({ tokenError: "Token URL is required" });
      return false;
    }

    if (!clientId || !clientSecret) {
      set({ tokenError: "Client ID and Client Secret are required" });
      return false;
    }

    set({ isTokenLoading: true, tokenError: "" });

    try {
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      });

      if (scopes) {
        body.append("scope", scopes);
      }

      const requestHeaders = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      const requestBody = body.toString();
      const redactedBody = requestBody.replace(
        /client_secret=[^&]*/,
        "client_secret=***REDACTED***",
      );
      const startTime = Date.now();

      const logEntry: HttpLogEntry = {
        id: uuidv4(),
        chatMessageId: `oauth-token-${uuidv4()}`,
        timestamp: new Date(),
        request: {
          method: "POST",
          url: tokenUrl,
          headers: requestHeaders,
          body: redactedBody,
        },
        response: null,
      };

      try {
        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: requestHeaders,
          body: requestBody,
        });

        const responseBody = await response.text();
        logEntry.response = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
        };
        logEntry.durationMs = Date.now() - startTime;
        useHttpLogStore.getState().addLog(logEntry);

        if (!response.ok) {
          throw new Error(`Token request failed: ${response.status} ${responseBody}`);
        }

        const data = JSON.parse(responseBody);
        const accessToken = data.access_token;

        if (!accessToken) {
          throw new Error("No access_token in response");
        }

        const oauth2Credentials = { ...state.oauth2Credentials, accessToken };
        const authHeaders = computeAuthHeaders(
          "oauth2",
          state.basicCredentials,
          oauth2Credentials,
          state.apiKeyCredentials,
        );

        set({
          oauth2Credentials,
          authHeaders,
          isTokenLoading: false,
          tokenError: "",
        });

        return true;
      } catch (fetchErr) {
        if (!logEntry.response) {
          logEntry.error = fetchErr instanceof Error ? fetchErr.message : "Unknown error";
          logEntry.durationMs = Date.now() - startTime;
          useHttpLogStore.getState().addLog(logEntry);
        }
        throw fetchErr;
      }
    } catch (err) {
      set({
        isTokenLoading: false,
        tokenError: err instanceof Error ? err.message : "Failed to fetch token",
      });
      return false;
    }
  },

  startAuthCodeFlow: async () => {
    const state = get();
    const { authorizationUrl, clientId, scopes, redirectUri } = state.oauth2Credentials;

    if (!authorizationUrl) {
      set({ tokenError: "Authorization URL is required for OAuth flow" });
      return;
    }

    if (!clientId) {
      set({ tokenError: "Client ID is required" });
      return;
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const oauthState = generateState();

    // Use provided redirect URI or default to current origin
    const finalRedirectUri = redirectUri || `${window.location.origin}/oauth/callback`;

    // Store parameters for callback
    storeOAuthParams({
      codeVerifier,
      state: oauthState,
      redirectUri: finalRedirectUri,
    });

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: finalRedirectUri,
      state: oauthState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    if (scopes) {
      params.append("scope", scopes);
    }

    const authUrl = `${authorizationUrl}?${params.toString()}`;

    // Open popup for authorization
    const popup = window.open(authUrl, "oauth_popup", "width=600,height=700,scrollbars=yes,resizable=yes");

    if (!popup) {
      set({
        tokenError: "Failed to open authorization popup. Please allow popups for this site.",
      });
      clearOAuthParams();
      return;
    }

    set({
      isAuthFlowInProgress: true,
      tokenError: "",
    });
    oauthPopup = popup;

    // Monitor popup for closure (with 5-minute timeout to prevent infinite polling)
    const MAX_POPUP_WAIT_MS = 5 * 60 * 1000;
    const popupOpenedAt = Date.now();
    const checkClosed = setInterval(() => {
      if (popup.closed || Date.now() - popupOpenedAt > MAX_POPUP_WAIT_MS) {
        clearInterval(checkClosed);
        const currentState = get();
        if (currentState.isAuthFlowInProgress) {
          set({
            isAuthFlowInProgress: false,
            tokenError: popup.closed
              ? "Authorization was cancelled"
              : "Authorization timed out",
          });
          oauthPopup = null;
          clearOAuthParams();
        }
      }
    }, 500);
  },

  handleAuthCallback: async (code: string, returnedState: string) => {
    const state = get();
    const stored = getStoredOAuthParams();

    // Verify state to prevent CSRF
    if (!stored.state || stored.state !== returnedState) {
      set({
        tokenError: "Invalid state parameter - possible CSRF attack",
        isAuthFlowInProgress: false,
      });
      clearOAuthParams();
      return false;
    }

    if (!stored.codeVerifier) {
      set({
        tokenError: "Missing code verifier",
        isAuthFlowInProgress: false,
      });
      clearOAuthParams();
      return false;
    }

    const { tokenUrl, clientId, clientSecret } = state.oauth2Credentials;

    if (!tokenUrl) {
      set({
        tokenError: "Token URL is required",
        isAuthFlowInProgress: false,
      });
      clearOAuthParams();
      return false;
    }

    set({ isTokenLoading: true, tokenError: "" });

    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: stored.redirectUri || "",
        client_id: clientId,
        code_verifier: stored.codeVerifier,
      });

      // Include client_secret if provided (some providers require it even with PKCE)
      if (clientSecret) {
        body.append("client_secret", clientSecret);
      }

      const requestHeaders = {
        "Content-Type": "application/x-www-form-urlencoded",
      };
      const requestBody = body.toString();
      const startTime = Date.now();

      const logEntry: HttpLogEntry = {
        id: uuidv4(),
        chatMessageId: `oauth-token-${uuidv4()}`,
        timestamp: new Date(),
        request: {
          method: "POST",
          url: tokenUrl,
          headers: requestHeaders,
          body: requestBody.replace(/code_verifier=[^&]+/, "code_verifier=[REDACTED]"),
        },
        response: null,
      };

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: requestHeaders,
        body: requestBody,
      });

      const responseBody = await response.text();
      logEntry.response = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
      };
      logEntry.durationMs = Date.now() - startTime;
      useHttpLogStore.getState().addLog(logEntry);

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${responseBody}`);
      }

      const data = JSON.parse(responseBody);
      const accessToken = data.access_token;
      const refreshToken = data.refresh_token;
      const expiresIn = data.expires_in;

      if (!accessToken) {
        throw new Error("No access_token in response");
      }

      const oauth2Credentials = {
        ...state.oauth2Credentials,
        accessToken,
        refreshToken,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
      };

      const authHeaders = computeAuthHeaders(
        "oauth2",
        state.basicCredentials,
        oauth2Credentials,
        state.apiKeyCredentials,
      );

      // Close popup if still open
      if (oauthPopup && !oauthPopup.closed) {
        oauthPopup.close();
      }

      set({
        oauth2Credentials,
        authHeaders,
        isTokenLoading: false,
        isAuthFlowInProgress: false,
        tokenError: "",
      });
      oauthPopup = null;

      clearOAuthParams();
      return true;
    } catch (err) {
      set({
        isTokenLoading: false,
        isAuthFlowInProgress: false,
        tokenError: err instanceof Error ? err.message : "Failed to exchange code for token",
      });
      clearOAuthParams();
      return false;
    }
  },

  cancelAuthFlow: () => {
    if (oauthPopup && !oauthPopup.closed) {
      oauthPopup.close();
    }
    oauthPopup = null;
    clearOAuthParams();
    set({
      isAuthFlowInProgress: false,
      tokenError: "",
    });
  },
}));

// Selector for auth headers - now just returns stored state
export const selectAuthHeaders = (state: ConnectionState): Record<string, string> => state.authHeaders;

// Hook to get auth headers
export const useAuthHeaders = () => {
  return useConnectionStore((state) => state.authHeaders);
};
