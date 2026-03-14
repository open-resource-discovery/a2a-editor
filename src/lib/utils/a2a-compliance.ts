// A2A Protocol compliance validation
// Ported from the A2A Inspector project's Python validators

export interface ComplianceResult {
  rule: string;
  passed: boolean;
  message: string;
}

export function isFullyCompliant(results: ComplianceResult[]): boolean {
  return results.length > 0 && results.every((r) => r.passed);
}

// --- Agent Card Validation ---

export function validateAgentCard(
  card: Record<string, unknown>,
): ComplianceResult[] {
  const results: ComplianceResult[] = [];

  // Required string fields
  for (const field of ["name", "description", "version"]) {
    const value = card[field];
    results.push({
      rule: `agentCard.${field}`,
      passed: typeof value === "string" && value.length > 0,
      message:
        typeof value === "string" && value.length > 0
          ? `"${field}" is present`
          : `"${field}" is required`,
    });
  }

  // url: required in v0.3.0, derived from supportedInterfaces in v1.0.0
  const hasUrl = typeof card.url === "string" && (card.url as string).length > 0;
  const hasSupportedInterfaces =
    Array.isArray(card.supportedInterfaces) && (card.supportedInterfaces as unknown[]).length > 0;
  results.push({
    rule: "agentCard.url",
    passed: hasUrl || hasSupportedInterfaces,
    message:
      hasUrl
        ? '"url" is present'
        : hasSupportedInterfaces
          ? '"url" derived from supportedInterfaces'
          : '"url" or "supportedInterfaces" is required',
  });

  // url must be a valid HTTP(S) URL
  if (typeof card.url === "string") {
    const validUrl =
      card.url.startsWith("http://") || card.url.startsWith("https://");
    results.push({
      rule: "agentCard.url.format",
      passed: validUrl,
      message: validUrl
        ? "URL has valid http/https scheme"
        : 'URL must start with "http://" or "https://"',
    });
  }

  // capabilities must be an object
  results.push({
    rule: "agentCard.capabilities",
    passed:
      card.capabilities !== null &&
      typeof card.capabilities === "object" &&
      !Array.isArray(card.capabilities),
    message:
      card.capabilities !== null &&
      typeof card.capabilities === "object" &&
      !Array.isArray(card.capabilities)
        ? '"capabilities" is a valid object'
        : '"capabilities" must be an object',
  });

  // defaultInputModes must be an array of strings
  if (card.defaultInputModes !== undefined) {
    const valid =
      Array.isArray(card.defaultInputModes) &&
      card.defaultInputModes.every((m: unknown) => typeof m === "string");
    results.push({
      rule: "agentCard.defaultInputModes",
      passed: valid,
      message: valid
        ? '"defaultInputModes" is a valid string array'
        : '"defaultInputModes" must be an array of strings',
    });
  }

  // defaultOutputModes must be an array of strings
  if (card.defaultOutputModes !== undefined) {
    const valid =
      Array.isArray(card.defaultOutputModes) &&
      card.defaultOutputModes.every((m: unknown) => typeof m === "string");
    results.push({
      rule: "agentCard.defaultOutputModes",
      passed: valid,
      message: valid
        ? '"defaultOutputModes" is a valid string array'
        : '"defaultOutputModes" must be an array of strings',
    });
  }

  // skills must be a non-empty array
  const hasSkills = Array.isArray(card.skills) && card.skills.length > 0;
  results.push({
    rule: "agentCard.skills",
    passed: hasSkills,
    message: hasSkills
      ? `"skills" has ${(card.skills as unknown[]).length} skill(s)`
      : '"skills" must be a non-empty array',
  });

  return results;
}

// --- JSON-RPC Response Validation ---

