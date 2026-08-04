const KERNEL_BASE = process.env.LEEWAY_KERNEL_BASE || "http://127.0.0.1:4002";

export async function kernelFetch(path: string, init?: RequestInit, timeoutMs = 5000): Promise<{ ok: boolean; status: number; body: unknown }> {
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
