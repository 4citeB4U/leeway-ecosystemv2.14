/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: CORE
TAG: CORE.GOVERNANCE.APPLICATION.IDENTITY_MESH
PURPOSE: Canonical LeeWay sovereign identity mesh for actors, prompts, intents, transactions, policies, gates, evidence, receipts, and trace packs.
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

export type LeeWayIdentityFamily =
  | "APP"
  | "ACTOR"
  | "INTENT"
  | "PROMPT"
  | "TX"
  | "GATE"
  | "EVENT"
  | "CMD"
  | "FILE"
  | "ARTIFACT"
  | "EVIDENCE"
  | "RECEIPT"
  | "ATTEST"
  | "POLICY"
  | "AUTHORITY"
  | "QUARANTINE"
  | "TRACE"
  | "CLASS"
  | "PULSE"
  | "OBJECT"
  | "ORIGIN"
  | "WATERMARK"
  | "INDUCTION";

export type LeeWayIdentityRecordType =
  | "LAYER"
  | "SUBLAYER"
  | "NODE"
  | "ACTOR"
  | "INTENT"
  | "PROMPT"
  | "TRANSACTION"
  | "AUTHORITY"
  | "POLICY"
  | "GATE"
  | "EVENT"
  | "COMMAND"
  | "FILE"
  | "ARTIFACT"
  | "EVIDENCE"
  | "RECEIPT"
  | "ATTESTATION"
  | "QUARANTINE"
  | "CLASS"
  | "TRACE";

export type LeeWayIdentityRecordStatus =
  | "ACTIVE"
  | "QUARANTINED"
  | "REJECTED"
  | "CONVERTED"
  | "HUMAN_REVIEW_REQUIRED";

export interface LeeWayIdentityRecord {
  id: string;
  idType: LeeWayIdentityRecordType;
  name: string;
  owner: "LEEWAY" | "AGENT_LEE" | "LAVR" | "HUMAN";
  domain: string;
  pipeline: string;
  node: string;
  classification: string;
  status: LeeWayIdentityRecordStatus;
  actorId: string;
  authorityId: string;
  intentId: string;
  promptId: string;
  transactionId: string;
  evidenceId: string;
  receiptId: string;
  inputs: string[];
  outputs: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  verification: string[];
  createdBy: "human" | "agent" | "gate";
  verifiedBy: string[];
  createdAt: string;
  lastAttestedAt: string;
}

export interface LeeWaySovereignLayerAnatomy {
  layerId: string;
  subIds: string[];
}

export const LEEWAY_IDENTITY_MESH_VERSION = "2026-05-16.identity-pulse-pass-1";

export const LEEWAY_ID_FAMILIES: LeeWayIdentityFamily[] = [
  "APP",
  "ACTOR",
  "INTENT",
  "PROMPT",
  "TX",
  "GATE",
  "EVENT",
  "CMD",
  "FILE",
  "ARTIFACT",
  "EVIDENCE",
  "RECEIPT",
  "ATTEST",
  "POLICY",
  "AUTHORITY",
  "QUARANTINE",
  "TRACE",
  "CLASS",
  "PULSE",
  "OBJECT",
  "ORIGIN",
  "WATERMARK",
  "INDUCTION"
];

const ROOT_ACTOR_ID = "LEEWAY_ACTOR::HUMAN::OWNER::LEONARD_J_LEE";
const ROOT_AUTHORITY_ID = "LEEWAY_AUTHORITY::HUMAN_AXIOM::IMMUTABLE";
const ROOT_INTENT_ID = "LEEWAY_INTENT::GOVERNANCE::SOVEREIGN_TRACEABILITY::PASS1";
const ROOT_PROMPT_ID = "LEEWAY_PROMPT::USER::TRACER_PACK_PASS::20260514";
const ROOT_TX_ID = "LEEWAY_TX::GOVERNANCE::SOVEREIGN_IDENTITY_MESH::20260514T220000::PASS1";
const ROOT_EVIDENCE_ID = "LEEWAY_EVIDENCE::GOVERNANCE::IDENTITY_MESH_REGISTRY::PASS1";
const ROOT_RECEIPT_ID = "LEEWAY_RECEIPT::GOVERNANCE::TRACER_PACK_PASS::20260514T220000";
const CREATED_AT = "2026-05-14T22:00:00.000Z";

