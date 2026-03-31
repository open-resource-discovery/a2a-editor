export type ValidationStatus = "pass" | "fail" | "warning";

// Severity levels: error, warning, info, hint
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

export interface EditorMarker {
  path?: string;
  message: string;
  severity: "error" | "warning" | "info" | "hint";
}
