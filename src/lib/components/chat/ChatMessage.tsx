import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage as ChatMessageType } from "@lib/types/chat";
import { isTextPart, isDataPart, isFilePart } from "@lib/types/a2a";
import { cn } from "@lib/utils/cn";
import { Copy, Check, RotateCcw, FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@lib/components/ui/badge";
import { Button } from "@lib/components/ui/button";
import { useUIStore } from "@lib/stores/uiStore";
import { useHttpLogStore } from "@lib/stores/httpLogStore";

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
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
  const fullText = textParts.map((p) => p.text).join("\n");

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
    <div className={cn("group flex mb-3 min-w-0", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex items-end gap-1 min-w-0 max-w-full", isUser ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2 min-w-0 overflow-hidden",
            isUser ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
          )}>
          {message.status && (
            <div className="flex items-center gap-1.5 mb-2">
              <Badge
                variant={
                  message.status === "completed" ? "default" : message.status === "failed" ? "error" : "secondary"
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
              <p className="text-sm whitespace-pre-wrap break-words">{fullText}</p>
            ) : message.status === "failed" ? (
              <p className="text-sm whitespace-pre-wrap break-words">{fullText}</p>
            ) : (
              <div className="text-sm prose prose-sm dark:prose-invert max-w-none [word-break:break-word] [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:bg-background/50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown>{fullText}</ReactMarkdown>
              </div>
            ))}

          {/* Data parts */}
          {dataParts.map((part, index) => (
            <pre key={`data-${index}`} className="mt-2 overflow-x-auto rounded bg-background/50 p-2 text-xs">
              {JSON.stringify(part.data, null, 2)}
            </pre>
          ))}

          {/* File parts */}
          {fileParts.map((part, index) => {
            const file = typeof part.file === "string" ? { uri: part.file } : part.file;
            return (
              <div key={`file-${index}`} className="mt-2">
                <a href={file.uri} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                  {file.name || "File attachment"}
                </a>
              </div>
            );
          })}

          <time className="mt-1 block text-[10px] opacity-50">{message.timestamp.toLocaleTimeString()}</time>
        </div>

        {/* Action buttons - on the side, always visible on mobile */}
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
      </div>
    </div>
  );
}
