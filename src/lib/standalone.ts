/**
 * Standalone bundle entry point for CDN/script tag usage.
 * This bundles React into the output so it works without a build system.
 *
 * Usage:
 * ```html
 * <link rel="stylesheet" href="https://unpkg.com/@open-resource-discovery/a2a-editor/dist-standalone/a2a-playground.css">
 * <script src="https://unpkg.com/@open-resource-discovery/a2a-editor/dist-standalone/a2a-playground.js"></script>
 * <script>
 *   A2APlayground.init({
 *     el: '#container',
 *     agentUrl: 'https://my-agent.example.com'
 *   });
 * </script>
 * ```
 */
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { AgentPlayground, type AgentPlaygroundProps } from "./components/AgentPlayground";
import { useAgentCardStore } from "./stores/agentCardStore";
import { useConnectionStore } from "./stores/connectionStore";
import { useValidationStore } from "./stores/validationStore";
import { useUIStore } from "./stores/uiStore";
import { usePredefinedAgentsStore } from "./stores/predefinedAgentsStore";
import { useChatStore } from "./stores/chatStore";
import { useHttpLogStore } from "./stores/httpLogStore";
import type { AgentCard } from "./types/a2a";
import type { ValidationResult } from "./types/validation";
import type { AuthType } from "./types/connection";
import type { PredefinedAgent } from "./types/connection";
import { useThemeStore } from "./hooks/useTheme";

// Import CSS so it gets bundled
import "./styles.css";

// ============================================================================
// Types
// ============================================================================

export interface A2APlaygroundOptions {
  /** Target element - CSS selector string or HTMLElement (required) */
  el: string | HTMLElement;

  /** Agent URL to auto-connect on load */
  agentUrl?: string;

  /** Initial agent card JSON string */
  agentCard?: string;

  /** Show chat panel (default: true) */
  showChat?: boolean;

  /** Show Raw HTTP panel (default: true) */
  showRawHttp?: boolean;

  /** Show validation panel (default: true) */
  showValidation?: boolean;

  /** Show settings panel (default: true) */
  showSettings?: boolean;

  /** Show JSON editor (default: true). Set to false for viewer-only mode */
  showEditor?: boolean;

  /** Make the editor read-only (default: false) */
  readOnly?: boolean;

  /** Default active tab (default: "overview") */
  defaultTab?: "overview" | "chat" | "validation" | "rawhttp";

  /** Force desktop layout regardless of screen size (default: false) */
  forceDesktop?: boolean;

  /** Disable clicking on example prompts (default: false) */
  disableExamplePrompts?: boolean;

  /** Authentication configuration for auto-connect */
  auth?: {
    type: AuthType;
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      key?: string;
      headerName?: string;
    };
  };

  /** Color theme (default: "system") */
  theme?: "light" | "dark" | "system";

  /** Predefined agents to show in the sidebar */
  predefinedAgents?: PredefinedAgent[];

  /** Auto-select a predefined agent by ID on load (e.g. from ?agent=solar-weather) */
  selectedAgentId?: string;

  // Callbacks
  /** Called when the playground is ready */
  onReady?: (instance: A2APlaygroundInstance) => void;

  /** Called when agent card JSON changes */
  onAgentCardChange?: (json: string, parsed: AgentCard | null) => void;

  /** Called when successfully connected to an agent */
  onConnect?: (url: string, card: AgentCard) => void;

  /** Called when validation completes */
  onValidationComplete?: (results: ValidationResult[]) => void;

  /** Called on errors */
  onError?: (error: Error) => void;
}

export interface A2APlaygroundInstance {
  /** Set the agent card JSON */
  setAgentCard(json: string): void;

  /** Get the current agent card JSON */
  getAgentCard(): string;

  /** Get the parsed agent card (or null if invalid) */
  getParsedCard(): AgentCard | null;

  /** Connect to an agent URL */
  connect(url: string): Promise<AgentCard>;

  /** Disconnect from current agent */
  disconnect(): void;

  /** Run validation on current agent card */
  validate(): Promise<ValidationResult[]>;

  /** Set the active tab */
  setActiveTab(tab: "overview" | "chat" | "validation"): void;

  /** Update the active color theme without recreating the instance */
  setTheme(theme: "light" | "dark" | "system"): void;

  /** Destroy the playground instance */
  destroy(): void;

  /** Snapshot all store state (agent card, chat, HTTP logs, connection) */
  saveState(): Record<string, unknown>;

  /** Restore a previously saved snapshot */
  restoreState(snapshot: Record<string, unknown>): void;
}

export interface A2APlaygroundAPI {
  /**
   * Initialize the A2A Playground.
   * @param options - Configuration options
   * @returns Playground instance with control methods
   */
  init: (options: A2APlaygroundOptions) => A2APlaygroundInstance;

