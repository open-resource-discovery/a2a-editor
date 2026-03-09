import { useEffect, lazy, Suspense } from "react";
import { Panel, Group as PanelGroup, Separator } from "react-resizable-panels";
import { GripVertical } from "lucide-react";
import { useIsLargeScreen } from "@lib/hooks/useMediaQuery";
import { useUIStore } from "@lib/stores/uiStore";
import { useAutoValidate } from "@lib/hooks/useAutoValidate";
import { AgentCardEditor } from "@lib/components/editor/AgentCardEditor";
import { EditorRightPanel } from "@lib/components/layouts/EditorRightPanel";
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

interface PlaygroundLiteLayoutProps {
  showSettings?: boolean;
  showValidation?: boolean;
  showToolbar?: boolean;
  readOnly?: boolean;
  defaultTab?: "overview" | "validation";
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

/**
 * PlaygroundLiteLayout - Same as PlaygroundLayout but without Chat functionality.
 * Uses EditorRightPanel instead of RightPanel to avoid importing Chat components.
 * This enables tree-shaking of chat-related code when using AgentPlaygroundLite.
 */
export function PlaygroundLiteLayout({
  showSettings = true,
  showValidation = true,
  showToolbar = true,
  readOnly = false,
  defaultTab = "overview",
  className,
}: PlaygroundLiteLayoutProps) {
  const isLargeScreen = useIsLargeScreen();
  const {
    settingsPanelOpen,
    setSettingsPanelOpen,
    validationPanelOpen,
    setValidationPanelOpen,
    closeAllPanels,
  } = useUIStore();

  // Enable auto-validation
  useAutoValidate();

  // Close panels when switching to desktop (must be in useEffect to avoid render-time side effects)
  useEffect(() => {
    if (isLargeScreen && (settingsPanelOpen || validationPanelOpen)) {
      closeAllPanels();
    }
  }, [isLargeScreen, settingsPanelOpen, validationPanelOpen, closeAllPanels]);

  if (isLargeScreen) {
    return (
      <div className={cn("h-full", className)}>
        <PanelGroup orientation="horizontal">
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
          <Panel defaultSize={35} minSize={20}>
            <EditorRightPanel
              showValidation={showValidation}
              defaultTab={defaultTab}
            />
          </Panel>
        </PanelGroup>
      </div>
    );
  }

  // Mobile layout with sheets
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="min-h-0 flex-1">
        <AgentCardEditor readOnly={readOnly} showToolbar={showToolbar} />
      </div>
      <MobileBottomBar showSettings={showSettings} />

      {/* Settings Sheet (from left) */}
      {showSettings && (
        <Sheet open={settingsPanelOpen} onOpenChange={setSettingsPanelOpen}>
          <SheetContent side="left" className="w-[85%] max-w-md p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Settings</SheetTitle>
            </SheetHeader>
            <Suspense fallback={<SettingsPanelFallback />}>
              <SettingsPanel />
            </Suspense>
          </SheetContent>
        </Sheet>
      )}

      {/* Right Panel Sheet (from bottom) */}
      <Sheet open={validationPanelOpen} onOpenChange={setValidationPanelOpen}>
        <SheetContent side="bottom" className="h-[70vh] max-h-[600px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Overview & Validation</SheetTitle>
          </SheetHeader>
          <EditorRightPanel
            showValidation={showValidation}
            defaultTab={defaultTab}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
