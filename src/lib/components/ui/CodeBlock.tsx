import { useState, useMemo } from "react";
import hljs from "highlight.js/lib/core";
import { Copy, Check } from "lucide-react";

// Languages are registered in JsonHighlight.tsx (json, xml, yaml)
// which is imported alongside this component in ChatMessage.tsx

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Custom code component for ReactMarkdown.
 * Fenced code blocks (``` ```lang ```) get syntax highlighting via highlight.js.
 * Inline code (`` `code` ``) renders as a plain <code> element.
 */
export function CodeBlock({ className, children }: CodeBlockProps) {
  const code = String(children).replace(/\n$/, "");

  // ReactMarkdown sets className="language-xxx" for fenced code blocks
  const langMatch = className?.match(/language-(\w+)/);
  const lang = langMatch?.[1];
  const isFenced = !!className;

  const highlighted = useMemo(() => {
    if (!isFenced) return null;
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      // For unlabeled fenced blocks, try auto-detection
      const result = hljs.highlightAuto(code);
      if (result.relevance > 5) {
        return result.value;
      }
      return null;
    } catch {
      return null;
    }
  }, [code, lang, isFenced]);

  // Inline code — no highlighting
  if (!isFenced) {
    return <code className={className}>{children}</code>;
  }

  // Fenced code block with highlighting
  if (highlighted) {
    return (
      <code
        className={`hljs ${className ?? ""}`}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    );
  }

  // Fenced code block without highlighting (unrecognized language)
  return <code className={className}>{children}</code>;
}

/**
 * Custom pre component for ReactMarkdown.
 * Wraps fenced code blocks with a copy button in the top-right corner.
 */
export function PreBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);

  // Extract the raw text from the nested <code> element for copying
  const rawText = extractText(children);

  const handleCopy = async () => {
    if (!rawText) return;
    await navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 inline-flex items-center text-muted-foreground hover:text-foreground cursor-pointer z-10 rounded p-1 hover:bg-accent/50 opacity-0 group-hover/code:opacity-100 transition-opacity"
        title="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre {...props}>{children}</pre>
    </div>
  );
}

/** Recursively extract text content from React children. */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    return extractText(el.props.children);
  }
  return "";
}
