import { useHttpLogStore } from "@lib/stores/httpLogStore";
import { HttpLogEntry } from "./HttpLogEntry";
import { Button } from "@lib/components/ui/button";
import { Trash2, Network } from "lucide-react";

export function RawHttpPanel() {
  const { logs, highlightedLogId, clearLogs } = useHttpLogStore();

  return (
    <div className="space-y-4 p-4" data-testid="raw-http-panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">HTTP Logs ({logs.length})</span>
        </div>
        {logs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearLogs}>
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {logs.length > 0 ? (
        <div className="space-y-2">
          {logs.map((entry) => (
            <HttpLogEntry key={entry.id} entry={entry} isHighlighted={entry.id === highlightedLogId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Network className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">No HTTP logs yet</p>
          <p className="text-xs">Send a message in Chat to see HTTP requests</p>
        </div>
      )}
    </div>
  );
}
