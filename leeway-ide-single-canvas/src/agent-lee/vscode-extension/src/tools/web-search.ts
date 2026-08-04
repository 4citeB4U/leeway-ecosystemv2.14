/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: 🟣 MCP
TAG: MCP.TOOLS.WEBSEARCH.MAIN

5WH:
WHAT = Performs lightweight web lookups for Agent Lee.
WHY = Gives the runtime a simple external knowledge fallback when precision allows.
WHO = Agent Lee / LeeWay Runtime.
WHERE = agent-lee/vscode-extension/src/tools/web-search.ts
WHEN = 2026
HOW = Calls the DuckDuckGo instant answer endpoint and condenses the response.
*/

export async function webSearch(query: string) {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;

  try {
    const res = await fetch(url);
    const data:any = await res.json();

    const summary = [
      data.AbstractText,
      data.Heading,
      ...(data.RelatedTopics || []).slice(0,5).map((x:any) => x.Text).filter(Boolean)
    ].filter(Boolean).join("\n");

    return summary || `No strong instant answer found for: ${query}. Use official docs when precision matters.`;
  } catch (err:any) {
    return `Web search failed: ${err.message}`;
  }
}

/*
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
