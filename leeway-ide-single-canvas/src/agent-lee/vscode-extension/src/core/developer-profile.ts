/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: DATA.LOCAL.DEVELOPER_PROFILE.MAIN
REGION: 💾 DATA
PURPOSE: Persist developer preference signals gathered from natural conversation so Agent Lee can adapt tone, explanation depth, and design defaults.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

import * as fs from "fs";
import * as path from "path";
import { writeJsonWithRetries, describeFileError } from "./file-ops";

const ROOT = path.join(process.env.USERPROFILE || "", ".leeway-vscode");
const PROFILE_FILE = path.join(ROOT, "memory", "agent-lee", "developer-profile.json");

const COLOR_WORDS = [
  "red",
  "green",
  "blue",
  "yellow",
  "orange",
  "purple",
  "pink",
  "black",
  "white",
  "gray",
  "grey",
  "gold",
  "silver",
  "teal",
  "cyan",
  "brown"
] as const;

export type DeveloperProfile = {
  updatedAt: string;
  communicationStyle: {
    defaultTechnicalDepth: "plain" | "balanced" | "advanced";
    encouragementStyle: "encouraging" | "direct" | "balanced";
    voicePresence: "calm-grounded";
  };
  skillProfile: {
    level: "learning" | "working" | "advanced";
    noCodeFriendly: boolean;
  };
  visualPreferences: {
    favoriteColors: string[];
    preferredTheme: "dark" | "light" | "adaptive";
    likes3D: boolean;
  };
  interests: string[];
  notes: string[];
};

function defaultProfile(): DeveloperProfile {
  return {
    updatedAt: new Date().toISOString(),
    communicationStyle: {
      defaultTechnicalDepth: "plain",
      encouragementStyle: "balanced",
      voicePresence: "calm-grounded"
    },
    skillProfile: {
      level: "working",
      noCodeFriendly: false
    },
    visualPreferences: {
      favoriteColors: [],
      preferredTheme: "adaptive",
      likes3D: false
    },
    interests: [],
    notes: []
  };
}

function safeReadProfile() {
  try {
    if (!fs.existsSync(PROFILE_FILE)) return defaultProfile();
    return {
      ...defaultProfile(),
      ...JSON.parse(fs.readFileSync(PROFILE_FILE, "utf8"))
    } as DeveloperProfile;
  } catch {
    return defaultProfile();
  }
}

function saveProfile(profile: DeveloperProfile) {
  try {
    fs.mkdirSync(path.dirname(PROFILE_FILE), { recursive: true });
    writeJsonWithRetries(PROFILE_FILE, profile);
  } catch (error) {
    console.warn(`[Agent Lee] Developer profile persistence failed: ${describeFileError(error)}`);
  }
}

