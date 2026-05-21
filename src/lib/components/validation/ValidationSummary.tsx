import type { ValidationSummary as ValidationSummaryType } from "@lib/types/validation";
import { Badge, Spinner } from "@open-resource-discovery/ui-components";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface ValidationSummaryProps {
  summary: ValidationSummaryType;
  isValidating: boolean;
  lastValidatedAt: Date | null;
}

export function ValidationSummary({
  summary,
  isValidating,
  lastValidatedAt,
}: ValidationSummaryProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isValidating ? (
          <>
            <Spinner size="sm" className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Validating...</span>
          </>
        ) : (
          <>
            {summary.pass > 0 && (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {summary.pass} passed
              </Badge>
            )}
            {summary.warning > 0 && (
              <Badge variant="warning" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {summary.warning} warnings
              </Badge>
            )}
            {summary.fail > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {summary.fail} failed
              </Badge>
            )}
          </>
        )}
      </div>

      {lastValidatedAt && !isValidating && (
        <span className="text-xs text-muted-foreground">
          Last validated: {lastValidatedAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
