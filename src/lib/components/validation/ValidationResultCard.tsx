import type { ValidationResult } from "@lib/types/validation";
import { ValidationEntry } from "@open-resource-discovery/ui-components";

interface ValidationResultCardProps {
  result: ValidationResult;
}

export function ValidationResultCard({ result }: ValidationResultCardProps) {
  return (
    <ValidationEntry
      status={result.status}
      rule={result.rule}
      message={result.message}
      path={result.path}
    />
  );
}
