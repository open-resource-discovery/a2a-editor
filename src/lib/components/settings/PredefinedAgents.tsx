import { useEffect, useState, useMemo } from "react";
import { usePredefinedAgentsStore } from "@lib/stores/predefinedAgentsStore";
import { Badge } from "@lib/components/ui/badge";
import { Button } from "@lib/components/ui/button";
import { Input } from "@lib/components/ui/input";
import { PasswordInput } from "@lib/components/ui/PasswordInput";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@lib/components/ui/select";
import { cn } from "@lib/utils/cn";
import { selectPredefinedAgent, clearAgentState } from "@lib/utils/agent-selection";
import { detectProtocolVersion, normalizeAgentCard } from "@lib/utils/a2a-protocol";
import { buildAddHeaders, mapAddAuth, buildPredefinedConnHeaders } from "@lib/utils/predefined-auth";
import type { AddAuthType } from "@lib/utils/predefined-auth";
import { Search, Plus, X, Loader2, Globe } from "lucide-react";
import type { PredefinedAgent } from "@lib/types/connection";

function parseAgentUrl(input: string): { normalizedUrl: string; fetchUrl: string } {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Please enter a URL");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Please enter a valid absolute URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported");
  }

  const normalizedUrl = parsed.href.replace(/\/$/, "");
  const fetchUrl = parsed.pathname.endsWith(".json") ? parsed.href : `${normalizedUrl}/.well-known/agent.json`;

  return { normalizedUrl, fetchUrl };
}

