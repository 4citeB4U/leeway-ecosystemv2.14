import type { LeewayRuntimeObjectIdentity } from "./LeewayRuntimeObjectIdentity";
import { LEEWAY_FABRIC_CHANNELS } from "./LeewayFabricChannelRegistry";

export const LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC_ROOT: LeewayRuntimeObjectIdentity = {
  leewayObjectId: "LACF.ROOT.001.LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
  leewayObjectName: "LeeWay Agentic Communications Fabric",
  leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
  leewayTag: "LEEWAY.RTC.FABRIC.AGENTIC_COMMUNICATIONS",
  leewayRegion: "L3_NORTHBRIDGE_SYNC / L4_WORKFLOW_PROTOCOL / L7_EXECUTION_FABRIC / L8_TELEMETRY",
  leewayLayer: "L3-L8",
  leewayOwner: "Leeway Innovations",
  leewayPurpose: "Unified governed runtime fabric for LeeWay voice, vision, data, identity, GPU, telemetry, governance, skills, IoT, and verification.",
  leeway5WH: {
    WHAT: "LeeWay Agentic Communications Fabric",
    WHY: "Unifies previously disconnected runtime lanes into one governed LeeWay fabric.",
    WHO: "Leeway Innovations",
    WHERE: "LeeWay runtime",
    WHEN: "Every governed communication event",
    HOW: "Requires runtime object identity, L2 admission, L8 telemetry, and deterministic verification."
  },
  leewayDiscoveryPipeline: ["ResolveIdentity", "ValidateLeeWayName", "L2Admission", "L8Telemetry", "L9Verification"],
  leewayGovernancePolicy: "LEEWAY_L2_SOVEREIGN_CONTROLLER",
  leewayTelemetryKey: "L8.LEEWAY.FABRIC.PULSE",
  leewayVerificationMode: "DETERMINISTIC_CHECKSUM",
  leewayRuntimeStatus: "REGISTERED"
};

export const LEEWAY_RUNTIME_OBJECT_REGISTRY: LeewayRuntimeObjectIdentity[] = [
  LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC_ROOT,
  ...LEEWAY_FABRIC_CHANNELS
];
