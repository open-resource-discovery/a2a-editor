import { useState } from "react";
import type { AgentSkill } from "@lib/types/a2a";
import { Card, CardContent, CardHeader, CardTitle } from "@lib/components/ui/card";
import { SkillCard } from "../SkillCard";
import { Input } from "@lib/components/ui/input";
import { Search } from "lucide-react";

interface SkillsSectionProps {
  skills: AgentSkill[];
  disableExamplePrompts?: boolean;
  readOnly?: boolean;
}

export function SkillsSection({ skills, disableExamplePrompts = false, readOnly = false }: SkillsSectionProps) {
  const [filter, setFilter] = useState("");

  const filteredSkills = skills.filter((skill) => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (
      skill.name.toLowerCase().includes(search) ||
      skill.description.toLowerCase().includes(search) ||
      skill.tags?.some((tag) => tag.toLowerCase().includes(search))
    );
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">
            Skills ({skills.length})
          </CardTitle>
          {skills.length > 3 && (
            <div className="relative w-40">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} disableExamplePrompts={disableExamplePrompts} readOnly={readOnly} />
        ))}
        {filteredSkills.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No skills match your filter.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
