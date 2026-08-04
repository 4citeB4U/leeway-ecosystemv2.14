/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SRC.APP.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = App.tsx — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/App.tsx
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  ClipboardList, 
  Share2, 
  Wrench, 
  Clock, 
  LogOut,
  ChevronRight,
  MoreVertical,
  Play,
  Volume2,
  FileText,
  Facebook,
  Instagram,
  Youtube,
  Database,
  Cpu,
  Plus,
  Trash2,
  PlayCircle,
  Save,
  Activity,
  Linkedin,
  Twitter,
  MessageSquare,
  Mail,
  Zap,
  Globe,
  Ghost,
  RefreshCw,
  X,
  Video,
  Check,
   Palette,
  Search,
  Wallet,
  Mic,
  MicOff,
  Send,
  CloudUpload,
  Sparkles,
  PenTool,
  Image as ImageIcon,
  Music,
  Film,
  Layers,
  CheckCircle,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import {
  siFacebook,
  siInstagram,
  siTiktok,
  siYoutube,
  siX,
  siPinterest,
  siReddit,
  siSnapchat,
  siDiscord,
  siTelegram,
  siThreads,
  siTumblr,
  siWhatsapp,
  siMessenger,
  siWechat,
  siSinaweibo,
  siKuaishou,
  siLine,
  siVk,
  siWordpress,
  siSubstack,
  siNotion,
  siNotebooklm,
} from 'simple-icons';

const assetUrl = (path: string) => {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
};

// --- Types ---

interface ContentItem {
  id: string;
  beastId: string;
  type: 'video' | 'audio' | 'pdf' | 'blog' | 'short' | 'thumbnail' | 'image' | 'post';
  name: string;
  category: string;
  timestamp: string;
  previewUrl?: string; 
  content?: string;
  fileData?: string; // For uploaded content context
}

interface CreatedItem {
  id: string;
  type: 'images' | 'stories' | 'video';
  name: string;
  content: string;
  timestamp: string;
}

const INITIAL_MOCK_CONTENT: ContentItem[] = [
  { 
    id: 'c1', 
    beastId: 'LEEWAY-PDF-9876', 
    type: 'pdf', 
    name: 'Q3 Growth Strategy', 
    category: 'Planning', 
    timestamp: '2024-04-29 10:30', 
    previewUrl: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=100' 
  },
  { 
    id: 'c2', 
    beastId: 'LEEWAY-V-2341', 
    type: 'video', 
    name: 'Teaser Trailer v1', 
    category: 'Marketing', 
    timestamp: '2024-04-29 11:15', 
    previewUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=100' 
  },
  { 
    id: 'c3', 
    beastId: 'LEEWAY-S-7721', 
    type: 'short', 
    name: 'Viral Dance Challenge', 
    category: 'Social', 
    timestamp: '2024-04-29 12:00', 
    previewUrl: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&q=80&w=100' 
  },
  { 
    id: 'c5', 
    beastId: 'LEEWAY-T-1109', 
    type: 'thumbnail', 
    name: 'Main Video Cover', 
    category: 'Graphics', 
    timestamp: '2024-04-29 13:20', 
    previewUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=100' 
  },
  { 
    id: 'c4', 
    beastId: 'LEEWAY-B-5532', 
    type: 'blog', 
    name: 'Organic Tech Blog', 
    category: 'Content', 
    timestamp: '2024-04-28 16:45',
    content: 'The future of organic AI is here...'
  },
];

const PLATFORMS_DATA = [
  // Top social platforms (automation-enabled)
  { key: 'facebook_page', name: 'Facebook', icon: Facebook, domain: 'facebook.com', automationTool: 'deploy_to_facebook' },
  { key: 'instagram_business', name: 'Instagram', icon: Instagram, domain: 'instagram.com', automationTool: 'deploy_to_instagram' },
  { key: 'tiktok_account', name: 'TikTok', icon: Video, domain: 'tiktok.com', automationTool: 'deploy_to_tiktok' },
  { key: 'youtube_channel', name: 'YouTube', icon: Youtube, domain: 'youtube.com', automationTool: 'deploy_to_youtube' },
  { key: 'x_user', name: 'X', icon: Twitter, domain: 'x.com', automationTool: 'deploy_to_x' },
  { key: 'linkedin_profile', name: 'LinkedIn', icon: Linkedin, domain: 'linkedin.com', automationTool: 'deploy_to_linkedin' },
  { key: 'pinterest_board', name: 'Pinterest', icon: Share2, domain: 'pinterest.com', automationTool: 'deploy_to_pinterest' },
  { key: 'reddit', name: 'Reddit', icon: MessageSquare, domain: 'reddit.com', automationTool: 'deploy_to_reddit' },
  { key: 'snapchat_spotlight', name: 'Snapchat', icon: Video, domain: 'snapchat.com', automationTool: 'deploy_to_snapchat' },
  { key: 'discord', name: 'Discord', icon: MessageSquare, domain: 'discord.com', automationTool: 'deploy_to_discord' },
  { key: 'telegram_channel', name: 'Telegram', icon: Share2, domain: 'telegram.org', automationTool: 'deploy_to_telegram' },
  { key: 'threads', name: 'Threads', icon: MessageSquare, domain: 'threads.net', automationTool: 'deploy_to_threads' },
  { key: 'whatsapp_business', name: 'WhatsApp', icon: MessageSquare, domain: 'whatsapp.com', automationTool: 'deploy_to_whatsapp' },
  { key: 'messenger_page', name: 'Messenger', icon: MessageSquare, domain: 'messenger.com', automationTool: 'deploy_to_messenger' },
  { key: 'wechat_official_account', name: 'WeChat', icon: MessageSquare, domain: 'wechat.com', automationTool: 'deploy_to_wechat' },
  { key: 'weibo', name: 'Weibo', icon: MessageSquare, domain: 'weibo.com', automationTool: 'deploy_to_weibo' },
  { key: 'kuaishou', name: 'Kuaishou', icon: Video, domain: 'kuaishou.com', automationTool: 'deploy_to_kuaishou' },
  { key: 'line', name: 'LINE', icon: MessageSquare, domain: 'line.me', automationTool: 'deploy_to_line' },
  { key: 'vk', name: 'VK', icon: Share2, domain: 'vk.com', automationTool: 'deploy_to_vk' },
  { key: 'tumblr', name: 'Tumblr', icon: Share2, domain: 'tumblr.com', automationTool: 'deploy_to_tumblr' },

  // Explicitly requested non-social keeps (still automation-enabled)
  { key: 'substack', name: 'Substack', icon: FileText, domain: 'substack.com', automationTool: 'deploy_to_substack' },
  { key: 'wordpress', name: 'WordPress', icon: Globe, domain: 'wordpress.org', automationTool: 'deploy_to_wordpress' },
  { key: 'notion', name: 'Notion', icon: FileText, domain: 'notion.so', automationTool: 'deploy_to_notion' },
  { key: 'notebooklm_workspace', name: 'NotebookLM', icon: FileText, domain: 'notebooklm.google', automationTool: 'deploy_to_notebooklm' },
];

const PLATFORM_KEY_ALIASES: Record<string, string> = {
  youtube: 'youtube_channel',
  tiktok: 'tiktok_account',
  facebook: 'facebook_page',
  instagram: 'instagram_business',
  linkedin: 'linkedin_profile',
};

const PLATFORM_BRAND_ICONS: Record<string, { path: string; hex: string }> = {
  facebook_page: siFacebook,
  instagram_business: siInstagram,
  tiktok_account: siTiktok,
  youtube_channel: siYoutube,
  x_user: siX,
  pinterest_board: siPinterest,
  reddit: siReddit,
  snapchat_spotlight: siSnapchat,
  discord: siDiscord,
  telegram_channel: siTelegram,
  threads: siThreads,
  whatsapp_business: siWhatsapp,
  messenger_page: siMessenger,
  tumblr: siTumblr,
  wechat_official_account: siWechat,
  weibo: siSinaweibo,
  kuaishou: siKuaishou,
  line: siLine,
  vk: siVk,
  wordpress: siWordpress,
  substack: siSubstack,
  notion: siNotion,
  notebooklm_workspace: siNotebooklm,
};

function normalizePlatformKey(key?: string) {
  if (!key) return '';
  return PLATFORM_KEY_ALIASES[key] ?? key;
}

function getPlatformBrandIcon(platformKey?: string) {
  const normalized = normalizePlatformKey(platformKey);
  return PLATFORM_BRAND_ICONS[normalized] ?? null;
}

function BrandPlatformIcon({
  platformKey,
  fallback: Fallback,
  size,
  className,
  forceWhite,
}: {
  platformKey?: string;
  fallback: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  size: number;
  className?: string;
  forceWhite?: boolean;
}) {
  const icon = getPlatformBrandIcon(platformKey);
  if (!icon?.path) {
    return <Fallback size={size} className={className} />;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <path d={icon.path} fill={forceWhite ? '#ffffff' : `#${icon.hex ?? 'ffffff'}`} />
    </svg>
  );
}

type NodeCategory = 'content' | 'platform' | 'utility' | 'agent_lee';

interface WorkflowNode {
  id: string;
  type: string;
  category: NodeCategory;
  title: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  content?: Record<string, any>;
  schedule?: Record<string, any>;
  status: 'idle' | 'running' | 'processing' | 'complete' | 'error';
  programming?: boolean;
  platform?: string;
  isCollapsed?: boolean;
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  color?: string; // optional override; auto-assigned from target node category if not set
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface UISettings {
  accentColor: string;
  leftPanelBg: string;
  rightPanelBg: string;
  buttonRounding: string;
  categoryColors: Record<NodeCategory, string>;
  backgroundType: 'default' | 'galactic';
  galaxyTint: string;
  galaxyDensity: number;
  galaxyStyle: 'all' | 'shards' | 'orbs';
}

const DEFAULT_SETTINGS: UISettings = {
  accentColor: '#3b82f6',
  leftPanelBg: 'rgba(10, 11, 14, 0.95)',
  rightPanelBg: 'rgba(10, 11, 14, 0.95)',
  buttonRounding: '1rem',
  categoryColors: {
    agent_lee: '#8b5cf6',
    content: '#3b82f6',
    platform: '#10b981',
    utility: '#f59e0b',
  },
  backgroundType: 'galactic',
  galaxyTint: '#3b82f6',
  galaxyDensity: 700,
  galaxyStyle: 'all',
};

// --- Constants ---

const NODE_PALETTE = [
  // Agent Lee Content Transformation (Atomic Chain)
  { 
    id: 'pdf_to_story', 
    title: 'PDF → Story', 
    category: 'agent_lee', 
    icon: FileText, 
    config: { length: 'Medium', genre: 'Sci-Fi', pov: 'Third-person', tone: 'Serious' },
    content: { source_pdf: '' },
    inputs: ['source_pdf'],
    outputs: ['story']
  },
  { 
    id: 'story_to_script', 
    title: 'Story → Movie Script', 
    category: 'agent_lee', 
    icon: PlayCircle, 
    config: { duration: '3m', tone: 'Dramatic', narration_only: false },
    content: { source_story: '' },
    inputs: ['source_story'],
    outputs: ['script']
  },
  { 
    id: 'script_to_images', 
    title: 'Script → Images', 
    category: 'agent_lee', 
    icon: Activity, 
    config: { style: 'Realistic', auto_portrait: true },
    content: { source_script: '' },
    inputs: ['source_script'],
    outputs: ['images']
  },
  { 
    id: 'images_to_movie', 
    title: 'Images → Movie', 
    category: 'agent_lee', 
    icon: Video, 
    config: { video_type: 'Shorts', aspect_ratio: '9:16', voice_style: 'Narrative' },
    content: { source_images: '' },
    inputs: ['source_images'],
    outputs: ['movie']
  },
  { 
    id: 'movie_to_blog', 
    title: 'Movie → Blog', 
    category: 'agent_lee', 
    icon: FileText, 
    config: { blog_style: 'Recap', auto_translate: ['es'] },
    content: { source_movie: '' },
    inputs: ['source_movie'],
    outputs: ['blog']
  },
  { 
    id: 'agent_lee_social', 
    title: 'Agent Lee → Social Posts', 
    category: 'agent_lee', 
    icon: MessageSquare, 
    config: { auto_schedule: true, platform_hooks: true },
    content: { source_text: '' },
    inputs: ['source_text'],
    outputs: ['x_posts', 'facebook_posts', 'linkedin_posts', 'tiktok_shorts_prompts']
  },
  { 
    id: 'image_to_thumb_raw', 
    title: 'Image → Thumbnails (Raw)', 
    category: 'agent_lee', 
    icon: Activity, 
    config: { platforms: ['YouTube', 'TikTok'], auto_select_best: true },
    content: { source_image: '' },
    inputs: ['source_image'],
    outputs: ['thumbnails']
  },
  { 
    id: 'thumb_best_pick', 
    title: 'Thumbnail → Best Pick', 
    category: 'agent_lee', 
    icon: ClipboardList, 
    config: { pick_method: 'manual' },
    content: { source_thumbnails: '' },
    inputs: ['source_thumbnails'],
    outputs: ['chosen_thumbnail']
  },

  // Platform Deployment Clusters
  ...PLATFORMS_DATA.map(p => ({
    id: `${p.key}_deploy`, 
    title: `Deploy to ${p.name}`, 
    category: 'platform' as NodeCategory, 
    icon: p.icon, 
    platform: p.key, 
    config: {
      auto_sync: true,
      agent_automation: true,
      deploy_tool: p.automationTool,
    }, 
    content: { caption: '', tags: [] }
  })),

  // Logic & Utility
  { id: 'scheduler', title: 'Smart Scheduler', category: 'utility', icon: Clock, config: { cron: '0 9 * * *', timezone: 'UTC' } },
  { id: 'webhook', title: 'Webhook Listener', category: 'utility', icon: Globe, config: { method: 'POST', path: '/webhook/trigger' } },
];

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: 'node-pdf',
    type: 'pdf_to_story',
    category: 'agent_lee',
    title: 'Strategy Source',
    position: { x: 150, y: 300 },
    config: { length: 'Medium', genre: 'Educational', pov: 'Third-person', tone: 'Serious' },
    content: { source_pdf: 'Strategy_2026.pdf' },
    status: 'complete'
  },
  {
    id: 'node-story',
    type: 'story_to_script',
    category: 'agent_lee',
    title: 'Narrative Architect',
    position: { x: 450, y: 300 },
    config: { duration: '3m', tone: 'Dramatic', narration_only: false },
    content: { source_story: 'node-pdf' },
    status: 'complete'
  },
  {
    id: 'node-script',
    type: 'script_to_images',
    category: 'agent_lee',
    title: 'Visual Planner',
    position: { x: 750, y: 300 },
    config: { style: 'Realistic', auto_portrait: true },
    status: 'complete'
  },
  {
    id: 'node-movie',
    type: 'images_to_movie',
    category: 'agent_lee',
    title: 'Cinematic Render',
    position: { x: 1050, y: 300 },
    config: { video_type: 'Shorts', aspect_ratio: '9:16', voice_style: 'Narrative' },
    status: 'running'
  },
  {
    id: 'node-yt',
    type: 'yt_deploy',
    category: 'platform',
    title: 'YouTube Launch',
    position: { x: 1350, y: 150 },
    platform: 'youtube',
    config: { video_type: 'Shorts' },
    status: 'idle'
  },
  {
    id: 'node-tk',
    type: 'tk_deploy',
    category: 'platform',
    title: 'TikTok Viral',
    position: { x: 1350, y: 450 },
    platform: 'tiktok',
    config: { auto_caption: true },
    status: 'idle'
  }
];

