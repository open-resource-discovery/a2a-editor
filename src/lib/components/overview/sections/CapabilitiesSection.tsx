import type { AgentCapabilities } from "@lib/types/a2a";
import { Card, Badge } from "@open-resource-discovery/ui-components";
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
    <Card>
      <Card.Header className="py-3">
        <Card.Title className="text-sm">Capabilities</Card.Title>
      </Card.Header>
      <Card.Content className="pt-0">
        <div className="flex flex-wrap gap-2">
          {items.map(({ key, label, icon: Icon }) => (
            <Badge
              key={key}
              variant="success"
              className="flex items-center gap-1"
            >
              <Icon className="h-3 w-3" />
              {label}
            </Badge>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
