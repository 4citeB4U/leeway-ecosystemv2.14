import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ROOT = "E:/ .LeeWay-Produucts-File/Leeway-Ecosystem v2.1.4".replace("E:/ ", "E:/");

const FILES = {
  enrichment: path.join(ROOT, "runtime", "sentinel-discovery", "enrichment", "latest", "network-bluetooth-enrichment-latest.json"),
  contract: path.join(ROOT, "runtime", "onboarding-review-ui-contract", "latest", "onboarding-review-ui-contract-latest.json"),
  bridgePlan: path.join(ROOT, "runtime", "universal-iot-bridge", "latest", "universal-iot-bridge-plan-latest.json"),
  phase39: path.join(ROOT, "runtime", "agent-lee-approval-gated-action-lanes", "latest", "final-device-action-lane-summary-latest.json"),
};

async function readJson(filePath: string) {
  const raw = await fs.readFile(filePath, "utf8");
  const clean = raw.replace(/^\uFEFF/, "");
  return JSON.parse(clean);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function routeKeyFromRequest(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const prefix = "/api/device-onboarding/";
  if (!pathname.startsWith(prefix)) return "summary";
  const key = pathname.slice(prefix.length).replace(/^\/+/, "");
  return key || "summary";
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown route error";
}

export async function GET(request: NextRequest) {
  const key = routeKeyFromRequest(request);

  try {
    const enrichment = await readJson(FILES.enrichment);
    const contract = await readJson(FILES.contract);
    const bridgePlan = await readJson(FILES.bridgePlan);
    const phase39 = await readJson(FILES.phase39);

    const network = asArray(enrichment?.enriched_assets?.network);
    const bluetooth = asArray(enrichment?.enriched_assets?.bluetooth);
    const printers = asArray(enrichment?.enriched_assets?.printers);
    const queue = asArray(enrichment?.onboarding_queue);

    const payload = {
      ok: true,
      mode: "READ_ONLY_GET_ONLY",
      noExecution: true,
      noPostRoutes: true,
      clearSkies: Boolean(enrichment?.clear_skies),
      phase39,
      contract,
      bridgePlan,
      enrichment,
      totals: {
        network: network.length,
        bluetooth: bluetooth.length,
        printers: printers.length,
        queue: queue.length,
      },
      assets: {
        network,
        bluetooth,
        printers,
      },
      queue,
      safety: {
        deviceControl: false,
        bluetoothOnboardingAction: false,
        printerSubmissionAction: false,
        containerDeploymentAction: false,
        brokerOutboundMessage: false,
        realAlphaArm: false,
        realOpenApp: false,
      },
    };

    if (key === "summary") return NextResponse.json(payload);
    if (key === "assets/network") return NextResponse.json({ ok: true, assets: network });
    if (key === "assets/bluetooth") return NextResponse.json({ ok: true, assets: bluetooth });
    if (key === "assets/printers") return NextResponse.json({ ok: true, assets: printers });
    if (key === "queue") return NextResponse.json({ ok: true, queue });

    return NextResponse.json({ ok: false, error: "Unknown read-only route", key }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        route: "device-onboarding",
        mode: "READ_ONLY_GET_ONLY",
        key,
        error: safeError(error),
        files: FILES,
      },
      { status: 500 }
    );
  }
}