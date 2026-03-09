export type ConnAuthType = "none" | "basic" | "bearer" | "apiKey";

export function mapStoreAuthType(
  storeType: string | null | undefined,
  hasAccessToken: boolean,
): ConnAuthType {
  if (storeType === "oauth2" && hasAccessToken) return "bearer";
  if (storeType === "basic") return "basic";
  if (storeType === "apiKey") return "apiKey";
  return "none";
}

export function buildConnHeaders(
  authType: ConnAuthType,
  username: string,
  password: string,
  token: string,
  apiKey: string,
  apiKeyHeaderName: string = "Authorization",
): Record<string, string> {
  switch (authType) {
    case "basic":
      if (username && password) {
        return { Authorization: `Basic ${btoa(`${username}:${password}`)}` };
      }
      return {};
    case "bearer":
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
      return {};
    case "apiKey":
      if (apiKey) {
        return { [apiKeyHeaderName]: apiKey };
      }
      return {};
    default:
      return {};
  }
}
