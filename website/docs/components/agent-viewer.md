---
sidebar_position: 5
---

# AgentViewer

Lightweight viewer using a simple textarea instead of Monaco editor.

## Import

```tsx
import { AgentViewer } from "@open-resource-discovery/a2a-editor/viewer";
import "@open-resource-discovery/a2a-editor/styles";
```

## Usage

```tsx
function App() {
  return (
    <div style={{ height: "100vh" }}>
      <AgentViewer initialAgentUrl="https://example.com/.well-known/agent.json" />
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

Use `AgentViewer` when:

- You need the smallest possible bundle size
- Monaco editor features aren't required
- You want basic JSON editing with a textarea
- You're building a simple viewer

## Bundle Size

Entry point: ~0.4 kB (gzip: ~0.25 kB)

This is the lightest component as it uses a simple textarea instead of Monaco editor. The total bundle size is approximately ~80KB including all shared chunks.
