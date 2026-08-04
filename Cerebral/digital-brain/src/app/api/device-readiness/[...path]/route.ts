import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const LEEWAY_ROOT = process.env.LEEWAY_ROOT || "E:\\.LeeWay-Produucts-File\\Leeway-Ecosystem v2.1.4";
const READINESS_PATH = path.join(LEEWAY_ROOT, "runtime", "phase-42-readiness-map-refresh-after-enrichment", "latest", "phase-42-readiness-map-refresh-after-enrichment-latest.json");

function readJsonFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function routeKeyFromRequest(request: NextRequest): string {
  const pathname = new URL(request.url).pathname;
  const marker = "/api/device-readiness/";
  const index = pathname.indexOf(marker);
  if (index < 0) return "summary";
  const key = pathname.slice(index + marker.length).replace(/^\/+|\/+$/g, "");
  return key || "summary";
}

function safePayload(data: any) {
  return {
    ok: true,
    source: "phase-42-readiness-map-refresh-after-enrichment-latest",
    route: "/device-readiness",
    writeScope: "DEVICE_READINESS_GET_ONLY",
    executionAuthorized: false,
    deviceControlAuthorized: false,
    onboardingAuthorized: false,
    pairingAuthorized: false,
    protocolTranslatorAuthorized: false,
    iotBridgeAuthorized: false,
    physicalActionAuthorized: false,
    data
  };
}

export async function GET(request: NextRequest) {
  try {
    const readiness = readJsonFile(READINESS_PATH);
    const key = routeKeyFromRequest(request);

    if (key === "summary") {
      return NextResponse.json(safePayload({
        verdict: readiness.verdict,
        readinessGrade: readiness.readiness_grade,
        counts: readiness.counts,
        clearSkies: readiness.clear_skies,
        stillBlocked: readiness.still_blocked || [],
        recommendedNextScript: readiness.recommended_next_script || ""
      }));
    }

    if (key === "groups") {
      return NextResponse.json(safePayload({
        groups: readiness.groups || {},
        counts: readiness.counts || {}
      }));
    }

    if (key === "protocol-candidate-drafts") {
      return NextResponse.json(safePayload({
        protocolCandidateDrafts: readiness.protocol_candidate_drafts || [],
        draftOnly: true,
        onboardingAuthorized: false,
        protocolTranslatorAuthorized: false,
        deviceControlAuthorized: false
      }));
    }

    if (key === "safety") {
      return NextResponse.json(safePayload({
        stillBlocked: readiness.still_blocked || [],
        finalAssertions: readiness.final_assertions || {},
        safety: readiness.safety || {},
        noDeviceAction: true,
        noOnboarding: true,
        noPairing: true,
        noBridge: true,
        noTranslator: true
      }));
    }

    if (key === "recommendations") {
      return NextResponse.json(safePayload({
        recommendations: readiness.recommendations || [],
        allowedNextPlanningOnly: readiness.allowed_next_planning_only || []
      }));
    }

    return NextResponse.json({ ok: false, error: "unknown_device_readiness_route", key }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: "device_readiness_read_failed",
      message: error?.message || String(error),
      executionAuthorized: false,
      deviceControlAuthorized: false,
      onboardingAuthorized: false
    }, { status: 500 });
  }
}
