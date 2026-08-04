import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const ROOT = "E:/ .LeeWay-Produucts-File/Leeway-Ecosystem v2.1.4".replace("E:/ ", "E:/");

const FILES = {
  plan: path.join(ROOT, "runtime", "phase-41-identity-confirmation", "latest", "phase-41-identity-confirmation-plan-latest.json"),
  contract: path.join(ROOT, "runtime", "phase-41-identity-confirmation-ui-contract", "latest", "identity-confirmation-ui-contract-latest.json"),
  phase40: path.join(ROOT, "runtime", "device-onboarding-final-proof", "latest", "device-onboarding-final-browser-proof-latest.json"),
  packet303: path.join(ROOT, "runtime", "phase-41-manual-identity-review", "latest", "phase-41-manual-identity-review-packet-latest.json"),
  reviewState: path.join(ROOT, "runtime", "phase-41-human-identity-review-state", "latest", "human-identity-review-state-latest.json"),
};

const ALLOWED_ASSET_TYPES = new Set(["router","computer","phone","tablet","tv","speaker","headset","keyboard","mouse","printer","camera","iot_device","virtual_device","unknown"]);
const ALLOWED_TRUST_LEVELS = new Set(["trusted","known_but_limited","unknown","untrusted","ignore"]);
const ALLOWED_DISPOSITIONS = new Set(["ignore","monitor_read_only","prepare_future_onboarding_request","needs_more_research"]);

async function readJson(filePath: string, fallback?: any) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const clean = raw.replace(/^\uFEFF/, "");
    return JSON.parse(clean);
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

async function writeJson(filePath: string, data: any) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function routeKeyFromRequest(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const prefix = "/api/identity-confirmation/";
  if (!pathname.startsWith(prefix)) return "summary";
  const key = pathname.slice(prefix.length).replace(/^\/+/, "");
  return key || "summary";
}

function filterFamily(candidates: any[], family: string) {
  return candidates.filter((candidate) => candidate?.source_family === family);
}

function baseReviewState() {
  return {
    version: "LEEWAY_PHASE_41_HUMAN_IDENTITY_REVIEW_STATE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    write_scope: "HUMAN_IDENTITY_REVIEW_STATE_ONLY",
    execution_authorized: false,
    device_control_authorized: false,
    onboarding_authorized: false,
    records: [],
  };
}

