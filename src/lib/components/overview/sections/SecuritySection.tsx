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
import { Shield, Key, Lock, User, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

interface SecuritySectionProps {
  schemes: Record<string, SecurityScheme>;
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
    default:
      return `${name} (${scheme.type})`;
  }
}

export function SecuritySection({ schemes }: SecuritySectionProps) {
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
  } = useConnectionStore();
  const { parsedCard } = useAgentCardStore();

  const schemeEntries = Object.entries(schemes);
  const [selectedScheme, setSelectedScheme] = useState(() => {
    const oauthEntry = schemeEntries.find(([, s]) => s.type === "oauth2");
    return oauthEntry?.[0] ?? schemeEntries[0]?.[0] ?? "";
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset selected scheme when schemes change (agent switch)
  // Prefer OAuth2 scheme when available
  useEffect(() => {
    const entries = Object.entries(schemes);
    const oauthEntry = entries.find(([, s]) => s.type === "oauth2");
    const preferredKey = oauthEntry?.[0] ?? entries[0]?.[0] ?? "";
    setSelectedScheme(preferredKey);
    if (parsedCard && preferredKey) {
      autoConfigureAuth(parsedCard, preferredKey);
    }
  }, [schemes, parsedCard, autoConfigureAuth]);

  const activeEntry = schemeEntries.find(([n]) => n === selectedScheme);
  const activeScheme = activeEntry?.[1];

  const handleSchemeChange = (name: string) => {
    setSelectedScheme(name);
    if (parsedCard) {
      autoConfigureAuth(parsedCard, name);
    }
  };

  const handleGetToken = async () => {
    await fetchOAuth2Token();
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
        return (
          <div className="space-y-3 pt-2">
            {/* Client Credentials Flow */}
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

            {/* Get Token button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGetToken}
                disabled={
                  isTokenLoading ||
                  !oauth2Credentials.clientId ||
                  !oauth2Credentials.clientSecret ||
                  !oauth2Credentials.tokenUrl
                }
                className="h-7 text-xs">
                {isTokenLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : oauth2Credentials.accessToken ? (
                  <Check className="h-3 w-3 mr-1 text-success" />
                ) : (
                  <Key className="h-3 w-3 mr-1" />
                )}
                {oauth2Credentials.accessToken ? "Refresh Token" : "Get Token"}
              </Button>
              {oauth2Credentials.accessToken && <span className="text-xs text-success">Token acquired</span>}
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
          </div>
        );

      case "apiKey":
        return (
          <div className="pt-2">
            <label className="text-xs text-muted-foreground">{activeScheme.name || "API Key"}</label>
            <PasswordInput
              placeholder={activeScheme.name || "API Key"}
              value={apiKeyCredentials.key}
              onChange={(e) => setApiKeyCredentials({ key: e.target.value })}
              className="h-8 text-sm"
              autoComplete="off"
            />
          </div>
        );

      default:
        return null;
    }
  };

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
