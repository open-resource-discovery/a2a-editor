import { useState } from "react";
import type { AgentSkill } from "@lib/types/a2a";
import { Badge } from "@lib/components/ui/badge";
import { Button } from "@lib/components/ui/button";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore } from "@lib/stores/connectionStore";
import { useUIStore } from "@lib/stores/uiStore";
import { Play, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@lib/components/ui/collapsible";

interface SkillCardProps {
  skill: AgentSkill;
  disableExamplePrompts?: boolean;
}

export function SkillCard({ skill, disableExamplePrompts = false }: SkillCardProps) {
  const [open, setOpen] = useState(false);
  const { sendMessage } = useChatStore();
  const { url, authHeaders } = useConnectionStore();
  const { switchToChat } = useUIStore();

  const handleTryExample = (example: string) => {
    sendMessage([{ text: example }], url, authHeaders);
    switchToChat();
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card p-3">
        <CollapsibleTrigger className="flex w-full items-start justify-between text-left cursor-pointer">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{skill.name}</span>
              {skill.tags && skill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skill.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs h-5">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t">
            {skill.inputModes?.length || skill.outputModes?.length ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2">
                {skill.inputModes && skill.inputModes.length > 0 && (
                  <span>
                    <span className="text-muted-foreground">Input:</span> {skill.inputModes.join(", ")}
                  </span>
                )}
                {skill.outputModes && skill.outputModes.length > 0 && (
                  <span>
                    <span className="text-muted-foreground">Output:</span> {skill.outputModes.join(", ")}
                  </span>
                )}
              </div>
            ) : null}
            {skill.examples && skill.examples.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Try it:</span>
                <div className="flex flex-wrap gap-1">
                  {skill.examples.map((example, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs max-w-full shadow-none"
                      onClick={() => handleTryExample(example)}
                      disabled={!url || disableExamplePrompts}>
                      <Play className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">{example.length > 30 ? example.slice(0, 30) + "..." : example}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
