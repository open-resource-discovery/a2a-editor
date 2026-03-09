import type { Part, TaskState, Artifact } from "./a2a";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  parts: Part[];
  taskId?: string;
  contextId?: string;
  timestamp: Date;
  status?: TaskState;
  isStreaming?: boolean;
  artifacts?: Artifact[];
  /** Whether the response is A2A protocol compliant */
  compliant?: boolean;
  /** ID of the user message that triggered this response (for HTTP log lookup) */
  linkedChatMessageId?: string;
}
