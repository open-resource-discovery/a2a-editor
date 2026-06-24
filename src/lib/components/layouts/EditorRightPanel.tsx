import { useEffect, useRef, useState, useCallback } from "react";
import { Tabs, Badge } from "@open-resource-discovery/ui-components";
import { ScrollArea } from "@open-resource-discovery/ui-components";
import { useUIStore } from "@lib/stores/uiStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { AgentOverview } from "@lib/components/overview/AgentOverview";
import { ValidationPanel } from "@lib/components/validation/ValidationPanel";

type TabValue = "overview" | "validation";

interface EditorRightPanelProps {
  showValidation?: boolean;
  defaultTab?: TabValue;
}

/**
 * Right panel for AgentEditor - no chat tab
 */
export function EditorRightPanel({ showValidation = true, defaultTab = "overview" }: EditorRightPanelProps) {
  const [localTab, setLocalTab] = useState<TabValue>(defaultTab);
  const summary = useValidationStore((state) => state.summary);

  // Sync from global store for external triggers
  const lastStoreTabRef = useRef(useUIStore.getState().activeTab);

  useEffect(() => {
    const unsub = useUIStore.subscribe((state) => {
      if (state.activeTab !== lastStoreTabRef.current) {
        lastStoreTabRef.current = state.activeTab;
        // Only sync if the tab exists in this panel
        if (state.activeTab === "overview" || state.activeTab === "validation") {
          setLocalTab(state.activeTab);
        }
      }
    });
    return unsub;
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    const t = tab as TabValue;
    setLocalTab(t);
    lastStoreTabRef.current = t;
    useUIStore.getState().setActiveTab(t);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden border-l bg-background">
      <Tabs.Root value={localTab} onValueChange={handleTabChange} className="flex h-full flex-col">
        <div className="border-b">
          <Tabs.List>
            <Tabs.Tab value="overview">
              Overview
            </Tabs.Tab>
            {showValidation && (
              <Tabs.Tab value="validation">
                Validation
                {summary.fail > 0 && (
                  <Badge variant="destructive">{summary.fail}</Badge>
                )}
                {summary.fail === 0 && summary.warning > 0 && (
                  <Badge variant="warning">{summary.warning}</Badge>
                )}
              </Tabs.Tab>
            )}
          </Tabs.List>
        </div>

        <Tabs.Panel value="overview" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <AgentOverview />
          </ScrollArea>
        </Tabs.Panel>

        {showValidation && (
          <Tabs.Panel value="validation" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <ValidationPanel />
            </ScrollArea>
          </Tabs.Panel>
        )}
      </Tabs.Root>
    </div>
  );
}
