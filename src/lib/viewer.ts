/**
 * @open-resource-discovery/a2a-editor/viewer
 *
 * Lightweight viewer entry point - does NOT include Monaco editor or Chat.
 * Use this for smaller bundle size (~80KB vs ~500KB).
 */

// Main component
export { AgentViewer } from "./components/AgentViewer";
export type { AgentViewerProps } from "./components/AgentViewer";

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
