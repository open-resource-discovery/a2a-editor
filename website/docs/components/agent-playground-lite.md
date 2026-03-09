---
sidebar_position: 2
---

# AgentPlaygroundLite

A lighter version of AgentPlayground without chat functionality.

## Import

```tsx
import { AgentPlaygroundLite } from "@open-resource-discovery/a2a-editor/lite";
import "@open-resource-discovery/a2a-editor/styles";
```

## Usage

```tsx
function App() {
  return (
    <div style={{ height: "100vh" }}>
      <AgentPlaygroundLite
        showValidation={true}
        onAgentCardChange={(json, parsed) => {
          // Save to backend
        }}
      />
    </div>
  );
}
```

## Props

| Prop                   | Type                                                | Default      | Description                        |
| ---------------------- | --------------------------------------------------- | ------------ | ---------------------------------- |
| `initialAgentCard`     | `string`                                            | -            | Initial agent card JSON string     |
| `initialAgentUrl`      | `string`                                            | -            | Initial agent URL                  |
| `showSettings`         | `boolean`                                           | `true`       | Show the settings panel            |
| `showValidation`       | `boolean`                                           | `true`       | Show the validation tab            |
| `readOnly`             | `boolean`                                           | `false`      | Make the editor read-only          |
| `defaultTab`           | `"overview" \| "validation"`                        | `"overview"` | Default tab to show                |
| `onAgentCardChange`    | `(json: string, parsed: AgentCard \| null) => void` | -            | Callback when agent card changes   |
| `onConnect`            | `(url: string, card: AgentCard) => void`            | -            | Callback when connected to agent   |
| `onValidationComplete` | `(results: ValidationResult[]) => void`             | -            | Callback when validation completes |
| `className`            | `string`                                            | -            | Additional CSS class               |

## When to Use

Use `AgentPlaygroundLite` when:

- You need the Monaco editor but don't need chat functionality
- You want a smaller bundle size
- You're building an editor-only experience

## Bundle Size

Entry point: ~4.6 kB (gzip: ~1.5 kB)

Note: Monaco editor is loaded as a shared chunk, so the total loaded size will be larger.
