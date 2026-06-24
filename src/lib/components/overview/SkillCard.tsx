import type { AgentSkill } from "@lib/types/a2a";
import { Badge, Button, CollapsibleSection, MarkdownText} from "@open-resource-discovery/ui-components";
import { useChatStore } from "@lib/stores/chatStore";
import { useConnectionStore, selectEffectiveUrl } from "@lib/stores/connectionStore";
import { useUIStore } from "@lib/stores/uiStore";
import { Play/*, ChevronDown*/ } from "lucide-react";

interface SkillCardProps {
  skill: AgentSkill;
  disableExamplePrompts?: boolean;
  readOnly?: boolean;
}

export function SkillCard({ skill, disableExamplePrompts = false, readOnly = false }: SkillCardProps) {
  const { sendMessage, isStreaming } = useChatStore();
  const { authHeaders } = useConnectionStore();
  const effectiveUrl = useConnectionStore(selectEffectiveUrl);
  const { switchToChat } = useUIStore();

  const handleTryExample = (example: string) => {
    sendMessage([{ text: example }], effectiveUrl, authHeaders);
    switchToChat();
  };

  return (
    <CollapsibleSection.Root>
      <CollapsibleSection.Trigger
      badges={skill.tags && skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {skill.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
      >
      {skill.name}
      </CollapsibleSection.Trigger>



      <CollapsibleSection.Content className="mt-0">
      {skill.description && (<MarkdownText text={skill.description} className="text-xs pl-[18px] font-normal text-muted-foreground"></MarkdownText>)}
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
              <span className="text-xs text-muted-foreground">{readOnly ? "Examples:" : "Try it:"}</span>
              <div className="flex flex-wrap gap-1">
                {readOnly
                  ? skill.examples.map((example, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-muted-foreground max-w-full">
                        <span className="truncate">
                          {example.length > 50 ? example.slice(0, 50) + "..." : example}
                        </span>
                      </span>
                    ))
                  : skill.examples.map((example, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs max-w-full shadow-none"
                        onClick={() => handleTryExample(example)}
                        disabled={!effectiveUrl || isStreaming || disableExamplePrompts}>
                        <Play className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">
                          {example.length > 30 ? example.slice(0, 30) + "..." : example}
                        </span>
                      </Button>
                    ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection.Content>
    </CollapsibleSection.Root>
  );
}
