import type { ExternalValidationResult, Ruleset } from "@lib/types/validation";

const API_BASE = import.meta.env.VITE_VALIDATOR_API_URL ?? "";

function getApiBaseOrThrow(): string {
  if (!API_BASE) {
    throw new Error("Validation API is not configured");
  }

  return API_BASE;
}

export interface ValidatorStatus {
  healthy: boolean;
  version?: string;
  message?: string;
}

/**
 * Validate a document against a ruleset
 */
export async function validateDocument(
  document: string,
  ruleset: string = "",
  fileType: string = "json",
): Promise<ExternalValidationResult[]> {
  const apiBase = getApiBaseOrThrow();
  const params = new URLSearchParams({ fileType });

  if (ruleset) {
    params.set("ruleset", ruleset);
  }

  const res = await fetch(`${apiBase}/api/v1/document/validate?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
    },
    body: document,
  });

  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error.error?.message || `Validation failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Get available rulesets
 */
export async function getRulesets(): Promise<Ruleset[]> {
  const apiBase = getApiBaseOrThrow();
  const res = await fetch(`${apiBase}/api/v1/rulesets`);

  if (!res.ok) {
    throw new Error(`Failed to fetch rulesets: ${res.statusText}`);
  }

  const data = await res.json();
  // API returns an array of ruleset IDs or objects
  if (Array.isArray(data)) {
    return data.map((item) =>
      typeof item === "string"
        ? { id: item }
        : {
            id: item.id ?? item,
            name: item.name,
            description: item.description,
          },
    );
  }
  return [];
}

/**
 * Check server status
 */
export async function getServerStatus(): Promise<ValidatorStatus> {
  if (!API_BASE) {
    return {
      healthy: false,
      message: "Validation API is not configured",
    };
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/status`);

    if (!res.ok) {
      return { healthy: false, message: `Server returned ${res.status}` };
    }

    const data = await res.json();
    return {
      healthy: true,
      version: data.version,
      message: data.status ?? "OK",
    };
  } catch (err) {
    return {
      healthy: false,
      message: err instanceof Error ? err.message : "Failed to connect",
    };
  }
}
