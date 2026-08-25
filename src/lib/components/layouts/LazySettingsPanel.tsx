import { lazy, Suspense } from "react";

export const SettingsPanel = lazy(() =>
  import("@lib/components/settings/SettingsPanel").then((m) => ({
    default: m.SettingsPanel,
  })),
);

export function SettingsPanelFallback() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}

export function LazySettingsPanel() {
  return (
    <Suspense fallback={<SettingsPanelFallback />}>
      <SettingsPanel />
    </Suspense>
  );
}
