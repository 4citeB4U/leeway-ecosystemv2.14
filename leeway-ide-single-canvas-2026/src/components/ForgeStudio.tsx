/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.COMPONENT.PLACEHOLDER
 * DESCRIPTION: Leeway IDE component
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Component
 * WHY = Provide functionality
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = React component
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { 
  Boxes, Phone, Calendar, Zap, Terminal, Settings, 
  Database, Shield, Play, Download, Rocket, Cpu, 
  X, Smartphone, Globe, Plus, Link as LinkIcon, FileCode,
  Activity, Trash2, LogOut, Search, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  LayoutDashboard, Share2, Wrench, Volume2, FileText, Facebook, Instagram, Youtube, Linkedin, Twitter, MessageSquare, Video, Ghost, Check, Wallet, PenTool
} from 'lucide-react';
// Locally defined workflow types. These mirror definitions normally
// provided by '../types' but are defined here to make the ForgeStudio
// self contained and avoid external dependencies on the main type file.
type NodeStatus = 'idle' | 'processing' | 'complete';
type NodeCategory =
  | 'agent_lee'
  | 'content'
  | 'platform'
  | 'Social'
  | 'Messaging'
  | 'Finance'
  | 'Creative'
  | (string & {});
interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
}
interface WorkflowNode {
  id: string;
  category: NodeCategory;
  type: string;
  resource: string;
  operation: string;
  label: string;
  position: { x: number; y: number };
  config: any;
  status: NodeStatus;
  programming: boolean;
  metadata: any;
}
interface UISettings {
  accentColor: string;
}

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

// --- Node Component for better Control ---

