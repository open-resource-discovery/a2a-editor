import { useEffect, useRef } from "react";
import Editor, { useMonaco, type OnMount } from "@monaco-editor/react";
import { useTheme } from "@lib/hooks/useTheme";

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  lineNumbers?: "on" | "off";
  minHeight?: string;
}

export function MonacoEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  lineNumbers = "on",
  minHeight = "300px",
}: MonacoEditorProps) {
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Define custom themes when Monaco loads
  useEffect(() => {
    if (!monaco) return;

    // Define dark theme matching the app
    monaco.editor.defineTheme("app-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editor.selectionBackground": "#264f78",
        "editor.lineHighlightBackground": "#2a2d2e",
      },
    });

    // Define light theme matching the app
    monaco.editor.defineTheme("app-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1e1e1e",
        "editorLineNumber.foreground": "#237893",
        "editor.selectionBackground": "#add6ff",
        "editor.lineHighlightBackground": "#f5f5f5",
      },
    });
  }, [monaco]);

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current && monaco) {
      monaco.editor.setTheme(resolvedTheme === "dark" ? "app-dark" : "app-light");
    }
  }, [resolvedTheme, monaco]);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoInstance.editor.setTheme(resolvedTheme === "dark" ? "app-dark" : "app-light");
  };

  return (
    <div style={{ minHeight }} className="h-full w-full">
      <Editor
        value={value}
        onChange={(v) => onChange?.(v || "")}
        language={language}
        theme={resolvedTheme === "dark" ? "app-dark" : "app-light"}
        options={{
          readOnly,
          minimap: { enabled: false },
          automaticLayout: true,
          fontSize: 13,
          lineNumbers,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          renderLineHighlight: "line",
          padding: { top: 8, bottom: 8 },
        }}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}
