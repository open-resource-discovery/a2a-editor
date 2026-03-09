import { create } from "zustand";
import { useHttpLogStore } from "./httpLogStore";

type ActiveTab = "overview" | "chat" | "validation" | "rawhttp";
type MobileView = "selector" | "card" | "json";

interface UIState {
  settingsPanelOpen: boolean;
  validationPanelOpen: boolean;
  activeTab: ActiveTab;
  mobileView: MobileView;

  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setValidationPanelOpen: (open: boolean) => void;
  closeAllPanels: () => void;
  setActiveTab: (tab: ActiveTab) => void;
  setMobileView: (view: MobileView) => void;
  switchToChat: () => void;
  switchToRawHttp: (logId?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  settingsPanelOpen: false,
  validationPanelOpen: false,
  activeTab: "overview",
  mobileView: "selector",

  openSettingsPanel: () => set({ settingsPanelOpen: true }),
  closeSettingsPanel: () => set({ settingsPanelOpen: false }),
  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),
  setValidationPanelOpen: (open) => set({ validationPanelOpen: open }),
  closeAllPanels: () => set({ settingsPanelOpen: false, validationPanelOpen: false }),

  setActiveTab: (tab) => set({ activeTab: tab, mobileView: "card" }),

  setMobileView: (view) => set({ mobileView: view }),

  switchToChat: () =>
    set({
      activeTab: "chat",
      mobileView: "card",
    }),

  switchToRawHttp: (logId) => {
    if (logId) {
      useHttpLogStore.getState().highlightLog(logId);
    }
    set({
      activeTab: "rawhttp",
      mobileView: "card",
    });
  },
}));
