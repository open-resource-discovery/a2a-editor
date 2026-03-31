import React, { useEffect, useRef, useState } from "react";
import Layout from "@theme/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Head from "@docusaurus/Head";

function getDocusaurusTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function getAgentIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("agent");
}

export default function Playground(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cssUrl = useBaseUrl("/standalone/a2a-playground.css");
  const jsUrl = useBaseUrl("/standalone/a2a-playground.js");

  useEffect(() => {
    let mounted = true;

    const loadAndInit = async () => {
      try {
        // Load CSS if not already loaded
        if (!document.querySelector(`link[href="${cssUrl}"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = cssUrl;
          document.head.appendChild(link);
        }

        // Wait for A2APlayground to be available
        if (!(window as any).A2APlayground) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${jsUrl}"]`);
            if (existingScript) {
              const checkInterval = setInterval(() => {
                if ((window as any).A2APlayground) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 50);
              setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error("Timeout waiting for A2APlayground"));
              }, 10000);
              return;
            }

            const script = document.createElement("script");
            script.src = jsUrl;
            script.onload = () => setTimeout(resolve, 100);
            script.onerror = () => reject(new Error("Failed to load A2APlayground script"));
            document.body.appendChild(script);
          });
        }

        if (!mounted || !containerRef.current) return;

        const theme = getDocusaurusTheme();
        const agentId = getAgentIdFromUrl();

        instanceRef.current = (window as any).A2APlayground.init({
          el: containerRef.current,
          showSettings: true,
          showEditor: true,
          showChat: true,
          theme,
          ...(agentId ? { selectedAgentId: agentId } : {}),
        });

        if (mounted) setIsLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load playground");
          setIsLoading(false);
        }
      }
    };

    loadAndInit();

    // Watch for theme changes and reinit
    const observer = new MutationObserver(() => {
      if (instanceRef.current && containerRef.current) {
        const theme = getDocusaurusTheme();
        try {
          instanceRef.current.setTheme?.(theme);
        } catch {}
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      mounted = false;
      observer.disconnect();
      if (instanceRef.current) {
        try {
          instanceRef.current.destroy();
        } catch {}
        instanceRef.current = null;
      }
    };
  }, [cssUrl, jsUrl]);

  return (
    <Layout title="Playground" description="Try the A2A Editor Playground" wrapperClassName="playground-page">
      <Head>
        <style>{`
          .playground-page .main-wrapper,
          .playground-page main {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          .playground-page .container,
          .playground-page .container-fluid {
            max-width: 100% !important;
            padding: 0 !important;
          }
          .playground-page ~ footer,
          .playground-page ~ .VPFooter {
            display: none;
          }
        `}</style>
      </Head>
      <div className="playground-container" style={{ position: "relative" }}>
        {isLoading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--ifm-background-color)",
              zIndex: 1,
            }}>
            Loading playground...
          </div>
        )}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "calc(100vh - var(--ifm-navbar-height, 60px))",
              color: "var(--ifm-color-danger)",
            }}>
            Error: {error}
          </div>
        )}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "calc(100vh - var(--ifm-navbar-height, 60px))",
          }}
        />
      </div>
    </Layout>
  );
}
