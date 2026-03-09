import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CheckCircle,
  Play,
  X,
  GitBranch,
} from "lucide-react";
import { Badge } from "@lib/components/ui/badge";
import { Button } from "@lib/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lib/components/ui/collapsible";
import { JsonHighlight } from "@lib/components/ui/JsonHighlight";
import { cn } from "@lib/utils/cn";
import type { HttpLogEntry as HttpLogEntryType } from "@lib/types/httpLog";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useUIStore } from "@lib/stores/uiStore";

interface HttpLogEntryProps {
  entry: HttpLogEntryType;
  isHighlighted: boolean;
}

export function HttpLogEntry({ entry, isHighlighted }: HttpLogEntryProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState("");
  const [editedHeaders, setEditedHeaders] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { sendRawRequest } = useChatStore();
  const { url } = useConnectionStore();
  const { switchToChat } = useUIStore();

  useEffect(() => {
    if (isHighlighted) {
      setOpen(true);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isHighlighted]);

  const isSuccess =
    entry.response &&
    entry.response.status >= 200 &&
    entry.response.status < 300;
  const isError =
    entry.error || (entry.response && entry.response.status >= 400);

  const generateCurlFormat = () => {
    const headers = Object.entries(entry.request.headers)
      .map(([key, value]) => `-H '${key}: ${value}'`)
      .join(" \\\n  ");

    let curl = `curl -X ${entry.request.method} '${entry.request.url}' \\\n  ${headers}`;

    if (entry.request.body) {
      curl += ` \\\n  -d '${entry.request.body}'`;
    }

    if (entry.response) {
      curl += `\n\n# Response: ${entry.response.status} ${entry.response.statusText}`;
      curl += `\n# Body:\n${entry.response.body}`;
    }

    if (entry.error) {
      curl += `\n\n# Error: ${entry.error}`;
    }

    return curl;
  };

  const handleCopy = async () => {
    const text = generateCurlFormat();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (str: string) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  let urlPath: string;
  try {
    urlPath = new URL(entry.request.url).pathname;
  } catch {
    urlPath = entry.request.url;
  }

  const handleStartEdit = () => {
    setEditedBody(formatJson(entry.request.body));
    setEditedHeaders(JSON.stringify(entry.request.headers, null, 2));
    setEditError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedBody("");
    setEditedHeaders("");
    setEditError(null);
  };

  const handleSendEdited = async () => {
    // Validate body JSON
    try {
      JSON.parse(editedBody);
    } catch {
      setEditError("Invalid JSON format in body");
      return;
    }

    // Validate headers JSON
    let parsedHeaders: Record<string, string>;
    try {
      parsedHeaders = JSON.parse(editedHeaders);
      if (typeof parsedHeaders !== "object" || parsedHeaders === null) {
        throw new Error("Headers must be an object");
      }
    } catch {
      setEditError("Invalid JSON format in headers");
      return;
    }

    setIsSending(true);
    setEditError(null);

    try {
      await sendRawRequest(editedBody, url, parsedHeaders, entry.id);
      setIsEditing(false);
      setEditedBody("");
      setEditedHeaders("");
      switchToChat();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-colors",
        isHighlighted && "ring-2 ring-primary"
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left hover:bg-accent/50">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
            {isSuccess && (
              <CheckCircle className="h-4 w-4 text-success shrink-0" />
            )}
            {isError && (
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            {!isSuccess && !isError && (
              <div className="h-4 w-4 shrink-0" />
            )}

            <Badge variant="outline" className="text-xs font-mono shrink-0">
              {entry.request.method}
            </Badge>

            {entry.response && (
              <Badge
                variant={isSuccess ? "default" : "destructive"}
                className="text-xs shrink-0"
              >
                {entry.response.status}
              </Badge>
            )}

            {entry.derivedFromLogId && (
              <span title="Modified from previous request">
                <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
              </span>
            )}

            <span className="text-xs text-muted-foreground truncate">
              {urlPath}
            </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-end text-xs text-muted-foreground">
              {entry.durationMs !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {entry.durationMs}ms
                </span>
              )}
              <span className="text-[10px]">
                {entry.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-3 space-y-4">
            <div className="flex justify-end gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    disabled={!url}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Edit & Resend
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy as cURL"}
                  </Button>
                </>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold mb-2">Edit Headers</h4>
                  <textarea
                    value={editedHeaders}
                    onChange={(e) => setEditedHeaders(e.target.value)}
                    className="w-full h-32 font-mono text-[11px] bg-muted p-2 rounded border resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                    spellCheck={false}
                    placeholder='{"Content-Type": "application/json", ...}'
                  />
                </div>
                <div>
                  <h4 className="text-xs font-semibold mb-2">Edit Request Body</h4>
                  <textarea
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="w-full h-64 font-mono text-[11px] bg-muted p-2 rounded border resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                    spellCheck={false}
                  />
                </div>
                {editError && (
                  <p className="text-xs text-destructive">{editError}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSending}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSendEdited}
                    disabled={isSending}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    {isSending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h4 className="text-xs font-semibold mb-2">Request</h4>
                  <div className="space-y-2">
                    <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                      {entry.request.method} {entry.request.url}
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Headers ({Object.keys(entry.request.headers).length})
                      </summary>
                      <JsonHighlight
                        code={JSON.stringify(entry.request.headers, null, 2)}
                        className="mt-1"
                      />
                    </details>
                    <details open className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Body
                      </summary>
                      <JsonHighlight
                        code={formatJson(entry.request.body)}
                        className="mt-1"
                      />
                    </details>
                  </div>
                </div>

                {entry.response && (
                  <div>
                    <h4 className="text-xs font-semibold mb-2">Response</h4>
                    <div className="space-y-2">
                      <div
                        className={cn(
                          "text-xs font-mono p-2 rounded",
                          isSuccess ? "bg-success/10" : "bg-destructive/10"
                        )}
                      >
                        {entry.response.status} {entry.response.statusText}
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Headers ({Object.keys(entry.response.headers).length})
                        </summary>
                        <JsonHighlight
                          code={JSON.stringify(entry.response.headers, null, 2)}
                          className="mt-1"
                        />
                      </details>
                      <details open className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Body
                        </summary>
                        <JsonHighlight
                          code={formatJson(entry.response.body)}
                          className="mt-1"
                        />
                      </details>
                    </div>
                  </div>
                )}

                {entry.error && (
                  <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                    Error: {entry.error}
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
