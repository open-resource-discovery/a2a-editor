import type { AgentCard } from "@lib/types/a2a";
import { Badge, InfoCard } from "@open-resource-discovery/ui-components";
import { User } from "lucide-react";

interface AgentHeaderProps {
  card: AgentCard;
}

export function AgentHeader({ card }: AgentHeaderProps) {
  return (
    <InfoCard.Header data-testid="agent-header">
      <InfoCard.Icon>
        {card.iconUrl ? (
          <img src={card.iconUrl} alt={card.name} className="h-full w-full rounded-lg object-cover" />
        ) : (
          <User className="h-5 w-5 text-muted-foreground" />
        )}
      </InfoCard.Icon>
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <InfoCard.Title className="truncate m-0" data-testid="agent-name">
            {card.name}
          </InfoCard.Title>
          {card.version && (
            <Badge variant="outline" className="shrink-0" data-testid="agent-version">
              v{card.version}
            </Badge>
          )}
        </div>
        {card.supportedInterfaces && card.supportedInterfaces.length > 0 ? (
          <InfoCard.Subtitle>
            Protocol: {card.supportedInterfaces.map((i) => `${i.protocolVersion} (${i.protocolBinding})`).join(", ")}
          </InfoCard.Subtitle>
        ) : card.protocolVersions && card.protocolVersions.length > 0 ? (
          <InfoCard.Subtitle>Protocol: {card.protocolVersions.join(", ")}</InfoCard.Subtitle>
        ) : null}
      </div>
    </InfoCard.Header>
  );
}
