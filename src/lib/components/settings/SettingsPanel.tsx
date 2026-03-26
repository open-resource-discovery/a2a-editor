import { ScrollArea } from "@lib/components/ui/scroll-area";
import { PredefinedAgents } from "./PredefinedAgents";

export function SettingsPanel() {
  return (
    <div className="flex h-full flex-col bg-sidebar" data-testid="settings-panel">
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          <PredefinedAgents />
        </div>
      </ScrollArea>
    </div>
  );
}
