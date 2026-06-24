import { useEffect } from "react";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";
import { ConnectionCard, Badge } from "@open-resource-discovery/ui-components";
import { selectPredefinedAgent } from "@lib/utils/agent-selection";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function AgentSelector() {
  const agents = usePredefinedAgentsStore((s) => s.agents);
  const selectedId = usePredefinedAgentsStore((s) => s.selectedId);
  const loadDefaults = usePredefinedAgentsStore((s) => s.loadDefaults);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const handleSelectAgent = async (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;

    try {
      await selectPredefinedAgent(agent);
    } catch {
      // Connection errors are handled in the connection store
    }
  };

  if (agents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
        <p className="text-sm">Loading agents...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xs">
          <h2 className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Select an Agent
          </h2>
          <div className="grid grid-cols-2 gap-2" role="list">
            {agents.map((agent) => (
              <ConnectionCard
                key={agent.id}
                role="listitem"
                tabIndex={0}
                aria-selected={selectedId === agent.id}
                selected={selectedId === agent.id}
                className="text-center p-3"
                onClick={() => handleSelectAgent(agent.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectAgent(agent.id);
                  }
                }}
              >
                <ConnectionCard.Header className="justify-center">
                  <ConnectionCard.Title className="truncate">{agent.name}</ConnectionCard.Title>
                </ConnectionCard.Header>
                <ConnectionCard.Description className="truncate">{getHostname(agent.url)}</ConnectionCard.Description>
                {agent.mocked !== false && (
                  <ConnectionCard.Tags className="justify-center">
                    <Badge variant="warning" className="text-[10px] h-4">Mocked LLM</Badge>
                  </ConnectionCard.Tags>
                )}
              </ConnectionCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
