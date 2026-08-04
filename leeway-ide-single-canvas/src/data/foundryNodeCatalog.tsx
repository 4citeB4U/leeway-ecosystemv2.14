/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.FOUNDRY.NODE_CATALOG
 * PURPOSE: LeeWay Content Foundry node palette, defaults, and runtime helpers for Leeway IDE.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 */

import React from "react";
import {
  Activity,
  Clock,
  Facebook,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Linkedin,
  MessageSquare,
  PlayCircle,
  Share2,
  Twitter,
  Video,
  Youtube,
  ClipboardList,
  Zap,
} from "lucide-react";
import { NodeDefinition, NodeInstance } from "../types/nodeTypes";

export type FoundryNodeCategory = "content" | "platform" | "utility" | "agent_lee";
export type FoundryNodeStatus = "idle" | "running" | "processing" | "complete" | "error";

export interface FoundryPlatformDefinition {
  key: string;
  name: string;
  domain: string;
  automationTool: string;
  icon: React.ReactNode;
}

export interface FoundryTemplateMeta {
  foundry: true;
  foundryId: string;
  category: FoundryNodeCategory;
  config?: Record<string, any>;
  content?: Record<string, any>;
  schedule?: Record<string, any>;
  inputs?: string[];
  outputs?: string[];
  platform?: string;
  deployTool?: string;
  supportsScheduling?: boolean;
  runBehavior?: string;
}

export const FOUNDRY_CATEGORY_COLORS: Record<FoundryNodeCategory, string> = {
  agent_lee: "#8b5cf6",
  content: "#3b82f6",
  platform: "#10b981",
  utility: "#f59e0b",
};

export const FOUNDRY_PLATFORMS: FoundryPlatformDefinition[] = [
  { key: "facebook_page", name: "Facebook", icon: <Facebook className="w-4 h-4" />, domain: "facebook.com", automationTool: "deploy_to_facebook" },
  { key: "instagram_business", name: "Instagram", icon: <ImageIcon className="w-4 h-4" />, domain: "instagram.com", automationTool: "deploy_to_instagram" },
  { key: "tiktok_account", name: "TikTok", icon: <Video className="w-4 h-4" />, domain: "tiktok.com", automationTool: "deploy_to_tiktok" },
  { key: "youtube_channel", name: "YouTube", icon: <Youtube className="w-4 h-4" />, domain: "youtube.com", automationTool: "deploy_to_youtube" },
  { key: "x_user", name: "X", icon: <Twitter className="w-4 h-4" />, domain: "x.com", automationTool: "deploy_to_x" },
  { key: "linkedin_profile", name: "LinkedIn", icon: <Linkedin className="w-4 h-4" />, domain: "linkedin.com", automationTool: "deploy_to_linkedin" },
  { key: "pinterest_board", name: "Pinterest", icon: <Share2 className="w-4 h-4" />, domain: "pinterest.com", automationTool: "deploy_to_pinterest" },
  { key: "reddit", name: "Reddit", icon: <MessageSquare className="w-4 h-4" />, domain: "reddit.com", automationTool: "deploy_to_reddit" },
  { key: "snapchat_spotlight", name: "Snapchat", icon: <Video className="w-4 h-4" />, domain: "snapchat.com", automationTool: "deploy_to_snapchat" },
  { key: "discord", name: "Discord", icon: <MessageSquare className="w-4 h-4" />, domain: "discord.com", automationTool: "deploy_to_discord" },
  { key: "telegram_channel", name: "Telegram", icon: <Share2 className="w-4 h-4" />, domain: "telegram.org", automationTool: "deploy_to_telegram" },
  { key: "threads", name: "Threads", icon: <MessageSquare className="w-4 h-4" />, domain: "threads.net", automationTool: "deploy_to_threads" },
  { key: "whatsapp_business", name: "WhatsApp", icon: <MessageSquare className="w-4 h-4" />, domain: "whatsapp.com", automationTool: "deploy_to_whatsapp" },
  { key: "messenger_page", name: "Messenger", icon: <MessageSquare className="w-4 h-4" />, domain: "messenger.com", automationTool: "deploy_to_messenger" },
  { key: "wechat_official_account", name: "WeChat", icon: <MessageSquare className="w-4 h-4" />, domain: "wechat.com", automationTool: "deploy_to_wechat" },
  { key: "weibo", name: "Weibo", icon: <MessageSquare className="w-4 h-4" />, domain: "weibo.com", automationTool: "deploy_to_weibo" },
  { key: "kuaishou", name: "Kuaishou", icon: <Video className="w-4 h-4" />, domain: "kuaishou.com", automationTool: "deploy_to_kuaishou" },
  { key: "line", name: "LINE", icon: <MessageSquare className="w-4 h-4" />, domain: "line.me", automationTool: "deploy_to_line" },
  { key: "vk", name: "VK", icon: <Share2 className="w-4 h-4" />, domain: "vk.com", automationTool: "deploy_to_vk" },
  { key: "tumblr", name: "Tumblr", icon: <Share2 className="w-4 h-4" />, domain: "tumblr.com", automationTool: "deploy_to_tumblr" },
  { key: "substack", name: "Substack", icon: <FileText className="w-4 h-4" />, domain: "substack.com", automationTool: "deploy_to_substack" },
  { key: "wordpress", name: "WordPress", icon: <Globe className="w-4 h-4" />, domain: "wordpress.org", automationTool: "deploy_to_wordpress" },
  { key: "notion", name: "Notion", icon: <FileText className="w-4 h-4" />, domain: "notion.so", automationTool: "deploy_to_notion" },
  { key: "notebooklm_workspace", name: "NotebookLM", icon: <FileText className="w-4 h-4" />, domain: "notebooklm.google", automationTool: "deploy_to_notebooklm" },
];

