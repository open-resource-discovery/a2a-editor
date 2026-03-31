import { useValidationStore } from "@lib/stores/validationStore";
import { ValidationSummary } from "./ValidationSummary";
import { ValidationResultCard } from "./ValidationResultCard";

export function ValidationPanel() {
  const { results, summary, isValidating, lastValidatedAt } = useValidationStore();

  return (
    <div className="space-y-4 p-4">
      <ValidationSummary
        summary={summary}
        isValidating={isValidating}
        lastValidatedAt={lastValidatedAt}
      />

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => (
            <ValidationResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : (
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
