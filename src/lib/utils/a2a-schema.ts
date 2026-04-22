import { z } from "zod";
import type { ValidationResult, ValidationSeverity } from "@lib/types/validation";

// ===================================================================
// Field Hints (version-aware)
// ===================================================================

const COMMON_HINTS: Record<string, string> = {
  "name": 'Must be a string, e.g. "name": "My Agent"',
  "version": 'Must be a string, e.g. "version": "1.0.0"',
  "description": "Must be a string describing the agent",
  "capabilities": 'Must be an object, e.g. "capabilities": { "streaming": false }',
  "skills":
    'Must be an array, e.g. "skills": [{ "id": "echo", "name": "Echo", "description": "Echoes back", "tags": ["echo"] }]',
  "skills.*.id": "Each skill must have a string id",
  "skills.*.name": "Each skill must have a string name",
  "skills.*.description": "Each skill must have a string description",
  "skills.*.tags": "Each skill must have a tags array",
  "defaultInputModes": 'Must be a string array, e.g. "defaultInputModes": ["text/plain"]',
  "defaultOutputModes": 'Must be a string array, e.g. "defaultOutputModes": ["text/plain"]',
  "provider.organization": "Provider organization must be a string",
  "provider.url": "Provider url must be a string",
};

const V03_HINTS: Record<string, string> = {
  ...COMMON_HINTS,
  url: 'Must be a URL string, e.g. "url": "https://example.com/a2a"',
  protocolVersion: 'Must be a string, e.g. "protocolVersion": "0.3.0"',
};

const V10_HINTS: Record<string, string> = {
  ...COMMON_HINTS,
  "supportedInterfaces":
    'Must be an array, e.g. "supportedInterfaces": [{ "url": "https://...", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }]',
  "supportedInterfaces.*.url": "Each interface must have a URL string",
  "supportedInterfaces.*.protocolBinding": "Each interface must have a protocolBinding string",
  "supportedInterfaces.*.protocolVersion": "Each interface must have a protocolVersion string",
};

function getFieldHint(path: string | undefined, version: "v03" | "v10"): string | undefined {
  if (!path) return undefined;
  const hints = version === "v03" ? V03_HINTS : V10_HINTS;
  return hints[path] ?? hints[path.replace(/\.\d+\./g, ".*.").replace(/\.\d+$/, ".*")];
}

// ===================================================================
// Zod Issue Formatting
// ===================================================================

function getFieldName(path: string | undefined): string {
  if (!path) return "value";
  const segments = path.split(".");
  return segments[segments.length - 1];
}

function getReceivedFromMessage(message: string): string | undefined {
  const match = message.match(/received (\w+)/);
  return match?.[1];
}

function formatZodIssue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issue: any,
  version: "v03" | "v10",
): { rule: string; message: string; severity: ValidationSeverity } {
  const path = issue.path.length > 0 ? issue.path.join(".") : undefined;
  const fieldName = getFieldName(path);
  const hint = getFieldHint(path, version);

  switch (issue.code) {
    case "invalid_type": {
      const received = getReceivedFromMessage(issue.message) ?? "unknown";
      if (received === "undefined") {
        const msg = `"${fieldName}" is required`;
        return {
          rule: "Required field missing",
          message: hint ? `${msg}. ${hint}` : msg,
          severity: "error",
        };
      }
      const article = /^[aeiou]/i.test(issue.expected) ? "an" : "a";
      const msg = `"${fieldName}" must be ${article} ${issue.expected}, but received ${received}`;
      return {
        rule: "Invalid type",
        message: hint ? `${msg}. ${hint}` : msg,
        severity: "error",
      };
    }

    case "too_small": {
      const origin = issue.origin ?? "unknown";
      if (origin === "array") {
        const msg = `"${fieldName}" must have at least ${issue.minimum} item(s)`;
        return {
          rule: "Array too short",
          message: hint ? `${msg}. ${hint}` : msg,
          severity: "error",
        };
      }
      if (origin === "string") {
        return {
          rule: "String too short",
          message: `"${fieldName}" must be at least ${issue.minimum} character(s) long`,
          severity: "error",
        };
      }
      return {
        rule: "Value too small",
        message: `"${fieldName}" must be at least ${issue.minimum}`,
        severity: "error",
      };
    }

    case "too_big": {
      const origin = issue.origin ?? "unknown";
      if (origin === "array") {
        return {
          rule: "Array too long",
          message: `"${fieldName}" must have at most ${issue.maximum} item(s)`,
          severity: "error",
        };
      }
      if (origin === "string") {
        return {
          rule: "String too long",
          message: `"${fieldName}" must be at most ${issue.maximum} character(s) long`,
          severity: "error",
        };
      }
      return {
        rule: "Value too large",
        message: `"${fieldName}" must be at most ${issue.maximum}`,
        severity: "error",
      };
    }

    case "invalid_value": {
      const values = (issue.values ?? []).map((v: unknown) => `"${v}"`).join(", ");
      return {
        rule: "Invalid value",
        message: `"${fieldName}" must be one of: ${values}`,
        severity: "error",
      };
    }

    case "unrecognized_keys": {
      const keys = (issue.keys ?? []).join(", ");
      return {
        rule: "Unrecognized keys",
        message: `Unexpected keys: ${keys}`,
        severity: "warning",
      };
    }

    case "invalid_format": {
      return {
        rule: "Invalid format",
        message: `"${fieldName}" must be a valid ${issue.format ?? "format"}`,
        severity: "error",
      };
    }

    case "invalid_union": {
      return {
        rule: "Invalid union",
        message: `"${fieldName}" does not match any of the expected security scheme types`,
        severity: "error",
      };
    }

    default: {
      const humanCode = issue.code.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase());
      return {
        rule: humanCode,
        message: issue.message ?? `Validation failed at "${fieldName}"`,
        severity: "error",
      };
    }
  }
}