const NodeComponent: React.FC<{
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
  onDrag: (info: any) => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
  onPortClick: (type: 'in' | 'out') => void;
  isConnecting: boolean;
  connectingType?: 'in' | 'out';
  nodeRef: (el: HTMLDivElement | null) => void;
  settings: UISettings;
}> = ({ node, selected, onSelect, onDrag, onDelete, onToggleCollapse, onPortClick, isConnecting, connectingType, nodeRef, settings }) => {
  const controls = useDragControls();

  return (
    <motion.div
      ref={nodeRef}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      onDrag={(e, info) => onDrag(info)}
      onPointerDown={onSelect}
      className={cn(
        "absolute w-64 bg-[#050506]/95 border rounded-2xl p-6 transition-all pointer-events-auto backdrop-blur-xl flex flex-col gap-3 group z-10",
        selected ? "border-brand-primary shadow-[0_0_40px_rgba(59,130,246,0.3)] z-20" : "border-white/10 hover:border-white/20",
        node.status === 'processing' && "border-brand-primary animate-pulse"
      )}
      style={{ left: node.position.x, top: node.position.y, borderColor: selected ? settings.accentColor : undefined }}
    >
      {/* Ports */}
      <div 
        onPointerDown={(e) => { e.stopPropagation(); onPortClick('in'); }}
        className={cn(
          "absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-slate-950 z-[70] transition-all cursor-crosshair flex items-center justify-center group/port",
          isConnecting && connectingType === 'in' ? "bg-white scale-125 shadow-[0_0_15px_white]" : "bg-slate-800 hover:bg-white hover:scale-110"
        )}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-slate-950/20 group-hover/port:bg-slate-950/40" />
      </div>
      
      <div 
        onPointerDown={(e) => { e.stopPropagation(); onPortClick('out'); }}
        className={cn(
          "absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-slate-950 z-[70] transition-all cursor-crosshair flex items-center justify-center group/port",
          isConnecting && connectingType === 'out' ? "bg-white scale-125 shadow-[0_0_15px_white]" : "bg-slate-800 hover:bg-white hover:scale-110"
        )}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-slate-950/20 group-hover/port:bg-slate-950/40" />
      </div>

      <div 
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center justify-between border-b border-white/5 pb-3 cursor-grab active:cursor-grabbing select-none"
      >
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 text-slate-400 group-hover:text-white transition-colors">
               <LayoutDashboard size={16} />
            </div>
            <div>
               <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">{node.label}</h3>
               <p className="text-[7px] font-black text-brand-primary uppercase opacity-60" style={{ color: settings.accentColor }}>{node.category}</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button 
              onPointerDown={(e) => { e.stopPropagation(); onToggleCollapse(); }} 
              className="p-1 px-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-colors pointer-events-auto"
            >
              {node.programming ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button 
              onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-slate-500 transition-colors pointer-events-auto"
            >
               <Trash2 size={12} />
            </button>
         </div>
      </div>

      <AnimatePresence>
         {node.programming && (
           <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4 pt-2"
           >
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Logic Behavior</label>
                 <div className="grid grid-cols-2 gap-1.5">
                    <button className="p-3 bg-white/5 border-2 border-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-all uppercase italic">Adaptive</button>
                    <button className="p-3 bg-white/5 border-2 border-white/20 rounded-xl text-[10px] font-black text-white hover:bg-white/10 transition-all uppercase italic">Strict</button>
                 </div>
              </div>
           </motion.div>
         )}
      </AnimatePresence>

      <div className="flex justify-between items-center mt-2 pointer-events-none">
         <div className="flex gap-2 items-center">
            <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'processing' ? 'bg-brand-primary animate-pulse' : 'bg-slate-700'}`} style={{ backgroundColor: node.status === 'processing' ? settings.accentColor : undefined }} />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">{node.status} engine ready</span>
         </div>
         <Activity size={10} className="text-slate-700" />
      </div>
    </motion.div>
  );
};

const MetallicBackground: React.FC<{ camera: { x: number; y: number; zoom: number } }> = ({ camera }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number;
    const spacing = 45;
    let animationFrame: number;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const animate = (time: number) => {
      ctx.fillStyle = '#050506'; 
      ctx.fillRect(0, 0, width, height);

      const t = time * 0.001;
      const zoom = camera.zoom;
      
      const scaledSpacing = spacing * zoom;
      
      const startIx = Math.floor((-camera.x - scaledSpacing * 2) / scaledSpacing);
      const endIx = Math.ceil((width - camera.x + scaledSpacing * 2) / scaledSpacing);
      
      const startIy = Math.floor((-camera.y - scaledSpacing * 2) / scaledSpacing);
      const endIy = Math.ceil((height - camera.y + scaledSpacing * 2) / scaledSpacing);

      for (let ix = startIx; ix <= endIx; ix++) {
        for (let iy = startIy; iy <= endIy; iy++) {
          const worldX = ix * spacing;
          const worldY = iy * spacing;
          
          const screenX = worldX * zoom + camera.x;
          const screenY = worldY * zoom + camera.y;

          const wave1 = Math.sin(t + worldX * 0.005) * 15;
          const wave2 = Math.cos(t * 0.8 + worldY * 0.005) * 15;
          const z = wave1 + wave2;

          const brightness = Math.floor(Math.max(0, z + 15) * 4);
          const color = `rgb(${brightness}, ${brightness + 5}, ${brightness + 12})`; 

          ctx.fillStyle = color;
          ctx.beginPath();
          const r = (z + 20) * 0.08 * zoom;
          ctx.arc(screenX, screenY, Math.max(0.5, r), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrame = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, [camera.x, camera.y, camera.zoom]);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.01] to-transparent z-10" />
    </div>
  );
};

// --- Forge Studio Component ---

interface ForgeStudioProps {
  onClose?: () => void;
  isOpen: boolean;
  settings: UISettings;
}

export function ForgeStudio({ onClose, isOpen, settings }: ForgeStudioProps) {
  const [activeProject, setActiveProject] = useState<'automation' | 'ecosystem' | 'leeway'>('automation');
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 0.8 });
  const [isCompiling, setIsCompiling] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{ id: string; type: 'in' | 'out' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showCode, setShowCode] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePaletteTab, setActivePaletteTab] = useState<NodeCategory>('agent_lee');
  
  // Panel Toggles
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState<boolean>(false);
  const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsLeftPanelOpen(false);
        setIsRightPanelOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Basic node height tracking
    const updateHeights = () => {
      const newHeights: Record<string, number> = {};
      Object.entries(nodeRefs.current).forEach(([id, el]) => {
        if (el) newHeights[id] = (el as HTMLDivElement).offsetHeight;
      });
      setNodeHeights(prev => {
        const hasChanged = Object.keys(newHeights).some(id => newHeights[id] !== prev[id]);
        return hasChanged ? { ...prev, ...newHeights } : prev;
      });
    };

    const interval = setInterval(updateHeights, 1000);
    return () => clearInterval(interval);
  }, [nodes]);

  useEffect(() => {
    const handlePush = (e: any) => {
      const incoming = e.detail;
      const newNode: WorkflowNode = {
        id: `forged_${incoming.id}_${Date.now()}`,
        category: (incoming.category as NodeCategory) || 'automation',
        type: incoming.type,
        resource: incoming.resource || '',
        operation: incoming.operation || '',
        label: incoming.title || incoming.label || 'Bridged Node',
        position: { x: (-camera.x + 400) / camera.zoom, y: (-camera.y + 400) / camera.zoom },
        config: incoming.config || {},
        status: 'idle',
        programming: false,
        metadata: { source: 'foundry', transferType: 'single' }
      };
      setNodes(prev => [...prev, newNode]);
      setNotification(`Bridged ${newNode.label} from Foundry`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (connectingFrom) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setMousePos({ 
            x: (e.clientX - rect.left - camera.x) / camera.zoom,
            y: (e.clientY - rect.top - camera.y) / camera.zoom
          });
        }
      }
    };

    window.addEventListener('push-to-forge', handlePush);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('push-to-forge', handlePush);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, connectingFrom]);

  const handleTransferToFoundry = (type: 'node' | 'sequence') => {
    if (type === 'node' && selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node) {
        window.dispatchEvent(new CustomEvent('push-to-foundry', { 
           detail: { ...node, transferType: 'single' } 
        }));
        setNotification(`Transferred ${node.label} to Foundry`);
      }
    } else {
        window.dispatchEvent(new CustomEvent('push-to-foundry', { 
           detail: { nodes, edges, transferType: 'sequence' } 
        }));
        setNotification(`Transferred Full Sequence to Foundry`);
    }
    setShowTransferDialog(false);
  };

  const handlePortClick = (nodeId: string, type: 'in' | 'out') => {
    if (!connectingFrom) {
      setConnectingFrom({ id: nodeId, type });
    } else {
      if (connectingFrom.id !== nodeId && connectingFrom.type !== type) {
        const sourceId = connectingFrom.type === 'out' ? connectingFrom.id : nodeId;
        const targetId = connectingFrom.type === 'in' ? connectingFrom.id : nodeId;
        
        if (!edges.find(e => e.from === sourceId && e.to === targetId)) {
          setEdges([...edges, { id: `e-${Date.now()}`, from: sourceId, to: targetId }]);
        }
      }
      setConnectingFrom(null);
    }
  };

  const TOOLS: Record<NodeCategory, { label: string; icon: any; items: any[] }> = {
    agent_lee: {
      label: 'Content Connect',
      icon: Ghost,
      items: [
        { type: 'reasoner', label: 'Leeway Reasoner', desc: 'Complex causal logic chain', config: { depth: 8, creative_bias: 0.2 } },
        { type: 'intent_map', label: 'Intent Parser', desc: 'Identify user hidden goals', config: { semantic_check: true } },
        { type: 'context_recall', label: 'Deep Memory', desc: 'Access cross-session state', config: { lookback: '30d' } },
        { type: 'persona_sync', label: 'Persona Rig', desc: 'Sync tone to brand voice', config: { tone: 'professional' } },
        { type: 'creative_spark', label: 'Innovation Seed', desc: 'Generate unique content hooks', config: { variance: 0.8 } }
      ]
    },
    content: {
      label: 'Creative Foundry',
      icon: FileText,
      items: [
        { type: 'video_render', label: 'Final Render', desc: 'Master video export node', config: { format: 'mp4', quality: '4k' } },
        { type: 'audio_engine', label: 'Spatial Sound', desc: '3D audio positioning logic', config: { reverb: 0.3 } },
        { type: 'subtitle_ai', label: 'Smart Captions', desc: 'High-speed subtitle burn-in', config: { style: 'viral' } },
        { type: 'gfx_synth', label: 'VFX Bridge', desc: 'Apply dynamic overlays', config: { intensity: 0.5 } },
        { type: 'thumbnail_ai', label: 'CTR Forge', desc: 'Predictive thumbnail layout', config: { heat_map: true } }
      ]
    },
    platform: {
      label: 'Global Rails',
      icon: Share2,
      items: [
        { type: 'yt_automation', label: 'YouTube Pro', desc: 'Advanced Shorts & Video API', config: { schedule: 'auto', niche: 'tech' } },
        { type: 'tt_optimizer', label: 'TikTok Catalyst', desc: 'Trend-locked viral posting', config: { hashtag_lock: true, region: 'global' } },
        { type: 'ig_syndicate', label: 'Insta Grid', desc: 'Reels and Carousel logic', config: { cross_post_stories: true } },
        { type: 'li_outreach', label: 'LinkedIn B2B', desc: 'Professional thought leadership', config: { engagement_mode: 'active', network_boost: true } }
      ]
    },
    Social: { 
      label: 'Social Logic', 
      icon: Facebook, 
      items: [
        { type: 'social.facebook', label: 'Facebook Graph', desc: 'Standard Facebook API node', config: {} },
        { type: 'social.instagram', label: 'Instagram Graph', desc: 'Media & Business integration', config: {} },
        { type: 'social.twitter', label: 'X / Twitter API', desc: 'V2 Real-time API', config: {} },
        { type: 'social.reddit', label: 'Reddit API', desc: 'Subreddit automation', config: {} },
        { type: 'social.pinterest', label: 'Pinterest API', desc: 'Visual discovery engine', config: {} },
        { type: 'social.snapchat', label: 'Snapchat Kit', desc: 'Story & Lens integration', config: {} },
        { type: 'social.mastodon', label: 'Mastodon Node', desc: 'Decentralized social federator', config: {} }
      ] 
    },
    Messaging: { 
      label: 'Messaging Core', 
      icon: MessageSquare, 
      items: [
        { type: 'messaging.whatsapp', label: 'WhatsApp Business', desc: 'Customer engagement API', config: {} },
        { type: 'messaging.messenger', label: 'Messenger API', desc: 'Direct message automation', config: {} },
        { type: 'messaging.telegram', label: 'Telegram Bot API', desc: 'Bots and group logic', config: {} },
        { type: 'messaging.discord', label: 'Discord Webhook/API', desc: 'Guild & Webhook support', config: {} },
        { type: 'messaging.slack', label: 'Slack Bolt Node', desc: 'Workspace app automation', config: {} }
      ] 
    },
    Finance: { 
      label: 'Finance Engine', 
      icon: Wallet, 
      items: [
        { type: 'finance.stripe', label: 'Stripe Payments', desc: 'Checkout & Payout logic', config: {} },
        { type: 'finance.paypal', label: 'PayPal API', desc: 'Merchant & Subscription API', config: {} },
        { type: 'ledger_sync', label: 'Ledger Audit', desc: 'Track transaction history', config: { currency: 'USD' } }
      ] 
    },
    Creative: { 
      label: 'Creative Studio', 
      icon: PenTool, 
      items: [
        { type: 'creative.behance', label: 'Behance API', desc: 'Portfolio discovery node', config: {} },
        { type: 'creative.dribbble', label: 'Dribbble API', desc: 'Design shot automation', config: {} },
        { type: 'creative.artstation', label: 'ArtStation Node', desc: 'CGI & Professional showcase', config: {} },
        { type: 'creative.figma', label: 'Figma API Node', desc: 'Document & Team management', config: {} },
        { type: 'creative.canva', label: 'Canva Connect', desc: 'Graphic design API', config: {} }
      ] 
    },
    Publishing: { 
      label: 'Publishing Rail', 
      icon: Rocket, 
      items: [
        { type: 'publishing.medium', label: 'Medium Publishing', desc: 'Article distribution', config: {} },
        { type: 'publishing.substack', label: 'Substack RSS Node', desc: 'Newsletter feed bridge', config: {} },
        { type: 'publishing.wordpress', label: 'WordPress REST API', desc: 'Self-hosted CMS control', config: {} },
        { type: 'publishing.ghost', label: 'Ghost Content API', desc: 'Modern publication engine', config: {} }
      ] 
    },
    Professional: { 
      label: 'Pro Network', 
      icon: Linkedin, 
      items: [
        { type: 'pro.linkedin', label: 'LinkedIn API', desc: 'Corporate & Ad integration', config: {} },
        { type: 'job_broadcaster', label: 'Talent Scout', desc: 'Post to recruiter nodes', config: { role: 'creator' } }
      ] 
    },
    Development: { 
      label: 'Dev Ops', 
      icon: Terminal, 
      items: [
        { type: 'dev.github', label: 'GitHub Enterprise', desc: 'Repository & CI/CD control', config: {} },
        { type: 'dev.gitlab', label: 'GitLab API', desc: 'Pipeline management', config: {} },
        { type: 'dev.vercel', label: 'Vercel API Node', desc: 'Deployment & Edge control', config: {} }
      ] 
    },
    Marketing: { 
      label: 'Growth Hub', 
      icon: Zap, 
      items: [
        { type: 'marketing.hubspot', label: 'HubSpot CRM API', desc: 'Lead tracking & CRM', config: {} },
        { type: 'marketing.salesforce', label: 'Salesforce Connect', desc: 'Enterprise data bridge', config: {} },
        { type: 'marketing.mailchimp', label: 'Mailchimp Marketing', desc: 'Email automation ads', config: {} }
      ] 
    },
    Entertainment: { 
      label: 'Streaming', 
      icon: Video, 
      items: [
        { type: 'entertainment.netflix', label: 'Netflix Node', desc: 'Media data analytics', config: {} },
        { type: 'entertainment.spotify', label: 'Spotify API', desc: 'Audio & Music streaming', config: {} },
        { type: 'obs_bridge', label: 'Live Streamer', desc: 'Control OBS scene logic', config: { scene: 'main' } }
      ] 
    },
    'Creator Studio': { 
      label: 'Studio Ops', 
      icon: Youtube, 
      items: [
        { type: 'creator.youtube_studio', label: 'YouTube Studio API', desc: 'Channel analytics', config: {} },
        { type: 'creator.tiktok_business', label: 'TikTok Marketing', desc: 'Brand & Creator tools', config: {} },
        { type: 'creator.spotify_artists', label: 'Spotify for Artists', desc: 'Artist dashboard data', config: {} }
      ] 
    },
    utility: {
      label: 'Process Core',
      icon: Wrench,
      items: [
        { type: 'web_trigger', label: 'Webhook Pro', desc: 'Authenticated API inbound', config: { method: 'POST', auth: 'bearer' } },
        { type: 'data_vault', label: 'Relational DB', desc: 'Structured state management', config: { table: 'master', backup: 'daily' } },
        { type: 'logic_timer', label: 'Cron Master', desc: 'Nano-precise time triggers', config: { timezone: 'UTC', catch_up: true } },
        { type: 'logic_gate', label: 'Smart Branch', desc: 'Multi-condition switch logic', config: { cases: 2, default_path: 'A' } },
        { type: 'data_filter', label: 'Sanitizer', desc: 'Clean and format data streams', config: { remove_special: true, strip_tags: true } },
        { type: 'api_proxy', label: 'Bridge Proxy', desc: 'Rate-limited request relay', config: { retry_on_fail: true } }
      ]
    },
    automation: {
       label: 'Animation Core',
       icon: Boxes,
       items: [
          { type: 'motion_sync', label: 'Rig Sync', desc: 'Coordinate multi-object motion', config: { fps: 60, interp: 'cubic' } },
          { type: 'physics_sim', label: 'Gravity Logic', desc: 'Real-time object dynamics', config: { mass: 1.0, friction: 0.1 } },
          { type: 'particle_flow', label: 'Emitter', desc: 'Visual particle logic gates', config: { rate: 100, life: 2.5 } },
          { type: 'lottie_rig', label: 'Lottie Bridge', desc: 'Vector animation triggers', config: { sequence: 'loop', speed: 1.0 } },
          { type: 'audio_reactive', label: 'Beat Reactor', desc: 'Drive visuals with audio peaks', config: { sensitivity: 0.8, frequency: 'low' } }
       ]
    }
  };

  const handleCanvasPan = (event: any, info: any) => {
    setCamera(prev => ({
      ...prev,
      x: prev.x + info.delta.x,
      y: prev.y + info.delta.y
    }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      const zoomSpeed = 0.001;
      const nextZoom = Math.min(Math.max(camera.zoom - e.deltaY * zoomSpeed, 0.1), 3);
      setCamera(prev => ({ ...prev, zoom: nextZoom }));
    } else {
      setCamera(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleAddNode = (category: NodeCategory, type: string, label: string) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      category,
      type,
      label,
      resource: category,
      operation: type,
      position: { x: (-camera.x + 400) / camera.zoom, y: (-camera.y + 400) / camera.zoom },
      config: {},
      metadata: {},
      status: 'idle',
      programming: false
    };
    setNodes([...nodes, newNode]);
    setNotification(`${label} added to Forge`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/leeway-content');
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      if (data.transferType === 'content_drag') {
        const { item } = data;
        
        // Calculate spawn position in world coordinates
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const worldX = (e.clientX - rect.left - camera.x) / camera.zoom;
        const worldY = (e.clientY - rect.top - camera.y) / camera.zoom;

        const newNode: WorkflowNode = {
          id: `node_content_${Date.now()}`,
          category: 'content',
          type: item.type === 'video' ? 'content.vocalThread' : 'content.blogEngine',
          label: item.name,
          resource: 'content',
          operation: item.type === 'video' ? 'vocalThread' : 'blogEngine',
          position: { x: worldX, y: worldY },
          config: { ...item },
          metadata: {
            leewayId: item.leewayId,
            timestamp: new Date().toLocaleString()
          },
          status: 'idle',
          programming: false
        };

        setNodes([...nodes, newNode]);
        setNotification(`Content ${item.name} integrated to Forge`);
        setTimeout(() => setNotification(null), 2000);
      }
    } catch (err) {
      console.error("Failed to parse drop data in Forge", err);
    }
  };

  const handleNodeDrag = (id: string, info: any) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, position: { x: n.position.x + info.delta.x / camera.zoom, y: n.position.y + info.delta.y / camera.zoom } } : n));
  };

  const handleConnect = (toId: string) => {
    if (connectingFrom && connectingFrom.id !== toId) {
      if (!edges.find(e => e.from === connectingFrom.id && e.to === toId)) {
        setEdges([...edges, { id: `e-${Date.now()}`, from: connectingFrom.id, to: toId }]);
      }
    }
    setConnectingFrom(null);
  };

  const toggleNodeCollapse = (id: string) => {
     setNodes(prev => prev.map(n => n.id === id ? { ...n, programming: !n.programming } : n));
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setNotification("Forging Automation Logic...");
    
    try {
      await new Promise(r => setTimeout(r, 2000));
      setIsComplete(true);
      setNotification("Automation Forged & Active");
    } catch (error) {
      setNotification("Forge Error: Logic Collision");
    } finally {
      setIsCompiling(false);
    }
  };

  if (!isOpen) return null;

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-[#050506] flex flex-col font-sans overflow-hidden"
    >
      <MetallicBackground camera={camera} />

      {/* Top Navigation */}
      <div className="p-4 border-b border-white/10 bg-[#050506]/30 backdrop-blur-md flex justify-between items-center z-50">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)} 
              className={cn("w-3 h-3 rounded-full border border-white/10 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]", isLeftPanelOpen ? "bg-emerald-500 scale-125" : "bg-emerald-500/20")} 
              title="Toggle Library" 
            />
            <button 
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)} 
              className={cn("w-3 h-3 rounded-full border border-white/10 transition-all shadow-[0_0_10px_rgba(234,179,8,0.2)]", isRightPanelOpen ? "bg-yellow-500 scale-125" : "bg-yellow-500/20")} 
              title="Toggle Inspector" 
            />
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-white/10" />
          </div>
          
          {isMobile && (
            <div className="flex items-center gap-2 ml-2">
              <button 
                onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
                className={cn("p-2 rounded-lg transition-all", isLeftPanelOpen ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-slate-500")}
              >
                <LayoutDashboard size={16} />
              </button>
              <button 
                onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
                className={cn("p-2 rounded-lg transition-all", isRightPanelOpen ? "bg-yellow-500/20 text-yellow-400" : "bg-white/5 text-slate-500")}
              >
                <Settings size={16} />
              </button>
            </div>
          )}

          <h2 className="text-[10px] md:text-xs font-black text-white italic uppercase tracking-[0.2em] flex items-center gap-3">
             <Boxes className="text-brand-primary w-4 h-4" style={{ color: settings.accentColor }} /> 
             <span className="hidden sm:inline">Automation Studio</span>
             <span className="sm:hidden">Studio</span>
             <span className="opacity-20 hidden md:inline">|</span>
             <span className="hidden md:inline font-mono text-[9px] text-slate-500 not-italic tracking-tighter uppercase">Automation Core v.1.04</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
           {nodes.length > 0 && !isMobile && (
             <button 
              onClick={() => setShowTransferDialog(true)}
              className="px-6 py-3 bg-white/5 border-2 border-white/20 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all flex items-center gap-2"
             >
                <Share2 size={12} /> Sync to Leeway
             </button>
           )}

           {!isMobile && (
             <div className="flex bg-slate-900/50 p-1 rounded-xl border-2 border-white/10">
                <button 
                   onClick={() => setActiveProject('automation')}
                   className={cn("px-6 py-2.5 text-[9px] uppercase font-black rounded-lg transition-all border-2", activeProject === 'automation' ? "bg-white/10 text-white border-white/20" : "text-slate-500 hover:text-white border-transparent")}
                >
                  Automation
                </button>
                <button 
                   onClick={() => setActiveProject('ecosystem')}
                   className={cn("px-6 py-2.5 text-[9px] uppercase font-black rounded-lg transition-all border-2", activeProject === 'ecosystem' ? "bg-white/10 text-white border-white/20" : "text-slate-500 hover:text-white border-transparent")}
                >
                  Ecosystem
                </button>
              </div>
            )}

          <div className="h-6 w-[1px] bg-white/10" />

          <button 
            onClick={handleCompile}
            disabled={isCompiling}
            className={cn(
              "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-2xl border-2",
              isComplete ? "bg-emerald-500 text-white border-emerald-400/30" : "bg-brand-primary text-white border-white/20",
              isCompiling && "opacity-50"
            )}
            style={{ backgroundColor: isComplete ? undefined : settings.accentColor }}
          >
            {isCompiling ? <Cpu size={14} className="animate-spin" /> : isComplete ? <Check size={14} /> : <Rocket size={14} />}
            {isCompiling ? "Forging..." : isComplete ? "Forged" : "Launch Forge"}
          </button>
          
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl border-2 border-white/10 transition-all"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Library Explorer */}
        <AnimatePresence>
          {isLeftPanelOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '85vw' : 336, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "border-r border-white/10 bg-[#050506]/90 backdrop-blur-xl z-[80] flex flex-col overflow-hidden",
                isMobile ? "fixed inset-y-0 left-0" : "relative h-full"
              )}
            >
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="relative mb-6">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="SEARCH AUTOMATION TOOLS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-[10px] font-black text-white italic tracking-widest outline-none focus:border-brand-primary transition-all"
                    />
                  </div>

                  {/* Organized Library Buttons Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-8 p-3 bg-black/40 rounded-2xl border-2 border-white/10 shadow-inner">
                    {(Object.keys(TOOLS) as NodeCategory[]).map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActivePaletteTab(cat)}
                        className={cn(
                          "aspect-square rounded-xl flex items-center justify-center transition-all group relative border-2 shadow-sm",
                          activePaletteTab === cat ? "bg-white/10 text-white border-white/40 shadow-brand-primary/20" : "text-slate-600 hover:text-slate-400 hover:bg-white/5 border-white/5 hover:border-white/20"
                        )}
                        title={TOOLS[cat].label}
                      >
                        {React.createElement(TOOLS[cat].icon || LayoutDashboard, { size: 14 })}
                        {activePaletteTab === cat && (
                          <motion.div layoutId="forgeTabInd" className="absolute -bottom-1 left-2 right-2 h-[2px] bg-brand-primary" style={{ backgroundColor: settings.accentColor }} />
                        )}
                      </button>
                    ))}
                  </div>

                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 italic">
                    {TOOLS[activePaletteTab]?.label} Library
                  </h3>

                  <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {TOOLS[activePaletteTab]?.items.map(item => (
                      <button 
                        key={item.type}
                        onClick={() => handleAddNode(activePaletteTab, item.type, item.label)}
                        className="w-full p-6 bg-white/[0.02] hover:bg-white/[0.05] border-2 border-white/10 hover:border-brand-primary/40 rounded-2xl text-left transition-all group relative overflow-hidden"
                      >
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-[10px] font-black text-white uppercase italic tracking-widest transition-colors group-hover:text-brand-primary" style={{ color: activePaletteTab === 'agent_lee' ? settings.accentColor : undefined }}>{item.label}</span>
                            <Plus size={12} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter leading-tight">{item.desc}</p>
                      </button>
                    ))}
                  </div>
              </div>

              <div className="mt-auto p-6 border-t border-white/10">
                  <div className="flex items-center gap-3 p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 italic">
                    <Shield className="text-brand-primary" size={16} style={{ color: settings.accentColor }} />
                    <div>
                        <p className="text-[9px] font-black text-white uppercase tracking-widest">Logic Immunity</p>
                        <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">Zero-Trust Layer Enabled</p>
                    </div>
                  </div>
              </div>
              
              {/* Collapse Handle - Left */}
              <motion.button 
                onClick={() => setIsLeftPanelOpen(false)}
                whileHover={{ scale: 1.1, x: -4 }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-16 bg-[#050506]/95 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] z-[100] backdrop-blur-xl group"
              >
                <div className="absolute inset-y-4 right-1 w-[1px] bg-white/5 group-hover:bg-brand-primary/30 transition-colors" style={{ backgroundColor: settings.accentColor + '40' }} />
                <ChevronLeft size={20} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Inspector Toggle Overlays */}
        {!isLeftPanelOpen && (
          <motion.button 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsLeftPanelOpen(true)}
            whileHover={{ scale: 1.1, x: 2 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-[110] w-8 h-16 bg-[#050506]/95 border border-white/10 rounded-r-2xl flex items-center justify-center text-slate-400 hover:text-white shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all backdrop-blur-xl group"
          >
            <div className="absolute inset-y-4 left-1 w-[1px] bg-white/5 group-hover:bg-brand-primary/30 transition-colors" />
            <ChevronRight size={20} />
          </motion.button>
        )}

        {/* Mobile Scrim */}
        <AnimatePresence>
          {isMobile && (isLeftPanelOpen || isRightPanelOpen) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsLeftPanelOpen(false);
                setIsRightPanelOpen(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
          )}
        </AnimatePresence>

        {!isRightPanelOpen && (
          <motion.button 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsRightPanelOpen(true)}
            whileHover={{ scale: 1.1, x: -2 }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-[110] w-8 h-16 bg-[#050506]/95 border border-white/10 rounded-l-2xl flex items-center justify-center text-slate-400 hover:text-white shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all backdrop-blur-xl group"
          >
            <div className="absolute inset-y-4 right-1 w-[1px] bg-white/5 group-hover:bg-brand-primary/30 transition-colors" />
            <ChevronLeft size={20} />
          </motion.button>
        )}

        {/* Unified Canvas */}
        <div 
          ref={containerRef}
          onWheel={handleWheel}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex-1 relative overflow-hidden bg-transparent cursor-default"
        >
          {/* Transfer Dialog Overlay */}
          <AnimatePresence>
            {showTransferDialog && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
              >
                 <motion.div 
                   initial={{ scale: 0.9, y: 20 }}
                   animate={{ scale: 1, y: 0 }}
                   className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-3xl text-center"
                 >
                    <Share2 className="mx-auto mb-6 text-brand-primary" size={32} style={{ color: settings.accentColor }} />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest italic mb-2">Synchronize Logic</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-8">Choose how to bridge this automation to Content Foundry</p>
                    
                        <div className="grid grid-cols-1 gap-3">
                           <button 
                            onClick={() => handleTransferToFoundry('sequence')}
                            className="w-full py-4 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-white/20"
                            style={{ backgroundColor: settings.accentColor }}
                           >
                             Full Automation Sequence
                           </button>
                           {selectedNodeId && (
                             <button 
                              onClick={() => handleTransferToFoundry('node')}
                              className="w-full py-4 bg-white/5 border-2 border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                             >
                               Single Logic Node Only
                             </button>
                           )}
                           <button 
                            onClick={() => setShowTransferDialog(false)}
                            className="w-full py-3 text-[10px] font-black uppercase text-slate-600 hover:text-slate-400 mt-2 border-2 border-transparent hover:border-white/10 rounded-xl transition-all"
                           >
                             Cancel Transfer
                           </button>
                        </div>
                 </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification Toast */}
          <AnimatePresence>
            {notification && (
              <motion.div 
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className="absolute top-6 left-1/2 z-50 px-6 py-3 bg-[#050506]/90 backdrop-blur-xl border border-brand-primary/20 rounded-full shadow-2xl flex items-center gap-3"
              >
                 <Activity size={14} className="text-brand-primary animate-pulse" style={{ color: settings.accentColor }} />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{notification}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div onPan={handleCanvasPan} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

          <motion.div
            style={{ x: camera.x, y: camera.y, scale: camera.zoom, transformOrigin: "0 0" }}
            className="absolute inset-0 pointer-events-none"
          >
              <svg className="absolute inset-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                <defs>
                   <marker id="forgeArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill={settings.accentColor} />
                   </marker>
                </defs>
                {edges.map((edge) => {
                   const fromNode = nodes.find(n => n.id === edge.from);
                   const toNode = nodes.find(n => n.id === edge.to);
                   if (!fromNode || !toNode) return null;
                   
                   const h1 = nodeHeights[fromNode.id] || 100;
                   const h2 = nodeHeights[toNode.id] || 100;

                   const x1 = fromNode.position.x + 256;
                   const y1 = fromNode.position.y + h1 / 2;
                   const x2 = toNode.position.x;
                   const y2 = toNode.position.y + h2 / 2;
                   const cp1x = x1 + Math.abs(x2 - x1) * 0.4;
                   const cp2x = x2 - Math.abs(x2 - x1) * 0.4;
                   
                   const pathD = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
                   
                   return (
                     <g key={edge.id} className="pointer-events-auto cursor-pointer group">
                       <path 
                         d={pathD} 
                         stroke="transparent" 
                         strokeWidth="20" 
                         fill="none" 
                         onClick={() => setEdges(prev => prev.filter(e => e.id !== edge.id))} 
                       />
                       <motion.path
                         d={pathD}
                         stroke={settings.accentColor}
                         strokeWidth="2"
                         fill="none"
                         initial={{ pathLength: 0 }}
                         animate={{ pathLength: 1 }}
                         markerEnd="url(#forgeArrow)"
                         className="opacity-40"
                       />
                       <motion.circle 
                          r="3"
                          fill="white"
                          animate={{ offsetDistance: ["0%", "100%"] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          style={{ offsetPath: `path("${pathD}")` }}
                        />
                     </g>
                   );
                })}

                {connectingFrom && (
                  <path 
                    d={`M ${nodes.find(n => n.id === connectingFrom.id)!.position.x + (connectingFrom.type === 'out' ? 256 : 0)} ${nodes.find(n => n.id === connectingFrom.id)!.position.y + (nodeHeights[connectingFrom.id] || 100) / 2} C ${(nodes.find(n => n.id === connectingFrom.id)!.position.x + (connectingFrom.type === 'out' ? 256 : 0)) + (mousePos.x - (nodes.find(n => n.id === connectingFrom.id)!.position.x + (connectingFrom.type === 'out' ? 256 : 0))) * 0.5} ${nodes.find(n => n.id === connectingFrom.id)!.position.y + (nodeHeights[connectingFrom.id] || 100) / 2}, ${mousePos.x - (mousePos.x - (nodes.find(n => n.id === connectingFrom.id)!.position.x + (connectingFrom.type === 'out' ? 256 : 0))) * 0.5} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                    stroke={settings.accentColor}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="none"
                    className="opacity-60"
                  />
                )}
              </svg>

              {nodes.map(node => (
                <NodeComponent 
                  key={node.id}
                  node={node}
                  selected={selectedNodeId === node.id}
                  onSelect={() => setSelectedNodeId(node.id)}
                  onDrag={(info) => handleNodeDrag(node.id, info)}
                  onDelete={() => setNodes(prev => prev.filter(n => n.id !== node.id))}
                  onToggleCollapse={() => toggleNodeCollapse(node.id)}
                  onPortClick={(type) => handlePortClick(node.id, type)}
                  isConnecting={connectingFrom?.id === node.id}
                  connectingType={connectingFrom?.type}
                  nodeRef={(el) => nodeRefs.current[node.id] = el}
                  settings={settings}
                />
              ))}
          </motion.div>
        </div>

        {/* Global Inspector */}
        <AnimatePresence>
          {isRightPanelOpen && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: isMobile ? '85vw' : 384, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "border-l border-white/10 bg-[#050506]/90 backdrop-blur-xl z-[80] flex flex-col overflow-hidden",
                isMobile ? "fixed inset-y-0 right-0" : "relative h-full"
              )}
            >
              {/* Collapse Handle - Right */}
              <motion.button 
                onClick={() => setIsRightPanelOpen(false)}
                whileHover={{ scale: 1.1, x: 4 }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-16 bg-[#050506]/95 border border-white/10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] z-[100] backdrop-blur-xl group"
              >
                <div className="absolute inset-y-4 left-1 w-[1px] bg-white/5 group-hover:bg-brand-primary/30 transition-colors" style={{ backgroundColor: settings.accentColor + '40' }} />
                <ChevronRight size={20} />
              </motion.button>
              {selectedNode ? (
                <div className="p-6 md:p-8 flex flex-col h-full overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                          <h3 className="text-[10px] md:text-xs font-black text-white uppercase italic tracking-widest">Logic Inspector</h3>
                          <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase mt-1">Node ID: {selectedNode.id}</p>
                      </div>
                      <button onClick={() => setIsRightPanelOpen(false)} className="p-2 text-slate-500 hover:text-white bg-white/5 border-2 border-white/10 rounded-xl hover:bg-white/10 transition-all"><ChevronDown className="-rotate-90" size={16} /></button>
                    </div>

                    <div className="space-y-8 flex-1">
                       <section>
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: selectedNode.status === 'processing' ? settings.accentColor : '#10b981' }} />
                            <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Core Configuration</label>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                             {Object.entries(selectedNode.config || {}).map(([key, val]) => (
                               <div key={key} className="bg-[#050506] border border-white/5 rounded-xl p-4 group hover:border-brand-primary/30 transition-all">
                                  <label className="text-[7px] font-bold text-slate-600 uppercase block mb-1">{key.replace('_', ' ')}</label>
                                  <input 
                                    type="text" 
                                    value={String(val)} 
                                    readOnly
                                    className="bg-transparent text-[10px] font-black text-white uppercase italic w-full focus:outline-none"
                                  />
                               </div>
                             ))}
                             {Object.keys(selectedNode.config || {}).length === 0 && (
                               <div className="p-4 bg-white/5 rounded-xl border border-dashed border-white/10 text-center">
                                 <p className="text-[9px] text-slate-500 italic uppercase">Native execution parameters</p>
                               </div>
                             )}
                          </div>
                       </section>

                       <section className="space-y-4">
                          <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest block italic">Automation Sequence</label>
                          <div className="space-y-2">
                            {['Integrate Registry', 'Map Logic Gates', 'Optimize Paths', 'Finalize Foundry Bridge'].map((step, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl group hover:border-brand-primary/20 transition-all">
                                <div className="w-1 h-3 rounded-full bg-slate-800 group-hover:bg-brand-primary transition-colors" style={{ backgroundColor: i === 0 ? settings.accentColor : undefined }} />
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight group-hover:text-white transition-colors">{step}</span>
                              </div>
                            ))}
                          </div>
                       </section>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                       <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-4 text-center">Foundry Bridge Protocol</p>
                          <button 
                            onClick={() => setShowTransferDialog(true)}
                            className="w-full group relative overflow-hidden py-5 bg-brand-primary text-white rounded-2xl transition-all shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-white/20"
                            style={{ backgroundColor: settings.accentColor, boxShadow: `0 0 50px -12px ${settings.accentColor}80` }}
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                             <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-3">
                                   <Rocket size={18} className="text-white" />
                                   <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Push to Foundry</span>
                                </div>
                                <span className="text-[7px] font-bold text-white/50 uppercase tracking-widest italic">Live Content Integration</span>
                             </div>
                          </button>
                       </div>
                       <p className="text-[8px] text-slate-600 text-center font-bold uppercase tracking-widest italic opacity-50">Finalize logical core for production deployment</p>
                    </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand-primary/5 rounded-full blur-[100px]" style={{ backgroundColor: `${settings.accentColor}10` }} />
                    <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                      <Boxes size={isMobile ? 32 : 48} className="text-slate-700" />
                    </div>
                    <h3 className="relative z-10 text-[10px] md:text-[12px] font-black text-white uppercase tracking-[0.2em] italic">Forge Neutral</h3>
                    <p className="relative z-10 text-[8px] md:text-[9px] text-slate-500 font-bold mt-4 uppercase max-w-[200px] leading-relaxed">Select a logic module to inspect its core architecture and port logic to foundry</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

       {/* Floating UI Elements */}
       <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/60 backdrop-blur-2xl px-10 py-5 rounded-[2.5rem] border-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <button onClick={onClose} className="flex flex-col items-center px-5 py-2 text-slate-500 hover:text-white transition-all group border-2 border-transparent hover:border-white/10 rounded-2xl">
             <LayoutDashboard size={20} className="group-hover:scale-110 transition-transform" />
             <span className="text-[8px] font-black uppercase tracking-widest mt-1">Foundry</span>
          </button>
          <div className="w-[1px] h-8 bg-white/10" />
          <button className="flex flex-col items-center px-5 py-2 text-brand-primary transition-all group border-2 border-white/20 bg-white/5 rounded-2xl" style={{ color: settings.accentColor, borderColor: settings.accentColor + '40' }}>
             <Boxes size={24} className="group-hover:rotate-12 transition-transform" />
             <span className="text-[9px] font-black uppercase tracking-widest mt-1">Forge</span>
          </button>
          <div className="w-[1px] h-8 bg-white/10" />
          <button className="flex flex-col items-center px-5 py-2 text-slate-500 hover:text-white transition-all group border-2 border-transparent hover:border-white/10 rounded-2xl">
             <Signal size={20} className="group-hover:scale-110 transition-transform" />
             <span className="text-[8px] font-black uppercase tracking-widest mt-1">Signals</span>
          </button>
       </div>
    </motion.div>
  );
}

function Signal(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 20V4" />
    </svg>
  );
}