  /**
   * Legacy render method (alias for init).
   * @deprecated Use init() instead
   */
  render: (container: HTMLElement | string, props?: AgentPlaygroundProps) => { destroy: () => void };

  /**
   * Destroy a previously rendered playground instance.
   * @param container - CSS selector string or HTMLElement
   */
  destroy: (container: HTMLElement | string) => void;

  /** Package version */
  version: string;

  /** Reference to AgentPlayground component for advanced usage */
  AgentPlayground: typeof AgentPlayground;

  /** Reference to React for advanced usage */
  React: typeof React;
}

// ============================================================================
// Implementation
// ============================================================================

// Store references to roots and instances for cleanup
const roots = new Map<HTMLElement, Root>();
const instances = new Map<HTMLElement, A2APlaygroundInstance>();

function getElement(container: HTMLElement | string): HTMLElement {
  if (typeof container === "string") {
    const el = document.querySelector(container);
    if (!el) {
      throw new Error(`A2APlayground: Container not found: ${container}`);
    }
    return el as HTMLElement;
  }
  return container;
}

/**
 * Apply theme classes to a container element.
 * Uses `.a2a-root` for CSS variable scoping and `.dark` for dark mode.
 * Never touches document.documentElement to avoid leaking styles into host pages.
 */
function applyThemeToContainer(element: HTMLElement, theme: "light" | "dark" | "system") {
  element.classList.add("a2a-root");
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    element.classList.toggle("dark", prefersDark);
  } else {
    element.classList.toggle("dark", theme === "dark");
  }
}

function createInstance(element: HTMLElement, options: A2APlaygroundOptions): A2APlaygroundInstance {
  const instance: A2APlaygroundInstance = {
    setAgentCard(json: string) {
      useAgentCardStore.getState().setRawJson(json);
    },

    getAgentCard() {
      return useAgentCardStore.getState().rawJson;
    },

    getParsedCard() {
      return useAgentCardStore.getState().parsedCard;
    },

    async connect(url: string) {
      const store = useConnectionStore.getState();
      store.setUrl(url);

      // connect() handles well-known path discovery and returns the card
      const card = await store.connect();

      if (!card) {
        throw new Error("Failed to load agent card");
      }

      // Set the card in the editor store
      useAgentCardStore.getState().setRawJson(JSON.stringify(card, null, 2));

      if (options.onConnect) {
        options.onConnect(url, card);
      }

      return card;
    },

    disconnect() {
      useConnectionStore.getState().disconnect();
    },

    async validate() {
      const json = useAgentCardStore.getState().rawJson;
      await useValidationStore.getState().validate(json);
      const results = useValidationStore.getState().results;

      if (options.onValidationComplete) {
        options.onValidationComplete(results);
      }

      return results;
    },

    setActiveTab(tab) {
      useUIStore.getState().setActiveTab(tab);
    },

    setTheme(theme) {
      applyThemeToContainer(element, theme);
      useThemeStore.getState().setTheme(theme);
    },

    destroy() {
      A2APlayground.destroy(element);
    },

    saveState() {
      const { rawJson, parsedCard, parseError, isDirty, isLoading } = useAgentCardStore.getState();
      const { messages, isStreaming, currentTaskId, contextId, inputText } = useChatStore.getState();
      const { logs, highlightedLogId } = useHttpLogStore.getState();
      const connState = useConnectionStore.getState();
      return {
        agentCard: { rawJson, parsedCard, parseError, isDirty, isLoading },
        chat: { messages, isStreaming, currentTaskId, contextId, inputText },
        httpLog: { logs, highlightedLogId },
        connection: {
          url: connState.url,
          authType: connState.authType,
          connectionAuthType: connState.connectionAuthType,
          basicCredentials: connState.basicCredentials,
          oauth2Credentials: connState.oauth2Credentials,
          apiKeyCredentials: connState.apiKeyCredentials,
          authHeaders: connState.authHeaders,
          connectionStatus: connState.connectionStatus,
          errorMessage: connState.errorMessage,
          requiredAuth: connState.requiredAuth,
          protocolVersion: connState.protocolVersion,
        },
      };
    },

    restoreState(snapshot: Record<string, unknown>) {
      if (!snapshot) return;
      const s = snapshot as Record<string, Record<string, unknown>>;
      if (s.agentCard) useAgentCardStore.setState(s.agentCard);
      if (s.chat) useChatStore.setState(s.chat);
      if (s.httpLog) useHttpLogStore.setState(s.httpLog);
      if (s.connection) useConnectionStore.setState(s.connection);
    },
  };

  instances.set(element, instance);
  return instance;
}

