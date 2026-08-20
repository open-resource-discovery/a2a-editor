import { ScrollArea } from "@open-resource-discovery/ui-components";
import { PredefinedAgents } from "./PredefinedAgents";

export function SettingsPanel() {
  return (
    <div className="flex h-full flex-col bg-background" data-testid="settings-panel">
      <ScrollArea autoScroll={false} className="flex-1">
        <div className="px-4 pb-4">
          <PredefinedAgents />
        </div>
      </ScrollArea>
    </div>
  );
}
