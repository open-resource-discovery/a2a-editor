import { useState, useEffect } from "react";
import { AgentPlayground } from "@lib/components/AgentPlayground";
import { AgentPlaygroundLite } from "@lib/components/AgentPlaygroundLite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@lib/components/ui/tabs";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";

// Mock agents for the demo (only these will be shown)
const MOCK_AGENTS = [
  {
    id: "mock-echo",
    name: "Echo Agent",
    description: "Echoes back whatever you send. Useful for testing.",
    url: "mock://echo",
    authType: "none" as const,
    tags: ["test", "echo", "mock"],
  },
  {
    id: "mock-calculator",
    name: "Calculator Agent",
    description: "Accepts JSON input with math operations.",
    url: "mock://calculator",
    authType: "none" as const,
    tags: ["math", "json", "mock"],
  },
];

export function DocumentationPage() {
  const [activeDemo, setActiveDemo] = useState("full");
  const { agents } = usePredefinedAgentsStore();

  // Load mock agents for the demo
  useEffect(() => {
    // Only set mock agents if store is empty or has real agents
    if (agents.length === 0 || !agents.every((a) => a.id.startsWith("mock"))) {
      usePredefinedAgentsStore.setState({ agents: MOCK_AGENTS });
    }
  }, [agents]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Documentation</h1>
        <p className="text-muted-foreground mb-8">Learn how to integrate the A2A Editor into your project.</p>

        {/* Live Demo Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Live Demo</h2>

          <Tabs value={activeDemo} onValueChange={setActiveDemo} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="full">Full Playground</TabsTrigger>
              <TabsTrigger value="no-chat">Editor Only</TabsTrigger>
              <TabsTrigger value="card-only">Card Only</TabsTrigger>
            </TabsList>

            <div className="border rounded-lg overflow-hidden h-[600px]">
              <TabsContent value="full" className="h-full m-0">
                <AgentPlayground showSettings={true} showChat={true} showValidation={false} showEditor={true} />
              </TabsContent>

              <TabsContent value="no-chat" className="h-full m-0">
                <AgentPlaygroundLite showSettings={false} showValidation={false} />
              </TabsContent>

              <TabsContent value="card-only" className="h-full m-0">
                <AgentPlayground showSettings={false} showChat={true} showValidation={false} showEditor={false} />
              </TabsContent>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              {activeDemo === "full" && <code className="bg-muted px-2 py-1 rounded">{"<AgentPlayground />"}</code>}
              {activeDemo === "no-chat" && (
                <code className="bg-muted px-2 py-1 rounded">{"<AgentPlaygroundLite showSettings={false} />"}</code>
              )}
              {activeDemo === "card-only" && (
                <code className="bg-muted px-2 py-1 rounded">
                  {"<AgentPlayground showEditor={false} showSettings={false} />"}
                </code>
              )}
            </div>
          </Tabs>
        </section>

        {/* Installation Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Installation</h2>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-6">
            <code>npm install @open-resource-discovery/a2a-editor</code>
          </pre>
        </section>

        {/* Components Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Components</h2>
          <p className="text-muted-foreground mb-4">Choose the component that best fits your needs:</p>

          <div className="border rounded-lg overflow-x-auto mb-6">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Import Path</th>
                  <th className="text-left p-3 font-medium">Component</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono text-xs">@open-resource-discovery/a2a-editor</td>
                  <td className="p-3 font-mono text-xs">AgentPlayground</td>
                  <td className="p-3">Full editor with Monaco + Chat</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">@open-resource-discovery/a2a-editor/lite</td>
                  <td className="p-3 font-mono text-xs">AgentPlaygroundLite</td>
                  <td className="p-3">Editor without Chat (smaller bundle)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">@open-resource-discovery/a2a-editor/editor</td>
                  <td className="p-3 font-mono text-xs">AgentEditor</td>
                  <td className="p-3">Monaco editor, no Chat</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">@open-resource-discovery/a2a-editor/card-view</td>
                  <td className="p-3 font-mono text-xs">AgentCardView</td>
                  <td className="p-3">Card overview only (no editor)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">@open-resource-discovery/a2a-editor/viewer</td>
                  <td className="p-3 font-mono text-xs">AgentViewer</td>
                  <td className="p-3">Lightweight viewer (no Monaco, ~80KB)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Start Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-4 text-sm">
            <code>{`import { AgentPlayground } from "@open-resource-discovery/a2a-editor";
import "@open-resource-discovery/a2a-editor/styles";

function App() {
  return (
    <div style={{ height: "100vh" }}>
      <AgentPlayground
        onAgentCardChange={(json, parsed) => console.log(parsed?.name)}
      />
    </div>
  );
}`}</code>
          </pre>
        </section>

        {/* Usage Examples Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>

          <h3 className="text-lg font-medium mb-2">Editor Only (No Chat)</h3>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-6 text-sm">
            <code>{`import { AgentPlaygroundLite } from "@open-resource-discovery/a2a-editor/lite";
import "@open-resource-discovery/a2a-editor/styles";

function App() {
  return (
    <AgentPlaygroundLite
      showValidation={false}
      onAgentCardChange={(json, parsed) => {
        // Save to backend
      }}
    />
  );
}`}</code>
          </pre>

          <h3 className="text-lg font-medium mb-2">Lightweight Viewer</h3>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-6 text-sm">
            <code>{`import { AgentViewer } from "@open-resource-discovery/a2a-editor/viewer";
import "@open-resource-discovery/a2a-editor/styles";

function App() {
  return (
    <AgentViewer
      initialAgentUrl="https://example.com/.well-known/agent.json"
      showValidation={false}
    />
  );
}`}</code>
          </pre>
        </section>

        {/* Props Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Props</h2>

          <h3 className="text-lg font-medium mb-2">AgentPlayground</h3>
          <div className="border rounded-lg overflow-x-auto mb-6">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Prop</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Default</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono text-xs">initialAgentCard</td>
                  <td className="p-3 text-muted-foreground">string</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Initial agent card JSON string</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">initialAgentUrl</td>
                  <td className="p-3 text-muted-foreground">string</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Initial agent URL to connect to</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">showSettings</td>
                  <td className="p-3 text-muted-foreground">boolean</td>
                  <td className="p-3 text-muted-foreground">true</td>
                  <td className="p-3">Show the settings/agents panel</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">showValidation</td>
                  <td className="p-3 text-muted-foreground">boolean</td>
                  <td className="p-3 text-muted-foreground">true</td>
                  <td className="p-3">Show the validation tab</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">showChat</td>
                  <td className="p-3 text-muted-foreground">boolean</td>
                  <td className="p-3 text-muted-foreground">true</td>
                  <td className="p-3">Show the chat tab</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">showEditor</td>
                  <td className="p-3 text-muted-foreground">boolean</td>
                  <td className="p-3 text-muted-foreground">true</td>
                  <td className="p-3">Show the JSON editor</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">readOnly</td>
                  <td className="p-3 text-muted-foreground">boolean</td>
                  <td className="p-3 text-muted-foreground">false</td>
                  <td className="p-3">Make the editor read-only</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">defaultTab</td>
                  <td className="p-3 text-muted-foreground">"overview" | "chat" | "validation"</td>
                  <td className="p-3 text-muted-foreground">"overview"</td>
                  <td className="p-3">Default tab to show</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">onAgentCardChange</td>
                  <td className="p-3 text-muted-foreground">(json, parsed) =&gt; void</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Callback when agent card changes</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">onConnect</td>
                  <td className="p-3 text-muted-foreground">(url, card) =&gt; void</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Callback when connected to agent</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">onValidationComplete</td>
                  <td className="p-3 text-muted-foreground">(results) =&gt; void</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Callback when validation completes</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">className</td>
                  <td className="p-3 text-muted-foreground">string</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Additional CSS class</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium mb-2">AgentPlaygroundLite / AgentEditor</h3>
          <p className="text-muted-foreground mb-4">
            Same as AgentPlayground but without <code className="bg-muted px-1 rounded">showChat</code> and{" "}
            <code className="bg-muted px-1 rounded">showEditor</code> props.
          </p>

          <h3 className="text-lg font-medium mb-2">AgentViewer</h3>
          <div className="border rounded-lg overflow-x-auto mb-6">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Prop</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Default</th>
                  <th className="text-left p-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-mono text-xs">initialAgentCard</td>
                  <td className="p-3 text-muted-foreground">string</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Initial agent card JSON string</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">initialAgentUrl</td>
                  <td className="p-3 text-muted-foreground">string</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Initial agent URL</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">showValidation</td>
                  <td className="p-3 text-muted-foreground">boolean</td>
                  <td className="p-3 text-muted-foreground">true</td>
                  <td className="p-3">Show the validation tab</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">defaultTab</td>
                  <td className="p-3 text-muted-foreground">"overview" | "validation"</td>
                  <td className="p-3 text-muted-foreground">"overview"</td>
                  <td className="p-3">Default tab to show</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">onAgentCardChange</td>
                  <td className="p-3 text-muted-foreground">(json, parsed) =&gt; void</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Callback when agent card changes</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">onValidationComplete</td>
                  <td className="p-3 text-muted-foreground">(results) =&gt; void</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Callback when validation completes</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">className</td>
                  <td className="p-3 text-muted-foreground">string</td>
                  <td className="p-3 text-muted-foreground">-</td>
                  <td className="p-3">Additional CSS class</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Advanced Usage Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Advanced Usage</h2>

          <h3 className="text-lg font-medium mb-2">Store Access</h3>
          <p className="text-muted-foreground mb-2">
            For custom integrations, you can access the internal Zustand stores:
          </p>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-6 text-sm">
            <code>{`import {
  useAgentCardStore,
  useConnectionStore,
  useChatStore,
  useValidationStore,
} from "@open-resource-discovery/a2a-editor";

function CustomComponent() {
  const { rawJson, parsedCard } = useAgentCardStore();
  const { connectionStatus, url } = useConnectionStore();
  // ...
}`}</code>
          </pre>

          <h3 className="text-lg font-medium mb-2">Hooks</h3>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-6 text-sm">
            <code>{`import {
  useTheme,
  useIsLargeScreen,
  useAutoValidate,
} from "@open-resource-discovery/a2a-editor";`}</code>
          </pre>

          <h3 className="text-lg font-medium mb-2">Types</h3>
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto mb-6 text-sm">
            <code>{`import type {
  AgentCard,
  AgentSkill,
  AgentCapabilities,
  ValidationResult,
  ChatMessage,
} from "@open-resource-discovery/a2a-editor";`}</code>
          </pre>
        </section>

        {/* Peer Dependencies Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Peer Dependencies</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              <code className="bg-muted px-1 rounded">react</code> ^18.0.0 || ^19.0.0
            </li>
            <li>
              <code className="bg-muted px-1 rounded">react-dom</code> ^18.0.0 || ^19.0.0
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
