---
sidebar_position: 4
---

# AgentCardView

Display agent card overview without any editor.

## Import

```tsx
import { AgentCardView } from "@open-resource-discovery/a2a-editor/card-view";
import "@open-resource-discovery/a2a-editor/styles";
```

## Usage

```tsx
function App() {
  return (
    <div style={{ height: "400px" }}>
      <AgentCardView defaultTab="overview" />
    </div>
  );
}
```

## Props

| Prop                   | Type                                                | Default      | Description                        |
| ---------------------- | --------------------------------------------------- | ------------ | ---------------------------------- |
| `initialAgentCard`     | `string`                                            | -            | Initial agent card JSON string     |
| `initialAgentUrl`      | `string`                                            | -            | Initial agent URL                  |
| `defaultTab`           | `"overview"`                                        | `"overview"` | Default tab to show                |
| `onAgentCardChange`    | `(json: string, parsed: AgentCard \| null) => void` | -            | Callback when agent card changes   |
| `className`            | `string`                                            | -            | Additional CSS class               |

## When to Use

Use `AgentCardView` when:

- You want to display agent card information without an editor
- You need a read-only view of an agent's capabilities
- You're building a listing or detail page for agents

## Bundle Size

Entry point: ~1.7 kB (gzip: ~0.6 kB)

This component does not include Monaco editor, making it much lighter than editor-based components.
