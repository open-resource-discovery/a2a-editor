import { lazy, Suspense } from "react";
import { Panel, Group as PanelGroup, Separator } from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import { useIsLargeScreen } from "@lib/hooks/useMediaQuery";
import { useUIStore } from "@lib/stores/uiStore";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { useAutoValidate } from "@lib/hooks/useAutoValidate";
import { AgentCardEditor } from "@lib/components/editor/AgentCardEditor";
import { RightPanel } from "@lib/components/RightPanel";
import { AgentSelector } from "@lib/components/AgentSelector";
import { MobileBottomBar } from "@lib/components/MobileBottomBar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lib/components/ui/sheet";
import { cn } from "@lib/utils/cn";

// Lazy load full SettingsPanel (with PredefinedAgents) — only loaded when showSettings=true
const SettingsPanel = lazy(() =>
  import("@lib/components/settings/SettingsPanel").then((m) => ({
    default: m.SettingsPanel,
  }))
);

function SettingsPanelFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-sidebar">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}

interface PlaygroundLayoutProps {
  showSettings?: boolean;
  showValidation?: boolean;
  showChat?: boolean;
  showRawHttp?: boolean;
  showEditor?: boolean;
  showToolbar?: boolean;
  readOnly?: boolean;
  defaultTab?: "overview" | "chat" | "validation" | "rawhttp";
  maxExamplePrompts?: number;
  disableExamplePrompts?: boolean;
  forceDesktop?: boolean;
  className?: string;
}

function ResizeHandle() {
  return (
    <Separator className="group relative flex w-2 items-center justify-center bg-border/50 transition-colors hover:bg-border">
      <div className="absolute z-10 flex h-8 w-4 items-center justify-center rounded-sm bg-border opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </Separator>
  );
}

export function PlaygroundLayout({
  showSettings = true,
  showValidation = true,
  showChat = true,
  showRawHttp = true,
  showEditor = true,
  showToolbar = true,
  readOnly = false,
  defaultTab = "overview",
  maxExamplePrompts = 2,
  disableExamplePrompts = false,
  forceDesktop = false,
  className,
}: PlaygroundLayoutProps) {
  const isLargeScreen = useIsLargeScreen();
  const useDesktopLayout = forceDesktop || isLargeScreen;
  const parsedCard = useAgentCardStore((state) => state.parsedCard);
  const { settingsPanelOpen, setSettingsPanelOpen, mobileView } = useUIStore();

  // Enable auto-validation
  useAutoValidate();

  // Viewer-only mode: just show RightPanel
  if (!showEditor) {
    return (
      <div className={cn("h-full", className)}>
        <RightPanel
          showChat={showChat}
          showValidation={showValidation}
          showRawHttp={showRawHttp}
          defaultTab={defaultTab}
          maxExamplePrompts={maxExamplePrompts}
          disableExamplePrompts={disableExamplePrompts}
        />
      </div>
    );
  }

  if (useDesktopLayout) {
    return (
      <div className={cn("h-full overflow-hidden", className)}>
        <PanelGroup orientation="horizontal" className="h-full">
          {showSettings && (
            <>
              <Panel
                defaultSize={20}
                minSize={15}
                collapsible
                collapsedSize={0}
              >
                <Suspense fallback={<SettingsPanelFallback />}>
                  <SettingsPanel />
                </Suspense>
              </Panel>
              <ResizeHandle />
            </>
          )}
          <Panel defaultSize={showSettings ? 45 : 55} minSize={30}>
            <AgentCardEditor readOnly={readOnly} showToolbar={showToolbar} />
          </Panel>
          <ResizeHandle />
          <Panel defaultSize={showSettings ? 35 : 45} minSize={20}>
            <RightPanel
              showChat={showChat}
              showValidation={showValidation}
              showRawHttp={showRawHttp}
              defaultTab={defaultTab}
              maxExamplePrompts={maxExamplePrompts}
              disableExamplePrompts={disableExamplePrompts}
            />
          </Panel>
        </PanelGroup>
      </div>
    );
  }

  // Mobile layout: Content changes based on mobileView state
  const renderMobileContent = () => {
    // If no agent selected, always show selector
    if (!parsedCard && mobileView !== "json") {
      return <AgentSelector />;
    }

    switch (mobileView) {
      case "card":
        return (
          <RightPanel
            showChat={showChat}
            showValidation={showValidation}
            showRawHttp={showRawHttp}
            defaultTab={defaultTab}
            maxExamplePrompts={maxExamplePrompts}
            disableExamplePrompts={disableExamplePrompts}
          />
        );
      case "json":
        return <AgentCardEditor readOnly={readOnly} showToolbar={showToolbar} />;
      case "selector":
      default:
        return <AgentSelector />;
    }
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-hidden">
        {renderMobileContent()}
      </div>
      <MobileBottomBar showSettings={showSettings} />

      {/* Settings Sheet (from left) - only sheet remaining */}
      {showSettings && (
        <Sheet open={settingsPanelOpen} onOpenChange={setSettingsPanelOpen}>
          <SheetContent side="left" className="w-[85%] max-w-md p-0">
            <SheetHeader>
              <SheetTitle>Agents</SheetTitle>
            </SheetHeader>
            <Suspense fallback={<SettingsPanelFallback />}>
              <SettingsPanel />
            </Suspense>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
