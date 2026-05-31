import { afterEach, describe, expect, mock, test } from "bun:test";
import { IncrementalBuilderHost } from "./incrementalBuilder.host";

const originalSpawn = Bun.spawn;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  (Bun as unknown as { spawn: typeof Bun.spawn }).spawn = originalSpawn;
  mock.restore();
});

describe("IncrementalBuilderHost", () => {
  test("restarts after a ready builder exits", async () => {
    const spawns: Array<{
      proc: { pid: number; send: ReturnType<typeof mock>; kill: ReturnType<typeof mock>; killed: boolean };
      options: { ipc?: (message: unknown) => void; onExit?: () => void };
    }> = [];
    (Bun as unknown as { spawn: typeof Bun.spawn }).spawn = mock((_, options) => {
      const proc = { pid: 10_000 + spawns.length, send: mock(), kill: mock(), killed: false };
      spawns.push({ proc, options: options as { ipc?: (message: unknown) => void; onExit?: () => void } });
      return proc as never;
    }) as never;

    const onReady = mock();
    const onRestartReady = mock();
    const host = new IncrementalBuilderHost({
      app: { cwdPath: "/tmp/app" } as never,
      entry: "/tmp/builder.ts",
      env: {},
      onMessage: () => undefined,
    });

    host.start({ onReady, onRestartReady });
    spawns[0]?.options.ipc?.({ type: "builder-ready" });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(host.status).toBe("ready");

    spawns[0]?.options.onExit?.();
    expect(host.status).toBe("restarting");
    expect(host.send({ type: "build-route", id: 1, routeId: "a", seeds: [], knownEntries: [] })).toBe(false);

    await wait(1_050);
    expect(spawns).toHaveLength(2);
    spawns[1]?.options.ipc?.({ type: "builder-ready" });
    expect(onRestartReady).toHaveBeenCalledTimes(1);
    expect(host.status).toBe("ready");

    host.stop();
  });
});
