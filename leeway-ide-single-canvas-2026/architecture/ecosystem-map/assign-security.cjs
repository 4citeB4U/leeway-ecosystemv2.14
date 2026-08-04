const fs = require('fs');
const path = require('path');

const MAP_PATH = path.join(__dirname, 'ecosystem-map.json');
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf-8'));

const SECURITY_RULES = [
  // Directly enforced — has explicit auth/authz implementation
  { match: n => n.id === 'leeway-standards', assign: { securityStatus: 'DIRECTLY_ENFORCED', trustBoundary: 'leeway-standards', riskClass: 'critical', securityConfidence: 'verified' }},
  { match: n => n.id === 'runtime-fabric-layer1', assign: { securityStatus: 'DIRECTLY_ENFORCED', trustBoundary: 'leeway-standards', riskClass: 'critical', securityConfidence: 'verified' }},
  { match: n => n.id === 'runtime-fabric-layer13', assign: { securityStatus: 'DIRECTLY_ENFORCED', trustBoundary: 'runtime-fabric', riskClass: 'critical', securityConfidence: 'verified' }},
  { match: n => n.id === 'runtime-fabric', assign: { securityStatus: 'DIRECTLY_ENFORCED', trustBoundary: 'runtime-fabric', riskClass: 'critical', securityConfidence: 'verified' }},
  { match: n => n.id === 'master-publisher-runtime', assign: { securityStatus: 'DIRECTLY_ENFORCED', trustBoundary: 'api-gateway', riskClass: 'high', securityConfidence: 'verified', authenticationRequired: true, authorizationModel: 'RBAC', roles: ['admin','editor','viewer'] }},
  { match: n => n.id === 'api-gateway', assign: { securityStatus: 'DIRECTLY_ENFORCED', trustBoundary: 'api-gateway', riskClass: 'critical', securityConfidence: 'verified' }},
  { match: n => n.id === 'n8n-workflow', assign: { securityStatus: 'PARTIALLY_ENFORCED', trustBoundary: 'docker-network', riskClass: 'high', securityConfidence: 'high', authenticationRequired: true, authorizationModel: 'basic-auth', roles: ['admin','editor'], securityEvidence: ['MIG-006B1','MIG-006B1R'] }},
  { match: n => n.id === 'context-gateway', assign: { securityStatus: 'INHERITED_ENFORCEMENT', trustBoundary: 'api-gateway', riskClass: 'high', securityConfidence: 'high', authenticationRequired: true }},
  { match: n => n.id === 'local-assistant-bridge', assign: { securityStatus: 'PARTIALLY_ENFORCED', trustBoundary: 'runtime-fabric', riskClass: 'high', securityConfidence: 'medium', authenticationRequired: false, securityEvidence: ['Model endpoint not fully verified'] }},

  // Policy declared — governed by standards but no direct enforcement code
  { match: n => n.governance?.includes('leeway-standards') && n.id !== 'leeway-standards' && !n.securityStatus, assign: { securityStatus: 'POLICY_DECLARED', trustBoundary: 'leeway-standards', riskClass: 'medium', securityConfidence: 'high' }},

  // Documents — the policy artifacts themselves: declared under leeway-standards boundary
  { match: n => n.category === 'document', assign: { securityStatus: 'POLICY_DECLARED', trustBoundary: 'leeway-standards', riskClass: 'low', securityConfidence: 'verified' }},

  // Inherited enforcement — children of governed or enforced parents
  { match: n => n.parentId && !n.securityStatus, assign: { securityStatus: 'INHERITED_ENFORCEMENT', trustBoundary: 'unclassified', riskClass: 'medium', securityConfidence: 'medium' }},

  // Not applicable — tools, providers, external
  { match: n => n.category === 'tool' || n.category === 'provider', assign: { securityStatus: 'NOT_APPLICABLE', trustBoundary: 'unclassified', riskClass: 'low', securityConfidence: 'medium' }},

  // Blocked / degraded
  { match: n => n.health === 'DEGRADED' || n.health === 'UNHEALTHY', assign: { securityStatus: 'BLOCKED', trustBoundary: 'unclassified', riskClass: 'high', securityConfidence: 'medium' }},

  // Unknown health or status
  { match: n => n.health === 'UNKNOWN' || n.status === 'UNKNOWN', assign: { securityStatus: 'UNKNOWN', trustBoundary: 'unclassified', riskClass: 'unknown', securityConfidence: 'unknown' }},

  // Not proven truth level
  { match: n => n.truthLevel === 'INFERRED', assign: { securityStatus: 'NOT_PROVEN', trustBoundary: 'unclassified', riskClass: 'unknown', securityConfidence: 'low' }},

  // Everything else
  { match: n => !n.securityStatus, assign: { securityStatus: 'NOT_PROVEN', trustBoundary: 'unclassified', riskClass: 'medium', securityConfidence: 'low' }},
];

let assigned = 0;
for (const node of map.nodes) {
  for (const rule of SECURITY_RULES) {
    if (rule.match(node)) {
      Object.assign(node, rule.assign);
      assigned++;
      break;
    }
  }
}

// Add securityStatus to governance edges
for (const rel of map.relationships) {
  if (rel.type === 'governs') {
    rel.securityStatus = 'DIRECTLY_ENFORCED';
    rel.trustTransition = 'same-boundary';
  } else if (rel.type === 'serves' || rel.type === 'feeds') {
    rel.securityStatus = 'INHERITED_ENFORCEMENT';
    rel.trustTransition = 'same-boundary';
  } else if (rel.type === 'uses') {
    rel.securityStatus = 'NOT_PROVEN';
    rel.trustTransition = 'cross-boundary';
  } else if (rel.type === 'triggers' || rel.type === 'precedes') {
    rel.securityStatus = 'NOT_APPLICABLE';
    rel.trustTransition = 'same-boundary';
  }
}

fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n', 'utf-8');
console.log(`Security data assigned to ${assigned} nodes and ${map.relationships.length} relationships.`);
console.log(`Node counts by securityStatus:`);
const counts = {};
map.nodes.forEach(n => { counts[n.securityStatus] = (counts[n.securityStatus] || 0) + 1; });
for (const [k,v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);

console.log(`\nNode counts by trustBoundary:`);
const tbc = {};
map.nodes.forEach(n => { tbc[n.trustBoundary] = (tbc[n.trustBoundary] || 0) + 1; });
for (const [k,v] of Object.entries(tbc)) console.log(`  ${k}: ${v}`);
