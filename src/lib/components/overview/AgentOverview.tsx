import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { AgentHeader } from "./sections/AgentHeader";
import { ConnectionSection } from "./sections/ConnectionSection";
import { CapabilitiesSection } from "./sections/CapabilitiesSection";
import { SkillsSection } from "./sections/SkillsSection";
import { SecuritySection } from "./sections/SecuritySection";
import { SecurityRequirementsSection } from "./sections/SecurityRequirementsSection";
import { ModesSection } from "./sections/ModesSection";
import { ExtensionsSection } from "./sections/ExtensionsSection";
import { InfoCard, MarkdownText } from "@open-resource-discovery/ui-components";
import { AlertTriangle, Building, ExternalLink, Globe, User } from "lucide-react";
import type { AgentCard } from "@lib/types/a2a";

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
  const lastValidCard = useAgentCardStore((state) => state.lastValidCard);
  const parseError = useAgentCardStore((state) => state.parseError);
  const { url, connectionStatus } = useConnectionStore();

  // Show last valid card in read-only mode when current JSON is invalid
  if (!card && lastValidCard && parseError) {
    return (
      <div className="space-y-4 p-4 bg-background">
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{parseError}</span>
        </div>
        <InfoCard>
          <AgentHeader card={lastValidCard} />
          <InfoCard.Content>
            <AgentInfoSections card={lastValidCard} />
            {lastValidCard.securitySchemes && Object.keys(lastValidCard.securitySchemes).length > 0 && (
              <SecuritySection schemes={lastValidCard.securitySchemes} readOnly />
            )}
            {lastValidCard.capabilities &&
              typeof lastValidCard.capabilities === "object" &&
              !Array.isArray(lastValidCard.capabilities) && (
                <CapabilitiesSection capabilities={lastValidCard.capabilities} />
              )}
            <ModesSection card={lastValidCard} />
            {lastValidCard.skills && lastValidCard.skills.length > 0 && (
              <SkillsSection skills={lastValidCard.skills} disableExamplePrompts readOnly />
            )}
            {lastValidCard.security && lastValidCard.security.length > 0 && (
              <SecurityRequirementsSection requirements={lastValidCard.security} />
            )}
            {lastValidCard.extensions && lastValidCard.extensions.length > 0 && (
              <ExtensionsSection extensions={lastValidCard.extensions} />
            )}
          </InfoCard.Content>
        </InfoCard>
      </div>
    );
  }

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
    <div className="space-y-4 p-4 bg-background text-foreground h-full">
      <InfoCard>
        <AgentHeader card={card} />
        <InfoCard.Content>
          <AgentInfoSections card={card} />
          {!readOnly && showConnection && <ConnectionSection />}
          {card.securitySchemes && Object.keys(card.securitySchemes).length > 0 && (
            <SecuritySection schemes={card.securitySchemes} readOnly={readOnly} />
          )}
          {card.capabilities && typeof card.capabilities === "object" && !Array.isArray(card.capabilities) && (
            <CapabilitiesSection capabilities={card.capabilities} />
          )}
          <ModesSection card={card} />
          {card.skills && card.skills.length > 0 && (
            <SkillsSection skills={card.skills} disableExamplePrompts={disableExamplePrompts} readOnly={readOnly} />
          )}
          {card.security && card.security.length > 0 && <SecurityRequirementsSection requirements={card.security} />}
          {card.extensions && card.extensions.length > 0 && <ExtensionsSection extensions={card.extensions} />}
        </InfoCard.Content>
      </InfoCard>
    </div>
  );
}

function AgentInfoSections({ card }: { card: AgentCard }) {
  return (
    <>
      {card.description && (
        <InfoCard.Section data-testid="agent-description">
          <MarkdownText text={card.description} clampLines={3} className="text-sm text-muted-foreground" />
        </InfoCard.Section>
      )}

      {card.provider && (
        <InfoCard.Section className="flex-row flex-wrap items-center gap-4">
          {card.provider.name && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{card.provider.name}</span>
            </div>
          )}
          {card.provider.organization && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{card.provider.organization}</span>
            </div>
          )}
          {card.provider.url && card.provider.url.trim() !== "" && (
            <a
              href={card.provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              <ExternalLink className="h-4 w-4" />
              {(() => {
                try {
                  return new URL(card.provider.url).hostname;
                } catch {
                  return card.provider.url;
                }
              })()}
            </a>
          )}
        </InfoCard.Section>
      )}

      {(card.url || card.documentationUrl) && (
        <InfoCard.Section className="flex-row flex-wrap items-center gap-3">
          {card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline truncate">
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{card.url}</span>
            </a>
          )}
          {card.documentationUrl && (
            <a
              href={card.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline">
              <ExternalLink className="h-3 w-3 truncate" />
              Documentation
            </a>
          )}
        </InfoCard.Section>
      )}
    </>
  );
}
