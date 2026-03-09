import { useChatStore } from "@lib/stores/chatStore";
import { useHttpLogStore } from "@lib/stores/httpLogStore";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useUIStore } from "@lib/stores/uiStore";
import type { PredefinedAgent } from "@lib/types/connection";

/**
 * Shared agent selection flow used by AgentSelector and PredefinedAgents.
 * Accesses Zustand stores via getState() so it can be called outside React components.
 */
export async function selectPredefinedAgent(
  agent: PredefinedAgent,
  options?: {
    connectHeaders?: Record<string, string>;
    resetCard?: boolean;
    closeSettingsPanel?: boolean;
  },
): Promise<void> {
  const { resetCard = true, closeSettingsPanel: shouldCloseSettings = false, connectHeaders } = options ?? {};

  // Clear chat and HTTP logs
  useChatStore.getState().clearChat();
  useHttpLogStore.getState().clearLogs();

  // Reset agent card if requested
  if (resetCard) {
    useAgentCardStore.getState().reset();
  }

  // Select agent and configure connection
  usePredefinedAgentsStore.getState().select(agent.id);
  useConnectionStore.getState().setFromPredefined(agent);

  // Connect and process the card
  const card = await useConnectionStore.getState().connect(connectHeaders);
  if (card) {
    useAgentCardStore.getState().setRawJson(JSON.stringify(card, null, 2));
    useConnectionStore.getState().autoConfigureAuth(card);
    useUIStore.getState().setMobileView("card");

    if (shouldCloseSettings) {
      useUIStore.getState().closeSettingsPanel();
    }
  }
}
