// CSS import - consumers should import this via '@open-resource-discovery/a2a-editor/styles'
// This import is here to trigger CSS generation during build
import "./styles.css";

// Main component exports
export { AgentPlayground } from "./components/AgentPlayground";
export type { AgentPlaygroundProps } from "./components/AgentPlayground";

// Viewer component (UI-only, no Monaco)
export { AgentViewer } from "./components/AgentViewer";
export type { AgentViewerProps } from "./components/AgentViewer";

// Editor component (Monaco, no Chat)
export { AgentEditor } from "./components/AgentEditor";
export type { AgentEditorProps } from "./components/AgentEditor";

// OAuth callback component (for integrating OAuth flow)
export { OAuthCallback } from "./components/OAuthCallback";

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

export type { ChatMessage } from "./types/chat";

export type { ComplianceResult } from "./utils/a2a-compliance";
export { validateAgentCard, validateResponse, isFullyCompliant } from "./utils/a2a-compliance";

export type { ValidationResult, ValidationSummary, ValidationStatus, ValidationSeverity } from "./types/validation";

export type { AuthType, ConnectionStatus, PredefinedAgent } from "./types/connection";

// Store exports (for advanced usage)
export { useAgentCardStore, selectParsedCard, selectParseError } from "./stores/agentCardStore";
export { useConnectionStore, useAuthHeaders, selectAuthHeaders, selectEffectiveUrl } from "./stores/connectionStore";
export { useChatStore } from "./stores/chatStore";
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
