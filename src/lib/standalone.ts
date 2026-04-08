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
import { AgentCardView, type AgentCardViewProps } from "./components/AgentCardView";
import { AgentViewer, type AgentViewerProps } from "./components/AgentViewer";
import { AgentEditor, type AgentEditorProps } from "./components/AgentEditor";
import { useAgentCardStore } from "./stores/agentCardStore";
import { useConnectionStore } from "./stores/connectionStore";
import { useValidationStore } from "./stores/validationStore";
import { useUIStore } from "./stores/uiStore";
import { usePredefinedAgentsStore } from "./stores/predefinedAgentsStore";
import { useChatStore } from "./stores/chatStore";
import { useHttpLogStore } from "./stores/httpLogStore";
import type { AgentCard, Part } from "./types/a2a";
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

  /** Show the connection card in the overview (default: true) */
  showConnection?: boolean;

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

export interface SendMessageResult {
  response: string;
  compliant: boolean;
  complianceDetails: { rule: string; passed: boolean; message: string }[];
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

  /** Send a text message through the built-in chat UI */
  sendMessage(text: string): Promise<SendMessageResult>;

  /** Snapshot all store state (agent card, chat, HTTP logs, connection) */
  saveState(): Record<string, unknown>;

  /** Restore a previously saved snapshot */
  restoreState(snapshot: Record<string, unknown>): void;
}

/** Options for standalone component rendering (cardView, viewer, editor) */
export interface A2AComponentOptions {
  /** Target element - CSS selector string or HTMLElement (required) */
  el: string | HTMLElement;

  /** Agent URL to fetch the agent card from */
  agentUrl?: string;

  /** Initial agent card JSON string */
  agentCard?: string;

  /** Color theme (default: "system") */
  theme?: "light" | "dark" | "system";

  /** Show validation tab (default: false) */
  showValidation?: boolean;

  /** Default tab (default: "overview") */
  defaultTab?: "overview" | "validation";

  /** Read-only mode (default: false) */
  readOnly?: boolean;

  /** Show the connection card in the overview — cardView only (default: true) */
  showConnection?: boolean;

  /** Show settings/agents panel — editor only (default: true) */
  showSettings?: boolean;

  /** Callback when agent card JSON changes */
  onAgentCardChange?: (json: string, parsed: AgentCard | null) => void;

  /** Callback when validation completes */
  onValidationComplete?: (results: ValidationResult[]) => void;
}

/** Lightweight handle returned by cardView / viewer / editor */
export interface A2AComponentInstance {
  /** Set the agent card JSON */
  setAgentCard(json: string): void;
  /** Get the current agent card JSON */
  getAgentCard(): string;
  /** Get the parsed agent card (or null if invalid) */
  getParsedCard(): AgentCard | null;
  /** Run validation */
  validate(): Promise<ValidationResult[]>;
  /** Update the color theme */
  setTheme(theme: "light" | "dark" | "system"): void;
  /** Destroy the component */
  destroy(): void;
}

export interface A2APlaygroundAPI {
  /**
   * Initialize the full A2A Playground (editor + chat + connection).
   * @param options - Configuration options
   * @returns Playground instance with control methods
   */
  init: (options: A2APlaygroundOptions) => A2APlaygroundInstance;

  /**
   * Render just the Agent Card overview (no editor, no chat).
   *
   * @example
   * ```js
   * A2APlayground.cardView({
   *   el: '#card',
   *   agentUrl: 'https://my-agent.example.com/.well-known/agent.json'
   * });
   * ```
   */
  cardView: (options: A2AComponentOptions) => A2AComponentInstance;

  /**
   * Render the lightweight viewer (textarea editor + overview, no Monaco).
   */
  viewer: (options: A2AComponentOptions) => A2AComponentInstance;

  /**
   * Render the Monaco editor (editor + overview, no chat).
   */
  editor: (options: A2AComponentOptions) => A2AComponentInstance;

  /**
   * Legacy render method (alias for init).
   * @deprecated Use init() instead
   */
  render: (container: HTMLElement | string, props?: AgentPlaygroundProps) => { destroy: () => void };

