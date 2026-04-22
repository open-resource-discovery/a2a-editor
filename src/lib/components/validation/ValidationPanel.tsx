import { useValidationStore } from "@lib/stores/validationStore";
import { ValidationSummary } from "./ValidationSummary";
import { ValidationResultCard } from "./ValidationResultCard";
import Checkmark from "./Checkmark";

export function ValidationPanel() {
  const { results, summary, isValidating, lastValidatedAt } = useValidationStore();

  const allPassed = results.length > 0 && summary.fail === 0 && summary.warning === 0;

  // Split "Agent card is valid (v0.3)" into main text + version suffix
  const passMessage = results[0]?.message ?? "Agent card is valid";
  const versionMatch = passMessage.match(/^(.+?)(\s*\(v[\d.]+\))$/);

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      {!allPassed && (
        <ValidationSummary summary={summary} isValidating={isValidating} lastValidatedAt={lastValidatedAt} />
      )}

      {allPassed ? (
        <div
          className="flex flex-1 flex-col items-center justify-center gap-4"
          style={{ "--c-accent": "#22c55e" } as React.CSSProperties}>
          <Checkmark />
          <p className="text-lg">
            <span className="font-bold text-foreground">{versionMatch ? versionMatch[1] : passMessage}</span>
            {versionMatch && <span className="font-normal text-muted-foreground">{versionMatch[2]}</span>}
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          {results.map((result) => (
            <ValidationResultCard key={result.id} result={result} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-center text-muted-foreground">
          <div>
            <p className="text-lg font-medium">No validation results</p>
            <p className="text-sm">Enter an agent card JSON and validation will run automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}