export function PredefinedAgents() {
  const { agents, selectedId, loadDefaults, addCustomAgent, removeAgent, loadFromOrd } =
    usePredefinedAgentsStore();

  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgentUrl, setNewAgentUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addAuthType, setAddAuthType] = useState<AddAuthType>("none");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addToken, setAddToken] = useState("");
  const [addApiKey, setAddApiKey] = useState("");

  const [showOrdForm, setShowOrdForm] = useState(false);
  const [ordUrl, setOrdUrl] = useState("");
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState("");
  const [discoverMessage, setDiscoverMessage] = useState("");

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const customAgents = useMemo(() => agents.filter((a) => a.id.startsWith("custom-")), [agents]);
  const ordAgents = useMemo(() => agents.filter((a) => a.id.startsWith("ord-")), [agents]);
  const predefinedAgents = useMemo(
    () => agents.filter((a) => !a.id.startsWith("custom-") && !a.id.startsWith("ord-")),
    [agents],
  );

  const filterAgents = (agentList: PredefinedAgent[]) => {
    if (!search) return agentList;
    const query = search.toLowerCase();
    return agentList.filter((agent) => {
      const matchesName = agent.name.toLowerCase().includes(query);
      const matchesDescription = agent.description?.toLowerCase().includes(query);
      const matchesTags = agent.tags?.some((tag) => tag.toLowerCase().includes(query));
      const matchesUrl = agent.url.toLowerCase().includes(query);
      return matchesName || matchesDescription || matchesTags || matchesUrl;
    });
  };

  const filteredCustom = filterAgents(customAgents);
  const filteredOrd = filterAgents(ordAgents);
  const filteredPredefined = filterAgents(predefinedAgents);
  const isValidNewAgentUrl = (() => {
    if (!newAgentUrl.trim()) return false;
    try {
      parseAgentUrl(newAgentUrl);
      return true;
    } catch {
      return false;
    }
  })();

  const handleSelectAgent = async (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;

    // Build connection-specific auth headers if available
    const connectHeaders = agent.connectionAuthType && agent.connectionAuthConfig
      ? buildPredefinedConnHeaders(agent.connectionAuthType, agent.connectionAuthConfig)
      : undefined;

    await selectPredefinedAgent(agent, {
      connectHeaders,
      closeSettingsPanel: true,
    });
  };

  const handleRemoveAgent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedId === id) {
      clearAgentState();
    }
    removeAgent(id);
  };

  const handleAddAgent = async () => {
    setIsAdding(true);
    setAddError("");

    try {
      const { normalizedUrl, fetchUrl } = parseAgentUrl(newAgentUrl);

      if (agents.some((a) => a.url === normalizedUrl)) {
        throw new Error("An agent with this URL already exists");
      }

      const headers = buildAddHeaders(addAuthType, addUsername, addPassword, addToken, addApiKey);
      const res = await fetch(fetchUrl, headers ? { headers } : undefined);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }

      const card = await res.json();
      const protocolVersion = detectProtocolVersion(card);
      const normalizedCard = normalizeAgentCard(card);

      // Create custom agent entry with auth credentials
      const { authType, authConfig } = mapAddAuth(addAuthType, addUsername, addPassword, addToken, addApiKey);
      const customAgent: PredefinedAgent = {
        id: `custom-${Date.now()}`,
        name: normalizedCard.name || "Custom Agent",
        description: normalizedCard.description ?? "",
        url: normalizedUrl,
        authType,
        ...(authConfig ? { authConfig } : {}),
        tags: [...new Set([...(normalizedCard.skills?.flatMap((s) => s.tags ?? []) ?? []), "Custom"])],
        mocked: false,
        protocolVersion,
      };

      addCustomAgent(customAgent);
      setNewAgentUrl("");
      setShowAddForm(false);
      setAddAuthType("none");
      setAddUsername("");
      setAddPassword("");
      setAddToken("");
      setAddApiKey("");

      // Auto-select the new agent
      handleSelectAgent(customAgent.id);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add agent");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDiscover = async () => {
    if (!ordUrl.trim()) return;
    setIsDiscovering(true);
    setDiscoverError("");
    setDiscoverMessage("");
    try {
      const added = await loadFromOrd(ordUrl.trim());
      setDiscoverMessage(added === 0 ? "No new agents found" : `Added ${added} agent${added !== 1 ? "s" : ""}`);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setIsDiscovering(false);
    }
  };

  const renderAgentCard = (agent: PredefinedAgent, isCustom: boolean) => (
    <div
      key={agent.id}
      role="listitem"
      data-testid={`agent-card-${agent.id}`}
      tabIndex={0}
      className={cn(
        "rounded-lg border p-3 cursor-pointer transition-colors relative group",
        selectedId === agent.id ? "border-primary bg-accent" : "hover:bg-accent/50",
      )}
      onClick={() => handleSelectAgent(agent.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelectAgent(agent.id);
        }
      }}>
      {isCustom && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => handleRemoveAgent(e, agent.id)}>
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="font-medium text-sm pr-6">{agent.name}</div>
      {agent.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>}
      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {agent.mocked !== false && (
            <Badge variant="outline" className="text-xs h-5 border-warning/50 text-warning">
              Mocked LLM
            </Badge>
          )}
          {agent.tags.filter((t) => t === "Custom" || t === "ORD").map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs h-5 border-warning/50 text-warning">
              {tag}
            </Badge>
          ))}
          {agent.tags.filter((t) => t !== "Custom" && t !== "ORD").slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs h-5">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 bg-sidebar pt-8 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Agents</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1"
              onClick={() => { setShowOrdForm(!showOrdForm); setShowAddForm(false); }}
              data-testid="discover-ord-btn">
              <Globe className="h-3.5 w-3.5" />
              Discover
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => { setShowAddForm(!showAddForm); setShowOrdForm(false); }} data-testid="add-agent-btn">
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </div>

        {/* ORD discovery form */}
        {showOrdForm && (
          <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
            <p className="text-xs text-muted-foreground">Enter an ORD endpoint to discover A2A agents.</p>
            <Input
              placeholder="https://example.com/.well-known/open-resource-discovery"
              data-testid="ord-url-input"
              value={ordUrl}
              onChange={(e) => {
                setOrdUrl(e.target.value);
                if (discoverError) setDiscoverError("");
                if (discoverMessage) setDiscoverMessage("");
              }}
              className="h-8 text-sm"
              type="url"
              inputMode="url"
              autoComplete="url"
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
            {discoverError && <p className="text-xs text-destructive">{discoverError}</p>}
            {discoverMessage && <p className="text-xs text-muted-foreground">{discoverMessage}</p>}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleDiscover} disabled={isDiscovering || !ordUrl.trim()} data-testid="discover-ord-submit">
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  "Discover"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Add agent form */}
        {showAddForm && (
          <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
            <Input
              placeholder="Enter agent URL..."
              data-testid="add-agent-url"
              value={newAgentUrl}
              onChange={(e) => {
                setNewAgentUrl(e.target.value);
                if (addError) setAddError("");
              }}
              className="h-8 text-sm"
              type="url"
              inputMode="url"
              autoComplete="url"
              onKeyDown={(e) => e.key === "Enter" && handleAddAgent()}
            />
            {addError && <p className="text-xs text-destructive">{addError}</p>}
            {!addError && newAgentUrl.trim() && !isValidNewAgentUrl && (
              <p className="text-xs text-destructive">Please enter a valid absolute http:// or https:// URL.</p>
            )}

            {/* Auth for secured agent card endpoints */}
            <Select value={addAuthType} onValueChange={(v) => setAddAuthType(v as AddAuthType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Authentication</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apiKey">API Key</SelectItem>
              </SelectContent>
            </Select>

            {addAuthType === "basic" && (
              <div className="space-y-2">
                <Input
                  placeholder="Username"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
                <PasswordInput
                  placeholder="Password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="h-8 text-sm"
                  autoComplete="off"
                />
              </div>
            )}

            {addAuthType === "bearer" && (
              <PasswordInput
                placeholder="Bearer Token"
                value={addToken}
                onChange={(e) => setAddToken(e.target.value)}
                className="h-8 text-sm"
                autoComplete="off"
              />
            )}

            {addAuthType === "apiKey" && (
              <PasswordInput
                placeholder="API Key"
                value={addApiKey}
                onChange={(e) => setAddApiKey(e.target.value)}
                className="h-8 text-sm"
                autoComplete="off"
              />
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewAgentUrl("");
                  setAddError("");
                }}
                data-testid="add-agent-cancel">
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddAgent} disabled={isAdding || !isValidNewAgentUrl} data-testid="add-agent-submit">
                {isAdding ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Agent"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            data-testid="agent-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Custom agents section */}
      {filteredCustom.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Your Agents</p>
          {filteredCustom.map((agent) => renderAgentCard(agent, true))}
        </div>
      )}

      {/* ORD agents section */}
      {filteredOrd.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">ORD Agents</p>
          {filteredOrd.map((agent) => renderAgentCard(agent, true))}
        </div>
      )}

      {/* Predefined agents section */}
      {filteredPredefined.length > 0 && (
        <div className="space-y-2">
          {(filteredCustom.length > 0 || filteredOrd.length > 0) && (
            <p className="text-xs text-muted-foreground font-medium">Examples</p>
          )}
          {filteredPredefined.map((agent) => renderAgentCard(agent, false))}
        </div>
      )}

      {filteredCustom.length === 0 && filteredOrd.length === 0 && filteredPredefined.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">No agents found</p>
      )}
    </div>
  );
}