  /**
   * Destroy a previously rendered component/playground instance.
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
const instances = new Map<HTMLElement, A2APlaygroundInstance | A2AComponentInstance>();

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

/**
 * Shared helper: resolve element, clean up previous root, apply theme & sizing.
 * Returns the resolved HTMLElement and the new React Root.
 */
function mountContainer(
  el: string | HTMLElement,
  theme: "light" | "dark" | "system" = "system",
): { element: HTMLElement; root: Root } {
  const element = getElement(el);

  // Clean up existing instance if any
  if (roots.has(element)) {
    roots.get(element)!.unmount();
    roots.delete(element);
    instances.delete(element);
  }

  applyThemeToContainer(element, theme);
  if (!element.style.width) element.style.width = "100%";
  if (!element.style.height) element.style.height = "100%";
  useThemeStore.getState().setTheme(theme);

  const root = createRoot(element);
  roots.set(element, root);

  return { element, root };
}

/** Create a lightweight instance handle for cardView / viewer / editor */
function createComponentInstance(element: HTMLElement, options: A2AComponentOptions): A2AComponentInstance {
  const inst: A2AComponentInstance = {
    setAgentCard(json: string) {
      useAgentCardStore.getState().setRawJson(json);
    },
    getAgentCard() {
      return useAgentCardStore.getState().rawJson;
    },
    getParsedCard() {
      return useAgentCardStore.getState().parsedCard;
    },
    async validate() {
      const json = useAgentCardStore.getState().rawJson;
      await useValidationStore.getState().validate(json);
      const results = useValidationStore.getState().results;
      options.onValidationComplete?.(results);
      return results;
    },
    setTheme(theme) {
      applyThemeToContainer(element, theme);
      useThemeStore.getState().setTheme(theme);
    },
    destroy() {
      destroyContainer(element);
    },
  };
  instances.set(element, inst);
  return inst;
}

function destroyContainer(container: HTMLElement | string) {
  const element = getElement(container);
  if (roots.has(element)) {
    roots.get(element)!.unmount();
    roots.delete(element);
    instances.delete(element);
    element.classList.remove("a2a-root", "dark");
    element.replaceChildren();
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
      const result = await store.connect();

      if (!result) {
        throw new Error("Failed to load agent card");
      }

      // Set the card in the editor store
      useAgentCardStore.getState().setRawJson(result.rawJson);

      if (options.onConnect) {
        options.onConnect(url, result.card);
      }

      return result.card;
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

    async sendMessage(text: string): Promise<SendMessageResult> {
      const parts: Part[] = [{ text }];
      const connStore = useConnectionStore.getState();
      const agentUrl = connStore.messagingUrl || connStore.url;
      const authHeaders = connStore.authHeaders;
      await useChatStore.getState().sendMessage(parts, agentUrl, authHeaders);

      // After await, the last message in the store is the agent's response
      const messages = useChatStore.getState().messages;
      const agentMsg = messages[messages.length - 1];
      const responseText =
        agentMsg?.role === "agent"
          ? agentMsg.parts
              .map((p) => ("text" in p ? p.text : ""))
              .filter(Boolean)
              .join("\n")
          : "";

      return {
        response: responseText,
        compliant: agentMsg?.compliant ?? false,
        complianceDetails: (agentMsg?.complianceDetails ?? []).map((d) => ({
          rule: d.rule,
          passed: d.passed,
          message: d.message,
        })),
      };
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
          messagingUrl: connState.messagingUrl,
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
    const { element, root } = mountContainer(options.el, options.theme);

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

    const props: AgentPlaygroundProps = {
      showChat: options.showChat ?? true,
      showRawHttp: options.showRawHttp ?? true,
      showValidation: options.showValidation ?? true,
      showSettings: options.showSettings ?? true,
      showEditor: options.showEditor ?? true,
      readOnly: options.readOnly ?? false,
      showConnection: options.showConnection ?? true,
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
            const result = await connStore.connect();
            if (result) {
              useAgentCardStore.getState().setRawJson(result.rawJson);
              connStore.autoConfigureAuth(result.card);
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

  // ---- Lightweight component renderers --------------------------------

  cardView(options) {
    const { element, root } = mountContainer(options.el, options.theme);

    if (options.agentCard) {
      useAgentCardStore.getState().setRawJson(options.agentCard);
    }

    const props: AgentCardViewProps = {
      initialAgentCard: options.agentCard,
      initialAgentUrl: options.agentUrl,
      showValidation: options.showValidation ?? true,
      defaultTab: options.defaultTab ?? "overview",
      readOnly: options.readOnly ?? false,
      showConnection: options.showConnection ?? true,
      onAgentCardChange: options.onAgentCardChange,
      onValidationComplete: options.onValidationComplete,
    };

    root.render(React.createElement(AgentCardView, props));
    return createComponentInstance(element, options);
  },

  viewer(options) {
    const { element, root } = mountContainer(options.el, options.theme);

    if (options.agentCard) {
      useAgentCardStore.getState().setRawJson(options.agentCard);
    }

    const props: AgentViewerProps = {
      initialAgentCard: options.agentCard,
      initialAgentUrl: options.agentUrl,
      showValidation: options.showValidation ?? true,
      defaultTab: options.defaultTab ?? "overview",
      onAgentCardChange: options.onAgentCardChange,
      onValidationComplete: options.onValidationComplete,
    };

    root.render(React.createElement(AgentViewer, props));
    return createComponentInstance(element, options);
  },

  editor(options) {
    const { element, root } = mountContainer(options.el, options.theme);

    if (options.agentCard) {
      useAgentCardStore.getState().setRawJson(options.agentCard);
    }

    const props: AgentEditorProps = {
      initialAgentCard: options.agentCard,
      initialAgentUrl: options.agentUrl,
      showSettings: options.showSettings ?? true,
      showValidation: options.showValidation ?? true,
      readOnly: options.readOnly ?? false,
      defaultTab: options.defaultTab ?? "overview",
      onAgentCardChange: options.onAgentCardChange,
      onValidationComplete: options.onValidationComplete,
    };

    root.render(React.createElement(AgentEditor, props));
    return createComponentInstance(element, options);
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
    destroyContainer(container);
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
