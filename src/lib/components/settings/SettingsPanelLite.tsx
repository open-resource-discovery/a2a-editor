import { ScrollArea } from "@lib/components/ui/scroll-area";

/**
 * Lightweight settings panel without PredefinedAgents.
 * Used by AgentEditor and AgentPlaygroundLite to avoid bundling
 * the predefined agents list.
 */
export function SettingsPanelLite() {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-10 flex-none items-center border-b px-4">
        <h2 className="text-sm font-semibold">Settings</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="text-sm text-muted-foreground">Use the editor to modify the agent card JSON.</p>
        </div>
      </ScrollArea>
    </div>
  );
}