// ===================================================================
// Shared Sub-schemas
// ===================================================================

const AgentProviderSchema = z
  .object({
    organization: z.string(),
    url: z.string(),
  })
  .loose();

const AgentCardSignatureSchema = z
  .object({
    protected: z.string(),
    signature: z.string(),
    header: z.record(z.string(), z.unknown()).optional(),
  })
  .loose();

const AgentExtensionSchema = z
  .object({
    uri: z.string(),
    description: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    required: z.boolean().optional(),
  })
  .loose();

// ===================================================================
// v0.3 Schemas (based on a2a-0.3.0.schema.json)
// ===================================================================

// v0.3: OAuth flows (shared flow shape, no deviceCode, no pkceRequired)
const V03OAuthFlowSchema = z
  .object({
    authorizationUrl: z.string().optional(),
    tokenUrl: z.string().optional(),
    refreshUrl: z.string().optional(),
    scopes: z.record(z.string(), z.string()).optional(),
  })
  .loose();

const V03OAuthFlowsSchema = z
  .object({
    authorizationCode: V03OAuthFlowSchema.optional(),
    clientCredentials: V03OAuthFlowSchema.optional(),
    implicit: V03OAuthFlowSchema.optional(),
    password: V03OAuthFlowSchema.optional(),
  })
  .loose();

// v0.3: SecurityScheme uses `type` discriminator (flat structure)
const V03SecuritySchemeSchema = z
  .object({
    type: z.enum(["apiKey", "http", "oauth2", "openIdConnect", "mutualTLS"]),
    description: z.string().optional(),
    // http-specific
    scheme: z.string().optional(),
    bearerFormat: z.string().optional(),
    // apiKey-specific
    name: z.string().optional(),
    in: z.enum(["header", "query", "cookie"]).optional(),
    // oauth2-specific
    flows: V03OAuthFlowsSchema.optional(),
    oauth2MetadataUrl: z.string().optional(),
    // openIdConnect-specific
    openIdConnectUrl: z.string().optional(),
  })
  .loose();

// v0.3: SecurityRequirement = Record<string, string[]>
const V03SecurityRequirementSchema = z.record(z.string(), z.array(z.string()));

// v0.3: AgentInterface (for additionalInterfaces)
const V03AgentInterfaceSchema = z
  .object({
    url: z.string(),
    transport: z.string(),
  })
  .loose();

// v0.3: AgentCapabilities
const V03AgentCapabilitiesSchema = z
  .object({
    streaming: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    stateTransitionHistory: z.boolean().optional(),
    extensions: z.array(AgentExtensionSchema).optional(),
  })
  .loose();

