import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useTheme } from "@lib/hooks/useTheme";
import { cn } from "@lib/utils/cn";

interface ThemeRootProps {
  className?: string;
  children: ReactNode;
}

/**
 * Context that provides the ThemeRoot container element for Radix
 * portals (Sheet, Select, etc.) so portal content stays inside the
 * `.a2a-root` scope and inherits CSS variables + dark mode.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

/** Returns the nearest ThemeRoot element (for use as Radix portal container). */
export function usePortalContainer(): HTMLElement | undefined {
  const container = useContext(PortalContainerContext);
  return container ?? undefined;
}

/**
 * Wrapper element that scopes the library's CSS variables and dark-mode
 * styles to its subtree.  Every public root component (AgentPlayground,
 * AgentEditor, AgentViewer, AgentCardView, AgentPlaygroundLite) must
 * render through this wrapper so that:
 *
 * 1. `.a2a-root` provides the CSS custom-property scope (light and dark).
 * 2. `.dark` is toggled **only** on this container—never on
 *    `document.documentElement`—so the library can be safely embedded
 *    inside host pages (Docusaurus, Storybook, etc.) without leaking
 *    styles.
 * 3. A portal container context is provided so Radix UI portals
 *    (Sheet, Select) render inside the themed scope.
 */
export function ThemeRoot({ className, children }: ThemeRootProps) {
  const { resolvedTheme } = useTheme();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      ref={setContainer}
      className={cn("a2a-root", resolvedTheme === "dark" && "dark", className)}
    >
      <PortalContainerContext.Provider value={container}>
        {children}
      </PortalContainerContext.Provider>
    </div>
  );
}
