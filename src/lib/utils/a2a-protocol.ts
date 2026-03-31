/**
 * A2A Protocol boundary layer.
 *
 * Internal types use human-readable formats (lowercase states, nested file objects,
 * simple role strings). This module handles conversion between wire formats and
 * internal types at the system boundary.
 *
 * v1.0 is the primary supported protocol. v0.3 is supported for backwards compatibility.
 */
import type { AgentCard, TaskState, Part, Artifact } from "@lib/types/a2a";

// ===================================================================
// Protocol Versions
// ===================================================================

/** Supported protocol versions. */
export const PROTOCOL_VERSIONS = {
  V1: "1.0.0",
  V0_3: "0.3.0",
} as const;

export type ProtocolVersion = (typeof PROTOCOL_VERSIONS)[keyof typeof PROTOCOL_VERSIONS] | string;

// ===================================================================
// Version Detection
// ===================================================================

/** Check if a protocol version string represents v1.x (handles "1.0", "1.0.0", "1.0.1", etc.) */
export function isV1(version: string): boolean {
  return version.startsWith("1.");
}

/** Detect protocol version from an agent card shape. */
export function detectProtocolVersion(card: unknown): string {
  if (card && typeof card === "object" && "supportedInterfaces" in card) {
    const ifaces = (card as Record<string, unknown>).supportedInterfaces;
    if (Array.isArray(ifaces) && ifaces.length > 0) {
      const first = ifaces[0] as Record<string, unknown>;
      if (typeof first.protocolVersion === "string") {
        return first.protocolVersion; // e.g. "1.0" or "1.0.0"
      }
    }
    return PROTOCOL_VERSIONS.V1; // has supportedInterfaces but no explicit version
  }
  return PROTOCOL_VERSIONS.V0_3;
}

// ===================================================================
// Inbound: Agent Card
// ===================================================================

/**
 * Normalize an agent card to internal format.
 * For v1.0 cards: copies the URL from supportedInterfaces[0].url into the
 * top-level `url` field and populates `protocolVersions`.
 */
export function normalizeAgentCard(raw: unknown): AgentCard {
  if (!raw || typeof raw !== "object") return raw as AgentCard;

  // Work on a shallow copy to avoid mutating the original
  const card = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(card.supportedInterfaces) && card.supportedInterfaces.length > 0) {
    const iface = card.supportedInterfaces[0] as {
      url?: string;
      protocolVersion?: string;
    };

    // Populate top-level url from first interface if missing
    if (!card.url && iface.url) {
      card.url = iface.url;
    }

    // Populate protocolVersions from interfaces if missing
    if (!card.protocolVersions) {
      card.protocolVersions = (card.supportedInterfaces as Array<{ protocolVersion?: string }>)
        .map((i) => i.protocolVersion)
        .filter(Boolean);
    }
  }

  // Normalize v1.0 nested securitySchemes to v0.3 flat format
  if (card.securitySchemes && typeof card.securitySchemes === "object") {
    const schemes = card.securitySchemes as Record<string, Record<string, unknown>>;
    const normalized: Record<string, Record<string, unknown>> = {};
    for (const [name, scheme] of Object.entries(schemes)) {
      normalized[name] = normalizeSecurityScheme(scheme);
    }
    card.securitySchemes = normalized;
  }

  // Normalize v1.0 securityRequirements to v0.3 security format
  if (Array.isArray(card.securityRequirements) && !card.security) {
    card.security = (card.securityRequirements as Array<Record<string, unknown>>).map(
      normalizeSecurityRequirement,
    );
  }

  return card as unknown as AgentCard;
}

/**
 * Flatten a v1.0 nested security scheme to the v0.3 flat `type` discriminator format.
 * If the scheme already has a `type` field (v0.3 format), return as-is.
 */
