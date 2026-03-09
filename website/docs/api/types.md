---
sidebar_position: 3
---

# Types

TypeScript type definitions exported by the library.

## Import

```tsx
import type {
  AgentCard,
  AgentSkill,
  AgentCapabilities,
  ValidationResult,
  ChatMessage,
} from "@open-resource-discovery/a2a-editor";
```

## Agent Card Types

### AgentCard

The main agent card type following the A2A specification.

```typescript
interface AgentCard {
  name: string;
  url: string;
  version: string;
  description?: string;
  documentationUrl?: string;
  iconUrl?: string;
  provider?: AgentProvider;
  capabilities: AgentCapabilities;
  skills: AgentSkill[];
  securitySchemes?: Record<string, SecurityScheme>;
  security?: SecurityRequirement[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  protocolVersions?: string[];
  extensions?: AgentExtension[];
}
```

### AgentSkill

```typescript
interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  inputModes?: string[];
  outputModes?: string[];
  examples?: string[];
}
```

### AgentCapabilities

```typescript
interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
  extendedAgentCard?: boolean;
}
```

### AgentProvider

```typescript
interface AgentProvider {
  name: string;
  organization?: string;
  url?: string;
}
```

## Validation Types

### ValidationResult

```typescript
interface ValidationResult {
  id: string;
  rule: string;
  description: string;
  status: ValidationStatus;
  severity?: ValidationSeverity;
  message: string;
  path?: string;
}

type ValidationStatus = "pass" | "fail" | "warning";
type ValidationSeverity = "error" | "warning" | "info" | "hint";
```

### ValidationSummary

```typescript
interface ValidationSummary {
  pass: number;
  fail: number;
  warning: number;
  total: number;
}
```

## Chat Types

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "agent";
  parts: Part[];
  timestamp: Date;
  contextId?: string;
  taskId?: string;
  status?: TaskState;
  isStreaming?: boolean;
  artifacts?: Artifact[];
  compliant?: boolean;
  linkedChatMessageId?: string;
}
```

### Part

```typescript
type Part = TextPart | FilePart | DataPart;

interface TextPart {
  text: string;
}

interface FilePart {
  file: { uri: string; mimeType?: string; name?: string } | string;
}

interface DataPart {
  data: Record<string, unknown>;
}
```

## Connection Types

### ConnectionStatus

```typescript
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
```

### AuthType

```typescript
type AuthType = "none" | "apiKey" | "oauth2" | "basic";
```

### PredefinedAgent

```typescript
interface PredefinedAgent {
  id: string;
  name: string;
  description: string;
  url: string;
  iconUrl?: string;
  authType: AuthType;
  authConfig?: BasicCredentials | OAuth2Credentials | ApiKeyCredentials;
  tags?: string[];
}
```

## Security Types

### SecurityScheme

```typescript
interface SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "mutualTLS";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}
```

### SecurityRequirement

```typescript
type SecurityRequirement = Record<string, string[]>;
```
