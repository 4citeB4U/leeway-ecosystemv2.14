"use client";

import { useEffect, useRef, useState } from "react";
import type { ScreenData, ScreenScript } from "@/src/lib/screens-data";

function parseAttrs(attrString: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(attrString))) out[m[1]] = m[2];
  return out;
}

async function appendScripts(container: HTMLElement, scripts: ScreenScript[]) {
  for (const sc of scripts) {
    if (sc.kind === "external") {
      await new Promise<void>((resolve) => {
        const el = document.createElement("script");
        el.async = false;
        el.src = sc.src;
        el.onload = () => resolve();
        el.onerror = () => resolve();
        container.appendChild(el);
      });
    } else {
      const el = document.createElement("script");
      el.textContent = sc.code;
      container.appendChild(el);
    }
  }
}

export default function ScreenFrame({ screen }: { screen: ScreenData }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const root = mountRef.current;
    if (!root) return;

    for (const linkAttr of screen.links) {
      const attrs = parseAttrs(linkAttr);
      const el = document.createElement("link");
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      root.appendChild(el);
    }
    for (const style of screen.styles) {
      const el = document.createElement("style");
      el.textContent = style;
      root.appendChild(el);
    }
    (async () => {
      await appendScripts(root, screen.headScripts);

      const bodyDiv = document.createElement("div");
      bodyDiv.innerHTML = screen.bodyHtml;
      root.appendChild(bodyDiv);

      await appendScripts(root, screen.scripts);

      const tw = (window as unknown as { tailwind?: { config: unknown } }).tailwind;
      if (tw && "config" in tw) {
        tw.config = tw.config;
      }

      document.dispatchEvent(new Event("DOMContentLoaded"));
      setReady(true);
    })();
  }, [screen]);

  return (
    <div className={ready ? "" : "min-h-screen flex items-center justify-center"}>
      {!ready && <p className="font-mono text-sm text-gray-400">Loading LeeWay OS surface...</p>}
      <div ref={mountRef} />
    </div>
  );
}
