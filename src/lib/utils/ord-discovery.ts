import type { PredefinedAgent } from "@lib/types/connection";
import type { OrdConfiguration, ApiResource, OrdDocument } from "@open-resource-discovery/specification";

interface AgentCardJson {
  name?: string;
  description?: string;
  skills?: Array<{ id: string; name: string; tags?: string[] }>;
  url?: string;
}

export function isOrdUrl(url: string): boolean {
  return url.includes(".well-known/open-resource-discovery");
}

/**
 * Discovers A2A agents from an Open Resource Discovery endpoint.
 *
 * Accepts a base URL or a full `.well-known/open-resource-discovery` URL.
 * Fetches the ORD config, then each document, resolves agent card URLs, and
 * returns discovered A2A agents as PredefinedAgent entries with "ord-" id prefix.
 */
export async function discoverAgentsFromOrd(
  inputUrl: string,
  headers?: Record<string, string>,
): Promise<PredefinedAgent[]> {
  if (!inputUrl) return [];

  let configUrl = inputUrl.replace(/\/$/, "");
  if (!isOrdUrl(configUrl)) {
    configUrl += "/.well-known/open-resource-discovery";
  }

  const fetchOpts: RequestInit | undefined = headers ? { headers } : undefined;

  const configRes = await fetch(configUrl, fetchOpts);
  if (!configRes.ok) {
    throw new Error(`ORD config fetch failed: ${configRes.status} ${configRes.statusText}`);
  }
  const config: OrdConfiguration = await configRes.json();

  const providerOrigin = new URL(configUrl).origin;
  const baseUrl = (config.baseUrl || providerOrigin).replace(/\/$/, "");
  const docUrls = config.openResourceDiscoveryV1?.documents?.map((d) => d.url) ?? [];

  if (docUrls.length === 0) {
    throw new Error("No ORD documents found at this endpoint");
  }

  const agents: PredefinedAgent[] = [];

  for (const docPath of docUrls) {
    const docUrl = docPath.startsWith("http") ? docPath : `${baseUrl}${docPath}`;
    const docRes = await fetch(docUrl, fetchOpts);
    if (!docRes.ok) continue;
    const doc: OrdDocument = await docRes.json();

    const docProviderOrigin = new URL(docUrl).origin;

    const apiResourceMap = new Map(
      (doc.apiResources ?? []).map((r) => [r.ordId, r]),
    );

    const ordAgents = doc.agents ?? [];
    if (ordAgents.length > 0) {
      for (const ordAgent of ordAgents) {
        const exposedApiId = ordAgent.exposedApiResources?.[0]?.ordId;
        const apiResource = exposedApiId ? apiResourceMap.get(exposedApiId) : undefined;
        if (!apiResource) continue;

        const agent = await buildAgentFromApiResource(
          apiResource,
          ordAgent.title || apiResource.title || "Unknown Agent",
          ordAgent.shortDescription || apiResource.shortDescription || "",
          docProviderOrigin,
          fetchOpts,
        );
        if (agent) agents.push(agent);
      }
    } else {
      // Fallback: scan apiResources directly for a2a protocol when no agents[] array present
      for (const apiResource of doc.apiResources ?? []) {
        if (apiResource.apiProtocol !== "a2a") continue;
        const agent = await buildAgentFromApiResource(
          apiResource,
          apiResource.title || "Unknown Agent",
          apiResource.shortDescription || apiResource.description || "",
          docProviderOrigin,
          fetchOpts,
        );
        if (agent) agents.push(agent);
      }
    }
  }

  const seen = new Set<string>();
  return agents.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

async function buildAgentFromApiResource(
  apiResource: ApiResource,
  fallbackName: string,
  fallbackDescription: string,
  providerOrigin: string,
  fetchOpts?: RequestInit,
): Promise<PredefinedAgent | null> {
  const cardDef = apiResource.resourceDefinitions?.find(
    (rd) => rd.type === "a2a-agent-card" || rd.customType === "a2a:agent-card:v1",
  );
  if (!cardDef?.url) return null;

  const cardUrl = cardDef.url.startsWith("http")
    ? cardDef.url
    : `${providerOrigin}${cardDef.url}`;

  let card: AgentCardJson | null = null;
  try {
    const cardRes = await fetch(cardUrl, fetchOpts);
    if (cardRes.ok) card = await cardRes.json();
  } catch {
    // silently skip unreachable agent cards
  }

  if (!card) return null;

  const tags = [...new Set([...(card.skills?.flatMap((s) => s.tags ?? []) ?? []), "ORD"])];

  // Store the agent card URL as `url` — the connection store fetches it directly
  // (ends in .json) and sets messagingUrl from card.url for A2A messaging.
  return {
    id: `ord-${apiResource.ordId}`,
    name: card.name || fallbackName,
    description: card.description || fallbackDescription,
    url: cardUrl,
    authType: "none",
    tags,
    mocked: false,
  };
}
