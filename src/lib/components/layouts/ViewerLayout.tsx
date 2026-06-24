import { SplitPane, SimpleSheet } from "@open-resource-discovery/ui-components";
import { useIsLargeScreen } from "@lib/hooks/useMediaQuery";
import { useUIStore } from "@lib/stores/uiStore";
import { useAutoValidate } from "@lib/hooks/useAutoValidate";
import { TextareaEditor } from "@lib/components/editor/TextareaEditor";
import { useAgentCardStore } from "@lib/stores/agentCardStore";
import { ViewerRightPanel } from "./ViewerRightPanel";
import { cn } from "@lib/utils/cn";

interface ViewerLayoutProps {
  showValidation?: boolean;
  defaultTab?: "overview" | "validation";
  className?: string;
}

/**
 * Layout for AgentViewer - 2 pane layout without Monaco editor
 * Uses simple textarea instead of Monaco for JSON editing
 */
export function ViewerLayout({
  showValidation = true,
  defaultTab = "overview",
  className,
}: ViewerLayoutProps) {
  const isLargeScreen = useIsLargeScreen();
  const { rawJson, setRawJson } = useAgentCardStore();
  const { validationPanelOpen, setValidationPanelOpen, closeAllPanels } =
    useUIStore();

  // Enable auto-validation
  useAutoValidate();

  // Close panels when switching to desktop
  if (isLargeScreen && validationPanelOpen) {
    closeAllPanels();
  }

  if (isLargeScreen) {
    return (
      <div className={cn("h-full", className)}>
        <SplitPane orientation="horizontal">
          <SplitPane.Panel defaultSize={50} minSize={30}>
            <div className="h-full border-r">
              <TextareaEditor
                value={rawJson}
                onChange={setRawJson}
              />
            </div>
          </SplitPane.Panel>
          <SplitPane.Handle />
          <SplitPane.Panel defaultSize={50} minSize={20}>
            <ViewerRightPanel
              showValidation={showValidation}
              defaultTab={defaultTab}
            />
          </SplitPane.Panel>
        </SplitPane>
      </div>
    );
  }

  // Mobile layout with sheets
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="min-h-0 flex-1">
        <TextareaEditor value={rawJson} onChange={setRawJson} />
      </div>

      {/* Right Panel Sheet (from bottom) */}
      <SimpleSheet
        open={validationPanelOpen}
        onOpenChange={setValidationPanelOpen}
        side="bottom"
        title="Overview & Validation"
        className="h-[70vh] max-h-[600px] p-0">
        <ViewerRightPanel
          showValidation={showValidation}
          defaultTab={defaultTab}
        />
      </SimpleSheet>
    </div>
  );
}
