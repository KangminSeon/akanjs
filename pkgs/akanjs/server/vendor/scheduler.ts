// @ts-nocheck — `scheduler` ships no `.d.ts`, and see ./react.ts for the
// rationale behind manual named re-exports (Bun's `export * from "<cjs>"`
// doesn't emit ESM exports).
import * as m from "scheduler";

export default m;
export const {
  unstable_IdlePriority,
  unstable_ImmediatePriority,
  unstable_LowPriority,
  unstable_NormalPriority,
  unstable_Profiling,
  unstable_UserBlockingPriority,
  unstable_cancelCallback,
  unstable_forceFrameRate,
  unstable_getCurrentPriorityLevel,
  unstable_next,
  unstable_now,
  unstable_requestPaint,
  unstable_runWithPriority,
  unstable_scheduleCallback,
  unstable_shouldYield,
  unstable_wrapCallback,
} = m;
