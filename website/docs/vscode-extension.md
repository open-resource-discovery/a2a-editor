---
sidebar_position: 5
---

# VS Code Extension

The [A2A Editor for VS Code](https://github.com/open-resource-discovery/a2a-editor-vscode) brings the full A2A playground experience into your IDE. Browse, edit, validate, and chat with A2A agents without leaving VS Code.

## Features

- **Activity Bar Sidebar** — Dedicated A2A icon with auto-detection of agent card files in the active editor
- **Custom Editor** — Open `*.agentcard.json`, `agent-card.json`, or `agent.json` files as rendered, interactive agent cards
- **Agent Overview** — View agent name, version, provider, description, capabilities, skills, and security schemes at a glance
- **Chat & Testing** — Send messages to connected A2A agents and inspect raw HTTP request/response payloads
- **URL Discovery** — Connect to agents via URL with automatic well-known path resolution
- **Authentication** — Built-in support for Basic Auth, Bearer Token, and API Key authentication
- **Theme Integration** — Follows VS Code light, dark, and high-contrast themes

## Installation

### From source

```bash
git clone https://github.com/open-resource-discovery/a2a-editor-vscode.git
cd a2a-editor-vscode
npm install
npm run package
```

Then install the produced `.vsix`:

```bash
code --install-extension a2a-editor-vscode-<version>.vsix
```

Or via the UI: **Extensions** view → `…` menu → **Install from VSIX…**.

## Usage

### Sidebar

Click the **A2A icon** in the Activity Bar to open the sidebar. It automatically detects when the active editor contains an agent card JSON file. Enter a URL to connect to a remote agent, or toggle between URL and file sources.

### Custom Editor

Open any agent card JSON file, then run the command palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) → **"A2A: Open Current File as Agent Card"** to open it as a visual card. Edits sync bidirectionally between the visual editor and the underlying JSON file.

### Supported file patterns

The custom editor activates as an alternative (non-default) editor for:

- `*.agentcard.json`
- `agent-card.json`
- `agent.json`

### URL Discovery & Authentication

When connecting by URL the extension tries these paths in order:

1. `<url>/.well-known/agent.json`
2. `<url>/.well-known/agent-card.json`
3. The original URL directly

If the URL ends in `.json` it is fetched directly without well-known discovery.

**Supported authentication methods:** No Auth, Basic Auth, Bearer Token, API Key.

## MCP Server

The extension ships an in-process **MCP (Model Context Protocol)** server so AI tools like GitHub Copilot, Claude Code, Cursor, or Cline can drive A2A agents through the same code paths as the editor. It starts automatically when VS Code loads the extension.

### Exposed tools

| Tool                             | Purpose                                                   |
| -------------------------------- | --------------------------------------------------------- |
| `a2aAgentCard_fetchAgentCard`    | Fetch an agent card from a URL                            |
| `a2aAgentCard_validateAgentCard` | Validate an agent card JSON string against the A2A schema |
| `a2aAgentCard_sendMessage`       | Send a test message to an agent via A2A JSON-RPC          |

### Client setup

| Client             | Setup                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **GitHub Copilot** | Auto-discovered via VS Code 1.110+ — no extra config needed                                          |
| **Claude Code**    | Run `claude mcp add --transport http a2a-editor http://127.0.0.1:39627/mcp`, then verify with `/mcp` |
| **Cursor / Cline** | Add `{"mcpServers": {"a2a-editor": {"url": "http://127.0.0.1:39627/mcp"}}}` to your MCP config       |

The server binds to `http://127.0.0.1:39627/mcp` by default. Configure via VS Code settings: `a2aAgentCard.mcp.enabled`, `a2aAgentCard.mcp.host`, `a2aAgentCard.mcp.port`.

:::note
The VS Code window running the extension must be open for the MCP server to be reachable.
:::

## Requirements

- VS Code >= 1.110
- Node.js >= 24 (for building from source)
