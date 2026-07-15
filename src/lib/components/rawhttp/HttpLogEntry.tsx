import { useEffect, useRef } from "react";
import { Badge, CodeBlock, HttpLogEntry as LibHttpLogEntry } from "@open-resource-discovery/ui-components";
import type { HttpLogEntry as HttpLogEntryType } from "@lib/types/httpLog";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore, selectEffectiveUrl } from "@lib/stores/connectionStore";
import { useUIStore } from "@lib/stores/uiStore";

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
      const label = `Event ${index + 1}`;
      events.push({ index, dataJson, isJson: true, label });
    } catch {
      events.push({ index, dataJson: raw, isJson: false, label: `Event ${index + 1}` });
    }
    index++;
  }
  return events;
}

interface HttpLogEntryProps {
  entry: HttpLogEntryType;
  isHighlighted: boolean;
}

export function HttpLogEntry({ entry, isHighlighted }: HttpLogEntryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { sendRawRequest } = useChatStore();
  const effectiveUrl = useConnectionStore(selectEffectiveUrl);
  const { switchToChat } = useUIStore();

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

  const sseEvents = entry.isSSE && entry.response?.body ? parseSseEvents(entry.response.body) : null;

  const responseBodyContent = sseEvents ? (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">
        {sseEvents.length} event{sseEvents.length !== 1 ? "s" : ""}
      </p>
      {sseEvents.map((evt) => (
        <details key={evt.index} className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{evt.label}</summary>
          <CodeBlock code={evt.dataJson} language={evt.isJson ? "json" : "text"} className="mt-1 text-[11px]" />
        </details>
      ))}
    </div>
  ) : undefined;

  return (
    <LibHttpLogEntry
      ref={ref}
      data-testid="http-log-entry"
      method={entry.request.method}
      url={entry.request.url}
      statusCode={entry.response?.status}
      responseStatus={entry.response?.statusText}
      duration={entry.durationMs}
      timestamp={entry.timestamp}
      requestBody={entry.request.body}
      requestHeaders={entry.request.headers}
      responseBody={sseEvents ? undefined : entry.response?.body}
      error={entry.error}
      highlighted={isHighlighted}
      defaultOpen={isHighlighted}
      extraBadges={
        entry.isSSE ? (
          <Badge variant="outline" size="sm" className="font-mono shrink-0">
            SSE
          </Badge>
        ) : undefined
      }
      responseBodyContent={responseBodyContent}
      onResend={
        effectiveUrl
          ? async () => {
              await sendRawRequest(entry.request.body, effectiveUrl, entry.request.headers, entry.id);
              switchToChat();
            }
          : undefined
      }
      onCopy={async () => {
        await navigator.clipboard.writeText(generateCurl());
      }}
      onEdit={
        effectiveUrl
          ? async ({ headers, body }) => {
              await sendRawRequest(body, effectiveUrl, headers, entry.id);
            }
          : undefined
      }
    />
  );
}
