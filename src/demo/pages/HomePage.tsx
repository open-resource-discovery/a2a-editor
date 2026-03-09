import { HeroSection } from "../home/HeroSection";
import { PredefinedAgentsList } from "../home/PredefinedAgentsList";

export function HomePage() {
  return (
    <div className="h-full overflow-auto">
      <HeroSection />
      <PredefinedAgentsList />
    </div>
  );
}
