import { useState, useCallback, useEffect } from "react";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { Input, PasswordInput, Button, SimpleSelect, Spinner } from "@open-resource-discovery/ui-components";
import { Plug, Unplug } from "lucide-react";
import { type ConnAuthType, mapStoreAuthType, buildConnHeaders } from "@lib/utils/connection-auth";

export function ConnectionSettings() {
  const {
    url,
    setUrl,
    connectionStatus,
    errorMessage,
    connect,
    disconnect,
    autoConfigureAuth,
    connectionAuthType: storeConnAuthType,
    basicCredentials: storeBasicCreds,
    oauth2Credentials: storeOAuth2Creds,
    apiKeyCredentials: storeApiKeyCreds,
  } = useConnectionStore();
  const { setRawJson } = useAgentCardStore();

  // Track whether the user has manually overridden the auth type
  const [manualAuthType, setManualAuthType] = useState<ConnAuthType | null>(null);

  // Derive connAuthType: manual override takes precedence, otherwise computed from store
  const connAuthType = manualAuthType ?? mapStoreAuthType(storeConnAuthType, !!storeOAuth2Creds.accessToken);

  // Credential fields: always read from store (updated by setFromPredefined)
  const username = storeBasicCreds.username;
  const password = storeBasicCreds.password;
  const token = storeOAuth2Creds.accessToken ?? "";
  const apiKeyValue = storeApiKeyCreds.key;

  // Local overrides for credential inputs (only used when user types)
  const [localUsername, setLocalUsername] = useState<string | null>(null);
  const [localPassword, setLocalPassword] = useState<string | null>(null);
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [localApiKey, setLocalApiKey] = useState<string | null>(null);

  const effectiveUsername = localUsername ?? username;
  const effectivePassword = localPassword ?? password;
  const effectiveToken = localToken ?? token;
  const effectiveApiKey = localApiKey ?? apiKeyValue;

  // Reset manual overrides when store connection auth changes (agent switch)
  useEffect(() => {
    setManualAuthType(null);
    setLocalUsername(null);
    setLocalPassword(null);
    setLocalToken(null);
    setLocalApiKey(null);
  }, [storeConnAuthType]);

  const handleConnect = useCallback(async () => {
    const headers = buildConnHeaders(connAuthType, effectiveUsername, effectivePassword, effectiveToken, effectiveApiKey, storeApiKeyCreds.headerName);
    const result = await connect(Object.keys(headers).length > 0 ? headers : undefined);
    if (result) {
      setRawJson(result.rawJson);
      autoConfigureAuth(result.card);
    }
  }, [connAuthType, effectiveUsername, effectivePassword, effectiveToken, effectiveApiKey, storeApiKeyCreds.headerName, connect, setRawJson, autoConfigureAuth]);

  const statusColor = {
    disconnected: "bg-muted",
    connecting: "bg-warning",
    connected: "bg-success",
    error: "bg-destructive",
  }[connectionStatus];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Connection</h3>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-xs text-muted-foreground capitalize">
            {connectionStatus}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Agent URL or mock://echo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && url && connectionStatus !== "connecting" && handleConnect()}
        />

        {/* Auth for fetching agent card — independent of card's securitySchemes */}
        <SimpleSelect
          value={connAuthType}
          onChange={(v) => setManualAuthType(v as ConnAuthType)}
          items={[
            { value: "none", label: "No Authentication" },
            { value: "basic", label: "Basic Auth" },
            { value: "bearer", label: "Bearer Token" },
            { value: "apiKey", label: "API Key" },
          ]}
        />

        {connAuthType === "basic" && (
          <div className="space-y-2">
            <Input
              placeholder="Username"
              value={effectiveUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              className="h-8 text-sm"
              autoComplete="off"
            />
            <PasswordInput
              placeholder="Password"
              value={effectivePassword}
              onChange={(e) => setLocalPassword(e.target.value)}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        )}

        {connAuthType === "bearer" && (
          <PasswordInput
            placeholder="Bearer Token"
            value={effectiveToken}
            onChange={(e) => setLocalToken(e.target.value)}
            className="h-8 text-sm"
            autoComplete="off"
          />
        )}

        {connAuthType === "apiKey" && (
          <PasswordInput
            placeholder="API Key"
            value={effectiveApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            className="h-8 text-sm"
            autoComplete="off"
          />
        )}

        <div className="flex gap-2">
          {connectionStatus === "connected" ? (
            <Button variant="outline" size="sm" onClick={disconnect}>
              <Unplug className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={!url || connectionStatus === "connecting"}
            >
              {connectionStatus === "connecting" ? (
                <Spinner size="sm" className="mr-1" />
              ) : (
                <Plug className="h-4 w-4 mr-1" />
              )}
              Connect
            </Button>
          )}
        </div>

        {errorMessage && (
          <p className="text-xs text-destructive">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
