import { create } from "zustand";
import type { AgentCard } from "@lib/types/a2a";
import { isMockUrl, getMockAgentCard } from "@lib/mock/agents";
import { usePredefinedAgentsStore } from "./predefinedAgentsStore";
import { useConnectionStore } from "./connectionStore";
import { useHttpLogStore } from "./httpLogStore";
import { normalizeAgentCard, detectProtocolVersion } from "@lib/utils/a2a-protocol";

// Helper to parse JSON, normalize for version compat, and extract card/error
function parseAgentCard(json: string): {
  card: AgentCard | null;
  error: string | null;
} {
  if (!json.trim()) {
    return { card: null, error: null };
  }
  try {
    const raw = JSON.parse(json);
    const card = normalizeAgentCard(raw) as AgentCard;

    // Update protocol version in connection store
    const version = detectProtocolVersion(raw);
    const connectionStore = useConnectionStore.getState();
    if (connectionStore.protocolVersion !== version) {
      useConnectionStore.setState({ protocolVersion: version });
    }

    return { card, error: null };
  } catch (err) {
    return {
      card: null,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}

interface AgentCardState {
  rawJson: string;
  parsedCard: AgentCard | null;
  lastValidCard: AgentCard | null;
  parseError: string | null;
  isLoading: boolean;
  isDirty: boolean;
  setRawJson: (json: string) => void;
  formatJson: () => void;
  reset: () => void;
  loadFromUrl: (url: string, headers?: Record<string, string>) => Promise<void>;
}

export const useAgentCardStore = create<AgentCardState>((set, get) => ({
  rawJson: "",
  parsedCard: null,
  lastValidCard: null,
  parseError: null,
  isLoading: false,
  isDirty: false,

  setRawJson: (json) => {
    const { card, error } = parseAgentCard(json);
    const updates: Partial<AgentCardState> = { rawJson: json, parsedCard: card, parseError: error, isDirty: true };
    if (card) updates.lastValidCard = card;
    set(updates);

    // Deselect predefined agent and reset connection when editor is cleared
    if (!json.trim()) {
      set({ lastValidCard: null });
      usePredefinedAgentsStore.getState().deselect();
      useHttpLogStore.getState().clearLogs();
      useConnectionStore.getState().disconnect();
      useConnectionStore.getState().setUrl("");
    }

    // Auto-configure connection when a valid card is parsed
    if (card) {
      const connectionStore = useConnectionStore.getState();
      // Set messaging URL from card if available
      if (card.url) {
        connectionStore.setMessagingUrl(card.url);
      }
      // Auto-configure auth from security schemes
      connectionStore.autoConfigureAuth(card);
    }
  },

  formatJson: () => {
    const { parsedCard } = get();
    if (parsedCard) {
      set({ rawJson: JSON.stringify(parsedCard, null, 2) });
    }
  },

  reset: () => {
    set({
      rawJson: "",
      parsedCard: null,
      lastValidCard: null,
      parseError: null,
      isDirty: false,
      isLoading: false,
    });
    useConnectionStore.getState().disconnect();
    useConnectionStore.getState().setUrl("");
  },

  loadFromUrl: async (url, headers = {}) => {
    const connectionStore = useConnectionStore.getState();
    connectionStore.setUrl(url);

    set({ isLoading: true, parseError: null });
    try {
      // Handle mock agents client-side
      if (isMockUrl(url)) {
        const card = getMockAgentCard(url);
        if (!card) throw new Error("Mock agent not found");
        const json = JSON.stringify(card, null, 2);
        set({
          rawJson: json,
          parsedCard: card,
          lastValidCard: card,
          parseError: null,
          isDirty: false,
        });
        if (card.url) {
          connectionStore.setMessagingUrl(card.url);
        }
        connectionStore.autoConfigureAuth(card);
        return;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);

      // Detect version and normalize
      const version = detectProtocolVersion(data);
      const card = normalizeAgentCard(data) as AgentCard;
      if (card.url) {
        connectionStore.setMessagingUrl(card.url);
      }
      useConnectionStore.setState({ protocolVersion: version });

      set({
        rawJson: json,
        parsedCard: card,
        lastValidCard: card,
        parseError: null,
        isDirty: false,
      });
      connectionStore.autoConfigureAuth(card);
    } catch (err) {
      set({
        parseError:
          err instanceof Error ? err.message : "Failed to load agent card",
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Selectors - these now just return stored state (no computation)
export const selectParsedCard = (state: AgentCardState): AgentCard | null =>
  state.parsedCard;
export const selectParseError = (state: AgentCardState): string | null =>
  state.parseError;
