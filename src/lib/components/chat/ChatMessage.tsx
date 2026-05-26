import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@lib/types/chat";
import { isTextPart, isDataPart, isFilePart } from "@lib/types/a2a";
import { ChatMessage as ChatMessageShell, Badge, Spinner, CodeBlock, MarkdownText } from "@open-resource-discovery/ui-components";
import { FileText, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@lib/utils/cn";
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

  const textParts = message.parts.filter(isTextPart);
  const dataParts = message.parts.filter(isDataPart);
  const fileParts = message.parts.filter(isFilePart);
  const fullText = textParts
    .map((p) => {
      const lang = mediaTypeToLang(p.mediaType);
      if (lang) return `\n\`\`\`${lang}\n${p.text}\n\`\`\``;
      return p.text;
    })
    .join("\n");

  const handleCopy = async () => {
    if (!fullText) return;
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const statusNode = message.status ? (
    <div className="flex items-center gap-1.5">
      <Badge
        variant={
          message.status === "completed" ? "default"
          : message.status === "failed" ? "destructive"
          : message.status === "auth-required" ? "destructive"
          : "secondary"
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
          {message.complianceDetails && (showCompliance ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
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
          {message.complianceDetails && (showCompliance ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <ChatMessageShell
      role={isUser ? "user" : "agent"}
      timestamp={message.timestamp}
      onCopy={fullText ? handleCopy : undefined}
      onRetry={isUser && onRetry ? onRetry : undefined}
      status={statusNode}
      data-testid={isUser ? "message-user" : "message-agent"}
      className="mb-3"
    >
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

      {fullText && (
        isUser ? (
          isJsonLike(fullText) ? (
            <CodeBlock code={JSON.stringify(JSON.parse(fullText.trim()), null, 2)} language="json" className="text-[11px]" />
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{fullText}</p>
          )
        ) : message.status === "failed" ? (
          <p className="text-sm whitespace-pre-wrap break-words">{fullText}</p>
        ) : (
          <MarkdownText text={fullText} />
        )
      )}

      {dataParts.map((part, index) => (
        <CodeBlock
          key={`data-${index}`}
          code={JSON.stringify(part.data, null, 2)}
          language="json"
          className="mt-2 text-[11px]"
        />
      ))}

      {fileParts.map((part, index) => {
        const file = typeof part.file === "string" ? { uri: part.file } : part.file;
        return <FilePartView key={`file-${index}`} file={file} />;
      })}

      {message.isStreaming && (
        <Spinner className="h-3 w-3 mt-1 text-muted-foreground" />
      )}

      {httpLog && (
        <button
          type="button"
          onClick={handleViewHttp}
          className="mt-1 text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
        >
          View HTTP log ↗
        </button>
      )}
    </ChatMessageShell>
  );
}
