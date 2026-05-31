interface StageTask {
  label: string;
  run: () => Promise<unknown>;
}

/**
 * Run every task in parallel and, if any rejects, throw a single
 * `AggregateError` that enumerates every failing label + cause. This replaces
 * the previous `Promise.all` flow where a second concurrent failure in the
 * same stage would hide the first, making boot errors hard to localize.
 */
export const runStage = async (stageLabel: string, tasks: StageTask[]): Promise<void> => {
  if (tasks.length === 0) return;
  const settled = await Promise.allSettled(tasks.map((t) => t.run()));
  const failures: { label: string; reason: unknown }[] = [];
  settled.forEach((res, i) => {
    if (res.status === "rejected") {
      const task = tasks[i];
      failures.push({ label: task ? task.label : `#${i}`, reason: res.reason });
    }
  });
  if (failures.length === 0) return;
  const summary = failures.map((f) => `  • ${f.label}: ${reasonMessage(f.reason)}`).join("\n");
  const errors = failures.map((f) => toError(f.reason));
  throw new AggregateError(errors, `[DI:${stageLabel}] ${failures.length}/${tasks.length} task(s) failed:\n${summary}`);
};

export const toError = (reason: unknown): Error => {
  return reason instanceof Error ? reason : new Error(String(reason));
};

export const reasonMessage = (reason: unknown): string => {
  if (reason instanceof Error) {
    if (reason instanceof AggregateError && reason.errors?.length) {
      return `${reason.message} [${reason.errors.length} nested]`;
    }
    return reason.message;
  }
  return String(reason);
};
