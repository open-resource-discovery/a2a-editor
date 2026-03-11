import { create } from "zustand";
import type { ChatMessage } from "@lib/types/chat";
import type { Part, TaskState, Artifact } from "@lib/types/a2a";
import type { HttpLogEntry } from "@lib/types/httpLog";
import { v4 as uuidv4 } from "uuid";
import { isMockUrl, handleMockMessage } from "@lib/mock/agents";
import { useHttpLogStore } from "./httpLogStore";
import { useConnectionStore } from "./connectionStore";
import { useAgentCardStore } from "./agentCardStore";
import {
  normalizeTaskResponse,
  getJsonRpcMethod,
  getStreamingJsonRpcMethod,
  buildOutboundRole,
} from "@lib/utils/a2a-compat";
import { validateResponse, isFullyCompliant } from "@lib/utils/a2a-compliance";
import { streamMessage } from "@lib/utils/a2a-stream";

const MAX_MESSAGES = 200;

// Module-level abort controller for streaming (not in zustand state to avoid serialization issues)
let activeAbortController: AbortController | null = null;

/** Append a message, capping the array */
function appendMessage(messages: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const updated = [...messages, msg];
  return updated.length > MAX_MESSAGES ? updated.slice(-MAX_MESSAGES) : updated;
}

/** Extract agent response from a JSON-RPC response, or throw on JSON-RPC errors */
function processJsonRpcResponse(data: unknown): {
  parts: Part[];
  taskId: string;
  contextId: string;
  status?: TaskState;
  artifacts?: Artifact[];
} | null {
  const response = data as {
    result?: {
      id: string;
      contextId: string;
      status?: { state: TaskState; message?: { parts: Part[] } };
      artifacts?: Artifact[];
    };
    error?: { code: number; message: string; data?: unknown };
  };

  // Handle JSON-RPC error responses
  if (response.error) {
    throw new Error(response.error.message || `JSON-RPC error (code: ${response.error.code})`);
  }

  if (!response.result) return null;

  const task = response.result;
  let responseParts: Part[] = [];

  if (task.artifacts?.length) {
    responseParts = task.artifacts.flatMap((a) => a.parts);
  } else if (task.status?.message?.parts) {
    responseParts = task.status.message.parts;
  }

  if (responseParts.length === 0) return null;

  return {
    parts: responseParts,
    taskId: task.id,
    contextId: task.contextId,
    status: task.status?.state,
    artifacts: task.artifacts,
  };
}

