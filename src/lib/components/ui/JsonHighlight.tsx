import { useMemo } from "react";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";
import { cn } from "@lib/utils/cn";

// Register JSON language
hljs.registerLanguage("json", json);

interface JsonHighlightProps {
  code: string;
  className?: string;
}

export function JsonHighlight({ code, className }: JsonHighlightProps) {
  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language: "json" }).value;
    } catch {
      return code;
    }
  }, [code]);

  return (
    <pre
      className={cn(
        "overflow-x-auto rounded bg-muted p-2 text-[11px]",
        className
      )}
    >
      <code
        className="hljs language-json"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </pre>
  );
}
