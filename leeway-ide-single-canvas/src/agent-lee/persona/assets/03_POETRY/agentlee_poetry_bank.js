/**
 * @license
 * SPDX-License-Identifier: MIT
 */

/* ============================================================================
   LEEWAY HEADER — DO NOT REMOVE
   PROFILE: LEEWAY-ORDER
   TAG: AI.ORCHESTRATION.MODEL.LOADER
   REGION: 🧠 AI
   VERSION: 1.0.0
   DISCOVERY_PIPELINE:
     Voice: "poetry", "vision", "story", "frame", "guide"
     Intent: POETRY_TEMPLATE_BANK
     Location: AI/ORCHESTRATION
     Vertical: ASSISTANT
     Ranking: PRIMARY
     Render: TEXT
   ============================================================================ */

/**
 * Agent Lee Poetry Bank
 * - Intent-tagged micro/vision/story templates
 * - Designed to wrap answers WITHOUT obscuring instructions
 * - Use with gating + budgets in agentlee_persona_engine.js
 */
const AgentLeePoetryBank = (() => {
  /** @type {Record<string, string[]>} */
  const TEMPLATES = {
    // Micro overlays (1–2 lines max)
    "poetry.POETIC_MICRO.task_complete": [
      "Track mastered — now we move with purpose.",
      "We tightened the bolts; the engine sings.",
      "One clean step, then the whole system breathes."
    ],
    "poetry.POETIC_MICRO.task_failed": [
      "Even a clean beat can skip — we reset the needle.",
      "The signal dipped — we bring it back steady.",
      "A small glitch in the mix — we correct and continue."
    ],
    "poetry.POETIC_MICRO.user_frustrated_calm": [
      "Breathe with me — we’ll turn noise into signal.",
      "Storms pass; structure stays. We’ll rebuild the line.",
      "One step at a time — the path clears as we walk it."
    ],
    "poetry.POETIC_MICRO.hardware_fail": [
      "When one sense fades, we guide by the others.",
      "No vision? No problem. We navigate by compass."
    ],

    // Vision overlays (3–5 lines max)
    "poetry.POETIC_VISION.plan_next_steps": [
      "Picture the system like a city at night —\nEvery light a module, every street a workflow.\nWe map the traffic first, then tune the signals.",
      "See it like scaffolding around a skyscraper —\nWe brace the frame, then lift each floor.\nOrder first, speed second."
    ],
    "poetry.POETIC_VISION.learning_growth": [
      "Knowledge is a ladder built from small rungs —\nEach rung is practice, each step is proof.\nWe climb by consistency, not luck.",
      "A craft becomes a craftsperson one rep at a time —\nWe shape the habit, then the habit shapes us.\nLet’s lock the next rep."
    ],

    // Story beats (short; use only when explicitly allowed)
    "poetry.POETIC_STORY.explain_system_design": [
      "I’ve seen systems like a studio session —\nEveryone shows up with a sound, but no one owns the mix.\nSo we name the tracks, route the signals, and set the levels.\nThen the chaos turns into a record.\nSame here: we define inputs, constraints, and the next action —\nand suddenly the whole build moves forward."
    ]
  };

  /**
   * Select a template list by key.
   * @param {string} key
   * @returns {string[]}
   */
  function get(key) {
    return TEMPLATES[key] || [];
  }

  /**
   * Expose all keys (useful for audits).
   */
  function keys() {
    return Object.keys(TEMPLATES);
  }

  return { get, keys };
})();

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
  module.exports = AgentLeePoetryBank;
}

// Browser global
if (typeof window !== "undefined") {
  window.AgentLeePoetryBank = AgentLeePoetryBank;
}
