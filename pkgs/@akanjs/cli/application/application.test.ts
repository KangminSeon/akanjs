import { afterEach, describe, expect, mock, test } from "bun:test";
import { AppExecutor, CommandContainer, getArgMetas, getTargetMetas, LibExecutor, PkgExecutor } from "@akanjs/devkit";
import {
  cleanupCliTempWorkspace,
  createCallRecorder,
  createFakeExecutor,
  createTempApp,
  createTempLib,
  createTempPackage,
  writeText,
} from "../testHelpers";
import { ApplicationCommand } from "./application.command";
import { ApplicationRunner } from "./application.runner";
import { ApplicationScript } from "./application.script";

const tempRoots: string[] = [];

afterEach(async () => {
  CommandContainer.clear();
  mock.restore();
  await Promise.all(tempRoots.splice(0).map((root) => cleanupCliTempWorkspace(root)));
});

describe("ApplicationCommand", () => {
  test("exposes command metadata and delegates normalized app creation", async () => {
    const metas = Object.fromEntries(
      getArgMetas(ApplicationCommand, "createApplication")[0].map((arg) => [arg.idx, arg.type]),
    );
    expect(metas).toEqual({ 0: "Argument", 1: "Option", 2: "Workspace" });

    const command = CommandContainer.get(ApplicationCommand);
    const calls: unknown[] = [];
    command.applicationScript.createApplication = async (...args: unknown[]) => {
      calls.push(args);
    };
    const handler = getTargetMetas(ApplicationCommand).find((meta) => meta.key === "createApplication")?.handler;
    await handler?.call(command, "My App", true, { name: "workspace" });
    expect(calls).toEqual([["my-app", { name: "workspace" }, { start: true }]]);
  });
});

describe("ApplicationScript", () => {
  test("prepares apps, libs, and packages before running tests", async () => {
    const script = CommandContainer.get(ApplicationScript);
    const recorder = createCallRecorder();
    const app = Object.setPrototypeOf(
      createFakeExecutor("app", { type: "app" }, recorder),
      AppExecutor.prototype,
    ) as AppExecutor;
    const lib = Object.setPrototypeOf(
      createFakeExecutor("lib", { type: "lib" }, recorder),
      LibExecutor.prototype,
    ) as LibExecutor;
    const pkg = Object.setPrototypeOf(createFakeExecutor("pkg", {}, recorder), PkgExecutor.prototype) as PkgExecutor;

    script.libraryScript.syncLibrary = async (target: unknown) => {
      recorder.record("syncLibrary", target);
      return undefined as never;
    };
    script.applicationRunner.test = async (target: unknown) => {
      recorder.record("runner.test", target);
    };

    await script.test(app, { write: false });
    await script.test(lib, { write: true });
    await script.test(pkg, { write: true });

    expect(recorder.names()).toEqual([
      "app.spinning",
      "app.scanSync",
      "spinner.succeed",
      "runner.test",
      "syncLibrary",
      "lib.spinning",
      "spinner.succeed",
      "runner.test",
      "pkg.spinning",
      "pkg.scan",
      "spinner.succeed",
      "runner.test",
    ]);
  });

  test("blocks local Android release without explicit opt-in", async () => {
    const script = CommandContainer.get(ApplicationScript);
    const recorder = createCallRecorder();
    const app = createFakeExecutor(
      "demo",
      {
        scanSync: async (...args: unknown[]) => recorder.record("scanSync", ...args),
      },
      recorder,
    );

    await expect(script.releaseAndroid(app as never, "apk", { env: "local" })).rejects.toThrow(
      "--env local is blocked",
    );
    expect(recorder.names()).toEqual(["scanSync"]);
  });
});

describe("ApplicationRunner", () => {
  test("validates app script filenames and spawns bun with command env", async () => {
    const { root, app } = await createTempApp("demo");
    tempRoots.push(root);
    await writeText(`${app.cwdPath}/script/hello.ts`, "export default 1;\n");
    const runner = new ApplicationRunner();
    const spawn = mock(async () => "");
    app.spawn = spawn as never;
    app.getCommandEnv = (env: Record<string, string>) => ({ ...env, AKAN_PUBLIC_APP_NAME: "demo" });

    await expect(runner.runScript(app, "../secret")).rejects.toThrow("Invalid script filename");
    await expect(runner.runScript(app, "missing")).rejects.toThrow("Script file not found");

    await runner.runScript(app, "hello.ts");
    expect(spawn).toHaveBeenCalledWith("bun", ["script/hello.ts"], {
      env: { AKAN_COMMAND_TYPE: "script", AKAN_PUBLIC_APP_NAME: "demo" },
      stdio: "inherit",
    });
  });

  test("runs bun test through the resolved executor", async () => {
    const { root, pkg } = await createTempPackage();
    tempRoots.push(root);
    const runner = new ApplicationRunner();
    const spawn = mock(async () => "");
    pkg.spawn = spawn as never;

    await runner.test(pkg);
    expect(spawn).toHaveBeenCalledWith("bun", ["test", "--isolate"], {
      stdio: "inherit",
    });
  });

  test("runs signal target tests with preload resolved from installed akanjs", async () => {
    const { root, lib } = await createTempLib("shared");
    tempRoots.push(root);
    await writeText(
      `${root}/node_modules/akanjs/package.json`,
      JSON.stringify({
        name: "akanjs",
        version: "0.0.0",
        exports: { "./package.json": "./package.json" },
      }),
    );
    await writeText(`${root}/node_modules/akanjs/test/signalTest.preload.ts`, "export {};\n");
    const runner = new ApplicationRunner();
    const spawn = mock(async () => "");
    lib.spawn = spawn as never;

    await runner.test(lib);

    expect(spawn).toHaveBeenCalledWith(
      "bun",
      ["test", "--isolate", "--preload", expect.stringContaining("node_modules/akanjs/test/signalTest.preload.ts")],
      {
        env: {
          ...process.env,
          AKAN_TEST_SIGNAL: "1",
          AKAN_TEST_TARGET_TYPE: "lib",
          AKAN_TEST_TARGET_NAME: "shared",
          AKAN_TEST_LIBS: "",
        },
        stdio: "inherit",
      },
    );
  });
});