// v0.3: AgentSkill
const V03AgentSkillSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    inputModes: z.array(z.string()).optional(),
    outputModes: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
    security: z.array(V03SecurityRequirementSchema).optional(),
  })
  .loose();

// v0.3: Root AgentCard
const AgentCardV03Schema = z
  .object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    url: z.string(),
    protocolVersion: z.string(),
    capabilities: V03AgentCapabilitiesSchema,
    skills: z.array(V03AgentSkillSchema),
    defaultInputModes: z.array(z.string()),
    defaultOutputModes: z.array(z.string()),
    provider: AgentProviderSchema.optional(),
    documentationUrl: z.string().optional(),
    iconUrl: z.string().optional(),
    securitySchemes: z.record(z.string(), V03SecuritySchemeSchema).optional(),
    security: z.array(V03SecurityRequirementSchema).optional(),
    signatures: z.array(AgentCardSignatureSchema).optional(),
    additionalInterfaces: z.array(V03AgentInterfaceSchema).optional(),
    preferredTransport: z.string().optional(),
    supportsAuthenticatedExtendedCard: z.boolean().optional(),
  })
  .loose();

// ===================================================================
// v1.0 Schemas (based on a2a-1.0.0.schema.json)
// ===================================================================

// v1.0: OAuth flows with stricter required fields
const V10AuthorizationCodeOAuthFlowSchema = z
  .object({
    authorizationUrl: z.string(),
    tokenUrl: z.string(),
    scopes: z.record(z.string(), z.string()),
    refreshUrl: z.string().optional(),
    pkceRequired: z.boolean().optional(),
  })
  .strict();

const V10ClientCredentialsOAuthFlowSchema = z
  .object({
    tokenUrl: z.string(),
    scopes: z.record(z.string(), z.string()),
    refreshUrl: z.string().optional(),
  })
  .strict();

const V10DeviceCodeOAuthFlowSchema = z
  .object({
    deviceAuthorizationUrl: z.string(),
    tokenUrl: z.string(),
    scopes: z.record(z.string(), z.string()),
    refreshUrl: z.string().optional(),
  })
  .strict();