const A2APlayground: A2APlaygroundAPI = {
  version: "__VERSION__", // Replaced at build time

  init(options) {
    const element = getElement(options.el);

    // Clean up existing instance if any
    if (roots.has(element)) {
      roots.get(element)!.unmount();
      roots.delete(element);
      instances.delete(element);
    }

    // Apply theme to container element (never touches document.documentElement)
    const resolvedTheme = options.theme ?? "system";
    applyThemeToContainer(element, resolvedTheme);

    // Set default sizing so the component fills its container
    if (!element.style.width) element.style.width = "100%";
    if (!element.style.height) element.style.height = "100%";

    // Sync the Zustand store so React's ThemeRoot renders the matching theme
    useThemeStore.getState().setTheme(resolvedTheme);

    // Set up authentication if provided
    if (options.auth) {
      const connStore = useConnectionStore.getState();
      connStore.setAuthType(options.auth.type);

      if (options.auth.credentials) {
        const creds = options.auth.credentials;
        if (options.auth.type === "basic" && creds.username) {
          connStore.setBasicCredentials({
            username: creds.username,
            password: creds.password || "",
          });
        } else if (options.auth.type === "oauth2" && creds.token) {
          connStore.setOAuth2Credentials({
            accessToken: creds.token,
          });
        } else if (options.auth.type === "apiKey" && creds.key) {
          connStore.setApiKeyCredentials({
            key: creds.key,
            headerName: creds.headerName || "X-API-Key",
          });
        }
      }
    }

    // Set initial agent card if provided
    if (options.agentCard) {
      useAgentCardStore.getState().setRawJson(options.agentCard);
    }

    // Create the React root and render
    const root = createRoot(element);
    roots.set(element, root);

    const props: AgentPlaygroundProps = {
      showChat: options.showChat ?? true,
      showRawHttp: options.showRawHttp ?? true,
      showValidation: options.showValidation ?? false,
      showSettings: options.showSettings ?? true,
      showEditor: options.showEditor ?? true,
      readOnly: options.readOnly ?? false,
      defaultTab: options.defaultTab ?? "overview",
      forceDesktop: options.forceDesktop ?? false,
      disableExamplePrompts: options.disableExamplePrompts ?? false,
      predefinedAgents: options.predefinedAgents,
      onAgentCardChange: options.onAgentCardChange,
      onConnect: options.onConnect,
      onValidationComplete: options.onValidationComplete,
    };

    root.render(React.createElement(AgentPlayground, props));

    // Create instance
    const instance = createInstance(element, options);

    // Auto-select a predefined agent by ID
    if (options.selectedAgentId) {
      setTimeout(async () => {
        try {
          const store = usePredefinedAgentsStore.getState();
          // Ensure agents are loaded
          if (store.agents.length === 0) {
            await store.loadDefaults();
          }
          const agents = usePredefinedAgentsStore.getState().agents;
          const agent = agents.find((a) => a.id === options.selectedAgentId);
          if (agent) {
            useChatStore.getState().clearChat();
            useHttpLogStore.getState().clearLogs();
            store.select(agent.id);
            const connStore = useConnectionStore.getState();
            connStore.setFromPredefined(agent);
            const card = await connStore.connect();
            if (card) {
              useAgentCardStore.getState().setRawJson(JSON.stringify(card, null, 2));
              connStore.autoConfigureAuth(card);
              useUIStore.getState().setMobileView("card");
            }
          }
        } catch (err) {
          if (options.onError) {
            options.onError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      }, 0);
    }
    // Auto-connect if URL provided
    else if (options.agentUrl) {
      // Use setTimeout to allow React to render first
      setTimeout(async () => {
        try {
          await instance.connect(options.agentUrl!);
        } catch (err) {
          if (options.onError) {
            options.onError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      }, 0);
    }

    // Call onReady callback
    if (options.onReady) {
      // Use setTimeout to ensure React has rendered
      setTimeout(() => options.onReady!(instance), 0);
    }

    return instance;
  },

  // Legacy render method for backwards compatibility
  render(container, props = {}) {
    const element = getElement(container);
    return A2APlayground.init({
      el: element,
      ...props,
    });
  },

  destroy(container) {
    const element = getElement(container);
    if (roots.has(element)) {
      roots.get(element)!.unmount();
      roots.delete(element);
      instances.delete(element);
      element.classList.remove("a2a-root", "dark");
      element.replaceChildren();
    }
  },

  AgentPlayground,
  React,
};

// Expose globally for CDN usage - use explicit assignment to avoid minification issues
declare global {
  interface Window {
    A2APlayground: A2APlaygroundAPI;
    A2AEditor: A2APlaygroundAPI;
    useConnectionStore: typeof useConnectionStore;
  }
}

// Self-executing to ensure window assignment happens
(function () {
  if (typeof window !== "undefined") {
    window.A2APlayground = A2APlayground;
    window.A2AEditor = A2APlayground;
    window.useConnectionStore = useConnectionStore;
  }
})();

// Only default export for standalone bundle (avoids Rollup module wrapper issues)
export default A2APlayground;
