import React, { useEffect, useRef, useId, useState } from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";

type DemoType = "playground" | "editor" | "card";

interface ComponentDemoProps {
  type: DemoType;
  height?: string;
}

// Mock agent card for demos
const mockAgentCard = JSON.stringify(
  {
    name: "Echo Agent",
    description: "Echoes back whatever you send. Useful for testing connectivity and message format.",
    url: "mock://echo",
    version: "1.0.0",
    protocolVersion: "0.2.2",
    capabilities: {
      streaming: true,
      pushNotifications: false,
    },
    skills: [
      {
        id: "echo",
        name: "Echo",
        description: "Echoes back your message",
      },
    ],
    provider: {
      organization: "A2A Demo",
    },
  },
  null,
  2,
);

// Get current Docusaurus theme
function getDocusaurusTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function ComponentBasedDemo({ type, height }: { type: DemoType; height: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const uniqueId = useId().replace(/:/g, "-");
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
        if (!window.A2APlayground) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${jsUrl}"]`);
            if (existingScript) {
              const checkInterval = setInterval(() => {
                if (window.A2APlayground) {
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

        // Get current theme from Docusaurus
        const theme = getDocusaurusTheme();

        // Config based on demo type
        const config = {
          el: containerRef.current,
          agentCard: mockAgentCard,
          agentUrl: "mock://echo",
          showSettings: type === "playground",
          showEditor: type === "playground" || type === "editor",
          showChat: true,
          showValidation: type === "playground" || type === "editor",
          defaultTab: "overview" as const,
          theme,
        };

        instanceRef.current = window.A2APlayground.init(config);

        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load demo");
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
        } catch (e) {}
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
        } catch (e) {}
        instanceRef.current = null;
      }
    };
  }, [type, cssUrl, jsUrl]);

  if (error) {
    return (
      <div
        style={{
          height,
          border: "1px solid var(--ifm-color-emphasis-300)",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ifm-color-danger)",
          background: "var(--ifm-background-surface-color)",
        }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--ifm-background-surface-color)",
            borderRadius: "8px",
            zIndex: 1,
          }}>
          Loading demo...
        </div>
      )}
      <div
        ref={containerRef}
        id={`demo-${uniqueId}`}
        style={{
          height,
          width: "100%",
          border: "1px solid var(--ifm-color-emphasis-300)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

export function ComponentDemo({ type, height = "450px" }: ComponentDemoProps) {
  return <ComponentBasedDemo type={type} height={height} />;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    A2APlayground: {
      init: (options: any) => any;
      destroy: (el: HTMLElement | string) => void;
    };
  }
}
