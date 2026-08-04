/*
LEEWAY_HEADER - DO NOT REMOVE
TAG: PASS6.AGENT.TELEMETRY
REGION: GOVERNANCE
PURPOSE: Creates governed telemetry records for Agent Lee actions.
*/

export interface LeewayAgentTelemetryRecord {
  actionId: string;
  agentId: string;
  workflowId: string;
  telemetryStreamId: string;
  receiptPath: string;
  timestamp: string;
  status: "PASS" | "PARTIAL" | "FAIL" | "BLOCKED";
}

export function createLeewayAgentTelemetryRecord(input: Omit<LeewayAgentTelemetryRecord, "timestamp">): LeewayAgentTelemetryRecord {
  if (!input.agentId.startsWith("LEEWAY_AGENT::")) throw new Error("Telemetry requires LeeWay agent identity.");
  if (!input.workflowId.startsWith("LEEWAY_WORKFLOW::")) throw new Error("Telemetry requires LeeWay workflow identity.");
  if (!input.receiptPath) throw new Error("Telemetry requires receipt path.");
  return { ...input, timestamp: new Date().toISOString() };
}
