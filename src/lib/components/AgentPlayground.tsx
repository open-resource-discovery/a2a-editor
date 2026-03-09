import { useEffect } from "react";
import type { AgentCard } from "@lib/types/a2a";
import type { ValidationResult } from "@lib/types/validation";
import type { PredefinedAgent } from "@lib/types/connection";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";
import { PlaygroundLayout } from "./PlaygroundLayout";
import { ThemeRoot } from "./ThemeRoot";
import { ErrorBoundary } from "./ErrorBoundary";
import { cn } from "@lib/utils/cn";

export interface AgentPlaygroundProps {
  /** Initial agent card JSON string */
  initialAgentCard?: string;
  /** Initial agent URL to connect to */
  initialAgentUrl?: string;

  /** Show the settings/agents panel (default: true) */
  showSettings?: boolean;
  /** Show the validation tab (default: true) */
  showValidation?: boolean;
  /** Show the chat tab (default: true) */
  showChat?: boolean;
  /** Show the Raw HTTP tab (default: true) */
  showRawHttp?: boolean;
  /** Show the JSON editor (default: true). Set to false for viewer-only mode */
  showEditor?: boolean;
  /** Show the editor toolbar with format/copy/validate buttons (default: false) */
  showToolbar?: boolean;
  /** Make the editor read-only (default: false) */
  readOnly?: boolean;
  /** Default tab to show (default: "overview") */
  defaultTab?: "overview" | "chat" | "validation" | "rawhttp";
  /** Maximum number of example prompts to show in chat (default: 2) */
  maxExamplePrompts?: number;
  /** Disable clicking on example prompts in chat and overview (default: false) */
  disableExamplePrompts?: boolean;
  /** Force desktop layout regardless of screen size (default: false) */
  forceDesktop?: boolean;

  /** Predefined agents to show in the sidebar. If not provided, loads from predefined-agents.json */
  predefinedAgents?: PredefinedAgent[];

  /** Callback when agent card JSON changes */
  onAgentCardChange?: (json: string, parsed: AgentCard | null) => void;
  /** Callback when successfully connected to an agent */
  onConnect?: (url: string, card: AgentCard) => void;
  /** Callback when validation completes */
  onValidationComplete?: (results: ValidationResult[]) => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * A2A Agent Playground - A reusable React component for editing and testing
 * Agent Cards following the A2A (Agent-to-Agent) protocol.
 *
 * Features:
 * - Monaco-based JSON editor with syntax highlighting
 * - Agent card overview with capabilities, skills, and security info
 * - Chat interface for testing agent interactions
 * - Validation against configurable rulesets
 * - Responsive design (3-pane desktop, sheets on mobile)
 *
 * @example
 * ```tsx
 * import { AgentPlayground } from '@open-resource-discovery/a2a-editor';
 * import '@open-resource-discovery/a2a-editor/styles';
 *
 * function App() {
 *   return (
 *     <AgentPlayground
 *       initialAgentUrl="https://my-agent.example.com"
 *       onAgentCardChange={(json, parsed) => console.log(parsed?.name)}
 *     />
 *   );
 * }
 * ```
 */
export function AgentPlayground({
  initialAgentCard,
  initialAgentUrl,
  showSettings = true,
  showValidation = true,
  showChat = true,
  showRawHttp = true,
  showEditor = true,
  showToolbar = true,
  readOnly = false,
  defaultTab = "overview",
  maxExamplePrompts = 2,
  disableExamplePrompts = false,
  forceDesktop = false,
  predefinedAgents,
  onAgentCardChange,
  onConnect,
  onValidationComplete,
  className,
}: AgentPlaygroundProps) {
  const { setRawJson, loadFromUrl, rawJson, parsedCard } = useAgentCardStore();
  const { connectionStatus, url } = useConnectionStore();
  const { results } = useValidationStore();

  // Initialize from props on mount
  useEffect(() => {
    if (initialAgentCard) {
      setRawJson(initialAgentCard);
    } else if (initialAgentUrl) {
      loadFromUrl(initialAgentUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Populate predefined agents if provided via props
  useEffect(() => {
    if (predefinedAgents) {
      usePredefinedAgentsStore.setState({ agents: predefinedAgents });
    }
  }, [predefinedAgents]);

  // Notify parent of agent card changes
  useEffect(() => {
    onAgentCardChange?.(rawJson, parsedCard);
  }, [rawJson, parsedCard, onAgentCardChange]);

  // Notify parent on successful connection
  useEffect(() => {
    if (connectionStatus === "connected" && parsedCard && url) {
      onConnect?.(url, parsedCard);
    }
  }, [connectionStatus, parsedCard, url, onConnect]);

  // Notify parent of validation results
  useEffect(() => {
    if (results.length > 0) {
      onValidationComplete?.(results);
    }
  }, [results, onValidationComplete]);

  return (
    <ErrorBoundary>
      <ThemeRoot className={cn("h-full", className)}>
        <PlaygroundLayout
          showSettings={showSettings}
          showValidation={showValidation}
          showChat={showChat}
          showRawHttp={showRawHttp}
          showEditor={showEditor}
          showToolbar={showToolbar}
          readOnly={readOnly}
          defaultTab={defaultTab}
          maxExamplePrompts={maxExamplePrompts}
          disableExamplePrompts={disableExamplePrompts}
          forceDesktop={forceDesktop}
          className="h-full"
        />
      </ThemeRoot>
    </ErrorBoundary>
  );
}
