import path from "node:path";
import { Logger } from "akanjs/common";

export interface BarrelExportTarget {
  /** Subpath specifier to emit in rewritten import, e.g. `akanjs/ui/Empty`. */
  subpath: string;
  /** Name as it is exported by the leaf module. */
  originalName: string;
}

export type BarrelExportMap = Map<string, BarrelExportTarget>;

export interface PackageEntry {
  /** Package specifier (e.g. `akanjs/ui`). */
  pkgName: string;
  /** Absolute path of the barrel entry file. */
  entryFile: string;
  /** Absolute directory used as the base for subpath computation. Typically dirname(entryFile). */
  pkgDir: string;
  /** Preserve concrete file paths for package exports that do not support extensionless deep imports. */
  preserveFilePath?: boolean;
}

export interface BarrelAnalyzerOptions {
  resolvePackage: (pkgName: string) => Promise<PackageEntry | null>;
  /** Resolve a relative specifier from `fromFile` to an absolute file path on disk. */
  resolveRelative?: (fromFile: string, relSpec: string) => Promise<string | null>;
}

// Re-export statements with an explicit source: `export { A, B as C } from "./x"`,
// `export * from "./x"`, `export * as ns from "./x"`. We rely on `Transpiler.scan`
// for the authoritative export name set; this regex only needs to give us the
// name↔source mapping that scan doesn't expose.
const REEXPORT_RE =
  /(?:^|\n)\s*export\s+(?:type\s+)?(?:(\*)(?:\s+as\s+(\w+))?|\{\s*([^}]*?)\s*\})\s+from\s+(["'])([^"']+)\4;?/g;

// Local named re-export without `from`: `export { A, B as C };`
// `Transpiler.scan` currently omits these from its `exports` list so we keep a
// small regex fallback. The lookahead sits immediately after `}` so that
// greedy whitespace matching cannot backtrack past it — otherwise it would
// also match `export type { X } from "./y"` statements.
const LOCAL_NAMED_RE = /(?:^|\n)\s*export\s+\{\s*([^}]*?)\s*\}(?!\s*from)/g;

const CANDIDATE_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

export class BarrelAnalyzer {
  readonly #logger = new Logger("BarrelAnalyzer");
  readonly #opts: BarrelAnalyzerOptions;
  readonly #cache = new Map<string, Promise<BarrelExportMap | null>>();
  readonly #tsTranspiler = new Bun.Transpiler({ loader: "ts" });
  readonly #tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });

  constructor(opts: BarrelAnalyzerOptions) {
    this.#opts = opts;
  }

  analyze(pkgName: string): Promise<BarrelExportMap | null> {
    const cached = this.#cache.get(pkgName);
    if (cached) return cached;
    const promise = this.#analyzeSafe(pkgName);
    this.#cache.set(pkgName, promise);
    return promise;
  }

  async #analyzeSafe(pkgName: string): Promise<BarrelExportMap | null> {
    try {
      return await this.#analyzeUncached(pkgName);
    } catch (err) {
      this.#logger.error(`analyze failed for ${pkgName}: ${(err as Error).message}`);
      return null;
    }
  }

  async #analyzeUncached(pkgName: string): Promise<BarrelExportMap | null> {
    const pkg = await this.#opts.resolvePackage(pkgName);
    if (!pkg) return null;
    const map: BarrelExportMap = new Map();
    const visited = new Set<string>();
    await this.#walk(pkg.entryFile, pkg, map, visited);
    return map;
  }

  async #walk(absFile: string, pkg: PackageEntry, map: BarrelExportMap, visited: Set<string>): Promise<void> {
    if (visited.has(absFile)) return;
    visited.add(absFile);
    const source = await readIfExists(absFile);
    if (source === null) return;
    const currentSubpath = this.#subpathFor(pkg, absFile);
    if (!currentSubpath) return;

    // Authoritative export names from Bun's transpiler. Filters type-only,
    // comments, strings, etc. automatically. `export *` re-exports are NOT
    // flooded here — they only show up as imports, so we recurse separately.
    const authoritative = this.#scanExports(source, absFile);
    // `default` is intentionally skipped — barrels rarely proxy defaults and
    // rewriting `import X from "pkg"` requires different semantics.
    authoritative.delete("default");

    // Names attributed to a specific leaf via `export ... from "./path"`.
    // Everything left over in `authoritative` after this is treated as a local
    // declaration at this file's own subpath.
    const attributed = new Set<string>();

    // Pass 1: `export { ... } from "./x"` and `export * [as ns] from "./x"`.
    REEXPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null = REEXPORT_RE.exec(source);
    while (m !== null) {
      const star = m[1];
      const nsAs = m[2];
      const namedList = m[3];
      const spec = m[5] ?? "";
      m = REEXPORT_RE.exec(source);
      if (!isRelative(spec)) continue;

      if (star) {
        if (nsAs) {
          // `export * as ns from "./x"` exposes a namespace object that we
          // cannot flatten into direct subpath imports. Ensure it's not misread
          // as a local declaration.
          authoritative.delete(nsAs);
          continue;
        }
        const targetAbs = await this.#resolveRel(absFile, spec);
        if (!targetAbs) continue;
        // Recurse: target's exports will land in `map` with target's subpath.
        // These names don't appear in this file's `authoritative` set, so the
        // local-declaration pass below won't misattribute them.
        await this.#walk(targetAbs, pkg, map, visited);
        continue;
      }

      if (namedList !== undefined) {
        const targetAbs = await this.#resolveRel(absFile, spec);
        if (!targetAbs) continue;
        const targetSubpath = this.#subpathFor(pkg, targetAbs);
        if (!targetSubpath) continue;
        for (const item of parseNamedList(namedList)) {
          if (item.isType) continue;
          if (item.imported === "default") continue;
          // Validate against scan — drops anything hidden behind `export type`
          // or otherwise not actually exported at runtime.
          if (!authoritative.has(item.local)) continue;
          attributed.add(item.local);
          if (!map.has(item.local)) {
            map.set(item.local, { subpath: targetSubpath, originalName: item.imported });
          }
        }
      }
    }

    // Pass 2: `export { A, B as C };` (no `from`). scan omits these, so the
    // regex is authoritative for this narrow case.
    LOCAL_NAMED_RE.lastIndex = 0;
    let n: RegExpExecArray | null = LOCAL_NAMED_RE.exec(source);
    while (n !== null) {
      const body = n[1] ?? "";
      n = LOCAL_NAMED_RE.exec(source);
      for (const item of parseNamedList(body)) {
        if (item.isType) continue;
        if (item.imported === "default") continue;
        // Validate against scan — ensures we don't treat commented-out or
        // otherwise dead code as a real local re-export.
        if (!authoritative.has(item.local)) continue;
        attributed.add(item.local);
        if (!map.has(item.local)) {
          map.set(item.local, { subpath: currentSubpath, originalName: item.imported });
        }
      }
    }

    // Pass 3: remaining authoritative names are local declarations defined in
    // this file (const/function/class/...). scan already filtered out
    // type-only and namespace-only exports for us.
    for (const name of authoritative) {
      if (attributed.has(name)) continue;
      if (map.has(name)) continue;
      map.set(name, { subpath: currentSubpath, originalName: name });
    }
  }

  #scanExports(source: string, absFile: string): Set<string> {
    try {
      const transpiler = [".tsx", ".jsx"].includes(path.extname(absFile)) ? this.#tsxTranspiler : this.#tsTranspiler;
      const { exports } = transpiler.scan(source);
      return new Set(exports);
    } catch (err) {
      this.#logger.error(`scan failed: ${(err as Error).message}`);
      return new Set();
    }
  }

  #subpathFor(pkg: PackageEntry, absFile: string): string | null {
    const rel = path.relative(pkg.pkgDir, absFile);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
    if (pkg.preserveFilePath) return `${pkg.pkgName}/${rel.split(path.sep).join("/")}`;
    const noExt = stripKnownExt(rel);
    // index files collapse to the directory — but the barrel entry is itself an index.
    // For nested `xxx/index.*`, callers are expected to import `@pkg/xxx` (not `xxx/index`).
    const tail = collapseIndex(noExt);
    if (tail === "") return pkg.pkgName;
    return `${pkg.pkgName}/${tail.split(path.sep).join("/")}`;
  }

  async #resolveRel(fromFile: string, relSpec: string): Promise<string | null> {
    if (this.#opts.resolveRelative) return this.#opts.resolveRelative(fromFile, relSpec);
    return defaultResolveRelative(fromFile, relSpec);
  }
}

