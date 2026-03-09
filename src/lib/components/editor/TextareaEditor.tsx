import { useCallback, useEffect, useState } from "react";
import { cn } from "@lib/utils/cn";

interface TextareaEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function TextareaEditor({
  value,
  onChange,
  readOnly = false,
  className,
}: TextareaEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Validate JSON on change
  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue);

      // Validate JSON
      try {
        if (newValue.trim()) {
          JSON.parse(newValue);
        }
        setError(null);
      } catch (e) {
        if (e instanceof SyntaxError) {
          setError(e.message);
        }
      }

      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <textarea
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        className={cn(
          "h-full w-full flex-1 resize-none bg-background p-4 font-mono text-sm",
          "focus:outline-none focus:ring-0",
          "border-0",
          readOnly && "cursor-default opacity-75",
          error && "border-b-2 border-b-destructive"
        )}
        placeholder="Paste or type agent card JSON here..."
      />
      {error && (
        <div className="border-t bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <span className="font-medium">JSON Error:</span> {error}
        </div>
      )}
    </div>
  );
}