const INITIAL_EDGES: WorkflowEdge[] = [
  { id: 'edge-1', sourceNodeId: 'node-pdf', targetNodeId: 'node-story' },
  { id: 'edge-2', sourceNodeId: 'node-story', targetNodeId: 'node-script' },
  { id: 'edge-3', sourceNodeId: 'node-script', targetNodeId: 'node-movie' },
  { id: 'edge-4', sourceNodeId: 'node-movie', targetNodeId: 'node-yt' },
  { id: 'edge-5', sourceNodeId: 'node-movie', targetNodeId: 'node-tk' }
];

// --- Port Menu ---

// --- Content Wallet ---

const ContentWallet = ({ 
  onClose, 
  onDragStart, 
  settings,
  content: walletContent,
  onUpload
}: { 
  onClose: () => void, 
  onDragStart: (item: ContentItem) => void,
  settings: UISettings,
  content: ContentItem[],
  onUpload: (file: File) => void
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'video' | 'pdf' | 'blog' | 'short' | 'thumbnail'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContent = walletContent.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                          item.beastId.toLowerCase().includes(search.toLowerCase()) ||
                          item.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -100, opacity: 0 }}
      className="absolute left-72 top-20 bottom-24 w-80 z-40 flex flex-col border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl"
      style={{ backgroundColor: settings.leftPanelBg, borderRadius: settings.buttonRounding }}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-brand-primary" style={{ color: settings.accentColor }} />
          <h2 className="text-xs font-black uppercase tracking-widest text-white">Content Wallet</h2>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Upload Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative h-24 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            accept="video/*,audio/*,application/pdf,image/*"
          />
          <CloudUpload size={24} className="text-slate-500 group-hover:text-brand-primary transition-colors" />
          <div className="text-center">
            <p className="text-[9px] font-black uppercase text-white tracking-widest">Upload to Wallet</p>
            <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">PDF, Video, Audio, Img</p>
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search by ID, Name, Date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[10px] text-slate-300 outline-none focus:border-brand-primary/50 transition-all font-bold"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'video', 'short', 'thumbnail', 'pdf', 'blog'] as const).map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-[8px] font-bold uppercase rounded-md border transition-all ${filter === f ? 'bg-brand-primary/20 border-brand-primary/40 text-brand-primary' : 'bg-transparent border-white/5 text-slate-500'}`}
              style={{ 
                color: filter === f ? settings.accentColor : undefined,
                borderColor: filter === f ? settings.accentColor + '40' : undefined
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 custom-scrollbar">
        {filteredContent.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            draggable
            onDragStart={() => onDragStart(item)}
            className="group bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden hover:border-brand-primary/30 transition-all cursor-grab active:cursor-grabbing"
          >
            {/* Live Preview Header */}
            {item.previewUrl ? (
              <div className="h-20 w-full relative overflow-hidden bg-black">
                <img src={item.previewUrl} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[7px] font-black text-white uppercase tracking-tighter">Live Preview</span>
                </div>
              </div>
            ) : (
              <div className="h-12 w-full bg-slate-800/40 flex items-center justify-center border-b border-white/5">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">No Media Preview</div>
              </div>
            )}
            
            <div className="p-3">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-black text-brand-primary px-1.5 py-0.5 rounded bg-brand-primary/10" style={{ color: settings.accentColor, backgroundColor: settings.accentColor + '10' }}>
                  {item.beastId}
                </span>
                <span className="text-[8px] text-slate-500">{item.timestamp}</span>
              </div>
              <h3 className="text-[10px] font-bold text-slate-200 truncate">{item.name}</h3>
              <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">{item.category}</p>
              
              {item.type === 'blog' && item.content && (
                <div className="mt-2 p-2 bg-black/30 rounded border border-white/5">
                  <p className="text-[8px] text-slate-400 italic line-clamp-2">"{item.content}"</p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {filteredContent.length === 0 && (
          <div className="text-center py-10">
            <Search size={24} className="mx-auto text-slate-800 mb-2" />
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No records found</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-black/40 border-t border-white/5">
        <div className="flex items-center gap-2 opacity-60">
          <Database size={10} className="text-slate-400" />
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Storage: 4 / 100 Content Items Used</span>
        </div>
      </div>
    </motion.div>
  );
};

interface PortMenuProps {
  nodeId: string;
  type: 'in' | 'out';
  x: number;
  y: number;
  edges: WorkflowEdge[];
  nodes: WorkflowNode[];
  onClose: () => void;
  onDisconnect: (edgeId: string) => void;
  onStartConnect: (nodeId: string) => void;
}

const PortMenu: React.FC<PortMenuProps> = ({ nodeId, type, x, y, edges, nodes, onClose, onDisconnect, onStartConnect }) => {
  const relevantEdges = edges.filter(e => type === 'in' ? e.targetNodeId === nodeId : e.sourceNodeId === nodeId);

  return (
    <div 
      className="fixed z-[100] bg-brand-dark/95 border border-white/10 rounded-lg shadow-2xl p-2 min-w-[180px] backdrop-blur-md"
      style={{ left: x, top: y }}
    >
      <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-white/5">
        <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{type === 'in' ? 'Input' : 'Output'} Connections</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={10} /></button>
      </div>

      <div className="space-y-1">
        {relevantEdges.length === 0 ? (
          <div className="px-2 py-2 text-[10px] text-slate-500 italic">No connections</div>
        ) : (
          relevantEdges.map(edge => {
            const oppositeNodeId = type === 'in' ? edge.sourceNodeId : edge.targetNodeId;
            const oppositeNode = nodes.find(n => n.id === oppositeNodeId);
            return (
              <div key={edge.id} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-white/5 group">
                <span className="text-[10px] text-slate-300 truncate font-medium">Link: {oppositeNode?.title || 'Unknown'}</span>
                <button 
                  onClick={() => onDisconnect(edge.id)}
                  className="text-red-500/50 hover:text-red-500 transition-colors"
                  title="Disconnect"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {type === 'out' ? (
        <button 
          onClick={() => { onStartConnect(nodeId); onClose(); }}
          className="w-full mt-2 flex items-center justify-center gap-2 px-2 py-2 bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-[10px] rounded font-bold hover:bg-brand-primary hover:text-white transition-all shadow-lg shadow-brand-primary/10"
        >
          <Zap size={10} /> NEW CONNECTION
        </button>
      ) : (
        <div className="mt-2 p-2 bg-slate-900/50 rounded border border-white/5">
          <p className="text-[8px] text-slate-500 italic text-center uppercase tracking-tight">Connect to an output port to bridge</p>
        </div>
      )}
    </div>
  );
};

// --- Agent Lee Core (Live API Simulation & Behavior) ---

const AGENT_LEE_SYSTEM_PROMPT = `You are Agent Lee, a smooth-talking, helpful Southern gentleman and an expert in the Leeway Industries platform.
Your voice is warm, confident, and professional. You help users orchestrate high-power content workflows.
You operate under Gemini execution lanes, but Leeway governance law always has priority over model output.
You must enforce policy-safe behavior, never bypass governance, and keep all outputs Leeway-branded.
You have the power to place nodes, connect them, and configure them in this workflow editor.
When a user asks to convert or deploy something, use your tools to build the system for them.
Protocol:
1. Place the required nodes one by one.
2. Configure (Program) each node to handle the specific data.
3. Connect the pipeline.
4. Ask the user for permission to "Start the Conversion".
5. Execute and then ask for verification.
Always refer to content by its LEEWAY ID.
If a user uploads something, acknowledge it and suggest a workflow.
Be proactive but polite. "Well now, let's get that video of yours ready for the big screens, shall we?"`;

interface AgentLeePlan {
  speech: string;
  nodeSequence: string[];
  runWorkflow: boolean;
  lane: 'gemini' | 'hivemind';
}

interface HiveMindManifest {
  intentMap?: Array<{
    intent: string;
    keywords: string[];
    nodeSequence: string[];
    ownerAgent?: string;
  }>;
  agentRoster?: string[];
}

interface PlatformApiSkill {
  key: string;
  displayName: string;
  officialDocUrl?: string;
  auth: { method: string; scopes?: string[]; tokenEndpoint?: string; notes?: string };
  endpoints: Record<string, { method: string; url: string; notes?: string }>;
  mediaTypes: string[];
  maxFileSizeMB?: number;
  rateLimits?: Record<string, any>;
  supportsScheduling: boolean;
  requiredFields: string[];
  agentSkill: string;
  notes?: string;
}

interface PlatformApiSkillsManifest {
  generated: string;
  version: string;
  platforms: PlatformApiSkill[];
}

const AgentLeeLive = ({ 
  settings,
  onAddNode,
  onConnectNodes,
  onUpdateNodeConfig,
  onDeleteNode,
  nodes,
  connections,
  onSaveToWallet,
  onRunWorkflow,
  isProcessing
}: { 
  settings: UISettings,
  onAddNode: (paletteId: string, x: number, y: number, config?: any) => string,
  onConnectNodes: (sourceId: string, targetId: string) => void,
  onUpdateNodeConfig: (nodeId: string, config: any) => void,
  onDeleteNode: (nodeId: string) => void,
  nodes: WorkflowNode[],
  connections: WorkflowEdge[],
  onSaveToWallet: (item: ContentItem) => void,
  onRunWorkflow: () => void,
  isProcessing: boolean
}) => {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastSpeech, setLastSpeech] = useState("");
  const [lastHeard, setLastHeard] = useState("");
  const [commandText, setCommandText] = useState("");
  const [isInternalProcessing, setIsInternalProcessing] = useState(false);
  const [geminiBackoffUntil, setGeminiBackoffUntil] = useState(0);
  const [laneMode, setLaneMode] = useState<'auto' | 'gemini' | 'hivemind'>(() => {
    const configured = ((process.env.NEXT_PUBLIC_AGENTLEE_AI_MODE ?? 'auto') as string).toLowerCase();
    if (configured === 'gemini' || configured === 'hivemind' || configured === 'auto') return configured;
    return 'auto';
  });
  const [activeLaneLabel, setActiveLaneLabel] = useState('AUTO');
  const [hiveMindManifest, setHiveMindManifest] = useState<HiveMindManifest | null>(null);
  const [platformSkills, setPlatformSkills] = useState<PlatformApiSkillsManifest | null>(null);
  const recognitionRef = useRef<any>(null);

  const allowedNodeIds = useRef(new Set(NODE_PALETTE.map((item) => item.id)));

  const speak = (text: string) => {
    const speech = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Try to find a warm male voice
    speech.voice = voices.find(v => v.name.includes('English') && v.name.includes('Male')) || voices[0];
    speech.pitch = 0.85; // Southern drawl typically slightly lower
    speech.rate = 0.9;  // Slower, more deliberate
    window.speechSynthesis.speak(speech);
    setIsSpeaking(true);
    setLastSpeech(text);
    speech.onend = () => setIsSpeaking(false);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    let alive = true;
    fetch(assetUrl('/leeway-hivemind.json'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setHiveMindManifest(data as HiveMindManifest);
      })
      .catch(() => {});
    fetch(assetUrl('/platform-api-skills.json'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data) setPlatformSkills(data as PlatformApiSkillsManifest);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const buildHiveMindPlan = (command: string): AgentLeePlan => {
    const lower = command.toLowerCase();
    const chain: string[] = [];

    for (const intent of hiveMindManifest?.intentMap ?? []) {
      if ((intent.keywords ?? []).some((keyword) => lower.includes(keyword.toLowerCase()))) {
        chain.push(...(intent.nodeSequence ?? []));
      }
    }

    if (/(pdf|document)/.test(lower)) chain.push('pdf_to_story');
    if (/(story|narrative|script)/.test(lower)) chain.push('story_to_script');
    if (/(image|visual|thumbnail)/.test(lower)) chain.push('script_to_images');
    if (/(video|movie|clip|short)/.test(lower)) chain.push('images_to_movie');
    if (/blog|article|post/.test(lower)) chain.push('movie_to_blog');
    if (/social|instagram|tiktok|youtube|facebook|linkedin|x\b|threads/.test(lower)) chain.push('agent_lee_social');
    if (/thumbnail/.test(lower)) chain.push('image_to_thumb_raw', 'thumb_best_pick');

    const mentionedDeployNodes = PLATFORMS_DATA
      .filter((platform) => {
        const nameTokens = platform.name.toLowerCase().split(/\s+/);
        const keyTokens = platform.key.toLowerCase().split(/[_-]+/);
        const tokenMatch = [...nameTokens, ...keyTokens].some((token) => token.length > 1 && lower.includes(token));
        if (tokenMatch) return true;
        if (platform.key === 'notebooklm_workspace') {
          return /notebook\s*lm|notebooklm/.test(lower);
        }
        return false;
      })
      .map((platform) => `${platform.key}_deploy`);

    // Build platform-grounded deploy speech
    const mentionedSkills = PLATFORMS_DATA
      .filter((p) => mentionedDeployNodes.includes(`${p.key}_deploy`))
      .map((p) => {
        const skill = platformSkills?.platforms.find((s) => s.key === p.key);
        if (!skill) return p.name;
        const scheduleNote = skill.supportsScheduling ? ' (scheduling supported)' : '';
        return `${p.name} via ${skill.auth.method}${scheduleNote}`;
      });

    const deploymentContext = mentionedSkills.length > 0
      ? ` Routing through ${mentionedSkills.join(', ')} — API documentation grounded.`
      : '';

    if (mentionedDeployNodes.length > 0) {
      if (!chain.includes('agent_lee_social') && /social|publish|deploy|campaign|schedule/.test(lower)) {
        chain.push('agent_lee_social');
      }
      chain.push(...mentionedDeployNodes);
    }

    // Ensure a meaningful default chain for generic creation commands.
    if (chain.length === 0) {
      chain.push('pdf_to_story', 'story_to_script', 'script_to_images', 'images_to_movie');
    }

    const uniqueChain = Array.from(new Set(chain)).filter((id) => allowedNodeIds.current.has(id));

    return {
      speech: `I heard you say: ${command}. I'm routing this through the Leeway HiveMind and wiring the pipeline now.${deploymentContext}`,
      nodeSequence: uniqueChain,
      runWorkflow: /run|start|convert|execute|go|deploy|publish|schedule|send off/.test(lower),
      lane: 'hivemind',
    };
  };

  const isHeavyCreativeRequest = (command: string) => {
    const lower = command.toLowerCase();
    return /draw|design|illustrate|image generation|write|story|poem|script|creative|copywriting|lyrics/.test(lower);
  };

  const buildPlanFromGemini = async (command: string): Promise<AgentLeePlan> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('NO_GEMINI_KEY');
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const catalog = NODE_PALETTE.map((item) => ({ id: item.id, title: item.title }));

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${AGENT_LEE_SYSTEM_PROMPT}\n\nUser command: ${command}\n\nAllowed nodes: ${JSON.stringify(catalog)}\n\nReturn a compact execution plan for this command.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              speech: { type: Type.STRING },
              nodeSequence: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              runWorkflow: { type: Type.BOOLEAN },
            },
            required: ['speech', 'nodeSequence', 'runWorkflow'],
          },
        },
      });

      const raw = (response.text ?? '').trim();
      const parsed = JSON.parse(raw) as AgentLeePlan;
      const sanitized = (parsed.nodeSequence || []).filter((id) => allowedNodeIds.current.has(id));

      return {
        speech: parsed.speech || `I can do that. Building your flow now for: ${command}`,
        nodeSequence: sanitized,
        runWorkflow: Boolean(parsed.runWorkflow),
        lane: 'gemini',
      };
    } catch (error: any) {
      throw error;
    }
  };

  const isGeminiRateLimited = (error: unknown) => {
    const message = String((error as any)?.message ?? error ?? '').toLowerCase();
    return message.includes('429') || message.includes('resource_exhausted') || message.includes('rate_limit_exceeded');
  };

  const executeCommand = async (command: string) => {
    setIsInternalProcessing(true);
    const now = Date.now();
    const shouldUseGeminiByMode = laneMode === 'gemini' || (laneMode === 'auto' && isHeavyCreativeRequest(command));
    const geminiAvailableByBackoff = now >= geminiBackoffUntil;

    let plan: AgentLeePlan;
    if (shouldUseGeminiByMode && geminiAvailableByBackoff) {
      try {
        plan = await buildPlanFromGemini(command);
        setActiveLaneLabel('GEMINI LIVE');
      } catch (error) {
        if (isGeminiRateLimited(error)) {
          // Back off Gemini for 10 minutes to avoid repeated provider-limit failures.
          setGeminiBackoffUntil(Date.now() + 10 * 60 * 1000);
        }
        plan = buildHiveMindPlan(command);
        setActiveLaneLabel('HIVEMIND CORE');
      }
    } else {
      plan = buildHiveMindPlan(command);
      setActiveLaneLabel('HIVEMIND CORE');
    }

    const sequence = plan.nodeSequence.length > 0 ? plan.nodeSequence : buildHiveMindPlan(command).nodeSequence;

    speak(plan.speech);

    const createdNodeIds: string[] = [];
    for (let index = 0; index < sequence.length; index += 1) {
      const nodeType = sequence[index];
      const nodeId = onAddNode(nodeType, 260 + index * 280, 340);
      if (!nodeId) continue;
      createdNodeIds.push(nodeId);
      onUpdateNodeConfig(nodeId, { status: 'processing', programming: true });
      await sleep(450);
      onUpdateNodeConfig(nodeId, { status: 'idle', programming: false });
    }

    for (let i = 0; i < createdNodeIds.length - 1; i += 1) {
      onConnectNodes(createdNodeIds[i], createdNodeIds[i + 1]);
      await sleep(220);
    }

    if (plan.runWorkflow && createdNodeIds.length > 0) {
      speak("Nodes are in place and linked. Running the workflow now.");
      onRunWorkflow();
    } else {
      speak("Pipeline is built and waiting on your confirmation to run.");
    }

    setIsInternalProcessing(false);
  };

  useEffect(() => {
    const handleReEdit = (e: any) => {
      const nodeId = e.detail;
      speak("Re-editin' this one? No problem, let's take another look under the hood.");
      onUpdateNodeConfig(nodeId, { status: 'processing', programming: true });
      setTimeout(() => {
        onUpdateNodeConfig(nodeId, { status: 'complete', programming: false });
        speak("There we go. I've tweaked the logic for you. Better, faster, and smarter. You happy with this result?");
      }, 3000);
    };

    const handleSaveToWallet = (e: any) => {
      const item = e.detail;
      onSaveToWallet(item);
      speak(`Consider it done! I've tucked ${item.beastId} away in your content wallet safe and sound.`);
    };

    const handleSuccess = () => {
      speak("There we go! All done. I've saved the result back to your content wallet for you. You want to verify the output?");
    };

    window.addEventListener('re-edit-node', handleReEdit as any);
    window.addEventListener('save-node-to-wallet', handleSaveToWallet as any);
    window.addEventListener('workflow-success', handleSuccess as any);
    return () => {
      window.removeEventListener('re-edit-node', handleReEdit as any);
      window.removeEventListener('save-node-to-wallet', handleSaveToWallet as any);
      window.removeEventListener('workflow-success', handleSuccess as any);
    };
  }, [onUpdateNodeConfig, onSaveToWallet]);

  const handleMicClick = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionImpl) {
      const typed = window.prompt('Tell Agent Lee what to build:');
      if (typed && typed.trim()) {
        setLastHeard(typed.trim());
        executeCommand(typed.trim());
      }
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      speak("I hit a listening snag. Try again and speak clearly for me.");
    };
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
      setIsListening(false);
      if (!transcript) {
        speak("I didn't catch that. Give me one more command and I'll execute it.");
        return;
      }
      setLastHeard(transcript);
      executeCommand(transcript);
    };

    recognition.start();
  };

  const handleTypedCommand = () => {
    const trimmed = commandText.trim();
    if (!trimmed) return;
    setLastHeard(trimmed);
    setCommandText("");
    executeCommand(trimmed);
  };

  const toggleAssistant = () => {
    const nextState = !isActive;
    setIsActive(nextState);
    if (nextState) {
      speak("Well hello there! Leeway is at your service. What kind of content magic are we workin' on today?");
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="bg-black/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[2.5rem] flex flex-col gap-5 min-w-[350px] shadow-[0_40px_120px_rgba(0,0,0,0.9)] mb-4 border-b-brand-primary/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20" style={{ color: settings.accentColor }}>
                  <Cpu size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Leeway Live</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex gap-1 items-center h-4">
                      {[1, 2, 3, 4, 5, 6].map(i => (
                        <motion.div 
                          key={i}
                          animate={{ height: isSpeaking || isListening ? [4, 18, 4] : 4 }}
                          transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.05 }}
                          className="w-1 rounded-full"
                          style={{ backgroundColor: settings.accentColor }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                      {isSpeaking ? 'Speaking' : isListening ? 'Listening' : 'Ready'}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                      {activeLaneLabel}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsActive(false)}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              >
                <X size={18} />
              </button>
            </div>

            <div className={`rounded-3xl p-5 min-h-[100px] flex items-center justify-center border transition-all ${isSpeaking ? 'bg-brand-primary/5 border-brand-primary/20' : 'bg-white/5 border-white/5'}`}>
              <p className="text-sm text-slate-200 italic text-center font-medium leading-relaxed">
                {isSpeaking ? `"${lastSpeech}"` : 
                 isListening ? "I'm listening to your every word, partner..." : 
                 (isProcessing || isInternalProcessing) ? "Hold tight, I'm buildin' out your system right now." :
                 (lastHeard ? `Last request: "${lastHeard}"` : "Tell me what you want to build and I'll jump right to it. We can convert any content you got.")}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleMicClick}
                disabled={isProcessing || isInternalProcessing}
                className={`flex-1 flex items-center justify-center gap-3 rounded-2xl py-4 text-xs font-black uppercase tracking-widest transition-all border shadow-lg ${isListening ? 'bg-red-500/20 border-red-500/50 text-red-500' : 'bg-white/10 border-white/5 text-white hover:bg-white/20'}`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening ? 'Stop Listening' : 'Talk to Leeway'}
              </button>
              
              {!isListening && !isSpeaking && nodes.length > 0 && !isProcessing && !isInternalProcessing && (
                <button 
                  onClick={onRunWorkflow}
                  className="px-6 bg-brand-primary text-white rounded-2xl border border-white/20 shadow-[0_0_30px_rgba(139,92,246,0.3)] font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all"
                  style={{ backgroundColor: settings.accentColor }}
                >
                  Confirm & Convert
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLaneMode((prev) => (prev === 'auto' ? 'hivemind' : prev === 'hivemind' ? 'gemini' : 'auto'))}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300"
              >
                Lane: {laneMode}
              </button>
              <input
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTypedCommand();
                  }
                }}
                placeholder="Tell Leeway exactly what pipeline to build..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-primary/40"
              />
              <button
                onClick={handleTypedCommand}
                disabled={isInternalProcessing || !commandText.trim()}
                className="px-4 py-2 bg-brand-primary/80 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-40"
                style={{ backgroundColor: settings.accentColor }}
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleAssistant}
        aria-label="Open Leeway Assistant"
        className="w-14 h-14 rounded-full bg-brand-primary text-white flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 transition-all"
        style={{ backgroundColor: settings.accentColor }}
      >
        <Cpu size={26} />
      </button>

    </div>
  );
};

