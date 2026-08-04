export type LeewayVerificationMode =
  | "DETERMINISTIC_CHECKSUM"
  | "SIGNATURE_REQUIRED"
  | "GPU_PROOF"
  | "LIRS_ATTESTED"
  | "L2_ADMISSION_ONLY";

export type LeewayRuntimeStatus =
  | "REGISTERED"
  | "PENDING"
  | "ACTIVE"
  | "PASS"
  | "WARN"
  | "FAIL"
  | "DENIED";

export interface LeewayRuntimeObjectIdentity {
  leewayObjectId: string;
  leewayObjectName: string;
  leewayStandard: string;
  leewayTag: string;
  leewayRegion: string;
  leewayLayer: string;
  leewayOwner: string;
  leewayPurpose: string;
  leeway5WH: {
    WHAT: string;
    WHY: string;
    WHO: string;
    WHERE: string;
    WHEN: string;
    HOW: string;
  };
  leewayDiscoveryPipeline: string[];
  leewayGovernancePolicy: string;
  leewayTelemetryKey: string;
  leewayVerificationMode: LeewayVerificationMode;
  leewayRuntimeStatus: LeewayRuntimeStatus;
}
