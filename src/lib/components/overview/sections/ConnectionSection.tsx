import { useState, useCallback, useEffect } from "react";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@lib/components/ui/card";
import { Input } from "@lib/components/ui/input";
import { PasswordInput } from "@lib/components/ui/PasswordInput";
import { Button } from "@lib/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@lib/components/ui/select";
import { Loader2, Plug, Unplug } from "lucide-react";
import { type ConnAuthType, mapStoreAuthType, buildConnHeaders } from "@lib/utils/connection-auth";

export function ConnectionSection() {
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
    const card = await connect(Object.keys(headers).length > 0 ? headers : undefined);
    if (card) {
      setRawJson(JSON.stringify(card, null, 2));
      autoConfigureAuth(card);
    }
  }, [connAuthType, effectiveUsername, effectivePassword, effectiveToken, effectiveApiKey, storeApiKeyCreds.headerName, connect, setRawJson, autoConfigureAuth]);

  const statusColor = {
    disconnected: "bg-muted",
    connecting: "bg-warning",
    connected: "bg-success",
    error: "bg-destructive",
  }[connectionStatus];

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Connection</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${statusColor}`} />
            <span className="text-xs text-muted-foreground capitalize">
              {connectionStatus}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Agent URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8 text-sm"
          />
          {connectionStatus === "connected" ? (
            <Button variant="outline" size="sm" onClick={disconnect} className="h-8 shrink-0">
              <Unplug className="h-4 w-4 mr-1" />
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={!url || connectionStatus === "connecting"}
              className="h-8 shrink-0"
            >
              {connectionStatus === "connecting" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plug className="h-4 w-4 mr-1" />
              )}
              Connect
            </Button>
          )}
        </div>

        {/* Auth for fetching agent card — independent of card's securitySchemes */}
        <form onSubmit={(e) => { e.preventDefault(); handleConnect(); }} className="space-y-2">
          <Select value={connAuthType} onValueChange={(v) => setManualAuthType(v as ConnAuthType)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Authentication</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="apiKey">API Key</SelectItem>
            </SelectContent>
          </Select>

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
        </form>

        {errorMessage && (
          <p className="text-xs text-destructive">{errorMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
