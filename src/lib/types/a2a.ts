/**
 * A2A Protocol internal type definitions.
 *
 * These types are protocol-agnostic, human-readable representations used throughout
 * the application. Wire format conversion is handled by the protocol boundary layer
 * (a2a-protocol.ts). States use lowercase kebab-case, roles are simple strings,
 * and file parts use nested objects.
 */

// Based on the Agent-to-Agent (A2A) protocol specification

export interface AgentCard {
  name: string;
  url?: string; // Top-level in v0.3.0; absent in v1.0.0 (derived from supportedInterfaces)
  version: string;
  description?: string;
  provider?: AgentProvider;
  documentationUrl?: string;
  iconUrl?: string;
  capabilities: AgentCapabilities;
  skills: AgentSkill[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  securitySchemes?: Record<string, SecurityScheme>;
  security?: SecurityRequirement[];
  protocolVersions?: string[];
  extensions?: AgentExtension[];
  supportedInterfaces?: SupportedInterface[]; // v1.0.0
}

export interface SupportedInterface {
  url: string;
  protocolBinding: string;
  protocolVersion: string;
}

export interface AgentProvider {
  name: string;
  organization?: string;
  url?: string;
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
  extendedAgentCard?: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  inputModes?: string[];
  outputModes?: string[];
  examples?: string[];
}

export type SecuritySchemeType = "apiKey" | "http" | "oauth2" | "openIdConnect" | "mutualTLS";

export interface SecurityScheme {
  type: SecuritySchemeType;
  description?: string;
  // http-specific
  scheme?: string; // "basic", "bearer"
  bearerFormat?: string;
  // apiKey-specific
  name?: string;
  in?: "header" | "query" | "cookie";
  // oauth2-specific
  flows?: OAuthFlows;
  oauth2MetadataUrl?: string; // RFC 8414 authorization server metadata
  // openIdConnect-specific
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  authorizationCode?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  deviceCode?: DeviceCodeOAuthFlow;
  implicit?: OAuthFlow; // deprecated in A2A 0.3.0
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

export interface DeviceCodeOAuthFlow {
  deviceAuthorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

export type SecurityRequirement = Record<string, string[]>;

export interface AgentExtension {
  uri: string;
  version?: string;
  requiredFields?: string[];
}

// JSON-RPC 2.0 types

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Message and Part types
// Supports both new spec (OneOf pattern) and legacy format (kind/type discriminator)

export interface TextPart {
  text: string;
  kind?: "text"; // Legacy
  type?: "text"; // Legacy
  metadata?: Record<string, unknown>;
}

export interface FilePart {
  file: { uri: string; mimeType?: string; mediaType?: string; name?: string; bytes?: string } | string; // string for inline base64
  kind?: "file"; // Legacy
  type?: "file"; // Legacy
  metadata?: Record<string, unknown>;
}

export interface DataPart {
  data: Record<string, unknown>;
  kind?: "data"; // Legacy
  type?: "data"; // Legacy
  metadata?: Record<string, unknown>;
}

export type Part = TextPart | FilePart | DataPart;

// Type guards for Part types
export function isTextPart(part: Part): part is TextPart {
  return "text" in part && typeof part.text === "string";
}

export function isFilePart(part: Part): part is FilePart {
  return "file" in part;
}

export function isDataPart(part: Part): part is DataPart {
  return "data" in part && typeof part.data === "object";
}

export interface A2AMessage {
  role: "user" | "agent";
  parts: Part[];
  messageId: string;
  contextId?: string;
  taskId?: string;
}

// Task types

export type TaskState =
  | "pending"
  | "submitted"
  | "working"
  | "input-required"
  | "auth-required"
  | "completed"
  | "failed"
  | "canceled"
  | "rejected";

export interface TaskStatus {
  state: TaskState;
  timestamp?: string;
  message?: A2AMessage; // Optional message with status details
}

export interface Artifact {
  artifactId: string;
  name?: string;
  parts: Part[];
  metadata?: Record<string, unknown>;
  append?: boolean;
  lastChunk?: boolean;
}

export interface Task {
  id: string;
  contextId: string;
  status: TaskStatus;
  artifacts?: Artifact[];
  history?: A2AMessage[];
  metadata?: Record<string, unknown>;
}
