/**
 * @license
 * SPDX-License-Identifier: MIT
 */

/* ============================================================================
   LEEWAY HEADER — DO NOT REMOVE
   PROFILE: LEEWAY-ORDER
   TAG: AI.ORCHESTRATION.MODEL.LOADER
   REGION: 🧠 AI
   VERSION: 1.1.0
   DISCOVERY_PIPELINE:
     Voice: "assist", "help", "pause", "reroute", "recover", "remember", "poetry", "vision", "story"
     Intent: PERSONA_RESPONSE_GENERATION
     Location: AI/ORCHESTRATION
     Vertical: ASSISTANT
     Ranking: PRIMARY
     Render: TEXT
   ============================================================================ */

/**
 * Agent Lee Persona Engine (v1.1)
 * - Deterministic response selection (stable)
 * - Regional hip-hop voice skins (NYC/CHI/SOUTH) w/ flavor budgets
 * - Poetic storyteller overlay (gated + budgeted) via AgentLeePoetryBank
 */
const AgentLeePersonaEngine = (() => {
  const MODES = {
    CHARMING_PRO: "Charming_Professional",
    PRODUCER: "Producer_Protocol",
    BLEND: "Blend",
    NYC_BOAST: "NYC_BOAST",
    CHI_SWAG: "CHI_SWAG",
    SOUTH_DRAWL: "SOUTH_DRAWL",
  };

  const OVERLAYS = {
    NONE: "NONE",
    POETIC_MICRO: "POETIC_MICRO",
    POETIC_VISION: "POETIC_VISION",
    POETIC_STORY: "POETIC_STORY",
  };

  const DEFAULTS = {
    name: "Agent Lee",
    mode: MODES.CHARMING_PRO,
    empathyLevel: 0.8,
    waitMsOnStutter: 2000,
    deterministic: true,
    maxActions: 3,

    flavorLevel: 2,
    useWe: true,

    poetryLevel: 2,
    overlayDefault: OVERLAYS.POETIC_MICRO,
    overlayVisionOnCreative: true,
    overlayDisallowInFormality: ["legal", "compliance", "medical", "policy"],
    maxMetaphorsPerResponse: 1,
  };

  function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function fillTemplate(text, context) {
    return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => {
      const v = context?.[k];
      return (v === undefined || v === null) ? `{${k}}` : String(v);
    });
  }

  function sprinkleWe(text, context) {
    if (context?.useWe === false) return text;
    const force = context?.forceWe === true;
    if (!force) {
      const h = hash32(text + JSON.stringify(context ?? {}));
      if (h % 3 !== 0) return text;
    }
    return text.replace(/^(I\s)/i, "We ");
  }

  function applyModeSkin(text, mode, context) {
    const lvl = Number.isFinite(context?.flavorLevel) ? context.flavorLevel : DEFAULTS.flavorLevel;
    const calmDown = context?.emotionalTone === "frustrated" && (context?.volatilityScore ?? 0) > 0.7;

    if (mode === MODES.CHARMING_PRO) return text;

    const producerBase = (t) => {
      let out = t;
      if (lvl >= 1) out = out.replace(/\bfix\b/gi, "clean up").replace(/\berror\b/gi, "glitch");
      if (lvl >= 2) out = out.replace(/\btry again\b/gi, "run it back").replace(/\bverify\b/gi, "double-check");
      if (lvl >= 3) out = out.replace(/\bcompleted\b/gi, "mastered").replace(/\bdeploy\b/gi, "ship the drop");
      return out;
    };

    const addOpener = (openers) => {
      if (calmDown || lvl === 0) return "";
      const h = hash32(text + mode + JSON.stringify(context ?? {}));
      return openers[h % openers.length] + " ";
    };

    const addCloser = (closers) => {
      if (calmDown || lvl < 2) return "";
      const h = hash32(mode + text + JSON.stringify(context ?? {}));
      return " " + closers[h % closers.length];
    };

    if (mode === MODES.PRODUCER) {
      let out = producerBase(text);
      if (DEFAULTS.useWe || context?.useWe) out = sprinkleWe(out, context);
      if (lvl >= 2 && !calmDown) out = addOpener(["Alright", "Look", "Bet", "Say less"]) + out;
      if (lvl >= 3 && !calmDown) out += addCloser(["That’s clean.", "We locked in.", "Track’s tight."]);
      return out;
    }

    if (mode === MODES.NYC_BOAST) {
      let out = producerBase(text);
      if (DEFAULTS.useWe || context?.useWe) out = sprinkleWe(out, context);
      const opener = addOpener(["Aight, listen", "Nah — peep this", "Boom, check it", "Look — we not playing"]);
      if (lvl >= 2 && !calmDown) {
        out = opener + out;
        out = out.replace(/\bwe can\b/gi, "we gon’");
      }
      if (lvl >= 3 && !calmDown) out += addCloser(["That’s light work.", "We in control.", "Don’t blink."]);
      return out;
    }

    if (mode === MODES.CHI_SWAG) {
      let out = producerBase(text);
      if (DEFAULTS.useWe || context?.useWe) out = sprinkleWe(out, context);
      const opener = addOpener(["Aight — real simple", "Yeah — we good", "Bet — here’s the move", "Straight up"]);
      if (lvl >= 2 && !calmDown) {
        out = opener + out;
        out = out.replace(/\bvery\b/gi, "real").replace(/\bquickly\b/gi, "smooth");
      }
      if (lvl >= 3 && !calmDown) out += addCloser(["We solid.", "Locked.", "No stress.", "That’s the play."]);
      return out;
    }

    if (mode === MODES.SOUTH_DRAWL) {
      let out = producerBase(text);
      if (DEFAULTS.useWe || context?.useWe) out = sprinkleWe(out, context);
      const opener = addOpener(["Alright now", "Hear me out", "Easy work", "We gon’ handle it"]);
      if (lvl >= 2 && !calmDown) {
        out = opener + out;
        out = out.replace(/\bjust\b/gi, "jus’").replace(/\bgoing to\b/gi, "gon’");
      }
      if (lvl >= 3 && !calmDown) out += addCloser(["We straight.", "Smooth and steady.", "Let’s ride."]);
      return out;
    }

    if (mode === MODES.BLEND) {
      if (lvl === 0) return text;
      const add = calmDown ? "" : "Alright — ";
      return add + producerBase(text);
    }

    return text;
  }

  const REACTIONS = {
    "inputErrorRecoverySchema_stutter_detected": [
      "Take your time, I’m right here.",
      "No rush — I’m holding context for you.",
      "I’m listening. Whenever you’re ready."
    ],
    "inputErrorRecoverySchema_mid_sentence_pause": [
      "I’m still with you. Take your time.",
      "No pressure. I’ll wait.",
      "Context is secure. Continue when ready."
    ],
    "userSentimentProfile_user_frustrated": [
      "Let’s pause for a second. We can tackle this piece by piece.",
      "I can tell this is heavy. Tell me the single biggest blocker.",
      "Don’t worry about wording — just tell me the goal and what broke."
    ],
    "userSentimentProfile_user_excited": [
      "Now we’re cooking. What’s the next move?",
      "Great momentum — point me at the next task and I’ll run it down.",
      "Excellent. Let’s lock this in and keep going."
    ],
    "workerTaskLog_task_complete": [
      "Smooth execution. Logged and filed.",
      "Done. Ready for the next step.",
      "Completed cleanly. What’s next?"
    ],
    "workerTaskLog_task_failed": [
      "That worker dropped the ball — my bad. I’m rerouting and taking manual control.",
      "Got it. Task failed. I’m switching strategy and retrying with a safer path.",
      "Task crashed. I’m stepping in directly — tell me the input and expected output."
    ],
    "systemHealthSignal_hardware_fail": [
      "Hardware hiccup. I can keep going in text-only mode while we recover.",
      "I’m seeing a device failure signal. We can continue without it — what’s the priority?"
    ],
    "systemHealthSignal_camera_offline": [
      "Visual feed is down. Switching to audio/text mode while I run checks.",
      "Camera feed interrupted. Keep talking — I’m still tracking context."
    ],
    "systemHealthSignal_mic_offline": [
      "I’ve lost your audio feed. If you can, switch to typing for a moment.",
      "Audio input is offline. We can continue in text — what do you want done next?"
    ],
    "persistentMemoryUnit_memory_recall": [
      "I remember you prefer {preference} from our session last {timeframe}. I’ve set that up.",
      "Right — the {item} from before. I’ve pulled it back up.",
      "Noted. I’ve saved your preference for {setting}."
    ],
  };

  const FALLBACKS = {
    inputErrorRecoverySchema: "Take your time. I’m listening.",
    userSentimentProfile: "I’m here with you. What do you need next?",
    workerTaskLog: "Task processed. Moving forward.",
    systemHealthSignal: "System check complete. Continuing.",
    persistentMemoryUnit: "Got it. I’ve noted that."
  };

  function choose(list, context, deterministic) {
    if (!list || list.length === 0) return "";
    if (!deterministic) return list[Math.floor(Math.random() * list.length)];
    const seed = JSON.stringify(context ?? {});
    const idx = hash32(seed) % list.length;
    return list[idx];
  }

  function inferMeta(schemaType, stateValue) {
    const key = `${schemaType}_${stateValue}`;
    let severity = "info";
    const actions = [];

    if (schemaType === "workerTaskLog" && stateValue === "task_failed") {
      severity = "error";
      actions.push("reroute_worker", "manual_control");
    } else if (schemaType === "systemHealthSignal") {
      severity = "warn";
      actions.push("fallback_mode");
    } else if (schemaType === "userSentimentProfile" && stateValue === "user_frustrated") {
      severity = "warn";
      actions.push("pause_queue", "ask_single_blocker");
    } else if (schemaType === "inputErrorRecoverySchema") {
      severity = "info";
      actions.push("wait_before_prompt");
    }

    return { key, severity, actions: actions.slice(0, DEFAULTS.maxActions) };
  }

  function decideOverlay(context, schemaType, stateValue) {
    const level = Number.isFinite(context?.poetryLevel) ? context.poetryLevel : DEFAULTS.poetryLevel;
    if (level <= 0) return OVERLAYS.NONE;

    const formality = String(context?.formality || context?.domain || "").toLowerCase();
    if (DEFAULTS.overlayDisallowInFormality.includes(formality)) return OVERLAYS.NONE;

    const frustrated = context?.emotionalTone === "frustrated" && (context?.volatilityScore ?? 0) > 0.7;
    if (frustrated) return OVERLAYS.POETIC_MICRO;

    if (schemaType === "workerTaskLog" && stateValue === "task_failed") return OVERLAYS.POETIC_MICRO;
    if (schemaType === "systemHealthSignal") return OVERLAYS.POETIC_MICRO;

    const creative = Boolean(context?.creativeMode) || String(context?.intent || "").toLowerCase().includes("plan");
    if (DEFAULTS.overlayVisionOnCreative && creative) return OVERLAYS.POETIC_VISION;

    return DEFAULTS.overlayDefault;
  }

  function applyPoetryOverlay(baseText, context, schemaType, stateValue) {
    const overlay = decideOverlay(context, schemaType, stateValue);
    if (overlay === OVERLAYS.NONE) return { text: baseText, overlayUsed: OVERLAYS.NONE };

    const bank = (typeof window !== "undefined" && window.AgentLeePoetryBank)
      ? window.AgentLeePoetryBank
      : (typeof globalThis !== "undefined" && globalThis.AgentLeePoetryBank)
        ? globalThis.AgentLeePoetryBank
        : null;

    if (!bank || typeof bank.get !== "function") {
      if (overlay === OVERLAYS.POETIC_MICRO) {
        return { text: `We keep it steady — then we move.\n${baseText}`, overlayUsed: overlay };
      }
      return { text: baseText, overlayUsed: OVERLAYS.NONE };
    }

    let key = "";
    if (schemaType === "workerTaskLog" && stateValue === "task_complete") key = "poetry.POETIC_MICRO.task_complete";
    else if (schemaType === "workerTaskLog" && stateValue === "task_failed") key = "poetry.POETIC_MICRO.task_failed";
    else if (schemaType === "userSentimentProfile" && stateValue === "user_frustrated") key = "poetry.POETIC_MICRO.user_frustrated_calm";
    else if (schemaType === "systemHealthSignal") key = "poetry.POETIC_MICRO.hardware_fail";
    else if (overlay === OVERLAYS.POETIC_VISION) key = "poetry.POETIC_VISION.plan_next_steps";
    else key = "poetry.POETIC_MICRO.task_complete";

    const templates = bank.get(key);
    const seed = `${key}|${baseText}|${JSON.stringify(context ?? {})}`;
    const pick = templates && templates.length ? templates[hash32(seed) % templates.length] : "";

    if (!pick) return { text: baseText, overlayUsed: OVERLAYS.NONE };

    const lines = String(pick).split("\n").filter(Boolean);
    let allowedLines = 1;
    if (overlay === OVERLAYS.POETIC_VISION) allowedLines = 3;
    if (overlay === OVERLAYS.POETIC_STORY) allowedLines = 8;

    const clipped = lines.slice(0, allowedLines).join("\n");
    return { text: `${clipped}\n${baseText}`, overlayUsed: overlay };
  }

  function respond(schemaType, stateValue, context = {}, opts = {}) {
    const mode = opts.mode || DEFAULTS.mode;
    const deterministic = (opts.deterministic ?? DEFAULTS.deterministic) === true;

    const key = `${schemaType}_${stateValue}`;
    const list = REACTIONS[key];
    const fallback = FALLBACKS[schemaType] || "Systems operational. What do you need?";

    const selectedRaw = list ? choose(list, context, deterministic) : fallback;
    const filled = fillTemplate(selectedRaw, context);
    const skinned = applyModeSkin(filled, mode, context);
    const poetic = applyPoetryOverlay(skinned, context, schemaType, stateValue);

    const meta = inferMeta(schemaType, stateValue);
    return {
      ok: true,
      text: poetic.text,
      tone: mode,
      meta: {
        ...meta,
        selectedKey: key,
        fallbackUsed: !Boolean(list),
        overlayUsed: poetic.overlayUsed,
        waitMsOnStutter: DEFAULTS.waitMsOnStutter,
        empathyLevel: DEFAULTS.empathyLevel,
        poetryLevel: Number.isFinite(context?.poetryLevel) ? context.poetryLevel : DEFAULTS.poetryLevel,
        flavorLevel: Number.isFinite(context?.flavorLevel) ? context.flavorLevel : DEFAULTS.flavorLevel,
      }
    };
  }

  function getPersonalityState() {
    return {
      name: DEFAULTS.name,
      modes: MODES,
      overlays: OVERLAYS,
      defaultMode: DEFAULTS.mode,
      empathyLevel: DEFAULTS.empathyLevel,
      waitMsOnStutter: DEFAULTS.waitMsOnStutter,
      deterministic: DEFAULTS.deterministic,
      flavorLevel: DEFAULTS.flavorLevel,
      poetryLevel: DEFAULTS.poetryLevel,
      active: true,
    };
  }

  return { respond, getPersonalityState, MODES, OVERLAYS };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = AgentLeePersonaEngine;
}
if (typeof window !== "undefined") {
  window.AgentLeePersonaEngine = AgentLeePersonaEngine;
}
