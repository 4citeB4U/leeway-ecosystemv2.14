/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.FOUNDRY.NODE_INSPECTOR
 * PURPOSE: Full LeeWay Content Foundry node programming, content, schedule, and deployment editor for Leeway IDE nodes.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 */

import { useMemo, useState } from "react";
import { CheckCircle, ClipboardList, Clock, LayoutDashboard, Save, Settings, Zap } from "lucide-react";
import { NodeInstance } from "../types/nodeTypes";
import { FOUNDRY_CATEGORY_COLORS, FoundryNodeCategory, FOUNDRY_PLATFORMS } from "../data/foundryNodeCatalog";

interface FoundryNodeInspectorProps {
  node: NodeInstance;
  onUpdate?: (id: string, updates: Partial<NodeInstance>) => void;
}

type TabId = "content" | "config" | "schedule" | "display";

function stringifyValue(value: any) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "";
  return String(value);
}

function parseValue(previous: any, raw: string) {
  if (typeof previous === "boolean") return raw === "true";
  if (Array.isArray(previous)) return raw.split(",").map((item) => item.trim()).filter(Boolean);
  return raw;
}

function FieldEditor({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  large?: boolean;
}) {
  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-1 text-[10px] text-slate-500">Boolean toggle</p>
        </div>
        <button
          onClick={() => onChange(!value)}
          className={`relative h-5 w-10 rounded-full transition-all ${value ? "bg-blue-500" : "bg-slate-700"}`}
        >
          <span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${value ? "right-1" : "left-1"}`} />
        </button>
      </div>
    );
  }

  if (large) {
    return (
      <label className="block space-y-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <textarea
          value={stringifyValue(value)}
          onChange={(event) => onChange(parseValue(value, event.target.value))}
          className="h-28 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-slate-200 outline-none focus:border-blue-500/60"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </label>
    );
  }

  return (
    <label className="block space-y-2">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        value={stringifyValue(value)}
        onChange={(event) => onChange(parseValue(value, event.target.value))}
        className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-slate-200 outline-none focus:border-blue-500/60"
        placeholder={`Enter ${label.toLowerCase()}...`}
      />
    </label>
  );
}

export function FoundryNodeInspector({ node, onUpdate }: FoundryNodeInspectorProps) {
  const [activeTab, setActiveTab] = useState<TabId>("content");
  const foundry = node.data ?? {};
  const category = (foundry.category ?? "agent_lee") as FoundryNodeCategory;
  const accentColor = foundry.color ?? FOUNDRY_CATEGORY_COLORS[category] ?? "#3b82f6";
  const status = foundry.status ?? "idle";
  const platform = useMemo(() => FOUNDRY_PLATFORMS.find((item) => item.key === foundry.platform), [foundry.platform]);

  const patchData = (patch: Record<string, any>) => {
    onUpdate?.(node.id, { data: { ...foundry, ...patch } });
  };

  const patchBucket = (bucket: "config" | "content" | "schedule", key: string, value: any) => {
    patchData({ [bucket]: { ...(foundry[bucket] ?? {}), [key]: value } });
  };

  const initializeRoutine = () => {
    patchData({ status: "processing", programming: true });
    window.setTimeout(() => {
      onUpdate?.(node.id, {
        data: {
          ...foundry,
          status: "complete",
          programming: false,
          content: {
            ...(foundry.content ?? {}),
            last_result: `${node.title} completed via ${foundry.runBehavior ?? "foundry_runtime"}`,
            completed_at: new Date().toLocaleString(),
          },
        },
      });
    }, 1200);
  };

  const tabs: Array<{ id: TabId; label: string; icon: any }> = [
    { id: "content", label: "Content", icon: ClipboardList },
    { id: "config", label: "Settings", icon: Settings },
    { id: "schedule", label: "Schedule", icon: Clock },
    { id: "display", label: "Display", icon: LayoutDashboard },
  ];

  const contentEntries = Object.entries(foundry.content ?? {});
  const configEntries = Object.entries(foundry.config ?? {});
  const schedule = foundry.schedule ?? {};

  return (
    <div className="flex h-full min-h-[260px] flex-col text-slate-200">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{category.replace("_", " ")} node</p>
            <p className="truncate text-sm font-black uppercase tracking-tight text-white">{node.title}</p>
            <p className="mt-1 truncate font-mono text-[9px] font-bold text-slate-500">{foundry.content?.beastId ?? "ID_PENDING"}</p>
          </div>
          <span
            className="rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-widest"
            style={{ color: accentColor, borderColor: `${accentColor}66`, backgroundColor: `${accentColor}14` }}
          >
            {status}
          </span>
        </div>

        {platform && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: accentColor }}>API Connectivity</p>
            <p className="mt-1 text-[10px] text-slate-500">{platform.name} target: {platform.domain}. Tool: {platform.automationTool}.</p>
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-[8px] font-bold uppercase transition-all"
              style={{ backgroundColor: active ? accentColor : "transparent", color: active ? "white" : "#64748b" }}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto pr-1 custom-scrollbar">
        {activeTab === "content" && (
          <div className="space-y-4">
            {contentEntries.length === 0 && <p className="text-xs text-slate-500">No content fields configured.</p>}
            {contentEntries.map(([key, value]) => (
              <FieldEditor
                key={key}
                label={key.replace(/_/g, " ")}
                value={value}
                large={key.includes("caption") || key.includes("text") || key.includes("result") || key.includes("source")}
                onChange={(next) => patchBucket("content", key, next)}
              />
            ))}
            {category === "platform" && (
              <FieldEditor label="Post Content" value={foundry.content?.caption ?? foundry.content?.text ?? ""} large onChange={(next) => patchBucket("content", foundry.content?.text !== undefined ? "text" : "caption", next)} />
            )}
          </div>
        )}

        {activeTab === "config" && (
          <div className="space-y-4">
            {configEntries.map(([key, value]) => (
              <FieldEditor key={key} label={key.replace(/_/g, " ")} value={value} onChange={(next) => patchBucket("config", key, next)} />
            ))}
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Execution Priority</p>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {["Low", "Medium", "High"].map((priority) => (
                  <button
                    key={priority}
                    onClick={() => patchBucket("config", "priority", priority)}
                    className="rounded-lg border px-2 py-2 text-[9px] font-bold uppercase"
                    style={{
                      borderColor: foundry.config?.priority === priority || (!foundry.config?.priority && priority === "High") ? accentColor : "rgba(255,255,255,0.1)",
                      color: foundry.config?.priority === priority || (!foundry.config?.priority && priority === "High") ? "white" : "#64748b",
                      backgroundColor: foundry.config?.priority === priority || (!foundry.config?.priority && priority === "High") ? `${accentColor}33` : "transparent",
                    }}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Launch Window</span>
              <input
                type="datetime-local"
                value={schedule.scheduled_at?.split?.(".")?.[0] ?? ""}
                onChange={(event) => patchBucket("schedule", "scheduled_at", event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-slate-200 outline-none focus:border-blue-500/60"
              />
            </label>
            <FieldEditor label="Timezone" value={schedule.timezone ?? "UTC"} onChange={(next) => patchBucket("schedule", "timezone", next)} />
            <FieldEditor label="Cron" value={foundry.config?.cron ?? "0 9 * * *"} onChange={(next) => patchBucket("config", "cron", next)} />
            <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${accentColor}33`, backgroundColor: `${accentColor}0d` }}>
              <p className="text-[9px] font-black uppercase" style={{ color: accentColor }}>Engagement Prediction</p>
              <p className="mt-1 text-[10px] italic text-slate-500">High performance window detected between 17:00 - 19:00 UTC.</p>
            </div>
          </div>
        )}

        {activeTab === "display" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(FOUNDRY_CATEGORY_COLORS).map(([colorCategory, color]) => (
                <button
                  key={colorCategory}
                  title={colorCategory}
                  onClick={() => patchData({ color })}
                  className="aspect-square rounded-lg border border-white/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <FieldEditor label="Node Label" value={node.title} onChange={(next) => onUpdate?.(node.id, { title: String(next) })} />
          </div>
        )}
      </div>

      {status === "complete" && (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Routine Complete</span>
            <CheckCircle size={14} className="text-emerald-400" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={initializeRoutine} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10">
              <Zap size={12} /> Re-edit
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("save-node-to-wallet", { detail: foundry.content }))}
              className="flex items-center justify-center gap-2 rounded-lg border py-2 text-[9px] font-black uppercase tracking-widest"
              style={{ color: accentColor, borderColor: `${accentColor}66`, backgroundColor: `${accentColor}1a` }}
            >
              <Save size={12} /> Save
            </button>
          </div>
        </div>
      )}

      <button
        onClick={initializeRoutine}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundColor: accentColor, boxShadow: `0 8px 24px ${accentColor}30` }}
      >
        <Zap size={14} fill="currentColor" /> Initialize Routine
      </button>
    </div>
  );
}
