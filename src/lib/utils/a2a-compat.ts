/**
 * A2A Protocol v0.3.0 ↔ v1.0.0 compatibility layer.
 *
 * Strategy: normalize all inbound v1.0.0 data to v0.3.0 format at the boundary,
 * and convert outbound messages to v1.0.0 format when talking to v1.0.0 agents.
 * Internal types (ChatMessage.role, TaskState, Part) stay v0.3.0.
 */
import type { AgentCard, TaskState, Part } from "@lib/types/a2a";

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

/** Normalize a part: map mediaType → mimeType on file parts. */
export function normalizePart(part: unknown): Part {
  if (!part || typeof part !== "object") return part as Part;

  const p = part as Record<string, unknown>;

  // File part: map mediaType → mimeType
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

/** Get the correct outbound role string for the agent's protocol version. */
export function buildOutboundRole(version: string): string {
  return version === "1.0.0" ? "ROLE_USER" : "user";
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
