import { useEffect, useRef, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@lib/components/ui/tabs";
import { ScrollArea } from "@lib/components/ui/scroll-area";
import { useUIStore } from "@lib/stores/uiStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { Badge } from "@lib/components/ui/badge";
import { AgentOverview } from "@lib/components/overview/AgentOverview";
import { ValidationPanel } from "@lib/components/validation/ValidationPanel";

type TabValue = "overview" | "validation";

interface ViewerRightPanelProps {
  showValidation?: boolean;
  defaultTab?: TabValue;
}

/**
 * Right panel for AgentViewer - no chat tab
 */
export function ViewerRightPanel({
  showValidation = false,
  defaultTab = "overview",
}: ViewerRightPanelProps) {
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
      <Tabs
        value={localTab}
        onValueChange={handleTabChange}
        className="flex h-full flex-col"
      >
        <div className="border-b">
          <TabsList className="h-10 w-full justify-start rounded-none border-b-0 bg-background px-2">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            {showValidation && (
              <TabsTrigger value="validation" className="relative text-xs">
                Validation
                {summary.fail > 0 && (
                  <Badge
                    variant="error"
                    className="ml-1 h-5 min-w-5 justify-center p-0 px-1 text-xs"
                  >
                    {summary.fail}
                  </Badge>
                )}
                {summary.fail === 0 && summary.warning > 0 && (
                  <Badge
                    variant="warning"
                    className="ml-1 h-5 min-w-5 justify-center p-0 px-1 text-xs"
                  >
                    {summary.warning}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <AgentOverview />
          </ScrollArea>
        </TabsContent>

        {showValidation && (
          <TabsContent value="validation" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <ValidationPanel />
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
