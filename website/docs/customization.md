---
sidebar_position: 10
---

# Customization

Learn how to customize the A2A Editor components for your needs.

## Toggling Features

All components support props to toggle various features:

```tsx
<AgentPlayground
  showSettings={false} // Hide settings panel
  showChat={false} // Hide chat tab
  showRawHttp={false} // Hide raw HTTP tab
  showValidation={false} // Hide validation tab
  showEditor={false} // Hide Monaco editor (shows card only)
  showToolbar={true} // Show editor toolbar
  readOnly={true} // Disable editing
  disableExamplePrompts={true} // Disable example prompt clicks
  forceDesktop={true} // Force desktop layout
/>
```

## Custom Styling

### CSS Variables

The components use CSS variables that you can override:

```css
:root {
  --background: #ffffff;
  --foreground: #1a1a1a;
  --primary: #0098ff;
  --muted: #f5f5f5;
  --border: #e5e5e5;
  /* ... more variables */
}

.dark {
  --background: #1e1e1e;
  --foreground: #d4d4d4;
  /* ... dark mode overrides */
}
```

### Adding Custom Classes

All components accept a `className` prop:

```tsx
<AgentPlayground className="my-custom-class" />
```

## Using Stores Directly

For advanced customization, you can use the Zustand stores directly:

```tsx
import { useAgentCardStore, useConnectionStore } from "@open-resource-discovery/a2a-editor";

function CustomAgentLoader() {
  const setRawJson = useAgentCardStore((state) => state.setRawJson);
  const connect = useConnectionStore((state) => state.connect);

  const loadAgent = async (url: string) => {
    // Fetch agent card
    const response = await fetch(url);
    const card = await response.json();

    // Update store
    setRawJson(JSON.stringify(card, null, 2));
  };

  return <button onClick={() => loadAgent("https://example.com/agent.json")}>Load Agent</button>;
}
```

## Composing with Public Exports

For custom UIs, prefer composing with the public stores, hooks, and entry points instead of relying on internal component paths.

```tsx
import { useAgentCardStore, useValidationStore } from "@open-resource-discovery/a2a-editor";
import { AgentCardView } from "@open-resource-discovery/a2a-editor/card-view";

function CustomPage() {
  const parsedCard = useAgentCardStore((state) => state.parsedCard);
  const summary = useValidationStore((state) => state.summary);

  return (
    <div>
      <AgentCardView className="h-[400px]" />
      <pre>{JSON.stringify({ name: parsedCard?.name, summary }, null, 2)}</pre>
    </div>
  );
}
```

## Theme Integration

The components support light and dark themes:

```tsx
import { useTheme } from "@open-resource-discovery/a2a-editor";

function App() {
  const { setTheme } = useTheme();

  // Sync with your app's theme
  useEffect(() => {
    setTheme(yourAppTheme);
  }, [yourAppTheme]);

  return <AgentPlayground />;
}
```

## Callbacks

Use callbacks to integrate with your application:

```tsx
<AgentPlayground
  onAgentCardChange={(json, parsed) => {
    // Save to backend
    saveToBackend(json);
  }}
  onConnect={(url, card) => {
    // Log analytics
    trackConnection(url, card.name);
  }}
  onValidationComplete={(results) => {
    // Show notification if errors
    if (results.some((r) => r.severity === "error")) {
      showNotification("Validation errors found");
    }
  }}
/>
```
