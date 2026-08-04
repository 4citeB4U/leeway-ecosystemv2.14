export type RemoteContext = {
  url: string;
  label: string;
  summary: string;
};

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleFromHtml(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : "";
}

function normalizeGitHubRawUrl(url: string) {
  const blob = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (blob) {
    return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${blob[3]}/${blob[4]}`;
  }
  return url;
}

export async function fetchRemoteContext(url: string): Promise<RemoteContext> {
  const target = normalizeGitHubRawUrl(url);
  const response = await fetch(target, {
    headers: {
      "User-Agent": "Agent-Lee/1.1"
    }
  });

  if (!response.ok) {
    throw new Error(`Remote fetch failed with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();

  if (contentType.includes("text/html")) {
    const title = titleFromHtml(body) || url;
    const plainText = stripHtml(body).slice(0, 6000);
    return {
      url,
      label: title,
      summary: `REMOTE_URL: ${url}\nPAGE_TITLE: ${title}\nPAGE_TEXT:\n${plainText}`
    };
  }

  return {
    url,
    label: url,
    summary: `REMOTE_URL: ${url}\nCONTENT_TYPE: ${contentType || "unknown"}\nCONTENT:\n${body.slice(0, 6000)}`
  };
}
/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.CONTEXT.REMOTE.MAIN
REGION: 🟢 CORE
PURPOSE: Remote context intake and workspace context support for Agent Lee operations.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/
