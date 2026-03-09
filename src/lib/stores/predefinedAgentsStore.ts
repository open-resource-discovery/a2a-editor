import { create } from "zustand";
import type { PredefinedAgent } from "@lib/types/connection";
import { getStoredJson, setStoredJson } from "@lib/utils/local-storage";

interface PredefinedAgentsState {
  agents: PredefinedAgent[];
  selectedId: string | null;

  loadDefaults: () => Promise<void>;
  addCustomAgent: (agent: PredefinedAgent) => void;
  removeAgent: (id: string) => void;
  select: (id: string) => void;
  deselect: () => void;
}

// Predefined agents can be provided as a JSON array via VITE_PREDEFINED_AGENTS
// env var. When set, the store uses it directly instead of fetching the JSON file.
const ENV_AGENTS = import.meta.env.VITE_PREDEFINED_AGENTS ?? "";

// Get base URL for assets at runtime so standalone bundles work when hosted
// on any path. Derives the URL from the script tag that loaded the bundle.
function getBaseUrl(): string {
  if (typeof document !== "undefined") {
    const scripts = document.querySelectorAll('script[src*="a2a-playground"]');
    if (scripts.length > 0) {
      const src = (scripts[scripts.length - 1] as HTMLScriptElement).src;
      return src.substring(0, src.lastIndexOf("/") + 1);
    }
  }
  return import.meta.env.BASE_URL;
}

export const usePredefinedAgentsStore = create<PredefinedAgentsState>(
  (set) => ({
    agents: [],
    selectedId: null,

    loadDefaults: async () => {
      let defaults: PredefinedAgent[] = [];

      if (ENV_AGENTS) {
        try {
          defaults = JSON.parse(ENV_AGENTS);
        } catch {
          // Invalid JSON — fall through to fetch
        }
      }

      if (defaults.length === 0) {
        try {
          const res = await fetch(`${getBaseUrl()}predefined-agents.json`);
          if (res.ok) {
            defaults = await res.json();
          }
        } catch {
          // Silent fail - predefined agents are optional
        }
      }

      const custom: PredefinedAgent[] = getStoredJson("a2a-custom-agents", []);
      set({ agents: [...custom, ...defaults] });
    },

    addCustomAgent: (agent) => {
      set((state) => {
        // Prevent duplicate IDs
        if (state.agents.some((a) => a.id === agent.id)) {
          return state;
        }
        const newAgents = [...state.agents, agent];
        persistCustom(newAgents);
        return { agents: newAgents };
      });
    },

    removeAgent: (id) => {
      set((state) => {
        const newAgents = state.agents.filter((a) => a.id !== id);
        persistCustom(newAgents);
        return { agents: newAgents };
      });
    },

    select: (id) => set({ selectedId: id }),

    deselect: () => set({ selectedId: null }),
  }),
);

function persistCustom(agents: PredefinedAgent[]) {
  const custom = agents.filter((a) => a.id.startsWith("custom-"));
  setStoredJson("a2a-custom-agents", custom);
}

// Selector for selected agent
export const selectSelectedAgent = (
  state: PredefinedAgentsState,
): PredefinedAgent | null => {
  return state.agents.find((a) => a.id === state.selectedId) ?? null;
};
