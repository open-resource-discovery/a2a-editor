import { useState } from "react";
import type { AgentCard } from "@lib/types/a2a";
import { Badge } from "@lib/components/ui/badge";
import { Button } from "@lib/components/ui/button";
import { ExternalLink, User, Building, ChevronDown, ChevronUp, Globe } from "lucide-react";

interface AgentHeaderProps {
  card: AgentCard;
}

// Simple markdown-like rendering for descriptions
function renderDescription(text: string) {
  // Simple approach: just render as text with line breaks
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line}
    </span>
  ));
}

export function AgentHeader({ card }: AgentHeaderProps) {
  const [expanded, setExpanded] = useState(false);

  const descriptionTooLong = card.description && card.description.length > 150;
  const displayDescription =
    descriptionTooLong && !expanded ? card.description!.slice(0, 150) + "..." : card.description;

  return (
    <div className="space-y-3" data-testid="agent-header">
      <div className="flex items-start gap-3">
        {card.iconUrl && <img src={card.iconUrl} alt={card.name} className="h-12 w-12 rounded-lg object-cover" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold truncate leading-none" data-testid="agent-name">{card.name}</span>
            <Badge variant="outline" className="shrink-0 translate-y-px" data-testid="agent-version">
              v{card.version}
            </Badge>
          </div>
          {card.supportedInterfaces && card.supportedInterfaces.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              Protocol: {card.supportedInterfaces.map((i) => `${i.protocolVersion} (${i.protocolBinding})`).join(", ")}
            </span>
          ) : card.protocolVersions && card.protocolVersions.length > 0 ? (
            <span className="text-xs text-muted-foreground">Protocol: {card.protocolVersions.join(", ")}</span>
          ) : null}
        </div>
      </div>

      {card.description && (
        <div className="text-sm text-muted-foreground">
          <p>{renderDescription(displayDescription!)}</p>
          {descriptionTooLong && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mt-1" onClick={() => setExpanded(!expanded)}>
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show more
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {card.provider && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {card.provider.name && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{card.provider.name}</span>
            </div>
          )}
          {card.provider.organization && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{card.provider.organization}</span>
            </div>
          )}
          {card.provider.url && card.provider.url.trim() !== "" && (
            <a
              href={card.provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
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
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {card.url && (
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary truncate">
            <Globe className="h-3 w-3 shrink-0" />
            {card.url}
          </a>
        )}
        {card.documentationUrl && (
          <a
            href={card.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ExternalLink className="h-3 w-3" />
            Documentation
          </a>
        )}
      </div>
    </div>
  );
}
