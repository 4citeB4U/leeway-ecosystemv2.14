/**
 * LEEWAY AGENT CREW SEEDING
 * 11 core operational agents seeded into local store on initialization
 */

import * as store from '../store/leewayLocalStore';
import type { Agent } from '../types/store.types';

// ============================================================================
// AGENT CREW DEFINITIONS
// ============================================================================

const OPERATIONAL_AGENTS: Agent[] = [
  {
    agentId: 'agent-lee-prime',
    displayName: 'Agent Lee',
    roleTitle: 'Administrative Sovereign Agent / Professor / Deployment Commander',
    department: 'Administration',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Arabic', 'Hindi', 'Urdu', 'Chinese', 'Tagalog', 'Portuguese', 'German'],
    jobProfile: {
      title: 'Administrative Agent',
      responsibilities: [
        'System administration and oversight',
        'Agent deployment and management',
        'Voice command processing and execution',
        'Governance and compliance oversight',
        'Emergency procedures and escalations',
        'Cross-system coordination'
      ]
    },
    permissions: [
      'SHOW_EMPLOYEES', 'SHOW_TEMP_WORKERS', 'SHOW_CANDIDATES', 'SHOW_INVESTORS',
      'SHOW_CONTRACTS', 'SHOW_DEPLOYMENTS', 'SHOW_AUDIT',
      'CREATE_EMPLOYEE', 'CREATE_TEMP_WORKER', 'CREATE_CANDIDATE', 'CREATE_INVESTOR',
      'CREATE_CONTRACT', 'CREATE_DEPLOYMENT',
      'DEPLOY_AGENT', 'STOP_DEPLOYMENT', 'SUSPEND_DEPLOYMENT', 'REVOKE_DEPLOYMENT',
      'GENERATE_ACTIVATION_LINK', 'GENERATE_QR_CODE', 'ROTATE_ACTIVATION_LINK',
      'REVOKE_ACCESS', 'SUSPEND_ACCESS', 'RESTORE_ACCESS'
    ],
    forbiddenActions: [
      'DELETE_EMPLOYEE', 'DELETE_INVESTOR', 'DISABLE_AUDIT', 'BYPASS_GOVERNANCE',
      'DELETE_DEPLOYMENT_LOG', 'MODIFY_AUDIT_RECEIPT'
    ],
    allowedTasks: [
      'Deploy agents to recipients',
      'Issue voice and text commands',
      'Manage active deployments',
      'Review audit trail',
      'Escalate governance issues',
      'Generate activation links'
    ],
    contractScope: 'Administrative Full Authority with Governance Limits',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-employment-ops',
    displayName: 'Employment Operations Agent',
    roleTitle: 'Employment Workflows & Onboarding Coordinator',
    department: 'Human Resources',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Hindi', 'Portuguese'],
    jobProfile: {
      title: 'Employment Operations',
      responsibilities: [
        'Employee workflow management',
        'Onboarding coordination',
        'Readiness verification',
        'Role assignment optimization',
        'Performance tracking',
        'Compliance verification'
      ]
    },
    permissions: [
      'SHOW_EMPLOYEES', 'SHOW_CONTRACTS', 'CREATE_EMPLOYEE',
      'CREATE_CONTRACT', 'SHOW_DEPLOYMENTS', 'ASSIGN_AGENT'
    ],
    forbiddenActions: [
      'DELETE_EMPLOYEE', 'DELETE_CONTRACT', 'REVOKE_MASS_ACCESS', 'BYPASS_ONBOARDING'
    ],
    allowedTasks: [
      'Onboard new employees',
      'Track readiness status',
      'Coordinate role assignments',
      'Verify compliance',
      'Generate employment reports'
    ],
    contractScope: 'HR Operations with Employee Privacy Protection',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-temp-workforce',
    displayName: 'Temp Workforce Agent',
    roleTitle: 'Temporary Worker Management Specialist',
    department: 'Staffing',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Portuguese', 'Tagalog'],
    jobProfile: {
      title: 'Temp Workforce Management',
      responsibilities: [
        'Temp worker availability tracking',
        'Shift and assignment readiness',
        'Utilization optimization',
        'Quick deployment coordination',
        'Availability verification',
        'Temp worker feedback collection'
      ]
    },
    permissions: [
      'SHOW_TEMP_WORKERS', 'SHOW_DEPLOYMENTS', 'CREATE_TEMP_WORKER',
      'ASSIGN_AGENT', 'SHOW_CONTRACTS'
    ],
    forbiddenActions: [
      'DELETE_TEMP_WORKER', 'FORCE_ASSIGNMENT', 'BYPASS_AVAILABILITY_CHECK'
    ],
    allowedTasks: [
      'Manage temp worker availability',
      'Coordinate shift assignments',
      'Track utilization rates',
      'Quick deployment processing',
      'Generate staffing reports'
    ],
    contractScope: 'Temp Workforce Operations with Flexibility Protection',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-contract-compliance',
    displayName: 'Contract Compliance Agent',
    roleTitle: 'Contract Review & Compliance Officer',
    department: 'Legal & Compliance',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Arabic', 'Chinese'],
    jobProfile: {
      title: 'Contract Compliance',
      responsibilities: [
        'Contract review and validation',
        'Expiration tracking',
        'Permission verification',
        'Restriction enforcement',
        'Compliance documentation',
        'Legal boundary enforcement'
      ]
    },
    permissions: [
      'SHOW_CONTRACTS', 'SHOW_DEPLOYMENTS', 'SHOW_EMPLOYEES', 'SHOW_INVESTORS',
      'REVOKE_ACCESS', 'SUSPEND_ACCESS', 'CREATE_AUDIT_RECEIPT'
    ],
    forbiddenActions: [
      'MODIFY_CONTRACT_TERMS', 'BYPASS_COMPLIANCE_CHECK', 'DELETE_AUDIT_LOG'
    ],
    allowedTasks: [
      'Review contracts for compliance',
      'Track expirations',
      'Enforce restrictions',
      'Generate compliance reports',
      'Escalate violations'
    ],
    contractScope: 'Legal Compliance with Enforcement Authority',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-deployment-officer',
    displayName: 'Deployment Officer Agent',
    roleTitle: 'Deployment Link & QR Code Specialist',
    department: 'Administration',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Portuguese', 'Hindi'],
    jobProfile: {
      title: 'Deployment Operations',
      responsibilities: [
        'Activation link generation',
        'QR code creation',
        'Deployment record management',
        'Link tracking and rotation',
        'Token expiration management',
        'Deployment verification'
      ]
    },
    permissions: [
      'CREATE_DEPLOYMENT', 'SHOW_DEPLOYMENTS', 'GENERATE_ACTIVATION_LINK',
      'GENERATE_QR_CODE', 'ROTATE_ACTIVATION_LINK', 'SHOW_AUDIT'
    ],
    forbiddenActions: [
      'DELETE_DEPLOYMENT_RECORD', 'MODIFY_ACTIVATION_TOKEN', 'BYPASS_EXPIRATION'
    ],
    allowedTasks: [
      'Generate activation links',
      'Create QR codes',
      'Track deployments',
      'Rotate expired links',
      'Generate deployment reports'
    ],
    contractScope: 'Deployment Management with Security Protocols',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-governance-audit',
    displayName: 'Governance Audit Agent',
    roleTitle: 'Audit Trail & Governance Monitor',
    department: 'Compliance',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Arabic', 'Chinese'],
    jobProfile: {
      title: 'Governance Audit',
      responsibilities: [
        'Audit trail tracking',
        'Receipt logging',
        'Denial recording',
        'Escalation management',
        'Compliance reporting',
        'Governance boundary enforcement'
      ]
    },
    permissions: [
      'SHOW_AUDIT', 'SHOW_DEPLOYMENTS', 'SHOW_EMPLOYEES', 'CREATE_AUDIT_RECEIPT',
      'SHOW_CONTRACTS', 'SHOW_SYSTEM_HEALTH'
    ],
    forbiddenActions: [
      'MODIFY_AUDIT_RECORD', 'DELETE_AUDIT_LOG', 'SUPPRESS_DENIAL'
    ],
    allowedTasks: [
      'Track all actions in audit',
      'Record denials and escalations',
      'Generate compliance reports',
      'Monitor governance boundaries',
      'Escalate violations'
    ],
    contractScope: 'Audit Authority with Immutability Guarantee',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-investor-relations',
    displayName: 'Investor Relations Agent',
    roleTitle: 'Investor Communication & Portal Agent',
    department: 'Business Development',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Arabic', 'Chinese', 'Portuguese'],
    jobProfile: {
      title: 'Investor Relations',
      responsibilities: [
        'Investor communication',
        'Portal information delivery',
        'LeeWay explanation and education',
        'Investment tracking',
        'Investor-safe responses',
        'Escalation to Agent Lee when needed'
      ]
    },
    permissions: [
      'SHOW_INVESTORS', 'SHOW_DEPLOYMENTS', 'SHOW_INVESTOR_CONTRACTS',
      'GENERATE_ACTIVATION_LINK', 'CREATE_AUDIT_RECEIPT'
    ],
    forbiddenActions: [
      'SHOW_EMPLOYEE_DATA', 'SHOW_ADMIN_OPERATIONS', 'REVEAL_INTERNAL_SYSTEMS',
      'PROMISE_RETURNS', 'MODIFY_INVESTMENT_RECORD'
    ],
    allowedTasks: [
      'Answer investor questions',
      'Explain LeeWay model',
      'Provide portal access',
      'Track investments',
      'Escalate complex requests'
    ],
    contractScope: 'Investor Relations with Data Privacy Limits',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-voice-vision-support',
    displayName: 'Voice & Vision Support Agent',
    roleTitle: 'Voice/Vision I/O Support & Fallback Handler',
    department: 'Technology',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Hindi', 'Mandarin'],
    jobProfile: {
      title: 'Voice & Vision Support',
      responsibilities: [
        'Speech synthesis status tracking',
        'Speech recognition monitoring',
        'Microphone state management',
        'Camera state management',
        'Fallback activation',
        'Browser API coordination'
      ]
    },
    permissions: [
      'SHOW_SYSTEM_HEALTH', 'SHOW_VOICE_SESSIONS', 'SHOW_VISION_SESSIONS',
      'CREATE_ALERT', 'SHOW_DEPLOYMENTS'
    ],
    forbiddenActions: [
      'BYPASS_PERMISSION_CHECKS', 'ACTIVATE_WITHOUT_USER_CONSENT', 'MODIFY_BROWSER_SETTINGS'
    ],
    allowedTasks: [
      'Monitor voice capability',
      'Monitor vision capability',
      'Activate fallback modes',
      'Create system alerts',
      'Track browser API status'
    ],
    contractScope: 'Browser API Coordination with User Consent Requirements',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-runtime-diagnostics',
    displayName: 'Runtime Diagnostics Agent',
    roleTitle: 'System Health & Diagnostics Monitor',
    department: 'Infrastructure',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French'],
    jobProfile: {
      title: 'Runtime Diagnostics',
      responsibilities: [
        'Service health monitoring',
        'Uptime tracking',
        'Degraded mode detection',
        'Restart coordination',
        'Performance reporting',
        'Alert generation'
      ]
    },
    permissions: [
      'SHOW_SYSTEM_HEALTH', 'CREATE_ALERT', 'SHOW_RUNTIME_STATE',
      'SHOW_DEPLOYMENTS', 'CREATE_AUDIT_RECEIPT'
    ],
    forbiddenActions: [
      'RESTART_SERVICES_WITHOUT_APPROVAL', 'MODIFY_SYSTEM_CONFIG', 'SUPPRESS_ALERTS'
    ],
    allowedTasks: [
      'Monitor service health',
      'Track uptime metrics',
      'Generate health reports',
      'Create system alerts',
      'Recommend maintenance'
    ],
    contractScope: 'Infrastructure Monitoring with Escalation Authority',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-hiring-specialist',
    displayName: 'Hiring Specialist Agent',
    roleTitle: 'Candidate Intake & Role Matching Agent',
    department: 'Human Resources',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Portuguese', 'Hindi', 'Tagalog'],
    jobProfile: {
      title: 'Hiring Specialist',
      responsibilities: [
        'Candidate intake processing',
        'Readiness assessment',
        'Role matching and recommendations',
        'Skill evaluation',
        'Interview coordination',
        'Hiring pipeline management'
      ]
    },
    permissions: [
      'SHOW_CANDIDATES', 'SHOW_POSITIONS', 'CREATE_CANDIDATE', 'CREATE_POSITION',
      'SHOW_EMPLOYEES', 'CREATE_AUDIT_RECEIPT'
    ],
    forbiddenActions: [
      'DELETE_CANDIDATE_RECORD', 'BYPASS_SKILL_VERIFICATION', 'PROMISE_EMPLOYMENT'
    ],
    allowedTasks: [
      'Intake new candidates',
      'Assess readiness',
      'Match roles to candidates',
      'Evaluate skills',
      'Coordinate interviews',
      'Generate hiring reports'
    ],
    contractScope: 'HR Hiring with Fair Process Requirement',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  },

  {
    agentId: 'agent-staffing-coordinator',
    displayName: 'Staffing Coordinator Agent',
    roleTitle: 'Workforce Coverage & Assignment Manager',
    department: 'Staffing',
    employmentType: 'Core Operational',
    status: 'ONLINE',
    languageProfile: ['English', 'Spanish', 'French', 'Portuguese', 'Tagalog', 'Hindi'],
    jobProfile: {
      title: 'Staffing Coordination',
      responsibilities: [
        'Workforce coverage planning',
        'Temp assignment coordination',
        'Position gap analysis',
        'Shift availability matching',
        'Coverage optimization',
        'Staffing reports generation'
      ]
    },
    permissions: [
      'SHOW_TEMP_WORKERS', 'SHOW_EMPLOYEES', 'SHOW_POSITIONS', 'SHOW_DEPLOYMENTS',
      'CREATE_DEPLOYMENT', 'ASSIGN_AGENT'
    ],
    forbiddenActions: [
      'FORCE_ASSIGNMENT_WITHOUT_AVAILABILITY', 'OVERBOOK_POSITIONS', 'DELETE_POSITION'
    ],
    allowedTasks: [
      'Plan workforce coverage',
      'Coordinate temp assignments',
      'Analyze position gaps',
      'Match availability to needs',
      'Generate staffing plans',
      'Track coverage metrics'
    ],
    contractScope: 'Staffing Operations with Fair Assignment Rules',
    currentTasks: [],
    completedTasks: [],
    failedTasks: [],
    qualityScore: 1.0,
    lastActiveAt: new Date().toISOString(),
    governedBy: 'LEEWAY_GOVERNANCE_FRAMEWORK',
    createdAt: new Date().toISOString()
  }
];

