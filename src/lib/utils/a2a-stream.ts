/**
 * A2A streaming orchestrator.
 *
 * Ties together fetch, SSE parsing, and event normalization to provide
 * a high-level streaming interface with typed callbacks.
 */
import type { Artifact, TaskState, Part } from "@lib/types/a2a";
import { parseSSEStream } from "./sse-parser";
import { normalizeStreamEvent, type NormalizedStreamEvent } from "./a2a-compat";

export interface StreamCallbacks {
  onStatusUpdate(taskId: string, contextId: string, status: { state: TaskState; message?: { role: string; parts: Part[] } }): void;
  onArtifactUpdate(taskId: string, contextId: string, artifact: Artifact): void;
  onTaskComplete(task: Record<string, unknown>): void;
  onError(error: Error): void;
}

export interface StreamResult {
  rawResponseBody: string;
  responseHeaders: Record<string, string>;
  status: number;
  statusText: string;
}

/**
 * Send a streaming message to an A2A agent and process SSE events.
 *
 * @throws {Error} If the initial fetch fails (before any SSE data).
 *   The caller should catch this and fall back to non-streaming.
 */
export async function streamMessage(
  url: string,
  body: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  callbacks: StreamCallbacks,
): Promise<StreamResult> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal,
  });

  const responseHeaders = Object.fromEntries(res.headers.entries());

  if (!res.ok) {
    // Try to extract error details from response body
    let errorDetail = `${res.status} ${res.statusText}`.trim();
    try {
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (parsed.error?.message) {
        errorDetail = parsed.error.message;
      }
    } catch {
      // Use status text if body isn't parseable
    }
    throw new Error(errorDetail);
  }

  if (!res.body) {
    throw new Error("Response body is null — streaming not supported");
  }

  let rawResponseBody = "";
  let receivedFirstEvent = false;

  try {
    for await (const sseEvent of parseSSEStream(res.body)) {
      receivedFirstEvent = true;

      // Accumulate raw SSE text for HTTP logging
      if (sseEvent.event) {
        rawResponseBody += `event: ${sseEvent.event}\n`;
      }
      rawResponseBody += `data: ${sseEvent.data}\n\n`;

      // Parse JSON payload
      let payload: unknown;
      try {
        // Skip [DONE] sentinel (non-spec, but some servers send it)
        if (sseEvent.data.trim() === "[DONE]") continue;
        payload = JSON.parse(sseEvent.data);
      } catch {
        // Skip malformed JSON events
        continue;
      }

      // Normalize and dispatch
      const normalized = normalizeStreamEvent(payload);
      if (!normalized) continue;

      dispatchEvent(normalized, callbacks);
    }
  } catch (err) {
    // If we never received any events, re-throw for fallback handling
    if (!receivedFirstEvent) {
      throw err;
    }
    // If we already received events, report as an error event
    callbacks.onError(err instanceof Error ? err : new Error("Stream interrupted"));
  }

  return {
    rawResponseBody,
    responseHeaders,
    status: res.status,
    statusText: res.statusText,
  };
}

function dispatchEvent(event: NormalizedStreamEvent, callbacks: StreamCallbacks): void {
  switch (event.kind) {
    case "status-update":
      callbacks.onStatusUpdate(event.taskId, event.contextId, event.status);
      break;
    case "artifact-update":
      callbacks.onArtifactUpdate(event.taskId, event.contextId, event.artifact);
      break;
    case "task":
      callbacks.onTaskComplete(event.task);
      break;
    case "error":
      callbacks.onError(new Error(event.error.message));
      break;
  }
}
