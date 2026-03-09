import { useEffect, useRef } from "react";
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

interface RightPanelProps {
  showChat?: boolean;
  showValidation?: boolean;
  showRawHttp?: boolean;
  defaultTab?: "overview" | "chat" | "validation" | "rawhttp";
  maxExamplePrompts?: number;
  disableExamplePrompts?: boolean;
}

export function RightPanel({
  showChat = true,
  showValidation = true,
  showRawHttp = true,
  defaultTab = "overview",
  maxExamplePrompts = 2,
  disableExamplePrompts = false,
}: RightPanelProps) {
  const { activeTab, setActiveTab } = useUIStore();
  const summary = useValidationStore((state) => state.summary);
  const logCount = useHttpLogStore((state) => state.logs.length);
  const initializedRef = useRef(false);

  // Set default tab only on first mount
  useEffect(() => {
    if (!initializedRef.current) {
      setActiveTab(defaultTab);
      initializedRef.current = true;
    }
  }, [defaultTab, setActiveTab]);

  return (
    <div className="flex h-full flex-col overflow-hidden border-l bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
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
            <AgentOverview disableExamplePrompts={disableExamplePrompts} />
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
