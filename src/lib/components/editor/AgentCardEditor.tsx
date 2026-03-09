import { MonacoEditor } from "./MonacoEditor";
import { JsonToolbar } from "./JsonToolbar";
import { useAgentCardStore } from "@lib/stores/agentCardStore";

interface AgentCardEditorProps {
  readOnly?: boolean;
  showToolbar?: boolean;
}

export function AgentCardEditor({ readOnly = false, showToolbar = true }: AgentCardEditorProps) {
  const { rawJson, setRawJson, parseError } = useAgentCardStore();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {showToolbar && <JsonToolbar />}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={rawJson}
          onChange={setRawJson}
          readOnly={readOnly}
          minHeight="100%"
        />
      </div>
      {parseError && (
        <div className="border-t bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {parseError}
        </div>
      )}
    </div>
  );
}
