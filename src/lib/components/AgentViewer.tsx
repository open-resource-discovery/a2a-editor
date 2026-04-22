import { useEffect } from "react";
import type { AgentCard } from "@lib/types/a2a";
import type { ValidationResult } from "@lib/types/validation";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { ViewerLayout } from "./layouts/ViewerLayout";
import { ThemeRoot } from "./ThemeRoot";
import { ErrorBoundary } from "./ErrorBoundary";
import { cn } from "@lib/utils/cn";

export interface AgentViewerProps {
  /** Initial agent card JSON string */
  initialAgentCard?: string;
  /** Initial agent URL to fetch agent card from */
  initialAgentUrl?: string;

  /** Show the validation tab (default: true) */
  showValidation?: boolean;
  /** Default tab to show (default: "overview") */
  defaultTab?: "overview" | "validation";

  /** Callback when agent card JSON changes */
  onAgentCardChange?: (json: string, parsed: AgentCard | null) => void;
  /** Callback when validation completes */
  onValidationComplete?: (results: ValidationResult[]) => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * A2A Agent Viewer - A lightweight React component for viewing and validating
 * Agent Cards. Does NOT include Monaco editor or Chat functionality.
 *
 * Use this when you need a smaller bundle (~80KB vs ~500KB) and don't need
 * the full editor or chat features.
 *
 * Features:
 * - Simple textarea-based JSON editing
 * - Agent card overview with capabilities, skills, and security info
 * - Validation against configurable rulesets
 * - Responsive design (2-pane desktop, sheets on mobile)
 *
 * @example
 * ```tsx
 * import { AgentViewer } from '@open-resource-discovery/a2a-editor/viewer';
 * import '@open-resource-discovery/a2a-editor/styles';
 *
 * function App() {
 *   return (
 *     <AgentViewer
 *       initialAgentUrl="https://my-agent.example.com/.well-known/agent.json"
 *       showValidation={false}
 *     />
 *   );
 * }
 * ```
 */
export function AgentViewer({
  initialAgentCard,
  initialAgentUrl,
  showValidation = true,
  defaultTab = "overview",
  onAgentCardChange,
  onValidationComplete,
  className,
}: AgentViewerProps) {
  const { setRawJson, loadFromUrl, rawJson, parsedCard } = useAgentCardStore();
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

  // Notify parent of validation results
  useEffect(() => {
    if (results.length > 0) {
      onValidationComplete?.(results);
    }
  }, [results, onValidationComplete]);

  return (
    <ErrorBoundary>
      <ThemeRoot className={cn("h-full", className)}>
        <ViewerLayout showValidation={showValidation} defaultTab={defaultTab} className="h-full" />
      </ThemeRoot>
    </ErrorBoundary>
  );
}
