import type { LeewayFabricChannelIdentity } from "./LeewayFabricChannelIdentity";

export const LEEWAY_FABRIC_CHANNELS: LeewayFabricChannelIdentity[] = [
  {
    leewayObjectId: "LACF.CHANNEL.001.LEEWAY_VOICE",
    leewayObjectName: "LeeWay Voice Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.VOICE",
    leewayRegion: "L3_NORTHBRIDGE_SYNC",
    leewayLayer: "L3",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed voice transport and microphone/audio telemetry inside the LeeWay Agentic Communications Fabric.",
    leeway5WH: {
      WHAT: "LeeWay Voice Channel",
      WHY: "Carries governed voice, microphone, audio stream, and voice telemetry packets.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "RTC Voice Transport",
      WHEN: "Runtime voice session",
      HOW: "Routes all audio events as LeeWay fabric packets through L2 governance and L8 telemetry."
    },
    leewayDiscoveryPipeline: ["Intent", "Capture", "Governance", "Transport", "Telemetry", "Verification"],
    leewayGovernancePolicy: "L2_AUDIO_PACKET_ADMISSION",
    leewayTelemetryKey: "L8.LEEWAY.VOICE.PULSE",
    leewayVerificationMode: "DETERMINISTIC_CHECKSUM",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.002.LEEWAY_VISION",
    leewayObjectName: "LeeWay Vision Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.VISION",
    leewayRegion: "L3_NORTHBRIDGE_SYNC",
    leewayLayer: "L3",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed camera, video, frame capture, and RTC vision transport.",
    leeway5WH: {
      WHAT: "LeeWay Vision Channel",
      WHY: "Carries governed camera frames and video stream packets.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "RTC Vision Transport",
      WHEN: "Runtime vision session",
      HOW: "Routes video frames into the LeeWay GPU Channel through governed bridges."
    },
    leewayDiscoveryPipeline: ["Intent", "Camera", "FrameCapture", "Governance", "GPUBridge", "Telemetry", "Verification"],
    leewayGovernancePolicy: "L2_VISION_PACKET_ADMISSION",
    leewayTelemetryKey: "L8.LEEWAY.VISION.PULSE",
    leewayVerificationMode: "DETERMINISTIC_CHECKSUM",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.003.LEEWAY_DATA",
    leewayObjectName: "LeeWay Data Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.DATA",
    leewayRegion: "L4_WORKFLOW_PROTOCOL",
    leewayLayer: "L4",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed RTC data-channel transport for structured messages, agent packets, and skill payloads.",
    leeway5WH: {
      WHAT: "LeeWay Data Channel",
      WHY: "Carries structured communication payloads between LeeWay agents and nodes.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "RTC Data Transport",
      WHEN: "Runtime data exchange",
      HOW: "Uses LeeWay fabric packets with deterministic packet identity and L2 admission."
    },
    leewayDiscoveryPipeline: ["Intent", "Serialize", "Governance", "Transport", "Telemetry", "Verification"],
    leewayGovernancePolicy: "L2_DATA_PACKET_ADMISSION",
    leewayTelemetryKey: "L8.LEEWAY.DATA.PULSE",
    leewayVerificationMode: "SIGNATURE_REQUIRED",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.004.LEEWAY_IDENTITY",
    leewayObjectName: "LeeWay Identity Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.IDENTITY",
    leewayRegion: "LIRS_IDENTITY_REPUTATION",
    leewayLayer: "L6",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed identity, signature, sovereign handle, and reputation transport.",
    leeway5WH: {
      WHAT: "LeeWay Identity Channel",
      WHY: "Carries LIRS identity, signatures, handles, and node reputation proofs.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "LIRS Identity Graph",
      WHEN: "Node registration, call setup, and trust negotiation",
      HOW: "Signs and binds identity packets to runtime participants."
    },
    leewayDiscoveryPipeline: ["Register", "Sign", "Attest", "Governance", "Reputation", "Telemetry"],
    leewayGovernancePolicy: "L2_IDENTITY_SIGNATURE_REQUIRED",
    leewayTelemetryKey: "L8.LEEWAY.IDENTITY.PULSE",
    leewayVerificationMode: "LIRS_ATTESTED",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.005.LEEWAY_GPU",
    leewayObjectName: "LeeWay GPU Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.GPU",
    leewayRegion: "L7_EXECUTION_FABRIC",
    leewayLayer: "L7",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed WebGPU execution, compute dispatch, and local acceleration transport.",
    leeway5WH: {
      WHAT: "LeeWay GPU Channel",
      WHY: "Executes governed compute, vision preprocessing, and verification workloads.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "Execution Fabric",
      WHEN: "Runtime GPU execution",
      HOW: "Runs admitted fabric packets through deterministic GPU pipelines."
    },
    leewayDiscoveryPipeline: ["Intent", "GPUAdmission", "Pipeline", "Dispatch", "Readback", "Verification", "Telemetry"],
    leewayGovernancePolicy: "L2_GPU_EXECUTION_ADMISSION",
    leewayTelemetryKey: "L8.LEEWAY.GPU.PULSE",
    leewayVerificationMode: "GPU_PROOF",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.006.LEEWAY_TELEMETRY",
    leewayObjectName: "LeeWay Telemetry Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.TELEMETRY",
    leewayRegion: "L8_TELEMETRY",
    leewayLayer: "L8",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed pulse, health, latency, and execution trace reporting.",
    leeway5WH: {
      WHAT: "LeeWay Telemetry Channel",
      WHY: "Records the operational pulse and proof trail of every fabric packet.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "L8 Telemetry Layer",
      WHEN: "Continuous runtime",
      HOW: "Emits structured telemetry for every admitted, denied, executed, or verified packet."
    },
    leewayDiscoveryPipeline: ["Observe", "Record", "Score", "Report", "Audit"],
    leewayGovernancePolicy: "L2_TELEMETRY_WRITE_POLICY",
    leewayTelemetryKey: "L8.LEEWAY.TELEMETRY.PULSE",
    leewayVerificationMode: "DETERMINISTIC_CHECKSUM",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.007.LEEWAY_GOVERNANCE",
    leewayObjectName: "LeeWay Governance Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.GOVERNANCE",
    leewayRegion: "L2_SOVEREIGN_CONTROLLER",
    leewayLayer: "L2",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed policy, admission, denial, audit, and controller decision transport.",
    leeway5WH: {
      WHAT: "LeeWay Governance Channel",
      WHY: "Carries LeeWay policy decisions and admission proofs.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "L2 Sovereign Controller",
      WHEN: "Before and after packet movement",
      HOW: "Evaluates LeeWay IDs, tags, regions, checksums, signatures, and policy compliance."
    },
    leewayDiscoveryPipeline: ["Inspect", "Authorize", "AdmitOrDeny", "Audit", "EmitProof"],
    leewayGovernancePolicy: "L2_ROOT_GOVERNANCE_POLICY",
    leewayTelemetryKey: "L8.LEEWAY.GOVERNANCE.PULSE",
    leewayVerificationMode: "SIGNATURE_REQUIRED",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.008.LEEWAY_SKILLS",
    leewayObjectName: "LeeWay Skills Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.SKILLS",
    leewayRegion: "L5_SKILL_CAPABILITY",
    leewayLayer: "L5",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed skill invocation, agent capability routing, and sovereign skill bus movement.",
    leeway5WH: {
      WHAT: "LeeWay Skills Channel",
      WHY: "Routes approved LeeWay skills and agent capabilities through the fabric.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "L5 Skill Capability Runtime",
      WHEN: "Skill discovery, selection, invocation, and return",
      HOW: "Uses a sovereign skill bus with LIRS reputation and L2 admission."
    },
    leewayDiscoveryPipeline: ["Discover", "Score", "Admit", "Invoke", "Verify", "Report"],
    leewayGovernancePolicy: "L2_SKILL_ADMISSION_POLICY",
    leewayTelemetryKey: "L8.LEEWAY.SKILLS.PULSE",
    leewayVerificationMode: "SIGNATURE_REQUIRED",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.009.LEEWAY_IOT",
    leewayObjectName: "LeeWay IoT Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.IOT",
    leewayRegion: "L3_SOUTHBRIDGE_MOUNT",
    leewayLayer: "L3",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed physical-device, sensor, and Southbridge mounting transport.",
    leeway5WH: {
      WHAT: "LeeWay IoT Channel",
      WHY: "Mounts physical devices and sensor data into the LeeWay runtime as governed packets.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "L3 Southbridge Mount",
      WHEN: "Runtime device attachment",
      HOW: "Reads physical device data and emits admitted IoT packets into telemetry and skill workflows."
    },
    leewayDiscoveryPipeline: ["Mount", "Read", "Govern", "Normalize", "Telemetry", "Verify"],
    leewayGovernancePolicy: "L2_IOT_DEVICE_ADMISSION",
    leewayTelemetryKey: "L8.LEEWAY.IOT.PULSE",
    leewayVerificationMode: "LIRS_ATTESTED",
    leewayRuntimeStatus: "REGISTERED"
  },
  {
    leewayObjectId: "LACF.CHANNEL.010.LEEWAY_VERIFICATION",
    leewayObjectName: "LeeWay Verification Channel",
    leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC",
    leewayTag: "LEEWAY.RTC.FABRIC.CHANNEL.VERIFICATION",
    leewayRegion: "L9_INTEGRITY_SENTINEL",
    leewayLayer: "L9",
    leewayOwner: "Leeway Innovations",
    leewayPurpose: "Governed deterministic proof, checksum, attestation, and integrity verification.",
    leeway5WH: {
      WHAT: "LeeWay Verification Channel",
      WHY: "Proves packet integrity, execution correctness, and deterministic truth.",
      WHO: "LeeWay Agentic Communications Fabric",
      WHERE: "L9 Integrity Sentinel",
      WHEN: "Before release, after execution, and during audit",
      HOW: "Computes deterministic checksums and rejects random or unverifiable output."
    },
    leewayDiscoveryPipeline: ["Hash", "Compare", "Attest", "Approve", "Record"],
    leewayGovernancePolicy: "L2_VERIFICATION_REQUIRED",
    leewayTelemetryKey: "L8.LEEWAY.VERIFICATION.PULSE",
    leewayVerificationMode: "DETERMINISTIC_CHECKSUM",
    leewayRuntimeStatus: "REGISTERED"
  }
];

export const LEEWAY_FABRIC_CHANNEL_BY_ID = new Map(
  LEEWAY_FABRIC_CHANNELS.map((channel) => [channel.leewayObjectId, channel]),
);
