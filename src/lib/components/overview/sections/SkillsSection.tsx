import { useMemo, useState } from "react";
import type { AgentSkill } from "@lib/types/a2a";
import { Card, Badge } from "@open-resource-discovery/ui-components";
import { SkillCard } from "../SkillCard";

interface SkillsSectionProps {
  skills: AgentSkill[];
  disableExamplePrompts?: boolean;
  readOnly?: boolean;
}

export function SkillsSection({ skills, disableExamplePrompts = false, readOnly = false }: SkillsSectionProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const allTags = useMemo(
    () => [...new Set(skills.flatMap((s) => s.tags ?? []))].sort(),
    [skills],
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const filteredSkills = skills.filter((skill) => {
    if (selectedTags.size === 0) return true;
    return skill.tags?.some((tag) => selectedTags.has(tag)) ?? false;
  });

  return (
    <Card className="overflow-hidden">
      <Card.Header className="py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <Card.Title className="text-sm mr-1">
            Skills {selectedTags.size > 0 ? `(${filteredSkills.length}/${skills.length})` : `(${skills.length})`}
          </Card.Title>
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.has(tag) ? "default" : "outline"}
              className="text-xs h-5 cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </Card.Header>
      <Card.Content className="pt-0 space-y-2">
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} disableExamplePrompts={disableExamplePrompts} readOnly={readOnly} />
        ))}
        {filteredSkills.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No skills match the selected tags.</p>
        )}
      </Card.Content>
    </Card>
  );
}