function normalizeSecurityScheme(scheme: Record<string, unknown>): Record<string, unknown> {
  // Already v0.3 format
  if (typeof scheme.type === "string") return scheme;

  if (scheme.httpAuthSecurityScheme && typeof scheme.httpAuthSecurityScheme === "object") {
    const inner = scheme.httpAuthSecurityScheme as Record<string, unknown>;
    return { type: "http", scheme: inner.scheme, bearerFormat: inner.bearerFormat, description: inner.description };
  }
  if (scheme.oauth2SecurityScheme && typeof scheme.oauth2SecurityScheme === "object") {
    const inner = scheme.oauth2SecurityScheme as Record<string, unknown>;
    return { type: "oauth2", flows: inner.flows, oauth2MetadataUrl: inner.oauth2MetadataUrl, description: inner.description };
  }
  if (scheme.apiKeySecurityScheme && typeof scheme.apiKeySecurityScheme === "object") {
    const inner = scheme.apiKeySecurityScheme as Record<string, unknown>;
    // v1.0 uses `location` instead of v0.3's `in`
    return { type: "apiKey", name: inner.name, in: inner.location, description: inner.description };
  }
  if (scheme.openIdConnectSecurityScheme && typeof scheme.openIdConnectSecurityScheme === "object") {
    const inner = scheme.openIdConnectSecurityScheme as Record<string, unknown>;
    return { type: "openIdConnect", openIdConnectUrl: inner.openIdConnectUrl, description: inner.description };
  }
  if (scheme.mtlsSecurityScheme && typeof scheme.mtlsSecurityScheme === "object") {
    const inner = scheme.mtlsSecurityScheme as Record<string, unknown>;
    return { type: "mutualTLS", description: inner.description };
  }

  // Unknown shape — return as-is
  return scheme;
}

/**
 * Convert a v1.0 SecurityRequirement to v0.3 format.
 * v1.0: { schemes: { "basic": { list: ["scope1"] } } }
 * v0.3: { "basic": ["scope1"] }
 */
function normalizeSecurityRequirement(req: Record<string, unknown>): Record<string, string[]> {
  if (req.schemes && typeof req.schemes === "object") {
    const result: Record<string, string[]> = {};
    for (const [name, value] of Object.entries(req.schemes as Record<string, unknown>)) {
      if (value && typeof value === "object" && "list" in (value as Record<string, unknown>)) {
        result[name] = (value as { list?: string[] }).list ?? [];
      } else {
        result[name] = [];
      }
    }
    return result;
  }
  // Already v0.3 format or unknown — return as-is
  return req as Record<string, string[]>;
}

// ===================================================================
// Inbound: Task State & Role
// ===================================================================

/** Map v1.0 SCREAMING_SNAKE_CASE states to internal lowercase states. */
const V1_STATE_MAP: Record<string, TaskState> = {
  TASK_STATE_COMPLETED: "completed",
  TASK_STATE_FAILED: "failed",
  TASK_STATE_SUBMITTED: "submitted",
  TASK_STATE_WORKING: "working",
  TASK_STATE_INPUT_REQUIRED: "input-required",
  TASK_STATE_CANCELED: "canceled",
  TASK_STATE_REJECTED: "rejected",
  TASK_STATE_AUTH_REQUIRED: "auth-required",
  TASK_STATE_UNSPECIFIED: "submitted", // safe default
};

/** Normalize a wire task state to internal format. Passes through already-lowercase states. */
export function normalizeTaskState(state: string): TaskState {
  return V1_STATE_MAP[state] ?? (state as TaskState);
}

/** Normalize a wire role to internal format. */
export function normalizeRole(role: string): "user" | "agent" {
  if (role === "ROLE_USER") return "user";
  if (role === "ROLE_AGENT") return "agent";
  return role as "user" | "agent";
}

// ===================================================================
// Inbound: Parts
// ===================================================================

/** Normalize a wire part to internal format. Handles both v1.0 and v0.3 shapes. */
export function normalizePart(part: unknown): Part {
  if (!part || typeof part !== "object") return part as Part;

  const p = part as Record<string, unknown>;

  // v1.0 raw part: has top-level `raw` (base64 bytes) with optional mediaType/filename
  if (typeof p.raw === "string" && !("file" in p) && !("text" in p)) {
    return {
      file: {
        uri: "", // no URI for inline bytes
        bytes: p.raw as string,
        ...(p.mediaType ? { mimeType: p.mediaType as string } : {}),
        ...(p.filename ? { name: p.filename as string } : {}),
      },
      ...(p.metadata ? { metadata: p.metadata as Record<string, unknown> } : {}),
    } as Part;
  }

  // v1.0 file part: has top-level `url` (and optionally `mediaType`, `filename`)
  if (typeof p.url === "string" && !("file" in p) && !("text" in p) && !("data" in p)) {
    return {
      file: {
        uri: p.url as string,
        ...(p.mediaType ? { mimeType: p.mediaType as string } : {}),
        ...(p.filename ? { name: p.filename as string } : {}),
      },
      ...(p.metadata ? { metadata: p.metadata as Record<string, unknown> } : {}),
    } as Part;
  }

  // v1.0 data part: has top-level `data` without kind discriminator
  if ("data" in p && typeof p.data === "object" && !("kind" in p) && !("text" in p) && !("file" in p)) {
    return {
      data: p.data as Record<string, unknown>,
      ...(p.metadata ? { metadata: p.metadata as Record<string, unknown> } : {}),
    } as Part;
  }

  // v0.3 file part: map mediaType → mimeType within file object
  if (p.file && typeof p.file === "object") {
    const file = p.file as Record<string, unknown>;
    if (file.mediaType && !file.mimeType) {
      file.mimeType = file.mediaType;
    }
  }

  return p as unknown as Part;
}

