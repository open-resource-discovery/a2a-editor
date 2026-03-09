import { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@lib/components/ui/card";
import { Badge } from "@lib/components/ui/badge";
import { ExternalLink } from "lucide-react";

export function PredefinedAgentsList() {
  const { agents, loadDefaults } = usePredefinedAgentsStore();

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  if (agents.length === 0) {
    return null;
  }

  return (
    <section className="px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-6 text-2xl font-bold">Predefined Agents</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link key={agent.id} to={`/playground?agent=${agent.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                  {agent.description && (
                    <CardDescription className="line-clamp-2">
                      {agent.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{agent.url}</span>
                  </div>
                  {agent.tags && agent.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
