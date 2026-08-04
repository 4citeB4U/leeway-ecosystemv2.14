import { NextRequest, NextResponse } from 'next/server';

const OPEN_NOTEBOOK_BASE_URL = process.env.OPEN_NOTEBOOK_BASE_URL || 'http://leeway_open_notebook:5326';

function openNotebookHeaders(): Record<string, string> {
  const result: Record<string, string> = {
    'content-type': 'application/json'
  };

  const authHeader = process.env.OPEN_NOTEBOOK_AUTH_HEADER;
  const authValue = process.env.OPEN_NOTEBOOK_AUTH_VALUE;

  if (authHeader && authValue) {
    result[authHeader] = authValue;
  }

  return result;
}

async function fetchOpenNotebook(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; body: any; headers: Record<string, string> }> {
  const url = `${process.env.OPEN_NOTEBOOK_BASE_URL || 'http://leeway_open_notebook:5326'}${path}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...openNotebookHeaders(),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      body,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      body: { error: error?.message || 'Fetch failed' },
      headers: {},
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function invokeOpenNotebook(
  intent: string,
  payload: any
): Promise<{ ok: boolean; status: number; body: any }> {
  const openApiResult = await fetchOpenNotebook('/openapi.json');
  
  if (!openApiResult.ok) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'OPEN_NOTEBOOK_OPENAPI_UNAVAILABLE',
        details: openApiResult.body,
      },
    };
  }

  const intentPatterns: Record<string, RegExp[]> = {
    createNotebook: [
      /create.*notebook/i,
      /notebook.*create/i
    ],
    listNotebooks: [
      /list.*notebook/i,
      /get.*notebooks/i
    ],
    getNotebook: [
      /^get.*notebook$/i,
      /^notebook.*get$/i
    ],
    readbackNotebook: [
      /readback.*notebook/i,
      /notebook.*readback/i
    ],
    appendNotebook: [
      /append.*notebook/i,
      /notebook.*append/i
    ],
    reviseNotebook: [
      /revise.*notebook/i,
      /notebook.*revise/i
    ],
    exportPdfNotebook: [
      /export.*pdf.*notebook/i,
      /notebook.*export.*pdf/i
    ],
    createCreative: [
      /create.*creative/i,
      /creative.*create/i
    ],
    listCreatives: [
      /list.*creative/i,
      /get.*creatives/i
    ],
    getCreative: [
      /^get.*creative$/i,
      /^creative.*get$/i
    ],
    readbackCreative: [
      /readback.*creative/i,
      /creative.*readback/i
    ],
    reviseCreative: [
      /revise.*creative/i,
      /creative.*revise/i
    ],
    exportPdfCreative: [
      /export.*pdf.*creative/i,
      /creative.*export.*pdf/i
    ],
    getCreativePackage: [
      /creative.*package/i,
      /package.*creative/i
    ],
    search: [
      /search/i
    ],
    ask: [
      /ask/i,
      /chat/i
    ],
    commandStatus: [
      /command.*status/i,
      /get.*command/i
    ],
    // R2 NEW: Research & Source capabilities
    researchSearch: [
      /research.*search/i,
      /search.*research/i,
      /find.*source/i,
      /find.*paper/i
    ],
    askSources: [
      /ask.*source/i,
      /source.*ask/i,
      /question.*source/i
    ],
    createClaim: [
      /create.*claim/i,
      /claim.*create/i,
      /make.*claim/i
    ],
    validateCitation: [
      /validate.*citation/i,
      /verify.*citation/i,
      /check.*citation/i
    ],
    linkNotebook: [
      /link.*notebook/i,
      /connect.*notebook/i
    ],
    listSources: [
      /list.*source/i,
      /get.*sources/i
    ]
  };

  const patterns = intentPatterns[intent] || [];
  const candidates: Array<{ route: string; method: string; operationId: string; summary: string; score: number }> = [];

  const openApi = openApiResult.body;
  if (openApi?.paths) {
    for (const [route, routeDef] of Object.entries(openApi.paths as Record<string, any>)) {
      for (const [method, operation] of Object.entries(routeDef as Record<string, any>)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

        const searchable = [
          route,
          operation?.operationId,
          operation?.summary,
          ...(operation?.tags || [])
        ].filter(Boolean).join(' ');

        let score = 0;
        for (const pattern of patterns) {
          if (pattern.test(searchable)) {
            score += 10;
          }
        }

        if (score > 0) {
          candidates.push({
            route,
            method: method.toUpperCase(),
            operationId: operation?.operationId || '',
            summary: operation?.summary || '',
            score
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      ok: false,
      status: 501,
      body: {
        error: 'UNSUPPORTED_BY_DEPLOYED_OPEN_NOTEBOOK_VERSION',
        intent
      }
    };
  }

  const operation = candidates[0];

  if (/\{[^}]+\}/.test(operation.route)) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'ROUTE_REQUIRES_PATH_PARAMETERS',
        operation
      }
    };
  }

  const result = await fetchOpenNotebook(operation.route, {
    method: operation.method,
    body: operation.method === 'GET' || operation.method === 'HEAD' ? undefined : JSON.stringify(payload || {}),
  });

  return {
    ok: result.ok,
    status: result.status,
    body: result.body,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const intent = String(body.intent || '').trim();
    const payload = body.payload || {};

    if (!intent) {
      return NextResponse.json({
        ok: false,
        error: 'OPEN_NOTEBOOK_INTENT_REQUIRED',
        message: 'intent field required',
      }, { status: 400 });
    }

    const result = await invokeOpenNotebook(intent, payload);

    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    return NextResponse.json({
      error: 'OPEN_NOTEBOOK_PROVIDER_ERROR',
      message: error?.message || 'Provider error',
    }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const intent = searchParams.get('intent');

  if (!intent) {
    return NextResponse.json({
      ok: false,
      error: 'INTENT_REQUIRED',
      message: 'intent query parameter required',
    }, { status: 400 });
  }

  // For GET requests, we just check the route exists
  const openApiResult = await fetchOpenNotebook('/openapi.json');
  
  if (!openApiResult.ok) {
    return NextResponse.json({
      ok: false,
      error: 'OPEN_NOTEBOOK_OPENAPI_UNAVAILABLE',
    }, { status: 503 });
  }

  const intentPatterns: Record<string, RegExp[]> = {
    createNotebook: [/create.*notebook/i, /notebook.*create/i],
    listNotebooks: [/list.*notebook/i, /get.*notebooks/i],
    createSource: [/create.*source/i, /add.*source/i, /source.*create/i],
    search: [/search/i],
    ask: [/ask/i, /chat/i],
    commandStatus: [/command.*status/i, /get.*command/i],
  };

  const patterns = intentPatterns[intent] || [];
  const candidates: any[] = [];

  const openApi = openApiResult.body;
  if (openApi?.paths) {
    for (const [route, routeDef] of Object.entries(openApi.paths as Record<string, any>)) {
      for (const [method, operation] of Object.entries(routeDef as Record<string, any>)) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;

        const searchable = [
          route,
          operation?.operationId,
          operation?.summary,
          ...(operation?.tags || [])
        ].filter(Boolean).join(' ');

        let score = 0;
        for (const pattern of patterns) {
          if (pattern.test(searchable)) {
            score += 10;
          }
        }

        if (score > 0) {
          candidates.push({
            route,
            method: method.toUpperCase(),
            operationId: operation?.operationId || '',
            summary: operation?.summary || '',
            score
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return NextResponse.json({
      ok: false,
      error: 'UNSUPPORTED_INTENT',
      intent
    }, { status: 501 });
  }

  return NextResponse.json({
    ok: true,
    intent,
    matchedOperation: candidates[0]
  });
}