// ===================================================================
// Inbound: Full Response
// ===================================================================

/**
 * Normalize a JSON-RPC task/message response in-place.
 * Converts wire states, roles, and parts to internal format.
 * Handles v1.0 SendMessageResponse oneof { task, message } wrapper keys.
 * Safe to call on v0.3 responses (no-op for already-internal values).
 */
export function normalizeTaskResponse(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const response = data as Record<string, unknown>;
  if (!response.result || typeof response.result !== "object") return data;

  let result = response.result as Record<string, unknown>;

  // v1.0 oneof payload: unwrap { task: {...} } or { message: {...} } wrapper keys
  if ("task" in result && typeof result.task === "object" && !("status" in result) && !("id" in result)) {
    result = result.task as Record<string, unknown>;
    response.result = result;
  } else if ("message" in result && typeof result.message === "object" && !("status" in result) && !("role" in result)) {
    // v1.0 Message response — normalize the message and wrap as a minimal task
    const msg = result.message as Record<string, unknown>;
    normalizeMessageInPlace(msg);
    // Wrap message as a task-like shape for processJsonRpcResponse compatibility
    response.result = {
      id: (msg.taskId ?? msg.messageId ?? "") as string,
      contextId: (msg.contextId ?? "") as string,
      status: { state: "completed", message: msg },
    };
    result = response.result as Record<string, unknown>;
  }

  // Normalize status
  if (result.status && typeof result.status === "object") {
    const status = result.status as Record<string, unknown>;
    if (typeof status.state === "string") {
      status.state = normalizeTaskState(status.state);
    }

    // Normalize status.message
    if (status.message && typeof status.message === "object") {
      normalizeMessageInPlace(status.message as Record<string, unknown>);
    }
  }

  // Normalize artifacts
  if (Array.isArray(result.artifacts)) {
    for (const artifact of result.artifacts) {
      if (artifact && typeof artifact === "object" && Array.isArray(artifact.parts)) {
        artifact.parts = artifact.parts.map(normalizePart);
      }
    }
  }

  // Normalize history
  if (Array.isArray(result.history)) {
    for (const msg of result.history) {
      if (msg && typeof msg === "object") {
        normalizeMessageInPlace(msg as Record<string, unknown>);
      }
    }
  }

  return data;
}

function normalizeMessageInPlace(msg: Record<string, unknown>): void {
  if (typeof msg.role === "string") {
    msg.role = normalizeRole(msg.role);
  }
  if (Array.isArray(msg.parts)) {
    msg.parts = msg.parts.map(normalizePart);
  }
}

// ===================================================================
// Inbound: Stream Events
// ===================================================================

export type NormalizedStreamEvent =
  | {
      kind: "status-update";
      taskId: string;
      contextId: string;
      status: { state: TaskState; message?: { role: string; parts: Part[] } };
    }
  | { kind: "artifact-update"; taskId: string; contextId: string; artifact: Artifact }
  | { kind: "task"; task: Record<string, unknown> }
  | { kind: "error"; error: { code: number; message: string } };

/** Map v1.0 SCREAMING_SNAKE_CASE event kinds to internal kebab-case. */
const V1_EVENT_KIND_MAP: Record<string, string> = {
  STATUS_UPDATE: "status-update",
  ARTIFACT_UPDATE: "artifact-update",
  TASK: "task",
};

/**
 * Normalize an SSE stream event payload to internal format.
 * Handles both the spec-compliant JSON-RPC response format
 * ({ jsonrpc, id, result: { statusUpdate|artifactUpdate|... } })
 * and the older notification/flat format for backwards compat.
 */
