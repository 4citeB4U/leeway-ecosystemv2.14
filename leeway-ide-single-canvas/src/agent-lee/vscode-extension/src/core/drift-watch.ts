let errors = 0;

export function trackError(message: string) {
  errors++;
  return errors >= 5
    ? { drift: true, action: "STOP_AND_REVIEW", message }
    : { drift: false, action: "CONTINUE", message };
}

export function resetDrift() {
  errors = 0;
}
/*
LEEWAY_HEADER - DO NOT REMOVE

TAG: CORE.DRIFT.WATCH.MAIN
REGION: 🟢 CORE
PURPOSE: Drift monitoring and runtime governance watch logic for Agent Lee stability.
DISCOVERY_PIPELINE:
  Voice → Intent → Location → Vertical → Ranking → Render
*/
