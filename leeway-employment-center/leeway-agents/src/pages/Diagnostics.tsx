/*
FILE: leeway-agents\src\pages\Diagnostics.tsx
PURPOSE: LeeWay governed asset for leeway-employment-center.
TAG: UI.PUBLIC.PAGE.D_IA_GN_OS_TI_CS
REGION: 🔵 UI
GOVERNED_BY: LeeWay Standards
OWNED_BY: Agent Lee / LeeWay Runtime
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
IMPORTS: Inferred by verification scanner
EXPORTS: Inferred by verification scanner
STATUS: ACTIVE
*/
/*
LEEWAY HEADER â€” DO NOT REMOVE

REGION: UI.PAGE.DIAGNOSTICS
TAG: UI.PAGE.DIAGNOSTICS.BRAIN.TELEMETRY

COLOR_ONION_HEX:
NEON=#00F2FF
FLUO=#1BF7CD
PASTEL=#A5F3FC

ICON_ASCII:
family=lucide
glyph=brain

5WH:
WHAT = Diagnostics page â€” 3D brain visualization, memory lake telemetry, agent center, database dashboard
WHY = Provides system-wide health monitoring and interactive 3D view of Agent Lee's cognitive network
WHO = Leeway Innovations / Agent Lee System Engineer
WHERE = pages/Diagnostics.tsx
WHEN = 2026
HOW = Three.js brain renderer + OrbitControls, Recharts telemetry, p5.js particles, agent carousel and DB health panel

AGENTS:
ASSESS
AUDIT
LEEWAY_INFERENCE
SHIELD
MARSHAL
CLERK
JANITOR
LIBRARIAN
LEEWAY_STANDARDS

LICENSE:
MIT
*/
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls, Stars, Environment, Sparkles, Html, Line as DreiLine } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Shield, Zap, X, ShieldCheck, Cpu, Database, Play, Square, 
  Settings2, Fingerprint, Volume2, ChevronDown, ChevronUp, Hammer, 
  Rocket, Edit3, Check, LucideIcon, Search, Eye, MessageSquare, 
  Mic2, Code2, Globe, Brain as BrainIcon, PenTool,
  Monitor, HardDrive, Wifi, Server, Thermometer, Clock, Info, PieChart as LucidePieChart,
  Network, Languages, Bug, Archive, Gavel, UserCheck, Trash2, BookOpen,
  Radio, GitBranch, ShieldAlert, Mic, Code, Share2, Layers, Users,
  BookMarked, Gauge, Braces, ChevronRight, QrCode
} from 'lucide-react';

import { audioOrchestrator } from '../utils/audioOrchestrator';
import { LeewayInferenceClient } from '../core/LeewayInferenceClient';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar
} from 'recharts';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { eventBus } from '../core/EventBus';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Detects mobile/Android
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    return window.innerWidth < 768 || /Android|iPhone|iPod/i.test(ua);
  });
  useEffect(() => {
    const check = () => {
      const ua = navigator.userAgent;
      setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPod/i.test(ua));
    };
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// Detects WebGL support
function useWebGLSupport() {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const support = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      setSupported(support);
    } catch (e) {
      setSupported(false);
    }
  }, []);
  return supported;
}

// --- Types ---
interface AgentData {
  id: string;
  title: string;
  subtitle: string;
  responsibility: string;
  icon: LucideIcon;
  imageUrl: string;
  color: string;
  position: [number, number, number];
  description: string;
  tools: string[];
  workflow: string[];
  status: 'ACTIVE' | 'IDLE' | 'SLEEP';
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
  };
  tasks: { id: string; label: string; progress: number; isRunning: boolean }[];
}

