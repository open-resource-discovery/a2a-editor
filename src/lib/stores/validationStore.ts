import { create } from "zustand";
import type {
  ValidationResult,
  ValidationSummary,
  ValidationStatus,
  ValidationSeverity,
  Ruleset,
  ExternalValidationResult,
} from "@lib/types/validation";
import {
  validateDocument,
  getRulesets,
  getServerStatus,
} from "@lib/services/validator-api";

function severityToStatus(
  severity: number | string | undefined,
): ValidationStatus {
  if (typeof severity === "string") {
    switch (severity.toLowerCase()) {
      case "error":
        return "fail";
      case "warning":
      case "warn":
        return "warning";
      case "info":
      case "hint":
        return "pass";
    }
    const num = parseInt(severity, 10);
    if (!isNaN(num)) {
      severity = num;
    }
  }
  switch (severity) {
    case 0:
      return "fail";
    case 1:
      return "warning";
    case 2:
    case 3:
      return "pass";
    default:
      return "warning";
  }
}

function severityToLabel(
  severity: number | string | undefined,
): ValidationSeverity {
  if (typeof severity === "string") {
    const lower = severity.toLowerCase();
    if (
      lower === "error" ||
      lower === "warning" ||
      lower === "info" ||
      lower === "hint"
    ) {
      return lower as ValidationSeverity;
    }
    if (lower === "warn") {
      return "warning";
    }
    const num = parseInt(severity, 10);
    if (!isNaN(num)) {
      severity = num;
    }
  }
  switch (severity) {
    case 0:
      return "error";
    case 1:
      return "warning";
    case 2:
      return "info";
    case 3:
      return "hint";
    default:
      return "warning";
  }
}

function mapExternalResult(
  result: ExternalValidationResult,
  index: number,
): ValidationResult {
  return {
    id: `ext-${index}`,
    rule: result.code,
    description: result.code,
    status: severityToStatus(result.severity),
    severity: severityToLabel(result.severity),
    message: result.message,
    path: result.path?.join("."),
  };
}

// Compute summary from results
function computeSummary(results: ValidationResult[]): ValidationSummary {
  return {
    pass: results.filter((r) => r.status === "pass").length,
    fail: results.filter((r) => r.status === "fail").length,
    warning: results.filter((r) => r.status === "warning").length,
    total: results.length,
  };
}

const EMPTY_SUMMARY: ValidationSummary = {
  pass: 0,
  fail: 0,
  warning: 0,
  total: 0,
};

interface ValidationState {
  results: ValidationResult[];
  summary: ValidationSummary;
  isValidating: boolean;
  lastValidatedAt: Date | null;
  selectedRuleset: string;
  availableRulesets: Ruleset[];
  externalApiError: string | null;
  externalApiHealthy: boolean | null;

  loadRulesets: () => Promise<void>;
  checkServerStatus: () => Promise<{ healthy: boolean; message?: string }>;
  validate: (rawJson: string) => Promise<void>;
  clear: () => void;
  setRuleset: (ruleset: string) => void;
}

// Helper to set results and compute summary together
function setResultsWithSummary(results: ValidationResult[]) {
  return { results, summary: computeSummary(results) };
}

export const useValidationStore = create<ValidationState>((set, get) => ({
  results: [],
  summary: EMPTY_SUMMARY,
  isValidating: false,
  lastValidatedAt: null,
  selectedRuleset: "",
  availableRulesets: [],
  externalApiError: null,
  externalApiHealthy: null,

  loadRulesets: async () => {
    try {
      const rulesets = await getRulesets();
      set({ availableRulesets: rulesets, externalApiError: null });
    } catch (err) {
      set({
        externalApiError:
          err instanceof Error ? err.message : "Failed to load rulesets",
        availableRulesets: [],
      });
    }
  },

  checkServerStatus: async () => {
    try {
      const status = await getServerStatus();
      set({
        externalApiHealthy: status.healthy,
        externalApiError: status.healthy
          ? null
          : (status.message ?? "Server unavailable"),
      });
      return status;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check server status";
      set({
        externalApiHealthy: false,
        externalApiError: message,
      });
      return { healthy: false, message };
    }
  },

  validate: async (rawJson) => {
    set({ isValidating: true, externalApiError: null });

    try {
      // First check if it's valid JSON
      try {
        JSON.parse(rawJson);
      } catch (err) {
        const results = [
          {
            id: "json-error",
            rule: "valid-json",
            description: "Input must be valid JSON",
            status: "fail" as const,
            message: err instanceof Error ? err.message : "Invalid JSON",
          },
        ];
        set({
          ...setResultsWithSummary(results),
          lastValidatedAt: new Date(),
          isValidating: false,
        });
        return;
      }

      const { selectedRuleset } = get();
      const externalResults = await validateDocument(
        rawJson,
        selectedRuleset,
        "json",
      );

      if (externalResults.length === 0) {
        const results = [
          {
            id: "all-pass",
            rule: "validation-complete",
            description: "All validations passed",
            status: "pass" as const,
            message: `No issues found (ruleset: ${selectedRuleset || "default"})`,
          },
        ];
        set({
          ...setResultsWithSummary(results),
          lastValidatedAt: new Date(),
        });
      } else {
        const results = externalResults.map(mapExternalResult);
        set({
          ...setResultsWithSummary(results),
          lastValidatedAt: new Date(),
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Validation failed";
      // Don't show API connection errors as validation results
      // Just set the error state
      set({
        externalApiError: errorMsg,
        results: [],
        summary: EMPTY_SUMMARY,
      });
    } finally {
      set({ isValidating: false });
    }
  },

  clear: () =>
    set({
      results: [],
      summary: EMPTY_SUMMARY,
      lastValidatedAt: null,
      externalApiError: null,
    }),

  setRuleset: (ruleset) => set({ selectedRuleset: ruleset }),
}));

// Selector for summary - now just returns stored state
export const selectValidationSummary = (
  state: ValidationState,
): ValidationSummary => state.summary;
