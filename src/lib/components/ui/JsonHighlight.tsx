import { useState, useMemo } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { Copy, Check } from "lucide-react";
import { cn } from "@lib/utils/cn";

// Register languages for highlight.js (used here and by CodeBlock in ChatMessage)
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);

interface JsonHighlightProps {
  code: string;
  className?: string;
  showCopy?: boolean;
}

export function JsonHighlight({ code, className, showCopy = false }: JsonHighlightProps) {
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language: "json" }).value;
    } catch {
      return code;
    }
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative", showCopy && "group/code")}>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-1.5 right-1.5 inline-flex items-center text-muted-foreground hover:text-foreground cursor-pointer z-10 rounded p-1 hover:bg-accent/50 opacity-0 group-hover/code:opacity-100 transition-opacity"
          title="Copy">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      <pre className={cn("overflow-x-auto rounded bg-muted! p-2 text-[11px]", className)}>
        <code className="hljs language-json" dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
    </div>
  );
}
