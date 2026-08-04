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

export async function GET(request: NextRequest) {
  const result = await fetchOpenNotebook('/openapi.json');

  if (!result.ok) {
    return NextResponse.json(
      { error: 'OpenAPI spec unavailable', details: result.body },
      { status: result.status || 503 }
    );
  }

  return NextResponse.json(result.body, { status: result.status });
}