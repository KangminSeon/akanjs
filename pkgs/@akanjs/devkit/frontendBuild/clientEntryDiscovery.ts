import path from "node:path";
import type { App } from "../commandDecorators";
import { BarrelAnalyzer } from "../transforms/barrelAnalyzer";
import { createTsconfigPackageResolver, rewriteBarrelImports } from "../transforms/barrelImportsPlugin";
import type { AkanConfig, ClientEntryDiscovery, ScannedImport } from "./clientBuildTypes";

const USE_CLIENT_RE = /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*["']use client["']/;
const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const NODE_MODULES_RE = /[\\/]node_modules[\\/]/;
const AKANJS_NODE_MODULE_RE = /[\\/]node_modules[\\/]akanjs[\\/]/;
// File extensions whose imports can't produce React client components and that
// the bundler handles via dedicated loaders. Skipping them avoids resolver
// noise (Bun's scanImports surfaces CSS / asset imports too).
const NON_SOURCE_EXT_RE = /\.(css|scss|sass|less|json|svg|png|jpe?g|webp|gif|avif|ico|woff2?|ttf|otf|mp3|mp4|wav)$/i;
type PackageResolver = Awaited<ReturnType<typeof createTsconfigPackageResolver>>;

const shouldSkipNodeModule = (absPath: string) => NODE_MODULES_RE.test(absPath) && !AKANJS_NODE_MODULE_RE.test(absPath);

/**
 * Graph-based `"use client"` discovery, seeded from an explicit file list.
 *
 * Walks imports — including dynamic `import()` — while flattening barrel
 * specifiers through the same `BarrelAnalyzer` the runtime plugin uses, so
 * the traversal matches the module graph the bundler will actually see.
 */
export class GraphClientEntryDiscovery implements ClientEntryDiscovery {
  #akanConfig: AkanConfig;
  #resolvePackage: PackageResolver;
  #analyzer: BarrelAnalyzer;
  #tsTranspiler = new Bun.Transpiler({ loader: "tsx" });
  #fileExistsCache = new Map<string, Promise<boolean>>();
  #readCache = new Map<string, Promise<string | null>>();
  #rewriteCache = new Map<string, Promise<string>>();
  #importCache = new Map<string, Promise<ScannedImport[]>>();
  #resolvedFileCache = new Map<string, Promise<string | null>>();
  #resolvedSpecifierCache = new Map<string, Promise<string | null>>();
  #reachableEntriesCache = new Map<string, Set<string>>();

  constructor(akanConfig: AkanConfig, resolvePackage: PackageResolver) {
    this.#akanConfig = akanConfig;
    this.#resolvePackage = resolvePackage;
    this.#analyzer = new BarrelAnalyzer({ resolvePackage });
  }

  static async create(app: App): Promise<GraphClientEntryDiscovery> {
    return new GraphClientEntryDiscovery(await app.getConfig(), await createTsconfigPackageResolver(app));
  }

  async discover(seeds: string[]): Promise<string[]> {
    const entries = new Set<string>();
    for (const seed of seeds) {
      for (const entry of await this.#discoverFromFile(seed, new Set())) entries.add(entry);
    }
    return Array.from(entries).sort();
  }

  invalidate(files: string[]): void {
    for (const file of files) {
      const absPath = path.resolve(file);
      this.#readCache.delete(absPath);
      this.#rewriteCache.delete(absPath);
      this.#importCache.delete(absPath);
      this.#reachableEntriesCache.delete(absPath);
    }
    // Parent files cache the transitive result of their imports, so a changed
    // child can affect any reachable-entry cache above it.
    if (files.length > 0) this.#reachableEntriesCache.clear();
  }

  async #fileExists(p: string): Promise<boolean> {
    const absPath = path.resolve(p);
    let cached = this.#fileExistsCache.get(absPath);
    if (!cached) {
      cached = Bun.file(absPath).exists();
      this.#fileExistsCache.set(absPath, cached);
    }
    return cached;
  }

  #readFile(file: string): Promise<string | null> {
    const absPath = path.resolve(file);
    let cached = this.#readCache.get(absPath);
    if (!cached) {
      cached = Bun.file(absPath)
        .text()
        .catch(() => null);
      this.#readCache.set(absPath, cached);
    }
    return cached;
  }

  async #resolveFileCandidate(absPathNoExt: string): Promise<string | null> {
    const cacheKey = path.resolve(absPathNoExt);
    let cached = this.#resolvedFileCache.get(cacheKey);
    if (cached) return cached;
    cached = (async () => {
      if (await this.#fileExists(cacheKey)) return cacheKey;
      for (const ext of SOURCE_EXTS) {
        const f = `${cacheKey}${ext}`;
        if (await this.#fileExists(f)) return f;
      }
      for (const ext of SOURCE_EXTS) {
        const f = path.join(cacheKey, `index${ext}`);
        if (await this.#fileExists(f)) return f;
      }
      return null;
    })();
    this.#resolvedFileCache.set(cacheKey, cached);
    return cached;
  }

  async #resolveSpecifier(spec: string, importerDir: string): Promise<string | null> {
    const cacheKey = `${importerDir}\0${spec}`;
    let cached = this.#resolvedSpecifierCache.get(cacheKey);
    if (cached) return cached;
    cached = (async () => {
      if (spec.startsWith(".") || spec.startsWith("/")) {
        const abs = spec.startsWith("/") ? spec : path.resolve(importerDir, spec);
        return this.#resolveFileCandidate(abs);
      }
      const pkg = await this.#resolvePackage(spec);
      if (pkg) return pkg.entryFile;
      return null;
    })();
    this.#resolvedSpecifierCache.set(cacheKey, cached);
    return cached;
  }

  async #getRewrittenSource(file: string, content: string): Promise<string> {
    const absPath = path.resolve(file);
    let cached = this.#rewriteCache.get(absPath);
    if (!cached) {
      cached = (async () => {
        if (this.#akanConfig.barrelImports.length === 0) return content;
        try {
          return (await rewriteBarrelImports(content, this.#akanConfig.barrelImports, this.#analyzer)) ?? content;
        } catch {
          return content;
        }
      })();
      this.#rewriteCache.set(absPath, cached);
    }
    return cached;
  }

  async #getImports(file: string, source: string): Promise<ScannedImport[]> {
    const absPath = path.resolve(file);
    let cached = this.#importCache.get(absPath);
    if (!cached) {
      cached = Promise.resolve().then(() => {
        try {
          return this.#tsTranspiler.scanImports(source);
        } catch {
          return [];
        }
      });
      this.#importCache.set(absPath, cached);
    }
    return cached;
  }

  async #discoverFromFile(file: string, visiting: Set<string>): Promise<Set<string>> {
    const absPath = path.resolve(file);
    const cached = this.#reachableEntriesCache.get(absPath);
    if (cached) return new Set(cached);
    if (visiting.has(absPath) || shouldSkipNodeModule(absPath)) return new Set();

    visiting.add(absPath);
    const entries = new Set<string>();
    const content = await this.#readFile(absPath);
    if (content === null) return this.#finishDiscovery(absPath, visiting, entries);

    if (USE_CLIENT_RE.test(content)) {
      entries.add(absPath);
      return this.#finishDiscovery(absPath, visiting, entries);
    }

    const source = await this.#getRewrittenSource(absPath, content);
    const imports = await this.#getImports(absPath, source);
    const importerDir = path.dirname(absPath);
    for (const imp of imports) {
      const spec = imp.path;
      if (!spec) continue;
      if (NON_SOURCE_EXT_RE.test(spec)) continue;
      const resolved = await this.#resolveSpecifier(spec, importerDir);
      if (!resolved) continue;
      if (shouldSkipNodeModule(resolved)) continue;
      for (const entry of await this.#discoverFromFile(resolved, visiting)) entries.add(entry);
    }

    return this.#finishDiscovery(absPath, visiting, entries);
  }

  #finishDiscovery(absPath: string, visiting: Set<string>, entries: Set<string>): Set<string> {
    visiting.delete(absPath);
    this.#reachableEntriesCache.set(absPath, entries);
    return new Set(entries);
  }
}
