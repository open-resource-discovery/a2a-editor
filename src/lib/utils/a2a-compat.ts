/**
 * A2A Protocol v0.3.0 ↔ v1.0.0 compatibility layer.
 *
 * Strategy: normalize all inbound v1.0.0 data to v0.3.0 format at the boundary,
 * and convert outbound messages to v1.0.0 format when talking to v1.0.0 agents.
 * Internal types (ChatMessage.role, TaskState, Part) stay v0.3.0.
 */
import type { AgentCard, TaskState, Part, Artifact } from "@lib/types/a2a";

// ---------------------------------------------------------------------------
// Version detection
// ---------------------------------------------------------------------------

/** Detect protocol version from an agent card shape. */
export function detectProtocolVersion(card: unknown): "0.3.0" | "1.0.0" {
  if (card && typeof card === "object" && "supportedInterfaces" in card) {
    return "1.0.0";
  }
  return "0.3.0";
}

// ---------------------------------------------------------------------------
// Agent card normalization (inbound)
// ---------------------------------------------------------------------------

/**
 * Normalize an agent card to a shape the rest of the app can consume.
 * For v1.0.0 cards: copies the URL from supportedInterfaces[0].url into the
 * top-level `url` field and populates `protocolVersions`.
 */
export function normalizeAgentCard(raw: unknown): AgentCard {
  if (!raw || typeof raw !== "object") return raw as AgentCard;

  // Work on a shallow copy to avoid mutating the original
  const card = { ...(raw as Record<string, unknown>) };

  // v1.0.0 detection: has supportedInterfaces, may lack top-level url
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
      card.protocolVersions = (
        card.supportedInterfaces as Array<{ protocolVersion?: string }>
      )
        .map((i) => i.protocolVersion)
        .filter(Boolean);
    }
  }

  return card as unknown as AgentCard;
}

// ---------------------------------------------------------------------------
// Task state normalization (inbound)
// ---------------------------------------------------------------------------

const V1_STATE_MAP: Record<string, TaskState> = {
  TASK_STATE_COMPLETED: "completed",
  TASK_STATE_FAILED: "failed",
  TASK_STATE_SUBMITTED: "submitted",
  TASK_STATE_WORKING: "working",
  TASK_STATE_INPUT_REQUIRED: "input-required",
  TASK_STATE_CANCELED: "canceled",
  TASK_STATE_REJECTED: "rejected",
  TASK_STATE_AUTH_REQUIRED: "input-required", // closest v0.3.0 equivalent
  TASK_STATE_UNSPECIFIED: "submitted", // safe default
};

/** Normalize a v1.0.0 task state to v0.3.0 format. Passes through lowercase states. */
export function normalizeTaskState(state: string): TaskState {
  return V1_STATE_MAP[state] ?? (state as TaskState);
}

// ---------------------------------------------------------------------------
// Role normalization (inbound)
// ---------------------------------------------------------------------------

/** Normalize v1.0.0 role to v0.3.0 format. */
export function normalizeRole(role: string): "user" | "agent" {
  if (role === "ROLE_USER") return "user";
  if (role === "ROLE_AGENT") return "agent";
  return role as "user" | "agent";
}

// ---------------------------------------------------------------------------
// Part normalization (inbound)
// ---------------------------------------------------------------------------

/** Normalize a part: convert v1.0.0-rc top-level url/mediaType/filename to v0.3.0 file part. */
export function normalizePart(part: unknown): Part {
  if (!part || typeof part !== "object") return part as Part;

  const p = part as Record<string, unknown>;

  // v1.0.0-rc file part: has top-level `url` (and optionally `mediaType`, `filename`)
  // Convert to v0.3.0 format: { file: { uri, mimeType, name } }
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

  // v0.3.0 file part: map mediaType → mimeType within file object
  if (p.file && typeof p.file === "object") {
    const file = p.file as Record<string, unknown>;
    if (file.mediaType && !file.mimeType) {
      file.mimeType = file.mediaType;
    }
  }

  return p as unknown as Part;
}

// ---------------------------------------------------------------------------
// Full task response normalization (inbound)
// ---------------------------------------------------------------------------

/**
 * Normalize a JSON-RPC task response in-place.
 * Converts v1.0.0 states, roles, and parts to v0.3.0 format.
 * Safe to call on v0.3.0 responses (no-op for already-lowercase values).
 */
export function normalizeTaskResponse(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  const response = data as Record<string, unknown>;
  if (!response.result || typeof response.result !== "object") return data;

  const result = response.result as Record<string, unknown>;

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

// ---------------------------------------------------------------------------
// Outbound conversion (v0.3.0 → v1.0.0)
// ---------------------------------------------------------------------------

/** Get the correct JSON-RPC method name for the agent's protocol version. */
export function getJsonRpcMethod(version: string): string {
  return version === "1.0.0" ? "SendMessage" : "message/send";
}

/** Get the correct streaming JSON-RPC method name (always message/stream per spec). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getStreamingJsonRpcMethod(version: string): string {
  return "message/stream";
}

/** Get the correct outbound role string for the agent's protocol version. */
export function buildOutboundRole(version: string): string {
  return version === "1.0.0" ? "ROLE_USER" : "user";
}

// ---------------------------------------------------------------------------
// Streaming event normalization (inbound)
// ---------------------------------------------------------------------------

export type NormalizedStreamEvent =
  | { kind: "status-update"; taskId: string; contextId: string; status: { state: TaskState; message?: { role: string; parts: Part[] } } }
  | { kind: "artifact-update"; taskId: string; contextId: string; artifact: Artifact }
  | { kind: "task"; task: Record<string, unknown> }
  | { kind: "error"; error: { code: number; message: string } };

/** Map v1.0.0 SSE event kind to v0.3.0. */
const V1_EVENT_KIND_MAP: Record<string, string> = {
  "STATUS_UPDATE": "status-update",
  "ARTIFACT_UPDATE": "artifact-update",
  "TASK": "task",
};

/**
 * Normalize an SSE stream event payload to v0.3.0 format.
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
  const inner = (e.result ?? e.params ?? e) as Record<string, unknown>;

  // Determine the event kind from `kind` field (v0.3.0 includes it in the result)
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
      append: rawArtifact.append as boolean | undefined,
      lastChunk: rawArtifact.lastChunk as boolean | undefined,
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

// ---------------------------------------------------------------------------
// Valid states for compliance checking (both versions)
// ---------------------------------------------------------------------------

export const ALL_VALID_STATES = new Set([
  // v0.3.0
  "submitted", "working", "input-required", "completed", "canceled", "failed", "rejected", "unknown",
  // v1.0.0
  "TASK_STATE_SUBMITTED", "TASK_STATE_WORKING", "TASK_STATE_INPUT_REQUIRED",
  "TASK_STATE_COMPLETED", "TASK_STATE_CANCELED", "TASK_STATE_FAILED",
  "TASK_STATE_REJECTED", "TASK_STATE_AUTH_REQUIRED", "TASK_STATE_UNSPECIFIED",
]);
