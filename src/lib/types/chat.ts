import type { Part, TaskState, Artifact } from "./a2a";
import type { ComplianceResult } from "@lib/utils/a2a-compliance";

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
  /** Detailed compliance check results */
  complianceDetails?: ComplianceResult[];
  /** ID of the user message that triggered this response (for HTTP log lookup) */
  linkedChatMessageId?: string;
}
