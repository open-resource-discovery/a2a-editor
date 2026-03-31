// A2A Protocol compliance validation — Zod-based
// Validates agent cards, JSON-RPC responses, and streaming events

import { z } from "zod";
import { validateAgentCardSchema } from "./a2a-schema";

// ===================================================================
// ComplianceResult type and helpers
// ===================================================================

export interface ComplianceResult {
  rule: string;
  passed: boolean;
  message: string;
}

export function isFullyCompliant(results: ComplianceResult[]): boolean {
  return results.length > 0 && results.every((r) => r.passed);
}

// ===================================================================
// Agent Card Validation (delegates to Zod schemas in a2a-schema.ts)
// ===================================================================

export function validateAgentCard(
  card: Record<string, unknown>,
): ComplianceResult[] {
  const json = JSON.stringify(card);
  const results = validateAgentCardSchema(json);

  return results.map((r) => ({
    rule: r.rule,
    passed: r.status === "pass",
    message: r.message,
  }));
}

// ===================================================================
// JSON-RPC Response Schemas
// ===================================================================

const VALID_TASK_STATES = [
  // v0.3 internal (lowercase)
  "pending",
  "submitted",
  "working",
  "input-required",
  "auth-required",
  "completed",
  "canceled",
  "failed",
  "rejected",
  "unknown",
  // v1.0 wire format (safety net if normalization is bypassed)
  "TASK_STATE_SUBMITTED",
  "TASK_STATE_WORKING",
  "TASK_STATE_INPUT_REQUIRED",
  "TASK_STATE_COMPLETED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_FAILED",
  "TASK_STATE_REJECTED",
  "TASK_STATE_AUTH_REQUIRED",
  "TASK_STATE_UNSPECIFIED",
] as const;

const PartSchema = z.union([
  z.object({ text: z.string() }).loose(),
  z.object({ file: z.unknown() }).loose(),
  z.object({ data: z.record(z.string(), z.unknown()) }).loose(),
]);

const MessageSchema = z.object({
  role: z.enum(["user", "agent", "ROLE_USER", "ROLE_AGENT"]),
  parts: z.array(PartSchema),
}).loose();

const TaskStatusSchema = z.object({
  state: z.enum(VALID_TASK_STATES),
  timestamp: z.string().optional(),
  message: MessageSchema.optional(),
}).loose();

const ArtifactSchema = z.object({
  artifactId: z.string().optional(),
  parts: z.array(PartSchema),
}).loose();

const TaskSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  status: TaskStatusSchema,
  artifacts: z.array(ArtifactSchema).optional(),
  history: z.array(MessageSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).loose();

const JsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
}).loose();

const JsonRpcResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  result: TaskSchema.optional(),
  error: JsonRpcErrorSchema.optional(),
}).loose();

// ===================================================================
// JSON-RPC Response Validation
// ===================================================================

