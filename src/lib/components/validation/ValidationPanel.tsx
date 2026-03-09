import { useValidationStore } from "@lib/stores/validationStore";
import { ValidationSummary } from "./ValidationSummary";
import { ValidationResultCard } from "./ValidationResultCard";
import { AlertCircle } from "lucide-react";

export function ValidationPanel() {
  const { results, summary, isValidating, lastValidatedAt, externalApiError } = useValidationStore();

  return (
    <div className="space-y-4 p-4">
      <ValidationSummary
        summary={summary}
        isValidating={isValidating}
        lastValidatedAt={lastValidatedAt}
      />

      {externalApiError && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-warning">Validation service unavailable</p>
            <p className="text-warning/80 text-xs mt-0.5">{externalApiError}</p>
          </div>
        </div>
      )}

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => (
            <ValidationResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : !externalApiError && (
        <div className="flex items-center justify-center py-8 text-center text-muted-foreground">
          <div>
            <p className="text-lg font-medium">No validation results</p>
            <p className="text-sm">
              Enter an agent card JSON and validation will run automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