/** Execute a fetch with HTTP logging */
async function fetchWithLogging(
  url: string,
  requestHeaders: Record<string, string>,
  requestBody: string,
  chatMessageId: string,
  derivedFromLogId?: string,
): Promise<unknown> {
  const logId = uuidv4();
  const startTime = Date.now();
  const logEntry: HttpLogEntry = {
    id: logId,
    chatMessageId,
    timestamp: new Date(),
    request: {
      method: "POST",
      url,
      headers: requestHeaders,
      body: requestBody,
    },
    response: null,
    derivedFromLogId,
  };

  // Add immediately so the UI shows a loading spinner
  useHttpLogStore.getState().addLog(logEntry);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
    });

    const responseBody = await res.text();
    useHttpLogStore.getState().updateLog(logId, {
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: responseBody,
      },
      durationMs: Date.now() - startTime,
    });

    if (!res.ok) {
      let errorDetail = `${res.status} ${res.statusText}`.trim();
      try {
        const parsed = JSON.parse(responseBody);
        if (parsed.error?.message) {
          errorDetail = parsed.error.message;
        }
      } catch {
        // If response body is not JSON, use status text
      }
      throw new Error(errorDetail);
    }
    return JSON.parse(responseBody);
  } catch (fetchErr) {
    // Update existing entry with error if response wasn't received
    const currentLog = useHttpLogStore.getState().logs.find((l) => l.id === logId);
    if (!currentLog?.response) {
      useHttpLogStore.getState().updateLog(logId, {
        error: fetchErr instanceof Error ? fetchErr.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    }
    throw fetchErr;
  }
}

/** Merge an artifact update into an existing artifacts array (handles append flag). */
function mergeArtifact(existing: Artifact[], incoming: Artifact): Artifact[] {
  const idx = existing.findIndex((a) => a.artifactId === incoming.artifactId);
  if (idx === -1) {
    return [...existing, incoming];
  }
  const current = existing[idx];
  const merged = incoming.append
    ? { ...current, parts: [...current.parts, ...incoming.parts], lastChunk: incoming.lastChunk }
    : { ...current, ...incoming };
  return existing.map((a, i) => (i === idx ? merged : a));
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentTaskId: string | null;
  contextId: string | null;
  inputText: string;

  setInputText: (text: string) => void;
  sendMessage: (parts: Part[], agentUrl: string, authHeaders: Record<string, string>) => Promise<void>;
  sendRawRequest: (
    body: string,
    agentUrl: string,
    customHeaders: Record<string, string>,
    derivedFromLogId?: string,
  ) => Promise<void>;
  cancelStream: () => void;
  clearChat: () => void;
  retryMessage: (messageId: string, agentUrl: string, authHeaders: Record<string, string>) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => {
  /** Update a message in the messages array by id. */
  function updateMessage(id: string, updater: (msg: ChatMessage) => ChatMessage) {
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? updater(m) : m)),
    }));
  }

  /** Non-streaming send path (existing behavior). */
  async function sendNonStreaming(
    parts: Part[],
    agentUrl: string,
    authHeaders: Record<string, string>,
    messageId: string,
  ) {
    let data: unknown;

    // Handle mock agents client-side
    if (isMockUrl(agentUrl)) {
      const state = get();
      data = handleMockMessage(agentUrl, {
        parts,
        messageId,
        contextId: state.contextId,
      });

      // Create a synthetic HTTP log entry for mock agents
      const mockRpcRequest = {
        jsonrpc: "2.0",
        id: uuidv4(),
        method: "message/send",
        params: {
          message: { role: "user", parts, messageId, contextId: state.contextId },
        },
      };
      const syntheticLog: HttpLogEntry = {
        id: uuidv4(),
        chatMessageId: messageId,
        timestamp: new Date(),
        request: {
          method: "POST",
          url: agentUrl,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mockRpcRequest),
        },
        response: {
          status: 200,
          statusText: "OK (Mock)",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(data, null, 2),
        },
        durationMs: 0,
      };
      useHttpLogStore.getState().addLog(syntheticLog);
    } else {
      const version = useConnectionStore.getState().protocolVersion;
      const rpcRequest = {
        jsonrpc: "2.0",
        id: uuidv4(),
        method: getJsonRpcMethod(version),
        params: {
          message: {
            role: buildOutboundRole(version),
            parts,
            messageId,
            contextId: get().contextId,
          },
        },
      };

      const requestHeaders = {
        "Content-Type": "application/json",
        ...authHeaders,
      };

      data = await fetchWithLogging(agentUrl, requestHeaders, JSON.stringify(rpcRequest), messageId);
    }

    // Normalize v1.0.0 responses to v0.3.0 format before processing
    data = normalizeTaskResponse(data);

    const result = processJsonRpcResponse(data);
    if (result) {
      const complianceDetails = validateResponse(data);
      const agentMessage: ChatMessage = {
        id: uuidv4(),
        role: "agent",
        parts: result.parts,
        taskId: result.taskId,
        contextId: result.contextId,
        timestamp: new Date(),
        status: result.status,
        artifacts: result.artifacts,
        compliant: isFullyCompliant(complianceDetails),
        complianceDetails,
        linkedChatMessageId: messageId,
      };

      set((s) => ({
        messages: appendMessage(s.messages, agentMessage),
        currentTaskId: result.taskId,
        contextId: result.contextId,
      }));
    }
  }

  /** Streaming send path using SSE. */
  async function sendStreaming(
    parts: Part[],
    agentUrl: string,
    authHeaders: Record<string, string>,
    messageId: string,
    derivedFromLogId?: string,
  ) {
    const version = useConnectionStore.getState().protocolVersion;
    const abortController = new AbortController();
    activeAbortController = abortController;

    // Create placeholder agent message
    const agentMsgId = uuidv4();
    const placeholderMessage: ChatMessage = {
      id: agentMsgId,
      role: "agent",
      parts: [],
      timestamp: new Date(),
      status: "working",
      isStreaming: true,
      linkedChatMessageId: messageId,
    };

    set((s) => ({
      messages: appendMessage(s.messages, placeholderMessage),
    }));

    // Build JSON-RPC request
    const rpcRequest = {
      jsonrpc: "2.0",
      id: uuidv4(),
      method: getStreamingJsonRpcMethod(),
      params: {
        message: {
          role: buildOutboundRole(version),
          parts,
          messageId,
          contextId: get().contextId,
        },
      },
    };

    const requestHeaders = {
      "Content-Type": "application/json",
      ...authHeaders,
    };
    const requestBody = JSON.stringify(rpcRequest);

    // Create HTTP log entry immediately
    const logId = uuidv4();
    const startTime = Date.now();
    const logEntry: HttpLogEntry = {
      id: logId,
      chatMessageId: messageId,
      timestamp: new Date(),
      request: {
        method: "POST",
        url: agentUrl,
        headers: requestHeaders,
        body: requestBody,
      },
      response: null,
      isSSE: true,
      derivedFromLogId,
    };
    useHttpLogStore.getState().addLog(logEntry);

    let sseResponseMeta = { status: 200, statusText: "OK", headers: {} as Record<string, string> };

    try {
      const streamResult = await streamMessage(agentUrl, requestBody, requestHeaders, abortController.signal, {
        onStatusUpdate(taskId, contextId, status) {
          updateMessage(agentMsgId, (msg) => {
            const updated: ChatMessage = { ...msg, status: status.state, taskId, contextId };
            if (status.message?.parts?.length) {
              const isTerminal = status.state === "completed" || status.state === "failed";
              // Terminal status with parts = final full message; replace to avoid duplication
              // with parts already accumulated from artifact-update events
              updated.parts = isTerminal ? status.message.parts : [...msg.parts, ...status.message.parts];
            }
            return updated;
          });
          set({ currentTaskId: taskId, contextId });
        },

        onArtifactUpdate(taskId, contextId, artifact) {
          updateMessage(agentMsgId, (msg) => {
            const mergedArtifacts = mergeArtifact(msg.artifacts ?? [], artifact);
            return {
              ...msg,
              taskId,
              contextId,
              artifacts: mergedArtifacts,
              parts: mergedArtifacts.flatMap((a) => a.parts),
            };
          });
          set({ currentTaskId: taskId, contextId });
        },

        onTaskComplete(task) {
          // Wrap as a JSON-RPC response shape for processJsonRpcResponse / compliance
          const wrapped = { jsonrpc: "2.0" as const, result: task };
          const normalized = normalizeTaskResponse(wrapped);
          const result = processJsonRpcResponse(normalized);
          const complianceDetails = validateResponse(normalized);

          updateMessage(agentMsgId, (msg) => ({
            ...msg,
            parts: result?.parts ?? msg.parts,
            taskId: result?.taskId ?? msg.taskId,
            contextId: result?.contextId ?? msg.contextId,
            status: result?.status ?? msg.status,
            artifacts: result?.artifacts ?? msg.artifacts,
            isStreaming: false,
            compliant: isFullyCompliant(complianceDetails),
            complianceDetails,
          }));

          if (result) {
            set({ currentTaskId: result.taskId, contextId: result.contextId });
          }
        },

        onError(error) {
          updateMessage(agentMsgId, (msg) => ({
            ...msg,
            status: "failed" as TaskState,
            isStreaming: false,
            parts: [...msg.parts, { text: error.message }],
          }));
        },

        onResponseStart(status, statusText, headers) {
          sseResponseMeta = { status, statusText, headers };
        },

        onRawEvent(accumulatedBody) {
          useHttpLogStore.getState().updateLog(logId, {
            response: {
              ...sseResponseMeta,
              body: accumulatedBody,
            },
          });
        },
      });

      // Finalize the placeholder message if it's still streaming
      // (onTaskComplete may not have been called if the stream ended without a final "task" event)
      const finalMsg = get().messages.find((m) => m.id === agentMsgId);
      if (finalMsg?.isStreaming) {
        const finalStatus = finalMsg.status === "working" ? "completed" : finalMsg.status;

        // Build synthetic JSON-RPC response for compliance checking
        const syntheticResponse = {
          jsonrpc: "2.0" as const,
          result: {
            id: finalMsg.taskId ?? "",
            contextId: finalMsg.contextId ?? "",
            status: { state: finalStatus },
          },
        };
        const complianceDetails = validateResponse(syntheticResponse);

        updateMessage(agentMsgId, (msg) => ({
          ...msg,
          isStreaming: false,
          status: finalStatus,
          compliant: isFullyCompliant(complianceDetails),
          complianceDetails,
        }));
      }

      // Update HTTP log with accumulated response
      useHttpLogStore.getState().updateLog(logId, {
        response: {
          status: streamResult.status,
          statusText: streamResult.statusText,
          headers: streamResult.responseHeaders,
          body: streamResult.rawResponseBody,
        },
        durationMs: Date.now() - startTime,
      });
    } catch (err) {
      // Check if this was an abort
      if (abortController.signal.aborted) {
        updateMessage(agentMsgId, (msg) => ({
          ...msg,
          isStreaming: false,
          status: "canceled" as TaskState,
        }));
        useHttpLogStore.getState().updateLog(logId, {
          error: "Request canceled by user",
          durationMs: Date.now() - startTime,
        });
        return;
      }

      // If the initial fetch failed (before any SSE data), fall back to non-streaming
      const currentMsg = get().messages.find((m) => m.id === agentMsgId);
      if (currentMsg && currentMsg.parts.length === 0 && currentMsg.status === "working") {
        // Remove placeholder and fall back
        set((s) => ({
          messages: s.messages.filter((m) => m.id !== agentMsgId),
        }));
        // Remove the SSE log entry
        useHttpLogStore.getState().updateLog(logId, {
          error: `Streaming failed, falling back to non-streaming: ${err instanceof Error ? err.message : "Unknown error"}`,
          durationMs: Date.now() - startTime,
        });

        // Retry with non-streaming path
        await sendNonStreaming(parts, agentUrl, authHeaders, messageId);
        return;
      }

      // Stream was interrupted after receiving some data
      updateMessage(agentMsgId, (msg) => ({
        ...msg,
        isStreaming: false,
        status: "failed" as TaskState,
        parts: [...msg.parts, { text: `Stream interrupted: ${err instanceof Error ? err.message : "Unknown error"}` }],
      }));
      useHttpLogStore.getState().updateLog(logId, {
        error: err instanceof Error ? err.message : "Unknown error",
        durationMs: Date.now() - startTime,
      });
    } finally {
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  }

  return {
    messages: [],
    isStreaming: false,
    currentTaskId: null,
    contextId: null,
    inputText: "",

    setInputText: (text) => set({ inputText: text }),

    sendMessage: async (parts, agentUrl, authHeaders) => {
      if (get().isStreaming) return; // prevent concurrent sends

      const state = get();
      const messageId = uuidv4();

      const userMessage: ChatMessage = {
        id: messageId,
        role: "user",
        parts,
        timestamp: new Date(),
        contextId: state.contextId ?? undefined,
      };

      set((s) => ({
        messages: appendMessage(s.messages, userMessage),
        inputText: "",
        isStreaming: true,
      }));

      try {
        // Check if agent supports streaming (and it's not a mock agent)
        const parsedCard = useAgentCardStore.getState().parsedCard;
        const supportsStreaming = parsedCard?.capabilities?.streaming === true && !isMockUrl(agentUrl);

        if (supportsStreaming) {
          await sendStreaming(parts, agentUrl, authHeaders, messageId);
        } else {
          await sendNonStreaming(parts, agentUrl, authHeaders, messageId);
        }
      } catch (err) {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "agent",
          parts: [
            {
              text: err instanceof Error ? err.message : "Unknown error",
            },
          ],
          timestamp: new Date(),
          status: "failed",
          linkedChatMessageId: messageId,
        };

        set((s) => ({ messages: appendMessage(s.messages, errorMessage) }));
      } finally {
        set({ isStreaming: false });
      }
    },

    sendRawRequest: async (body, agentUrl, customHeaders, derivedFromLogId) => {
      // Parse the JSON-RPC body to extract message parts
      let parsed: {
        id?: string;
        params?: {
          message?: {
            parts?: Part[];
            contextId?: string;
          };
        };
      };

      try {
        parsed = JSON.parse(body);
      } catch {
        // Set error message in chat instead of throwing
        const errorMsg: ChatMessage = {
          id: uuidv4(),
          role: "agent",
          parts: [{ text: "Error: Invalid JSON body" }],
          timestamp: new Date(),
          status: "failed",
        };
        set((s) => ({ messages: appendMessage(s.messages, errorMsg) }));
        return;
      }

      const parts = parsed.params?.message?.parts;
      if (!parts || !Array.isArray(parts) || parts.length === 0) {
        const errorMsg: ChatMessage = {
          id: uuidv4(),
          role: "agent",
          parts: [{ text: "Error: Could not extract message parts from body" }],
          timestamp: new Date(),
          status: "failed",
        };
        set((s) => ({ messages: appendMessage(s.messages, errorMsg) }));
        return;
      }

      const messageId = uuidv4();

      // Create user message from extracted parts
      const userMessage: ChatMessage = {
        id: messageId,
        role: "user",
        parts,
        timestamp: new Date(),
        contextId: parsed.params?.message?.contextId,
      };

      set((s) => ({
        messages: appendMessage(s.messages, userMessage),
        inputText: "",
        isStreaming: true,
      }));

      try {
        // Check if agent supports streaming
        const parsedCard = useAgentCardStore.getState().parsedCard;
        const supportsStreaming = parsedCard?.capabilities?.streaming === true && !isMockUrl(agentUrl);

        if (supportsStreaming) {
          await sendStreaming(parts, agentUrl, { ...customHeaders }, messageId, derivedFromLogId);
        } else {
          // Reuse parsed body, update messageId
          if (parsed.params?.message) {
            (parsed.params.message as Record<string, unknown>).messageId = messageId;
            parsed.id = uuidv4() as string; // New request ID
          }
          const requestBody = JSON.stringify(parsed);

          let data: unknown = await fetchWithLogging(
            agentUrl,
            { ...customHeaders },
            requestBody,
            messageId,
            derivedFromLogId,
          );

          // Check compliance before normalization, then normalize
          data = normalizeTaskResponse(data);

          const result = processJsonRpcResponse(data);
          if (result) {
            const complianceDetails = validateResponse(data);
            const agentMessage: ChatMessage = {
              id: uuidv4(),
              role: "agent",
              parts: result.parts,
              taskId: result.taskId,
              contextId: result.contextId,
              timestamp: new Date(),
              status: result.status,
              artifacts: result.artifacts,
              compliant: isFullyCompliant(complianceDetails),
              complianceDetails,
              linkedChatMessageId: messageId,
            };

            set((s) => ({
              messages: appendMessage(s.messages, agentMessage),
              currentTaskId: result.taskId,
              contextId: result.contextId,
            }));
          }
        }
      } catch (err) {
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: "agent",
          parts: [
            {
              text: err instanceof Error ? err.message : "Unknown error",
            },
          ],
          timestamp: new Date(),
          status: "failed",
          linkedChatMessageId: messageId,
        };

        set((s) => ({ messages: appendMessage(s.messages, errorMessage) }));
      } finally {
        set({ isStreaming: false });
      }
    },

    cancelStream: () => {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
      // The abort handler in sendStreaming will update the message status
    },

    clearChat: () =>
      set({
        messages: [],
        currentTaskId: null,
        contextId: null,
        inputText: "",
        isStreaming: false,
      }),

    retryMessage: async (messageId, agentUrl, authHeaders) => {
      const state = get();
      const index = state.messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;

      const message = state.messages[index];
      if (message.role !== "user") return;

      // Remove this message and everything after it
      set({ messages: state.messages.slice(0, index) });

      // Resend the message
      await get().sendMessage(message.parts, agentUrl, authHeaders);
    },
  };
});
