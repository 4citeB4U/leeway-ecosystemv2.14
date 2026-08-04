"use client";

import type { ScreenData } from "@/src/lib/screens-data";
import ScreenFrame from "@/components/screen-frame";
import LiveEvidence from "@/components/live-evidence";
import LiveAgent from "@/components/live-agent";
import LiveRuntime from "@/components/live-runtime";

const LIVE_PANELS: Record<string, () => JSX.Element> = {
  evidence_center: LiveEvidence,
  agent_lee_interaction: LiveAgent,
  control_center: LiveRuntime
};

export default function ScreenView({ screen }: { screen: ScreenData }) {
  const Panel = LIVE_PANELS[screen.slug];
  return (
    <div className="pb-24">
      <ScreenFrame screen={screen} />
      {Panel && (
        <div className="mx-auto max-w-2xl px-4">
          <Panel />
        </div>
      )}
    </div>
  );
}