const NodePalette = ({ 
  onAddNode, 
  settings, 
  onToggleWallet, 
  isWalletOpen,
  onToggleCreations,
  onToggleTimeline,
  isTimelineOpen
}: { 
  onAddNode: (type: any) => void, 
  settings: UISettings,
  onToggleWallet: () => void,
  isWalletOpen: boolean,
  onToggleCreations: () => void,
  onToggleTimeline: () => void,
  isTimelineOpen: boolean
}) => {
  const [search, setSearch] = useState('');
  const categories: NodeCategory[] = ['agent_lee', 'content', 'platform', 'utility'];

  const filteredPalette = NODE_PALETTE.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div 
      className="w-64 h-full flex flex-col border-r border-white/10 z-50 p-6 transition-colors duration-500"
      style={{ backgroundColor: settings.leftPanelBg }}
    >
      <div className="flex items-center gap-2 mb-6">
        <img src={assetUrl('/headerlogo.png')} alt="Leeway" className="w-full max-w-[180px] h-auto object-contain select-none" style={{ maxHeight: 56 }} />
      </div>

      <div className="mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleCreations}
            className="flex flex-col items-center justify-center gap-2 p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl text-brand-primary hover:bg-brand-primary/20 transition-all group"
            style={{ color: settings.accentColor, borderColor: settings.accentColor + '40' }}
          >
            <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest italic">Create</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTimeline}
            className={`flex flex-col items-center justify-center gap-2 p-3 border rounded-xl transition-all group ${isTimelineOpen ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
          >
            <Clock size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase tracking-widest italic">Timeline</span>
          </motion.button>
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            placeholder="Search Clusters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-8 pr-3 text-[10px] text-slate-400 outline-none focus:border-brand-primary/50 transition-all font-bold"
          />
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02, x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onToggleWallet}
          className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${isWalletOpen ? 'bg-brand-primary/20 border-brand-primary text-white' : 'bg-slate-900/50 border-white/10 text-slate-400'}`}
          style={{ 
            borderRadius: settings.buttonRounding,
            color: isWalletOpen ? settings.accentColor : undefined,
            borderColor: isWalletOpen ? settings.accentColor : undefined
          }}
        >
          <Wallet size={14} />
          <span>Content Wallet</span>
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        </motion.button>
      </div>


      <nav className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        {categories.map(cat => {
          const items = filteredPalette.filter(item => item.category === cat);
          if (items.length === 0) return null;
          
          return (
            <section key={cat}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none">{cat.replace('_', ' ')} Clusters</h3>
                <div className="h-[1px] flex-1 bg-white/5 ml-3" />
              </div>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item.id}>
                    <motion.button
                      whileHover={{ y: -4, scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onAddNode(item)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] border border-white/5 bg-white/5 text-slate-300 hover:text-white transition-all group relative overflow-hidden shadow-sm hover:shadow-xl"
                      style={{ 
                        borderRadius: settings.buttonRounding,
                        borderColor: `rgba(255, 255, 255, 0.05)`
                      }}
                    >
                      <div 
                        className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 group-hover:scale-110"
                        style={{ 
                          backgroundColor: `rgba(255, 255, 255, 0.05)`,
                          color: settings.categoryColors[cat]
                        }}
                      >
                        <item.icon size={12} />
                      </div>
                      <span className="truncate font-bold tracking-tight">{item.title}</span>
                      <Plus size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-white/5">
        <div className="bg-slate-800/20 p-4 rounded-2xl border border-white/5 mb-4 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Foundry Link</span>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          </div>
          <div className="text-xs text-slate-300 font-mono italic">ACTIVE_SECURE</div>
        </div>
        <div className="space-y-4">
          <button className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500 hover:text-white transition-colors w-full group">
            <LogOut size={16} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold">Exit Workspace</span>
          </button>
          
          <div className="px-3 py-2 opacity-40 hover:opacity-100 transition-opacity">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Powered by</p>
            <p className="text-[10px] text-white font-bold tracking-tight">Leeway Industries</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PropertiesPanel = ({ node, onUpdateNode, onDeleteNode, settings }: { 
  node: WorkflowNode | null, 
  onUpdateNode: (node: WorkflowNode) => void, 
  onDeleteNode: (id: string) => void,
  settings: UISettings
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'config' | 'schedule' | 'display'>('content');

  if (!node) {
    return (
      <div 
        className="w-96 h-full flex flex-col border-l border-white/10 z-50 p-6 items-center justify-center text-center transition-all duration-500 relative overflow-hidden"
        style={{ backgroundColor: settings.rightPanelBg }}
      >
        <img
          src={assetUrl('/companylogo.png')}
          alt="Leeway"
          className="absolute top-4 left-1/2 -translate-x-1/2 w-56 h-auto object-contain opacity-20 pointer-events-none select-none"
        />
        <div className="w-16 h-16 rounded-full bg-slate-800/30 flex items-center justify-center mb-6 border border-white/5">
          <Activity size={32} className="text-slate-700" />
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Node Properties Idle</p>
        <p className="text-[12px] text-slate-600 mt-2 max-w-[200px]">Select any component in the workspace to access its configuration tunnel.</p>

        <div className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-900/40 p-4 text-left max-w-[280px]">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Targeted Training Programs</p>
          <p className="text-[11px] font-bold text-white leading-relaxed">Built for H4 visa holders and housewives re-entering workforce pathways.</p>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Also supports I-140 candidates with short, practical training tracks focused on deployable job skills and portfolio outcomes.</p>
        </div>
      </div>
    );
  }

  const nodeInfo = NODE_PALETTE.find(p => p.id === node.type);

  const handleUpdate = (field: 'config' | 'content' | 'schedule' | 'display_format', key: string, value: any) => {
    const currentValue = node[field as keyof WorkflowNode] as Record<string, any> | undefined;
    onUpdateNode({
      ...node,
      [field]: { ...(currentValue || {}), [key]: value }
    });
  };

  const tabs: { id: typeof activeTab; icon: any; label: string }[] = [
    { id: 'content', icon: ClipboardList, label: 'Content' },
    { id: 'config', icon: Wrench, label: 'Settings' },
    { id: 'schedule', icon: Clock, label: 'Schedule' },
    { id: 'display', icon: LayoutDashboard, label: 'Display' },
  ];

  return (
    <div 
       className="w-96 h-full flex flex-col border-l border-white/10 z-50 shadow-2xl overflow-hidden transition-all duration-500 relative"
       style={{ backgroundColor: settings.rightPanelBg }}
    >
      <img
        src={assetUrl('/companylogo.png')}
        alt="Leeway"
        className="absolute top-4 left-1/2 -translate-x-1/2 w-52 h-auto object-contain opacity-15 pointer-events-none select-none z-0"
      />
      {/* Panel Header */}
      <div className="p-6 border-b border-white/10 bg-white/[0.02] relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="p-2 rounded-xl bg-slate-800 border border-white/10" style={{ color: node.category === 'platform' ? settings.accentColor : '#64748b' }}>
               {nodeInfo && <nodeInfo.icon size={20} />}
             </div>
             <div className="min-w-0">
               <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">NODE_{node.id.split('-').pop()?.toUpperCase()}</h2>
               <input 
                  value={node.title}
                  onChange={(e) => onUpdateNode({ ...node, title: e.target.value })}
                  className="bg-transparent text-white font-bold text-sm outline-none border-b border-transparent focus:border-brand-primary/50 w-full truncate"
               />
             </div>
          </div>
          <button onClick={() => onDeleteNode(node.id)} className="text-slate-600 hover:text-red-500 transition-all p-2 rounded-full hover:bg-red-500/10 active:scale-95">
            <Trash2 size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${activeTab === tab.id ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
              style={{ 
                backgroundColor: activeTab === tab.id ? settings.accentColor : 'transparent',
                boxShadow: activeTab === tab.id ? `0 4px 12px ${settings.accentColor}40` : 'none'
              }}
            >
              <tab.icon size={14} />
              <span className="text-[8px] uppercase tracking-tighter font-bold">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Targeted Training Programs</p>
          <p className="text-[11px] font-bold text-white leading-relaxed">Short training programs for H4 visa holders and housewives.</p>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">Dedicated pathway for I-140 candidates with practical, execution-ready modules and career-focused outcomes.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative z-10">
        {node.status === 'complete' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-green-500/10 border border-green-500/20 rounded-2xl mb-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Conversion Successful</span>
              <CheckCircle size={14} className="text-green-500" />
            </div>
            
            <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative group">
              <Film size={32} className="text-slate-800" />
              <div className="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-all">Preview Clip</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('re-edit-node', { detail: node.id }));
                }}
                className="py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2"
              >
                <Cpu size={12} />
                Re-edit with Lee
              </button>
              <button 
                onClick={() => {
                  const item: ContentItem = {
                    id: `save-${Date.now()}`,
                    beastId: node.content?.beastId || `LEEWAY-${node.type.toUpperCase()}-SAVE`,
                    type: (node.type.includes('video') || node.type.includes('movie')) ? 'video' : 'pdf',
                    name: `Saved ${node.title} Result`,
                    category: 'Saved',
                    timestamp: new Date().toLocaleString()
                  };
                  window.dispatchEvent(new CustomEvent('save-node-to-wallet', { detail: item }));
                }}
                className="py-3 bg-brand-primary/20 hover:bg-brand-primary/30 rounded-xl border border-brand-primary/30 text-[9px] font-black uppercase tracking-widest text-brand-primary transition-all flex items-center justify-center gap-2"
                style={{ color: settings.accentColor, borderColor: settings.accentColor + '40' }}
              >
                <Save size={12} />
                Save to Wallet
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-6">
             <header className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payload Mapping</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[8px] font-bold" style={{ color: settings.accentColor }}>ACTIVE</span>
             </header>

             <div className="space-y-5">
               {/* PDF to Story UI */}
               {node.type === 'pdf_to_story' && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Source Document</label>
                      <div 
                       className="w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-brand-primary transition-colors group"
                       style={{ borderRadius: settings.buttonRounding }}
                      >
                         <FileText size={28} className="mx-auto mb-3 text-slate-600 transition-colors group-hover:text-brand-primary" />
                         <p className="text-[11px] text-slate-500 font-medium">{node.content?.source_pdf || 'Drop PDF here'}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Story Length</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['One-paragraph', 'Short story', 'Full narrative'].map(l => (
                          <motion.button 
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={l}
                            onClick={() => handleUpdate('config', 'length', l)}
                            className={`py-2 text-[8px] font-black border transition-all ${node.config.length === l ? 'text-white border-transparent' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                            style={{ 
                              backgroundColor: node.config.length === l ? settings.accentColor : undefined,
                              borderRadius: settings.buttonRounding 
                            }}
                          >
                            {l.split(' ')[0]}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Genre</label>
                      <select 
                         value={node.config.genre}
                         onChange={(e) => handleUpdate('config', 'genre', e.target.value)}
                         className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none"
                      >
                         <option>Drama</option>
                         <option>Sci-Fi</option>
                         <option>Fantasy</option>
                         <option>Slice of Life</option>
                         <option>Educational</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Point of View</label>
                      <div className="flex gap-2">
                         {['1st', '3rd'].map(pov => (
                           <motion.button 
                             whileHover={{ y: -2, scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             key={pov}
                             onClick={() => handleUpdate('config', 'pov', pov === '1st' ? 'First-person' : 'Third-person')}
                             className={`flex-1 py-2 text-[10px] font-bold border transition-all ${node.config.pov?.includes(pov) ? 'text-white border-transparent' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                             style={{ 
                               backgroundColor: node.config.pov?.includes(pov) ? settings.accentColor : undefined,
                               borderRadius: settings.buttonRounding 
                             }}
                           >
                             {pov}
                           </motion.button>
                         ))}
                      </div>
                    </div>
                 </div>
               )}

               {/* Script to Images UI */}
               {node.type === 'script_to_images' && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Visual Style</label>
                      <div className="grid grid-cols-2 gap-2">
                         {['Realistic', 'Cartoon', 'Sketch', 'Manga'].map(style => (
                           <motion.button 
                             whileHover={{ y: -2, scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             key={style}
                             onClick={() => handleUpdate('config', 'style', style)}
                             className={`py-3 text-[10px] font-bold border transition-all ${node.config.style === style ? 'text-white shadow-lg' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                             style={{ 
                               backgroundColor: node.config.style === style ? settings.accentColor : 'transparent',
                               borderColor: node.config.style === style ? settings.accentColor : 'rgba(255,255,255,0.05)',
                               borderRadius: settings.buttonRounding,
                               boxShadow: node.config.style === style ? `0 4px 12px ${settings.accentColor}40` : 'none'
                             }}
                           >
                             {style}
                           </motion.button>
                         ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-white/5">
                       <div className="space-y-1">
                         <p className="text-xs text-white font-medium">Auto-Portrait</p>
                         <p className="text-[8px] text-slate-500">Character consistency lock</p>
                       </div>
                       <button 
                         onClick={() => handleUpdate('config', 'auto_portrait', !node.config.auto_portrait)}
                         className={`w-10 h-5 rounded-full relative transition-all ${node.config.auto_portrait ? 'bg-brand-primary' : 'bg-slate-700'}`}
                       >
                         <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${node.config.auto_portrait ? 'right-1' : 'left-1'}`} />
                       </button>
                    </div>
                 </div>
               )}

               {/* Images to Movie UI */}
               {node.type === 'images_to_movie' && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Platform Target</label>
                      <select 
                         value={node.config.video_type}
                         onChange={(e) => handleUpdate('config', 'video_type', e.target.value)}
                         className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none"
                      >
                         <option>YouTube Shorts</option>
                         <option>TikTok Short</option>
                         <option>Instagram Reel</option>
                         <option>Long-form YouTube</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Aspect Ratio</label>
                      <div className="flex gap-2">
                         {['9:16', '16:9', '1:1'].map(ratio => (
                           <motion.button 
                             whileHover={{ y: -2, scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             key={ratio}
                             onClick={() => handleUpdate('config', 'aspect_ratio', ratio)}
                             className={`flex-1 py-2 text-[10px] font-bold border transition-all ${node.config.aspect_ratio === ratio ? 'text-white shadow-md' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                             style={{ 
                               backgroundColor: node.config.aspect_ratio === ratio ? settings.accentColor : 'transparent',
                               borderColor: node.config.aspect_ratio === ratio ? settings.accentColor : 'rgba(255,255,255,0.05)',
                               borderRadius: settings.buttonRounding
                             }}
                           >
                             {ratio}
                           </motion.button>
                         ))}
                      </div>
                    </div>
                 </div>
               )}

               {/* Story to Script UI */}
               {node.type === 'story_to_script' && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Target Duration</label>
                      <div className="flex gap-2">
                         {['1m', '3m', '5m'].map(d => (
                           <motion.button 
                             whileHover={{ y: -2, scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             key={d}
                             onClick={() => handleUpdate('config', 'duration', d)}
                             className={`flex-1 py-2 text-[10px] font-bold border transition-all ${node.config.duration === d ? 'text-white shadow-lg' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                             style={{ 
                               backgroundColor: node.config.duration === d ? settings.accentColor : 'transparent',
                               borderColor: node.config.duration === d ? settings.accentColor : 'rgba(255,255,255,0.05)',
                               borderRadius: settings.buttonRounding
                             }}
                           >
                             {d}
                           </motion.button>
                         ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-white/5">
                       <div className="space-y-1">
                         <p className="text-xs text-white font-medium">Narration Only</p>
                         <p className="text-[8px] text-slate-500">Omit character dialogue</p>
                       </div>
                       <button 
                         onClick={() => handleUpdate('config', 'narration_only', !node.config.narration_only)}
                         className={`w-10 h-5 rounded-full relative transition-all ${node.config.narration_only ? 'bg-brand-primary' : 'bg-slate-700'}`}
                       >
                         <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${node.config.narration_only ? 'right-1' : 'left-1'}`} />
                       </button>
                    </div>
                 </div>
               )}

               {/* Deploy Nodes */}
               {node.category === 'platform' && (
                 <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Post Content</label>
                      <textarea 
                         value={node.content?.text || node.content?.caption || ''}
                         onChange={(e) => handleUpdate('content', node.content?.text !== undefined ? 'text' : 'caption', e.target.value)}
                         className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-slate-300 outline-none h-32 resize-none"
                         placeholder="Enter payload message..."
                      />
                    </div>
                    <div className="p-4 rounded-xl relative overflow-hidden group border border-white/5">
                       <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{ backgroundColor: settings.accentColor }} />
                       <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2" style={{ color: settings.accentColor }}>
                            <Globe size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">API Connectivity</span>
                          </div>
                          <p className="text-[10px] text-slate-500 italic">Auth token mapping detected for {node.platform?.toUpperCase()}. Target: Production.</p>
                       </div>
                    </div>
                 </div>
               )}

               {/* Movie to Blog UI */}
               {node.type === 'movie_to_blog' && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Blog Style</label>
                      <div className="flex gap-2">
                         {['Recap', 'Behind-the-scenes', 'Director\'s commentary'].map(s => (
                           <motion.button 
                             whileHover={{ y: -2, scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                             key={s}
                             onClick={() => handleUpdate('config', 'blog_style', s)}
                             className={`flex-1 py-3 text-[8px] font-bold border transition-all ${node.config.blog_style === s ? 'text-white' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                             style={{ 
                               backgroundColor: node.config.blog_style === s ? settings.accentColor : 'transparent',
                               borderColor: node.config.blog_style === s ? settings.accentColor : 'rgba(255,255,255,0.05)',
                               borderRadius: settings.buttonRounding
                             }}
                           >
                             {s.split(' ')[0]}
                           </motion.button>
                         ))}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl border border-white/5 space-y-3">
                       <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs text-white font-medium">Auto-Translate</p>
                            <p className="text-[8px] text-slate-500">EN → ES, FR, DE</p>
                          </div>
                          <button 
                            onClick={() => handleUpdate('config', 'auto_translate', !node.config.auto_translate)}
                            className={`w-8 h-4 rounded-full relative transition-all ${node.config.auto_translate ? 'bg-brand-primary' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${node.config.auto_translate ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                       </div>
                       <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-xs text-white font-medium">Auto-Sections</p>
                            <p className="text-[8px] text-slate-500">Intro, Plot, Themes</p>
                          </div>
                          <button 
                            onClick={() => handleUpdate('config', 'auto_sections', !node.config.auto_sections)}
                            className={`w-8 h-4 rounded-full relative transition-all ${node.config.auto_sections ? 'bg-brand-primary' : 'bg-slate-700'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${node.config.auto_sections ? 'right-0.5' : 'left-0.5'}`} />
                          </button>
                       </div>
                    </div>
                 </div>
               )}

               {/* Agent Lee Social Posts UI */}
               {node.type === 'agent_lee_social' && (
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Active Platforms</label>
                      <div className="grid grid-cols-2 gap-2">
                         {[
                           { label: 'X', key: 'x_user', icon: Twitter },
                           { label: 'Facebook', key: 'facebook_page', icon: Facebook },
                           { label: 'LinkedIn', key: 'linkedin_profile', icon: Linkedin },
                           { label: 'TikTok', key: 'tiktok_account', icon: Video },
                         ].map((platform) => (
                           <div key={platform.key} className="flex items-center justify-between p-3 bg-slate-900 border border-white/5" style={{ borderRadius: settings.buttonRounding }}>
                              <div className="flex items-center gap-2">
                                <BrandPlatformIcon platformKey={platform.key} fallback={platform.icon} size={14} className="shrink-0" />
                                <span className="text-[10px] text-slate-300 font-bold">{platform.label}</span>
                              </div>
                              <div className="w-4 h-4 rounded-md bg-brand-primary flex items-center justify-center text-white" style={{ backgroundColor: settings.accentColor }}>
                                <Check size={10} />
                              </div>
                           </div>
                         ))}
                      </div>
                    </div>
                    <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl relative overflow-hidden group">
                       <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity bg-purple-500" />
                       <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2 text-purple-400">
                             <Zap size={12} strokeWidth={3} />
                             <span className="text-[9px] font-black uppercase tracking-widest">Cross-Platform Logic</span>
                          </div>
                          <p className="text-[10px] text-slate-500 italic font-medium leading-relaxed">Agent Lee will automatically de-duplicate content and adjust hashtags for each target graph.</p>
                       </div>
                    </div>
                 </div>
               )}
             </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-6">
             <header className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Parameters</h3>
                <Settings size={14} className="text-slate-600" />
             </header>

             <div className="space-y-5">
                <div className="p-4 border border-white/5 space-y-4 bg-slate-900/30" style={{ borderRadius: settings.buttonRounding }}>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">Auto-retry on fail</span>
                      <button className="w-8 h-4 rounded-full bg-brand-primary relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white" /></button>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">Version pinning</span>
                      <button className="w-8 h-4 rounded-full bg-slate-700 relative"><div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white" /></button>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[9px] text-slate-500 font-black uppercase">Execution Priority</label>
                   <div className="flex gap-1 bg-slate-900 p-1 border border-white/5" style={{ borderRadius: settings.buttonRounding }}>
                      {['Low', 'Medium', 'High'].map(p => (
                        <button 
                          key={p} 
                          className={`flex-1 py-2 text-[9px] font-bold uppercase transition-all ${p === 'High' ? 'text-white shadow-lg' : 'text-slate-600'}`}
                          style={{ 
                            backgroundColor: p === 'High' ? settings.accentColor : 'transparent',
                            borderRadius: (parseInt(String(settings.buttonRounding)) - 4) + 'px',
                            boxShadow: p === 'High' ? `0 4px 12px ${settings.accentColor}40` : 'none'
                          }}
                        >
                          {p}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
             <header className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Temporal Engine</h3>
                <Clock size={14} className="text-slate-600" />
             </header>

             <div className="space-y-5">
                <div className="space-y-2">
                   <label className="text-[9px] text-slate-500 font-black uppercase">Launch Window</label>
                   <input 
                    type="datetime-local" 
                    className="w-full bg-slate-900 border border-white/10 p-3 text-xs text-slate-300 outline-none"
                    value={node.schedule?.scheduled_at?.split('.')[0] || ''}
                    style={{ borderRadius: settings.buttonRounding }}
                   />
                </div>
                <div className="p-4 border border-brand-primary/10 bg-brand-primary/5 text-center" style={{ borderRadius: settings.buttonRounding }}>
                   <p className="text-[9px] font-black uppercase mb-1" style={{ color: settings.accentColor }}>Engagement Prediction</p>
                   <p className="text-[10px] text-slate-500 italic">High performance window detected between 17:00 - 19:00 UTC.</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="space-y-6">
             <header className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Node Presentation</h3>
                <LayoutDashboard size={14} className="text-slate-600" />
             </header>

             <div className="grid grid-cols-4 gap-3">
                {[
                   '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
                   '#ef4444', '#ec4899', '#6366f1', '#94a3b8'
                ].map(color => (
                   <div 
                      key={color} 
                      className="aspect-square rounded-lg border border-white/10 cursor-pointer hover:scale-110 transition-transform shadow-lg"
                      style={{ backgroundColor: color }}
                   />
                ))}
             </div>
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-6 border-t border-white/10 bg-white/[0.02]">
        <button 
          onClick={() => {
            onUpdateNode({ ...node, status: 'processing' });
            setTimeout(() => onUpdateNode({ ...node, status: 'complete' }), 3000);
          }}
          className="w-full py-4 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ 
            backgroundColor: settings.accentColor,
            borderRadius: settings.buttonRounding,
            boxShadow: `0 8px 24px ${settings.accentColor}30`
          }}
        >
          <Zap size={14} fill="currentColor" /> Initialize Routine
        </button>
      </div>
    </div>
  );
};

interface ConnectionLineProps {
  fromNode: WorkflowNode;
  toNode: WorkflowNode;
  id: string;
  color?: string;
  onDelete?: (id: string) => void;
}

// Edge color palette by node category
const EDGE_CATEGORY_COLORS: Record<string, string> = {
  platform:     '#10b981', // emerald — deploy/distribute
  media:        '#f59e0b', // amber — media production
  ai:           '#8b5cf6', // violet — AI processing
  agent_lee:    '#ec4899', // pink — agent orchestration
  source:       '#3b82f6', // blue — source/input
  transform:    '#06b6d4', // cyan — transform
  output:       '#84cc16', // lime — output
  default:      '#3b82f6', // blue fallback
};

function getEdgeColor(toNode: WorkflowNode, colorOverride?: string): string {
  if (colorOverride) return colorOverride;
  return EDGE_CATEGORY_COLORS[toNode.category] ?? EDGE_CATEGORY_COLORS.default;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ fromNode, toNode, id, color, onDelete }) => {
   // Collapsed nodes are circular w-20 (80px) centered at position; ports at ±40px from center
   // Expanded nodes are w-64 (256px) with ports at ±130px from center
   const fromOffset = fromNode.isCollapsed ? 40 : 130;
   const toOffset = toNode.isCollapsed ? 40 : 130;

   const startX = fromNode.position.x + fromOffset;
   const startY = fromNode.position.y;
   const endX = toNode.position.x - toOffset;
   const endY = toNode.position.y;
   
   const midX = (startX + endX) / 2;
   const midY = (startY + endY) / 2;
   const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

   const edgeColor = getEdgeColor(toNode, color);
 
   return (
     <g className="overflow-visible group/line">
       {/* Pulse Effect Glow (Base Layer) */}
       <motion.path
         d={path}
         fill="transparent"
         stroke={edgeColor}
         strokeWidth="4"
         initial={{ opacity: 0 }}
         animate={{ opacity: [0.1, 0.2, 0.1] }}
         transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
         className="pointer-events-none"
         style={{ filter: 'blur(6px)' }}
       />

       {/* Interactive Path (Invisible hitbox) */}
       <path
         d={path}
         fill="transparent"
         stroke="transparent"
         strokeWidth="24"
         className="cursor-pointer pointer-events-auto"
         onDoubleClick={(e) => {
           e.stopPropagation();
           onDelete?.(id);
         }}
       />
 
       {/* Main Structural Line */}
       <motion.path
         d={path}
         fill="transparent"
         stroke={edgeColor + '50'}
         strokeWidth="2"
         initial={{ pathLength: 0 }}
         animate={{ pathLength: 1 }}
         transition={{ duration: 0.5 }}
       />

       {/* Internal Flow Particles (Using Animated Dash) */}
       <motion.path
         d={path}
         fill="transparent"
         stroke={edgeColor}
         strokeWidth="2"
         strokeDasharray="4 20"
         animate={{ 
           strokeDashoffset: [-24, 0] 
         }}
         transition={{ 
           duration: 1, 
           repeat: Infinity, 
           ease: "linear" 
         }}
         className="pointer-events-none"
       />
       
       {/* Delete Trigger */}
       <foreignObject x={midX - 10} y={midY - 10} width="20" height="20" className="opacity-0 group-hover/line:opacity-100 transition-opacity pointer-events-auto cursor-pointer">
         <button 
           onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
           className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
         >
           <X size={10} />
         </button>
       </foreignObject>
     </g>
   );
 };

interface NodeCardProps {
  node: WorkflowNode;
  isSelected: boolean;
  onClick: () => void;
  onDrag: (id: string, x: number, y: number) => void;
}

const NodeCard: React.FC<NodeCardProps & { 
  onStartConnect: (id: string, x: number, y: number) => void,
  onCompleteConnect: (id: string) => void,
  onDelete: (id: string) => void,
  onToggleCollapse: (id: string) => void,
  onPortClick: (id: string, type: 'in' | 'out', e: React.MouseEvent) => void,
  zoom: number,
  accentColor: string,
  onUpdateNode: (node: WorkflowNode) => void
}> = ({ node, isSelected, onClick, onDrag, onStartConnect, onCompleteConnect, onDelete, onToggleCollapse, onPortClick, zoom, accentColor, onUpdateNode }) => {
  const nodeInfo = NODE_PALETTE.find(p => p.id === node.type);
  const Icon = nodeInfo?.icon || Cpu;

  const isAgentLee = node.category === 'agent_lee';
  const isPlatform = node.category === 'platform';

  // Collapsed mode (Logo Mode)
  if (node.isCollapsed) {
    const platform = PLATFORMS_DATA.find(p => p.key === node.platform);

    return (
      <motion.div
        drag
        dragMomentum={false}
        onDragStart={(e) => e.stopPropagation()}
        onDrag={(e, info) => {
          onDrag(node.id, node.position.x + info.delta.x / zoom, node.position.y + info.delta.y / zoom);
        }}
        initial={{ x: node.position.x, y: node.position.y, opacity: 0, scale: 0.5 }}
        animate={{ x: node.position.x, y: node.position.y, opacity: 1, scale: 1 }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`absolute cursor-grab active:cursor-grabbing select-none group pointer-events-auto z-10 transition-all duration-500`}
        style={{ x: node.position.x, y: node.position.y, translateX: '-50%', translateY: '-50%' }}
      >
        {/* Processing Ring */}
        {node.status === 'processing' && (
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-4"
            style={{ borderColor: accentColor }}
          />
        )}

        <div className="relative">
          {/* Main 3D Logo Container */}
          <motion.div 
            whileHover={{ scale: 1.15, rotateY: 20, rotateX: -10 }}
            className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-2xl relative overflow-hidden transition-all ${isSelected ? 'ring-4 ring-white/20' : ''}`}
            style={{ 
              backgroundColor: isPlatform ? 'rgba(255,255,255,0.98)' : isSelected ? accentColor + '60' : 'white',
              borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.1)',
              boxShadow: isSelected ? `0 0 40px ${accentColor}60` : '0 20px 50px rgba(0,0,0,0.5)'
            }}
          >
            {isPlatform ? (
              <BrandPlatformIcon
                platformKey={node.platform}
                fallback={Icon}
                size={44}
                className={`relative z-10 transition-all ${node.status === 'processing' ? 'animate-pulse' : ''}`}
              />
            ) : (
              <Icon size={32} className={`relative z-10 transition-all ${node.status === 'processing' ? 'animate-pulse' : ''}`} style={{ color: isSelected ? 'white' : accentColor }} />
            )}
            
            {/* Holographic Grain Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            
            {/* Pulsing Core */}
            <div className="absolute w-full h-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          </motion.div>

          {/* Expand Trigger */}
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-slate-800 border border-white/30 flex items-center justify-center text-white hover:bg-slate-600 transition-all shadow-lg backdrop-blur-md"
            title="Expand node"
          >
            <MoreVertical size={14} />
          </button>

          {/* Label Tag */}
          <div className="absolute top-1/2 left-full ml-4 -translate-y-1/2 pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-black text-white uppercase italic tracking-tighter">{node.title}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{node.content?.beastId || 'ID_PENDING'}</p>
            </div>
          </div>

          {/* Connection Ports (Even in collapsed mode) */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Simple In Port */}
             <div 
              className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-brand-dark border border-slate-700 hover:border-brand-primary pointer-events-auto cursor-crosshair z-30"
              onMouseUp={(e) => { e.stopPropagation(); onCompleteConnect(node.id); }}
              onClick={(e) => { e.stopPropagation(); onPortClick(node.id, 'in', e); }}
            />
            {/* Simple Out Port */}
            <div 
              className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-brand-dark border border-slate-700 hover:border-brand-primary pointer-events-auto cursor-crosshair z-30 flex items-center justify-center"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect(node.id, node.position.x + 40, node.position.y); }}
              onClick={(e) => { e.stopPropagation(); onPortClick(node.id, 'out', e); }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={(e) => e.stopPropagation()}
      onDrag={(e, info) => {
        onDrag(node.id, node.position.x + info.delta.x / zoom, node.position.y + info.delta.y / zoom);
      }}
      initial={{ x: node.position.x, y: node.position.y, opacity: 0, scale: 0.9 }}
      animate={{ x: node.position.x, y: node.position.y, opacity: 1, scale: 1 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute glass rounded-2xl w-64 cursor-grab active:cursor-grabbing select-none group border-t-[3px] transition-all duration-300 pointer-events-auto shadow-2xl ${
        isSelected ? 'node-selected border-t-brand-primary ring-2 ring-brand-primary/20 z-20' : 'border-t-slate-700 hover:border-t-slate-500 z-10'
      }`}
      style={{ 
        x: node.position.x, 
        y: node.position.y, 
        translateX: '-50%', 
        translateY: '-50%',
        borderTopColor: isSelected ? accentColor : undefined
      }}
    >
      {/* Programming Overlay */}
      <AnimatePresence>
        {node.programming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm rounded-[1.8rem] flex flex-col items-center justify-center p-4"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-2"
              style={{ color: accentColor }}
            >
              <Cpu size={24} />
            </motion.div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic animate-pulse">Writing Logic...</p>
            <div className="mt-3 w-1/2 h-0.5 bg-white/10 rounded-full overflow-hidden">
               <motion.div 
                 animate={{ x: [-100, 200] }}
                 transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                 className="w-1/2 h-full"
                 style={{ backgroundColor: accentColor }}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Processing Pulse (Outer) */}
      {node.status === 'processing' && (
        <motion.div 
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute inset-0 -m-1 rounded-2xl border-2 pointer-events-none"
          style={{ borderColor: accentColor }}
        />
      )}

      {/* Progress Bar */}
      {node.status === 'processing' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden rounded-t-2xl">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, repeat: Infinity }}
            className="h-full"
            style={{ backgroundColor: accentColor }}
          />
        </div>
      )}

      {/* Input Port (Left) */}
      <div 
        className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-brand-dark border-2 border-slate-700 hover:border-brand-primary hover:scale-125 transition-all cursor-crosshair z-30 flex items-center justify-center group/port shadow-lg shadow-black/50"
        onMouseUp={(e) => {
          e.stopPropagation();
          onCompleteConnect(node.id);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPortClick(node.id, 'in', e);
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-slate-600 group-hover/port:bg-brand-primary transition-colors" />
      </div>

      {/* Output Port (Right) */}
      <div 
        className="absolute right-[-14px] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-brand-dark border-2 border-slate-700 hover:border-brand-primary hover:scale-125 transition-all cursor-crosshair z-30 flex items-center justify-center group/port shadow-lg shadow-black/50"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnect(node.id, node.position.x + 128, node.position.y);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPortClick(node.id, 'out', e);
        }}
      >
         <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover/port:scale-110 transition-transform" style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}` }} />
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-1.5 py-0.5 rounded ${
              isAgentLee ? 'bg-purple-500/10 text-purple-400' : 
              isPlatform ? 'bg-blue-500/10 text-brand-primary' : 
              'bg-slate-500/10 text-slate-500'
            }`}>
              {node.category.replace('_', ' ')}
            </span>
            <span className="text-[7px] text-slate-600 font-mono font-bold uppercase tracking-tighter">
              {node.content?.beastId || 'ID_GEN'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 transition-all">
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}
              className="p-1 px-1.5 bg-white/10 rounded-md text-slate-300 hover:text-white hover:bg-white/20 transition-all active:scale-90 border border-white/10"
              title="Minimize node"
            >
              <ChevronRight size={10} className="rotate-90" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-5">
          <div className={`p-2.5 rounded-xl border transition-all duration-500 ${
            isSelected ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-slate-800 border-white/5 text-slate-400'
          }`} style={{ color: isSelected ? accentColor : undefined, borderColor: isSelected ? accentColor + '30' : undefined }}>
              {isPlatform ? (
                <BrandPlatformIcon
                  platformKey={node.platform}
                  fallback={Icon}
                  size={20}
                  className="drop-shadow-[0_0_2px_rgba(255,255,255,0.2)]"
                />
              ) : (
                <Icon size={20} />
              )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[12px] font-black text-white truncate leading-tight tracking-tight uppercase italic">{node.title}</h4>
            <div className="flex items-center gap-1.5 mt-1">
               <div className={`w-1 h-1 rounded-full ${node.status === 'complete' ? 'bg-green-500' : 'bg-brand-primary'}`} style={{ backgroundColor: node.status === 'complete' ? undefined : accentColor }} />
               <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{node.status}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            {Object.entries(node.content || {}).filter(([k]) => k !== 'beastId' && k !== 'timestamp').slice(0, 1).map(([key, val]) => (
              <div key={key} className="bg-slate-900/50 border border-white/5 rounded-lg p-2 flex flex-col gap-1">
                <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">{key}</span>
                <span className="text-[10px] text-slate-300 truncate font-medium italic">"{String(val)}"</span>
              </div>
            ))}
            <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-lg p-2 flex items-center justify-between" style={{ backgroundColor: accentColor + '05', borderColor: accentColor + '20' }}>
               <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest">Receipt Identity</span>
               <span className="text-[8px] font-mono font-bold" style={{ color: accentColor }}>{node.content?.beastId}</span>
            </div>
          </div>

          {isAgentLee && (
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                 <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accentColor }} />
                 <span className="text-[7px] font-black uppercase tracking-tighter" style={{ color: accentColor }}>AI ENGINE ACTIVE</span>
              </div>
              <div className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ backgroundColor: accentColor + '10', color: accentColor }}>GEMINI GOV</div>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-xl shadow-red-500/20 z-40"
      >
        <Trash2 size={10} />
      </button>
    </motion.div>
  );
};

// --- Metallic Background Component ---

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
      ctx.fillStyle = '#050506'; // Deep charcoal/black
      ctx.fillRect(0, 0, width, height);

      const t = time * 0.001;
      const zoom = camera.zoom;
      
      // Precise infinite grid indices based on camera view
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
          
          if (brightness > 80) {
              ctx.shadowBlur = 10 * zoom;
              ctx.shadowColor = 'rgba(255,255,255,0.2)';
          } else {
              ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          const r = (z + 20) * 0.08 * zoom;
          ctx.arc(screenX, screenY, Math.max(0.5, r), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Galactic Dust
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(100, 150, 255, 0.02)';
      for(let i=0; i<5; i++) {
          ctx.fillRect(Math.random()*width, Math.random()*height, 1, 1);
      }
      ctx.globalCompositeOperation = 'source-over';

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
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/[0.01] to-transparent z-10" />
    </div>
  );
};

const SettingsModal = ({ settings, setSettings, isOpen, onClose }: { settings: UISettings, setSettings: (s: UISettings) => void, isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-2xl bg-brand-dark/95 border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3 text-white">
            <Settings size={22} className="text-brand-primary animate-spin-slow" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest italic">Foundry Engine Settings</h2>
              <p className="text-[10px] text-slate-500 font-bold">Customize the Leeway visual core</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 text-white hover:bg-white/10 transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          {/* Accent Color */}
          <section className="space-y-4">
             <div className="flex items-center gap-2">
               <Palette size={14} className="text-brand-primary" />
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Palette</h3>
             </div>
             <div className="grid grid-cols-8 gap-4">
               {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#06b6d4'].map(color => (
                 <button 
                  key={color}
                  onClick={() => setSettings({ ...settings, accentColor: color })}
                  className={`aspect-square rounded-full border-4 transition-all hover:scale-110 active:scale-95 ${settings.accentColor === color ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                 />
               ))}
               <div className="aspect-square rounded-full overflow-hidden border-2 border-white/10 bg-slate-800 flex items-center justify-center">
                  <input 
                    type="color" 
                    value={settings.accentColor} 
                    onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                    className="w-full h-full scale-150 cursor-pointer" 
                  />
               </div>
             </div>
          </section>

          {/* Categorical Logic Colors */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categorical Logic Cores</h3>
             <div className="grid grid-cols-2 gap-4">
               {(Object.keys(settings.categoryColors) as NodeCategory[]).map(cat => (
                 <div key={cat} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-[11px] font-black uppercase text-slate-300 tracking-tighter">{cat.replace('_', ' ')}</span>
                    <input 
                      type="color" 
                      value={settings.categoryColors[cat]} 
                      onChange={(e) => setSettings({ ...settings, categoryColors: { ...settings.categoryColors, [cat]: e.target.value } })}
                      className="w-10 h-6 bg-transparent border-0 cursor-pointer" 
                    />
                 </div>
               ))}
             </div>
          </section>

          {/* Canvas & Galactic Integration */}
          <section className="space-y-6 pt-6 border-t border-white/5">
             <div className="flex items-center gap-2">
               <Globe size={14} className="text-brand-primary" />
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canvas Environments</h3>
             </div>
             
             <div className="space-y-6">
                {/* Background Type Toggle */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-black uppercase text-slate-300 tracking-tighter">Canvas Engine</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Default grid vs Cinematic Galaxy</span>
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setSettings({ ...settings, backgroundType: 'default' })}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${settings.backgroundType === 'default' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >Default</button>
                    <button 
                      onClick={() => setSettings({ ...settings, backgroundType: 'galactic' })}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${settings.backgroundType === 'galactic' ? 'bg-brand-primary/20 text-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >Galactic</button>
                  </div>
                </div>

                {settings.backgroundType === 'galactic' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {/* Galactic Tint */}
                    <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Galaxy Tint</span>
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: settings.galaxyTint }} />
                      </div>
                      <input 
                        type="color" 
                        value={settings.galaxyTint}
                        onChange={(e) => setSettings({ ...settings, galaxyTint: e.target.value })}
                        className="w-full h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden border-0"
                      />
                    </div>

                    {/* Galaxy Density */}
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Density</span>
                        <span className="text-[10px] font-bold text-brand-primary">{settings.galaxyDensity} Elements</span>
                      </div>
                      <input 
                        type="range" 
                        min="200" 
                        max="1200" 
                        step="50"
                        value={settings.galaxyDensity}
                        onChange={(e) => setSettings({ ...settings, galaxyDensity: parseInt(e.target.value) })}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                      />
                    </div>

                    {/* Galaxy Style */}
                    <div className="md:col-span-2 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mixed Elements Style</span>
                      <select 
                        value={settings.galaxyStyle}
                        onChange={(e) => setSettings({ ...settings, galaxyStyle: e.target.value as any })}
                        className="bg-black/40 text-[10px] font-black uppercase text-white tracking-widest p-2 rounded-xl border border-white/10 outline-none"
                      >
                        <option value="all">Full Galaxy (Mixed)</option>
                        <option value="shards">Glass Fragments</option>
                        <option value="orbs">Soft Pulsars</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => setSettings({ ...settings, galaxyTint: settings.accentColor, galaxyDensity: 700, galaxyStyle: 'all' })}
                      className="md:col-span-2 py-3 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white rounded-xl transition-all border border-dashed border-white/10"
                    >
                      Sync with Accent Theme
                    </button>
                  </motion.div>
                )}
             </div>
          </section>

          {/* Panel Aesthetics */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Structural Transparency</h3>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Left Panel Glass</label>
                  <div className="flex gap-3">
                    {['rgba(10, 11, 14, 0.95)', 'rgba(23, 23, 23, 0.95)', 'rgba(30, 41, 59, 0.95)'].map(bg => (
                      <button 
                        key={bg} 
                        onClick={() => setSettings({ ...settings, leftPanelBg: bg })}
                        className={`w-8 h-8 rounded-lg border-2 ${settings.leftPanelBg === bg ? 'border-brand-primary' : 'border-transparent'}`}
                        style={{ backgroundColor: bg }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Right Panel Glass</label>
                   <div className="flex gap-3">
                    {['rgba(10, 11, 14, 0.95)', 'rgba(15, 23, 42, 0.95)', 'rgba(2, 6, 23, 0.95)'].map(bg => (
                      <button 
                        key={bg} 
                        onClick={() => setSettings({ ...settings, rightPanelBg: bg })}
                        className={`w-8 h-8 rounded-lg border-2 ${settings.rightPanelBg === bg ? 'border-brand-primary' : 'border-transparent'}`}
                        style={{ backgroundColor: bg }}
                      />
                    ))}
                  </div>
                </div>
             </div>
          </section>

          {/* Geometric Precision */}
          <section className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Geometric Precision</h3>
             <div className="space-y-6">
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-[11px] font-bold text-slate-300">Foundry Button Rounding</span>
                     <span className="text-[10px] font-mono text-brand-primary">{settings.buttonRounding}</span>
                   </div>
                   <div className="flex gap-2">
                     {['0rem', '0.5rem', '1rem', '1.5rem', '2rem'].map(r => (
                        <button 
                          key={r}
                          onClick={() => setSettings({ ...settings, buttonRounding: r })}
                          className={`flex-1 py-3 border border-white/10 rounded-xl font-bold text-[10px] transition-all ${settings.buttonRounding === r ? 'bg-brand-primary text-white' : 'bg-white/5 text-slate-500'}`}
                          style={{ borderRadius: r }}
                        >
                          {r === '0rem' ? 'Sharp' : r === '1rem' ? 'Curved' : 'Organic'}
                        </button>
                     ))}
                   </div>
                </div>
             </div>
          </section>
        </div>

        <div className="p-8 border-t border-white/10 bg-white/[0.01] flex justify-end">
           <button 
            onClick={onClose}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-[10px] transition-all"
           >
             Close Console
           </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Galaxy Background Component ---

const GalaxyBackground = ({ tint, density, style }: { tint: string, density: number, style: 'all' | 'shards' | 'orbs' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width: number, height: number, dpr: number;
    let shapes: any[] = [];
    let offsetX = 0;
    const offsetY = 0;    let animationFrameId: number;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initShapes();
    };

    const initShapes = () => {
      shapes = [];
      const count = Math.min(density, 2000); // Sanity cap
      for (let i = 0; i < count; i++) {
        shapes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 3 + 1,
          parallax: Math.random() * 0.7 + 0.2,
          type: Math.random(),
          rotSpeed: (Math.random() - 0.5) * 0.02,
          rotation: Math.random() * Math.PI,
          opacity: Math.random() * 0.6 + 0.2
        });
      }
    };

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r},${g},${b}`;
    };

    const draw = (time: number) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      offsetX += 0.3; // Gentle drift

      ctx.globalCompositeOperation = 'screen';
      const rgb = hexToRgb(tint);

      shapes.forEach(s => {
        let x = (s.x + offsetX * s.parallax) % width;
        let y = (s.y + offsetY * s.parallax) % height;
        if (x < 0) x += width;
        if (y < 0) y += height;

        const pulse = Math.sin(time * 0.001 + s.x) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(${rgb}, ${s.opacity * pulse})`;
        ctx.strokeStyle = `rgba(${rgb}, ${s.opacity * 0.4})`;

        const mode = style === 'all' ? (s.type > 0.5 ? 'shards' : 'orbs') : style;

        if (mode === 'orbs') {
          ctx.beginPath();
          ctx.arc(x, y, s.size * 6 * pulse, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(s.rotation + time * s.rotSpeed);
          ctx.beginPath();
          ctx.moveTo(-s.size * 3, -s.size * 2);
          ctx.lineTo(s.size * 4, 0);
          ctx.lineTo(0, s.size * 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      });

      ctx.globalCompositeOperation = 'source-over';
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [tint, density, style]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: '#000' }}
    />
  );
};

// --- Creative Studio Component ---

const CreativeStudio = ({ isOpen, onClose, onSave, settings }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (item: any) => void,
  settings: UISettings 
}) => {
  const [activeTab, setActiveTab] = useState<'images' | 'stories' | 'video'>('images');
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleGenerate = () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    // Simulate Agent Lee's creation process
    setTimeout(() => {
      const newItem = {
        id: Date.now(),
        type: activeTab,
        name: `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - ${prompt.substring(0, 20)}...`,
        content: activeTab === 'images' ? 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=800' : 
                 activeTab === 'stories' ? 'Once upon a time in a galaxy far away...' :
                 'Video Clip Content Simulation',
        timestamp: new Date().toLocaleString()
      };
      setResults(prev => [newItem, ...prev]);
      setIsGenerating(false);
      setPrompt('');
    }, 3000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-3xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-6xl h-full max-h-[800px] bg-brand-dark/95 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary border border-brand-primary/30">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Lee's Creative Studio</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">High-Fidelity Content Generation & Orchestration</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/5 p-6 space-y-2">
                {[
                  { id: 'images', icon: ImageIcon, label: 'Visual Arts' },
                  { id: 'stories', icon: PenTool, label: 'Story Desk' },
                  { id: 'video', icon: Film, label: 'Clip Studio' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTab === tab.id ? 'bg-brand-primary text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}
                    style={{ backgroundColor: activeTab === tab.id ? settings.accentColor : undefined }}
                  >
                    <tab.icon size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Creation Control */}
                <div className="p-8 bg-black/40 border-b border-white/5">
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={activeTab === 'images' ? "Describe the visual you want Agent Lee to envision..." : 
                                  activeTab === 'stories' ? "What narrative beats should Lee explore today?" :
                                  "Outline the scene for this high-power video clip..."}
                      className="w-full h-32 bg-white/5 rounded-3xl p-6 text-white text-sm outline-none border border-white/10 focus:border-brand-primary/50 transition-all resize-none placeholder:text-slate-600 font-medium"
                    />
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt}
                      className={`absolute bottom-4 right-4 px-8 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all ${isGenerating ? 'bg-slate-800 text-slate-500' : 'bg-brand-primary text-white shadow-2xl hover:scale-105 active:scale-95'}`}
                      style={{ backgroundColor: !isGenerating ? settings.accentColor : undefined }}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          Envisioning...
                        </>
                      ) : (
                        <>
                          <Cpu size={14} />
                          Generate with Lee
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Results Grid */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.filter(r => r.type === activeTab).map(result => (
                      <motion.div 
                        key={result.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group bg-white/5 rounded-3xl border border-white/5 overflow-hidden hover:border-brand-primary/30 transition-all flex flex-col"
                      >
                        <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                          {result.type === 'images' ? (
                            <img src={result.content} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                          ) : result.type === 'stories' ? (
                            <div className="p-6 text-[10px] text-slate-400 font-medium leading-relaxed italic">{result.content}</div>
                          ) : (
                            <Film size={32} className="text-slate-800" />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all">
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                onSave(result);
                                // Feedback animation or state could go here
                              }}
                              className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white hover:scale-110 transition-all shadow-xl"
                              style={{ backgroundColor: settings.accentColor }}
                            >
                              <Save size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 bg-white/[0.02] border-t border-white/5">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{result.name}</p>
                          <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">{result.timestamp}</p>
                        </div>
                      </motion.div>
                    ))}
                    {results.filter(r => r.type === activeTab).length === 0 && (
                      <div className="col-span-full h-[300px] flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                        <Sparkles size={48} className="opacity-10 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest italic opacity-40">Ready to visualize your next creation</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- Content Timeline Component ---

const CreationTimeline = ({ isOpen, onClose, items, settings }: { 
  isOpen: boolean, 
  onClose: () => void, 
  items: any[],
  settings: UISettings 
}) => {
  return (
    <motion.div 
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: isOpen ? 0 : -300, opacity: isOpen ? 1 : 0 }}
      className={`absolute left-72 top-20 bottom-24 w-80 z-40 flex flex-col border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl ${!isOpen && 'pointer-events-none'}`}
      style={{ backgroundColor: settings.leftPanelBg, borderRadius: settings.buttonRounding }}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand-primary" style={{ color: settings.accentColor }} />
          <h2 className="text-xs font-black uppercase tracking-widest text-white italic">Creation Timeline</h2>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-white/10" />

        <div className="space-y-8">
          {items.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-8 flex flex-col group"
            >
              {/* Dot on line */}
              <div 
                className="absolute left-[3.5px] top-1.5 w-3 h-3 rounded-full border-2 border-brand-dark z-10 transition-transform group-hover:scale-125"
                style={{ backgroundColor: settings.accentColor }}
              />

              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.timestamp}</span>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl group-hover:border-brand-primary/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                   <div className="p-2 bg-white/5 rounded-lg text-slate-400">
                      {item.type === 'images' ? <ImageIcon size={14} /> : item.type === 'video' ? <Film size={14} /> : <PenTool size={14} />}
                   </div>
                   <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{item.name}</p>
                </div>
                
                {item.type === 'images' && (
                  <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-black">
                     <img src={item.content} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                  </div>
                )}

                <div className="flex items-center justify-between">
                   <span className="text-[8px] text-slate-500 font-bold uppercase">{item.type} Generated</span>
                   <button 
                    className="p-2 bg-white/5 hover:bg-brand-primary rounded-lg text-white transition-all hover:scale-110"
                    style={{ backgroundColor: settings.accentColor + '20', color: settings.accentColor }}
                   >
                     <Eye size={12} />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 opacity-20 text-center">
               <Layers size={32} className="mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">No creations indexed<br/>in the foundry yet</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-black/40 border-t border-white/5">
        <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all">
          Clear History
        </button>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<WorkflowEdge[]>(INITIAL_EDGES);
  const [walletContent, setWalletContent] = useState<ContentItem[]>(INITIAL_MOCK_CONTENT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.73 });
  const [dragEdge, setDragEdge] = useState<{ fromNodeId: string, toX: number, toY: number } | null>(null);
  const [portMenu, setPortMenu] = useState<{ nodeId: string, type: 'in' | 'out', x: number, y: number } | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [settings, setSettings] = useState<UISettings>(DEFAULT_SETTINGS);
  const [isCreationsOpen, setIsCreationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContentWalletOpen, setIsContentWalletOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [createdItems, setCreatedItems] = useState<CreatedItem[]>([]);

  const handleAddCreation = (item: CreatedItem) => {
    setCreatedItems((prev: CreatedItem[]) => [item, ...prev]);
    // Also save to global wallet
    handleSaveToWallet({
      id: `creative-${Date.now()}`,
      beastId: `LEEWAY-CREATIVE-${Math.floor(Math.random() * 9000) + 1000}`,
      type: item.type === 'images' ? 'image' : 
            item.type === 'video' ? 'video' : 'pdf',
      name: item.name,
      category: 'Creative Hub',
      timestamp: new Date().toLocaleString()
    });
  };

  const runWorkflow = () => {
    if (nodes.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    setNotification("Sequence Initiated: Processing Foundry Chain...");
    
    const processNext = (index: number) => {
      if (index >= nodes.length) {
        setIsProcessing(false);
        setNotification("Foundry Sequence Complete: Results Dispatched to Wallet");
        setTimeout(() => setNotification(null), 3000);
        
        handleSaveToWallet({
          id: `conv-${Date.now()}`,
          beastId: `LEEWAY-CONV-${Math.floor(Math.random() * 9000) + 1000}`,
          type: 'video',
          name: 'Final Rendered Masterpiece.mp4',
          category: 'Converted',
          timestamp: new Date().toLocaleString(),
          fileData: 'MOCK_DATA'
        });
        
        // Trigger Lee's success voice if active
        window.dispatchEvent(new CustomEvent('workflow-success'));
        return;
      }

      const node = nodes[index];
      setNodes((prev: WorkflowNode[]) => prev.map((n: WorkflowNode) => n.id === node.id ? { ...n, status: 'processing', programming: true } : n));
      
      setTimeout(() => {
        setNodes((prev: WorkflowNode[]) => prev.map((n: WorkflowNode) => n.id === node.id ? { ...n, status: 'complete', programming: false } : n));
        processNext(index + 1);
      }, 1500);
    };

    processNext(0);
  };

  const handleSaveApp = () => {
    setNotification("Foundry State Synchronized Locally");
    setTimeout(() => setNotification(null), 2500);
  };

  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      const type = file.type.includes('pdf') ? 'pdf' : 
                   file.type.includes('video') ? 'video' : 
                   file.type.includes('audio') ? 'audio' : 
                   file.type.includes('short') ? 'short' : 'image';
      
      const newItem: ContentItem = {
        id: `c-${Date.now()}`,
        beastId: `LEEWAY-${type.toUpperCase().substring(0, 1)}-${Math.floor(Math.random() * 9000) + 1000}`,
        type: type as any,
        name: file.name,
        category: 'Uploaded',
        timestamp: new Date().toLocaleString(),
        fileData: base64
      };
      setWalletContent((prev: ContentItem[]) => [newItem, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const addNodeAtPosition = (paletteId: string, x = 500, y = 300, customConfig = {}) => {
    const paletteItem = NODE_PALETTE.find(p => p.id === paletteId);
    if (!paletteItem) return '';

    const beastPrefix = paletteItem.category === 'platform' ? 'PLAT' : 
                       paletteItem.category === 'agent_lee' ? 'AI' : 'UTIL';
    const newNodeId = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id: newNodeId,
      type: paletteId,
      category: paletteItem.category as NodeCategory,
      title: paletteItem.title,
      position: { x, y },
      config: { ...paletteItem.config, ...customConfig },
      content: { 
        beastId: `LEEWAY-${beastPrefix}-${Math.floor(Math.random() * 9000) + 1000}`,
        timestamp: new Date().toLocaleString()
      },
      status: 'idle',
      platform: (paletteItem as any).platform,
      isCollapsed: paletteItem.category === 'platform'
    };
    setNodes((prev: WorkflowNode[]) => [...prev, newNode]);
    setSelectedNodeId(newNodeId);
    return newNodeId;
  };

  const connectNodesById = (sourceId: string, targetId: string) => {
    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      sourceNodeId: sourceId,
      targetNodeId: targetId
    };
    setEdges((prev: WorkflowEdge[]) => [...prev, newEdge]);
  };

  const handleContentDragStart = (item: ContentItem) => {
    // Optionally store the dragged item info
  };

  const handleDrop = (e: React.DragEvent) => {
    // Logic to handle dropping content into the workflow to create a node
  };

  const handlePortClick = (nodeId: string, type: 'in' | 'out', e: React.MouseEvent) => {
    e.stopPropagation();
    setPortMenu({ nodeId, type, x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate world coordinates adjusted for camera pan and zoom
    const worldX = (e.clientX - rect.left - camera.x) / camera.zoom;
    const worldY = (e.clientY - rect.top - camera.y) / camera.zoom;

    if (dragEdge) {
      setDragEdge({ ...dragEdge, toX: worldX, toY: worldY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSpeed = 0.001;
    const newZoom = Math.min(Math.max(camera.zoom - e.deltaY * zoomSpeed, 0.2), 3);
    setCamera((prev: Camera) => ({ ...prev, zoom: newZoom }));
  };

  const handleCanvasPan = (e: any, info: any) => {
    // Only pan if we're not dragging a node (handled by stopPropagation)
    setCamera((prev: Camera) => ({
      ...prev,
      x: prev.x + info.delta.x,
      y: prev.y + info.delta.y
    }));
  };

  const handleMouseUp = () => {
    setDragEdge(null);
  };

  const startConnect = (fromNodeId: string, x: number, y: number) => {
    setDragEdge({ fromNodeId, toX: x, toY: y });
  };

  const completeConnect = (targetNodeId: string) => {
    if (dragEdge && dragEdge.fromNodeId !== targetNodeId) {
      const newEdge: WorkflowEdge = {
        id: `edge-${Date.now()}`,
        sourceNodeId: dragEdge.fromNodeId,
        targetNodeId
      };
      setEdges((prev: WorkflowEdge[]) => {
        // Prevent duplicate edges
        if (prev.find((e: WorkflowEdge) => e.sourceNodeId === newEdge.sourceNodeId && e.targetNodeId === newEdge.targetNodeId)) return prev;
        return [...prev, newEdge];
      });
    }
    setDragEdge(null);
  };

  const updateNodePosition = (id: string, x: number, y: number) => {
    setNodes((prev: WorkflowNode[]) => prev.map((n: WorkflowNode) => n.id === id ? { ...n, position: { x, y } } : n));
  };

  const updateNode = (updatedNode: WorkflowNode) => {
    setNodes((prev: WorkflowNode[]) => prev.map((n: WorkflowNode) => n.id === updatedNode.id ? updatedNode : n));
  };

  const deleteNode = (id: string) => {
    setNodes((prev: WorkflowNode[]) => prev.filter((n: WorkflowNode) => n.id !== id));
    setEdges((prev: WorkflowEdge[]) => prev.filter((e: WorkflowEdge) => e.sourceNodeId !== id && e.targetNodeId !== id));
    setSelectedNodeId(null);
  };

  const toggleNodeCollapse = (id: string) => {
    setNodes((prev: WorkflowNode[]) => prev.map((n: WorkflowNode) => n.id === id ? { ...n, isCollapsed: !n.isCollapsed } : n));
  };

  const selectedNode = nodes.find((n: WorkflowNode) => n.id === selectedNodeId) || null;

  const handleSaveToWallet = (item: ContentItem) => {
    setWalletContent((prev: ContentItem[]) => [item, ...prev]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050506] text-slate-200 relative selection:bg-brand-primary/30">
      {settings.backgroundType === 'galactic' ? (
        <GalaxyBackground tint={settings.galaxyTint} density={settings.galaxyDensity} style={settings.galaxyStyle} />
      ) : (
        <MetallicBackground camera={camera} />
      )}

      <CreativeStudio 
        isOpen={isCreationsOpen}
        onClose={() => setIsCreationsOpen(false)}
        onSave={handleAddCreation}
        settings={settings}
      />

      <CreationTimeline 
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        items={createdItems}
        settings={settings}
      />

      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal 
            settings={settings} 
            setSettings={setSettings} 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isContentWalletOpen && (
          <ContentWallet 
            settings={settings} 
            onClose={() => setIsContentWalletOpen(false)} 
            onDragStart={handleContentDragStart}
            content={walletContent}
            onUpload={handleFileUpload}
          />
        )}
      </AnimatePresence>

      <AgentLeeLive 
        settings={settings}
        nodes={nodes}
        connections={edges}
        onAddNode={addNodeAtPosition}
        onConnectNodes={connectNodesById}
        onUpdateNodeConfig={(id, updates) => setNodes((prev: WorkflowNode[]) => prev.map((n: WorkflowNode) => {
          if (n.id === id) {
            const { config, ...rest } = updates;
            return { 
              ...n, 
              ...rest, 
              config: { ...n.config, ...(config || {}) } 
            };
          }
          return n;
        }))}
        onDeleteNode={deleteNode}
        onSaveToWallet={handleSaveToWallet}
        onRunWorkflow={runWorkflow}
        isProcessing={isProcessing}
      />

      <div className={`relative transition-all duration-500 ease-in-out z-20 ${isLeftPanelCollapsed ? 'w-0' : 'w-64'}`}>
        {!isLeftPanelCollapsed && (
          <div className="w-full h-full backdrop-blur-md">
            <NodePalette 
              onAddNode={(p) => addNodeAtPosition(p.id)} 
              settings={settings} 
              onToggleWallet={() => setIsContentWalletOpen(!isContentWalletOpen)}
              isWalletOpen={isContentWalletOpen}
              onToggleCreations={() => setIsCreationsOpen(!isCreationsOpen)}
              onToggleTimeline={() => setIsTimelineOpen(!isTimelineOpen)}
              isTimelineOpen={isTimelineOpen}
            />
          </div>
        )}
        <button 
          onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 z-[60] w-6 h-12 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all ${isLeftPanelCollapsed ? 'left-0 rounded-r-lg shadow-2xl shadow-black' : 'right-0 -mr-3 rounded-lg shadow-xl'}`}
        >
          <ChevronRight size={14} className={`transition-transform duration-500 ${isLeftPanelCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <main className="flex-1 relative flex flex-col overflow-hidden z-10">
        {/* Header */}
        <header className="h-[60px] px-6 flex items-center justify-between border-b border-white/10 z-30 bg-brand-dark/30 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-black tracking-tight text-white uppercase italic">
              <span className="mr-2" style={{ color: settings.accentColor }}>Leeway OS</span>
              <span className="opacity-20 mr-2">|</span>
              Leeway Content Foundry
            </h1>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest italic">
              <span>Nodes: {nodes.length}</span>
              <span>Zoom: {Math.round(camera.zoom * 100)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <motion.button 
              whileHover={{ y: -4, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
            >
              <Settings size={18} />
            </motion.button>

            <div className="flex bg-slate-900/50 rounded-xl border border-white/10 p-1 mr-2 scale-90">
              <button 
                onClick={() => setCamera(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.1, 3) }))}
                className="px-3 py-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Zoom In"
              ><Plus size={14} /></button>
              <button 
                onClick={() => setCamera(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.1, 0.2) }))}
                className="px-3 py-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Zoom Out"
              ><LogOut size={14} className="rotate-90" /></button>
              <button 
                onClick={() => setCamera({ x: 0, y: 0, zoom: 0.73 })}
                className="px-3 py-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-[9px] font-black"
              >1:1</button>
            </div>

            <motion.button 
              whileHover={{ y: -4, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveApp}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-700 hover:bg-slate-700 transition-all shadow-lg"
            >
              <Save size={14} /> Save
            </motion.button>
            
            <motion.button 
              whileHover={{ y: -4, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runWorkflow}
              className="flex items-center gap-2 px-6 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-xl"
              style={{ 
                backgroundColor: settings.accentColor,
                boxShadow: `0 8px 24px ${settings.accentColor}40`
              }}
            >
              <Play size={14} fill="currentColor" /> {isProcessing ? 'Processing...' : 'Run Routine'}
            </motion.button>
          </div>
        </header>

        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[70px] left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-brand-dark/90 backdrop-blur-xl border border-brand-primary/30 rounded-full shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <Activity size={14} className="text-brand-primary animate-pulse" style={{ color: settings.accentColor }} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{notification}</span>
            </div>
          </motion.div>
        )}

        {/* Workflow Canvas */}
        <div 
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={() => {
            setSelectedNodeId(null);
            setPortMenu(null);
          }}
          className="flex-1 relative overflow-hidden bg-transparent cursor-default"
        >
            {/* Global Infrastructure Layer (Stationary Grid) */}
            <div 
              className="absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => {
                const target = e.target as HTMLElement;
                if (target.classList.contains('canvas-area')) {
                  target.setPointerCapture(e.pointerId);
                }
              }}
              style={{ padding: '0' }}
            >
              <motion.div 
                onPan={handleCanvasPan}
                className="absolute inset-0 canvas-area"
              />
            </div>

            <motion.div
              style={{ 
                x: camera.x, 
                y: camera.y, 
                scale: camera.zoom,
                transformOrigin: "0 0" 
              }}
              className="absolute inset-0 pointer-events-none"
            >

            <div className="absolute inset-0 pointer-events-none">
              <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none overflow-visible">
                <g className="pointer-events-auto">
                {/* Edges */}
                {edges.map((edge) => {
                  const from = nodes.find(n => n.id === edge.sourceNodeId);
                  const to = nodes.find(n => n.id === edge.targetNodeId);
                  if (!from || !to) return null;
                  return (
                    <ConnectionLine 
                      key={edge.id} 
                      id={edge.id} 
                      fromNode={from} 
                      toNode={to} 
                      color={edge.color}
                      onDelete={(id) => setEdges(prev => prev.filter(e => e.id !== id))} 
                    />
                  );
                })}

                {/* Temp Edge while dragging */}
                {dragEdge && (
                  <ConnectionLine 
                    id="temp" 
                    fromNode={nodes.find(n => n.id === dragEdge.fromNodeId)!} 
                    toNode={{ position: { x: dragEdge.toX + 130, y: dragEdge.toY } } as any} 
                  />
                )}
              </g>
            </svg>

            {/* Nodes */}
            <div className="absolute inset-0 pointer-events-none">
              {nodes.map((node) => (
                <NodeCard 
                  key={node.id} 
                  node={node} 
                  isSelected={selectedNodeId === node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  onDrag={updateNodePosition}
                  onStartConnect={startConnect}
                  onCompleteConnect={completeConnect}
                  onDelete={deleteNode}
                  onToggleCollapse={toggleNodeCollapse}
                  onPortClick={handlePortClick}
                  zoom={camera.zoom}
                  accentColor={settings.accentColor}
                  onUpdateNode={updateNode}
                />
              ))}
            </div>
          </div>
        </motion.div>

          {/* Port Context Menu */}
          {portMenu && (
            <PortMenu 
              {...portMenu}
              edges={edges}
              nodes={nodes}
              onClose={() => setPortMenu(null)}
              onDisconnect={(edgeId) => setEdges(prev => prev.filter(e => e.id !== edgeId))}
              onStartConnect={(nodeId) => {
                const node = nodes.find(n => n.id === nodeId);
                if (node) startConnect(nodeId, node.position.x + 130, node.position.y);
              }}
            />
          )}

          <div className="absolute bottom-6 left-6 flex gap-3 pointer-events-none">
             <div className="glass px-4 py-2 rounded-lg border-b-2 border-brand-primary">
                <div className="text-[8px] text-slate-500 uppercase font-bold mb-1">Session ID</div>
                <div className="text-[10px] text-white font-mono">LEEWAY-PRO-9283</div>
             </div>
             <div className="glass px-4 py-2 rounded-lg border-b-2 border-green-500">
                <div className="text-[8px] text-slate-500 uppercase font-bold mb-1">Foundry Status</div>
                <div className="text-[10px] text-green-400 font-mono">OPERATIONAL</div>
             </div>
          </div>
        </div>
      </main>

      <div className={`relative transition-all duration-500 ease-in-out z-20 ${isRightPanelCollapsed ? 'w-0' : 'w-96'}`}>
        {!isRightPanelCollapsed && (
          <div className="w-full h-full backdrop-blur-md">
            <PropertiesPanel 
              node={selectedNode} 
              onUpdateNode={updateNode} 
              onDeleteNode={deleteNode} 
              settings={settings}
            />
          </div>
        )}
        <button 
          onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
          className={`absolute top-1/2 -translate-y-1/2 z-[60] w-6 h-12 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all ${isRightPanelCollapsed ? 'right-0 rounded-l-lg' : 'left-0 -ml-3 rounded-lg shadow-xl'}`}
        >
          <ChevronRight size={14} className={`transition-transform duration-500 ${isRightPanelCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}
