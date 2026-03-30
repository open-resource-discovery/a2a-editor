import type { SecurityRequirement } from "@lib/types/a2a";
import { Card, CardContent, CardHeader, CardTitle } from "@lib/components/ui/card";
import { Badge } from "@lib/components/ui/badge";
import { ShieldCheck } from "lucide-react";

interface SecurityRequirementsSectionProps {
  requirements: SecurityRequirement[];
}

/**
 * Displays the `security` array from the agent card.
 * Each entry is an object mapping scheme names → required scopes.
 * Multiple entries represent alternative authentication options (OR).
 * Multiple keys within a single entry represent required combinations (AND).
 */
export function SecurityRequirementsSection({ requirements }: SecurityRequirementsSectionProps) {
  if (requirements.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Security Requirements</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {requirements.map((req, index) => {
          const entries = Object.entries(req);
          return (
            <div key={index}>
              {index > 0 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 border-t" />
                  <span className="text-[10px] text-muted-foreground uppercase">or</span>
                  <div className="flex-1 border-t" />
                </div>
              )}
              <div className="rounded-lg border bg-card p-3 space-y-1.5">
                {entries.map(([schemeName, scopes]) => (
                  <div key={schemeName} className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{schemeName}</span>
                      {scopes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {scopes.map((scope) => (
                            <Badge key={scope} variant="outline" className="text-xs">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {entries.length > 1 && (
                  <p className="text-[10px] text-muted-foreground pl-6">
                    All of the above are required together
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
