import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@lib/types/chat";
import { isTextPart, isDataPart, isFilePart } from "@lib/types/a2a";
import { cn } from "@lib/utils/cn";
import { Copy, Check, RotateCcw, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Badge } from "@lib/components/ui/badge";
import { Button } from "@lib/components/ui/button";
import { JsonHighlight } from "@lib/components/ui/JsonHighlight";
import { CodeBlock, PreBlock } from "@lib/components/ui/CodeBlock";
import { useUIStore } from "@lib/stores/uiStore";
import { useHttpLogStore } from "@lib/stores/httpLogStore";

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
}

/** Map a MIME mediaType to a code fence language tag, or null for plain text. */
function mediaTypeToLang(mediaType?: string): string | null {
  if (!mediaType) return null;
  const mt = mediaType.toLowerCase();
  if (mt.includes("xml")) return "xml";
  if (mt.includes("json")) return "json";
  if (mt.includes("yaml") || mt.includes("yml")) return "yaml";
  if (mt.includes("html")) return "xml";
  return null;
}

/** Quick check whether a string looks like valid JSON (object or array). */
function isJsonLike(text: string): boolean {
  const trimmed = text.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  try { JSON.parse(trimmed); return true; } catch { return false; }
}

function FilePartView({ file: filePart }: { file: { uri: string; mimeType?: string; mediaType?: string; name?: string } }) {
  const mime = (filePart.mimeType || filePart.mediaType || "").toLowerCase();

  if (mime.startsWith("image/")) {
    return (
      <img
        src={filePart.uri}
        alt={filePart.name || "Image"}
        className="mt-2 max-w-full rounded max-h-80 min-w-12 min-h-12 object-contain"
      />
    );
  }

  if (mime.startsWith("audio/")) {
    return (
      <audio controls src={filePart.uri} className="mt-2 w-full min-w-[200px]">
        <a href={filePart.uri} target="_blank" rel="noopener noreferrer">
          {filePart.name || "Audio file"}
        </a>
      </audio>
    );
  }

  if (mime.startsWith("video/")) {
    return (
      <video controls src={filePart.uri} className="mt-2 max-w-full rounded max-h-80 min-w-[120px] min-h-[68px]">
        <a href={filePart.uri} target="_blank" rel="noopener noreferrer">
          {filePart.name || "Video file"}
        </a>
      </video>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <FileText className="h-4 w-4 shrink-0" />
      <a href={filePart.uri} target="_blank" rel="noopener noreferrer" className="underline truncate">
        {filePart.name || "File attachment"}
      </a>
      {mime && <span className="text-muted-foreground">({mime})</span>}
    </div>
  );
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const { switchToRawHttp } = useUIStore();
  const getLogByChatMessageId = useHttpLogStore((state) => state.getLogByChatMessageId);

  const httpLog =
    getLogByChatMessageId(message.id) ||
    (message.linkedChatMessageId ? getLogByChatMessageId(message.linkedChatMessageId) : null);

  const handleViewHttp = () => {
    if (httpLog) {
      switchToRawHttp(httpLog.id);
    }
  };

  // Extract text content
  const textParts = message.parts.filter(isTextPart);
  const dataParts = message.parts.filter(isDataPart);
  const fileParts = message.parts.filter(isFilePart);
  const fullText = textParts
    .map((p) => {
      // Wrap structured media types in fenced code blocks for syntax highlighting
      const lang = mediaTypeToLang(p.mediaType);
      if (lang) return `\n\`\`\`${lang}\n${p.text}\n\`\`\``;
      return p.text;
    })
    .join("\n");

  const handleCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn("group flex mb-3 min-w-0", isUser ? "justify-end" : "justify-start")} data-testid={isUser ? "message-user" : "message-agent"}>
      <div className={cn("flex items-end gap-1 min-w-0 max-w-full", isUser ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2 min-w-0 overflow-hidden",
            isUser ? "chat-user-bubble rounded-br-sm bg-[#999]! dark:bg-[#0079cc]! text-primary-foreground" : "rounded-bl-sm bg-muted",
          )}>
          {message.status && (
            <div className="flex items-center gap-1.5 mb-2">
              <Badge
                variant={
                  message.status === "completed" ? "default" : message.status === "failed" ? "error" : message.status === "auth-required" ? "error" : "secondary"
                }>
                {message.status}
              </Badge>
              {!isUser && message.compliant === true && (
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 text-xs text-success hover:underline cursor-pointer"
                  onClick={() => setShowCompliance((v) => !v)}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  compliant
                  {message.complianceDetails && (
                    showCompliance ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
              {!isUser && message.compliant === false && (
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 text-xs text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                  onClick={() => setShowCompliance((v) => !v)}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  non-compliant
                  {message.complianceDetails && (
                    showCompliance ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Compliance details */}
          {showCompliance && message.complianceDetails && (
            <div className="mb-2 rounded bg-background/50 p-2 text-xs space-y-0.5">
              {message.complianceDetails.map((result, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  {result.passed ? (
                    <CheckCircle className="h-3 w-3 mt-0.5 shrink-0 text-success" />
                  ) : (
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
                  )}
                  <span className={cn(!result.passed && "text-orange-600 dark:text-orange-400")}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Text parts */}
          {fullText &&
            (isUser ? (
              isJsonLike(fullText) ? (
                <JsonHighlight code={JSON.stringify(JSON.parse(fullText.trim()), null, 2)} className="bg-black/20! text-primary-foreground!" showCopy />
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{fullText}</p>
              )
            ) : message.status === "failed" ? (
              <p className="text-sm whitespace-pre-wrap break-words">{fullText}</p>
            ) : (
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none [word-break:break-word] [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all prose-p:my-1! prose-headings:my-2! prose-ul:my-1! prose-ol:my-1! prose-li:my-0! prose-pre:my-2! prose-code:bg-background/50! prose-code:px-1! prose-code:rounded! prose-code:before:content-none! prose-code:after:content-none!">
                <ReactMarkdown components={{ code: CodeBlock, pre: PreBlock }}>{fullText}</ReactMarkdown>
              </div>
            ))}

          {/* Data parts */}
          {dataParts.map((part, index) => (
            <JsonHighlight
              key={`data-${index}`}
              code={JSON.stringify(part.data, null, 2)}
              className="mt-2 rounded bg-background/50! p-2 text-[11px]"
              showCopy
            />
          ))}

          {/* File parts */}
          {fileParts.map((part, index) => {
            const file = typeof part.file === "string" ? { uri: part.file } : part.file;
            return <FilePartView key={`file-${index}`} file={file} />;
          })}

          {/* Streaming indicator */}
          {message.isStreaming && (
            <Loader2 className="h-3 w-3 mt-1 animate-spin text-muted-foreground" />
          )}

          <time className="mt-1 block text-[10px] opacity-50">{message.timestamp.toLocaleTimeString()}</time>
        </div>

        {/* Action buttons - hidden while streaming, always visible on mobile */}
        {!message.isStreaming && (
          <div className="flex flex-col gap-0.5 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
            {fullText && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copy message">
                {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </Button>
            )}
            {httpLog && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleViewHttp}
                title="Go to HTTP Raw request">
                <FileText className="h-3 w-3" />
              </Button>
            )}
            {isUser && onRetry && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRetry} title="Retry message">
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
