import type { ValidationResult } from "@lib/types/validation";
import { Card, CardContent } from "@lib/components/ui/card";
import { Badge } from "@lib/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@lib/utils/cn";

interface ValidationResultCardProps {
  result: ValidationResult;
}

const statusConfig = {
  pass: {
    icon: CheckCircle,
    variant: "success" as const,
    borderClass: "border-l-green-500",
  },
  warning: {
    icon: AlertTriangle,
    variant: "warning" as const,
    borderClass: "border-l-yellow-500",
  },
  fail: {
    icon: XCircle,
    variant: "error" as const,
    borderClass: "border-l-red-500",
  },
};

export function ValidationResultCard({ result }: ValidationResultCardProps) {
  const config = statusConfig[result.status];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("border-l-4", config.borderClass)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <StatusIcon
            className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              result.status === "pass" && "text-success",
              result.status === "warning" && "text-warning",
              result.status === "fail" && "text-destructive"
            )}
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{result.rule}</span>
              {result.severity && (
                <Badge variant={config.variant} className="text-xs h-5">
                  {result.severity}
                </Badge>
              )}
              {result.path && (
                <code className="text-xs bg-muted px-1 rounded">
                  {result.path}
                </code>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{result.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
