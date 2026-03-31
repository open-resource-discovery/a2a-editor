import { useEffect } from "react";
import type { AgentCard } from "@lib/types/a2a";
import type { ValidationResult } from "@lib/types/validation";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { EditorLayout } from "./layouts/EditorLayout";
import { ThemeRoot } from "./ThemeRoot";
import { ErrorBoundary } from "./ErrorBoundary";
import { cn } from "@lib/utils/cn";

export interface AgentEditorProps {
  /** Initial agent card JSON string */
  initialAgentCard?: string;
  /** Initial agent URL to fetch agent card from */
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
  /** Callback when validation completes */
  onValidationComplete?: (results: ValidationResult[]) => void;

  /** Additional CSS class name */
  className?: string;
}

/**
 * A2A Agent Editor - A React component with full Monaco editor but without
 * Chat functionality. Use this when you need the editor but don't need
 * the live chat/connection features.
 *
 * Features:
 * - Monaco-based JSON editor with syntax highlighting
 * - Agent card overview with capabilities, skills, and security info
 * - Validation against configurable rulesets
 * - Responsive design (3-pane desktop, sheets on mobile)
 *
 * @example
 * ```tsx
 * import { AgentEditor } from '@open-resource-discovery/a2a-editor/editor';
 * import '@open-resource-discovery/a2a-editor/styles';
 *
 * function App() {
 *   return (
 *     <AgentEditor
 *       initialAgentUrl="https://my-agent.example.com/.well-known/agent.json"
 *       showValidation={false}
 *       onAgentCardChange={(json, parsed) => console.log(parsed?.name)}
 *     />
 *   );
 * }
 * ```
 */
export function AgentEditor({
  initialAgentCard,
  initialAgentUrl,
  showSettings = true,
  showValidation = true,
  readOnly = false,
  defaultTab = "overview",
  onAgentCardChange,
  onValidationComplete,
  className,
}: AgentEditorProps) {
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
        <EditorLayout
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
