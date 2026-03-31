import { create } from "zustand";
import type {
  ValidationResult,
  ValidationSummary,
} from "@lib/types/validation";
import { validateAgentCardSchema } from "@lib/utils/a2a-schema";

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

  validate: (rawJson: string) => void;
  clear: () => void;
}

// Helper to set results and compute summary together
function setResultsWithSummary(results: ValidationResult[]) {
  return { results, summary: computeSummary(results) };
}

export const useValidationStore = create<ValidationState>((set) => ({
  results: [],
  summary: EMPTY_SUMMARY,
  isValidating: false,
  lastValidatedAt: null,

  validate: (rawJson) => {
    set({ isValidating: true });

    const results = validateAgentCardSchema(rawJson);

    set({
      ...setResultsWithSummary(results),
      lastValidatedAt: new Date(),
      isValidating: false,
    });
  },

  clear: () =>
    set({
      results: [],
      summary: EMPTY_SUMMARY,
      lastValidatedAt: null,
    }),
}));

// Selector for summary - now just returns stored state
export const selectValidationSummary = (
  state: ValidationState,
): ValidationSummary => state.summary;
