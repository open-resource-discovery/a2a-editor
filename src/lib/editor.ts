/**
 * @open-resource-discovery/a2a-editor/editor
 *
 * Editor entry point with Monaco - does NOT include Chat functionality.
 * Use this when you need the full editor but don't need chat/connection features.
 */

export type { AgentEditorProps } from "./components/AgentEditor";
// Main component
export { AgentEditor } from "./components/AgentEditor";
// Hooks
export { useAutoValidate } from "./hooks/useAutoValidate";
export { useTheme } from "./hooks/useTheme";

// Stores (for advanced usage)
export { selectParsedCard, selectParseError, useAgentCardStore } from "./stores/agentCardStore";
export { useEditorSettingsStore } from "./stores/editorSettingsStore";
export { selectSelectedAgent, usePredefinedAgentsStore } from "./stores/predefinedAgentsStore";
export { useUIStore } from "./stores/uiStore";
export { selectValidationSummary, useValidationStore } from "./stores/validationStore";
// Types (commonly needed)
export type { AgentCapabilities, AgentCard, AgentSkill } from "./types/a2a";
export type { ValidationResult, ValidationSummary } from "./types/validation";

// Utils
export { cn } from "./utils/cn";
