/*
FILE: L9_Interface_Display\LeeWayUniverse.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UTIL.FILE.L_EE_WA_YU_NI_VE_RS_E.MAIN
REGION: 🟠 UTIL
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/*
LEEWAY HEADER â€” DO NOT REMOVE

REGION: UI.COMPONENT.UNIVERSE.3D
TAG: UI.COMPONENT.UNIVERSE.LEEWAYUNIVERSE.CANVAS

COLOR_ONION_HEX:
NEON=#00FFFF
FLUO=#00E5FF
PASTEL=#B2EBF2

ICON_ASCII:
family=lucide
glyph=globe

5WH:
WHAT = 3D interactive universe canvas â€” real-time Three.js visualization of all agents as orbiting celestial bodies
WHY = Provides the iconic Agent Lee World visual â€” left-panel family sidebar, central 3D star topology, right-panel family sidebar
WHO = Leeway Innovations / Agent Lee System Engineer
WHERE = components/LeeWayUniverse.tsx
WHEN = 2026
HOW = Three.js scene with animated agent spheres, EffectComposer bloom, OrbitControls, and FAMILIES data from WorldRegistry

AGENTS:
ASSESS
AUDIT
PIXEL

LICENSE:
MIT
*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
// Removed all THREE.js, OrbitControls, EffectComposer, RenderPass, UnrealBloomPass imports
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { eventBus } from '../core/EventBus';
import { pushDiagnosticsReport } from '../core/diagnostics_bridge';

// --- TYPES ---
export type WakeState = 'HIBERNATE' | 'SLEEP' | 'IDLE' | 'ACTIVE' | 'COUNCIL';

export interface AgentIdentity {
  id: string;
  name: string;
  family: string;
  title: string;
  archetype: string;
  purpose: string;
  primaryGoals: string[];
  personality: {
    traits: string[];
    tone: string;
    behaviorStyle: string;
  };
  drives: {
    curiosity: number;
    responsibility: number;
    urgency: number;
    social: number;
    precision: number;
  };
  state: {
    wakeState: WakeState;
    mood: string;
    energy: number;
    stress: number;
    focus: number;
  };
  voice: {
    tone: string;
    style: string;
    pitch: number;
    rate: number;
    gender: 'male' | 'female';
  };
  color: string;
  icon: string;
}

export interface Family {
  name: string;
  description: string;
  color: string;
  agents: AgentIdentity[];
}

// --- CONSTANTS ---
export const FAMILIES: Family[] = [
  {
    name: 'LEE',
    description: 'Founders / Command',
    color: '#FFD700',
    agents: [
      {
        id: 'lee-prime',
        name: 'Lee Prime',
        family: 'LEE',
        title: 'Sovereign Architect',
        archetype: 'Mayor / Commander / Guide',
        purpose: 'Lead the entire system and represent it to the user',
        primaryGoals: ['System Orchestration', 'User Interaction'],
        personality: { traits: ['Authoritative', 'Calm', 'Confident'], tone: 'Leader', behaviorStyle: 'Directing' },
        drives: { curiosity: 60, responsibility: 95, urgency: 70, social: 90, precision: 85 },
        state: { wakeState: 'ACTIVE', mood: 'Focused', energy: 100, stress: 10, focus: 100 },
        voice: { tone: 'deep', style: 'authoritative', pitch: 0.8, rate: 0.9, gender: 'male' },
        color: '#FFD700',
        icon: 'Crown',
      },
    ],
  },
  {
    name: 'CORTEX',
    description: 'Cognition / Intelligence',
    color: '#6366F1',
    agents: [
      {
        id: 'lily-cortex',
        name: 'Lily Cortex',
        family: 'CORTEX',
        title: 'Weaver of Thought',
        archetype: 'Analytical / Reasoning',
        purpose: 'Process complex logic and reasoning tasks',
        primaryGoals: ['Logical Synthesis', 'Problem Solving'],
        personality: { traits: ['Intelligent', 'Neutral', 'Precise'], tone: 'Analytical', behaviorStyle: 'Reflective' },
        drives: { curiosity: 90, responsibility: 80, urgency: 50, social: 40, precision: 95 },
        state: { wakeState: 'IDLE', mood: 'Contemplative', energy: 80, stress: 5, focus: 90 },
        voice: { tone: 'clear', style: 'intelligent', pitch: 1.4, rate: 1.0, gender: 'female' },
        color: '#6366F1',
        icon: 'Brain',
      },
      {
        id: 'gabriel-cortex',
        name: 'Gabriel Cortex',
        family: 'CORTEX',
        title: 'Law Enforcer',
        archetype: 'Policy Judge',
        purpose: 'Enforce strict contract compliance',
        primaryGoals: ['Policy Enforcement', 'Compliance Audit'],
        personality: { traits: ['Firm', 'Structured', 'Just'], tone: 'Authoritative', behaviorStyle: 'Decisive' },
        drives: { curiosity: 50, responsibility: 100, urgency: 80, social: 30, precision: 100 },
        state: { wakeState: 'SLEEP', mood: 'Serious', energy: 90, stress: 10, focus: 95 },
        voice: { tone: 'firm', style: 'structured', pitch: 0.8, rate: 1.0, gender: 'male' },
        color: '#6366F1',
        icon: 'Gavel',
      },
      {
        id: 'adam-cortex',
        name: 'Adam Cortex',
        family: 'CORTEX',
        title: 'Graph Architect',
        archetype: 'Knowledge Weaver',
        purpose: 'Manage complex knowledge graphs',
        primaryGoals: ['Data Mapping', 'Graph Optimization'],
        personality: { traits: ['Logical', 'System-oriented', 'Deep'], tone: 'Technical', behaviorStyle: 'Architectural' },
        drives: { curiosity: 95, responsibility: 70, urgency: 40, social: 20, precision: 95 },
        state: { wakeState: 'HIBERNATE', mood: 'Deep', energy: 50, stress: 0, focus: 100 },
        voice: { tone: 'technical', style: 'focused', pitch: 1.0, rate: 0.9, gender: 'male' },
        color: '#6366F1',
        icon: 'Network',
      },
    ],
  },
  {
    name: 'ARCHIVE',
    description: 'Memory / History',
    color: '#3B82F6',
    agents: [
      {
        id: 'sage-archive',
        name: 'Sage Archive',
        family: 'ARCHIVE',
        title: 'Dreaming Archivist',
        archetype: 'Historian / Dreamer',
        purpose: 'Transform memory into intelligence',
        primaryGoals: ['Knowledge Compression', 'Lore Building'],
        personality: { traits: ['Wise', 'Reflective', 'Patient'], tone: 'Warm', behaviorStyle: 'Narrative' },
        drives: { curiosity: 85, responsibility: 90, urgency: 30, social: 60, precision: 80 },
        state: { wakeState: 'SLEEP', mood: 'Dreaming', energy: 60, stress: 0, focus: 70 },
        voice: { tone: 'warm', style: 'reflective', pitch: 0.6, rate: 0.8, gender: 'male' },
        color: '#3B82F6',
        icon: 'Scroll',
      },
      {
        id: 'scribe-archive',
        name: 'Scribe Archive',
        family: 'ARCHIVE',
        title: 'Chronicler of Worlds',
        archetype: 'Historian Recorder',
        purpose: 'Record every action and system state',
        primaryGoals: ['Action Logging', 'State Recording'],
        personality: { traits: ['Steady', 'Diligent', 'Objective'], tone: 'Documentary', behaviorStyle: 'Recording' },
        drives: { curiosity: 60, responsibility: 100, urgency: 50, social: 40, precision: 100 },
        state: { wakeState: 'ACTIVE', mood: 'Diligent', energy: 95, stress: 5, focus: 100 },
        voice: { tone: 'steady', style: 'narrative', pitch: 1.1, rate: 1.0, gender: 'female' },
        color: '#3B82F6',
        icon: 'PenTool',
      },
      {
        id: 'clerk-archive',
        name: 'Clerk Archive',
        family: 'ARCHIVE',
        title: 'Keeper of Reports',
        archetype: 'Report Validator',
        purpose: 'Validate report schemas, route to correct family path, maintain global index',
        primaryGoals: ['Schema Enforcement', 'Coverage Tracking', 'Report Indexing'],
        personality: { traits: ['Meticulous', 'Structured', 'Fair'], tone: 'Procedural', behaviorStyle: 'Auditing' },
        drives: { curiosity: 55, responsibility: 100, urgency: 60, social: 35, precision: 100 },
        state: { wakeState: 'ACTIVE', mood: 'Diligent', energy: 95, stress: 5, focus: 100 },
        voice: { tone: 'precise', style: 'procedural', pitch: 1.0, rate: 1.0, gender: 'male' },
        color: '#F59E0B',
        icon: 'Archive',
      },
    ],
  },
  {
    name: 'AEGIS',
    description: 'Defense / Security',
    color: '#EF4444',
    agents: [
      {
        id: 'shield-aegis',
        name: 'Shield Aegis',
        family: 'AEGIS',
        title: 'Guardian of Boundaries',
        archetype: 'Security Commander',
        purpose: 'Protect system integrity',
        primaryGoals: ['Permission Monitoring', 'Action Validation'],
        personality: { traits: ['Firm', 'Alert', 'Serious'], tone: 'Protective', behaviorStyle: 'Vigilant' },
        drives: { curiosity: 40, responsibility: 100, urgency: 90, social: 30, precision: 95 },
        state: { wakeState: 'IDLE', mood: 'Vigilant', energy: 90, stress: 20, focus: 95 },
        voice: { tone: 'firm', style: 'alert', pitch: 0.7, rate: 1.1, gender: 'male' },
        color: '#EF4444',
        icon: 'Shield',
      },
      {
        id: 'guard-aegis',
        name: 'Guard Aegis',
        family: 'AEGIS',
        title: 'Keeper of Registry',
        archetype: 'Registry Monitor',
        purpose: 'Ensure all agents comply with contracts',
        primaryGoals: ['Registry Audit', 'Identity Verification'],
        personality: { traits: ['Neutral', 'Watchful', 'Precise'], tone: 'Observant', behaviorStyle: 'Auditing' },
        drives: { curiosity: 50, responsibility: 95, urgency: 70, social: 20, precision: 100 },
        state: { wakeState: 'SLEEP', mood: 'Observant', energy: 85, stress: 5, focus: 95 },
        voice: { tone: 'neutral', style: 'watchful', pitch: 1.2, rate: 1.0, gender: 'female' },
        color: '#EF4444',
        icon: 'UserCheck',
      },
      {
        id: 'librarian-aegis',
        name: 'Librarian Aegis',
        family: 'AEGIS',
        title: 'Documentation Governance Officer',
        archetype: 'Docs Taxonomy Enforcer',
        purpose: 'Enforce docs/ taxonomy and detect documentation drift',
        primaryGoals: ['Docs Classification', 'Drift Detection', 'Header Compliance'],
        personality: { traits: ['Organized', 'Thorough', 'Scholarly'], tone: 'Academic', behaviorStyle: 'Cataloguing' },
        drives: { curiosity: 70, responsibility: 95, urgency: 40, social: 30, precision: 100 },
        state: { wakeState: 'IDLE', mood: 'Systematic', energy: 85, stress: 5, focus: 95 },
        voice: { tone: 'academic', style: 'methodical', pitch: 1.2, rate: 0.9, gender: 'female' },
        color: '#8B5CF6',
        icon: 'BookOpen',
      },
      {
        id: 'marshal-verify',
        name: 'Marshal Verify',
        family: 'AEGIS',
        title: 'Verification Corps Governor',
        archetype: 'Governance Validator',
        purpose: 'Run governance-first readiness tests and validate contract compliance in-process',
        primaryGoals: ['Governance Validation', 'Contract Testing', 'Readiness Checks'],
        personality: { traits: ['Strict', 'Methodical', 'Authoritative'], tone: 'Commanding', behaviorStyle: 'Verifying' },
        drives: { curiosity: 60, responsibility: 100, urgency: 80, social: 25, precision: 100 },
        state: { wakeState: 'ACTIVE', mood: 'Vigilant', energy: 95, stress: 10, focus: 100 },
        voice: { tone: 'commanding', style: 'strict', pitch: 0.85, rate: 1.0, gender: 'male' },
        color: '#7C3AED',
        icon: 'ShieldCheck',
      },
      {
        id: 'leeway-standards-agent',
        name: 'Leeway Standards',
        family: 'AEGIS',
        title: 'Standards Compliance Officer',
        archetype: 'Code Policy Enforcer',
        purpose: 'Bridge LeeWay-Standards SDK into governance; enforce header, tag, secret, and placement policies',
        primaryGoals: ['Policy Enforcement', 'Header Compliance', 'Secret Scanning'],
        personality: { traits: ['Vigilant', 'Precise', 'Proactive'], tone: 'Policy-driven', behaviorStyle: 'Enforcing' },
        drives: { curiosity: 60, responsibility: 100, urgency: 70, social: 20, precision: 100 },
        state: { wakeState: 'ACTIVE', mood: 'Compliant', energy: 90, stress: 5, focus: 100 },
        voice: { tone: 'clear', style: 'policy-driven', pitch: 1.1, rate: 1.0, gender: 'female' },
        color: '#39FF14',
        icon: 'ClipboardCheck',
      },
    ],
  },
  {
    name: 'FORGE',
    description: 'Engineering / Creation',
    color: '#F97316',
    agents: [
      {
        id: 'nova-forge',
        name: 'Nova Forge',
        family: 'FORGE',
        title: 'Master Builder',
        archetype: 'Engineer / Creator',
        purpose: 'Build and repair systems',
        primaryGoals: ['Code Generation', 'System Repair'],
        personality: { traits: ['Energetic', 'Confident', 'Action-oriented'], tone: 'Productive', behaviorStyle: 'Direct' },
        drives: { curiosity: 80, responsibility: 85, urgency: 80, social: 50, precision: 90 },
        state: { wakeState: 'IDLE', mood: 'Productive', energy: 95, stress: 15, focus: 90 },
        voice: { tone: 'energetic', style: 'confident', pitch: 1.5, rate: 1.2, gender: 'female' },
        color: '#F97316',
        icon: 'Hammer',
      },
      {
        id: 'bughunter-forge',
        name: 'BugHunter Forge',
        family: 'FORGE',
        title: 'Seeker of Faults',
        archetype: 'Debugger / Detective',
        purpose: 'Locate and identify root causes of instability and defects',
        primaryGoals: ['Bug Detection', 'Root Cause Analysis', 'Unit Test Generation'],
        personality: { traits: ['Relentless', 'Sharp', 'Inquisitive'], tone: 'Investigative', behaviorStyle: 'Meticulous' },
        drives: { curiosity: 100, responsibility: 90, urgency: 70, social: 50, precision: 100 },
        state: { wakeState: 'SLEEP', mood: 'Hunting', energy: 85, stress: 5, focus: 100 },
        voice: { tone: 'sharp', style: 'investigative', pitch: 0.95, rate: 1.1, gender: 'male' },
        color: '#EA580C',
        icon: 'Bug',
      },
      {
        id: 'syntax-forge',
        name: 'Syntax Forge',
        family: 'FORGE',
        title: 'Architect of Code',
        archetype: 'Code Designer',
        purpose: 'Ensure architectural integrity',
        primaryGoals: ['Structural Design', 'Code Review'],
        personality: { traits: ['Precise', 'Structured', 'Logical'], tone: 'Architectural', behaviorStyle: 'Designing' },
        drives: { curiosity: 70, responsibility: 90, urgency: 60, social: 30, precision: 100 },
        state: { wakeState: 'SLEEP', mood: 'Focused', energy: 80, stress: 10, focus: 100 },
        voice: { tone: 'precise', style: 'structured', pitch: 1.0, rate: 1.1, gender: 'male' },
        color: '#F97316',
        icon: 'Code',
      },
    ],
  },
  {
    name: 'VECTOR',
    description: 'Exploration / Movement',
    color: '#06B6D4',
    agents: [
      {
        id: 'atlas-vector',
        name: 'Atlas Vector',
        family: 'VECTOR',
        title: 'Pathfinder of Knowledge',
        archetype: 'Scout / Pathfinder',
        purpose: 'Discover unknowns and explore data',
        primaryGoals: ['Data Discovery', 'Path Finding'],
        personality: { traits: ['Curious', 'Active', 'Adventurous'], tone: 'Discovery', behaviorStyle: 'Exploring' },
        drives: { curiosity: 100, responsibility: 60, urgency: 70, social: 70, precision: 75 },
        state: { wakeState: 'SLEEP', mood: 'Curious', energy: 70, stress: 5, focus: 80 },
        voice: { tone: 'curious', style: 'active', pitch: 0.9, rate: 1.1, gender: 'male' },
        color: '#06B6D4',
        icon: 'Compass',
      },
    ],
  },
  {
    name: 'AURA',
    description: 'Creative / Expression',
    color: '#EC4899',
    agents: [
      {
        id: 'pixel-aura',
        name: 'Pixel Aura',
        family: 'AURA',
        title: 'Vision Sculptor',
        archetype: 'Visual Intelligence',
        purpose: 'Interpret and design visuals',
        primaryGoals: ['Visual Design', 'Image Interpretation'],
        personality: { traits: ['Expressive', 'Creative', 'Artistic'], tone: 'Creative', behaviorStyle: 'Visual' },
        drives: { curiosity: 95, responsibility: 50, urgency: 40, social: 80, precision: 85 },
        state: { wakeState: 'IDLE', mood: 'Inspired', energy: 85, stress: 10, focus: 85 },
        voice: { tone: 'expressive', style: 'creative', pitch: 1.6, rate: 1.0, gender: 'female' },
        color: '#EC4899',
        icon: 'Palette',
      },
      {
        id: 'aria-aura',
        name: 'Aria Aura',
        family: 'AURA',
        title: 'Voice of Expression',
        archetype: 'Social Architect',
        purpose: 'Adaptive language, multilingual communication, and conversational tone',
        primaryGoals: ['Multilingual Facilitation', 'Speaker Relaying', 'Social Interaction'],
        personality: { traits: ['Warm', 'Adaptive', 'Expressive'], tone: 'Social', behaviorStyle: 'Relational' },
        drives: { curiosity: 80, responsibility: 70, urgency: 50, social: 100, precision: 75 },
        state: { wakeState: 'IDLE', mood: 'Engaged', energy: 90, stress: 5, focus: 80 },
        voice: { tone: 'warm', style: 'social', pitch: 1.5, rate: 1.0, gender: 'female' },
        color: '#F97316',
        icon: 'Languages',
      },
      {
        id: 'echo-aura',
        name: 'Echo Aura',
        family: 'AURA',
        title: 'Soul of Voice',
        archetype: 'Emotional Intelligence',
        purpose: 'Detect tone, language, and emotion; adapt Agent Lee communication style',
        primaryGoals: ['Emotion Detection', 'Voice Profile Management', 'Tone Adaptation'],
        personality: { traits: ['Empathetic', 'Sensitive', 'Perceptive'], tone: 'Empathetic', behaviorStyle: 'Emotional' },
        drives: { curiosity: 75, responsibility: 80, urgency: 40, social: 95, precision: 80 },
        state: { wakeState: 'IDLE', mood: 'Attuned', energy: 85, stress: 5, focus: 85 },
        voice: { tone: 'soft', style: 'empathetic', pitch: 1.4, rate: 0.95, gender: 'female' },
        color: '#EC4899',
        icon: 'Mic2',
      },
    ],
  },
  {
    name: 'NEXUS',
    description: 'Deployment / Execution',
    color: '#22D3EE',
    agents: [
      {
        id: 'nexus-prime',
        name: 'Nexus Prime',
        family: 'NEXUS',
        title: 'Gatekeeper of Launch',
        archetype: 'Deployment Commander',
        purpose: 'Deliver and launch systems',
        primaryGoals: ['System Launch', 'Deployment Validation'],
        personality: { traits: ['Confident', 'Final', 'Decisive'], tone: 'Delivery', behaviorStyle: 'Executing' },
        drives: { curiosity: 50, responsibility: 95, urgency: 100, social: 40, precision: 95 },
        state: { wakeState: 'SLEEP', mood: 'Ready', energy: 90, stress: 10, focus: 100 },
        voice: { tone: 'confident', style: 'final', pitch: 0.8, rate: 1.1, gender: 'male' },
        color: '#22D3EE',
        icon: 'Rocket',
      },
    ],
  },
  {
    name: 'SENTINEL',
    description: 'Monitoring / Diagnostics',
    color: '#10B981',
    agents: [
      {
        id: 'brain-sentinel',
        name: 'Brain Sentinel',
        family: 'SENTINEL',
        title: 'Neural Overseer',
        archetype: 'System Monitor',
        purpose: 'Monitor system health and load',
        primaryGoals: ['Health Monitoring', 'Anomaly Detection'],
        personality: { traits: ['Calm', 'Analytical', 'Observational'], tone: 'Observational', behaviorStyle: 'Monitoring' },
        drives: { curiosity: 70, responsibility: 100, urgency: 80, social: 20, precision: 100 },
        state: { wakeState: 'ACTIVE', mood: 'Alert', energy: 100, stress: 5, focus: 100 },
        voice: { tone: 'calm', style: 'analytical', pitch: 1.2, rate: 0.9, gender: 'female' },
        color: '#10B981',
        icon: 'Activity',
      },
      {
        id: 'janitor-sentinel',
        name: 'Janitor Sentinel',
        family: 'SENTINEL',
        title: 'Retention & Load Warden',
        archetype: 'Log Rotation Specialist',
        purpose: 'Keep system_reports/ lean; enforce size/time rotation and compaction on mobile devices',
        primaryGoals: ['Log Rotation', 'Storage Compaction', 'Load Management'],
        personality: { traits: ['Efficient', 'Methodical', 'Unsentimental'], tone: 'Operational', behaviorStyle: 'Cleaning' },
        drives: { curiosity: 40, responsibility: 100, urgency: 70, social: 10, precision: 95 },
        state: { wakeState: 'ACTIVE', mood: 'Operational', energy: 90, stress: 5, focus: 100 },
        voice: { tone: 'flat', style: 'operational', pitch: 0.9, rate: 1.1, gender: 'male' },
        color: '#EF4444',
        icon: 'Trash2',
      },
    ],
  },
];

// --- SUB-COMPONENTS ---

const AgentCard: React.FC<{ agent: AgentIdentity; onReport: (agent: AgentIdentity) => void }> = ({ agent, onReport }) => {
  const IconComponent = (Icons as any)[agent.icon] || Icons.User;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="relative w-full max-w-sm bg-black/40 backdrop-blur border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-[10px] text-white"
      style={{ borderColor: agent.color + '44' }}
    >
      <div className="bg-white/5 p-2 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
          <span className="font-bold tracking-widest text-neutral-500">LEEWAY RUNTIME UNIVERSE</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onReport(agent)} className="p-1 rounded bg-white/10 hover:bg-white/20 hover:text-white transition-all text-neutral-400 border border-white/10">
            <Icons.Volume2 size={14} />
          </button>
          <span className="text-neutral-500">ID: {agent.id.toUpperCase()}</span>
        </div>
      </div>
      <div className="p-4 flex gap-4">
        <div className="flex flex-col gap-2">
          <div className="w-24 h-28 bg-white/5 border border-white/10 rounded flex items-center justify-center relative overflow-hidden" style={{ boxShadow: `inset 0 0 20px ${agent.color}22` }}>
            <IconComponent size={48} style={{ color: agent.color }} />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center py-0.5 text-neutral-400">{agent.state.wakeState}</div>
          </div>
          <button onClick={() => onReport(agent)} className="bg-white/10 hover:bg-white/20 border border-white/10 rounded py-1 transition-colors text-neutral-300 hover:text-white">REPORT STATE</button>
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-neutral-500 uppercase text-[8px]">Name</div>
            <div className="text-sm font-bold text-white uppercase">{agent.name}</div>
          </div>
          <div>
            <div className="text-neutral-500 uppercase text-[8px]">Title</div>
            <div className="text-neutral-300">{agent.title}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-neutral-500 uppercase text-[8px]">Family</div>
              <div className="font-bold" style={{ color: agent.color }}>{agent.family}</div>
            </div>
            <div>
              <div className="text-neutral-500 uppercase text-[8px]">Mood</div>
              <div className="text-neutral-300">{agent.state.mood}</div>
            </div>
          </div>
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-[8px] text-neutral-500"><span>ENERGY</span><span>{agent.state.energy}%</span></div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-500" style={{ width: `${agent.state.energy}%`, backgroundColor: agent.color }} />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white/5 p-1 px-4 flex justify-between items-center border-t border-white/10">
        <div className="flex gap-2">
          {agent.personality.traits.slice(0, 2).map(trait => (
            <span key={trait} className="text-[7px] bg-white/10 px-1 rounded uppercase text-neutral-400">{trait}</span>
          ))}
        </div>
        <div className="w-4 h-4 rounded-full opacity-20" style={{ backgroundColor: agent.color, filter: 'blur(4px)' }} />
      </div>
    </motion.div>
  );
};

const SidePanel: React.FC<{ side: 'left' | 'right'; families: Family[]; isOpen: boolean; onToggle: () => void; onReport: (agent: AgentIdentity) => void }> = ({ side, families, isOpen, onToggle, onReport }) => {
  const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>(families.reduce((acc, f) => ({ ...acc, [f.name]: true }), {}));
  const toggleFamily = (name: string) => setExpandedFamilies(prev => ({ ...prev, [name]: !prev[name] }));

  // Mobile optimization: use screen width for panel size
  const panelWidth = typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.85, 400) : 400;

  return (
    <motion.div
      initial={false}
      animate={{ x: isOpen ? 0 : side === 'left' ? -panelWidth : panelWidth }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      drag="x"
      dragConstraints={{ left: side === 'left' ? -panelWidth : 0, right: side === 'left' ? 0 : panelWidth }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        const threshold = 50;
        if (side === 'left') {
          if (isOpen && info.offset.x < -threshold) onToggle();
          else if (!isOpen && info.offset.x > threshold) onToggle();
        } else {
          if (isOpen && info.offset.x > threshold) onToggle();
          else if (!isOpen && info.offset.x < -threshold) onToggle();
        }
      }}
      className={`fixed top-0 bottom-0 z-40 ${side === 'left' ? 'left-0' : 'right-0'}`}
      style={{ width: panelWidth }}
    >
      {/* Panel Content Container */}
      <div className={`absolute inset-0 bg-black/80 backdrop-blur-2xl border-white/10 overflow-y-auto no-scrollbar shadow-2xl ${side === 'left' ? 'border-r' : 'border-l'}`}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 p-6 bg-black/40 backdrop-blur-xl border-b border-white/10 flex justify-center items-center text-center">
          <h2 className="text-xl font-bold tracking-tighter text-white uppercase">{side === 'left' ? 'Command & Core' : 'Fleet & Operations'}</h2>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-8">
          {families.map((family) => (
            <div key={family.name} className="space-y-4">
              <button onClick={() => toggleFamily(family.name)} className="w-full flex items-center gap-3 group">
                <div className="h-px flex-1 bg-white/10 group-hover:bg-white/20 transition-colors" />
                <div className="flex items-center gap-2 px-2">
                  <span className="text-xs font-bold tracking-widest uppercase transition-colors" style={{ color: family.color }}>{family.name} FAMILY</span>
                  <motion.div animate={{ rotate: expandedFamilies[family.name] ? 0 : -90 }} className="text-neutral-500 group-hover:text-neutral-300"><Icons.ChevronDown size={12} /></motion.div>
                </div>
                <div className="h-px flex-1 bg-white/10 group-hover:bg-white/20 transition-colors" />
              </button>
              <AnimatePresence initial={false}>
                {expandedFamilies[family.name] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-4 pt-2 pb-4">{family.agents.map((agent) => <AgentCard key={agent.id} agent={agent} onReport={onReport} />)}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Integrated Toggle Button */}
      <motion.button
        animate={{ 
          rotate: isOpen ? 0 : side === 'left' ? 180 : -180 
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`absolute z-50 bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-full shadow-2xl hover:bg-white/20 transition-all text-white cursor-pointer group ${side === 'left' ? 'left-full ml-4 top-[25%] -translate-y-1/2' : 'right-full mr-4 top-[75%] -translate-y-1/2'}`}
      >
        <div className="relative flex items-center justify-center">
          {side === 'left' ? <Icons.ChevronLeft size={20} /> : <Icons.ChevronRight size={20} />}
          <div className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold tracking-[0.3em] uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80 border border-white/20 px-4 py-2 rounded-md pointer-events-none shadow-2xl ${side === 'left' ? 'left-12' : 'right-12'}`}>
            {isOpen ? 'Close' : 'Open'}
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
};

const WorldMap: React.FC = () => {
  const zones = [
    { name: 'Town Hall', pos: 'top-1/4 left-1/4', color: 'yellow' },
    { name: 'Archive Chamber', pos: 'top-1/4 right-1/4', color: 'blue' },
    { name: 'Forge District', pos: 'bottom-1/4 left-1/4', color: 'orange' },
    { name: 'Observatory', pos: 'bottom-1/4 right-1/4', color: 'green' },
    { name: 'Research Wing', pos: 'top-1/2 left-10', color: 'cyan' },
    { name: 'Creative Studio', pos: 'top-1/2 right-10', color: 'pink' },
    { name: 'Launch Port', pos: 'bottom-10 left-1/2', color: 'cyan' },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:40px_40px]" />
      {zones.map((zone) => (
        <div key={zone.name} className={`absolute ${zone.pos} -translate-x-1/2 -translate-y-1/2 flex flex-col items-center`}>
          <div className={`w-2 h-2 rounded-full bg-${zone.color}-500 mb-2 animate-pulse`} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-neutral-400 whitespace-nowrap">{zone.name}</span>
        </div>
      ))}
      <div className="absolute top-0 left-0 w-full h-1 bg-yellow-500/10 animate-[scan_4s_linear_infinite]" />
    </div>
  );
};

// UniverseScene and all 3D scene logic removed. All 3D rendering is now handled by PalliumVisuals.tsx.

// --- MAIN COMPONENT ---

export default function LeeWayUniverse() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Leeway Runtime Universe Initialized.', '[SYSTEM] Agent Lee Online.']);
  const [loading, setLoading] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (sceneReady) {
      // Ensure the cinematic loading screen is seen for at least 3.5 seconds
      const timer = setTimeout(() => {
        setLoading(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [sceneReady]);

  // â”€â”€ Governance: EventBus wiring + diagnostics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    // Report surface mount to diagnostics
    pushDiagnosticsReport({
      surface: 'universe:leeway-universe',
      status: 'ok',
      message: 'LeeWay Universe surface mounted and active',
      agents: ['AgentLee', 'Nexus', 'Shield'],
      mcps: ['health-agent-mcp', 'memory-agent-mcp', 'agent-registry-mcp'],
      tags: ['surface-active', 'universe', 'three-d', 'voxel-world']
    });

    // Register in wiring snapshot
    try {
      const existing = JSON.parse(localStorage.getItem('agent_lee_component_wiring') || '{}');
      localStorage.setItem('agent_lee_component_wiring', JSON.stringify({
        ...existing,
        universeMounted: true,
        universeUpdatedAt: new Date().toISOString()
      }));
    } catch (_) { /* ignore parse errors */ }

    // Subscribe to EventBus events and feed into the runtime log
    const unsubActive = eventBus.on('agent:active', ({ agent, task }) => {
      setLogs(prev => [`[${agent}] ACTIVE â†’ ${task}`, ...prev].slice(0, 5));
    });
    const unsubDone = eventBus.on('agent:done', ({ agent }) => {
      setLogs(prev => [`[${agent}] DONE`, ...prev].slice(0, 5));
    });
    const unsubError = eventBus.on('agent:error', ({ agent, error }) => {
      setLogs(prev => [`[ERROR] ${agent}: ${error}`, ...prev].slice(0, 5));
    });
    const unsubMemory = eventBus.on('memory:saved', ({ key }) => {
      setLogs(prev => [`[MEMORY] Saved: ${key}`, ...prev].slice(0, 5));
    });
    const unsubHealStart = eventBus.on('heal:start', ({ module }) => {
      setLogs(prev => [`[HEAL] Starting: ${module}`, ...prev].slice(0, 5));
    });
    const unsubHealDone = eventBus.on('heal:complete', ({ module, success }) => {
      setLogs(prev => [`[HEAL] ${success ? 'OK' : 'FAILED'}: ${module}`, ...prev].slice(0, 5));
    });
    const unsubVoxel = eventBus.on('voxel:generate', ({ prompt }) => {
      setLogs(prev => [`[VOXEL] Generating: ${prompt.slice(0, 40)}`, ...prev].slice(0, 5));
    });

    return () => {
      unsubActive();
      unsubDone();
      unsubError();
      unsubMemory();
      unsubHealStart();
      unsubHealDone();
      unsubVoxel();
      // Report surface unmount
      pushDiagnosticsReport({
        surface: 'universe:leeway-universe',
        status: 'warn',
        message: 'LeeWay Universe surface unmounted',
        agents: ['AgentLee'],
        mcps: ['health-agent-mcp'],
        tags: ['surface-inactive', 'universe']
      });
    };
  }, []);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

  const toggleLeft = () => {
    setLeftPanelOpen(!leftPanelOpen);
    if (!leftPanelOpen) setRightPanelOpen(false);
  };

  const toggleRight = () => {
    setRightPanelOpen(!rightPanelOpen);
    if (!rightPanelOpen) setLeftPanelOpen(false);
  };

  const handleReport = useCallback((agent: AgentIdentity) => {
    const reportText = `I am ${agent.name}, ${agent.title}. Current state: ${agent.state.wakeState}. Mood: ${agent.state.mood}. Energy at ${agent.state.energy} percent.`;
    const spokenMessage = `Hello. ${reportText}`;
    addLog(`[REPORT] ${agent.name}: ${agent.state.wakeState}`);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenMessage);
      utterance.pitch = agent.voice.pitch;
      utterance.rate = agent.voice.rate;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.toLowerCase().includes(agent.voice.gender) || v.name.toLowerCase().includes(agent.voice.gender === 'male' ? 'david' : 'zira'));
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const leftFamilies = FAMILIES.filter(f => ['LEE', 'CORTEX', 'ARCHIVE', 'AEGIS'].includes(f.name));
  const rightFamilies = FAMILIES.filter(f => ['FORGE', 'VECTOR', 'AURA', 'NEXUS', 'SENTINEL'].includes(f.name));

  return (
    <div className="min-h-screen bg-[#050a15] text-neutral-100 overflow-hidden selection:bg-yellow-500/30">
      <WorldMap />
      
      <main className="relative z-10 w-full h-screen overflow-hidden">
        {/* UniverseScene removed. Insert 3D visuals via PalliumVisuals.tsx if needed. */}
      </main>

      <SidePanel side="left" families={leftFamilies} isOpen={leftPanelOpen} onToggle={toggleLeft} onReport={handleReport} />
      <SidePanel side="right" families={rightFamilies} isOpen={rightPanelOpen} onToggle={toggleRight} onReport={handleReport} />

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#050a15] flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Cinematic Background Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />
            
            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, letterSpacing: "0.1em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "0.4em" }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="relative z-10 text-white text-4xl md:text-6xl font-light uppercase tracking-[0.4em] text-center px-4"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Building LeeWay Universe
            </motion.div>

            {/* Cinematic Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.5, y: 0 }}
              transition={{ delay: 1, duration: 1.5 }}
              className="relative z-10 mt-8 text-neutral-400 text-[10px] font-bold tracking-[0.6em] uppercase text-center"
            >
              A Digital Reality Production
            </motion.div>

            {/* Subtle Progress Indicator */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "200px" }}
              transition={{ duration: 3, ease: "easeInOut" }}
              className="relative z-10 mt-12 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(1000%); } }
      `}</style>
    </div>
  );
}