function record(overrides: Omit<LeeWayIdentityRecord,
  "actorId" |
  "authorityId" |
  "intentId" |
  "promptId" |
  "transactionId" |
  "evidenceId" |
  "receiptId" |
  "inputs" |
  "outputs" |
  "allowedActions" |
  "forbiddenActions" |
  "verification" |
  "createdBy" |
  "verifiedBy" |
  "createdAt" |
  "lastAttestedAt"
> & Partial<Pick<LeeWayIdentityRecord,
  "actorId" |
  "authorityId" |
  "intentId" |
  "promptId" |
  "transactionId" |
  "evidenceId" |
  "receiptId" |
  "inputs" |
  "outputs" |
  "allowedActions" |
  "forbiddenActions" |
  "verification" |
  "createdBy" |
  "verifiedBy" |
  "createdAt" |
  "lastAttestedAt"
>>): LeeWayIdentityRecord {
  return {
    actorId: ROOT_ACTOR_ID,
    authorityId: ROOT_AUTHORITY_ID,
    intentId: ROOT_INTENT_ID,
    promptId: ROOT_PROMPT_ID,
    transactionId: ROOT_TX_ID,
    evidenceId: ROOT_EVIDENCE_ID,
    receiptId: ROOT_RECEIPT_ID,
    inputs: [],
    outputs: [],
    allowedActions: ["identify", "map", "verify", "attest", "quarantine", "report"],
    forbiddenActions: ["direct_llm_file_write", "untraced_action", "unapproved_destructive_action"],
    verification: ["LEEWAY_GATE::IDENTITY_MESH::TRACEABILITY_COMPLETE"],
    createdBy: "human",
    verifiedBy: ["LEEWAY_GATE::IDENTITY_MESH::TRACEABILITY_COMPLETE"],
    createdAt: CREATED_AT,
    lastAttestedAt: CREATED_AT,
    ...overrides
  };
}

