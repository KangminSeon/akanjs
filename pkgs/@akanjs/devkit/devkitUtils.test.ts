import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApplicationBuildReporter } from "./applicationBuildReporter";
import { resolveSignalTestPreloadPath } from "./applicationTestPreload";
import { TypeScriptDependencyScanner } from "./dependencyScanner";
import { extractDependencies } from "./extractDeps";
import { getModelFileData } from "./getModelFileData";
import type { PackageJson, TsConfigJson } from "./types";

const tempRoots: string[] = [];

const makeTempRoot = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "akan-devkit-utils-"));
  tempRoots.push(root);
  return root;
};

const write = async (filePath: string, content: string) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
};

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("extractDependencies", () => {
  const packageJson: PackageJson = {
    name: "fixture",
    version: "1.0.0",
    description: "fixture",
    dependencies: {
      react: "19.0.0",
      "@scope/pkg": "1.0.0",
      lodash: "4.0.0",
    },
    devDependencies: {
      typescript: "6.0.0",
      vite: "5.0.0",
    },
  };

  test("extracts runtime package versions from imports and requires", () => {
    const deps = extractDependencies(
      [
        {
          path: "index.ts",
          text: [
            'import React from "react";',
            'import { value } from "@scope/pkg/subpath";',
            'import type { Type } from "typescript";',
            'const lodash = require("lodash/fp");',
            'const fs = require("node:fs");',
            'const path = require("path");',
            "",
          ].join("\n"),
        },
        { path: "style.css", text: '@import "vite";' },
      ],
      packageJson,
      ["vite"],
    );

    expect(deps).toEqual({
      "@scope/pkg": "1.0.0",
      lodash: "4.0.0",
      react: "19.0.0",
      typescript: "6.0.0",
      vite: "5.0.0",
    });
  });

  test("reports missing dependency sections and missing versions", () => {
    expect(() =>
      extractDependencies([{ path: "index.ts", text: 'import React from "react";' }], {
        name: "broken",
        version: "1.0.0",
        description: "broken",
      }),
    ).toThrow("No dependencies found");

    expect(() => extractDependencies([], packageJson, ["missing"])).toThrow("No version found for missing");
  });
});

describe("resolveSignalTestPreloadPath", () => {
  test("resolves the preload file from an installed akanjs package", async () => {
    const root = await makeTempRoot();
    const libDir = path.join(root, "libs/shared");
    await write(
      path.join(root, "node_modules/akanjs/package.json"),
      JSON.stringify({
        name: "akanjs",
        version: "0.0.0",
        exports: { "./package.json": "./package.json" },
      }),
    );
    await write(path.join(root, "node_modules/akanjs/test/signalTest.preload.ts"), "export {};\n");

    await expect(resolveSignalTestPreloadPath({ cwdPath: libDir })).resolves.toContain(
      "node_modules/akanjs/test/signalTest.preload.ts",
    );
  });
});

