import { useState, useEffect } from "react";
import type { SecurityScheme } from "@lib/types/a2a";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { Card, CardContent, CardHeader, CardTitle } from "@lib/components/ui/card";
import { Badge } from "@lib/components/ui/badge";
import { Input } from "@lib/components/ui/input";
import { PasswordInput } from "@lib/components/ui/PasswordInput";
import { Button } from "@lib/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@lib/components/ui/select";
import {
  Shield,
  Key,
  Lock,
  User,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  LogIn,
  X,
  ExternalLink,
  RefreshCw,
  Info,
} from "lucide-react";

interface SecuritySectionProps {
  schemes: Record<string, SecurityScheme>;
  readOnly?: boolean;
}

const schemeIcons: Record<string, typeof Shield> = {
  apiKey: Key,
  http: User,
  oauth2: Lock,
  openIdConnect: Shield,
  mutualTLS: Shield,
};

function schemeLabel(name: string, scheme: SecurityScheme): string {
  switch (scheme.type) {
    case "http":
      return scheme.scheme === "basic" ? `${name} (Basic Auth)` : `${name} (Bearer Token)`;
    case "oauth2":
      return `${name} (OAuth 2.0)`;
    case "apiKey":
      return `${name} (API Key)`;
    case "openIdConnect":
      return `${name} (OpenID Connect)`;
    case "mutualTLS":
      return `${name} (Mutual TLS)`;
    default:
      return `${name} (${scheme.type})`;
  }
}