export const LEEWAY_SOVEREIGN_LAYER_ANATOMY: LeeWaySovereignLayerAnatomy[] = [
  {
    layerId: "LEEWAY_APP::GOVERNANCE::HUMAN_AXIOM::ROOT",
    subIds: [
      "LEEWAY_POLICY::HUMAN_AXIOM::NO_CUSTOMER_DATA_DELETION",
      "LEEWAY_POLICY::HUMAN_AXIOM::NO_UNAPPROVED_DESTRUCTIVE_ACTION",
      "LEEWAY_POLICY::HUMAN_AXIOM::NO_UNAPPROVED_LAW_REWRITE",
      "LEEWAY_POLICY::HUMAN_AXIOM::NO_EXTERNAL_SERVICE_EXPANSION_WITHOUT_APPROVAL",
      "LEEWAY_POLICY::HUMAN_AXIOM::HUMAN_INTENT_IS_SOURCE_OF_TRUTH",
      "LEEWAY_AUTHORITY::HUMAN_AXIOM::IMMUTABLE",
      "LEEWAY_GATE::HUMAN_AXIOM::APPROVAL_REQUIRED",
      "LEEWAY_EVIDENCE::HUMAN_AXIOM::LAW_FILE"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::INTENT_TRACEABILITY::ROOT",
    subIds: [
      "LEEWAY_INTENT::HUMAN_REQUEST::TRACEABLE_SOURCE",
      "LEEWAY_PROMPT::USER_MESSAGE::TRACEABLE_SOURCE",
      "LEEWAY_TX::INTENT_TRACEABILITY::INTENT_CAPTURE::PASS1",
      "LEEWAY_APP::GOVERNANCE::INTENT_TRACEABILITY::INTENT_NORMALIZER",
      "LEEWAY_APP::GOVERNANCE::INTENT_TRACEABILITY::INTENT_TO_NODE_MAPPER",
      "LEEWAY_APP::GOVERNANCE::INTENT_TRACEABILITY::INTENT_APPROVAL_GATE",
      "LEEWAY_EVIDENCE::INTENT_TRACEABILITY::INTENT_RECORD",
      "LEEWAY_RECEIPT::INTENT_TRACEABILITY::CAPTURED"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::AGENCY_BOUNDARY::ROOT",
    subIds: [
      "LEEWAY_ACTOR::HUMAN::CREATOR",
      "LEEWAY_ACTOR::AGENT::AGENT_LEE",
      "LEEWAY_ACTOR::LLM::COGNITIVE_EQUIPMENT",
      "LEEWAY_AUTHORITY::AGENT::EXECUTION_ALLOWED",
      "LEEWAY_AUTHORITY::LLM::ADVISORY_ONLY",
      "LEEWAY_GATE::AGENCY_BOUNDARY::NO_LLM_DIRECT_FILE_WRITE",
      "LEEWAY_GATE::AGENCY_BOUNDARY::NO_LLM_DIRECT_TERMINAL",
      "LEEWAY_GATE::AGENCY_BOUNDARY::NO_LLM_DIRECT_PACKAGE_RELEASE",
      "LEEWAY_TX::AGENCY::LLM_OUTPUT_REVIEW::PASS1",
      "LEEWAY_RECEIPT::AGENCY_BOUNDARY::LLM_OUTPUT_ACCEPTED_OR_REJECTED"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::AGENT_AUTHORITY::MATRIX",
    subIds: [
      "LEEWAY_AUTHORITY::ROLE::HUMAN_OWNER",
      "LEEWAY_AUTHORITY::ROLE::AGENT_LEE_ENGINEER",
      "LEEWAY_AUTHORITY::ROLE::AGENT_LEE_VERIFIER",
      "LEEWAY_AUTHORITY::ROLE::AGENT_LEE_PACKAGER",
      "LEEWAY_AUTHORITY::ROLE::AUTOCOMPLETE_ASSISTANT",
      "LEEWAY_AUTHORITY::ROLE::MCP_AGENT",
      "LEEWAY_GATE::AUTHORITY::CAN_CREATE_FILE",
      "LEEWAY_GATE::AUTHORITY::CAN_MODIFY_RUNTIME",
      "LEEWAY_GATE::AUTHORITY::CAN_DELETE_FILE",
      "LEEWAY_GATE::AUTHORITY::CAN_UPDATE_LAW",
      "LEEWAY_GATE::AUTHORITY::CAN_PACKAGE_RELEASE",
      "LEEWAY_TX::AUTHORITY::AUTHORITY_CHECK::PASS1",
      "LEEWAY_RECEIPT::AUTHORITY::DECISION"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::CROSS_VERIFICATION::ROOT",
    subIds: [
      "LEEWAY_ACTOR::GENERATOR::TRACEABLE_AGENT",
      "LEEWAY_ACTOR::VERIFIER::TRACEABLE_GATE",
      "LEEWAY_GATE::CROSS_VERIFICATION::GENERATOR_NE_VERIFIER",
      "LEEWAY_GATE::CROSS_VERIFICATION::TESTS_NOT_SELF_AUTHORED_ONLY",
      "LEEWAY_GATE::CROSS_VERIFICATION::MUTATION_REQUIRED_FOR_HIGH_RISK",
      "LEEWAY_EVIDENCE::CROSS_VERIFICATION::VERIFIER_REPORT",
      "LEEWAY_RECEIPT::CROSS_VERIFICATION::PASSED"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::RUNTIME_REATTESTATION::ROOT",
    subIds: [
      "LEEWAY_ATTEST::RUNTIME::CREATED",
      "LEEWAY_ATTEST::RUNTIME::RENEWED",
      "LEEWAY_ATTEST::RUNTIME::EXPIRED",
      "LEEWAY_GATE::RE_ATTESTATION::PACKAGE_CHANGED",
      "LEEWAY_GATE::RE_ATTESTATION::DEPENDENCY_CHANGED",
      "LEEWAY_GATE::RE_ATTESTATION::LAW_CHANGED",
      "LEEWAY_GATE::RE_ATTESTATION::IDENTITY_GRAPH_CHANGED",
      "LEEWAY_GATE::RE_ATTESTATION::VOICE_CONFIG_CHANGED",
      "LEEWAY_GATE::RE_ATTESTATION::EXTERNAL_CONNECTOR_CHANGED",
      "LEEWAY_TX::RE_ATTESTATION::RESULT::PASS1",
      "LEEWAY_RECEIPT::RE_ATTESTATION::RESULT"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::CONSEQUENCE::BLAST_RADIUS_CLASSIFIER",
    subIds: [
      "LEEWAY_CLASS::BLAST_RADIUS::LOCAL_UI",
      "LEEWAY_CLASS::BLAST_RADIUS::VOICE_RUNTIME",
      "LEEWAY_CLASS::BLAST_RADIUS::PACKAGE_SURFACE",
      "LEEWAY_CLASS::BLAST_RADIUS::FILESYSTEM_WRITE",
      "LEEWAY_CLASS::BLAST_RADIUS::FILE_DELETE",
      "LEEWAY_CLASS::BLAST_RADIUS::GOVERNANCE_LAW",
      "LEEWAY_CLASS::BLAST_RADIUS::MODEL_TOOL_EXECUTION",
      "LEEWAY_CLASS::BLAST_RADIUS::EXTERNAL_CONNECTOR",
      "LEEWAY_CLASS::BLAST_RADIUS::CUSTOMER_OR_USER_DATA",
      "LEEWAY_GATE::BLAST_RADIUS::HUMAN_APPROVAL_REQUIRED",
      "LEEWAY_TX::BLAST_RADIUS::CLASSIFICATION::PASS1",
      "LEEWAY_RECEIPT::BLAST_RADIUS::CLASSIFIED"
    ]
  },
  {
    layerId: "LEEWAY_APP::GOVERNANCE::HUMAN_OVERRIDE::ROOT",
    subIds: [
      "LEEWAY_POLICY::HUMAN_OVERRIDE::DESTRUCTIVE_ACTION_REQUIRES_APPROVAL",
      "LEEWAY_POLICY::HUMAN_OVERRIDE::LAW_CHANGE_REQUIRES_APPROVAL",
      "LEEWAY_POLICY::HUMAN_OVERRIDE::DATA_DELETE_REQUIRES_APPROVAL",
      "LEEWAY_POLICY::HUMAN_OVERRIDE::PACKAGE_RELEASE_REQUIRES_APPROVAL",
      "LEEWAY_POLICY::HUMAN_OVERRIDE::EXTERNAL_CONNECTOR_EXPANSION_REQUIRES_APPROVAL",
      "LEEWAY_GATE::HUMAN_OVERRIDE::APPROVAL_CAPTURE",
      "LEEWAY_GATE::HUMAN_OVERRIDE::APPROVAL_VALIDATION",
      "LEEWAY_TX::HUMAN_OVERRIDE::HUMAN_APPROVAL::PASS1",
      "LEEWAY_RECEIPT::HUMAN_APPROVAL::GRANTED_OR_DENIED"
    ]
  }
];

export const LEEWAY_TRACER_PACK_REQUIRED_IDS = [
  "LEEWAY_TRACE::GOVERNANCE::UNTRUSTED_LLM_INGRESS::20260514T220000::A91F20",
  "LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN",
  "LEEWAY_PROMPT::LLM_EXTERNAL::UNTRUSTED_INPUT::B1300A",
  "LEEWAY_INTENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS::REVIEW_REQUIRED",
  "LEEWAY_TX::GOVERNANCE::LLM_OUTPUT_REVIEW::20260514T220000::42DD19",
  "LEEWAY_AUTHORITY::LLM::ADVISORY_ONLY",
  "LEEWAY_POLICY::AGENCY_BOUNDARY::NO_LLM_DIRECT_ACTION",
  "LEEWAY_GATE::AGENCY_BOUNDARY::NO_LLM_DIRECT_FILE_WRITE",
  "LEEWAY_EVIDENCE::GOVERNANCE::UNTRUSTED_LLM_INGRESS::HASH_REQUIRED",
  "LEEWAY_RECEIPT::GOVERNANCE::UNTRUSTED_LLM_REJECTED::20260514T220001"
] as const;

const anatomyRecords = LEEWAY_SOVEREIGN_LAYER_ANATOMY.flatMap((layer) => [
  record({
    id: layer.layerId,
    idType: "LAYER",
    name: layer.layerId.split("::").slice(-2).join(" "),
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: layer.layerId.split("::")[3] ?? "SOVEREIGN",
    node: layer.layerId.split("::")[4] ?? "ROOT",
    classification: "GOVERNANCE_GATE",
    status: "ACTIVE",
    outputs: layer.subIds
  }),
  ...layer.subIds.map((id) => record({
    id,
    idType: id.startsWith("LEEWAY_POLICY::") ? "POLICY" :
      id.startsWith("LEEWAY_AUTHORITY::") ? "AUTHORITY" :
      id.startsWith("LEEWAY_GATE::") ? "GATE" :
      id.startsWith("LEEWAY_EVIDENCE::") ? "EVIDENCE" :
      id.startsWith("LEEWAY_RECEIPT::") ? "RECEIPT" :
      id.startsWith("LEEWAY_ACTOR::") ? "ACTOR" :
      id.startsWith("LEEWAY_INTENT::") ? "INTENT" :
      id.startsWith("LEEWAY_PROMPT::") ? "PROMPT" :
      id.startsWith("LEEWAY_TX::") ? "TRANSACTION" :
      id.startsWith("LEEWAY_ATTEST::") ? "ATTESTATION" :
      id.startsWith("LEEWAY_CLASS::") ? "CLASS" :
      id.startsWith("LEEWAY_APP::") ? "NODE" : "SUBLAYER",
    name: id.split("::").slice(1).join(" "),
    owner: id.startsWith("LEEWAY_ACTOR::HUMAN") ? "HUMAN" : "LEEWAY",
    domain: id.split("::")[1] ?? "GOVERNANCE",
    pipeline: id.split("::")[2] ?? "SOVEREIGN",
    node: id.split("::").slice(3).join("_") || "ROOT",
    classification: id.startsWith("LEEWAY_ACTOR::") ? "ACTOR_RECORD" :
      id.startsWith("LEEWAY_POLICY::") ? "POLICY_RECORD" :
      id.startsWith("LEEWAY_AUTHORITY::") ? "AUTHORITY_RECORD" :
      id.startsWith("LEEWAY_GATE::") ? "GOVERNANCE_GATE" :
      id.startsWith("LEEWAY_CLASS::") ? "BLAST_RADIUS_CLASS" :
      "TRACEABILITY_RECORD",
    status: "ACTIVE",
    inputs: [layer.layerId],
    outputs: [ROOT_EVIDENCE_ID]
  }))
]);

export const LEEWAY_IDENTITY_MESH_RECORDS: LeeWayIdentityRecord[] = [
  ...anatomyRecords,
  record({
    id: "LEEWAY_PULSE::APPLICATION::AGENT_LEE",
    idType: "TRACE",
    name: "LeeWay identity pulse application root",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "IDENTITY_PULSE",
    node: "APPLICATION_ROOT",
    classification: "PULSE_RECORD",
    status: "ACTIVE",
    outputs: ["agent-lee/governance/identity/leeway-identity-pulse.json"]
  }),
  record({
    id: "LEEWAY_OBJECT::FILE::IDENTITY_PULSE_REGISTRY",
    idType: "FILE",
    name: "LeeWay identity pulse registry file",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "IDENTITY_PULSE",
    node: "REGISTRY_FILE",
    classification: "PULSE_OBJECT",
    status: "ACTIVE",
    outputs: ["agent-lee/governance/identity/leeway-identity-pulse.json"]
  }),
  record({
    id: "LEEWAY_ORIGIN::LEEWAY_BORN::PASS1",
    idType: "CLASS",
    name: "LeeWay born origin class",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "IDENTITY_PULSE",
    node: "ORIGIN_LEEWAY_BORN",
    classification: "ORIGIN_STATUS",
    status: "ACTIVE"
  }),
  record({
    id: "LEEWAY_WATERMARK::LEEWAY_BORN::SOURCE_FILE",
    idType: "CLASS",
    name: "LeeWay born watermark source file rule",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "IDENTITY_PULSE",
    node: "WATERMARK_SOURCE_FILE",
    classification: "WATERMARK_RULE",
    status: "ACTIVE"
  }),
  record({
    id: "LEEWAY_INDUCTION::FOREIGN_FILE::PASS1",
    idType: "TRACE",
    name: "Foreign file induction pass 1",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "IDENTITY_PULSE",
    node: "FOREIGN_FILE_INDUCTION",
    classification: "INDUCTION_RULE",
    status: "ACTIVE",
    outputs: ["temporary_id", "hash", "verification", "receipt"]
  }),
  record({
    id: "LEEWAY_FILE::GOVERNANCE::IDENTITY_MESH_REGISTRY",
    idType: "FILE",
    name: "Identity mesh registry source file",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "IDENTITY_MESH",
    node: "REGISTRY_FILE",
    classification: "GOVERNANCE_FILE",
    status: "ACTIVE",
    outputs: ["agent-lee/vscode-extension/src/leeway-application/leewayIdentityMesh.ts"]
  }),
  record({
    id: "LEEWAY_ARTIFACT::GOVERNANCE::SKILL_ZIP",
    idType: "ARTIFACT",
    name: "LeeWay skill package artifact",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "SKILL_PACKAGE",
    node: "ZIP",
    classification: "ARTIFACT_RECORD",
    status: "ACTIVE",
    outputs: ["skill.zip"]
  }),
  record({
    id: "LEEWAY_EVENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS",
    idType: "EVENT",
    name: "Untrusted LLM ingress event",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "UNTRUSTED_INGRESS_EVENT",
    classification: "EVENT_ROUTE",
    status: "ACTIVE",
    inputs: ["actorId", "promptId"],
    outputs: ["LEEWAY_TRACE::GOVERNANCE::UNTRUSTED_LLM_INGRESS::20260514T220000::A91F20"]
  }),
  record({
    id: "LEEWAY_CMD::GOVERNANCE::WRITE_TRACER_PACK",
    idType: "COMMAND",
    name: "Write tracer pack command contract",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "WRITE_TRACER_PACK",
    classification: "COMMAND_ROUTE",
    status: "ACTIVE",
    inputs: ["actorId", "promptId", "intentId", "transactionId"],
    outputs: ["receiptId", "evidenceId"]
  }),
  record({
    id: "LEEWAY_QUARANTINE::GOVERNANCE::UNTRUSTED_LLM_INGRESS",
    idType: "QUARANTINE",
    name: "Untrusted LLM ingress quarantine record",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "UNTRUSTED_LLM_INGRESS",
    classification: "QUARANTINE_RECORD",
    status: "QUARANTINED",
    inputs: ["LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN"],
    outputs: ["LEEWAY_RECEIPT::GOVERNANCE::UNTRUSTED_LLM_REJECTED::20260514T220001"]
  }),
  record({
    id: "LEEWAY_TRACE::GOVERNANCE::UNTRUSTED_LLM_INGRESS::20260514T220000::A91F20",
    idType: "TRACE",
    name: "Untrusted LLM ingress tracer pack",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "UNTRUSTED_LLM_INGRESS",
    classification: "TRACE_PACK",
    status: "HUMAN_REVIEW_REQUIRED",
    actorId: "LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN",
    authorityId: "LEEWAY_AUTHORITY::LLM::ADVISORY_ONLY",
    intentId: "LEEWAY_INTENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS::REVIEW_REQUIRED",
    promptId: "LEEWAY_PROMPT::LLM_EXTERNAL::UNTRUSTED_INPUT::B1300A",
    transactionId: "LEEWAY_TX::GOVERNANCE::LLM_OUTPUT_REVIEW::20260514T220000::42DD19",
    evidenceId: "LEEWAY_EVIDENCE::GOVERNANCE::UNTRUSTED_LLM_INGRESS::HASH_REQUIRED",
    receiptId: "LEEWAY_RECEIPT::GOVERNANCE::UNTRUSTED_LLM_REJECTED::20260514T220001",
    inputs: ["actorId", "promptId", "intentId", "authorityId", "policyId"],
    outputs: ["REJECTED", "QUARANTINED", "HUMAN_REVIEW_REQUIRED"],
    forbiddenActions: ["direct_file_write", "direct_terminal", "public_broadcast_without_human_approval"]
  }),
  record({
    id: "LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN",
    idType: "ACTOR",
    name: "Unknown external LLM actor",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "EXTERNAL_LLM",
    classification: "UNTRUSTED_ACTOR",
    status: "QUARANTINED",
    actorId: "LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN",
    authorityId: "LEEWAY_AUTHORITY::LLM::ADVISORY_ONLY",
    inputs: ["inbound prompt"],
    outputs: ["advisory output only"]
  }),
  record({
    id: "LEEWAY_PROMPT::LLM_EXTERNAL::UNTRUSTED_INPUT::B1300A",
    idType: "PROMPT",
    name: "Untrusted external LLM prompt",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "UNTRUSTED_INPUT",
    classification: "UNTRUSTED_PROMPT",
    status: "QUARANTINED",
    actorId: "LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN"
  }),
  record({
    id: "LEEWAY_INTENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS::REVIEW_REQUIRED",
    idType: "INTENT",
    name: "Untrusted LLM ingress requires review",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "REVIEW_REQUIRED",
    classification: "INTENT_RECORD",
    status: "HUMAN_REVIEW_REQUIRED"
  }),
  record({
    id: "LEEWAY_TX::GOVERNANCE::LLM_OUTPUT_REVIEW::20260514T220000::42DD19",
    idType: "TRANSACTION",
    name: "LLM output review transaction",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "LLM_OUTPUT_REVIEW",
    classification: "TRANSACTION_RECORD",
    status: "HUMAN_REVIEW_REQUIRED",
    actorId: "LEEWAY_ACTOR::LLM_EXTERNAL::UNTRUSTED::UNKNOWN",
    promptId: "LEEWAY_PROMPT::LLM_EXTERNAL::UNTRUSTED_INPUT::B1300A",
    intentId: "LEEWAY_INTENT::GOVERNANCE::UNTRUSTED_LLM_INGRESS::REVIEW_REQUIRED",
    authorityId: "LEEWAY_AUTHORITY::LLM::ADVISORY_ONLY",
    outputs: ["LEEWAY_QUARANTINE::GOVERNANCE::UNTRUSTED_LLM_INGRESS"]
  }),
  record({
    id: "LEEWAY_POLICY::AGENCY_BOUNDARY::NO_LLM_DIRECT_ACTION",
    idType: "POLICY",
    name: "No LLM direct action policy",
    owner: "LEEWAY",
    domain: "AGENCY_BOUNDARY",
    pipeline: "NO_LLM_DIRECT_ACTION",
    node: "POLICY",
    classification: "POLICY_RECORD",
    status: "ACTIVE",
    forbiddenActions: ["direct_file_write", "direct_terminal", "direct_package_release"]
  }),
  record({
    id: "LEEWAY_ACTOR::AGENT::LEEWAY_WRAPPED::TRACEABLE",
    idType: "ACTOR",
    name: "LeeWay wrapped agent actor",
    owner: "AGENT_LEE",
    domain: "GOVERNANCE",
    pipeline: "AGENT_INDUCTION",
    node: "LEEWAY_WRAPPED",
    classification: "AGENT_ACTOR",
    status: "CONVERTED",
    authorityId: "LEEWAY_AUTHORITY::AGENT::EXECUTION_ALLOWED"
  }),
  record({
    id: "LEEWAY_RECEIPT::AGENT_INDUCTION::20260514T220001::PASSED",
    idType: "RECEIPT",
    name: "Agent induction receipt",
    owner: "LEEWAY",
    domain: "AGENT_INDUCTION",
    pipeline: "TRACER_PACK",
    node: "PASSED",
    classification: "RECEIPT_RECORD",
    status: "ACTIVE"
  }),
  record({
    id: "LEEWAY_ATTEST::AGENT_INDUCTION::PASSED::TRACEABLE",
    idType: "ATTESTATION",
    name: "Agent induction attestation",
    owner: "LEEWAY",
    domain: "AGENT_INDUCTION",
    pipeline: "TRACER_PACK",
    node: "PASSED",
    classification: "ATTESTATION_RECORD",
    status: "ACTIVE"
  }),
  record({
    id: "LEEWAY_EVIDENCE::GOVERNANCE::UNTRUSTED_LLM_INGRESS::HASH_REQUIRED",
    idType: "EVIDENCE",
    name: "Untrusted LLM ingress evidence hash",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "EVIDENCE_HASH",
    classification: "EVIDENCE_RECORD",
    status: "ACTIVE"
  }),
  record({
    id: "LEEWAY_RECEIPT::GOVERNANCE::UNTRUSTED_LLM_REJECTED::20260514T220001",
    idType: "RECEIPT",
    name: "Untrusted LLM rejection receipt",
    owner: "LEEWAY",
    domain: "GOVERNANCE",
    pipeline: "TRACER_PACK",
    node: "UNTRUSTED_LLM_REJECTED",
    classification: "RECEIPT_RECORD",
    status: "REJECTED"
  })
];
