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

import React from "react";
import { StudioShell } from "./StudioShell";
import { StudioNode } from "./StudioNode";
import { ForgeStudio } from "./ForgeStudio";

/**
 * ForgeStudioWorkspace wraps the ForgeStudio node builder with the common
 * StudioShell. It passes a default settings object to configure the
 * accent colour. The workspace is always open when this component is
 * mounted. Additional props or custom settings can be added later as
 * the automation publishing features evolve.
 */
export function ForgeStudioWorkspace() {
  // Define a simple default settings object. ForgeStudio expects an
  // object with an accentColor property; additional settings can be
  // added here if necessary.
  const defaultSettings: any = {
    accentColor: "#3b82f6",
  };

  return (
    <StudioShell>
      {/* Place the publishing studio inside a draggable node. Once
          collapsible/close logic is added to ForgeStudio itself the
          user will still be able to reposition the entire publishing
          interface on the canvas. */}
      <StudioNode id="publish-workspace" title="Publishing Studio" initialX={50} initialY={80}>
        <ForgeStudio isOpen={true} settings={defaultSettings} />
      </StudioNode>
    </StudioShell>
  );
}