/*
LEEWAY_HEADER - DO NOT REMOVE

REGION: AI
TAG: AI.LIVEVOICE.NARRATOR.MAIN
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render
*/

import type { AgentLeeLiveEvent } from "./liveVoice.types";
import { compressSpeech, eventToSpeech, shouldSpeakLiveEvent } from "./liveVoice.policy";

export class AgentLeeLiveProcessNarrator {
  constructor(
    private readonly speak: (text: string) => Promise<void> | void
  ) {}

  async narrate(event: AgentLeeLiveEvent): Promise<void> {
    if (!shouldSpeakLiveEvent(event)) return;

    const speech = compressSpeech(eventToSpeech(event));
    if (!speech) return;

    await this.speak(speech);
  }
}
