/**
 * LEEWAY_HEADER - DO NOT REMOVE
 *
 * REGION: UTIL
 * TAG: UTIL.MODULE.PLACEHOLDER
 * DESCRIPTION: Leeway IDE utility module
 * AUTHORITY: LeeWay-Standards
 * DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
 *
 * 5WH:
 * WHAT = Utility Module
 * WHY = Provide utility functions
 * WHO = Leeway Innovations / Agent Lee Enablement
 * WHERE = FILEPATH
 * WHEN = 2026-06-06
 * HOW = TypeScript module
 *
 * CHAIN: Standards ? Integrated ? Runtime ? Projections
 * LICENSE: PROPRIETARY
 */

/**
 * Neural Monolith Constants and Metadata
 */

import { Database, Video, Archive, Code, Terminal, FileText, Mic, Folder } from 'lucide-react';
import { DriveId, FileCategory } from './neuralDB';

export const DRIVE_COLORS: Record<DriveId, string> = {
  "LEE": "#ffffff",
  "N": "#d8b4fe",
  "A": "#f472b6",
  "R": "#fb923c",
  "O": "#fbbf24",
  "L": "#22d3ee",
  "E": "#facc15",
  "D": "#4ade80",
};

export const DRIVE_METADATA: Record<DriveId, { label: string; icon: any; type: string; capacity: string; description: string }> = {
  "LEE": {
    label: "CORE",
    icon: Database,
    type: "System",
    capacity: "8 GB",
    description: "Core neural processing and system registry."
  },
  "N": {
    label: "MEDIA",
    icon: Video,
    type: "Media",
    capacity: "8 GB",
    description: "High-bandwidth neural media streaming."
  },
  "A": {
    label: "MEDIA",
    icon: Video,
    type: "Media",
    capacity: "8 GB",
    description: "Audio-visual sensory data storage."
  },
  "R": {
    label: "LARGE",
    icon: Archive,
    type: "Storage",
    capacity: "8 GB",
    description: "Large-scale resource and asset repository."
  },
  "O": {
    label: "LARGE",
    icon: Archive,
    type: "Storage",
    capacity: "8 GB",
    description: "Object-based cold storage for archives."
  },
  "L": {
    label: "LOGIC",
    icon: Code,
    type: "Code",
    capacity: "8 GB",
    description: "Neural logic and algorithmic codebases."
  },
  "E": {
    label: "ENGINE",
    icon: Terminal,
    type: "Code",
    capacity: "8 GB",
    description: "Experimental engine and data processing."
  },
  "D": {
    label: "DOCS",
    icon: FileText,
    type: "Docs",
    capacity: "8 GB",
    description: "Documentation and neural briefing logs."
  },
};

export const CATEGORY_ICONS: Record<FileCategory, any> = {
  code: Code,
  media: Video,
  doc: FileText,
  archive: Archive,
  sys: Database,
  data: Folder,
  pdf: FileText,
  audio: Mic
};

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: "drive" | "slot" | "cell" | "file";
}

// Leeway Standards: governed module
