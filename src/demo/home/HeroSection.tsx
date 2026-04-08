import { Link } from "react-router-dom";
import { Button } from "@lib/components/ui/button";

const base = import.meta.env.BASE_URL;

export function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-6 px-6 py-20 text-center">
      <img src={`${base}images/small-light.svg`} alt="A2A Logo" className="h-16 w-auto dark:hidden" />
      <img src={`${base}images/small-dark.svg`} alt="A2A Logo" className="hidden h-16 w-auto dark:block" />
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">A2A Editor</h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Analyze, validate, and interact with Agent-to-Agent (A2A) protocol agent cards. Connect to agents, inspect their
        capabilities, and test communication in real-time.
      </p>
      <Link to="/playground">
        <Button size="lg">Open Playground</Button>
      </Link>
    </section>
  );
}
