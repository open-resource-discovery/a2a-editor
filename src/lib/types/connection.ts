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
}
