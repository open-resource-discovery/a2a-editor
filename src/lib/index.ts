// CSS import - consumers should import this via '@open-resource-discovery/a2a-editor/styles'
// This import is here to trigger CSS generation during build
import "./styles.css";

export type { AgentEditorProps } from "./components/AgentEditor";
// Editor component (Monaco, no Chat)
export { AgentEditor } from "./components/AgentEditor";
export type { AgentPlaygroundProps } from "./components/AgentPlayground";
// Main component exports
export { AgentPlayground } from "./components/AgentPlayground";
export type { AgentViewerProps } from "./components/AgentViewer";
// Viewer component (UI-only, no Monaco)
export { AgentViewer } from "./components/AgentViewer";

// OAuth callback component (for integrating OAuth flow)
export { OAuthCallback } from "./components/OAuthCallback";
export { useAutoValidate } from "./hooks/useAutoValidate";
export { useIsLargeScreen, useMediaQuery } from "./hooks/useMediaQuery";
// Hook exports
export { useTheme } from "./hooks/useTheme";
// Store exports (for advanced usage)
export { selectParsedCard, selectParseError, useAgentCardStore } from "./stores/agentCardStore";
export { useChatStore } from "./stores/chatStore";
export { selectAuthHeaders, selectEffectiveUrl, useAuthHeaders, useConnectionStore } from "./stores/connectionStore";
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
export type { ChatMessage } from "./types/chat";
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
export type { ComplianceResult } from "./utils/a2a-compliance";
export { isFullyCompliant, validateAgentCard, validateResponse } from "./utils/a2a-compliance";

// Utility exports
export { cn } from "./utils/cn";
