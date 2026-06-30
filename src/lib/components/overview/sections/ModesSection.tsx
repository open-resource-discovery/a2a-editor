import type { AgentCard } from "@lib/types/a2a";
import { SectionCard, Badge } from "@open-resource-discovery/ui-components";
import { SlidersHorizontal } from "lucide-react";

interface ModesSectionProps {
  card: AgentCard;
}

export function ModesSection({ card }: ModesSectionProps) {
  const inputModes = card.defaultInputModes || [];
  const outputModes = card.defaultOutputModes || [];

  if (inputModes.length === 0 && outputModes.length === 0) {
    return null;
  }

  return (
    <SectionCard.Root>
      <SectionCard.Header title="Input/Output Modes" icon={<SlidersHorizontal />} />
      <SectionCard.Content>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {inputModes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Input:</span>
              <div className="flex flex-wrap gap-1">
                {inputModes.map((mode) => (
                  <Badge key={mode} variant="outline">
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {outputModes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Output:</span>
              <div className="flex flex-wrap gap-1">
                {outputModes.map((mode) => (
                  <Badge key={mode} variant="outline">
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard.Content>
    </SectionCard.Root>
  );
}
