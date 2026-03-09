import { useConnectionStore } from "@lib/stores/connectionStore";
import { Input } from "@lib/components/ui/input";
import { PasswordInput } from "@lib/components/ui/PasswordInput";
import { Button } from "@lib/components/ui/button";
import { Loader2, LogIn, X } from "lucide-react";

export function AuthOAuth2Form() {
  const {
    oauth2Credentials,
    setOAuth2Credentials,
    startAuthCodeFlow,
    cancelAuthFlow,
    fetchOAuth2Token,
    isTokenLoading,
    isAuthFlowInProgress,
    tokenError,
  } = useConnectionStore();

  const hasAuthorizationUrl = !!oauth2Credentials.authorizationUrl;
  const hasTokenUrl = !!oauth2Credentials.tokenUrl;
  const hasClientCredentials = !!oauth2Credentials.clientId && !!oauth2Credentials.clientSecret;
  const hasAccessToken = !!oauth2Credentials.accessToken;

  return (
    <div className="space-y-3">
      {/* Authorization Code Flow Button */}
      {hasAuthorizationUrl && (
        <div className="space-y-2">
          {isAuthFlowInProgress ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled
              >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Waiting for authorization...
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelAuthFlow}
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : hasAccessToken ? (
            <div className="flex items-center justify-between rounded-md border bg-success/10 p-2">
              <span className="text-sm text-success">
                ✓ Authenticated
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOAuth2Credentials({ accessToken: undefined, refreshToken: undefined })}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              className="w-full"
              onClick={startAuthCodeFlow}
              disabled={!oauth2Credentials.clientId}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In with OAuth
            </Button>
          )}
          {tokenError && (
            <p className="text-xs text-destructive">{tokenError}</p>
          )}
        </div>
      )}

      {/* Manual Token Entry */}
      <PasswordInput
        placeholder="Access Token / Bearer Token"
        value={oauth2Credentials.accessToken || ""}
        onChange={(e) => setOAuth2Credentials({ accessToken: e.target.value })}
      />

      {/* Client Credentials */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {hasAuthorizationUrl
            ? "Client ID is required for OAuth sign-in:"
            : "Configure OAuth 2.0 credentials:"}
        </p>
        <Input
          placeholder="Client ID"
          value={oauth2Credentials.clientId}
          onChange={(e) => setOAuth2Credentials({ clientId: e.target.value })}
        />
        <PasswordInput
          placeholder={hasAuthorizationUrl ? "Client Secret (optional for PKCE)" : "Client Secret"}
          value={oauth2Credentials.clientSecret}
          onChange={(e) => setOAuth2Credentials({ clientSecret: e.target.value })}
        />
      </div>

      {/* Token URL and Scopes */}
      {hasTokenUrl && (
        <Input
          placeholder="Token URL"
          value={oauth2Credentials.tokenUrl}
          onChange={(e) => setOAuth2Credentials({ tokenUrl: e.target.value })}
          disabled
        />
      )}
      {oauth2Credentials.scopes && (
        <Input
          placeholder="Scopes (space-separated)"
          value={oauth2Credentials.scopes}
          onChange={(e) => setOAuth2Credentials({ scopes: e.target.value })}
        />
      )}

      {/* Client Credentials Flow Button */}
      {!hasAuthorizationUrl && hasTokenUrl && hasClientCredentials && (
        <Button
          variant="secondary"
          className="w-full"
          onClick={fetchOAuth2Token}
          disabled={isTokenLoading}
        >
          {isTokenLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Token...
            </>
          ) : (
            "Get Access Token"
          )}
        </Button>
      )}

      {/* Show error for client credentials flow */}
      {!hasAuthorizationUrl && tokenError && (
        <p className="text-xs text-destructive">{tokenError}</p>
      )}

      {/* Show success state */}
      {!hasAuthorizationUrl && hasAccessToken && !tokenError && (
        <div className="flex items-center justify-between rounded-md border bg-success/10 p-2">
          <span className="text-sm text-success">
            ✓ Token acquired
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOAuth2Credentials({ accessToken: undefined })}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
