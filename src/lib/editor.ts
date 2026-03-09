/**
 * @open-resource-discovery/a2a-editor/editor
 *
 * Editor entry point with Monaco - does NOT include Chat functionality.
 * Use this when you need the full editor but don't need chat/connection features.
 */

// Main component
export { AgentEditor } from "./components/AgentEditor";
export type { AgentEditorProps } from "./components/AgentEditor";

// Types (commonly needed)
export type { AgentCard, AgentSkill, AgentCapabilities } from "./types/a2a";
export type { ValidationResult, ValidationSummary } from "./types/validation";

// Stores (for advanced usage)
export { useAgentCardStore, selectParsedCard, selectParseError } from "./stores/agentCardStore";
export { useValidationStore, selectValidationSummary } from "./stores/validationStore";
export { useUIStore } from "./stores/uiStore";
export { useEditorSettingsStore } from "./stores/editorSettingsStore";
export { usePredefinedAgentsStore, selectSelectedAgent } from "./stores/predefinedAgentsStore";

// Hooks
export { useAutoValidate } from "./hooks/useAutoValidate";
export { useTheme } from "./hooks/useTheme";

// Utils
export { cn } from "./utils/cn";
