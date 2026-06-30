import type { AgentCapabilities } from "@lib/types/a2a";
import { SectionCard, Badge } from "@open-resource-discovery/ui-components";
import { Zap, Bell, History, FileText } from "lucide-react";

interface CapabilitiesSectionProps {
  capabilities: AgentCapabilities;
}

export function CapabilitiesSection({ capabilities }: CapabilitiesSectionProps) {
  const allItems = [
    {
      key: "streaming",
      label: "Streaming",
      icon: Zap,
      enabled: capabilities.streaming === true,
    },
    {
      key: "pushNotifications",
      label: "Push Notifications",
      icon: Bell,
      enabled: capabilities.pushNotifications === true,
    },
    {
      key: "stateTransitionHistory",
      label: "State History",
      icon: History,
      enabled: capabilities.stateTransitionHistory === true,
    },
    {
      key: "extendedAgentCard",
      label: "Extended Card",
      icon: FileText,
      enabled: capabilities.extendedAgentCard === true,
    },
  ];

  // Only show capabilities that are enabled
  const items = allItems.filter((item) => item.enabled);

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionCard.Root>
      <SectionCard.Header title="Capabilities" icon={<Zap />} />
      <SectionCard.Content>
        <div className="flex flex-wrap gap-2">
          {items.map(({ key, label, icon: Icon }) => (
            <Badge key={key} variant="success">
              <Icon className="h-3 w-3" />
              {label}
            </Badge>
          ))}
        </div>
      </SectionCard.Content>
    </SectionCard.Root>
  );
}
