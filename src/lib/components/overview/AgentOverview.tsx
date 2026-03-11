import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { AgentHeader } from "./sections/AgentHeader";
import { ConnectionSection } from "./sections/ConnectionSection";
import { CapabilitiesSection } from "./sections/CapabilitiesSection";
import { SkillsSection } from "./sections/SkillsSection";
import { SecuritySection } from "./sections/SecuritySection";
import { ModesSection } from "./sections/ModesSection";

interface AgentOverviewProps {
  disableExamplePrompts?: boolean;
  readOnly?: boolean;
  showConnection?: boolean;
}

export function AgentOverview({
  disableExamplePrompts = false,
  readOnly = false,
  showConnection = true,
}: AgentOverviewProps) {
  const card = useAgentCardStore((state) => state.parsedCard);
  const { url, connectionStatus } = useConnectionStore();

  if (!card) {
    // In read-only mode, don't show connection section
    if (readOnly) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
          <div>
            <p className="text-lg font-medium">No Agent Card</p>
            <p className="text-sm">No agent card data available to display.</p>
          </div>
        </div>
      );
    }

    // Show connection section when there's a URL (e.g. secured agent failed to fetch)
    if (showConnection && (url || connectionStatus === "error")) {
      return (
        <div className="space-y-4 p-4">
          <ConnectionSection />
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Could not load agent card. The endpoint may require authentication.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
        <div>
          <p className="text-lg font-medium">No Agent Card</p>
          <p className="text-sm">Enter valid JSON in the editor or connect to an agent to see the overview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <AgentHeader card={card} />
      {!readOnly && showConnection && <ConnectionSection />}
      {card.securitySchemes && Object.keys(card.securitySchemes).length > 0 && (
        <SecuritySection schemes={card.securitySchemes} readOnly={readOnly} />
      )}
      <CapabilitiesSection capabilities={card.capabilities} />
      <ModesSection card={card} />
      {card.skills && card.skills.length > 0 && (
        <SkillsSection skills={card.skills} disableExamplePrompts={disableExamplePrompts} readOnly={readOnly} />
      )}
    </div>
  );
}