describe("TypeScriptDependencyScanner", () => {
  test("separates monorepo package, lib, runtime, and type-only dependencies", async () => {
    const root = await makeTempRoot();
    const appDir = path.join(root, "apps/demo");
    await write(
      path.join(appDir, "index.ts"),
      [
        'import React from "react";',
        'import { helper } from "@libs/shared/helper";',
        'import { tool } from "akanjs/tool";',
        'import type { Config } from "typescript";',
        'import { local } from "./local";',
        "console.log(React, helper, tool, local);",
        "",
      ].join("\n"),
    );
    await write(path.join(appDir, "local.ts"), 'import "lodash";\nexport const local = 1;\n');
    await write(path.join(appDir, "node_modules/ignored.ts"), 'import "ignored";\n');
    await write(path.join(root, ".gitignore"), "ignored-dir\n");

    const rootPackageJson: PackageJson = {
      name: "repo",
      version: "1.0.0",
      description: "repo",
      dependencies: {
        react: "19.0.0",
        lodash: "4.0.0",
      },
      devDependencies: {
        typescript: "6.0.0",
      },
    };
    const tsconfig: TsConfigJson = { compilerOptions: { target: "ESNext" } };
    const scanner = new TypeScriptDependencyScanner(appDir, {
      workspaceRoot: root,
      tsconfig,
      rootPackageJson,
      gitignorePatterns: ["ignored-dir"],
    });

    const deps = await scanner.getMonorepoDependencies("demo", {
      pkgs: ["akanjs/tool"],
      libs: ["shared"],
    });
    expect(deps.pkgDeps).toEqual(["akanjs/tool"]);
    expect(deps.libDeps).toEqual(["shared"]);
    expect(deps.npmDeps.sort()).toEqual(["lodash", "react"]);
    expect(deps.npmDevDeps).toEqual(["typescript"]);

    const graph = scanner.generateDependencyGraph();
    expect(graph).toContain("index.ts");
    expect(graph).toContain("@libs/shared/helper");
  });

  test("scans package build dependencies with normalized imports and css plugins", async () => {
    const root = await makeTempRoot();
    const pkgDir = path.join(root, "pkgs/akanjs");
    await write(
      path.join(pkgDir, "index.ts"),
      [
        "#!/usr/bin/env bun",
        'import "lodash/fp";',
        'import { AiOutlineApi } from "react-icons/ai";',
        'import type { Config } from "typescript";',
        'import type { DebouncedFunc } from "lodash";',
        'import "node:path";',
        'import "bun:test";',
        'import "akanjs/client";',
        "export const value = AiOutlineApi;",
        "export type ToolConfig = Config & { debounced?: DebouncedFunc<() => void> };",
        "",
      ].join("\n"),
    );
    await write(path.join(pkgDir, "styles.css"), '@plugin "tailwind-scrollbar";\n');
    await write(path.join(pkgDir, "index.test.ts"), 'import "commander";\n');
    await write(path.join(pkgDir, "build.ts"), 'import { Command } from "commander";\n');
    await write(path.join(pkgDir, "commented.ts"), '// import type { Linter } from "eslint";\n');

    const rootPackageJson: PackageJson = {
      name: "repo",
      version: "1.0.0",
      description: "repo",
      dependencies: {
        lodash: "4.0.0",
        "react-icons": "5.0.0",
        "tailwind-scrollbar": "4.0.0",
      },
      devDependencies: {
        commander: "14.0.0",
        typescript: "6.0.0",
      },
    };
    const tsconfig: TsConfigJson = { compilerOptions: { target: "ESNext" } };
    const scanner = new TypeScriptDependencyScanner(pkgDir, {
      workspaceRoot: root,
      tsconfig,
      rootPackageJson,
    });

    const deps = await scanner.getPackageBuildDependencies("akanjs");

    expect(deps.npmDeps).toEqual(["lodash", "react-icons", "tailwind-scrollbar"]);
    expect(deps.npmDevDeps).toEqual(["commander", "typescript"]);
    expect(deps.missingDeps).toEqual([]);
  });
});

describe("getModelFileData", () => {
  test("reads model files and derives imported local, scalar, and lib models", async () => {
    const root = await makeTempRoot();
    const cwd = process.cwd();
    process.chdir(root);
    try {
      await write(
        path.join(root, "apps/demo/lib/post/post.constant.ts"),
        [
          'import { cnst as shared } from "@libs/shared";',
          'import { User } from "../user/user.constant";',
          'import { Money } from "../_money/money.constant";',
          "export const Post = {};",
          "",
        ].join("\n"),
      );
      await write(
        path.join(root, "apps/demo/lib/post/post.Unit.tsx"),
        "export default function Unit() { return null; }\n",
      );
      await write(
        path.join(root, "apps/demo/lib/post/post.View.tsx"),
        "export default function View() { return null; }\n",
      );

      const data = await getModelFileData("apps/demo", "post");
      expect(data).toMatchObject({
        moduleType: "app",
        moduleName: "demo",
        modelName: "post",
        importModelNames: ["user"],
        hasImportScalar: true,
        importLibNames: ["shared"],
      });
      expect(data.constantFileStr).toContain("export const Post");
      expect(data.unitFileStr).toContain("Unit");
      expect(data.viewFileStr).toContain("View");
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("ApplicationBuildReporter", () => {
  test("formats duration, phase lines, and nested errors", () => {
    expect(ApplicationBuildReporter.formatDuration(999)).toBe("999ms");
    expect(ApplicationBuildReporter.formatDuration(1234)).toBe("1.2s");
    expect(ApplicationBuildReporter.formatDuration(65_000)).toBe("1m 5s");
    expect(
      ApplicationBuildReporter.formatPhaseLine({
        id: "bundle",
        label: "Bundle",
        durationMs: 1500,
        summary: "3 files",
      }),
    ).toBe("✓ Bundle: 3 files (1.5s)");

    const nested = new Error("outer", { cause: new Error("inner") });
    expect(ApplicationBuildReporter.formatError(nested)).toBe("outer\nCaused by: inner");

    const aggregate = new AggregateError([new Error("first"), { message: "second" }, "third"], "failed");
    expect(ApplicationBuildReporter.formatError(aggregate)).toBe(
      ["failed", "  first", "  second", "  third"].join("\n"),
    );
  });
});