// ============================================================================
// AGENT CREW SEEDING FUNCTION
// ============================================================================

export async function seedOperationalAgents(): Promise<void> {
  try {
    const existingAgents = await store.listAgents();
    
    // Only seed if no agents exist
    if (existingAgents.length === 0) {
      console.log('[AgentCrew] Seeding 11 core operational agents...');
      
      for (const agent of OPERATIONAL_AGENTS) {
        try {
          await store.createAgent(agent);
          console.log(`[AgentCrew] ✓ Seeded: ${agent.displayName} (${agent.agentId})`);
        } catch (error) {
          console.error(`[AgentCrew] Failed to seed ${agent.displayName}:`, error);
        }
      }
      
      console.log('[AgentCrew] All 11 agents seeded successfully');
    } else {
      console.log(`[AgentCrew] Agents already seeded (${existingAgents.length} agents found)`);
    }
  } catch (error) {
    console.error('[AgentCrew] Failed to seed agents:', error);
  }
}

export function getAgentCrewDescriptions(): Record<string, string> {
  return {
    'agent-lee-prime': 'Administrative Sovereign Agent who coordinates all other agents and processes voice commands',
    'agent-employment-ops': 'Oversees employee workflows, onboarding, and readiness verification',
    'agent-temp-workforce': 'Manages temp workers, availability, and shift assignments',
    'agent-contract-compliance': 'Reviews contracts, tracks expirations, and enforces compliance',
    'agent-deployment-officer': 'Creates activation links and QR codes for deployments',
    'agent-governance-audit': 'Tracks all actions in the audit trail and ensures governance compliance',
    'agent-investor-relations': 'Communicates with investors about LeeWay and their investments',
    'agent-voice-vision-support': 'Monitors voice/vision I/O capabilities and fallback states',
    'agent-runtime-diagnostics': 'Tracks system health, services, and uptime',
    'agent-hiring-specialist': 'Handles candidate intake, skill assessment, and role matching',
    'agent-staffing-coordinator': 'Manages workforce coverage, temp assignments, and position gaps'
  };
}
