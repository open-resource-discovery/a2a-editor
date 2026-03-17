import type { AuthType, BasicCredentials, OAuth2Credentials, ApiKeyCredentials } from "@lib/types/connection";

export type AddAuthType = "none" | "basic" | "bearer" | "apiKey";

export function buildAddHeaders(
  authType: AddAuthType,
  username: string,
  password: string,
  token: string,
  apiKey: string,
): Record<string, string> | undefined {
  switch (authType) {
    case "basic":
      if (username && password) {
        return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
      }
      return undefined;
    case "bearer":
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
      return undefined;
    case "apiKey":
      if (apiKey) {
        return { Authorization: apiKey };
      }
      return undefined;
    default:
      return undefined;
  }
}

export function mapAddAuth(
  addAuthType: AddAuthType,
  username: string,
  password: string,
  token: string,
  apiKey: string,
): { authType: AuthType; authConfig?: BasicCredentials | OAuth2Credentials | ApiKeyCredentials } {
  switch (addAuthType) {
    case "basic":
      return { authType: "basic", authConfig: { username, password } };
    case "bearer":
      return {
        authType: "oauth2",
        authConfig: { clientId: "", clientSecret: "", tokenUrl: "", scopes: "", accessToken: token },
      };
    case "apiKey":
      return { authType: "apiKey", authConfig: { key: apiKey, headerName: "Authorization" } };
    default:
      return { authType: "none" };
  }
}

export function buildPredefinedConnHeaders(
  authType: AuthType,
  config: BasicCredentials | OAuth2Credentials | ApiKeyCredentials,
): Record<string, string> | undefined {
  switch (authType) {
    case "basic": {
      const { username, password } = config as BasicCredentials;
      if (username && password) return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
      return undefined;
    }
    case "oauth2": {
      const { accessToken } = config as OAuth2Credentials;
      if (accessToken) return { Authorization: `Bearer ${accessToken}` };
      return undefined;
    }
    case "apiKey": {
      const creds = config as ApiKeyCredentials;
      // Query-param API keys are handled by connect() via state, not headers
      if (creds.in === "query") return undefined;
      if (creds.key) return { [creds.headerName || "Authorization"]: creds.key };
      return undefined;
    }
    default:
      return undefined;
  }
}
