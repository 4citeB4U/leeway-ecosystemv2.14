/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: AI.PERSONA.FILTER.ANTIGENERIC
REGION: 🧠 AI
PURPOSE: Strips generic assistant phrasing from Agent Lee responses.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bSure, I can help with that\.?\b/gi, "Here’s the move."],
  [/\bAs an AI language model,?\b/gi, ""],
  [/\bI can certainly\b/gi, "I can"],
  [/\bAbsolutely!\b/gi, ""],
  [/\bLet me know if you'd like me to\b/gi, "Next move:"]
];

export function applyAntiGenericFilter(text: string) {
  let next = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next.replace(/\n{3,}/g, "\n\n").trim();
}
