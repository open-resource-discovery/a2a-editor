import { useEffect } from "react";
import type { AgentCard } from "@lib/types/a2a";
import type { ValidationResult } from "@lib/types/validation";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { CardViewLayout } from "./layouts/CardViewLayout";
import { ThemeRoot } from "./ThemeRoot";
import { cn } from "@lib/utils/cn";

export interface AgentCardViewProps {
  /** Initial agent card JSON string */
  initialAgentCard?: string;
  /** Initial agent URL to fetch agent card from */
  initialAgentUrl?: string;

  /** Show the validation tab (default: true) */
  showValidation?: boolean;
  /** Default tab to show (default: "overview") */
  defaultTab?: "overview" | "validation";

  /** Read-only mode — hides connection/auth forms and disables interactive elements (default: false) */
  readOnly?: boolean;

  /** Show the connection card in the overview (default: true) */
  showConnection?: boolean;

  /** Callback when agent card JSON changes */
  onAgentCardChange?: (json: string, parsed: AgentCard | null) => void;
  /** Callback when validation completes */
  onValidationComplete?: (results: ValidationResult[]) => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * A2A Agent Card View - A React component for displaying Agent Cards
 * without a JSON editor. Shows just the overview and validation tabs.
 *
 * Use this when you want to display an agent card in a read-only format
 * without the Monaco editor overhead.
 *
 * Features:
 * - Agent card overview with capabilities, skills, and security info
 * - Validation against configurable rulesets
 * - Compact, single-pane layout
 *
 * @example
 * ```tsx
 * import { AgentCardView } from '@open-resource-discovery/a2a-editor/card-view';
 * import '@open-resource-discovery/a2a-editor/styles';
 *
 * function App() {
 *   return (
 *     <AgentCardView
 *       initialAgentUrl="https://my-agent.example.com/.well-known/agent.json"
 *       showValidation={false}
 *     />
 *   );
 * }
 * ```
 */
export function AgentCardView({
  initialAgentCard,
  initialAgentUrl,
  showValidation = false,
  defaultTab = "overview",
  readOnly = false,
  showConnection = true,
  onAgentCardChange,
  onValidationComplete,
  className,
}: AgentCardViewProps) {
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
    <ThemeRoot className={cn("h-full", className)}>
      <CardViewLayout
        showValidation={showValidation}
        defaultTab={defaultTab}
        readOnly={readOnly}
        showConnection={showConnection}
        className="h-full"
      />
    </ThemeRoot>
  );
}