function foundryNode(
  foundryId: string,
  title: string,
  description: string,
  category: FoundryNodeCategory,
  icon: React.ReactNode,
  config: Record<string, any>,
  content: Record<string, any>,
  inputs: string[] = [],
  outputs: string[] = [],
  extra: Partial<FoundryTemplateMeta> = {}
): NodeDefinition {
  return {
    type: `foundry.${foundryId}`,
    title,
    description,
    icon,
    category: category === "agent_lee" ? "Agent Lee Clusters" : category === "platform" ? "Deployment Nodes" : category === "utility" ? "Utility Clusters" : "Content Nodes",
    defaultWidth: category === "platform" ? 320 : 380,
    defaultHeight: category === "platform" ? 330 : 390,
    minWidth: 280,
    minHeight: 240,
    resizable: true,
    data: {
      foundry: true,
      foundryId,
      category,
      config,
      content,
      schedule: { scheduled_at: "", timezone: "UTC", status: "unscheduled" },
      inputs,
      outputs,
      supportsScheduling: true,
      ...extra,
    } satisfies FoundryTemplateMeta,
  };
}

const agentLeeNodes: NodeDefinition[] = [
  foundryNode("pdf_to_story", "PDF -> Story", "Convert source PDFs into stories or narratives", "agent_lee", <FileText className="w-4 h-4" />, { length: "Medium", genre: "Sci-Fi", pov: "Third-person", tone: "Serious" }, { source_pdf: "" }, ["source_pdf"], ["story"], { runBehavior: "generate_story_from_pdf" }),
  foundryNode("story_to_script", "Story -> Movie Script", "Turn story content into timed script output", "agent_lee", <PlayCircle className="w-4 h-4" />, { duration: "3m", tone: "Dramatic", narration_only: false }, { source_story: "" }, ["source_story"], ["script"], { runBehavior: "generate_script_from_story" }),
  foundryNode("script_to_images", "Script -> Images", "Generate image prompts and visual boards from scripts", "agent_lee", <Activity className="w-4 h-4" />, { style: "Realistic", auto_portrait: true }, { source_script: "" }, ["source_script"], ["images"], { runBehavior: "generate_images_from_script" }),
  foundryNode("images_to_movie", "Images -> Movie", "Render image sequences into short or long-form video", "agent_lee", <Video className="w-4 h-4" />, { video_type: "Shorts", aspect_ratio: "9:16", voice_style: "Narrative" }, { source_images: "" }, ["source_images"], ["movie"], { runBehavior: "render_movie_from_images" }),
  foundryNode("movie_to_blog", "Movie -> Blog", "Create blogs, recaps, or commentary from rendered video", "agent_lee", <FileText className="w-4 h-4" />, { blog_style: "Recap", auto_translate: ["es"], auto_sections: true }, { source_movie: "" }, ["source_movie"], ["blog"], { runBehavior: "generate_blog_from_movie" }),
  foundryNode("agent_lee_social", "Agent Lee -> Social Posts", "Generate platform-specific social posts and hooks", "agent_lee", <MessageSquare className="w-4 h-4" />, { auto_schedule: true, platform_hooks: true, active_platforms: ["x_user", "facebook_page", "linkedin_profile", "tiktok_account"] }, { source_text: "" }, ["source_text"], ["x_posts", "facebook_posts", "linkedin_posts", "tiktok_shorts_prompts"], { runBehavior: "generate_cross_platform_social" }),
  foundryNode("image_to_thumb_raw", "Image -> Thumbnails (Raw)", "Create raw thumbnail candidates for platform-specific review", "agent_lee", <ImageIcon className="w-4 h-4" />, { platforms: ["YouTube", "TikTok"], auto_select_best: true }, { source_image: "" }, ["source_image"], ["thumbnails"], { runBehavior: "generate_thumbnail_candidates" }),
  foundryNode("thumb_best_pick", "Thumbnail -> Best Pick", "Pick, approve, or override the best thumbnail result", "agent_lee", <ClipboardList className="w-4 h-4" />, { pick_method: "manual" }, { source_thumbnails: "" }, ["source_thumbnails"], ["chosen_thumbnail"], { runBehavior: "select_best_thumbnail" }),
];

