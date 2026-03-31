import { create } from "zustand";
import type {
  AuthType,
  BasicCredentials,
  OAuth2Credentials,
  ApiKeyCredentials,
  ConnectionStatus,
  PredefinedAgent,
  DeviceCodeState,
  OidcDiscoveryDoc,
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
  getDefaultOAuthRedirectUri,
} from "@lib/utils/pkce";
import { detectProtocolVersion, normalizeAgentCard, PROTOCOL_VERSIONS } from "@lib/utils/a2a-protocol";

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
      // Only set header for header-based API keys (default)
      // Query and cookie API keys are handled at the request level
      if (key && (!apiKeyCredentials.in || apiKeyCredentials.in === "header")) {
        headers[headerName] = key;
      }
      break;
    }
  }

  return headers;
}

interface ConnectionState {
  url: string;
  messagingUrl: string;
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
  deviceCodeState: DeviceCodeState | null;
  oidcDiscovery: OidcDiscoveryDoc | null;
  isOidcDiscovering: boolean;
  protocolVersion: string;

  setUrl: (url: string) => void;
  setMessagingUrl: (messagingUrl: string) => void;
  setAuthType: (type: AuthType) => void;
  setBasicCredentials: (creds: Partial<BasicCredentials>) => void;
  setOAuth2Credentials: (creds: Partial<OAuth2Credentials>) => void;
  setApiKeyCredentials: (creds: Partial<ApiKeyCredentials>) => void;
  connect: (headers?: Record<string, string>) => Promise<{ card: AgentCard; rawJson: string } | null>;
  disconnect: () => void;
  reset: () => void;
  setFromPredefined: (agent: PredefinedAgent) => void;
  autoConfigureAuth: (card: AgentCard, schemeName?: string) => void;
  fetchOAuth2Token: () => Promise<boolean>;
  startAuthCodeFlow: () => Promise<void>;
  handleAuthCallback: (code: string, state: string) => Promise<boolean>;
  cancelAuthFlow: () => void;
  startDeviceCodeFlow: (deviceAuthUrl: string, tokenUrl: string) => Promise<void>;
  cancelDeviceCodeFlow: () => void;
  refreshOAuth2Token: () => Promise<boolean>;
  discoverOidc: (openIdConnectUrl: string) => Promise<void>;
  fetchOAuth2Metadata: (metadataUrl: string) => Promise<void>;
}

const EMPTY_AUTH_HEADERS: Record<string, string> = {};

