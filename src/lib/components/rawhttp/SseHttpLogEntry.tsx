import { useEffect, useRef, useState } from "react";
import { Badge, Button, CodeBlock, Spinner } from "@open-resource-discovery/ui-components";
import type { HttpLogEntry as HttpLogEntryType } from "@lib/types/httpLog";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore, selectEffectiveUrl } from "@lib/stores/connectionStore";
import { useUIStore } from "@lib/stores/uiStore";
import { cn } from "@lib/utils/cn";

interface SseEvent {
  index: number;
  dataJson: string;
  isJson: boolean;
  label: string;
}

function parseSseEvents(body: string): SseEvent[] {
  const events: SseEvent[] = [];
  let index = 0;
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const raw = line.slice(6);
    try {
      const parsed = JSON.parse(raw);
      const dataJson = JSON.stringify(parsed, null, 2);
      let label = `Event ${index + 1}`;
      const result = (parsed as Record<string, unknown>)?.result;
      const status = (result as Record<string, unknown>)?.status;
      const state: unknown = (status as Record<string, unknown>)?.state;
      if (typeof state === "string") label = `Event ${index + 1} — ${state}`;
      events.push({ index, dataJson, isJson: true, label });
    } catch {
      events.push({ index, dataJson: raw, isJson: false, label: `Event ${index + 1}` });
    }
    index++;
  }
  return events;
}

interface SseHttpLogEntryProps {
  entry: HttpLogEntryType;
  isHighlighted: boolean;
}

export function SseHttpLogEntry({ entry, isHighlighted }: SseHttpLogEntryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { sendRawRequest } = useChatStore();
  const effectiveUrl = useConnectionStore(selectEffectiveUrl);
  const { switchToChat } = useUIStore();
  const [open, setOpen] = useState(isHighlighted);

  useEffect(() => {
    if (isHighlighted) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const generateCurl = () => {
    const esc = (s: string) => s.replace(/'/g, "'\\''");
    const headers = Object.entries(entry.request.headers)
      .map(([key, value]) => `-H '${esc(key)}: ${esc(value)}'`)
      .join(" \\\n  ");
    let curl = `curl -X ${entry.request.method} '${esc(entry.request.url)}' \\\n  ${headers}`;
    if (entry.request.body) {
      curl += ` \\\n  -d '${esc(entry.request.body)}'`;
    }
    return curl;
  };

  const isPending = (entry.response?.status === null || entry.response?.status === undefined) && !entry.error;
  const isError = entry.error !== undefined || (entry.response?.status !== undefined && entry.response.status >= 400);
  const isSuccess = entry.response?.status !== undefined && entry.response.status < 400;

  const formattedTime = entry.timestamp
    ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : undefined;

  const sseEvents = entry.response?.body ? parseSseEvents(entry.response.body) : [];

  return (
    <div
      ref={ref}
      data-testid="http-log-entry"
      className={cn(
        "rounded-[var(--ord-radius)] border bg-card-bg overflow-hidden",
        isHighlighted && "ring-2 ring-primary",
      )}>
      {/* Header / trigger row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors cursor-pointer">
        {isPending && <Spinner size="sm" className="h-3.5 w-3.5" />}
        {isSuccess && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-success">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
        {isError && !isPending && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-destructive">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}

        <Badge variant="outline" size="sm" className="font-mono shrink-0">
          {entry.request.method}
        </Badge>
        <Badge variant="outline" size="sm" className="font-mono shrink-0">
          SSE
        </Badge>

        {entry.response?.status !== undefined && (
          <Badge variant={entry.response.status < 400 ? "success" : "destructive"} size="sm" className="shrink-0">
            {entry.response.status}
          </Badge>
        )}

        <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{entry.request.url}</span>

        {(entry.durationMs !== undefined || formattedTime) && (
          <div className="flex flex-col items-end shrink-0">
            {entry.durationMs !== undefined && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {entry.durationMs}ms
              </span>
            )}
            {formattedTime && <span className="text-[10px] text-muted-foreground">{formattedTime}</span>}
          </div>
        )}

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("shrink-0 transition-transform", open && "rotate-180")}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="border-t">
          <div className="p-3 space-y-4">
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {effectiveUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await sendRawRequest(entry.request.body, effectiveUrl, entry.request.headers, entry.id);
                    switchToChat();
                  }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Resend
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(generateCurl());
                }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                Copy as cURL
              </Button>
            </div>

            {/* Request */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Request</h4>
              <div className="font-mono text-[11px] bg-muted p-2 rounded">POST {entry.request.url}</div>

              {Object.keys(entry.request.headers).length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Headers ({Object.keys(entry.request.headers).length})
                  </summary>
                  <CodeBlock
                    code={JSON.stringify(entry.request.headers, null, 2)}
                    language="json"
                    className="mt-1 text-[11px]"
                  />
                </details>
              )}

              {entry.request.body && (
                <details open className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Body</summary>
                  <CodeBlock
                    code={(() => {
                      try {
                        return JSON.stringify(JSON.parse(entry.request.body), null, 2);
                      } catch {
                        return entry.request.body;
                      }
                    })()}
                    language="json"
                    className="mt-1 text-[11px]"
                  />
                </details>
              )}
            </div>

            {/* Response */}
            {(entry.response || entry.error) && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">Response</h4>

                {entry.response?.status !== undefined && (
                  <div
                    className={cn(
                      "font-mono text-[11px] p-2 rounded",
                      entry.response.status < 400 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                    )}>
                    HTTP {entry.response.status} {entry.response.statusText}
                  </div>
                )}

                {sseEvents.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      {sseEvents.length} event{sseEvents.length !== 1 ? "s" : ""}
                    </p>
                    {sseEvents.map((evt) => (
                      <details key={evt.index} className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          {evt.label}
                        </summary>
                        <CodeBlock
                          code={evt.dataJson}
                          language={evt.isJson ? "json" : "text"}
                          className="mt-1 text-[11px]"
                        />
                      </details>
                    ))}
                  </div>
                )}

                {entry.error && (
                  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">{entry.error}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