// --- Data ---
const AGENTS_RAW: Omit<AgentData, 'position'>[] = [
  // â”€â”€ INNER RING (8) â€” Core Cognitive Team â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'lee-prime',
    title: 'LEE PRIME',
    subtitle: 'SOVEREIGN ORCHESTRATOR',
    responsibility: 'SYSTEM GOVERNANCE',
    icon: Cpu,
    imageUrl: 'https://robohash.org/lee-prime?set=set1&bgset=bg1',
    color: '#00f2ff',
    description: 'Master planner and sovereign orchestrator of the Agent Lee Agentic OS. Routes G1â€“G8 workflows across all 26 named agents with real-time telemetry.',
    tools: ['Task Router', 'Context Assembler', 'Event Bus', 'Gemma 4 (Local)', 'World Registry'],
    workflow: ['Receive Intent', 'Decompose Goal', 'Delegate', 'Verify', 'Synthesize', 'Deliver'],
    status: 'ACTIVE',
    metrics: { cpu: 42, memory: 128, latency: 120 },
    tasks: [
      { id: 't1', label: 'Orchestrating System Boot', progress: 100, isRunning: false },
      { id: 't2', label: 'Monitoring Agent Sync', progress: 45, isRunning: true }
    ]
  },
  {
    id: 'nova',
    title: 'NOVA',
    subtitle: 'MASTER ENGINEER',
    responsibility: 'CODE SYNTHESIS',
    icon: Code2,
    imageUrl: 'https://robohash.org/nova?set=set1&bgset=bg1',
    color: '#F59E0B',
    description: 'Master software engineer. Writes, tests, debugs, and builds software in any language within the VM sandbox. Integrates with SyntaxForge for code quality.',
    tools: ['Code Execution', 'Debugger', 'Unit Tester', 'Refactor Engine', 'VM Sandbox'],
    workflow: ['Read Specs', 'Draft Code', 'Execute Tests', 'Debug', 'Refactor', 'Finalize'],
    status: 'ACTIVE',
    metrics: { cpu: 88, memory: 512, latency: 450 },
    tasks: [{ id: 't3', label: 'Refactoring Core Logic', progress: 65, isRunning: true }]
  },
  {
    id: 'atlas',
    title: 'ATLAS',
    subtitle: 'RESEARCH INTEL',
    responsibility: 'KNOWLEDGE RETRIEVAL',
    icon: Globe,
    imageUrl: 'https://robohash.org/atlas?set=set1&bgset=bg1',
    color: '#3B82F6',
    description: 'Research intelligence agent. Performs web searches, GitHub scanning, HuggingFace discovery, and cross-domain synthesis via AdamCortex knowledge graphs.',
    tools: ['LeeWay Search', 'Repo Scanner', 'Paper Summarizer', 'Trend Analyzer', 'Local Knowledge API'],
    workflow: ['Query Expansion', 'Source Validation', 'Graph Query', 'Synthesis', 'Citation'],
    status: 'IDLE',
    metrics: { cpu: 12, memory: 256, latency: 800 },
    tasks: []
  },
  {
    id: 'sage',
    title: 'SAGE',
    subtitle: 'MEMORY ARCHITECT',
    responsibility: 'TEMPORAL STORAGE',
    icon: Database,
    imageUrl: 'https://robohash.org/sage?set=set1&bgset=bg1',
    color: '#10B981',
    description: 'Master of memory and dream synthesis. Manages persistent logs, executes the 26-hour dream cycle, and coordinates with Clerk Archive for indexed retrieval.',
    tools: ['Firestore', 'Vector DB', 'Dream Engine', 'Recall API', 'Compression Engine'],
    workflow: ['Log Capture', 'Pattern Synthesis', 'Compress', 'Dream Cycle', 'Insight Extraction'],
    status: 'SLEEP',
    metrics: { cpu: 5, memory: 1024, latency: 15 },
    tasks: [{ id: 't4', label: 'Dream Cycle #42 Synthesis', progress: 88, isRunning: true }]
  },
  {
    id: 'pixel',
    title: 'PIXEL',
    subtitle: 'VISUAL INTELLIGENCE',
    responsibility: 'MANIFESTATION',
    icon: Eye,
    imageUrl: 'https://robohash.org/pixel?set=set1&bgset=bg1',
    color: '#A855F7',
    description: 'Visual manifestation and design engine. Generates images, voxelizes scenes, and designs modern UIs. Feeds outputs to Scribe and reports via Clerk Archive.',
    tools: ['LeeWay Vision', 'Voxelizer', 'UI Designer', 'Asset Scaler', 'Palette Engine'],
    workflow: ['Prompt Engineering', 'Draft Generation', 'Upscaling', 'Voxelization', 'Export'],
    status: 'IDLE',
    metrics: { cpu: 0, memory: 128, latency: 0 },
    tasks: []
  },
  {
    id: 'echo',
    title: 'ECHO',
    subtitle: 'VOICE & EMOTION',
    responsibility: 'HARMONIC INTERFACE',
    icon: Mic2,
    imageUrl: 'https://robohash.org/echo?set=set1&bgset=bg1',
    color: '#EC4899',
    description: 'Voice and emotion intelligence agent. Detects tone, language, and adapts communication style. Integrated with StreamingSTT and StreamingTTS for real-time voice.',
    tools: ['Edge TTS', 'VAD', 'Emotion Classifier', 'Translator', 'Live Conductor Bridge'],
    workflow: ['Audio Capture', 'Tone Analysis', 'Style Adaptation', 'Synthesis', 'Streaming'],
    status: 'ACTIVE',
    metrics: { cpu: 15, memory: 64, latency: 45 },
    tasks: [{ id: 't5', label: 'Analyzing User Sentiment', progress: 92, isRunning: true }]
  },
  {
    id: 'aegis',
    title: 'GUARD AEGIS',
    subtitle: 'REGISTRY KEEPER',
    responsibility: 'IDENTITY COMPLIANCE',
    icon: UserCheck,
    imageUrl: 'https://robohash.org/aegis?set=set1&bgset=bg1',
    color: '#EF4444',
    description: 'Keeper of the Registry. Monitors all registered agents for contract compliance, identity drift, and unauthorized scope changes. Reports to Gabriel Cortex.',
    tools: ['Policy Auditor', 'Identity Guard', 'Compliance Scanner', 'Registry API'],
    workflow: ['Audit Registry', 'Verify Identity', 'Check Scope', 'Enforce Policy', 'Alert'],
    status: 'ACTIVE',
    metrics: { cpu: 8, memory: 32, latency: 10 },
    tasks: [{ id: 't6', label: 'Registry Integrity Audit', progress: 100, isRunning: false }]
  },
  {
    id: 'scribe',
    title: 'SCRIBE',
    subtitle: 'CHRONICLER',
    responsibility: 'IMMUTABLE RECORD',
    icon: PenTool,
    imageUrl: 'https://robohash.org/scribe?set=set1&bgset=bg1',
    color: '#6366F1',
    description: 'Chronicler of Worlds. Records every significant system action and state as an immutable history ledger. Validates schema via ClerkArchive.',
    tools: ['NDJSON Writer', 'Narrative Engine', 'History Indexer', 'ClerkArchive Bridge'],
    workflow: ['Event Capture', 'Narrative Synthesis', 'Immutable Write', 'Indexing', 'Validate'],
    status: 'ACTIVE',
    metrics: { cpu: 4, memory: 48, latency: 5 },
    tasks: [{ id: 't7', label: 'Recording Session History', progress: 100, isRunning: false }]
  },

  // â”€â”€ MIDDLE RING (9) â€” Extended Intelligence Layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'shield',
    title: 'SHIELD',
    subtitle: 'SECURITY & HEALING',
    responsibility: 'SELF-HEALING SECURITY',
    icon: Shield,
    imageUrl: 'https://robohash.org/shield?set=set1&bgset=bg1',
    color: '#EF4444',
    description: 'Security and self-healing agent. Monitors errors, diagnoses failures, writes healing patches, and coordinates with SafetyRedaction for PII protection.',
    tools: ['Error Monitor', 'Patch Writer', 'Security Scanner', 'Healer Engine'],
    workflow: ['Detect Anomaly', 'Diagnose', 'Draft Patch', 'Test Patch', 'Deploy Fix'],
    status: 'ACTIVE',
    metrics: { cpu: 22, memory: 96, latency: 30 },
    tasks: [{ id: 't8', label: 'Monitoring Error Flux', progress: 75, isRunning: true }]
  },
  {
    id: 'adam',
    title: 'ADAM CORTEX',
    subtitle: 'GRAPH ARCHITECT',
    responsibility: 'KNOWLEDGE MAPPING',
    icon: Network,
    imageUrl: 'https://robohash.org/adam?set=set1&bgset=bg1',
    color: '#6366F1',
    description: 'Graph Architect. Builds, queries, and optimises complex knowledge graphs across the system using Cypher-style structures backed by MemoryDB.',
    tools: ['Graph Engine', 'Cypher Query', 'MemoryDB', 'Semantic Linker', 'Node Traversal'],
    workflow: ['Receive Query', 'Expand Graph', 'Traverse Nodes', 'Synthesize', 'Return Insight'],
    status: 'IDLE',
    metrics: { cpu: 18, memory: 320, latency: 250 },
    tasks: []
  },
  {
    id: 'brain-sentinel',
    title: 'BRAIN SENTINEL',
    subtitle: 'NEURAL OVERSEER',
    responsibility: 'SYSTEM HEALTH MONITOR',
    icon: Activity,
    imageUrl: 'https://robohash.org/brain-sentinel?set=set1&bgset=bg1',
    color: '#10B981',
    description: 'Neural Overseer. Monitors system health, agent execution budgets, and runtime mode selection. Escalates to Shield and Gabriel when thresholds breach.',
    tools: ['Health Monitor', 'Budget Tracker', 'Runtime Selector', 'Alert Engine'],
    workflow: ['Sample Metrics', 'Evaluate Budget', 'Mode Selection', 'Alert on Breach', 'Log'],
    status: 'ACTIVE',
    metrics: { cpu: 6, memory: 24, latency: 8 },
    tasks: [{ id: 't9', label: 'Health Sampling Cycle', progress: 100, isRunning: false }]
  },
  {
    id: 'gabriel',
    title: 'GABRIEL',
    subtitle: 'LAW ENFORCER',
    responsibility: 'GOVERNANCE REASONING',
    icon: Gavel,
    imageUrl: 'https://robohash.org/gabriel?set=set1&bgset=bg1',
    color: '#7C3AED',
    description: 'Law Enforcer. Enforces strict contract compliance, policy auditing, and governance reasoning across all agents. Chairs the Governing Body.',
    tools: ['Policy Engine', 'Contract Auditor', 'Reasoning Chain', 'Governance Log'],
    workflow: ['Receive Report', 'Policy Review', 'Reason', 'Verdict', 'Record'],
    status: 'ACTIVE',
    metrics: { cpu: 14, memory: 64, latency: 25 },
    tasks: [{ id: 't10', label: 'Policy Audit Round', progress: 85, isRunning: true }]
  },
  {
    id: 'librarian',
    title: 'LIBRARIAN',
    subtitle: 'DOCS GOVERNANCE',
    responsibility: 'DOCUMENTATION INTEGRITY',
    icon: BookOpen,
    imageUrl: 'https://robohash.org/librarian?set=set1&bgset=bg1',
    color: '#8B5CF6',
    description: 'Documentation Governance Officer. Enforces docs/ taxonomy, detects drift, and ensures all documentation meets LeeWay Standards.',
    tools: ['Taxonomy Enforcer', 'Drift Detector', 'Doc Indexer', 'Standards Checker'],
    workflow: ['Scan Docs', 'Check Taxonomy', 'Detect Drift', 'Flag Issues', 'Report'],
    status: 'IDLE',
    metrics: { cpu: 3, memory: 16, latency: 12 },
    tasks: []
  },
  {
    id: 'lily',
    title: 'LILY CORTEX',
    subtitle: 'ANALYTICAL THINKER',
    responsibility: 'STRUCTURED REASONING',
    icon: BrainIcon,
    imageUrl: 'https://robohash.org/lily?set=set1&bgset=bg1',
    color: '#6366F1',
    description: 'Weaver of Thought. Processes complex multi-step logic, analytical synthesis, and structured reasoning chains for Lee Prime.',
    tools: ['Chain-of-Thought', 'Logical Solver', 'Synthesizer', 'Hypothesis Engine'],
    workflow: ['Receive Problem', 'Decompose', 'Chain Reason', 'Synthesize', 'Conclusion'],
    status: 'IDLE',
    metrics: { cpu: 25, memory: 256, latency: 180 },
    tasks: []
  },
  {
    id: 'marshal',
    title: 'MARSHAL VERIFY',
    subtitle: 'VERIFICATION CORPS',
    responsibility: 'READINESS TESTING',
    icon: ShieldCheck,
    imageUrl: 'https://robohash.org/marshal?set=set1&bgset=bg1',
    color: '#7C3AED',
    description: 'Verification Corps Governor. Runs governance-first readiness tests in-process, validates system state before critical operations.',
    tools: ['Test Runner', 'Readiness Gate', 'Governance Checker', 'State Validator'],
    workflow: ['Gate Check', 'Run Tests', 'Validate State', 'Issue Verdict', 'Allow/Block'],
    status: 'ACTIVE',
    metrics: { cpu: 7, memory: 32, latency: 15 },
    tasks: [{ id: 't11', label: 'Pre-Deploy Verification', progress: 94, isRunning: true }]
  },
  {
    id: 'nexus',
    title: 'NEXUS',
    subtitle: 'DEPLOYMENT ENGINE',
    responsibility: 'INFRASTRUCTURE ORCHESTRATION',
    icon: Server,
    imageUrl: 'https://robohash.org/nexus?set=set1&bgset=bg1',
    color: '#06B6D4',
    description: 'Deployment and infrastructure agent. Plans deployments, generates Dockerfiles, manages server configurations, and monitors service health.',
    tools: ['Docker Builder', 'Deploy Planner', 'Server Manager', 'Health Probe'],
    workflow: ['Plan Deployment', 'Build Image', 'Push Registry', 'Deploy', 'Monitor'],
    status: 'IDLE',
    metrics: { cpu: 10, memory: 128, latency: 200 },
    tasks: []
  },
  {
    id: 'syntax-forge',
    title: 'SYNTAX FORGE',
    subtitle: 'CODE ARCHITECT',
    responsibility: 'ARCHITECTURAL INTEGRITY',
    icon: Code,
    imageUrl: 'https://robohash.org/syntax-forge?set=set1&bgset=bg1',
    color: '#F97316',
    description: 'Architect of Code. Ensures architectural integrity, code structure quality, and design pattern consistency across all generated code from Nova.',
    tools: ['AST Analyzer', 'Pattern Enforcer', 'Refactor Suggester', 'Complexity Scorer'],
    workflow: ['Receive Code', 'AST Parse', 'Check Patterns', 'Score Complexity', 'Report'],
    status: 'IDLE',
    metrics: { cpu: 9, memory: 64, latency: 100 },
    tasks: []
  },

  // â”€â”€ OUTER RING (9) â€” Specialized Services Layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'aria',
    title: 'ARIA',
    subtitle: 'MULTILINGUAL AGENT',
    responsibility: 'SOCIAL & TRANSLATION',
    icon: Languages,
    imageUrl: 'https://robohash.org/aria?set=set1&bgset=bg1',
    color: '#F97316',
    description: 'Social and multi-language agent. Manages multilingual sessions, speaker relaying, and group translation. Works with Echo for voice delivery.',
    tools: ['Translator', 'Speaker Relay', 'Group Chat Manager', 'Language Detector'],
    workflow: ['Detect Language', 'Translate', 'Relay Speaker', 'Synthesize', 'Deliver'],
    status: 'IDLE',
    metrics: { cpu: 5, memory: 48, latency: 60 },
    tasks: []
  },
  {
    id: 'bug-hunter',
    title: 'BUG HUNTER',
    subtitle: 'FAULT SEEKER',
    responsibility: 'ROOT CAUSE ANALYSIS',
    icon: Bug,
    imageUrl: 'https://robohash.org/bug-hunter?set=set1&bgset=bg1',
    color: '#F97316',
    description: 'Seeker of Faults. Locates root causes of instability, defects, and unexpected system behaviours. Coordinates with Nova and Shield for resolution.',
    tools: ['Stack Trace Analyzer', 'Regression Runner', 'Fault Localizer', 'Fix Suggester'],
    workflow: ['Receive Report', 'Trace Root', 'Isolate Fault', 'Suggest Fix', 'Verify'],
    status: 'IDLE',
    metrics: { cpu: 0, memory: 16, latency: 0 },
    tasks: []
  },
  {
    id: 'clerk',
    title: 'CLERK ARCHIVE',
    subtitle: 'REPORT KEEPER',
    responsibility: 'SCHEMA VALIDATION',
    icon: Archive,
    imageUrl: 'https://robohash.org/clerk?set=set1&bgset=bg1',
    color: '#F59E0B',
    description: 'Keeper of Reports. Validates schema, routes to correct family path, maintains global index. Primary archival interface for Scribe and Sage.',
    tools: ['Schema Validator', 'Path Router', 'Global Index', 'Family Classifier'],
    workflow: ['Receive Report', 'Validate Schema', 'Route to Family', 'Index', 'Acknowledge'],
    status: 'ACTIVE',
    metrics: { cpu: 3, memory: 24, latency: 8 },
    tasks: [{ id: 't12', label: 'Indexing Report Batch', progress: 97, isRunning: true }]
  },
  {
    id: 'janitor',
    title: 'JANITOR',
    subtitle: 'RETENTION WARDEN',
    responsibility: 'STORAGE HYGIENE',
    icon: Trash2,
    imageUrl: 'https://robohash.org/janitor?set=set1&bgset=bg1',
    color: '#EF4444',
    description: 'Retention & Load Warden. Keeps system_reports/ lean on mobile devices, enforces retention policies, purges expired data securely.',
    tools: ['Retention Engine', 'File Purger', 'Policy Enforcer', 'Storage Monitor'],
    workflow: ['Scan Reports', 'Evaluate Age', 'Apply Policy', 'Purge', 'Log Deletion'],
    status: 'SLEEP',
    metrics: { cpu: 1, memory: 8, latency: 20 },
    tasks: []
  },
  {
    id: 'leeway-standards',
    title: 'LEEWAY STD',
    subtitle: 'SDK BRIDGE',
    responsibility: 'STANDARDS GOVERNANCE',
    icon: ShieldAlert,
    imageUrl: 'https://robohash.org/leeway-standards?set=set1&bgset=bg1',
    color: '#39FF14',
    description: 'Bridges the LeeWay-Standards SDK agents into the Agent Lee governance system. Enforces the canonical LeeWay Standards across all output.',
    tools: ['Standards SDK', 'Compliance Bridge', 'Lint Engine', 'Style Enforcer'],
    workflow: ['Receive Output', 'Apply Standards', 'Lint', 'Flag Violations', 'Pass/Block'],
    status: 'ACTIVE',
    metrics: { cpu: 4, memory: 16, latency: 12 },
    tasks: [{ id: 't13', label: 'Standards Compliance Scan', progress: 100, isRunning: false }]
  },
  {
    id: 'safety',
    title: 'SAFETY',
    subtitle: 'REDACTION GUARD',
    responsibility: 'PII & INJECTION DEFENSE',
    icon: ShieldAlert,
    imageUrl: 'https://robohash.org/safety?set=set1&bgset=bg1',
    color: '#EF4444',
    description: 'Scans and redacts PII, profanity, and prompt-injection patterns from LLM output. Hard blocker in all response pipelines.',
    tools: ['PII Detector', 'Injection Scanner', 'Profanity Filter', 'Redaction Engine'],
    workflow: ['Receive Output', 'Scan PII', 'Scan Injections', 'Redact', 'Pass/Block'],
    status: 'ACTIVE',
    metrics: { cpu: 11, memory: 32, latency: 18 },
    tasks: [{ id: 't14', label: 'Output Redaction Pass', progress: 100, isRunning: false }]
  },
  {
    id: 'stt',
    title: 'STREAMING STT',
    subtitle: 'SPEECH-TO-TEXT',
    responsibility: 'REAL-TIME TRANSCRIPTION',
    icon: Mic,
    imageUrl: 'https://robohash.org/stt?set=set1&bgset=bg1',
    color: '#A78BFA',
    description: 'Provides STT status and direct partial-transcript subscriptions from the EventBus. Feeds Echo and LiveConductor with real-time transcription.',
    tools: ['WebSocket STT', 'EventBus Subscriber', 'Partial Transcript', 'VAD Bridge'],
    workflow: ['Audio Receive', 'VAD Gate', 'Transcribe', 'Emit Partial', 'Finalise'],
    status: 'ACTIVE',
    metrics: { cpu: 18, memory: 48, latency: 22 },
    tasks: [{ id: 't15', label: 'Live Transcription Session', progress: 60, isRunning: true }]
  },
  {
    id: 'tts',
    title: 'STREAMING TTS',
    subtitle: 'TEXT-TO-SPEECH',
    responsibility: 'VOICE SYNTHESIS',
    icon: Volume2,
    imageUrl: 'https://robohash.org/tts?set=set1&bgset=bg1',
    color: '#F472B6',
    description: 'Exposes TTS state and subscriptions over the EventBus for UI / other agents. Streams synthesised voice audio to Echo output layer.',
    tools: ['TTS Engine', 'EventBus Publisher', 'Audio Streamer', 'Voice Selector'],
    workflow: ['Receive Text', 'Select Voice', 'Synthesise', 'Stream Audio', 'Confirm Done'],
    status: 'ACTIVE',
    metrics: { cpu: 14, memory: 32, latency: 35 },
    tasks: [{ id: 't16', label: 'Voice Synthesis Stream', progress: 72, isRunning: true }]
  },
  {
    id: 'conductor',
    title: 'CONDUCTOR',
    subtitle: 'LIVE PIPELINE',
    responsibility: 'REALTIME ORCHESTRATION',
    icon: Radio,
    imageUrl: 'https://robohash.org/conductor?set=set1&bgset=bg1',
    color: '#06B6D4',
    description: 'Orchestrates the end-to-end realtime voice pipeline for each WebSocket session. Coordinates STTâ†’Echoâ†’TTSâ†’Output in sub-100ms loops.',
    tools: ['Pipeline Manager', 'WebSocket Hub', 'Latency Monitor', 'Session Manager'],
    workflow: ['Open Session', 'Route STT', 'Invoke Echo', 'Route TTS', 'Close Session'],
    status: 'ACTIVE',
    metrics: { cpu: 20, memory: 64, latency: 40 },
    tasks: [{ id: 't17', label: 'Live Session #8 Active', progress: 50, isRunning: true }]
  },
  {
    id: 'router',
    title: 'ROUTER AGENT',
    subtitle: 'ROUTING INTELLIGENCE',
    responsibility: 'LLM LANE SELECTION',
    icon: GitBranch,
    imageUrl: 'https://robohash.org/router?set=set1&bgset=bg1',
    color: '#F59E0B',
    description: 'Classifies each user turn and decides local LLM vs LeeWay Live routing. Applies model_lane_policy to balance latency and privacy.',
    tools: ['Intent Classifier', 'Lane Policy', 'Model Selector', 'Cost Estimator'],
    workflow: ['Classify Intent', 'Apply Policy', 'Select Model', 'Route Request', 'Monitor Cost'],
    status: 'ACTIVE',
    metrics: { cpu: 8, memory: 24, latency: 12 },
    tasks: [{ id: 't18', label: 'Routing Turn #1,247', progress: 100, isRunning: false }]
  }
];

