---
sidebar_position: 1
---

# AgentPlayground

The full-featured playground component with Monaco editor, chat, and validation.

## Import

```tsx
import { AgentPlayground } from "@open-resource-discovery/a2a-editor";
import "@open-resource-discovery/a2a-editor/styles";
```

## Usage

```tsx
function App() {
  return (
    <div style={{ height: "100vh" }}>
      <AgentPlayground
        showSettings={true}
        showChat={true}
        showValidation={true}
        showEditor={true}
        onAgentCardChange={(json, parsed) => {
          console.log("Agent card changed:", parsed?.name);
        }}
      />
    </div>
  );
}
```

## Props

| Prop                    | Type                                                | Default      | Description                        |
| ----------------------- | --------------------------------------------------- | ------------ | ---------------------------------- |
| `initialAgentCard`      | `string`                                            | -            | Initial agent card JSON string     |
| `initialAgentUrl`       | `string`                                            | -            | Initial agent URL to connect to    |
| `showSettings`          | `boolean`                                           | `true`       | Show the settings panel            |
| `showValidation`        | `boolean`                                           | `true`       | Show the validation tab            |
| `showChat`              | `boolean`                                           | `true`       | Show the chat tab                  |
| `showRawHttp`           | `boolean`                                           | `true`       | Show the Raw HTTP tab              |
| `showEditor`            | `boolean`                                           | `true`       | Show the JSON editor               |
| `showToolbar`           | `boolean`                                           | `true`       | Show the editor toolbar            |
| `readOnly`              | `boolean`                                           | `false`      | Make the editor read-only          |
| `defaultTab`            | `"overview" \| "chat" \| "validation" \| "rawhttp"` | `"overview"` | Default tab to show                |
| `maxExamplePrompts`     | `number`                                            | `2`          | Max example prompts to show        |
| `disableExamplePrompts` | `boolean`                                           | `false`      | Disable example prompt clicks      |
| `forceDesktop`          | `boolean`                                           | `false`      | Force desktop layout               |
| `predefinedAgents`      | `PredefinedAgent[]`                                 | -            | Override sidebar predefined agents |
| `onAgentCardChange`     | `(json: string, parsed: AgentCard \| null) => void` | -            | Callback when agent card changes   |
| `onConnect`             | `(url: string, card: AgentCard) => void`            | -            | Callback when connected to agent   |
| `onValidationComplete`  | `(results: ValidationResult[]) => void`             | -            | Callback when validation completes |
| `className`             | `string`                                            | -            | Additional CSS class               |

## Features

- **Monaco Editor** - Full JSON editing with syntax highlighting
- **Settings Panel** - Configure connection and authentication
- **Chat Tab** - Send messages and receive responses
- **Raw HTTP Tab** - Inspect request and response payloads
- **Validation Tab** - Validate against A2A specification
- **Overview Tab** - Visual display of agent capabilities

## Bundle Size

Entry point: ~264 kB (gzip: ~68 kB)

This is the largest component as it includes Monaco editor and chat functionality. If you don't need all features, consider using one of the lighter alternatives.