export function normalizeStreamEvent(event: unknown): NormalizedStreamEvent | null {
  if (!event || typeof event !== "object") return null;

  const e = event as Record<string, unknown>;

  // Handle JSON-RPC error events
  if (e.error && typeof e.error === "object") {
    const err = e.error as Record<string, unknown>;
    return {
      kind: "error",
      error: {
        code: (err.code as number) ?? -1,
        message: (err.message as string) ?? "Unknown error",
      },
    };
  }

  // Unwrap JSON-RPC response: { jsonrpc, id, result: { ... } }
  // Falls back to `params` (old notification format) or the event itself
  let inner = (e.result ?? e.params ?? e) as Record<string, unknown>;

  // v1.0 oneof payload: unwrap wrapper keys from proto3 JSON mapping
  // StreamResponse { oneof payload { task, message, status_update, artifact_update } }
  // Proto3 JSON keys: "statusUpdate", "artifactUpdate" (camelCase)
  // Some implementations may also use "taskStatusUpdate", "taskArtifactUpdate" (docs convention)
  const statusUpdatePayload = inner.statusUpdate ?? inner.taskStatusUpdate;
  const artifactUpdatePayload = inner.artifactUpdate ?? inner.taskArtifactUpdate;

  if (statusUpdatePayload && typeof statusUpdatePayload === "object") {
    const statusUpdateEvent = statusUpdatePayload as Record<string, unknown>;
    inner = {
      kind: "status-update",
      taskId: statusUpdateEvent.taskId ?? inner.taskId,
      contextId: statusUpdateEvent.contextId ?? inner.contextId,
      status: statusUpdateEvent.status ?? statusUpdateEvent,
    };
  } else if (artifactUpdatePayload && typeof artifactUpdatePayload === "object") {
    const artifactUpdateEvent = artifactUpdatePayload as Record<string, unknown>;
    inner = {
      kind: "artifact-update",
      taskId: artifactUpdateEvent.taskId ?? inner.taskId,
      contextId: artifactUpdateEvent.contextId ?? inner.contextId,
      artifact: artifactUpdateEvent.artifact ?? artifactUpdateEvent,
      append: artifactUpdateEvent.append,
      lastChunk: artifactUpdateEvent.lastChunk ?? artifactUpdateEvent.last_chunk,
    };
  } else if ("message" in inner && typeof inner.message === "object" && !("kind" in inner)) {
    // v1.0 Message payload in stream — treat as a status-update with message parts
    const msg = inner.message as Record<string, unknown>;
    inner = {
      kind: "status-update",
      taskId: inner.taskId ?? (msg.taskId as string) ?? "",
      contextId: inner.contextId ?? (msg.contextId as string) ?? "",
      status: {
        state: "completed",
        message: msg,
      },
    };
  } else if ("task" in inner && typeof inner.task === "object" && !("kind" in inner)) {
    inner = { ...inner, kind: "task" };
  }

  // Determine the event kind
  let kind = (inner.kind ?? inner.type ?? "") as string;
  kind = V1_EVENT_KIND_MAP[kind] ?? kind;

  // If no explicit kind, infer from which fields are present
  if (!kind) {
    if (inner.status && typeof inner.status === "object") kind = "status-update";
    else if (inner.artifact && typeof inner.artifact === "object") kind = "artifact-update";
    else if (inner.task && typeof inner.task === "object") kind = "task";
  }

  const taskId = (inner.taskId ?? inner.id ?? "") as string;
  const contextId = (inner.contextId ?? "") as string;

  if (kind === "status-update") {
    const rawStatus = (inner.status ?? {}) as Record<string, unknown>;
    const state = typeof rawStatus.state === "string" ? normalizeTaskState(rawStatus.state) : "working";

    let message: { role: string; parts: Part[] } | undefined;
    if (rawStatus.message && typeof rawStatus.message === "object") {
      const msg = rawStatus.message as Record<string, unknown>;
      message = {
        role: typeof msg.role === "string" ? normalizeRole(msg.role) : "agent",
        parts: Array.isArray(msg.parts) ? msg.parts.map(normalizePart) : [],
      };
    }

    return { kind: "status-update", taskId, contextId, status: { state, message } };
  }

  if (kind === "artifact-update") {
    const rawArtifact = (inner.artifact ?? {}) as Record<string, unknown>;
    const artifact: Artifact = {
      artifactId: (rawArtifact.artifactId ?? rawArtifact.id ?? "") as string,
      name: rawArtifact.name as string | undefined,
      parts: Array.isArray(rawArtifact.parts) ? rawArtifact.parts.map(normalizePart) : [],
      // v1.0: append/lastChunk are at the event level (inner), not inside the artifact
      append: (inner.append ?? rawArtifact.append) as boolean | undefined,
      lastChunk: (inner.lastChunk ?? inner.last_chunk ?? rawArtifact.lastChunk) as boolean | undefined,
    };
    return { kind: "artifact-update", taskId, contextId, artifact };
  }

  if (kind === "task") {
    // The full task object — normalize it as a task response result
    const result = inner.task ?? inner;
    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      if (r.status && typeof r.status === "object") {
        const status = r.status as Record<string, unknown>;
        if (typeof status.state === "string") {
          status.state = normalizeTaskState(status.state);
        }
        if (status.message && typeof status.message === "object") {
          normalizeMessageInPlace(status.message as Record<string, unknown>);
        }
      }
      if (Array.isArray(r.artifacts)) {
        for (const artifact of r.artifacts) {
          if (artifact && typeof artifact === "object" && Array.isArray(artifact.parts)) {
            artifact.parts = artifact.parts.map(normalizePart);
          }
        }
      }
    }
    return { kind: "task", task: (result ?? inner) as Record<string, unknown> };
  }

  // Unknown event kind — skip
  return null;
}

