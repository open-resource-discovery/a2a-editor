/**
 * @open-resource-discovery/a2a-editor/card-view
 *
 * Card View entry point - displays agent card overview without any editor.
 * Use this for read-only display of agent cards with minimal bundle size.
 */

// Main component
export { AgentCardView } from "./components/AgentCardView";
export type { AgentCardViewProps } from "./components/AgentCardView";

// Types (commonly needed)
export type { AgentCard, AgentSkill, AgentCapabilities } from "./types/a2a";
export type { ValidationResult, ValidationSummary } from "./types/validation";

// Stores (for advanced usage)
export { useAgentCardStore, selectParsedCard, selectParseError } from "./stores/agentCardStore";
export { useValidationStore, selectValidationSummary } from "./stores/validationStore";
export { useUIStore } from "./stores/uiStore";

// Hooks
export { useAutoValidate } from "./hooks/useAutoValidate";
export { useTheme } from "./hooks/useTheme";

// Utils
export { cn } from "./utils/cn";
