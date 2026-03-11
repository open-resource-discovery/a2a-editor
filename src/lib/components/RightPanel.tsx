import { useEffect, useRef, useState, useCallback } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lib/components/ui/tabs";
import { ScrollArea } from "@lib/components/ui/scroll-area";
import { useUIStore } from "@lib/stores/uiStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { useHttpLogStore } from "@lib/stores/httpLogStore";
import { Badge } from "@lib/components/ui/badge";
import { AgentOverview } from "@lib/components/overview/AgentOverview";
import { ChatContainer } from "@lib/components/chat/ChatContainer";
import { ValidationPanel } from "@lib/components/validation/ValidationPanel";
import { RawHttpPanel } from "@lib/components/rawhttp/RawHttpPanel";

type TabValue = "overview" | "chat" | "validation" | "rawhttp";

interface RightPanelProps {
  showChat?: boolean;
  showValidation?: boolean;
  showRawHttp?: boolean;
  defaultTab?: TabValue;
  maxExamplePrompts?: number;
  disableExamplePrompts?: boolean;
  readOnly?: boolean;
  showConnection?: boolean;
}

export function RightPanel({
  showChat = true,
  showValidation = false,
  showRawHttp = true,
  defaultTab = "overview",
  maxExamplePrompts = 2,
  disableExamplePrompts = false,
  readOnly = false,
  showConnection = true,
}: RightPanelProps) {
  // Local tab state — isolates this panel from other instances on the page
  const [localTab, setLocalTab] = useState<TabValue>(defaultTab);
  const summary = useValidationStore((state) => state.summary);
  const logCount = useHttpLogStore((state) => state.logs.length);

  // Build set of available tabs for this instance
  const availableTabs = new Set<TabValue>(["overview"]);
  if (showChat) availableTabs.add("chat");
  if (showValidation) availableTabs.add("validation");
  if (showRawHttp) availableTabs.add("rawhttp");

  // Sync from global store when external actions (switchToChat, switchToRawHttp) fire.
  // We track the last store value to detect changes we didn't originate.
  // Only sync if the tab exists in this panel's available tabs.
  const lastStoreTabRef = useRef(useUIStore.getState().activeTab);

  useEffect(() => {
    const unsub = useUIStore.subscribe((state) => {
      if (state.activeTab !== lastStoreTabRef.current) {
        lastStoreTabRef.current = state.activeTab;
        if (availableTabs.has(state.activeTab)) {
          setLocalTab(state.activeTab);
        }
      }
    });
    return unsub;
  }, [showChat, showValidation, showRawHttp]); // eslint-disable-line react-hooks/exhaustive-deps

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
            {showChat && (
              <TabsTrigger value="chat" className="text-xs">
                Chat
              </TabsTrigger>
            )}
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
            {showRawHttp && (
              <TabsTrigger value="rawhttp" className="text-xs">
                Raw HTTP
                {logCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-5 justify-center p-0 px-1 text-xs"
                  >
                    {logCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-hidden mt-0">
          <ScrollArea className="h-full">
            <AgentOverview disableExamplePrompts={disableExamplePrompts} readOnly={readOnly} showConnection={showConnection} />
          </ScrollArea>
        </TabsContent>

        {showChat && (
          <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
            <ChatContainer maxExamplePrompts={maxExamplePrompts} disableExamplePrompts={disableExamplePrompts} />
          </TabsContent>
        )}

        {showValidation && (
          <TabsContent
            value="validation"
            className="flex-1 overflow-hidden mt-0"
          >
            <ScrollArea className="h-full">
              <ValidationPanel />
            </ScrollArea>
          </TabsContent>
        )}

        {showRawHttp && (
          <TabsContent value="rawhttp" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <RawHttpPanel />
            </ScrollArea>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
