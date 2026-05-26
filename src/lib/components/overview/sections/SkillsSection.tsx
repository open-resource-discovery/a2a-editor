import { useMemo, useState } from "react";
import type { AgentSkill } from "@lib/types/a2a";
import { SectionCard, Badge } from "@open-resource-discovery/ui-components";
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

  const skillsTitle = selectedTags.size > 0
    ? `Skills (${filteredSkills.length}/${skills.length})`
    : `Skills (${skills.length})`;

  const tagBadges = allTags.length > 0 ? (
    <div className="flex flex-wrap gap-1">
      {allTags.map((tag) => (
        <Badge
          key={tag}
          variant={selectedTags.has(tag) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => toggleTag(tag)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  ) : undefined;

  return (
    <SectionCard.Root>
      <SectionCard.Header title={skillsTitle} badges={tagBadges} />
      <SectionCard.Content className="space-y-2">
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} disableExamplePrompts={disableExamplePrompts} readOnly={readOnly} />
        ))}
        {filteredSkills.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No skills match the selected tags.</p>
        )}
      </SectionCard.Content>
    </SectionCard.Root>
  );
}
