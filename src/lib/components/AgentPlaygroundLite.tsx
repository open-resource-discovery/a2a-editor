import { useEffect } from "react";
import type { AgentCard } from "@lib/types/a2a";
import type { ValidationResult } from "@lib/types/validation";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { PlaygroundLiteLayout } from "./layouts/PlaygroundLiteLayout";
import { ThemeRoot } from "./ThemeRoot";
import { ErrorBoundary } from "./ErrorBoundary";
import { cn } from "@lib/utils/cn";

export interface AgentPlaygroundLiteProps {
  /** Initial agent card JSON string */
  initialAgentCard?: string;
  /** Initial agent URL to connect to */
  initialAgentUrl?: string;

  /** Show the settings/agents panel (default: true) */
  showSettings?: boolean;
  /** Show the validation tab (default: true) */
  showValidation?: boolean;
  /** Make the editor read-only (default: false) */
  readOnly?: boolean;
  /** Default tab to show (default: "overview") */
  defaultTab?: "overview" | "validation";

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
 * A2A Agent Playground Lite - A lightweight version without Chat functionality.
 *
 * Use this component when you need the editor and validation features but don't
 * need the chat/connection testing capabilities. This version enables better
 * tree-shaking as chat-related code is not included in the bundle.
 *
 * Features:
 * - Monaco-based JSON editor with syntax highlighting
 * - Agent card overview with capabilities, skills, and security info
 * - Validation against configurable rulesets
 * - Responsive design (3-pane desktop, sheets on mobile)
 * - NO Chat functionality (use AgentPlayground for chat)
 *
 * @example
 * ```tsx
 * import { AgentPlaygroundLite } from '@open-resource-discovery/a2a-editor/lite';
 * import '@open-resource-discovery/a2a-editor/styles';
 *
 * function App() {
 *   return (
 *     <AgentPlaygroundLite
 *       initialAgentUrl="https://my-agent.example.com"
 *       onAgentCardChange={(json, parsed) => console.log(parsed?.name)}
 *     />
 *   );
 * }
 * ```
 */
export function AgentPlaygroundLite({
  initialAgentCard,
  initialAgentUrl,
  showSettings = true,
  showValidation = true,
  readOnly = false,
  defaultTab = "overview",
  onAgentCardChange,
  onConnect,
  onValidationComplete,
  className,
}: AgentPlaygroundLiteProps) {
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
        <PlaygroundLiteLayout
          showSettings={showSettings}
          showValidation={showValidation}
          readOnly={readOnly}
          defaultTab={defaultTab}
          className="h-full"
        />
      </ThemeRoot>
    </ErrorBoundary>
  );
}
