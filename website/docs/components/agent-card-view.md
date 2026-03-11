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

### Read-Only Mode

Pass `readOnly` to hide all interactive elements (connection forms, authentication inputs, "Try it" buttons) and display the agent card as a pure informational view:

```tsx
function AgentDetail({ agentCardJson }: { agentCardJson: string }) {
  return (
    <div style={{ height: "400px" }}>
      <AgentCardView
        initialAgentCard={agentCardJson}
        readOnly
      />
    </div>
  );
}
```

In read-only mode:
- The **Connection** section is hidden entirely
- The **Authentication** section shows scheme information (type, flows, configuration) without credential inputs or sign-in buttons
- **Skill examples** are displayed as plain text instead of clickable "Try it" buttons

## Props

| Prop                   | Type                                                | Default      | Description                                                                 |
| ---------------------- | --------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `initialAgentCard`     | `string`                                            | -            | Initial agent card JSON string                                              |
| `initialAgentUrl`      | `string`                                            | -            | Initial agent URL                                                           |
| `defaultTab`           | `"overview"`                                        | `"overview"` | Default tab to show                                                         |
| `readOnly`             | `boolean`                                           | `false`      | Hides connection/auth forms and disables interactive elements                |
| `showConnection`       | `boolean`                                           | `true`       | Show or hide the connection card in the overview                            |
| `showValidation`       | `boolean`                                           | `false`      | Show the validation tab                                                     |
| `onAgentCardChange`    | `(json: string, parsed: AgentCard \| null) => void` | -            | Callback when agent card changes                                            |
| `onValidationComplete` | `(results: ValidationResult[]) => void`             | -            | Callback when validation completes                                          |
| `className`            | `string`                                            | -            | Additional CSS class                                                        |

## When to Use

Use `AgentCardView` when:

- You want to display agent card information without an editor
- You need a read-only view of an agent's capabilities
- You're building a listing or detail page for agents

Use `readOnly` mode when:

- You want a pure display with no interactive elements at all
- You're embedding the card in a catalog or documentation page
- Users should only view — not connect to or authenticate with — the agent

## Bundle Size

Entry point: ~1.7 kB (gzip: ~0.6 kB)

This component does not include Monaco editor, making it much lighter than editor-based components.