// ===================================================================
// Outbound: Method Names
// ===================================================================

/** Get the correct JSON-RPC method name for the agent's protocol version. */
export function getJsonRpcMethod(version: string): string {
  return isV1(version) ? "SendMessage" : "message/send";
}

/** Get the correct streaming JSON-RPC method name for the agent's protocol version. */
export function getStreamingJsonRpcMethod(version: string): string {
  return isV1(version) ? "SendStreamingMessage" : "message/stream";
}

// ===================================================================
// Outbound: Message Building
// ===================================================================

/** Get the correct outbound role string for the agent's protocol version. */
export function buildOutboundRole(version: string): string {
  return isV1(version) ? "ROLE_USER" : "user";
}

/**
 * Convert outbound parts to the format expected by the agent's protocol version.
 * v0.3: parts as-is (TextPart, FilePart with {file:{uri,mimeType,name}}, DataPart)
 * v1.0: unified Part with oneof content {text, url, raw, data} + shared mediaType/filename/metadata
 */
export function buildOutboundParts(parts: Part[], version: string): unknown[] {
  if (!isV1(version)) return parts;

  return parts.map((part) => {
    if ("text" in part && typeof part.text === "string") {
      const out: Record<string, unknown> = { text: part.text };
      if (part.metadata) out.metadata = part.metadata;
      return out;
    }

    if ("file" in part) {
      const file = typeof part.file === "string" ? { uri: part.file } : part.file;
      // Inline bytes → v1.0 raw part
      if (file.bytes) {
        const out: Record<string, unknown> = { raw: file.bytes };
        if (file.mimeType || file.mediaType) out.mediaType = file.mimeType || file.mediaType;
        if (file.name) out.filename = file.name;
        if (part.metadata) out.metadata = part.metadata;
        return out;
      }
      // URI-based → v1.0 url part
      const out: Record<string, unknown> = {};
      if (file.uri) out.url = file.uri;
      if (file.mimeType || file.mediaType) out.mediaType = file.mimeType || file.mediaType;
      if (file.name) out.filename = file.name;
      if (part.metadata) out.metadata = part.metadata;
      return out;
    }

    if ("data" in part && typeof part.data === "object") {
      const out: Record<string, unknown> = { data: part.data };
      if (part.metadata) out.metadata = part.metadata;
      return out;
    }

    return part;
  });
}

/** Build a complete outbound message object for the given protocol version. */
export function buildOutboundMessage(
  parts: Part[],
  version: string,
  messageId: string,
  contextId?: string | null,
): Record<string, unknown> {
  const message: Record<string, unknown> = {
    role: buildOutboundRole(version),
    parts: buildOutboundParts(parts, version),
    messageId,
  };
  if (contextId) {
    message.contextId = contextId;
  }
  return message;
}

/** Build protocol-specific headers for outbound requests. */
export function buildOutboundHeaders(version: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isV1(version)) {
    headers["A2A-Version"] = "1.0";
  }
  return headers;
}

/** Build the configuration block for SendMessageRequest (v1.0+). */
export function buildOutboundConfiguration(
  version: string,
  outputModes: string[] = ["text/plain", "application/json"],
): Record<string, unknown> | undefined {
  if (!isV1(version)) return undefined;
  return { acceptedOutputModes: outputModes };
}

// ===================================================================
// Constants
// ===================================================================

/** All valid task state strings across both protocol versions (for compliance checking). */
export const ALL_VALID_STATES = new Set([
  // Internal (human-readable)
  "submitted",
  "working",
  "input-required",
  "auth-required",
  "completed",
  "canceled",
  "failed",
  "rejected",
  "unknown",
  // v1.0 wire format
  "TASK_STATE_SUBMITTED",
  "TASK_STATE_WORKING",
  "TASK_STATE_INPUT_REQUIRED",
  "TASK_STATE_COMPLETED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_FAILED",
  "TASK_STATE_REJECTED",
  "TASK_STATE_AUTH_REQUIRED",
  "TASK_STATE_UNSPECIFIED",
]);