const platformNodes: NodeDefinition[] = FOUNDRY_PLATFORMS.map((platform) =>
  foundryNode(
    `${platform.key}_deploy`,
    `Deploy to ${platform.name}`,
    `Deploy, schedule, and sync content through ${platform.domain}`,
    "platform",
    platform.icon,
    { auto_sync: true, agent_automation: true, deploy_tool: platform.automationTool, target: "production" },
    { caption: "", tags: [], asset_ref: "" },
    ["asset", "caption"],
    ["deployment_receipt"],
    { platform: platform.key, deployTool: platform.automationTool, runBehavior: platform.automationTool }
  )
);

const utilityNodes: NodeDefinition[] = [
  foundryNode("scheduler", "Smart Scheduler", "Temporal engine for launch windows, cron, and timezone control", "utility", <Clock className="w-4 h-4" />, { cron: "0 9 * * *", timezone: "UTC", engagement_prediction: "17:00 - 19:00 UTC" }, { source_node: "" }, ["source_node"], ["scheduled_job"], { runBehavior: "schedule_workflow" }),
  foundryNode("webhook", "Webhook Listener", "Receive external events and trigger workflow chains", "utility", <Globe className="w-4 h-4" />, { method: "POST", path: "/webhook/trigger", auth_required: true }, { payload_template: "" }, ["webhook_event"], ["trigger_signal"], { runBehavior: "listen_for_webhook" }),
  foundryNode("wallet_save", "Save to Live Wallet", "Persist generated artifacts back to the Leeway Live Wallet", "utility", <Zap className="w-4 h-4" />, { save_mode: "versioned", category: "Saved" }, { artifact_ref: "" }, ["artifact"], ["wallet_item"], { runBehavior: "save_to_wallet" }),
];

const contentNodes: NodeDefinition[] = [
  foundryNode("live_wallet_item", "Live Wallet Item", "Source content dropped from the Live Wallet onto the canvas", "content", <Film className="w-4 h-4" />, { locked_source: true }, { beastId: "", name: "", type: "", category: "", fileData: "" }, [], ["content_asset"], { runBehavior: "provide_content_asset" }),
];

export const foundryNodeDefinitions: NodeDefinition[] = [
  ...agentLeeNodes,
  ...platformNodes,
  ...utilityNodes,
  ...contentNodes,
];

export function isFoundryNode(node: NodeInstance | { type: string; data?: Record<string, any> }) {
  return node.type.startsWith("foundry.") || node.data?.foundry === true;
}

export function createFoundryNodeData(nodeDef: NodeDefinition, custom?: Record<string, any>) {
  const template = (nodeDef.data ?? {}) as FoundryTemplateMeta;
  if (!template.foundry) return { ...(nodeDef.data ?? {}), ...(custom ?? {}) };

  const prefix = template.category === "platform" ? "PLAT" : template.category === "agent_lee" ? "AI" : template.category === "content" ? "CONTENT" : "UTIL";

  return {
    ...template,
    config: { ...(template.config ?? {}), ...(custom?.config ?? {}) },
    content: {
      ...(template.content ?? {}),
      beastId: custom?.content?.beastId ?? `LEEWAY-${prefix}-${Math.floor(Math.random() * 9000) + 1000}`,
      timestamp: custom?.content?.timestamp ?? new Date().toLocaleString(),
      ...(custom?.content ?? {}),
    },
    schedule: {
      scheduled_at: "",
      timezone: "UTC",
      status: "unscheduled",
      ...(template.schedule ?? {}),
      ...(custom?.schedule ?? {}),
    },
    status: "idle" as FoundryNodeStatus,
    programming: false,
    color: FOUNDRY_CATEGORY_COLORS[template.category],
  };
}
