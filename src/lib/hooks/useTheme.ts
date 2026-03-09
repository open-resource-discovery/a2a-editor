import { create } from "zustand";
import { getStored, setStored } from "@lib/utils/local-storage";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

/** Use a namespaced key to avoid collisions with host-page theme storage (e.g. Docusaurus). */
const STORAGE_KEY = "a2a-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

// Initialize theme from localStorage, with validation
function getInitialTheme(): Theme {
  const stored = getStored(STORAGE_KEY, "system");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

const initialTheme = getInitialTheme();

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: resolveTheme(initialTheme),
  setTheme: (theme) => {
    const resolvedTheme = resolveTheme(theme);

    // Persist to localStorage
    setStored(STORAGE_KEY, theme);

    set({ theme, resolvedTheme });
  },
}));

// Single global listener for system theme changes — updates store only, no DOM mutations.
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    const { theme } = useThemeStore.getState();
    if (theme !== "system") return;
    const newResolved = getSystemTheme();
    useThemeStore.setState({ resolvedTheme: newResolved });
  });
}

/**
 * Hook to access and manage theme state.
 * Uses Zustand store for consistent state across all components.
 * System theme changes are handled by a single global listener.
 *
 * NOTE: This hook does NOT apply a `.dark` class to the DOM.
 * Each root component (AgentPlayground, AgentEditor, etc.) is
 * wrapped in a `<ThemeRoot>` that applies `.a2a-root` and
 * conditionally `.dark` to scope styles to the library container.
 */
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useThemeStore();
  return { theme, resolvedTheme, setTheme };
}
