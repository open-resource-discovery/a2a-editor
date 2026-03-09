import React, { useEffect, useState } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";

interface PredefinedAgent {
  id: string;
  name: string;
  description?: string;
  url: string;
  tags?: string[];
}

function HeroSection(): React.JSX.Element {
  const lightLogo = useBaseUrl("/img/a2a-light.svg");
  const darkLogo = useBaseUrl("/img/a2a-dark.svg");

  return (
    <section className="hero-section">
      <img
        src={lightLogo}
        alt="A2A Logo"
        className="hero-logo hero-logo--light"
      />
      <img
        src={darkLogo}
        alt="A2A Logo"
        className="hero-logo hero-logo--dark"
      />
      <h1 className="hero-title">A2A Editor</h1>
      <p className="hero-description">
        Analyze, validate, and interact with Agent-to-Agent (A2A) protocol agent
        cards. Connect to agents, inspect their capabilities, and test
        communication in real-time.
      </p>
      <Link className="hero-cta" to="/playground">
        Open Playground
      </Link>
    </section>
  );
}

function AgentCard({ agent }: { agent: PredefinedAgent }): React.JSX.Element {
  return (
    <Link to={`/playground?agent=${agent.id}`} className="agent-card">
      <h3 className="agent-card__title">{agent.name}</h3>
      {agent.description && (
        <p className="agent-card__description">{agent.description}</p>
      )}
      {agent.tags && agent.tags.length > 0 && (
        <div className="agent-card__tags">
          {agent.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="agent-card__tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function PredefinedAgentsList(): React.JSX.Element | null {
  const { siteConfig } = useDocusaurusContext();
  const [agents, setAgents] = useState<PredefinedAgent[]>([]);

  useEffect(() => {
    try {
      const raw = siteConfig.customFields?.predefinedAgents as string;
      const data: PredefinedAgent[] = raw ? JSON.parse(raw) : [];
      const realAgents = data.filter(
        (a: PredefinedAgent) => !a.url.startsWith("mock://"),
      );
      setAgents(realAgents);
    } catch {
      // Invalid JSON — no agents to show
    }
  }, [siteConfig]);

  if (agents.length === 0) {
    return null;
  }

  return (
    <section className="agents-section">
      <div className="agents-container">
        <h2 className="agents-heading">Predefined Agents</h2>
        <div className="agents-grid">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="React components for editing and testing A2A Agent Cards"
      wrapperClassName="home"
    >
      <main>
        <HeroSection />
        <PredefinedAgentsList />
      </main>
    </Layout>
  );
}
