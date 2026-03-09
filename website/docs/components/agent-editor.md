---
sidebar_position: 3
---

# AgentEditor

Monaco editor component for editing Agent Cards.

## Import

```tsx
import { AgentEditor } from "@open-resource-discovery/a2a-editor/editor";
import "@open-resource-discovery/a2a-editor/styles";
```

## Usage

```tsx
function App() {
  return (
    <div style={{ height: "100vh" }}>
      <AgentEditor
        onAgentCardChange={(json, parsed) => {
          console.log("Card changed:", parsed);
        }}
      />
    </div>
  );
}
```

## Props

| Prop                | Type                                                | Default      | Description                      |
| ------------------- | --------------------------------------------------- | ------------ | -------------------------------- |
| `initialAgentCard`  | `string`                                            | -            | Initial agent card JSON string   |
| `initialAgentUrl`   | `string`                                            | -            | Initial agent URL                |
| `showSettings`      | `boolean`                                           | `true`       | Show the settings panel          |
| `readOnly`          | `boolean`                                           | `false`      | Make the editor read-only        |
| `defaultTab`        | `"overview"`                                        | `"overview"` | Default tab to show              |
| `onAgentCardChange` | `(json: string, parsed: AgentCard \| null) => void` | -            | Callback when agent card changes |
| `className`         | `string`                                            | -            | Additional CSS class             |

## When to Use

Use `AgentEditor` when:

- You only need the editor functionality
- You don't need settings panel or chat
- You want the Monaco editing experience

## Bundle Size

Entry point: ~0.5 kB (gzip: ~0.3 kB)

Note: Monaco editor is loaded as a shared chunk.
