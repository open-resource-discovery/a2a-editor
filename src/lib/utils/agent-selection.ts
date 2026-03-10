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
    closeSettingsPanel?: boolean;
  },
): Promise<void> {
  const { closeSettingsPanel: shouldCloseSettings = false, connectHeaders } = options ?? {};

  // Clear chat and HTTP logs
  useChatStore.getState().clearChat();
  useHttpLogStore.getState().clearLogs();

  // Select agent and configure connection
  usePredefinedAgentsStore.getState().select(agent.id);
  useConnectionStore.getState().setFromPredefined(agent);

  // Auto-fetch OAuth2 token for connection if agent has client credentials but no access token
  const connState = useConnectionStore.getState();
  if (
    connState.authType === "oauth2" &&
    !connState.oauth2Credentials.accessToken &&
    connState.oauth2Credentials.tokenUrl &&
    connState.oauth2Credentials.clientId
  ) {
    await connState.fetchOAuth2Token();
  }

  // Connect and process the card
  // Keep the old card visible while fetching; replace atomically on success
  const card = await useConnectionStore.getState().connect(connectHeaders);
  if (card) {
    useAgentCardStore.getState().setRawJson(JSON.stringify(card, null, 2));
    useConnectionStore.getState().autoConfigureAuth(card);
    useUIStore.getState().setMobileView("card");

    if (shouldCloseSettings) {
      useUIStore.getState().closeSettingsPanel();
    }
  } else {
    // Connection failed — clear stale card but preserve connection URL + error state
    // so the user can see ConnectionSection and fix auth
    useAgentCardStore.setState({
      rawJson: "",
      parsedCard: null,
      parseError: null,
      isDirty: false,
    });
  }
}
