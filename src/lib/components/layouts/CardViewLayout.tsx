import { ScrollArea } from "@open-resource-discovery/ui-components";
import { Tabs } from "@open-resource-discovery/ui-components";
import { AgentOverview } from "@lib/components/overview/AgentOverview";
import { ValidationPanel } from "@lib/components/validation/ValidationPanel";
import { useAutoValidate } from "@lib/hooks/useAutoValidate";
import { cn } from "@lib/utils/cn";

interface CardViewLayoutProps {
  showValidation?: boolean;
  defaultTab?: "overview" | "validation";
  readOnly?: boolean;
  showConnection?: boolean;
  className?: string;
}

/**
 * Layout for AgentCardView - shows only the agent card overview
 * without any JSON editor.
 */
export function CardViewLayout({
  showValidation = true,
  defaultTab = "overview",
  readOnly = false,
  showConnection = true,
  className,
}: CardViewLayoutProps) {
  useAutoValidate();

  if (!showValidation) {
    return (
      <ScrollArea autoScroll={false} className={cn("h-full", className)}>
        <AgentOverview readOnly={readOnly} showConnection={showConnection} />
      </ScrollArea>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Tabs.Root defaultValue={defaultTab} className="flex h-full flex-col">
        <div className="flex-none border-b px-4">
          <Tabs.List className="h-10">
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.Tab value="validation">Validation</Tabs.Tab>
          </Tabs.List>
        </div>
        <Tabs.Panel value="overview" className="flex-1 overflow-hidden m-0">
          <ScrollArea autoScroll={false} className="h-full">
            <AgentOverview readOnly={readOnly} showConnection={showConnection} />
          </ScrollArea>
        </Tabs.Panel>
        <Tabs.Panel value="validation" className="flex-1 overflow-hidden m-0">
          <ValidationPanel />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
