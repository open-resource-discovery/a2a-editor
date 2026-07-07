import { useEffect, useRef } from "react";
import { HttpLogEntry as LibHttpLogEntry } from "@open-resource-discovery/ui-components";
import type { HttpLogEntry as HttpLogEntryType } from "@lib/types/httpLog";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore, selectEffectiveUrl } from "@lib/stores/connectionStore";
import { useUIStore } from "@lib/stores/uiStore";

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
      responseBody={entry.response?.body}
      error={entry.error}
      highlighted={isHighlighted}
      defaultOpen={isHighlighted}
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
