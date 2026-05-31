export type AkanHmrPhase = "refresh-import" | "react-refresh" | null;

declare global {
  // Browser-only dev signal set by the Akan HMR client while applying Fast Refresh.
  var __AKAN_HMR_PHASE__: AkanHmrPhase | undefined;
}

export function getAkanHmrPhase(): AkanHmrPhase {
  if (typeof globalThis === "undefined") return null;
  const phase = globalThis.__AKAN_HMR_PHASE__;
  if (phase === "refresh-import" || phase === "react-refresh") return phase;
  return null;
}

export function isAkanHmrApplying(): boolean {
  return getAkanHmrPhase() !== null;
}
