import { create } from "zustand";
import type { ChatMessage } from "@lib/types/chat";
import type { Part, TaskState, Artifact } from "@lib/types/a2a";
import type { HttpLogEntry } from "@lib/types/httpLog";
import { v4 as uuidv4 } from "uuid";
import { isMockUrl, handleMockMessage } from "@lib/mock/agents";
import { useHttpLogStore } from "./httpLogStore";
import { useConnectionStore } from "./connectionStore";
import {
  normalizeTaskResponse,
  getJsonRpcMethod,
  buildOutboundRole,
  ALL_VALID_STATES,
} from "@lib/utils/a2a-compat";

const MAX_MESSAGES = 200;

/** Append a message, capping the array */
function appendMessage(
  messages: ChatMessage[],
  msg: ChatMessage,
): ChatMessage[] {
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
    throw new Error(
      response.error.message || `JSON-RPC error (code: ${response.error.code})`,
    );
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

/** Check if a raw JSON-RPC response is A2A protocol compliant */
function isA2ACompliant(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const response = data as Record<string, unknown>;

  // Must have jsonrpc "2.0"
  if (response.jsonrpc !== "2.0") return false;

  // Must have either result or error
  if (!response.result && !response.error) return false;

  // If error, must have code and message
  if (response.error) {
    const error = response.error as Record<string, unknown>;
    if (typeof error.code !== "number" || typeof error.message !== "string") return false;
    return true;
  }

  // If result, must have id and status
  if (response.result) {
    const result = response.result as Record<string, unknown>;
    if (typeof result.id !== "string") return false;
    if (!result.status || typeof result.status !== "object") return false;

    const status = result.status as Record<string, unknown>;
    if (!ALL_VALID_STATES.has(status.state as string)) return false;

    return true;
  }

  return false;
}

/** Execute a fetch with HTTP logging */
async function fetchWithLogging(
  url: string,
  requestHeaders: Record<string, string>,
  requestBody: string,
  chatMessageId: string,
  derivedFromLogId?: string,
): Promise<unknown> {
  const startTime = Date.now();
  const logEntry: HttpLogEntry = {
    id: uuidv4(),
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

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: requestHeaders,
      body: requestBody,
    });

    const responseBody = await res.text();
    logEntry.response = {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      body: responseBody,
    };
    logEntry.durationMs = Date.now() - startTime;
    useHttpLogStore.getState().addLog(logEntry);

    if (!res.ok) {
      // Try to extract a more meaningful error from the response body
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
    // Only log if not already logged (response was received but non-ok)
    if (!logEntry.response) {
      logEntry.error =
        fetchErr instanceof Error ? fetchErr.message : "Unknown error";
      logEntry.durationMs = Date.now() - startTime;
      useHttpLogStore.getState().addLog(logEntry);
    }
    throw fetchErr;
  }
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentTaskId: string | null;
  contextId: string | null;
  inputText: string;

  setInputText: (text: string) => void;
  sendMessage: (
    parts: Part[],
    agentUrl: string,
    authHeaders: Record<string, string>,
  ) => Promise<void>;
  sendRawRequest: (
    body: string,
    agentUrl: string,
    customHeaders: Record<string, string>,
    derivedFromLogId?: string,
  ) => Promise<void>;
  clearChat: () => void;
  retryMessage: (
    messageId: string,
    agentUrl: string,
    authHeaders: Record<string, string>,
  ) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  currentTaskId: null,
  contextId: null,
  inputText: "",

  setInputText: (text) => set({ inputText: text }),

  sendMessage: async (parts, agentUrl, authHeaders) => {
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
      let data: unknown;

      // Handle mock agents client-side
      if (isMockUrl(agentUrl)) {
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
              contextId: state.contextId,
            },
          },
        };

        const requestHeaders = {
          "Content-Type": "application/json",
          ...authHeaders,
        };

        data = await fetchWithLogging(
          agentUrl,
          requestHeaders,
          JSON.stringify(rpcRequest),
          messageId,
        );
      }

      // Normalize v1.0.0 responses to v0.3.0 format before processing
      const compliant = isA2ACompliant(data);
      data = normalizeTaskResponse(data);

      const result = processJsonRpcResponse(data);
      if (result) {
        const agentMessage: ChatMessage = {
          id: uuidv4(),
          role: "agent",
          parts: result.parts,
          taskId: result.taskId,
          contextId: result.contextId,
          timestamp: new Date(),
          status: result.status,
          artifacts: result.artifacts,
          compliant: compliant,
          linkedChatMessageId: messageId,
        };

        set((s) => ({
          messages: appendMessage(s.messages, agentMessage),
          currentTaskId: result.taskId,
          contextId: result.contextId,
        }));
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
      // Reuse parsed body, update messageId
      if (parsed.params?.message) {
        (parsed.params.message as Record<string, unknown>).messageId =
          messageId;
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
      const compliant = isA2ACompliant(data);
      data = normalizeTaskResponse(data);

      const result = processJsonRpcResponse(data);
      if (result) {
        const agentMessage: ChatMessage = {
          id: uuidv4(),
          role: "agent",
          parts: result.parts,
          taskId: result.taskId,
          contextId: result.contextId,
          timestamp: new Date(),
          status: result.status,
          artifacts: result.artifacts,
          compliant: compliant,
          linkedChatMessageId: messageId,
        };

        set((s) => ({
          messages: appendMessage(s.messages, agentMessage),
          currentTaskId: result.taskId,
          contextId: result.contextId,
        }));
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
}));
