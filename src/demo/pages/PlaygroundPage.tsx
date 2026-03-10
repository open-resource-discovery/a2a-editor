import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AgentPlayground } from "@lib/components/AgentPlayground";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useChatStore } from "@lib/stores/chatStore";
import { useHttpLogStore } from "@lib/stores/httpLogStore";

export function PlaygroundPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentId = searchParams.get("agent");
  const selectedId = usePredefinedAgentsStore((s) => s.selectedId);

  const { agents, loadDefaults, select } = usePredefinedAgentsStore();
  const { setFromPredefined, connect, autoConfigureAuth } = useConnectionStore();
  const { setRawJson } = useAgentCardStore();
  const { clearChat } = useChatStore();
  const { clearLogs } = useHttpLogStore();

  // Track whether we're updating the URL ourselves to avoid re-triggering load
  const isUpdatingUrl = useRef(false);

  // Sync selectedId → URL param
  useEffect(() => {
    const currentParam = searchParams.get("agent");
    if (selectedId && selectedId !== currentParam) {
      isUpdatingUrl.current = true;
      setSearchParams({ agent: selectedId }, { replace: true });
    } else if (!selectedId && currentParam) {
      isUpdatingUrl.current = true;
      const next = new URLSearchParams(searchParams);
      next.delete("agent");
      setSearchParams(next, { replace: true });
    }
  }, [selectedId, searchParams, setSearchParams]);

  // Load agent from URL params
  useEffect(() => {
    if (!agentId) return;

    // Skip if we're the ones updating the URL
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false;
      return;
    }

    // Skip if this agent is already selected
    const currentSelectedId = usePredefinedAgentsStore.getState().selectedId;
    if (currentSelectedId === agentId) return;

    const loadAgent = async () => {
      if (agents.length === 0) {
        await loadDefaults();
      }

      const agent = usePredefinedAgentsStore.getState().agents.find((a) => a.id === agentId);
      if (agent) {
        // Clear chat and HTTP logs when loading a new agent
        clearChat();
        clearLogs();

        select(agentId);
        setFromPredefined(agent);

        const card = await connect();
        if (card) {
          setRawJson(JSON.stringify(card, null, 2));
          autoConfigureAuth(card);
        }
      }
    };

    loadAgent();
  }, [
    agentId,
    agents.length,
    autoConfigureAuth,
    clearChat,
    clearLogs,
    connect,
    loadDefaults,
    select,
    setFromPredefined,
    setRawJson,
  ]);

  return <AgentPlayground className="h-full" />;
}
