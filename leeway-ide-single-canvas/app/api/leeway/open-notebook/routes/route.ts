function resolveOpenNotebookOperation(openApiDoc: any, intent: string) {
  const intentPatterns: Record<string, RegExp[]> = {
    createNotebook: [/create.*notebook/i, /notebook.*create/i],
    listNotebooks: [/list.*notebook/i, /get.*notebooks/i],
    getNotebook: [/^get.*notebook$/i, /^notebook.*get$/i],
    readbackNotebook: [/readback.*notebook/i, /notebook.*readback/i],
    appendNotebook: [/append.*notebook/i, /notebook.*append/i],
    reviseNotebook: [/revise.*notebook/i, /notebook.*revise/i],
    exportPdfNotebook: [/export.*pdf.*notebook/i, /notebook.*export.*pdf/i],
    createCreative: [/create.*creative/i, /creative.*create/i],
    listCreatives: [/list.*creative/i, /get.*creatives/i],
    getCreative: [/^get.*creative$/i, /^creative.*get$/i],
    readbackCreative: [/readback.*creative/i, /creative.*readback/i],
    reviseCreative: [/revise.*creative/i, /creative.*revise/i],
    exportPdfCreative: [/export.*pdf.*creative/i, /creative.*export.*pdf/i],
    getCreativePackage: [/creative.*package/i, /package.*creative/i],
    search: [/search/i],
    ask: [/ask/i, /chat/i],
    commandStatus: [/command.*status/i, /get.*command/i],
  };

  const patterns = intentPatterns[intent] || [];
  const candidates: any[] = [];

  const apiPaths = openApiDoc?.paths || {};
  for (const [route, routeDef] of Object.entries(apiPaths)) {
    const routeDefObj = routeDef as Record<string, any>;
    for (const [method, operation] of Object.entries(routeDefObj)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

      const searchable = [
        route,
        operation?.operationId,
        operation?.summary,
        ...(operation?.tags || [])
      ].filter(Boolean).join(' ');

      let score = 0;
      for (const pattern of intentPatterns[intent] || []) {
        if (pattern.test(searchable)) {
          score += 10;
        }
      }

      if (score > 0) {
        candidates.push({ route, method: method.toUpperCase(), operationId: operation?.operationId || '', summary: operation?.summary || '', score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0] || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get('intent');

  if (!intent) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'INTENT_REQUIRED',
      message: 'intent query parameter required',
    }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const openApiResult = await fetch('http://leeway_open_notebook:5326/openapi.json')
    .then(r => r.json().catch(() => ({})))
    .catch(() => ({}));

  if (!openApiResult?.paths) {
    return new Response(JSON.stringify({ ok: false, error: 'OPENAPI_UNAVAILABLE' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });
  }

  const operation = resolveOpenNotebookOperation(openApiResult, searchParams.get('intent') || '');

  if (!operation) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'UNSUPPORTED_INTENT',
      intent: searchParams.get('intent')
    }), { status: 501, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    ok: true,
    intent: searchParams.get('intent'),
    matchedOperation: operation
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}