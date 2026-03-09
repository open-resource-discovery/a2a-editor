---
sidebar_position: 1
---

# Stores

The library uses Zustand for state management. You can access these stores for custom integrations.

## Import

```tsx
import { useAgentCardStore, useConnectionStore, useChatStore, useUIStore } from "@open-resource-discovery/a2a-editor";
```

## useAgentCardStore

Manages the agent card JSON and parsed state.

```tsx
const {
  rawJson, // Current JSON string
  parsedCard, // Parsed AgentCard object or null
  parseError, // Parse error message or null
  setRawJson, // (json: string) => void
} = useAgentCardStore();

// Selectors
import { selectParsedCard, selectParseError } from "@open-resource-discovery/a2a-editor";
const parsedCard = useAgentCardStore(selectParsedCard);
```

## useConnectionStore

Manages connection state and authentication.

```tsx
const {
  url, // Current agent URL
  connectionStatus, // "disconnected" | "connecting" | "connected" | "error"
  errorMessage, // Error message
  authType, // "none" | "apiKey" | "oauth2" | "basic"
  authHeaders, // Record<string, string>
  setUrl, // (url: string) => void
  connect, // () => Promise<AgentCard | null>
  disconnect, // () => void
} = useConnectionStore();

// Selectors
import { selectAuthHeaders } from "@open-resource-discovery/a2a-editor";
const headers = useConnectionStore(selectAuthHeaders);
```

## useChatStore

Manages chat messages and streaming state.

```tsx
const {
  messages, // ChatMessage[]
  isStreaming, // boolean
  sendMessage, // (parts: Part[], url: string, headers: Record<string, string>) => Promise<void>
  clearChat, // () => void
  retryMessage, // (messageId: string, url: string, headers: Record<string, string>) => void
} = useChatStore();
```

## useUIStore

Manages UI state like panel visibility and mobile view.

```tsx
const {
  settingsPanelOpen,
  mobileView, // "selector" | "card" | "json"
  setSettingsPanelOpen,
  setMobileView,
  closeAllPanels,
} = useUIStore();
```

## Example: Custom Component

```tsx
import { useAgentCardStore, useConnectionStore } from "@open-resource-discovery/a2a-editor";

function AgentStatus() {
  const parsedCard = useAgentCardStore((state) => state.parsedCard);
  const connectionStatus = useConnectionStore((state) => state.connectionStatus);

  return (
    <div>
      <p>Agent: {parsedCard?.name ?? "No agent loaded"}</p>
      <p>Status: {connectionStatus}</p>
    </div>
  );
}
```
