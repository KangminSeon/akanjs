export interface BuildRouteResultPayload {
  manifestDelta: Record<string, { id: string; chunks: string[]; name: string; async: boolean }>;
  ssrManifestDelta: Record<string, Record<string, { id: string; chunks: string[]; name: string; async: boolean }>>;
  newEntries: string[];
  discoveredEntries?: string[];
  clientDeps: string[];
  clientDepsByEntry?: Record<string, string[]>;
  routeId?: string;
  generation?: number;
}

export interface CssPayload {
  cssAssets: Record<string, { cssUrl: string; cssRelPath: string }>;
  cssBase64ByUrl: Record<string, string>;
  generation?: number;
  changedFiles?: string[];
}

// --- backend → builder (request/response) -------------------------------

export type BuilderReq = {
  type: "build-route";
  id: number;
  routeId: string;
  seeds: string[];
  knownEntries: string[];
  generation?: number;
};

export type BuilderRes =
  | { type: "build-route-res"; id: number; ok: true; data: BuildRouteResultPayload }
  | { type: "build-route-res"; id: number; ok: false; error: string };

// --- builder → backend (unsolicited events) -----------------------------

export interface PagesBundlePayload {
  bundlePath: string;
  buildId: number;
  generation?: number;
  changedFiles?: string[];
}

export type BuilderEvent =
  | { type: "builder-ready"; buildId: string }
  | { type: "backend-ready"; pid: number }
  | { type: "invalidate"; kinds: ("code" | "css" | "config")[]; files: string[]; generation?: number }
  | { type: "css-updated"; data: CssPayload }
  | { type: "pages-updated"; data: PagesBundlePayload };

export type BuilderMessage = BuilderReq | BuilderRes | BuilderEvent;