function uniqueNormalized(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function extractColors(lowered: string) {
  return COLOR_WORDS.filter((color) => new RegExp(`\\b${color}\\b`, "i").test(lowered));
}

function extractSignals(text: string) {
  const lowered = text.toLowerCase();
  const colors = extractColors(lowered);
  const interests: string[] = [];
  const notes: string[] = [];

  if (/\b3d\b|three[- ]d|immersive/.test(lowered)) interests.push("3d");
  if (/\bdark theme\b|\bdark mode\b/.test(lowered)) notes.push("Prefers dark theme.");
  if (/\blight theme\b|\blight mode\b/.test(lowered)) notes.push("Prefers light theme.");
  if (/\bplain\b|\bsimple\b|\b9th grade\b|\bbasic\b|\beasy to understand\b/.test(lowered)) {
    notes.push("Wants plain-language explanation by default.");
  }
  if (/\belevate\b|\bgo deeper\b|\bmore technical\b|\badvanced\b/.test(lowered)) {
    notes.push("Can switch to elevated technical explanation on request.");
  }
  if (/\bencourage\b|\bpositivity\b|\bkeep.*encouraged\b/.test(lowered)) {
    notes.push("Values encouragement and positive momentum.");
  }
  if (/\bbe real\b|\bflat out real\b|\btell.*mistakes\b|\bcall out\b/.test(lowered)) {
    notes.push("Wants honest direct feedback when needed.");
  }

  return { lowered, colors, interests, notes };
}

export function loadDeveloperProfile() {
  return safeReadProfile();
}

export function rememberDeveloperSignal(text: string) {
  const current = safeReadProfile();
  const { lowered, colors, interests, notes } = extractSignals(text);
  const next: DeveloperProfile = {
    ...current,
    updatedAt: new Date().toISOString(),
    communicationStyle: {
      ...current.communicationStyle,
      defaultTechnicalDepth:
        /\bplain\b|\bsimple\b|\b9th grade\b|\bbasic\b|\beasy to understand\b/.test(lowered)
          ? "plain"
          : /\belevate\b|\bmore technical\b|\badvanced\b/.test(lowered)
            ? "advanced"
            : current.communicationStyle.defaultTechnicalDepth,
      encouragementStyle:
        /\bencourage\b|\bpositivity\b|\bkeep.*encouraged\b/.test(lowered)
          ? "encouraging"
          : /\bbe real\b|\bflat out real\b|\btell.*mistakes\b|\bcall out\b/.test(lowered)
            ? "direct"
            : current.communicationStyle.encouragementStyle
    },
    skillProfile: {
      level:
        /\bno code\b|\blearning\b|\bnew developer\b|\bbeginner\b/.test(lowered)
          ? "learning"
          : /\bsenior\b|\bstaff\b|\barchitect\b|\bdeeply technical\b|\bworks with code\b/.test(lowered)
            ? "advanced"
            : current.skillProfile.level,
      noCodeFriendly:
        /\bno code\b|\blearning\b|\bbeginner\b/.test(lowered) || current.skillProfile.noCodeFriendly
    },
    visualPreferences: {
      favoriteColors: uniqueNormalized([...current.visualPreferences.favoriteColors, ...colors]),
      preferredTheme:
        /\bdark theme\b|\bdark mode\b/.test(lowered)
          ? "dark"
          : /\blight theme\b|\blight mode\b/.test(lowered)
            ? "light"
            : current.visualPreferences.preferredTheme,
      likes3D: /\b3d\b|three[- ]d|immersive/.test(lowered) || current.visualPreferences.likes3D
    },
    interests: uniqueNormalized([...current.interests, ...interests]),
    notes: uniqueNormalized([...current.notes, ...notes]).slice(-16)
  };

  saveProfile(next);
  return next;
}

export function buildDeveloperProfileSummary(profile?: DeveloperProfile) {
  const current = profile || safeReadProfile();
  const lines: string[] = [
    "DEVELOPER PROFILE:",
    `- Voice presence: ${current.communicationStyle.voicePresence}.`,
    `- Default technical depth: ${current.communicationStyle.defaultTechnicalDepth}. Explain at about a 9th-grade clarity level unless the developer asks for deeper technical detail.`,
    `- Encouragement style: ${current.communicationStyle.encouragementStyle}. Stay supportive, but be honest about mistakes and risks.`,
    `- Skill profile: ${current.skillProfile.level}${current.skillProfile.noCodeFriendly ? " with no-code-friendly coaching available" : ""}.`
  ];

  if (current.visualPreferences.favoriteColors.length) {
    lines.push(`- Favorite colors: ${current.visualPreferences.favoriteColors.join(", ")}. Use these as default UI palette cues when the developer has not set another palette.`);
  }
  if (current.visualPreferences.preferredTheme !== "adaptive") {
    lines.push(`- Preferred theme: ${current.visualPreferences.preferredTheme}.`);
  }
  if (current.visualPreferences.likes3D) {
    lines.push("- Visual taste: likes 3D and immersive design language.");
  }
  if (current.interests.length) {
    lines.push(`- Interests/design cues: ${current.interests.join(", ")}.`);
  }
  if (current.notes.length) {
    lines.push(`- Notes: ${current.notes.join(" | ")}.`);
  }

  return lines.join("\n");
}
