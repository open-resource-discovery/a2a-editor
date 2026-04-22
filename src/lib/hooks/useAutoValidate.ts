import { useEffect, useRef } from "react";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useEditorSettingsStore } from "@lib/stores/editorSettingsStore";
import { useValidationStore } from "@lib/stores/validationStore";

export function useAutoValidate() {
  const rawJson = useAgentCardStore((s) => s.rawJson);
  const autoValidate = useEditorSettingsStore((s) => s.autoValidate);
  const validate = useValidationStore((s) => s.validate);
  const clear = useValidationStore((s) => s.clear);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autoValidate || !rawJson.trim()) {
      clear();
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      validate(rawJson);
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [rawJson, autoValidate, validate, clear]);
}
