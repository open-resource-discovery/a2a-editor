/**
 * Lite entry point - AgentPlayground without Chat functionality.
 * This entry point excludes chat-related code for better tree-shaking.
 */

// CSS import - consumers should import this via '@open-resource-discovery/a2a-editor/styles'
import "./styles.css";

export type { AgentPlaygroundLiteProps } from "./components/AgentPlaygroundLite";
// Lite component (Monaco, no Chat)
export { AgentPlaygroundLite } from "./components/AgentPlaygroundLite";
export type { AgentViewerProps } from "./components/AgentViewer";
// Viewer component (UI-only, no Monaco)
export { AgentViewer } from "./components/AgentViewer";
export { useAutoValidate } from "./hooks/useAutoValidate";
export { useIsLargeScreen, useMediaQuery } from "./hooks/useMediaQuery";
// Hook exports
export { useTheme } from "./hooks/useTheme";

// Store exports (excluding chat store)
export { selectParsedCard, selectParseError, useAgentCardStore } from "./stores/agentCardStore";
export { selectAuthHeaders, useAuthHeaders, useConnectionStore } from "./stores/connectionStore";
export { useEditorSettingsStore } from "./stores/editorSettingsStore";
export { selectSelectedAgent, usePredefinedAgentsStore } from "./stores/predefinedAgentsStore";
export { useUIStore } from "./stores/uiStore";
export { selectValidationSummary, useValidationStore } from "./stores/validationStore";
// Type exports
export type {
  AgentCapabilities,
  AgentCard,
  AgentProvider,
  AgentSkill,
  DataPart,
  FilePart,
  Part,
  SecurityRequirement,
  SecurityScheme,
  Task,
  TaskState,
  TaskStatus,
  TextPart,
} from "./types/a2a";
export type {
  AuthType,
  ConnectionStatus,
  PredefinedAgent,
} from "./types/connection";
export type {
  ValidationResult,
  ValidationSeverity,
  ValidationStatus,
  ValidationSummary,
} from "./types/validation";

// Utility exports
export { cn } from "./utils/cn";
