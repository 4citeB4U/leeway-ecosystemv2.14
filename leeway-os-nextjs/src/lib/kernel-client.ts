const KERNEL_BASE = String(process.env.LEEWAY_KERNEL_BASE || "").trim();

export function kernelBinding() {
  return {
    configured: Boolean(KERNEL_BASE),
    endpoint: KERNEL_BASE || null,
    environment: "LEEWAY_KERNEL_BASE"
  };
}

export async function kernelFetch(path: string, init?: RequestInit, timeoutMs = 5000): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!KERNEL_BASE) {
    return {
      ok: false,
      status: 0,
      body: {
        status: "BLOCKED",
        reason: "LEEWAY_KERNEL_BASE_NOT_CONFIGURED",
        exactFix: "Bind an authorized Runtime Kernel endpoint through LEEWAY_KERNEL_BASE. Localhost is not assumed."
      }
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${KERNEL_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(init?.headers || {}) },
      cache: "no-store"
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: String((err as Error).message || err) } };
  } finally {
    clearTimeout(timer);
  }
}
