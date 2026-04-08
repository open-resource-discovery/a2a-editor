import { useEffect, useState } from "react";
import { useConnectionStore } from "@lib/stores/connectionStore";

/**
 * OAuth callback component that handles the redirect from OAuth provider.
 * This component should be mounted at the OAuth redirect URI (e.g., /oauth/callback).
 *
 * It extracts the authorization code and state from URL parameters,
 * exchanges them for an access token, then notifies the opener window.
 */
export function OAuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [error, setError] = useState<string>("");
  const handleAuthCallback = useConnectionStore((state) => state.handleAuthCallback);

  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      // Check for OAuth error response
      if (errorParam) {
        setStatus("error");
        setError(errorDescription || errorParam);
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        setStatus("error");
        setError("Missing authorization code or state parameter");
        return;
      }

      try {
        // If this is a popup, try to use the opener's store
        if (window.opener && !window.opener.closed) {
          try {
            // Verify same origin before accessing opener
            const openerOrigin = window.opener.location?.origin;
            if (openerOrigin !== window.location.origin) {
              throw new Error("Cross-origin opener detected");
            }

            // Get the handleAuthCallback from the opener's store
            const openerStore = (
              window.opener as Window & {
                useConnectionStore?: typeof useConnectionStore;
              }
            ).useConnectionStore;

            if (openerStore) {
              const success = await openerStore.getState().handleAuthCallback(code, state);
              if (success) {
                setStatus("success");
                // Close popup after a brief delay to show success
                setTimeout(() => window.close(), 1000);
              } else {
                setStatus("error");
                setError("Failed to exchange code for token");
              }
              return;
            }
          } catch {
            // Fall through to local store handling
          }
        }

        // Fallback: use local store (for same-window redirects)
        const success = await handleAuthCallback(code, state);
        if (success) {
          setStatus("success");
          // If not a popup, redirect back to main app
          if (!window.opener) {
            const base = import.meta.env.BASE_URL || "/";
            setTimeout(() => {
              window.location.href = base;
            }, 1500);
          }
        } else {
          setStatus("error");
          setError("Failed to exchange code for token");
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    processCallback();
  }, [handleAuthCallback]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-lg">
        {status === "processing" && (
          <>
            <div className="mb-4">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <h2 className="text-lg font-semibold">Completing Sign In...</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please wait while we complete the authentication process.
            </p>
          </>
        )}

        {status === "success" && (
          <div role="alert">
            <div className="mb-4 text-success">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-success">Success!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You have been successfully authenticated. This window will close automatically.
            </p>
          </div>
        )}

        {status === "error" && (
          <div role="alert">
            <div className="mb-4 text-destructive">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-destructive">Authentication Failed</h2>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <button
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              onClick={() => window.close()}>
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
