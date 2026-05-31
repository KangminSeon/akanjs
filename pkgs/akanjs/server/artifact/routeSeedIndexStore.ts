import path from "node:path";
import { matchRoutePattern } from "akanjs/common";

/**
 * Runtime counterpart to `akanjs/devkit`'s `routeSeedIndex.ts`. The index
 * itself is computed at build time by the CLI (which walks the `pages`
 * registry and parses loader sources) and serialized to
 * `route-seed-index.json`. The server only loads that JSON at boot and matches
 * incoming pathnames against its route seed entries.
 *
 * Keeping this runtime-safe means `akanjs/server` never has to reach into
 * `app/pages.ts` or Function.prototype.toString() — which is what made the
 * previous in-process computation prone to drifting from the build pipeline.
 */
export interface RouteSeedEntry {
  routeId: string;
  pattern: string;
  seeds: string[];
}

export interface RouteSeedIndex {
  entries: RouteSeedEntry[];
  globalLayoutFiles: string[];
}

export interface MatchedRoute {
  entry: RouteSeedEntry;
  params: Record<string, string>;
}

type SerializedRouteSeedEntry = Pick<RouteSeedEntry, "routeId"> & Partial<Pick<RouteSeedEntry, "pattern" | "seeds">>;

interface SerializedRouteSeedIndex {
  entries: SerializedRouteSeedEntry[];
  globalLayoutFiles?: string[];
}

export const ROUTE_SEED_INDEX_JSON = "route-seed-index.json";

export class RouteSeedIndexStore {
  static async load(artifactDir: string): Promise<RouteSeedIndex> {
    const absPath = path.join(path.resolve(artifactDir), ROUTE_SEED_INDEX_JSON);
    const file = Bun.file(absPath);
    if (!(await file.exists())) {
      throw new Error(
        `[route-seed-index] ${absPath} missing — rebuild with \`akan build\` or \`akan start-backend\` so the index is generated`,
      );
    }
    const json = (await file.json()) as unknown;
    if (!json || typeof json !== "object") {
      throw new Error(`[route-seed-index] ${absPath} is not a valid JSON object`);
    }
    return RouteSeedIndexStore.normalize(json as SerializedRouteSeedIndex, path.resolve(artifactDir));
  }

  static normalize(index: SerializedRouteSeedIndex, artifactDir: string): RouteSeedIndex {
    const normalizedArtifactDir = path.resolve(artifactDir);
    return {
      entries: index.entries.map((entry) => ({
        ...entry,
        pattern: entry.pattern ?? entry.routeId,
        seeds: (entry.seeds ?? []).map((seed) =>
          RouteSeedIndexStore.#normalizeArtifactPath(seed, normalizedArtifactDir),
        ),
      })),
      globalLayoutFiles: (index.globalLayoutFiles ?? []).map((file) =>
        RouteSeedIndexStore.#normalizeArtifactPath(file, normalizedArtifactDir),
      ),
    };
  }

  /**
   * Match `pathname` against every registered route pattern using the same
   * `:param` semantics as route tree matching. Returns the first entry that
   * matches, along with the extracted parameters.
   */
  static match(pathname: string, entries: RouteSeedEntry[]): MatchedRoute | null {
    for (const entry of entries) {
      const params = matchRoutePattern(entry.pattern ?? entry.routeId, pathname);
      if (params) return { entry, params };
    }
    return null;
  }

  static #normalizeArtifactPath(artifactPath: string, artifactDir: string): string {
    if (path.isAbsolute(artifactPath)) return artifactPath;
    return path.resolve(artifactDir, artifactPath);
  }
}
