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

/**
 * Neural File Preview - Preview component for different file types
 */

import React, { useState, useEffect } from 'react';
import { Archive, Database, Mic } from 'lucide-react';
import { NeuralFile } from '../utils/neuralDB';

interface NeuralFilePreviewProps {
  file: NeuralFile;
}

export const NeuralFilePreview: React.FC<NeuralFilePreviewProps> = ({ file }) => {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!file.content) return;

    if (file.content instanceof Blob) {
      const url = URL.createObjectURL(file.content);
      setContentUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof file.content === 'string') {
      setTextContent(file.content);
    }
  }, [file]);

  // Video preview
  if (file.category === 'media' && file.extension.match(/(mp4|mov|webm)/i)) {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
        {contentUrl ? (
          <video src={contentUrl} controls className="max-w-full max-h-full" />
        ) : (
          <div className="text-slate-500 text-[10px] font-mono">LOADING VIDEO...</div>
        )}
      </div>
    );
  }

  // Image preview
  if (file.category === 'media' || file.extension.match(/(png|jpg|jpeg|gif|webp)/i)) {
    return (
      <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
        {contentUrl ? (
          <img
            src={contentUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-slate-500 text-[10px] font-mono">LOADING IMAGE...</div>
        )}
      </div>
    );
  }

  // Audio preview
  if (file.category === 'audio' || file.extension.match(/(mp3|wav|ogg|m4a)/i)) {
    return (
      <div className="w-full p-6 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-500 animate-pulse">
          <Mic size={32} />
        </div>
        {contentUrl && <audio controls src={contentUrl} className="w-full h-10 accent-cyan-500" />}
      </div>
    );
  }

  // PDF preview
  if (file.category === 'pdf' || file.extension.toLowerCase() === 'pdf') {
    return (
      <div className="w-full h-[400px] rounded-2xl overflow-hidden bg-white border border-white/10">
        {contentUrl ? (
          <iframe src={contentUrl} className="w-full h-full border-none" title={file.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-900 font-mono">
            LOADING PDF...
          </div>
        )}
      </div>
    );
  }

  // Code/text preview
  if (file.category === 'code' || file.category === 'doc' || typeof file.content === 'string') {
    return (
      <div className="w-full max-h-[400px] overflow-auto rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-[12px] leading-relaxed text-cyan-400/90 selection:bg-cyan-500/30 shadow-inner">
        <pre className="whitespace-pre-wrap break-all font-mono">
          {textContent || "No text content available."}
        </pre>
      </div>
    );
  }

  // JSON/data preview
  if (file.category === 'data' || file.extension.toLowerCase() === 'json') {
    return (
      <div className="w-full max-h-[400px] overflow-auto rounded-2xl bg-black/80 border border-white/10 p-5 font-mono text-[12px] leading-relaxed text-amber-400/90 selection:bg-amber-500/30 shadow-inner">
        <pre className="whitespace-pre-wrap break-all font-mono">
          {textContent || "No data content available."}
        </pre>
      </div>
    );
  }

  // Archive preview
  if (file.category === 'archive' || file.extension.match(/(zip|rar|7z|tar)/i)) {
    return (
      <div className="w-full py-12 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center">
        <Archive size={48} className="mb-4 text-slate-500" />
        <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
          Compressed Archive • {file.extension.toUpperCase()}
        </span>
        <span className="text-[9px] font-mono text-slate-600 mt-2">
          {(file.sizeBytes / 1024).toFixed(2)} KB
        </span>
      </div>
    );
  }

  // Default binary preview
  return (
    <div className="w-full py-12 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center opacity-40">
      <Database size={48} className="mb-4" />
      <span className="text-[10px] font-mono tracking-widest uppercase">Binary Node • No Preview</span>
    </div>
  );
};

// Leeway Standards: governed module
