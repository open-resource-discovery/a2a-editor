import { SplitPane, SimpleSheet } from "@open-resource-discovery/ui-components";
import { useIsLargeScreen } from "@lib/hooks/useMediaQuery";
import { useUIStore } from "@lib/stores/uiStore";
import { useAutoValidate } from "@lib/hooks/useAutoValidate";
import { AgentCardEditor } from "@lib/components/editor/AgentCardEditor";
import { EditorRightPanel } from "./EditorRightPanel";
import { MobileBottomBar } from "@lib/components/MobileBottomBar";
import { cn } from "@lib/utils/cn";
import { LazySettingsPanel } from "@lib/components/layouts/LazySettingsPanel";

interface EditorLayoutProps {
  showSettings?: boolean;
  showValidation?: boolean;
  showToolbar?: boolean;
  readOnly?: boolean;
  defaultTab?: "overview" | "validation";
  className?: string;
}

/**
 * Layout for AgentEditor - 3 pane layout with Monaco editor but no Chat
 */
export function EditorLayout({
  showSettings = true,
  showValidation = true,
  showToolbar = true,
  readOnly = false,
  defaultTab = "overview",
  className,
}: EditorLayoutProps) {
  const isLargeScreen = useIsLargeScreen();
  const { settingsPanelOpen, setSettingsPanelOpen, validationPanelOpen, setValidationPanelOpen, closeAllPanels } =
    useUIStore();

  // Enable auto-validation
  useAutoValidate();

  // Close panels when switching to desktop
  if (isLargeScreen && (settingsPanelOpen || validationPanelOpen)) {
    closeAllPanels();
  }

  if (isLargeScreen) {
    return (
      <div className={cn("h-full", className)}>
        <SplitPane orientation="horizontal">
          {showSettings && (
            <>
              <SplitPane.Panel defaultSize={20} minSize={15} collapsible collapsedSize={0}>
                <LazySettingsPanel />
              </SplitPane.Panel>
              <SplitPane.Handle />
            </>
          )}
          <SplitPane.Panel defaultSize={showSettings ? 45 : 55} minSize={30}>
            <AgentCardEditor readOnly={readOnly} showToolbar={showToolbar} />
          </SplitPane.Panel>
          <SplitPane.Handle />
          <SplitPane.Panel defaultSize={35} minSize={20}>
            <EditorRightPanel showValidation={showValidation} defaultTab={defaultTab} />
          </SplitPane.Panel>
        </SplitPane>
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
        <SimpleSheet
          open={settingsPanelOpen}
          onOpenChange={setSettingsPanelOpen}
          side="left"
          title="Settings"
          className="w-[85%] max-w-md p-0">
          <LazySettingsPanel />
        </SimpleSheet>
      )}

      {/* Right Panel Sheet (from bottom) */}
      <SimpleSheet
        open={validationPanelOpen}
        onOpenChange={setValidationPanelOpen}
        side="bottom"
        title="Overview & Validation"
        className="h-[70vh] max-h-[600px] p-0">
        <EditorRightPanel showValidation={showValidation} defaultTab={defaultTab} />
      </SimpleSheet>
    </div>
  );
}
