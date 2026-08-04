/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UI
 * TAG: UI.LIVE_WALLET
 * PURPOSE: Leeway Live Wallet with live asset previews, upload feed, drag-to-canvas, and runtime-fabric save events.
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 */

import { useMemo, useRef, useState } from "react";
import { CloudUpload, FileText, Film, Image as ImageIcon, Music, Search, Video, Wallet, X } from "lucide-react";

export type LiveWalletItemType = "video" | "audio" | "pdf" | "blog" | "short" | "thumbnail" | "image" | "post";

export interface LiveWalletItem {
  id: string;
  beastId: string;
  type: LiveWalletItemType;
  name: string;
  category: string;
  timestamp: string;
  previewUrl?: string;
  content?: string;
  fileData?: string;
}

export interface LiveWalletProps {
  isOpen: boolean;
  content: LiveWalletItem[];
  onClose: () => void;
  onUpload: (file: File) => void;
  onDragStart?: (item: LiveWalletItem) => void;
  livePreview?: boolean;
  accentColor?: string;
}

const FILTERS: Array<"all" | LiveWalletItemType> = ["all", "video", "short", "thumbnail", "pdf", "blog", "image", "audio"];

function ContentIcon({ type }: { type: LiveWalletItemType }) {
  if (type === "video" || type === "short") return <Video size={16} />;
  if (type === "audio") return <Music size={16} />;
  if (type === "image" || type === "thumbnail") return <ImageIcon size={16} />;
  if (type === "pdf" || type === "blog" || type === "post") return <FileText size={16} />;
  return <Film size={16} />;
}

export function LiveWallet({
  isOpen,
  content,
  onClose,
  onUpload,
  onDragStart,
  accentColor = "#3b82f6",
  livePreview = true,
}: LiveWalletProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | LiveWalletItemType>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredContent = useMemo(() => {
    const query = search.trim().toLowerCase();

    return content.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.beastId.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.timestamp.toLowerCase().includes(query);

      const matchesFilter = filter === "all" || item.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [content, filter, search]);

  if (!isOpen) return null;

  return (
    <aside className="absolute left-20 top-20 bottom-6 z-[80] flex w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <Wallet size={16} style={{ color: accentColor }} />
          <h2 className="text-xs font-black uppercase tracking-widest text-white">Live Wallet</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3 p-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition-all hover:bg-white/[0.05]"
          style={{ borderColor: `${accentColor}33` }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="video/*,audio/*,application/pdf,image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.currentTarget.value = "";
            }}
          />
          <CloudUpload size={24} className="text-slate-500 transition-colors group-hover:text-white" />
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-white">Upload to Live Wallet</p>
            <p className="mt-0.5 text-[7px] font-bold uppercase text-slate-500">PDF, Video, Audio, Image</p>
          </div>
        </button>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ID, name, date..."
            className="w-full rounded-lg border border-white/10 bg-black/60 py-2 pl-9 pr-3 text-[10px] font-bold text-slate-300 outline-none transition-all focus:border-white/30"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {FILTERS.map((itemFilter) => {
            const active = filter === itemFilter;
            return (
              <button
                key={itemFilter}
                onClick={() => setFilter(itemFilter)}
                className="rounded-md border px-2 py-1 text-[8px] font-bold uppercase transition-all"
                style={{
                  color: active ? accentColor : "#64748b",
                  borderColor: active ? `${accentColor}66` : "rgba(255,255,255,0.08)",
                  backgroundColor: active ? `${accentColor}1a` : "transparent",
                }}
              >
                {itemFilter}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {filteredContent.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-slate-600">
            <Wallet size={28} className="mb-3" />
            <p className="text-[10px] font-black uppercase tracking-widest">No live wallet content found</p>
          </div>
        ) : (
          filteredContent.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/leeway-live-wallet", JSON.stringify(item));
                event.dataTransfer.effectAllowed = "copy";
                onDragStart?.(item);
              }}
              className="group cursor-grab rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-white/20 hover:bg-white/[0.07] active:cursor-grabbing"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/50 text-slate-300" style={{ color: accentColor }}>
                  {livePreview && (item.previewUrl || item.fileData) && (item.type === "image" || item.type === "thumbnail") ? (
                    <img src={item.previewUrl || item.fileData} alt="" className="h-full w-full object-cover" />
                  ) : livePreview && (item.previewUrl || item.fileData) && (item.type === "video" || item.type === "short") ? (
                    <video src={item.previewUrl || item.fileData} className="h-full w-full object-cover" muted loop playsInline />
                  ) : (
                    <ContentIcon type={item.type} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-black uppercase tracking-tight text-white">{item.name}</p>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[7px] font-black uppercase text-slate-400">{item.type}</span>
                  </div>
                  <p className="mt-1 truncate text-[9px] font-mono font-bold text-slate-500">{item.beastId}</p>
                  <div className="mt-2 flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-slate-600">
                    <span>{item.category}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  {livePreview && item.content && (
                    <p className="mt-2 line-clamp-2 rounded-md bg-black/40 p-2 text-[9px] leading-relaxed text-slate-400">{item.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