export function validateResponse(data: unknown): ComplianceResult[] {
  const results: ComplianceResult[] = [];

  if (!data || typeof data !== "object") {
    results.push({
      rule: "jsonrpc.object",
      passed: false,
      message: "Response must be a JSON object",
    });
    return results;
  }

  const response = data as Record<string, unknown>;

  // Must have jsonrpc "2.0"
  results.push({
    rule: "jsonrpc.version",
    passed: response.jsonrpc === "2.0",
    message:
      response.jsonrpc === "2.0"
        ? 'jsonrpc is "2.0"'
        : 'jsonrpc must be "2.0"',
  });

  // Must have either result or error
  const hasResultOrError = !!response.result || !!response.error;
  results.push({
    rule: "jsonrpc.resultOrError",
    passed: hasResultOrError,
    message: hasResultOrError
      ? "Response has result or error"
      : "Response must have either result or error",
  });

  // Validate error shape
  if (response.error) {
    const error = response.error as Record<string, unknown>;
    const codeValid = typeof error.code === "number";
    const messageValid = typeof error.message === "string";

    results.push({
      rule: "jsonrpc.error.code",
      passed: codeValid,
      message: codeValid
        ? `Error code: ${error.code}`
        : "Error code must be a number",
    });
    results.push({
      rule: "jsonrpc.error.message",
      passed: messageValid,
      message: messageValid
        ? `Error message: "${error.message}"`
        : "Error message must be a string",
    });
  }

  // Validate result shape (A2A task response)
  if (response.result) {
    const result = response.result as Record<string, unknown>;

    const idValid = typeof result.id === "string";
    results.push({
      rule: "a2a.result.id",
      passed: idValid,
      message: idValid ? "Task has a string id" : "Task id must be a string",
    });

    const hasStatus =
      result.status !== null &&
      typeof result.status === "object" &&
      !Array.isArray(result.status);
    results.push({
      rule: "a2a.result.status",
      passed: hasStatus,
      message: hasStatus
        ? "Task has a status object"
        : "Task must have a status object",
    });

    if (hasStatus) {
      const status = result.status as Record<string, unknown>;
      const validStates = [
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
        // v1.0.0 SCREAMING_SNAKE_CASE (safety net if normalization is bypassed)
        "TASK_STATE_SUBMITTED",
        "TASK_STATE_WORKING",
        "TASK_STATE_INPUT_REQUIRED",
        "TASK_STATE_COMPLETED",
        "TASK_STATE_CANCELED",
        "TASK_STATE_FAILED",
        "TASK_STATE_REJECTED",
        "TASK_STATE_AUTH_REQUIRED",
        "TASK_STATE_UNSPECIFIED",
      ];
      const stateValid = validStates.includes(status.state as string);
      results.push({
        rule: "a2a.result.status.state",
        passed: stateValid,
        message: stateValid
          ? `Status state: "${status.state}"`
          : `Invalid status state "${String(status.state)}", expected one of: ${validStates.join(", ")}`,
      });
    }

    const hasContextId = typeof result.contextId === "string";
    results.push({
      rule: "a2a.result.contextId",
      passed: hasContextId,
      message: hasContextId
        ? "Task has a contextId"
        : "Task should have a contextId",
    });
  }

  return results;
}

// --- Message Kind Validation ---

export function validateMessageKind(
  data: Record<string, unknown>,
): ComplianceResult[] {
  const results: ComplianceResult[] = [];
  const kind = data.kind as string | undefined;

  if (!kind) {
    // No kind field — not a streaming event, skip kind validation
    return results;
  }

  results.push({
    rule: "a2a.event.kind",
    passed: true,
    message: `Event kind: "${kind}"`,
  });

  switch (kind) {
    case "task": {
      const hasId = typeof data.id === "string";
      results.push({
        rule: "a2a.task.id",
        passed: hasId,
        message: hasId ? "Task has id" : "Task must have an id",
      });

      const status = data.status as Record<string, unknown> | undefined;
      const hasState = status && typeof status.state === "string";
      results.push({
        rule: "a2a.task.status.state",
        passed: !!hasState,
        message: hasState
          ? `Task status: "${status.state}"`
          : "Task must have status.state",
      });
      break;
    }

    case "status-update": {
      const status = data.status as Record<string, unknown> | undefined;
      const hasState = status && typeof status.state === "string";
      results.push({
        rule: "a2a.statusUpdate.status.state",
        passed: !!hasState,
        message: hasState
          ? `Status update: "${status.state}"`
          : "Status update must have status.state",
      });
      break;
    }

    case "artifact-update": {
      const artifact = data.artifact as Record<string, unknown> | undefined;
      const hasParts =
        artifact &&
        Array.isArray(artifact.parts) &&
        artifact.parts.length > 0;
      results.push({
        rule: "a2a.artifactUpdate.artifact.parts",
        passed: !!hasParts,
        message: hasParts
          ? `Artifact has ${(artifact.parts as unknown[]).length} part(s)`
          : "Artifact update must have artifact with non-empty parts",
      });
      break;
    }

    case "message": {
      const parts = data.parts as unknown[] | undefined;
      const hasParts = Array.isArray(parts) && parts.length > 0;
      results.push({
        rule: "a2a.message.parts",
        passed: hasParts,
        message: hasParts
          ? `Message has ${parts.length} part(s)`
          : "Message must have non-empty parts",
      });

      const hasRole = data.role === "agent" || data.role === "ROLE_AGENT";
      results.push({
        rule: "a2a.message.role",
        passed: hasRole,
        message: hasRole
          ? `Message role is "${data.role}"`
          : 'Message role should be "agent" or "ROLE_AGENT"',
      });
      break;
    }

    default:
      results.push({
        rule: "a2a.event.kind.unknown",
        passed: false,
        message: `Unknown event kind: "${kind}"`,
      });
  }

  return results;
}
