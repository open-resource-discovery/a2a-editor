export type ValidationStatus = "pass" | "fail" | "warning";

// Severity levels from external validator: 0=error, 1=warning, 2=info, 3=hint
export type ValidationSeverity = "error" | "warning" | "info" | "hint";

export interface ValidationResult {
  id: string;
  rule: string;
  description: string;
  status: ValidationStatus;
  severity?: ValidationSeverity;
  message: string;
  path?: string;
}

export interface ValidationSummary {
  pass: number;
  fail: number;
  warning: number;
  total: number;
}

// External API types
export interface ExternalValidationResult {
  code: string;
  message: string;
  severity: number | string; // 0=error, 1=warn, 2=info, 3=hint OR "error", "warning", "info", "hint"
  path?: string[];
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface Ruleset {
  id: string;
  name?: string;
  description?: string;
}
