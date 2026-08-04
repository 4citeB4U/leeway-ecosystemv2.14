import type { LeewayFabricChannelIdentity } from "./LeewayFabricChannelIdentity";
import type { LeewayRuntimeObjectIdentity } from "./LeewayRuntimeObjectIdentity";

export interface LeewayFabricPacket<T = unknown> {
  leewayPacketId: string;
  leewayStandard: "LEEWAY_AGENTIC_COMMUNICATIONS_FABRIC";
  leewayFabric: LeewayRuntimeObjectIdentity;
  leewayChannel: LeewayFabricChannelIdentity;
  leewaySourceObject: LeewayRuntimeObjectIdentity;
  leewayTargetObject?: LeewayRuntimeObjectIdentity;
  leewayTag: string;
  leewayRegion: string;
  leewayLayer: string;
  leewayPulse: number;
  leewayTimestamp: number;
  leewayPayload: T;
  leewayChecksum?: string;
  leewaySignature?: string;
  leewayGovernance: {
    admitted: boolean;
    policy: string;
    controller: "LEEWAY_L2_SOVEREIGN_CONTROLLER";
    reason?: string;
  };
}
