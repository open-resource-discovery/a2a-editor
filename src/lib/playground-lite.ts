/**
 * Lite entry point - AgentPlayground without Chat functionality.
 * This entry point excludes chat-related code for better tree-shaking.
 */

// CSS import - consumers should import this via '@open-resource-discovery/a2a-editor/styles'
import "./styles.css";

// Lite component (Monaco, no Chat)
export { AgentPlaygroundLite } from "./components/AgentPlaygroundLite";
export type { AgentPlaygroundLiteProps } from "./components/AgentPlaygroundLite";

// Viewer component (UI-only, no Monaco)
export { AgentViewer } from "./components/AgentViewer";
export type { AgentViewerProps } from "./components/AgentViewer";

// Type exports
export type {
  AgentCard,
  AgentSkill,
  AgentCapabilities,
  AgentProvider,
  Part,
  TextPart,
  FilePart,
  DataPart,
  Task,
  TaskStatus,
  TaskState,
  SecurityScheme,
  SecurityRequirement,
} from "./types/a2a";

export type { ValidationResult, ValidationSummary, ValidationStatus, ValidationSeverity } from "./types/validation";

export type { AuthType, ConnectionStatus, PredefinedAgent } from "./types/connection";

// Store exports (excluding chat store)
export { useAgentCardStore, selectParsedCard, selectParseError } from "./stores/agentCardStore";
export { useConnectionStore, useAuthHeaders, selectAuthHeaders } from "./stores/connectionStore";
export { useValidationStore, selectValidationSummary } from "./stores/validationStore";
export { usePredefinedAgentsStore, selectSelectedAgent } from "./stores/predefinedAgentsStore";
export { useUIStore } from "./stores/uiStore";
export { useEditorSettingsStore } from "./stores/editorSettingsStore";

// Hook exports
export { useTheme } from "./hooks/useTheme";
export { useMediaQuery, useIsLargeScreen } from "./hooks/useMediaQuery";
export { useAutoValidate } from "./hooks/useAutoValidate";

// Utility exports
export { cn } from "./utils/cn";
