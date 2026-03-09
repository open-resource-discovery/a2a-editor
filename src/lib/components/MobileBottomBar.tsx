import { Menu, Code, FileText } from "lucide-react";
import { Button } from "@lib/components/ui/button";
import { useUIStore } from "@lib/stores/uiStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { Badge } from "@lib/components/ui/badge";
import { cn } from "@lib/utils/cn";

interface MobileBottomBarProps {
  showSettings?: boolean;
}

export function MobileBottomBar({ showSettings = true }: MobileBottomBarProps) {
  const { mobileView, setMobileView, openSettingsPanel } = useUIStore();
  const summary = useValidationStore((state) => state.summary);

  return (
    <div className="flex items-center justify-around border-t bg-background px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {showSettings && (
        <Button
          variant="ghost"
          size="sm"
          onClick={openSettingsPanel}
          aria-label="Open agents"
        >
          <Menu className="h-5 w-5" />
          <span className="ml-1 text-xs">Agents</span>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMobileView("card")}
        className={cn("relative", mobileView === "card" && "bg-accent")}
        aria-label={`Agent Card${summary.fail > 0 ? ` (${summary.fail} errors)` : ""}`}
      >
        <FileText className="h-5 w-5" />
        <span className="ml-1 text-xs">Agent Card</span>
        {summary.fail > 0 && (
          <Badge
            variant="error"
            className="absolute -top-1 -right-1 h-4 min-w-4 justify-center p-0 text-[10px]"
            aria-hidden="true"
          >
            {summary.fail}
          </Badge>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMobileView("json")}
        className={cn(mobileView === "json" && "bg-accent")}
        aria-label="JSON editor"
      >
        <Code className="h-5 w-5" />
        <span className="ml-1 text-xs">JSON</span>
      </Button>
    </div>
  );
}
