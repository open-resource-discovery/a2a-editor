import { useMemo } from "react";
import { MonacoEditor } from "./MonacoEditor";
import { JsonToolbar } from "./JsonToolbar";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useValidationStore } from "@lib/stores/validationStore";
import type { EditorMarker } from "@lib/types/validation";

interface AgentCardEditorProps {
  readOnly?: boolean;
  showToolbar?: boolean;
}

export function AgentCardEditor({ readOnly = false, showToolbar = true }: AgentCardEditorProps) {
  const { rawJson, setRawJson, parseError } = useAgentCardStore();
  const validationResults = useValidationStore((s) => s.results);

  const markers = useMemo<EditorMarker[]>(() => {
    return validationResults
      .filter((r) => r.status === "fail")
      .map((r) => ({
        path: r.path,
        message: r.message,
        severity: r.severity ?? "error",
      }));
  }, [validationResults]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-testid="editor-panel">
      {showToolbar && <JsonToolbar />}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={rawJson}
          onChange={setRawJson}
          readOnly={readOnly}
          minHeight="100%"
          markers={markers}
        />
      </div>
      {parseError && (
        <div className="border-t bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="editor-parse-error">
          {parseError}
        </div>
      )}
    </div>
  );
}
