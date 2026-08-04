/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.AGENT_LEE.TOOLS.WEB_SEARCH
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export async function webSearch(query: string) {
  const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
  return "Search results retrieved. (Expand with API later)";
}

