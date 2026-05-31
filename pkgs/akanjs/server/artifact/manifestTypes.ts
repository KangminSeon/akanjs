import type { SsrManifest } from "../ssrTypes";

export interface ClientManifestEntry {
  id: string;
  chunks: string[];
  name: string;
  async?: boolean;
}

export type ClientManifest = Record<string, ClientManifestEntry>;

export interface BuildRouteClientResult {
  manifestDelta: ClientManifest;
  ssrManifestDelta: SsrManifest;
  newEntries: string[];
  discoveredEntries?: string[];
  clientDeps: string[];
  clientDepsByEntry?: Record<string, string[]>;
}
