---
sidebar_position: 2
---

# Hooks

Custom React hooks exported by the library.

## Import

```tsx
import {
  useTheme,
  useMediaQuery,
  useIsLargeScreen,
  useAutoValidate,
  useAuthHeaders,
} from "@open-resource-discovery/a2a-editor";
```

## useTheme

Access and control the current theme.

```tsx
const { theme, resolvedTheme, setTheme } = useTheme();

// theme: "light" | "dark" | "system"
// resolvedTheme: "light" | "dark"
// setTheme: (theme: "light" | "dark" | "system") => void
```

### Example

```tsx
function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>Current: {resolvedTheme}</button>;
}
```

## useIsLargeScreen

Detect if the current viewport is large (desktop) or small (mobile).

```tsx
const isLargeScreen = useIsLargeScreen();

// Returns true if viewport width >= 1024px
```

### Example

```tsx
function ResponsiveLayout() {
  const isLargeScreen = useIsLargeScreen();

  if (isLargeScreen) {
    return <DesktopLayout />;
  }

  return <MobileLayout />;
}
```

## useMediaQuery

Generic media query hook (used internally by `useIsLargeScreen`).

```tsx
import { useMediaQuery } from "@open-resource-discovery/a2a-editor";

const isWide = useMediaQuery("(min-width: 1200px)");
const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
```

## useAutoValidate

Automatically validates the agent card when it changes.

```tsx
function MyComponent() {
  // This hook sets up automatic validation
  // Call it once in your component tree
  useAutoValidate();

  return <div>...</div>;
}
```

This hook:

- Watches the `rawJson` in `useAgentCardStore`
- Debounces changes (waits for typing to stop)
- Runs validation automatically
- Updates `useValidationStore` with results

## useAuthHeaders

Convenience hook to get authentication headers from the connection store.

```tsx
import { useAuthHeaders } from "@open-resource-discovery/a2a-editor";

const authHeaders = useAuthHeaders();
// Returns Record<string, string> with auth headers
```
