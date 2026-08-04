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

import React, { ReactNode } from "react";
import { AutomationCanvas } from "./AutomationCanvas";

/**
 * StudioShell is a lightweight wrapper used by every studio in the
 * LeeWay IDE. It provides the common dotted‑grid automation canvas
 * background and positions children on top of that canvas. By
 * separating the canvas from individual studio implementations we
 * ensure a consistent feel across code, writer, audio, vision, video,
 * devices, XR and publish studios. The canvas itself is non‑interactive
 * by default; individual workspaces are expected to supply their own
 * draggable frames and node graphs on top. When additional global
 * configuration (e.g. background images or themes) is added later
 * those values can be passed via context or props and consumed here.
 */
interface StudioShellProps {
  /**
   * Children represent the studio specific UI. They will be
   * absolutely positioned above the dotted grid canvas. Child
   * components can bring their own panels, windows and nodes as
   * needed.
   */
  children: ReactNode;
}

export function StudioShell({ children }: StudioShellProps) {
  return (
    <div className="flex-1 relative overflow-hidden" id="studio-shell-container">
      {/* The automation canvas is rendered first so it sits behind all
          other content. It provides a dotted grid and subtle gradient
          overlay that defines the automation assembly surface. */}
      <AutomationCanvas />
      {/* Children are rendered on top of the canvas. Absolute
          positioning allows workspaces to freely place their panels,
          nodes and previews without interfering with the canvas. */}
      <div className="absolute inset-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}