function safeString(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validateReviewPayload(body: any, reviewItems: any[]) {
  const errors: string[] = [];
  const candidateId = safeString(body?.identity_candidate_id, 160);
  const candidate = reviewItems.find((item) => item?.identity_candidate_id === candidateId);

  const confirmedAssetName = safeString(body?.confirmed_asset_name, 120);
  const assetType = safeString(body?.asset_type, 60);
  const locationOrRoom = safeString(body?.location_or_room, 120);
  const ownerOrResponsiblePerson = safeString(body?.owner_or_responsible_person, 120);
  const trustLevel = safeString(body?.trust_level, 60);
  const disposition = safeString(body?.disposition, 80);
  const notes = safeString(body?.notes, 1000);
  const reviewedBy = safeString(body?.reviewed_by || "Leonard J Lee", 120);

  if (!candidateId || !candidate) errors.push("candidate not found in manual review packet");
  if (!confirmedAssetName) errors.push("confirmed_asset_name required");
  if (!ALLOWED_ASSET_TYPES.has(assetType)) errors.push("asset_type not allowed");
  if (!locationOrRoom) errors.push("location_or_room required");
  if (!ALLOWED_TRUST_LEVELS.has(trustLevel)) errors.push("trust_level not allowed");
  if (!ALLOWED_DISPOSITIONS.has(disposition)) errors.push("disposition not allowed");

  const keys = Object.keys(body || {}).join(" ").toLowerCase();
  const values = JSON.stringify(body || {}).toLowerCase();
  const forbidden = ["command", "password", "secret", "token", "job_payload", "broker_payload", "actuator", "physical_action"];
  if (forbidden.some((term) => keys.includes(term) || values.includes(term))) {
    errors.push("payload contains a forbidden control-scope term");
  }

  return {
    ok: errors.length === 0,
    errors,
    candidate,
    record: {
      identity_candidate_id: candidateId,
      asset_id: candidate?.asset_id || "",
      source_family: candidate?.source_family || "",
      original_display_name: candidate?.display_name || "",
      confirmed_asset_name: confirmedAssetName,
      asset_type: assetType,
      location_or_room: locationOrRoom,
      owner_or_responsible_person: ownerOrResponsiblePerson,
      trust_level: trustLevel,
      disposition,
      notes,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      write_scope: "HUMAN_IDENTITY_REVIEW_STATE_ONLY",
      execution_authorized: false,
      device_control_authorized: false,
      onboarding_authorized: false,
    },
  };
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown route error";
}

async function loadAll() {
  const plan = await readJson(FILES.plan);
  const contract = await readJson(FILES.contract);
  const phase40 = await readJson(FILES.phase40);
  const packet303 = await readJson(FILES.packet303);
  const reviewState = await readJson(FILES.reviewState, baseReviewState());
  const candidates = asArray(plan?.identity_candidates);
  const network = filterFamily(candidates, "network");
  const bluetooth = filterFamily(candidates, "bluetooth");
  const printers = filterFamily(candidates, "printer");
  const policy = plan?.phase_41_policy || {};
  const reviewItems = asArray(packet303?.review_packet);

  return { plan, contract, phase40, packet303, reviewState, candidates, network, bluetooth, printers, policy, reviewItems };
}

export async function GET(request: NextRequest) {
  const key = routeKeyFromRequest(request);

  try {
    const loaded = await loadAll();
    const payload = {
      ok: true,
      mode: "IDENTITY_CONFIRMATION_WITH_HUMAN_REVIEW_STATE",
      noExecution: true,
      noDeviceControl: true,
      noOnboarding: true,
      writeScope: "HUMAN_IDENTITY_REVIEW_STATE_ONLY",
      clearSkies: Boolean(loaded.plan?.clear_skies),
      plan: loaded.plan,
      contract: loaded.contract,
      phase40: loaded.phase40,
      reviewState: loaded.reviewState,
      totals: {
        candidates: loaded.candidates.length,
        network: loaded.network.length,
        bluetooth: loaded.bluetooth.length,
        printers: loaded.printers.length,
        reviewed: asArray(loaded.reviewState?.records).length,
      },
      candidates: loaded.candidates,
      families: { network: loaded.network, bluetooth: loaded.bluetooth, printers: loaded.printers },
      policy: loaded.policy,
      safety: {
        deviceControl: false,
        bluetoothLinkAction: false,
        printerSubmissionAction: false,
        protocolTranslatorAction: false,
        containerBridgeAction: false,
        brokerOutboundMessage: false,
        realAlphaArm: false,
        realOpenApp: false,
      },
    };

    if (key === "summary") return NextResponse.json(payload);
    if (key === "candidates") return NextResponse.json({ ok: true, candidates: loaded.candidates });
    if (key === "candidates/network") return NextResponse.json({ ok: true, candidates: loaded.network });
    if (key === "candidates/bluetooth") return NextResponse.json({ ok: true, candidates: loaded.bluetooth });
    if (key === "candidates/printers") return NextResponse.json({ ok: true, candidates: loaded.printers });
    if (key === "policy") return NextResponse.json({ ok: true, policy: loaded.policy });
    if (key === "review-state") return NextResponse.json({ ok: true, reviewState: loaded.reviewState });

    return NextResponse.json({ ok: false, error: "Unknown read-only route", key }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, route: "identity-confirmation", key, error: safeError(error), files: FILES }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const key = routeKeyFromRequest(request);

  if (key !== "review-state/save") {
    return NextResponse.json({ ok: false, error: "Only human review-state save is allowed on this POST route.", key }, { status: 404 });
  }

  try {
    const loaded = await loadAll();
    const body = await request.json();
    const validation = validateReviewPayload(body, loaded.reviewItems);

    if (!validation.ok) {
      return NextResponse.json({ ok: false, errors: validation.errors, writeScope: "HUMAN_IDENTITY_REVIEW_STATE_ONLY" }, { status: 400 });
    }

    const currentState = loaded.reviewState || baseReviewState();
    const existingRecords = asArray(currentState.records);
    const nextRecords = existingRecords.filter((record) => record?.identity_candidate_id !== validation.record.identity_candidate_id);
    nextRecords.push(validation.record);

    const nextState = {
      ...currentState,
      version: "LEEWAY_PHASE_41_HUMAN_IDENTITY_REVIEW_STATE",
      updated_at: new Date().toISOString(),
      write_scope: "HUMAN_IDENTITY_REVIEW_STATE_ONLY",
      execution_authorized: false,
      device_control_authorized: false,
      onboarding_authorized: false,
      records: nextRecords,
    };

    await writeJson(FILES.reviewState, nextState);

    return NextResponse.json({
      ok: true,
      saved: true,
      writeScope: "HUMAN_IDENTITY_REVIEW_STATE_ONLY",
      executionAuthorized: false,
      deviceControlAuthorized: false,
      onboardingAuthorized: false,
      record: validation.record,
      totals: { reviewed: nextRecords.length },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: safeError(error), key }, { status: 500 });
  }
}