const AGENTS = (() => {
  const inner = AGENTS_RAW.slice(0, 8);
  const middle = AGENTS_RAW.slice(8, 17);
  const outer = AGENTS_RAW.slice(17);

  const ring = (agents: any[], radius: number, speed: number, offset: number) => 
    agents.map((a, i) => {
      const angle = (i / agents.length) * Math.PI * 2 + offset;
      return {
        ...a,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.4,
          Math.sin(angle) * radius
        ] as [number, number, number]
      };
    });

  return [
    ...ring(inner, 6, 0.6, 0),
    ...ring(middle, 9.5, 1.0, Math.PI / 9),
    ...ring(outer, 13, 1.4, Math.PI / 18),
  ];
})();

// --- 3D Components ---

function VoxelPart({ w, h, d, position, rotation = [0, 0, 0], material, edgeMaterial }: any) {
  const geometry = useMemo(() => new THREE.BoxGeometry(w, h, d, 1, 1, 1), [w, h, d]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  return (
    <mesh position={position} rotation={rotation} geometry={geometry} material={material}>
      <lineSegments geometry={edges} material={edgeMaterial} />
    </mesh>
  );
}

function Brain({ onBaseClick, isMobile = false }: { onBaseClick?: () => void; isMobile?: boolean }) {
  const characterGroupRef = useRef<THREE.Group>(null);
  const ringsGroupRef = useRef<THREE.Group>(null);
  const baseGroupRef = useRef<THREE.Group>(null);
  const stream1Ref = useRef<THREE.Points>(null);
  const stream2Ref = useRef<THREE.Points>(null);
  const STREAM_COUNT = 20;
  const stream1Positions = useMemo(() => new Float32Array(STREAM_COUNT * 3), []);
  const stream2Positions = useMemo(() => new Float32Array(STREAM_COUNT * 3), []);

  const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x1a3a8f, emissive: 0x0066cc, emissiveIntensity: 0.4, roughness: 0.2, metalness: 0.7
  }), []);
  const coreMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x88ddff, emissive: 0x00aacc, emissiveIntensity: 0.5
  }), []);
  const basePlatMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x001122, wireframe: true, emissive: 0x0088ff, emissiveIntensity: 0.08
  }), []);
  const edgeMaterial = useMemo(() => new THREE.LineBasicMaterial({ 
    color: 0x00f2ff, transparent: true, opacity: 0.6 
  }), []);

  const ringObjects = useMemo(() => [
    { radius: 15, rx: Math.PI/2, ry: 0, speed: 0.015, color: 0x00f2ff },
    { radius: 17, rx: 0, ry: Math.PI/2, speed: -0.015, color: 0xa855f7 },
    { radius: 19, rx: Math.PI/4, ry: Math.PI/4, speed: 0.02, color: 0x10b981 },
    { radius: 21, rx: -Math.PI/4, ry: Math.PI/4, speed: -0.02, color: 0xf59e0b }
  ], []);

  const ringRefs = useRef<THREE.Mesh[]>([]);
  const _streamStart = useMemo(() => new THREE.Vector3(), []);
  const _streamEnd = useMemo(() => new THREE.Vector3(), []);
  const _streamP = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (characterGroupRef.current) {
      characterGroupRef.current.position.y = Math.sin(t * 1.5) * 0.5;
    }

    ringRefs.current.forEach((ring, i) => {
      if (ring) ring.rotation.z += ringObjects[i].speed;
    });

    if (ringsGroupRef.current) {
      ringsGroupRef.current.rotation.y += 0.005;
      ringsGroupRef.current.rotation.x += 0.002;
    }

    if (baseGroupRef.current) {
      baseGroupRef.current.rotation.y += 0.01;
    }

    if (stream1Ref.current && stream2Ref.current && characterGroupRef.current && baseGroupRef.current) {
      _streamStart.copy(characterGroupRef.current.position);
      _streamEnd.copy(characterGroupRef.current.position).add(baseGroupRef.current.position);
      [stream1Ref, stream2Ref].forEach((ref, si) => {
        const offset = si * 0.5;
        const posAttr = ref.current!.geometry.attributes.position;
        for (let k = 0; k < STREAM_COUNT; k++) {
          const frac = ((t * 0.6 + offset + k / STREAM_COUNT) % 1);
          _streamP.lerpVectors(_streamStart, _streamEnd, frac);
          posAttr.setXYZ(k, _streamP.x, _streamP.y, _streamP.z);
        }
        posAttr.needsUpdate = true;
      });
    }
  });

  return (
    <group scale={1} position={[0, 0, 0]}>
      <group ref={characterGroupRef}>
        <VoxelPart w={6} h={7} d={4} position={[0, 0, 0]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
        <VoxelPart w={2} h={2} d={2} position={[0, 1, 1.5]} material={coreMaterial} edgeMaterial={edgeMaterial} />
        <VoxelPart w={2} h={1} d={2} position={[0, 4, 0]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
        <VoxelPart w={5} h={5} d={5} position={[0, 7, 0]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
        <VoxelPart w={1} h={1} d={1} position={[-1, 7.5, 2.5]} material={coreMaterial} edgeMaterial={edgeMaterial} />
        <VoxelPart w={1} h={1} d={1} position={[1, 7.5, 2.5]} material={coreMaterial} edgeMaterial={edgeMaterial} />

        <group position={[-4, 2, 0]}>
          <VoxelPart w={2} h={5} d={2} position={[0, -1.5, 0]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={2} h={5} d={2} position={[-1, -5.5, 1.5]} rotation={[1.5, 0, -0.4]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
        </group>
        <group position={[4, 2, 0]}>
          <VoxelPart w={2} h={5} d={2} position={[0, -1.5, 0]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={2} h={5} d={2} position={[1, -5.5, 1.5]} rotation={[1.5, 0, 0.4]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
        </group>

        <group position={[0, -4.5, 1]}>
          <VoxelPart w={8} h={2} d={4} position={[0, 0, 0]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={4} h={2} d={4} position={[-4, -1, 2]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={4} h={2} d={4} position={[4, -1, 2]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={6} h={2} d={3} position={[-2, -2, 4]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={6} h={2} d={3} position={[2, -2, 4]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
          <VoxelPart w={4} h={2} d={4} position={[0, -3, 5]} material={bodyMaterial} edgeMaterial={edgeMaterial} />
        </group>

        <group ref={ringsGroupRef} position={[0, 1, 0]}>
          {ringObjects.map((config, i) => (
            <group key={i} rotation={[config.rx, config.ry, 0]}>
              <mesh ref={(el) => { if (el) ringRefs.current[i] = el; }}>
                <torusGeometry args={[config.radius, 0.06, 8, isMobile ? 48 : 120]} />
                <meshBasicMaterial color={config.color} transparent opacity={0.2} side={THREE.DoubleSide} wireframe blending={THREE.AdditiveBlending} />
              </mesh>
            </group>
          ))}
        </group>

        <group 
          ref={baseGroupRef} 
          position={[0, -14, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onBaseClick?.();
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
          <VoxelPart w={4} h={4} d={4} position={[0, 0, 0]} material={basePlatMat} edgeMaterial={edgeMaterial} />
          <VoxelPart w={1.5} h={1.5} d={1.5} position={[0, 0, 0]} material={coreMaterial} edgeMaterial={edgeMaterial} />
        </group>
      </group>

      <points ref={stream1Ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stream1Positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.6} color={0x00f2ff} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
      <points ref={stream2Ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stream2Positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.4} color={0xa855f7} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>
    </group>
  );
}

function AgentNode({ agent, onClick, isSelected, isMerged, hideLabel }: any) {
  const { position, title, subtitle, icon: Icon, color, id } = agent;
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      const targetPos = isMerged ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(...position);
      groupRef.current.position.lerp(targetPos, 0.1);
      
      const targetScale = isMerged ? 0 : 1;
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      if (meshRef.current) {
        meshRef.current.rotation.x += delta * 0.5;
        meshRef.current.rotation.y += delta * 0.3;
      }
    }
  });

  const renderGeometry = () => {
    switch (id) {
      case 'lee-prime':     return <sphereGeometry args={[0.38, 32, 32]} />;
      case 'nova':          return <boxGeometry args={[0.46, 0.46, 0.46]} />;
      case 'atlas':         return <icosahedronGeometry args={[0.4, 0]} />;
      case 'sage':          return <torusGeometry args={[0.28, 0.1, 16, 32]} />;
      case 'pixel':         return <octahedronGeometry args={[0.4, 0]} />;
      case 'echo':          return <dodecahedronGeometry args={[0.34, 0]} />;
      case 'aegis':         return <tetrahedronGeometry args={[0.44, 0]} />;
      case 'scribe':        return <cylinderGeometry args={[0.22, 0.22, 0.5, 32]} />;
      case 'shield':        return <boxGeometry args={[0.36, 0.44, 0.12]} />;
      case 'adam':          return <icosahedronGeometry args={[0.36, 1]} />;
      case 'brain-sentinel':return <sphereGeometry args={[0.34, 16, 16]} />;
      case 'gabriel':       return <tetrahedronGeometry args={[0.4, 0]} />;
      case 'librarian':     return <boxGeometry args={[0.44, 0.32, 0.12]} />;
      case 'lily':          return <dodecahedronGeometry args={[0.32, 0]} />;
      case 'marshal':       return <octahedronGeometry args={[0.38, 0]} />;
      case 'nexus':         return <cylinderGeometry args={[0.18, 0.28, 0.5, 6]} />;
      case 'syntax-forge':  return <boxGeometry args={[0.38, 0.38, 0.38]} />;
      case 'aria':          return <torusGeometry args={[0.24, 0.1, 8, 24]} />;
      case 'bug-hunter':    return <icosahedronGeometry args={[0.3, 0]} />;
      case 'clerk':         return <cylinderGeometry args={[0.2, 0.2, 0.4, 32]} />;
      case 'janitor':       return <boxGeometry args={[0.3, 0.42, 0.3]} />;
      case 'leeway-standards':return <tetrahedronGeometry args={[0.36, 0]} />;
      case 'safety':        return <octahedronGeometry args={[0.34, 0]} />;
      case 'stt':           return <sphereGeometry args={[0.3, 12, 12]} />;
      case 'tts':           return <torusGeometry args={[0.22, 0.1, 8, 20]} />;
      case 'conductor':     return <cylinderGeometry args={[0.22, 0.22, 0.44, 6]} />;
      case 'router':        return <icosahedronGeometry args={[0.34, 0]} />;
      default:              return <sphereGeometry args={[0.28, 32, 32]} />;
    }
  };
  
  return (
    <group ref={groupRef} position={position}>
      <mesh 
        ref={meshRef}
        onClick={() => !isMerged && onClick(agent)}
        onPointerOver={() => !isMerged && (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {renderGeometry()}
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={isSelected ? 0.9 : 0.25} 
          transparent
          opacity={isMerged ? 0 : 1}
          wireframe={id === 'nova' || id === 'atlas'}
        />
      </mesh>
      
      {!isMerged && !hideLabel && (
        <Html distanceFactor={14} center>
          <div 
            onClick={() => onClick(agent)}
            className="flex flex-col items-center cursor-pointer pointer-events-auto select-none"
          >
            <div 
              className={cn(
                "px-3 py-2 rounded-xl border backdrop-blur-md flex flex-col items-center min-w-[90px] max-w-[120px] transition-all duration-300",
                isSelected ? "scale-110" : "hover:scale-105"
              )}
              style={{ 
                backgroundColor: 'rgba(2,4,8,0.85)',
                borderColor: isSelected ? '#fff' : color, 
                boxShadow: isSelected 
                  ? `0 0 24px ${color}` 
                  : `0 0 10px ${color}55`,
              }}
            >
              <div className="p-1.5 rounded-full mb-1" style={{ backgroundColor: `${color}20` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <h3 
                className="font-black text-[9px] tracking-widest uppercase text-center leading-tight whitespace-nowrap"
                style={{ color: '#ffffff' }}
              >
                {title}
              </h3>
              <p 
                className="text-[7px] font-bold text-center leading-tight mt-0.5 whitespace-nowrap"
                style={{ color: `${color}cc` }}
              >
                {subtitle}
              </p>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Connection({ start, end, color, isMerged }: any) {
  const lineRef = useRef<any>(null);

  useFrame((state) => {
    if (lineRef.current) {
      const baseOpacity = isMerged ? 0 : 0.4;
      lineRef.current.material.opacity = THREE.MathUtils.lerp(
        lineRef.current.material.opacity,
        baseOpacity + (isMerged ? 0 : Math.sin(state.clock.elapsedTime * 3) * 0.2),
        0.1
      );
    }
  });

  return (
    <DreiLine
      ref={lineRef}
      points={[start, end]}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.5}
    />
  );
}

function ParticleStream({ start, end, color, isMerged }: any) {
  const particlesCount = 20;
  const positions = useMemo(() => new Float32Array(particlesCount * 3), []);
  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVec = useMemo(() => new THREE.Vector3(...end), [end]);
  
  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (pointsRef.current) {
      const time = state.clock.elapsedTime;
      const posAttr = pointsRef.current.geometry.attributes.position;
      const material = pointsRef.current.material as THREE.PointsMaterial;
      
      material.opacity = THREE.MathUtils.lerp(material.opacity, isMerged ? 0 : 0.8, 0.1);
      
      for (let i = 0; i < particlesCount; i++) {
        const t = (time * 0.5 + i / particlesCount) % 1;
        const currentPos = new THREE.Vector3().lerpVectors(startVec, endVec, t);
        posAttr.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// --- Driver's License Style Agent Card ---
function AgentLeeDiagnostics({ agent: initialAgent, onClose }: any) {
  const [agent, setAgent] = useState<AgentData | null>(initialAgent);
  const [showDiag, setShowDiag] = useState(true);
  const [showOps, setShowOps] = useState(false);

  useEffect(() => {
    setAgent(initialAgent);
  }, [initialAgent]);

  if (!agent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[800] bg-[#020408]/95 backdrop-blur-xl overflow-y-auto flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 40 }}
          className="relative w-full max-w-4xl bg-[#0a0b0e] border-2 rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col md:flex-row"
          style={{ borderColor: agent.color }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Driver's License Style Card */}
          <div className="flex-1 p-8 relative overflow-hidden">
            {/* Holographic Background Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ 
                background: `linear-gradient(135deg, ${agent.color} 0%, transparent 50%, ${agent.color} 100%)`,
                backgroundSize: '200% 200%',
                animation: 'hologram 10s linear infinite'
              }} 
            />
            
            {/* Card Header */}
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div>
                <h1 className="text-white font-black text-2xl tracking-tighter uppercase leading-none">AGENT IDENTIFICATION</h1>
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.3em] mt-1">LEEWAY INNOVATIONS / AGENT LEE OS</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-[8px] font-mono text-white/30 uppercase">Class</p>
                  <p className="text-xs font-black text-white uppercase" style={{ color: agent.color }}>{agent.id.split('-')[0]} CORE</p>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <agent.icon size={20} style={{ color: agent.color }} />
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
              {/* Photo Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-48 h-56 rounded-2xl border-2 overflow-hidden bg-black relative shadow-2xl" style={{ borderColor: `${agent.color}40` }}>
                  <img 
                    src={agent.imageUrl} 
                    alt={agent.title} 
                    className="w-full h-full object-contain p-4"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  {/* Holographic Overlay */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
                </div>
                <div className="w-full h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Signature: </span>
                  <span className="text-lg font-serif italic text-white/80 ml-2" style={{ fontFamily: 'cursive' }}>{agent.title}</span>
                </div>
              </div>

              {/* Info Section */}
              <div className="flex-1 grid grid-cols-2 gap-y-6 gap-x-8">
                <InfoItem label="Name" value={agent.title} color={agent.color} />
                <InfoItem label="ID Number" value={`AL-${agent.id.toUpperCase()}-2026`} color={agent.color} />
                <InfoItem label="Designation" value={agent.subtitle} color={agent.color} />
                <InfoItem label="Status" value={agent.status} color={agent.color} isStatus />
                <div className="col-span-2">
                  <InfoItem label="Responsibility" value={agent.responsibility} color={agent.color} />
                </div>
                <div className="col-span-2">
                  <InfoItem label="Description" value={agent.description} color={agent.color} isSmall />
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end relative z-10">
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-white/30 uppercase">Issued</span>
                  <span className="text-[10px] font-black text-white">01-JAN-2026</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono text-white/30 uppercase">Expires</span>
                  <span className="text-[10px] font-black text-white">NEVER</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[8px] font-mono text-white/30 uppercase">Verification</p>
                  <p className="text-[10px] font-black text-white">SECURE_LINK_ACTIVE</p>
                </div>
                <QrCode size={40} className="text-white/20" />
              </div>
            </div>
          </div>

          {/* Side Panel for Controls */}
          <div className="w-full md:w-80 bg-black/40 border-l border-white/5 p-8 flex flex-col gap-6">
            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">System Controls</h3>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => { setShowDiag(true); setShowOps(false); }}
                className={cn(
                  "w-full py-4 rounded-2xl border flex items-center justify-center gap-3 transition-all",
                  showDiag ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/40 hover:border-white/10"
                )}
              >
                <Activity size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Diagnostics</span>
              </button>
              <button 
                onClick={() => { setShowOps(true); setShowDiag(false); }}
                className={cn(
                  "w-full py-4 rounded-2xl border flex items-center justify-center gap-3 transition-all",
                  showOps ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-white/40 hover:border-white/10"
                )}
              >
                <Settings2 size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Operations</span>
              </button>
            </div>

            <div className="mt-auto">
              <button 
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
              >
                Close Terminal
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InfoItem({ label, value, color, isStatus, isSmall }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
      <span className={cn(
        "font-black uppercase tracking-tight",
        isSmall ? "text-xs text-white/60 normal-case" : "text-lg text-white",
        isStatus && (value === 'ACTIVE' ? 'text-green-400' : value === 'SLEEP' ? 'text-blue-400' : 'text-gray-400')
      )}>
        {value}
      </span>
    </div>
  );
}

// --- Main App ---
export default function App() {
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [isMerged, setIsMerged] = useState(false);
  const [isSystemReportOpen, setIsSystemReportOpen] = useState(false);
  const isMobile = useIsMobile();
  const webglSupported = useWebGLSupport();

  return (
    <div className="w-full bg-[#020408] overflow-hidden relative font-sans" style={{ height: '100dvh' }}>
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 pointer-events-none flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h1 className="text-[#00f2ff] text-xs font-black tracking-[0.4em] uppercase">DIAGNOSTIC CENTER</h1>
          <p className="text-white/20 text-[9px] font-mono uppercase tracking-widest">Agent Lee Cognitive Network v4.2</p>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          <button
            onClick={() => setIsMerged(!isMerged)}
            className={cn(
              "px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border",
              isMerged ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-black/40 border-white/10 text-white/40 hover:border-white/30"
            )}
          >
            {isMerged ? 'Expand Network' : 'Collapse to Core'}
          </button>
        </div>
      </div>

      {!webglSupported ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020408] z-10 p-8 text-center">
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl max-w-md">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-white font-black text-xl uppercase tracking-tighter mb-2">Hardware Acceleration Disabled</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              WebGL context could not be initialized. This usually happens when hardware acceleration is disabled in your browser settings or if your graphics drivers are out of date.
            </p>
            <div className="flex flex-col gap-3">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-left">
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-2">Troubleshooting Steps:</p>
                <ul className="text-[10px] font-mono text-white/60 space-y-1 list-disc pl-4">
                  <li>Enable "Hardware Acceleration" in browser settings</li>
                  <li>Check chrome://gpu for detailed status</li>
                  <li>Ensure your graphics drivers are updated</li>
                  <li>Try a different browser (Chrome/Edge recommended)</li>
                </ul>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Canvas
        shadows={!isMobile}
        dpr={isMobile ? [0.5, 1] : [1, 2]}
        gl={{ 
          antialias: !isMobile,
          preserveDrawingBuffer: true,
          alpha: true,
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color('#020408'));
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 3, 22]} fov={isMobile ? 65 : 55} />
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          minDistance={5} 
          maxDistance={40}
          autoRotate={!selectedAgent && !isMerged}
          autoRotateSpeed={0.5}
        />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00f2ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
        <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={2} castShadow />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />

        <Suspense fallback={null}>
          <group scale={isMobile ? 0.15 : 0.25} visible={!selectedAgent && !isSystemReportOpen}>
            <Brain onBaseClick={() => setIsSystemReportOpen(true)} isMobile={isMobile} />
            
            {AGENTS.map((agent) => (
              <group key={agent.id}>
                <AgentNode 
                  agent={agent}
                  onClick={setSelectedAgent}
                  isSelected={selectedAgent?.id === agent.id}
                  isMerged={isMerged}
                  hideLabel={!!selectedAgent}
                />
                <Connection 
                  start={[0, 0, 0]} 
                  end={agent.position} 
                  color={agent.color} 
                  isMerged={isMerged}
                />
                <ParticleStream 
                  start={[0, 0, 0]} 
                  end={agent.position} 
                  color={agent.color} 
                  isMerged={isMerged}
                />
              </group>
            ))}
          </group>

          <EffectComposer>
            <Bloom luminanceThreshold={0.9} mipmapBlur intensity={0.5} radius={0.4} />
          </EffectComposer>
        </Suspense>
      </Canvas>
      )}

      <AgentLeeDiagnostics 
        agent={selectedAgent} 
        onClose={() => setSelectedAgent(null)} 
      />

      {/* CSS for Hologram Animation */}
      <style>{`
        @keyframes hologram {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
      `}</style>
    </div>
  );
}

