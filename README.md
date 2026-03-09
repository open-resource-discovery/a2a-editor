# A2A Editor

React components for editing, viewing, and testing [A2A (Agent-to-Agent)](https://a2a-protocol.org) protocol Agent Cards.

Playground: https://open-resource-discovery.github.io/a2a-editor/playground

## Getting Started

### npm

```bash
npm install @open-resource-discovery/a2a-editor
```

## Quick Start

```tsx
import { AgentPlayground } from "@open-resource-discovery/a2a-editor";
import "@open-resource-discovery/a2a-editor/styles";

function App() {
  return (
    <div style={{ height: "100vh" }}>
      <AgentPlayground onAgentCardChange={(json, parsed) => console.log(parsed?.name)} />
    </div>
  );
}
```

### Docker

```bash
docker run -p 8080:80 ghcr.io/open-resource-discovery/a2a-editor:latest
```

Or build from source:

```bash
docker build -t a2a-editor .
docker run -p 8080:80 a2a-editor
```

The editor is then available at `http://localhost:8080`.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/open-resource-discovery/a2a-editor).
