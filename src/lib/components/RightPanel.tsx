import { useEffect, useRef, useState, useCallback } from "react";
import { Tabs, Badge } from "@open-resource-discovery/ui-components";
import { ScrollArea } from "@open-resource-discovery/ui-components";
import { useUIStore } from "@lib/stores/uiStore";
import { useValidationStore } from "@lib/stores/validationStore";
import { useHttpLogStore } from "@lib/stores/httpLogStore";
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
  showValidation = true,
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
    <div className="flex h-full flex-col overflow-hidden border-l bg-background" data-testid="right-panel">
      <Tabs.Root value={localTab} onValueChange={handleTabChange} className="flex h-full flex-col">
        <div className="border-b">
          <Tabs.List>
            <Tabs.Tab value="overview" data-testid="tab-overview">
              Overview
            </Tabs.Tab>
            {showChat && (
              <Tabs.Tab value="chat" data-testid="tab-chat">
                Chat
              </Tabs.Tab>
            )}
            {showRawHttp && (
              <Tabs.Tab value="rawhttp" data-testid="tab-rawhttp">
                Raw HTTP
                {logCount > 0 && (
                  <Badge variant="secondary">{logCount}</Badge>
                )}
              </Tabs.Tab>
            )}
            {showValidation && (
              <Tabs.Tab value="validation" data-testid="tab-validation">
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
            <AgentOverview
              disableExamplePrompts={disableExamplePrompts}
              readOnly={readOnly}
              showConnection={showConnection}
            />
          </ScrollArea>
        </Tabs.Panel>

        {showChat && (
          <Tabs.Panel value="chat" className="flex-1 overflow-hidden mt-0">
            <ChatContainer maxExamplePrompts={maxExamplePrompts} disableExamplePrompts={disableExamplePrompts} />
          </Tabs.Panel>
        )}

        {showRawHttp && (
          <Tabs.Panel value="rawhttp" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <RawHttpPanel />
            </ScrollArea>
          </Tabs.Panel>
        )}

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
