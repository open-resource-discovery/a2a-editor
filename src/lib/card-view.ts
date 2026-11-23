/**
 * @open-resource-discovery/a2a-editor/card-view
 *
 * Card View entry point - displays agent card overview without any editor.
 * Use this for read-only display of agent cards with minimal bundle size.
 */

export type { AgentCardViewProps } from "./components/AgentCardView";
// Main component
export { AgentCardView } from "./components/AgentCardView";
// Hooks
export { useAutoValidate } from "./hooks/useAutoValidate";
export { useTheme } from "./hooks/useTheme";

// Stores (for advanced usage)
export { selectParsedCard, selectParseError, useAgentCardStore } from "./stores/agentCardStore";
export { useUIStore } from "./stores/uiStore";
export { selectValidationSummary, useValidationStore } from "./stores/validationStore";
// Types (commonly needed)
export type { AgentCapabilities, AgentCard, AgentSkill } from "./types/a2a";
export type { ValidationResult, ValidationSummary } from "./types/validation";

// Utils
export { cn } from "./utils/cn";
