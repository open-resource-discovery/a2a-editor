import { create } from "zustand";
import { getStoredJson, setStoredJson } from "@lib/utils/local-storage";

const STORAGE_KEY = "a2a-editor-settings";

interface EditorSettingsState {
  autoValidate: boolean;
  setAutoValidate: (value: boolean) => void;
}

export const useEditorSettingsStore = create<EditorSettingsState>((set) => ({
  autoValidate: getStoredJson<{ autoValidate: boolean }>(STORAGE_KEY, {
    autoValidate: true,
  }).autoValidate,
  setAutoValidate: (value) => {
    setStoredJson(STORAGE_KEY, { autoValidate: value });
    set({ autoValidate: value });
  },
}));
