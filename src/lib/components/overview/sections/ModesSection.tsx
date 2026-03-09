import type { AgentCard } from "@lib/types/a2a";
import { Card, CardContent, CardHeader, CardTitle } from "@lib/components/ui/card";
import { Badge } from "@lib/components/ui/badge";

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
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Input/Output Modes</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {inputModes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Input:</span>
              <div className="flex flex-wrap gap-1">
                {inputModes.map((mode) => (
                  <Badge key={mode} variant="outline" className="text-xs">
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
                  <Badge key={mode} variant="outline" className="text-xs">
                    {mode}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
