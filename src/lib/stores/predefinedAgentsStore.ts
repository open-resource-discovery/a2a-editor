import { create } from "zustand";
import type { PredefinedAgent } from "@lib/types/connection";
import { getStoredJson, setStoredJson } from "@lib/utils/local-storage";
import { discoverAgentsFromOrd } from "@lib/utils/ord-discovery";

interface PredefinedAgentsState {
  agents: PredefinedAgent[];
  selectedId: string | null;

  loadDefaults: () => Promise<void>;
  loadFromOrd: (url: string, headers?: Record<string, string>) => Promise<number>;
  addCustomAgent: (agent: PredefinedAgent) => void;
  removeAgent: (id: string) => void;
  select: (id: string) => void;
  deselect: () => void;
}

// Predefined agents can be provided as a JSON array via VITE_PREDEFINED_AGENTS
// env var. When set, the store uses it directly instead of fetching the JSON file.
const ENV_AGENTS = import.meta.env.VITE_PREDEFINED_AGENTS ?? "";

// Optional ORD endpoint to auto-discover agents on startup.
const ENV_ORD_URL = import.meta.env.VITE_AGENTS_ORD_URL ?? "";

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
      const ord: PredefinedAgent[] = getStoredJson("a2a-ord-agents", []);

      const allAgents = [...custom, ...ord, ...defaults];
      set({ agents: allAgents });

      if (ENV_ORD_URL) {
        try {
          const discovered = await discoverAgentsFromOrd(ENV_ORD_URL);
          set((state) => {
            const existingUrls = new Set(state.agents.map((a) => a.url));
            const fresh = discovered.filter((a) => !existingUrls.has(a.url));
            if (fresh.length === 0) return state;
            const newAgents = [...state.agents, ...fresh];
            persistOrd(newAgents);
            return { agents: newAgents };
          });
        } catch {
          // Silent fail - ORD discovery is optional
        }
      }
    },

    loadFromOrd: async (url, headers) => {
      const discovered = await discoverAgentsFromOrd(url, headers);
      let added = 0;
      set((state) => {
        const existingUrls = new Set(state.agents.map((a) => a.url));
        const fresh = discovered.filter((a) => !existingUrls.has(a.url));
        added = fresh.length;
        if (fresh.length === 0) return state;
        const newAgents = [...state.agents, ...fresh];
        persistOrd(newAgents);
        return { agents: newAgents };
      });
      return added;
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
        persistOrd(newAgents);
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

function persistOrd(agents: PredefinedAgent[]) {
  const ord = agents.filter((a) => a.id.startsWith("ord-"));
  setStoredJson("a2a-ord-agents", ord);
}

// Selector for selected agent
export const selectSelectedAgent = (
  state: PredefinedAgentsState,
): PredefinedAgent | null => {
  return state.agents.find((a) => a.id === state.selectedId) ?? null;
};