interface NamedItem {
  imported: string;
  local: string;
  isType: boolean;
}

const parseNamedList = (listBody: string): NamedItem[] => {
  const out: NamedItem[] = [];
  for (const raw of listBody.split(",")) {
    const s = raw.trim();
    if (!s) continue;
    let rest = s;
    let isType = false;
    if (rest.startsWith("type ")) {
      isType = true;
      rest = rest.slice(5).trim();
    }
    const asMatch = /^(\w+)\s+as\s+(\w+)$/.exec(rest);
    if (asMatch) {
      out.push({ imported: asMatch[1] ?? "", local: asMatch[2] ?? "", isType });
      continue;
    }
    if (/^\w+$/.test(rest)) {
      out.push({ imported: rest, local: rest, isType });
    }
  }
  return out;
};

const isRelative = (spec: string): boolean => {
  return spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..";
};

const readIfExists = async (absFile: string): Promise<string | null> => {
  const file = Bun.file(absFile);
  if (!(await file.exists())) return null;
  return file.text();
};

const defaultResolveRelative = async (fromFile: string, relSpec: string): Promise<string | null> => {
  const baseDir = path.dirname(fromFile);
  const joined = path.resolve(baseDir, relSpec);
  if (path.extname(joined)) {
    if (await Bun.file(joined).exists()) return joined;
    return null;
  }
  for (const ext of CANDIDATE_EXTS) {
    const cand = joined + ext;
    if (await Bun.file(cand).exists()) return cand;
  }
  for (const ext of CANDIDATE_EXTS) {
    const cand = path.join(joined, `index${ext}`);
    if (await Bun.file(cand).exists()) return cand;
  }
  return null;
};

const stripKnownExt = (relPath: string): string => {
  for (const ext of CANDIDATE_EXTS) {
    if (relPath.endsWith(ext)) return relPath.slice(0, -ext.length);
  }
  return relPath;
};

const collapseIndex = (relPathNoExt: string): string => {
  const parts = relPathNoExt.split(path.sep);
  if (parts[parts.length - 1] === "index") parts.pop();
  return parts.join(path.sep);
};