export function SecuritySection({ schemes, readOnly = false }: SecuritySectionProps) {
  const {
    basicCredentials,
    setBasicCredentials,
    oauth2Credentials,
    setOAuth2Credentials,
    apiKeyCredentials,
    setApiKeyCredentials,
    fetchOAuth2Token,
    isTokenLoading,
    tokenError,
    autoConfigureAuth,
    startAuthCodeFlow,
    cancelAuthFlow,
    isAuthFlowInProgress,
    deviceCodeState,
    startDeviceCodeFlow,
    cancelDeviceCodeFlow,
    refreshOAuth2Token,
    isOidcDiscovering,
  } = useConnectionStore();
  const { parsedCard } = useAgentCardStore();

  const schemeEntries = Object.entries(schemes);
  const [selectedScheme, setSelectedScheme] = useState(() => {
    const oauthEntry = schemeEntries.find(([, s]) => s.type === "oauth2");
    return oauthEntry?.[0] ?? schemeEntries[0]?.[0] ?? "";
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset selected scheme when schemes change (agent switch), preferring OAuth2
  useEffect(() => {
    const entries = Object.entries(schemes);
    const oauthEntry = entries.find(([, s]) => s.type === "oauth2");
    const preferredKey = oauthEntry?.[0] ?? entries[0]?.[0] ?? "";
    setSelectedScheme(preferredKey);
    if (parsedCard && preferredKey) {
      autoConfigureAuth(parsedCard, preferredKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemes]);

  const activeEntry = schemeEntries.find(([n]) => n === selectedScheme);
  const activeScheme = activeEntry?.[1];

  const handleSchemeChange = (name: string) => {
    setSelectedScheme(name);
    if (parsedCard) {
      autoConfigureAuth(parsedCard, name);
    }
  };

  const renderAuthForm = () => {
    if (!activeScheme) return null;

    switch (activeScheme.type) {
      case "http":
        if (activeScheme.scheme === "basic") {
          return (
            <div className="space-y-2 pt-2">
              <div>
                <label className="text-xs text-muted-foreground">Username</label>
                <Input
                  placeholder="Username"
                  value={basicCredentials.username}
                  onChange={(e) => setBasicCredentials({ username: e.target.value })}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Password</label>
                <PasswordInput
                  placeholder="Password"
                  value={basicCredentials.password}
                  onChange={(e) => setBasicCredentials({ password: e.target.value })}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
              </div>
            </div>
          );
        }
        // Bearer token
        return (
          <div className="pt-2">
            <label className="text-xs text-muted-foreground">Bearer Token</label>
            <PasswordInput
              placeholder="Bearer Token"
              value={oauth2Credentials.accessToken || ""}
              onChange={(e) => setOAuth2Credentials({ accessToken: e.target.value })}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        );

      case "oauth2":
        return renderOAuth2Form();

      case "apiKey":
        return renderApiKeyForm();

      case "openIdConnect":
        return renderOpenIdConnectForm();

      case "mutualTLS":
        return renderMtlsInfo();

      default:
        return null;
    }
  };

  const renderOAuth2Form = () => {
    if (!activeScheme || activeScheme.type !== "oauth2") return null;

    const hasAuthorizationUrl = !!oauth2Credentials.authorizationUrl;
    const hasDeviceCodeFlow = !!activeScheme.flows?.deviceCode;
    const hasClientCredentials = !!activeScheme.flows?.clientCredentials;
    const hasAccessToken = !!oauth2Credentials.accessToken;
    const hasRefreshToken = !!oauth2Credentials.refreshToken;
    const isTokenExpired = oauth2Credentials.expiresAt ? Date.now() > oauth2Credentials.expiresAt : false;

    return (
      <div className="space-y-3 pt-2">
        {/* Authorization Code Flow — "Sign In with OAuth" */}
        {hasAuthorizationUrl && (
          <div className="space-y-2">
            {isAuthFlowInProgress ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex-1 h-8 text-xs" disabled>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Waiting for authorization...
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelAuthFlow} title="Cancel" className="h-8 w-8">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : hasAccessToken ? (
              <div className="flex items-center justify-between rounded-md border bg-success/10 p-2">
                <span className="text-xs text-success">Authenticated via OAuth</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setOAuth2Credentials({ accessToken: undefined, refreshToken: undefined })}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                className="w-full h-8 text-xs"
                onClick={startAuthCodeFlow}
                disabled={!oauth2Credentials.clientId}>
                <LogIn className="mr-1 h-3 w-3" />
                Sign In with OAuth
              </Button>
            )}
          </div>
        )}

        {/* Device Code Flow */}
        {hasDeviceCodeFlow && !hasAuthorizationUrl && renderDeviceCodeSection()}

        {/* Token expiry warning + refresh */}
        {hasAccessToken && isTokenExpired && hasRefreshToken && (
          <div className="flex items-center gap-2 rounded-md border border-warning bg-warning/10 p-2">
            <span className="text-xs text-warning-foreground flex-1">Token expired</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={refreshOAuth2Token}
              disabled={isTokenLoading}>
              {isTokenLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Refresh
            </Button>
          </div>
        )}

        {/* Refresh button (when token exists and refresh token is available) */}
        {hasAccessToken && !isTokenExpired && hasRefreshToken && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={refreshOAuth2Token}
            disabled={isTokenLoading}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Token
          </Button>
        )}

        {/* Client Credentials */}
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">
              {hasAuthorizationUrl ? "Client ID (required for OAuth sign-in)" : "Client ID"}
            </label>
            <Input
              placeholder="Client ID"
              value={oauth2Credentials.clientId}
              onChange={(e) => setOAuth2Credentials({ clientId: e.target.value })}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              {hasAuthorizationUrl ? "Client Secret (optional for PKCE)" : "Client Secret"}
            </label>
            <PasswordInput
              placeholder="Client Secret"
              value={oauth2Credentials.clientSecret}
              onChange={(e) => setOAuth2Credentials({ clientSecret: e.target.value })}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Advanced settings toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Advanced
        </button>

        {showAdvanced && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">Token URL</label>
              <Input
                placeholder="Token URL"
                value={oauth2Credentials.tokenUrl}
                onChange={(e) => setOAuth2Credentials({ tokenUrl: e.target.value })}
                className="h-8 text-sm"
                autoComplete="off"
              />
            </div>
            {oauth2Credentials.authorizationUrl && (
              <div>
                <label className="text-xs text-muted-foreground">Authorization URL</label>
                <Input
                  placeholder="Authorization URL"
                  value={oauth2Credentials.authorizationUrl}
                  onChange={(e) => setOAuth2Credentials({ authorizationUrl: e.target.value })}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Scopes</label>
              <Input
                placeholder="Scopes (space-separated)"
                value={oauth2Credentials.scopes}
                onChange={(e) => setOAuth2Credentials({ scopes: e.target.value })}
                className="h-8 text-sm"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {/* Client Credentials "Get Token" button — only when no auth code flow */}
        {!hasAuthorizationUrl && !hasDeviceCodeFlow && hasClientCredentials && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fetchOAuth2Token}
              disabled={
                isTokenLoading ||
                !oauth2Credentials.clientId ||
                !oauth2Credentials.clientSecret ||
                !oauth2Credentials.tokenUrl
              }
              className="h-7 text-xs">
              {isTokenLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : hasAccessToken ? (
                <Check className="h-3 w-3 mr-1 text-success" />
              ) : (
                <Key className="h-3 w-3 mr-1" />
              )}
              {hasAccessToken ? "Refresh Token" : "Get Token"}
            </Button>
            {hasAccessToken && <span className="text-xs text-success">Token acquired</span>}
          </div>
        )}

        {tokenError && <p className="text-xs text-destructive">{tokenError}</p>}

        {/* Manual token input */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Or enter token manually:</p>
          <PasswordInput
            placeholder="Access Token"
            value={oauth2Credentials.accessToken || ""}
            onChange={(e) => setOAuth2Credentials({ accessToken: e.target.value })}
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
      </div>
    );
  };

  const renderDeviceCodeSection = () => {
    if (!activeScheme || activeScheme.type !== "oauth2" || !activeScheme.flows?.deviceCode) return null;

    const deviceFlow = activeScheme.flows.deviceCode;

    if (deviceCodeState) {
      // Show user code + verification URL while polling
      return (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium">Device Authorization</p>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Go to:</p>
            <a
              href={deviceCodeState.verificationUriComplete ?? deviceCodeState.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 break-all">
              {deviceCodeState.verificationUri}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Enter code:</p>
            <code className="text-lg font-mono font-bold tracking-wider">{deviceCodeState.userCode}</code>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Waiting for authorization...</span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={cancelDeviceCodeFlow}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="outline"
        className="w-full h-8 text-xs"
        onClick={() => startDeviceCodeFlow(deviceFlow.deviceAuthorizationUrl, deviceFlow.tokenUrl)}
        disabled={isTokenLoading || !oauth2Credentials.clientId}>
        {isTokenLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <LogIn className="h-3 w-3 mr-1" />}
        Authorize with Device Code
      </Button>
    );
  };

  const renderApiKeyForm = () => {
    if (!activeScheme || activeScheme.type !== "apiKey") return null;

    const location = activeScheme.in ?? "header";

    return (
      <div className="space-y-2 pt-2">
        <label className="text-xs text-muted-foreground">{activeScheme.name || "API Key"}</label>
        <PasswordInput
          placeholder={activeScheme.name || "API Key"}
          value={apiKeyCredentials.key}
          onChange={(e) => setApiKeyCredentials({ key: e.target.value })}
          className="h-8 text-sm"
          autoComplete="off"
        />
        {location === "query" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Key will be sent as a query parameter ({activeScheme.name ?? "key"})
          </p>
        )}
        {location === "cookie" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            Cookie-based API keys may have browser limitations due to third-party cookie restrictions
          </p>
        )}
      </div>
    );
  };

  const renderOpenIdConnectForm = () => {
    if (isOidcDiscovering) {
      return (
        <div className="flex items-center gap-2 pt-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-xs text-muted-foreground">Discovering OpenID Connect endpoints...</span>
        </div>
      );
    }

    // Once discovery is done, render the same OAuth2 form
    // (OIDC discovery populates oauth2Credentials via the store)
    return (
      <div className="space-y-3 pt-2">
        {activeScheme?.openIdConnectUrl && (
          <p className="text-xs text-muted-foreground">Endpoints discovered from {activeScheme.openIdConnectUrl}</p>
        )}
        {renderOAuth2FormFields()}
      </div>
    );
  };

  /** Shared OAuth2 form fields for both oauth2 and openIdConnect schemes */
  const renderOAuth2FormFields = () => {
    const hasAuthorizationUrl = !!oauth2Credentials.authorizationUrl;
    const hasAccessToken = !!oauth2Credentials.accessToken;
    const hasRefreshToken = !!oauth2Credentials.refreshToken;
    const isTokenExpired = oauth2Credentials.expiresAt ? Date.now() > oauth2Credentials.expiresAt : false;

    return (
      <>
        {/* Auth Code Flow Sign-In */}
        {hasAuthorizationUrl && (
          <div className="space-y-2">
            {isAuthFlowInProgress ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" className="flex-1 h-8 text-xs" disabled>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Waiting for authorization...
                </Button>
                <Button variant="ghost" size="icon" onClick={cancelAuthFlow} className="h-8 w-8">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : hasAccessToken ? (
              <div className="flex items-center justify-between rounded-md border bg-success/10 p-2">
                <span className="text-xs text-success">Authenticated</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setOAuth2Credentials({ accessToken: undefined, refreshToken: undefined })}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                className="w-full h-8 text-xs"
                onClick={startAuthCodeFlow}
                disabled={!oauth2Credentials.clientId}>
                <LogIn className="mr-1 h-3 w-3" />
                Sign In with OAuth
              </Button>
            )}
          </div>
        )}

        {/* Token expiry + refresh */}
        {hasAccessToken && isTokenExpired && hasRefreshToken && (
          <div className="flex items-center gap-2 rounded-md border border-warning bg-warning/10 p-2">
            <span className="text-xs text-warning-foreground flex-1">Token expired</span>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={refreshOAuth2Token}
              disabled={isTokenLoading}>
              {isTokenLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Refresh
            </Button>
          </div>
        )}

        {/* Client ID + Secret */}
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Client ID</label>
            <Input
              placeholder="Client ID"
              value={oauth2Credentials.clientId}
              onChange={(e) => setOAuth2Credentials({ clientId: e.target.value })}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Client Secret</label>
            <PasswordInput
              placeholder="Client Secret"
              value={oauth2Credentials.clientSecret}
              onChange={(e) => setOAuth2Credentials({ clientSecret: e.target.value })}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        </div>

        {tokenError && <p className="text-xs text-destructive">{tokenError}</p>}

        {/* Manual token input */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Or enter token manually:</p>
          <PasswordInput
            placeholder="Access Token"
            value={oauth2Credentials.accessToken || ""}
            onChange={(e) => setOAuth2Credentials({ accessToken: e.target.value })}
            className="h-8 text-sm"
            autoComplete="off"
          />
        </div>
      </>
    );
  };

  const renderMtlsInfo = () => {
    return (
      <div className="rounded-md border bg-muted/50 p-3 mt-2">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-medium">Mutual TLS Authentication</p>
            <p className="text-xs text-muted-foreground">
              Client certificate must be configured at the browser or OS level. This cannot be configured in-app.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (readOnly) {
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Authentication</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {schemeEntries.map(([name, scheme]) => {
            const Icon = schemeIcons[scheme.type] || Shield;
            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{name}</span>
                  <Badge variant="outline" className="text-xs">
                    {scheme.type}
                  </Badge>
                </div>
                {scheme.description && <p className="text-xs text-muted-foreground pl-6">{scheme.description}</p>}
                {scheme.type === "oauth2" && scheme.flows && (
                  <div className="pl-6 flex flex-wrap gap-1">
                    {Object.keys(scheme.flows).map((flow) => (
                      <Badge key={flow} variant="secondary" className="text-xs">
                        {flow}
                      </Badge>
                    ))}
                  </div>
                )}
                {scheme.type === "openIdConnect" && scheme.openIdConnectUrl && (
                  <p className="text-xs text-muted-foreground pl-6">Discovery: {scheme.openIdConnectUrl}</p>
                )}
                {scheme.type === "apiKey" && (
                  <p className="text-xs text-muted-foreground pl-6">
                    Sent via {scheme.in ?? "header"}
                    {scheme.name ? ` (${scheme.name})` : ""}
                  </p>
                )}
                {scheme.type === "http" && (
                  <p className="text-xs text-muted-foreground pl-6">Scheme: {scheme.scheme ?? "bearer"}</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Authentication</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Scheme selector — shown when multiple schemes available */}
        {schemeEntries.length > 1 ? (
          <Select value={selectedScheme} onValueChange={handleSchemeChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schemeEntries.map(([name, scheme]) => (
                <SelectItem key={name} value={name}>
                  {schemeLabel(name, scheme)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          schemeEntries.map(([name, scheme]) => {
            const Icon = schemeIcons[scheme.type] || Shield;
            return (
              <div key={name} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{name}</span>
                  <Badge variant="outline" className="text-xs">
                    {scheme.type}
                  </Badge>
                </div>
                {scheme.description && <p className="text-xs text-muted-foreground pl-6">{scheme.description}</p>}
              </div>
            );
          })
        )}

        {/* Selected scheme details */}
        {activeScheme && schemeEntries.length > 1 && activeScheme.description && (
          <p className="text-xs text-muted-foreground">{activeScheme.description}</p>
        )}

        {renderAuthForm()}
      </CardContent>
    </Card>
  );
}