const V10ImplicitOAuthFlowSchema = z
  .object({
    authorizationUrl: z.string().optional(),
    refreshUrl: z.string().optional(),
    scopes: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const V10PasswordOAuthFlowSchema = z
  .object({
    tokenUrl: z.string().optional(),
    refreshUrl: z.string().optional(),
    scopes: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const V10OAuthFlowsSchema = z
  .object({
    authorizationCode: V10AuthorizationCodeOAuthFlowSchema.optional(),
    clientCredentials: V10ClientCredentialsOAuthFlowSchema.optional(),
    deviceCode: V10DeviceCodeOAuthFlowSchema.optional(),
    implicit: V10ImplicitOAuthFlowSchema.optional(),
    password: V10PasswordOAuthFlowSchema.optional(),
  })
  .strict();

// v1.0: SecurityScheme uses nested oneof keys (no flat `type` field)
const V10APIKeySecurityScheme = z
  .object({
    location: z.string(),
    name: z.string(),
    description: z.string().optional(),
  })
  .strict();

const V10HTTPAuthSecurityScheme = z
  .object({
    scheme: z.string(),
    bearerFormat: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

const V10MutualTlsSecurityScheme = z
  .object({
    description: z.string().optional(),
  })
  .strict();

const V10OAuth2SecurityScheme = z
  .object({
    flows: V10OAuthFlowsSchema,
    oauth2MetadataUrl: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

const V10OpenIdConnectSecurityScheme = z
  .object({
    openIdConnectUrl: z.string(),
    description: z.string().optional(),
  })
  .strict();

const V10SecuritySchemeSchema = z
  .object({
    apiKeySecurityScheme: V10APIKeySecurityScheme.optional(),
    httpAuthSecurityScheme: V10HTTPAuthSecurityScheme.optional(),
    mtlsSecurityScheme: V10MutualTlsSecurityScheme.optional(),
    oauth2SecurityScheme: V10OAuth2SecurityScheme.optional(),
    openIdConnectSecurityScheme: V10OpenIdConnectSecurityScheme.optional(),
  })
  .strict();

// v1.0: SecurityRequirement = { schemes: Record<string, { list: string[] }> }
const V10StringListSchema = z
  .object({
    list: z.array(z.string()).optional(),
  })
  .strict();

const V10SecurityRequirementSchema = z
  .object({
    schemes: z.record(z.string(), V10StringListSchema).optional(),
  })
  .strict();

// v1.0: SupportedInterface (with tenant)
const V10SupportedInterfaceSchema = z
  .object({
    url: z.string(),
    protocolBinding: z.string(),
    protocolVersion: z.string(),
    tenant: z.string().optional(),
  })
  .strict();

// v1.0: AgentExtension (strict version)
const V10AgentExtensionSchema = z
  .object({
    uri: z.string().optional(),
    description: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    required: z.boolean().optional(),
  })
  .strict();

// v1.0: AgentCapabilities (has extendedAgentCard, extensions; no stateTransitionHistory)
const V10AgentCapabilitiesSchema = z
  .object({
    streaming: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    extendedAgentCard: z.boolean().optional(),
    extensions: z.array(V10AgentExtensionSchema).optional(),
  })
  .strict();

// v1.0: AgentSkill
const V10AgentSkillSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    inputModes: z.array(z.string()).optional(),
    outputModes: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
    securityRequirements: z.array(V10SecurityRequirementSchema).optional(),
  })
  .strict();

// v1.0: AgentProvider (strict)
const V10AgentProviderSchema = z
  .object({
    organization: z.string(),
    url: z.string(),
  })
  .strict();

// v1.0: AgentCardSignature (strict)
const V10AgentCardSignatureSchema = z
  .object({
    protected: z.string(),
    signature: z.string(),
    header: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// v1.0: Root AgentCard (strict — additionalProperties: false)
const AgentCardV10Schema = z
  .object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    supportedInterfaces: z.array(V10SupportedInterfaceSchema),
    capabilities: V10AgentCapabilitiesSchema,
    skills: z.array(V10AgentSkillSchema),
    defaultInputModes: z.array(z.string()),
    defaultOutputModes: z.array(z.string()),
    provider: V10AgentProviderSchema.optional(),
    documentationUrl: z.string().optional(),
    iconUrl: z.string().optional(),
    securitySchemes: z.record(z.string(), V10SecuritySchemeSchema).optional(),
    securityRequirements: z.array(V10SecurityRequirementSchema).optional(),
    signatures: z.array(V10AgentCardSignatureSchema).optional(),
  })
  .strict();

// ===================================================================
// Version Detection
// ===================================================================

function detectVersion(obj: Record<string, unknown>): "v03" | "v10" {
  // If the card has supportedInterfaces, it's v1.0
  if (Array.isArray(obj.supportedInterfaces)) return "v10";
  return "v03";
}

// ===================================================================
// Validation Function
// ===================================================================

export function validateAgentCardSchema(json: string): ValidationResult[] {
  // Step 1: Check valid JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return [
      {
        id: "json-error",
        rule: "valid-json",
        description: "Input must be valid JSON",
        status: "fail",
        severity: "error",
        message: err instanceof Error ? err.message : "Invalid JSON",
      },
    ];
  }

  // Step 2: Must be an object
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [
      {
        id: "not-object",
        rule: "agent-card.type",
        description: "Agent card must be a JSON object",
        status: "fail",
        severity: "error",
        message: `Expected a JSON object, got ${Array.isArray(parsed) ? "array" : typeof parsed}`,
      },
    ];
  }

  const obj = parsed as Record<string, unknown>;
  const version = detectVersion(obj);
  const schema = version === "v10" ? AgentCardV10Schema : AgentCardV03Schema;
  const versionLabel = version === "v10" ? "v1.0" : "v0.3";

  // Step 3: Run zod validation
  const result = schema.safeParse(obj);

  if (result.success) {
    return [
      {
        id: "all-pass",
        rule: "validation-complete",
        description: "All validations passed",
        status: "pass",
        message: `Agent card is valid (${versionLabel})`,
      },
    ];
  }

  // Step 4: Map zod issues to ValidationResult
  return result.error.issues.map((issue, index) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : undefined;
    const { rule, message, severity } = formatZodIssue(issue, version);
    return {
      id: `schema-${index}`,
      rule,
      description: issue.code.replace(/_/g, " "),
      status: (severity === "warning" ? "warning" : "fail") as "fail" | "warning",
      severity,
      message,
      path,
    };
  });
}