/**
 * Build pass results for a valid response so the UI shows a familiar
 * per-check breakdown (jsonrpc version, result/error, task id, etc.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPassResults(response: any): ComplianceResult[] {
  const results: ComplianceResult[] = [];

  results.push({
    rule: "jsonrpc.version",
    passed: true,
    message: 'jsonrpc is "2.0"',
  });

  if (response.error) {
    results.push({
      rule: "jsonrpc.resultOrError",
      passed: true,
      message: "Response has error",
    });
    results.push({
      rule: "jsonrpc.error.code",
      passed: true,
      message: `Error code: ${response.error.code}`,
    });
    results.push({
      rule: "jsonrpc.error.message",
      passed: true,
      message: `Error message: "${response.error.message}"`,
    });
  }

  if (response.result) {
    results.push({
      rule: "jsonrpc.resultOrError",
      passed: true,
      message: "Response has result",
    });
    results.push({
      rule: "a2a.result.id",
      passed: true,
      message: "Task has a string id",
    });
    results.push({
      rule: "a2a.result.status",
      passed: true,
      message: "Task has a status object",
    });
    results.push({
      rule: "a2a.result.status.state",
      passed: true,
      message: `Status state: "${response.result.status.state}"`,
    });
    results.push({
      rule: "a2a.result.contextId",
      passed: true,
      message: "Task has a contextId",
    });
  }

  if (!response.result && !response.error) {
    results.push({
      rule: "jsonrpc.resultOrError",
      passed: true,
      message: "Response has result or error",
    });
  }

  return results;
}

/**
 * Map a Zod issue path + message to a human-readable compliance rule name.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodIssueToComplianceResult(issue: any): ComplianceResult {
  const path = issue.path.length > 0 ? issue.path.join(".") : undefined;

  // Map known paths to rule names matching the old compliance module
  const ruleMap: Record<string, string> = {
    jsonrpc: "jsonrpc.version",
    result: "jsonrpc.resultOrError",
    error: "jsonrpc.resultOrError",
    "result.id": "a2a.result.id",
    "result.status": "a2a.result.status",
    "result.status.state": "a2a.result.status.state",
    "result.contextId": "a2a.result.contextId",
    "error.code": "jsonrpc.error.code",
    "error.message": "jsonrpc.error.message",
  };

  const rule = (path && ruleMap[path]) ?? `validation.${path ?? "root"}`;

  // Build a readable message
  const fieldName = path?.split(".").pop() ?? "value";
  let message: string;

  switch (issue.code) {
    case "invalid_type": {
      const received = issue.message?.match(/received (\w+)/)?.[1] ?? "unknown";
      if (received === "undefined") {
        message = `"${fieldName}" is required`;
      } else {
        message = `"${fieldName}" must be ${issue.expected}, but received ${received}`;
      }
      break;
    }
    case "invalid_value":
      message = issue.message ?? `"${fieldName}" has an invalid value`;
      break;
    case "invalid_literal":
      message = `"${fieldName}" must be ${JSON.stringify(issue.expected)}`;
      break;
    default:
      message = issue.message ?? `Validation failed at "${fieldName}"`;
  }

  return { rule, passed: false, message };
}

export function validateResponse(data: unknown): ComplianceResult[] {
  // Quick guard: must be an object
  if (!data || typeof data !== "object") {
    return [
      {
        rule: "jsonrpc.object",
        passed: false,
        message: "Response must be a JSON object",
      },
    ];
  }

  const result = JsonRpcResponseSchema.safeParse(data);

  if (result.success) {
    return buildPassResults(result.data);
  }

  // On failure, produce individual fail results from Zod issues,
  // plus pass results for anything that did validate correctly
  const response = data as Record<string, unknown>;
  const results: ComplianceResult[] = [];

  // Check jsonrpc version manually for the pass/fail breakdown
  const jsonrpcOk = response.jsonrpc === "2.0";
  results.push({
    rule: "jsonrpc.version",
    passed: jsonrpcOk,
    message: jsonrpcOk ? 'jsonrpc is "2.0"' : 'jsonrpc must be "2.0"',
  });

  // Check result/error presence
  const hasResultOrError = !!response.result || !!response.error;
  results.push({
    rule: "jsonrpc.resultOrError",
    passed: hasResultOrError,
    message: hasResultOrError
      ? "Response has result or error"
      : "Response must have either result or error",
  });

  // Add specific Zod failures (skip the ones we already reported above)
  const reportedPaths = new Set(["jsonrpc"]);
  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : undefined;
    if (path && reportedPaths.has(path)) continue;
    if (path) reportedPaths.add(path);
    results.push(zodIssueToComplianceResult(issue));
  }

  return results;
}

// ===================================================================
// Streaming Event Schemas
// ===================================================================

const TaskEventSchema = z.object({
  kind: z.literal("task"),
  id: z.string(),
  status: z.object({
    state: z.string(),
  }).loose(),
}).loose();

const StatusUpdateEventSchema = z.object({
  kind: z.literal("status-update"),
  status: z.object({
    state: z.string(),
  }).loose(),
}).loose();

const ArtifactUpdateEventSchema = z.object({
  kind: z.literal("artifact-update"),
  artifact: z.object({
    parts: z.array(PartSchema).min(1),
  }).loose(),
}).loose();

const MessageEventSchema = z.object({
  kind: z.literal("message"),
  role: z.enum(["agent", "ROLE_AGENT", "user", "ROLE_USER"]),
  parts: z.array(PartSchema).min(1),
}).loose();

// ===================================================================
// Streaming Event Validation
// ===================================================================

export function validateMessageKind(
  data: Record<string, unknown>,
): ComplianceResult[] {
  const kind = data.kind as string | undefined;

  if (!kind) {
    // No kind field — not a streaming event, skip kind validation
    return [];
  }

  const results: ComplianceResult[] = [];

  results.push({
    rule: "a2a.event.kind",
    passed: true,
    message: `Event kind: "${kind}"`,
  });

  // Pick the right schema based on kind
  let schema: z.ZodType | undefined;
  switch (kind) {
    case "task":
      schema = TaskEventSchema;
      break;
    case "status-update":
      schema = StatusUpdateEventSchema;
      break;
    case "artifact-update":
      schema = ArtifactUpdateEventSchema;
      break;
    case "message":
      schema = MessageEventSchema;
      break;
    default:
      results.push({
        rule: "a2a.event.kind.unknown",
        passed: false,
        message: `Unknown event kind: "${kind}"`,
      });
      return results;
  }

  const parseResult = schema.safeParse(data);
  if (parseResult.success) {
    // Build pass results based on kind
    switch (kind) {
      case "task": {
        const task = parseResult.data as { id: string; status: { state: string } };
        results.push({
          rule: "a2a.task.id",
          passed: true,
          message: "Task has id",
        });
        results.push({
          rule: "a2a.task.status.state",
          passed: true,
          message: `Task status: "${task.status.state}"`,
        });
        break;
      }
      case "status-update": {
        const su = parseResult.data as { status: { state: string } };
        results.push({
          rule: "a2a.statusUpdate.status.state",
          passed: true,
          message: `Status update: "${su.status.state}"`,
        });
        break;
      }
      case "artifact-update": {
        const au = parseResult.data as { artifact: { parts: unknown[] } };
        results.push({
          rule: "a2a.artifactUpdate.artifact.parts",
          passed: true,
          message: `Artifact has ${au.artifact.parts.length} part(s)`,
        });
        break;
      }
      case "message": {
        const msg = parseResult.data as { role: string; parts: unknown[] };
        results.push({
          rule: "a2a.message.parts",
          passed: true,
          message: `Message has ${msg.parts.length} part(s)`,
        });
        results.push({
          rule: "a2a.message.role",
          passed: true,
          message: `Message role is "${msg.role}"`,
        });
        break;
      }
    }
  } else {
    // Map Zod issues to compliance results
    for (const issue of parseResult.error.issues) {
      results.push(zodIssueToComplianceResult(issue));
    }
  }

  return results;
}
