import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Loader } from "bun";
import type { Executor } from "./executors";
import { FileSys } from "./fileSys";
import type { PackageJson } from "./types";

/** Relative paths under these directories are not used as Bun.build entrypoints (Bun does not expand `**` in entrypoint strings; we scan with {@link Bun.Glob}). */
const SKIP_ENTRY_DIR_SET = new Set(["node_modules", "dist", "build", ".git", ".next"]);

const assetExtensions = [".css", ".md", ".js", ".png", ".ico", ".svg", ".json", ".template"];
const assetLoader = Object.fromEntries(assetExtensions.map((ext) => [ext, "file" as const])) satisfies Record<
  string,
  Loader
>;

type BunBuildConfig = Parameters<typeof Bun.build>[0] & { bundle?: boolean };
type ExportValue = string | string[] | { [condition: string]: ExportValue };

interface BuildOptions {
  bundle?: boolean;
  additionalEntryPoints?: string[];
}

interface BuilderOptions {
  executor: Executor;
  distExecutor: Executor;
  pkgJson: PackageJson;
  rootPackageJson: PackageJson;
}
export class Builder {
  #executor: Executor;
  #distExecutor: Executor;
  #pkgJson: PackageJson;

  constructor({ executor, distExecutor, pkgJson }: BuilderOptions) {
    this.#executor = executor;
    this.#distExecutor = distExecutor;
    this.#pkgJson = pkgJson;
  }
  #globEntrypoints(cwd: string, pattern: string): string[] {
    const glob = new Bun.Glob(pattern);
    return Array.from(glob.scanSync({ cwd, onlyFiles: true }))
      .filter((relativePath) => {
        const segments = relativePath.split(path.sep);
        return !segments.some((segment) => SKIP_ENTRY_DIR_SET.has(segment));
      })
      .map((rel) => path.join(cwd, rel));
  }
  #globFiles(cwd: string, pattern = "**/*.*"): string[] {
    const glob = new Bun.Glob(pattern);
    return Array.from(glob.scanSync({ cwd, onlyFiles: true })).filter((relativePath) => {
      const segments = relativePath.split(path.sep);
      return !segments.some((segment) => SKIP_ENTRY_DIR_SET.has(segment));
    });
  }

  #resolveAdditionalEntrypoints(cwd: string, additionalEntryPoints: string[]): string[] {
    const out: string[] = [];
    for (const p of additionalEntryPoints) {
      if (p.includes("*")) {
        const rel = p.startsWith(`${cwd}/`) || p.startsWith(`${cwd}${path.sep}`) ? p.slice(cwd.length + 1) : p;
        out.push(...this.#globEntrypoints(cwd, rel));
      } else out.push(path.isAbsolute(p) ? p : path.join(cwd, p));
    }
    return out;
  }
  #getBuildOptions({ bundle = false, additionalEntryPoints = [] }: BuildOptions = {}): BunBuildConfig {
    const cwd = this.#executor.cwdPath;
    const entrypoints = [
      ...(bundle ? [path.join(cwd, "index.ts")] : this.#globEntrypoints(cwd, "**/*.{ts,tsx}")),
      ...this.#resolveAdditionalEntrypoints(cwd, additionalEntryPoints),
    ];
    return {
      root: cwd,
      entrypoints,
      bundle,
      packages: "external",
      splitting: false,
      target: this.#pkgJson.bun?.platform,
      format: "esm",
      outdir: this.#distExecutor.cwdPath,
      external: ["react", "react-dom"],
      loader: assetLoader,
    };
  }
  async #copySourceFiles() {
    const cwd = this.#executor.cwdPath;
    for (const relativePath of this.#globFiles(cwd)) {
      if (relativePath === "package.json") continue;
      const sourcePath = path.join(cwd, relativePath);
      const targetPath = path.join(this.#distExecutor.cwdPath, relativePath);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await Bun.write(targetPath, Bun.file(sourcePath));
    }
  }
  #toPublishedPath(publishedPath: string, { useSource }: { useSource: boolean }) {
    const hasDotSlash = publishedPath.startsWith("./");
    const withoutFormatDir = publishedPath.replace(/^(?:\.\/)?(?:esm|cjs)\//, hasDotSlash ? "./" : "");
    if (!useSource) return withoutFormatDir;
    if (!hasDotSlash && withoutFormatDir === publishedPath) return publishedPath;
    const parsed = path.posix.parse(withoutFormatDir);
    if (![".js", ".mjs", ".cjs"].includes(parsed.ext)) return withoutFormatDir;
    const withoutExt = path.posix.join(parsed.dir, parsed.name);
    const sourcePath = withoutExt.startsWith("./") ? withoutExt.slice(2) : withoutExt;
    const sourceCandidates = [`${sourcePath}.ts`, `${sourcePath}.tsx`];
    const matchedSource = sourceCandidates.find((candidate) =>
      existsSync(path.join(this.#executor.cwdPath, candidate)),
    );
    if (!matchedSource) return withoutFormatDir;
    return hasDotSlash ? `./${matchedSource}` : matchedSource;
  }
  #normalizeExports(
    exportsValue: ExportValue | undefined,
    { useSource }: { useSource: boolean },
  ): ExportValue | undefined {
    if (!exportsValue) return exportsValue;
    if (typeof exportsValue === "string") return this.#toPublishedPath(exportsValue, { useSource });
    if (Array.isArray(exportsValue))
      return exportsValue.map((value) => this.#normalizeExports(value, { useSource }) as string);
    if (typeof exportsValue !== "object") return exportsValue;

    return Object.fromEntries(
      Object.entries(exportsValue)
        .filter(([condition]) => condition !== "require")
        .map(([condition, value]) => [condition, this.#normalizeExports(value, { useSource })])
        .filter((entry): entry is [string, ExportValue] => entry[1] !== undefined),
    );
  }
  #getPackageJson({ bundle = false }: BuildOptions = {}): PackageJson {
    const rootEntry = bundle ? "./index.js" : "./index.ts";
    const normalizedExports = this.#normalizeExports(this.#pkgJson.exports as ExportValue | undefined, {
      useSource: !bundle,
    });
    return {
      ...this.#pkgJson,
      type: "module",
      main: rootEntry,
      bin: this.#normalizeExports(this.#pkgJson.bin as ExportValue | undefined, { useSource: !bundle }),
      exports: {
        ...((typeof normalizedExports === "object" && !Array.isArray(normalizedExports)
          ? normalizedExports
          : {}) as Record<string, ExportValue>),
        ".": {
          import: rootEntry,
          types: bundle ? "./index.d.ts" : "./index.ts",
        },
      },
    };
  }
  async build(options: BuildOptions = {}) {
    if (await FileSys.dirExists(this.#distExecutor.cwdPath))
      await this.#distExecutor.exec(`rm -rf ${this.#distExecutor.cwdPath}`);

    if (options.bundle) {
      const buildResult = await Bun.build({ ...this.#getBuildOptions(options) });
      if (!buildResult.success) throw new AggregateError(buildResult.logs, "Bundle failed");
    } else await this.#copySourceFiles();

    const pkgPackageJson = this.#getPackageJson(options);
    await this.#distExecutor.setPackageJson(pkgPackageJson);
  }
}