// Keep popup reference outside store to avoid non-serializable state
let oauthPopup: Window | null = null;
// Keep device code polling timer outside store
let deviceCodePollTimer: ReturnType<typeof setTimeout> | null = null;

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  url: "",
  messagingUrl: "",
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
  deviceCodeState: null,
  oidcDiscovery: null,
  isOidcDiscovering: false,
  protocolVersion: PROTOCOL_VERSIONS.V0_3,

  setUrl: (url) => set({ url }),
  setMessagingUrl: (messagingUrl) => set({ messagingUrl }),

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
        set({ connectionStatus: "connected", protocolVersion: PROTOCOL_VERSIONS.V0_3 });
        return card;
      }

      // Auto-discover: if URL doesn't end with .json, try well-known paths
      let fetchUrl: string;
      let data: unknown;

      // Build effective fetch headers and URL query params
      const fetchHeaders = headers ?? state.authHeaders;

      // Append query-param API key if configured
      const appendApiKeyQuery = (url: string): string => {
        if (state.authType === "apiKey" && state.apiKeyCredentials.in === "query" && state.apiKeyCredentials.key) {
          const separator = url.includes("?") ? "&" : "?";
          return `${url}${separator}${encodeURIComponent(state.apiKeyCredentials.headerName)}=${encodeURIComponent(state.apiKeyCredentials.key)}`;
        }
        return url;
      };

      if (state.url.endsWith(".json")) {
        fetchUrl = appendApiKeyQuery(state.url);
        const res = await fetch(fetchUrl, { headers: fetchHeaders });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(`Authentication required (${res.status})`);
          }
          throw new Error(`Failed to fetch agent card (${res.status})`);
        }
        data = await res.json();
      } else {
        const baseUrl = state.url.replace(/\/$/, "");
        // Try v1.0.0 path first (/.well-known/agent.json), fall back to v0.3.0
        const v1Url = appendApiKeyQuery(`${baseUrl}/.well-known/agent.json`);
        const v03Url = appendApiKeyQuery(`${baseUrl}/.well-known/agent-card.json`);

        let res = await fetch(v1Url, { headers: fetchHeaders });
        if (res.status === 404) {
          res = await fetch(v03Url, { headers: fetchHeaders });
        }

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error(`Authentication required (${res.status})`);
          }
          throw new Error(`Failed to fetch agent card (${res.status})`);
        }
        data = await res.json();
      }

      // Preserve original JSON before normalization (for the editor)
      const rawJson = JSON.stringify(data, null, 2);

      // Detect protocol version and normalize the card
      const version = detectProtocolVersion(data);
      const card = normalizeAgentCard(data);

      // Store messaging URL from card (don't overwrite discovery URL)
      if (card.url) {
        set({ messagingUrl: card.url });
      }

      set({ connectionStatus: "connected", protocolVersion: version });
      return { card, rawJson };
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
      isTokenLoading: false,
      tokenError: "",
      messagingUrl: "",
    }),

  reset: () => {
    if (deviceCodePollTimer) {
      clearTimeout(deviceCodePollTimer);
      deviceCodePollTimer = null;
    }
    set({
      url: "",
      messagingUrl: "",
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
      deviceCodeState: null,
      oidcDiscovery: null,
      isOidcDiscovering: false,
      protocolVersion: PROTOCOL_VERSIONS.V0_3,
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
      protocolVersion: agent.protocolVersion ?? PROTOCOL_VERSIONS.V0_3,
    });
  },

  autoConfigureAuth: (card, schemeName) => {
    if (!card.securitySchemes || Object.keys(card.securitySchemes).length === 0) {
      set({ requiredAuth: { type: "none", label: "None required" } });
      return;
    }

    // Use specified scheme or default to first
    const entries = Object.entries(card.securitySchemes);
    const entry = schemeName ? entries.find(([n]) => n === schemeName) : entries[0];
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
        // If oauth2MetadataUrl is present, fetch metadata to discover endpoints
        if (scheme.oauth2MetadataUrl) {
          // Fire and forget — will update credentials async
          get().fetchOAuth2Metadata(scheme.oauth2MetadataUrl);
        }

        const clientCredentialsFlow = scheme.flows?.clientCredentials;
        const authCodeFlow = scheme.flows?.authorizationCode;
        const deviceCodeFlow = scheme.flows?.deviceCode;
        // Prefer authorization code flow if available
        const flow = authCodeFlow ?? clientCredentialsFlow;
        const oauth2Credentials: OAuth2Credentials = {
          ...state.oauth2Credentials,
          tokenUrl: flow?.tokenUrl ?? deviceCodeFlow?.tokenUrl ?? state.oauth2Credentials.tokenUrl,
          scopes: flow?.scopes
            ? Object.keys(flow.scopes).join(" ")
            : deviceCodeFlow?.scopes
              ? Object.keys(deviceCodeFlow.scopes).join(" ")
              : state.oauth2Credentials.scopes,
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
        const apiKeyCredentials: ApiKeyCredentials = {
          key: state.apiKeyCredentials.key,
          headerName: scheme.name ?? "Authorization",
          in: scheme.in ?? "header",
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
        // Start OIDC discovery if URL is provided
        if (scheme.openIdConnectUrl) {
          get().discoverOidc(scheme.openIdConnectUrl);
        }
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
      case "mutualTLS": {
        // mTLS cannot be configured in-browser; just set informational label
        set({
          requiredAuth: { type: "none", label: `Mutual TLS (${name})` },
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
      const redactedBody = requestBody.replace(/client_secret=[^&]*/, "client_secret=***REDACTED***");
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

    // Use provided redirect URI or detect from deployment context
    const finalRedirectUri = redirectUri || getDefaultOAuthRedirectUri();

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
            tokenError: popup.closed ? "Authorization was cancelled" : "Authorization timed out",
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

  startDeviceCodeFlow: async (deviceAuthUrl, tokenUrl) => {
    const state = get();
    const { clientId, scopes } = state.oauth2Credentials;

    if (!clientId) {
      set({ tokenError: "Client ID is required for device code flow" });
      return;
    }

    set({ isTokenLoading: true, tokenError: "" });

    try {
      const body = new URLSearchParams({ client_id: clientId });
      if (scopes) {
        body.append("scope", scopes);
      }

      const startTime = Date.now();
      const logEntry: HttpLogEntry = {
        id: uuidv4(),
        chatMessageId: `device-code-${uuidv4()}`,
        timestamp: new Date(),
        request: {
          method: "POST",
          url: deviceAuthUrl,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        },
        response: null,
      };

      const response = await fetch(deviceAuthUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
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
        throw new Error(`Device authorization failed: ${response.status} ${responseBody}`);
      }

      const data = JSON.parse(responseBody);
      const deviceCode = data.device_code;
      const userCode = data.user_code;
      const verificationUri = data.verification_uri;
      const verificationUriComplete = data.verification_uri_complete;
      const expiresIn = data.expires_in ?? 600;
      const interval = data.interval ?? 5;

      if (!deviceCode || !userCode || !verificationUri) {
        throw new Error("Invalid device authorization response");
      }

      set({
        isTokenLoading: false,
        deviceCodeState: {
          deviceCode,
          userCode,
          verificationUri,
          verificationUriComplete,
          expiresAt: Date.now() + expiresIn * 1000,
          interval,
          isPolling: true,
        },
      });

      // Start polling for token using recursive setTimeout (handles slow_down naturally)
      const pollForToken = (currentInterval: number) => {
        deviceCodePollTimer = setTimeout(async () => {
          const currentState = get();
          if (!currentState.deviceCodeState?.isPolling) {
            deviceCodePollTimer = null;
            return;
          }

          // Check expiry
          if (Date.now() > currentState.deviceCodeState.expiresAt) {
            deviceCodePollTimer = null;
            set({
              deviceCodeState: null,
              tokenError: "Device code expired. Please try again.",
            });
            return;
          }

          try {
            const tokenBody = new URLSearchParams({
              grant_type: "urn:ietf:params:oauth:grant-type:device_code",
              device_code: currentState.deviceCodeState.deviceCode,
              client_id: currentState.oauth2Credentials.clientId,
            });

            const tokenResponse = await fetch(tokenUrl, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: tokenBody.toString(),
            });

            const tokenResponseBody = await tokenResponse.text();
            const tokenData = JSON.parse(tokenResponseBody);

            if (tokenData.error === "authorization_pending") {
              pollForToken(currentInterval);
              return;
            }

            if (tokenData.error === "slow_down") {
              // Increase interval by 5 seconds per RFC 8628
              pollForToken(currentInterval + 5);
              return;
            }

            if (tokenData.error === "access_denied") {
              deviceCodePollTimer = null;
              set({
                deviceCodeState: null,
                tokenError: "Authorization denied by user",
              });
              return;
            }

            if (tokenData.error === "expired_token") {
              deviceCodePollTimer = null;
              set({
                deviceCodeState: null,
                tokenError: "Device code expired",
              });
              return;
            }

            if (tokenData.error) {
              deviceCodePollTimer = null;
              set({
                deviceCodeState: null,
                tokenError: tokenData.error_description ?? tokenData.error,
              });
              return;
            }

            // Success — got a token
            deviceCodePollTimer = null;

            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token;
            const tokenExpiresIn = tokenData.expires_in;

            if (!accessToken) {
              set({
                deviceCodeState: null,
                tokenError: "No access_token in response",
              });
              return;
            }

            // Log the successful token exchange
            const tokenLogEntry: HttpLogEntry = {
              id: uuidv4(),
              chatMessageId: `device-token-${uuidv4()}`,
              timestamp: new Date(),
              request: {
                method: "POST",
                url: tokenUrl,
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: tokenBody.toString().replace(/device_code=[^&]+/, "device_code=[REDACTED]"),
              },
              response: {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                headers: Object.fromEntries(tokenResponse.headers.entries()),
                body: tokenResponseBody,
              },
              durationMs: 0,
            };
            useHttpLogStore.getState().addLog(tokenLogEntry);

            const updatedOAuth2 = {
              ...currentState.oauth2Credentials,
              accessToken,
              refreshToken,
              expiresAt: tokenExpiresIn ? Date.now() + tokenExpiresIn * 1000 : undefined,
            };
            const authHeaders = computeAuthHeaders(
              "oauth2",
              currentState.basicCredentials,
              updatedOAuth2,
              currentState.apiKeyCredentials,
            );

            set({
              oauth2Credentials: updatedOAuth2,
              authHeaders,
              deviceCodeState: null,
              tokenError: "",
            });
          } catch {
            // Network error during poll — keep polling, don't fail
            pollForToken(currentInterval);
          }
        }, currentInterval * 1000);
      };

      pollForToken(interval);
    } catch (err) {
      set({
        isTokenLoading: false,
        tokenError: err instanceof Error ? err.message : "Device code flow failed",
      });
    }
  },

  cancelDeviceCodeFlow: () => {
    if (deviceCodePollTimer) {
      clearTimeout(deviceCodePollTimer);
      deviceCodePollTimer = null;
    }
    set({
      deviceCodeState: null,
      tokenError: "",
    });
  },

  refreshOAuth2Token: async () => {
    const state = get();
    const { refreshToken, tokenUrl, clientId, clientSecret } = state.oauth2Credentials;

    if (!refreshToken) {
      set({ tokenError: "No refresh token available" });
      return false;
    }

    if (!tokenUrl) {
      set({ tokenError: "Token URL is required for refresh" });
      return false;
    }

    set({ isTokenLoading: true, tokenError: "" });

    try {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      });

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
        chatMessageId: `oauth-refresh-${uuidv4()}`,
        timestamp: new Date(),
        request: {
          method: "POST",
          url: tokenUrl,
          headers: requestHeaders,
          body: requestBody.replace(/refresh_token=[^&]+/, "refresh_token=[REDACTED]"),
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
        throw new Error(`Token refresh failed: ${response.status} ${responseBody}`);
      }

      const data = JSON.parse(responseBody);
      const accessToken = data.access_token;
      const newRefreshToken = data.refresh_token;
      const expiresIn = data.expires_in;

      if (!accessToken) {
        throw new Error("No access_token in refresh response");
      }

      const oauth2Credentials = {
        ...state.oauth2Credentials,
        accessToken,
        refreshToken: newRefreshToken ?? refreshToken,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
      };

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
    } catch (err) {
      set({
        isTokenLoading: false,
        tokenError: err instanceof Error ? err.message : "Token refresh failed",
      });
      return false;
    }
  },

  discoverOidc: async (openIdConnectUrl) => {
    set({ isOidcDiscovering: true, oidcDiscovery: null });

    try {
      const discoveryUrl = openIdConnectUrl.endsWith("/.well-known/openid-configuration")
        ? openIdConnectUrl
        : `${openIdConnectUrl.replace(/\/$/, "")}/.well-known/openid-configuration`;

      const response = await fetch(discoveryUrl);
      if (!response.ok) {
        throw new Error(`OIDC discovery failed: ${response.status}`);
      }

      const doc: OidcDiscoveryDoc = await response.json();
      const state = get();

      // Populate OAuth2 credentials from discovered endpoints
      const oauth2Credentials: OAuth2Credentials = {
        ...state.oauth2Credentials,
        tokenUrl: doc.token_endpoint ?? state.oauth2Credentials.tokenUrl,
        authorizationUrl: doc.authorization_endpoint ?? state.oauth2Credentials.authorizationUrl,
        scopes: doc.scopes_supported?.join(" ") ?? state.oauth2Credentials.scopes,
      };

      const authHeaders = computeAuthHeaders(
        "oauth2",
        state.basicCredentials,
        oauth2Credentials,
        state.apiKeyCredentials,
      );

      set({
        oidcDiscovery: doc,
        isOidcDiscovering: false,
        oauth2Credentials,
        authHeaders,
      });
    } catch (err) {
      set({
        isOidcDiscovering: false,
        tokenError: err instanceof Error ? err.message : "OIDC discovery failed",
      });
    }
  },

  fetchOAuth2Metadata: async (metadataUrl) => {
    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        throw new Error(`OAuth2 metadata fetch failed: ${response.status}`);
      }

      const metadata = await response.json();
      const state = get();

      // Use discovered endpoints as fallback (don't overwrite explicitly set values from flows)
      const oauth2Credentials: OAuth2Credentials = {
        ...state.oauth2Credentials,
        tokenUrl: state.oauth2Credentials.tokenUrl || metadata.token_endpoint || "",
        authorizationUrl: state.oauth2Credentials.authorizationUrl || metadata.authorization_endpoint,
        scopes: state.oauth2Credentials.scopes || (metadata.scopes_supported?.join(" ") ?? ""),
      };

      const authHeaders = computeAuthHeaders(
        "oauth2",
        state.basicCredentials,
        oauth2Credentials,
        state.apiKeyCredentials,
      );

      set({ oauth2Credentials, authHeaders });
    } catch {
      // Metadata fetch is best-effort; silently fail
    }
  },
}));

// Selector for auth headers - now just returns stored state
export const selectAuthHeaders = (state: ConnectionState): Record<string, string> => state.authHeaders;

// Selector for effective messaging URL (messagingUrl from card, falling back to user-entered url)
export const selectEffectiveUrl = (state: ConnectionState): string => state.messagingUrl || state.url;

// Hook to get auth headers
export const useAuthHeaders = () => {
  return useConnectionStore((state) => state.authHeaders);
};
