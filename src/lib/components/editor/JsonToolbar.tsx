import { Copy, Wand2, RotateCcw, Check } from "lucide-react";
import { Button } from "@lib/components/ui/button";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { useState } from "react";

export function JsonToolbar() {
  const { rawJson, formatJson, reset } = useAgentCardStore();
  const { validate } = useValidationStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidate = () => {
    if (rawJson.trim()) {
      validate(rawJson);
    }
  };

  return (
    <div className="flex h-10 items-center gap-1 border-b bg-muted/30 px-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={formatJson}
        title="Format JSON"
        disabled={!rawJson.trim()}
        data-testid="toolbar-format"
      >
        <Wand2 className="h-4 w-4" />
        <span className="hidden sm:inline">Format</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        title="Copy to clipboard"
        disabled={!rawJson.trim()}
        data-testid="toolbar-copy"
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleValidate}
        title="Validate"
        disabled={!rawJson.trim()}
        data-testid="toolbar-validate"
      >
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline">Validate</span>
      </Button>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={reset}
        title="Reset"
        disabled={!rawJson.trim()}
        data-testid="toolbar-reset"
      >
        <RotateCcw className="h-4 w-4" />
        <span className="hidden sm:inline">Reset</span>
      </Button>
    </div>
  );
}
