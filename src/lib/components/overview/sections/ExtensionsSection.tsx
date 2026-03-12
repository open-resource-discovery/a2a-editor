import type { AgentExtension } from "@lib/types/a2a";
import { Card, CardContent, CardHeader, CardTitle } from "@lib/components/ui/card";
import { Badge } from "@lib/components/ui/badge";
import { ExternalLink, Puzzle } from "lucide-react";

interface ExtensionsSectionProps {
  extensions: AgentExtension[];
}

export function ExtensionsSection({ extensions }: ExtensionsSectionProps) {
  if (extensions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Extensions ({extensions.length})</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {extensions.map((ext) => (
          <div key={ext.uri} className="flex items-start gap-2 rounded-lg border bg-card p-3">
            <Puzzle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={ext.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline truncate flex items-center gap-1">
                  {ext.uri}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                {ext.version && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    v{ext.version}
                  </Badge>
                )}
              </div>
              {ext.requiredFields && ext.requiredFields.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Required fields:</span>
                  {ext.requiredFields.map((field) => (
                    <Badge key={field} variant="secondary" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
