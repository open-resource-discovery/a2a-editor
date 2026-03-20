export type AuthType = "none" | "basic" | "oauth2" | "apiKey";

export interface BasicCredentials {
  username: string;
  password: string;
}

export interface OAuth2Credentials {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scopes: string;
  accessToken?: string;
  // Authorization Code flow fields
  authorizationUrl?: string;
  redirectUri?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface ApiKeyCredentials {
  key: string;
  headerName: string;
  /** Where the API key is sent: header (default), query param, or cookie */
  in?: "header" | "query" | "cookie";
}

export interface DeviceCodeState {
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresAt: number;
  interval: number;
  deviceCode: string;
  isPolling: boolean;
}

export interface OidcDiscoveryDoc {
  authorization_endpoint?: string;
  token_endpoint?: string;
  userinfo_endpoint?: string;
  scopes_supported?: string[];
  issuer?: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface PredefinedAgent {
  id: string;
  name: string;
  description: string;
  url: string;
  iconUrl?: string;
  authType: AuthType;
  authConfig?: BasicCredentials | OAuth2Credentials | ApiKeyCredentials;
  /** Auth for fetching the agent card, when different from A2A message auth */
  connectionAuthType?: AuthType;
  connectionAuthConfig?: BasicCredentials | OAuth2Credentials | ApiKeyCredentials;
  tags?: string[];
  /** Whether this agent uses a mocked LLM backend (defaults to true for predefined agents) */
  mocked?: boolean;
  /** A2A protocol version this agent uses ("0.3.0" or "1.0.0") */
  protocolVersion?: string;
}
