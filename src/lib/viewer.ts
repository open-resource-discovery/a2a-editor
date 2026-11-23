/**
 * @open-resource-discovery/a2a-editor/viewer
 *
 * Lightweight viewer entry point - does NOT include Monaco editor or Chat.
 * Use this for smaller bundle size (~80KB vs ~500KB).
 */

export type { AgentViewerProps } from "./components/AgentViewer";
// Main component
export { AgentViewer } from "./components/AgentViewer";
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
