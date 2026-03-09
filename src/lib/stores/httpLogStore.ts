import { create } from "zustand";
import type { HttpLogEntry } from "@lib/types/httpLog";

const MAX_LOG_ENTRIES = 50;

interface HttpLogState {
  logs: HttpLogEntry[];
  highlightedLogId: string | null;

  addLog: (entry: HttpLogEntry) => void;
  clearLogs: () => void;
  highlightLog: (logId: string | null) => void;
  getLogByChatMessageId: (chatMessageId: string) => HttpLogEntry | undefined;
}

export const useHttpLogStore = create<HttpLogState>((set, get) => ({
  logs: [],
  highlightedLogId: null,

  addLog: (entry) =>
    set((state) => ({
      logs: [entry, ...state.logs].slice(0, MAX_LOG_ENTRIES),
    })),

  clearLogs: () => set({ logs: [], highlightedLogId: null }),

  highlightLog: (logId) => set({ highlightedLogId: logId }),

  getLogByChatMessageId: (chatMessageId) => {
    return get().logs.find((log) => log.chatMessageId === chatMessageId);
  },
}));
