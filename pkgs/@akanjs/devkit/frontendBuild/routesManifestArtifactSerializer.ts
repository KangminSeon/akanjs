import path from "node:path";
import type { RoutesManifest, SsrManifestEntry } from "akanjs/server";

export type SerializedRoutesManifest = Omit<RoutesManifest, "knownEntries"> &
  Partial<Pick<RoutesManifest, "knownEntries">>;

export class RoutesManifestArtifactSerializer {
  #manifest: RoutesManifest;
  #artifactDir: string;
  #production: boolean;

  constructor(manifest: RoutesManifest, artifactDir: string, options: { production?: boolean } = {}) {
    this.#manifest = manifest;
    this.#artifactDir = path.resolve(artifactDir);
    this.#production = options.production ?? false;
  }

  static serialize(
    manifest: RoutesManifest,
    artifactDir: string,
    options: { production?: boolean } = {},
  ): SerializedRoutesManifest {
    return new RoutesManifestArtifactSerializer(manifest, artifactDir, options).serialize();
  }

  serialize(): SerializedRoutesManifest {
    const serialized: SerializedRoutesManifest = {
      ...this.#manifest,
      knownEntries: this.#manifest.knownEntries.map((entry) => this.#serializeArtifactPath(entry)),
    };
    if (this.#production) delete serialized.knownEntries;
    return {
      ...serialized,
      clientManifest: Object.fromEntries(
        Object.entries(this.#manifest.clientManifest).map(([key, row]) => [this.#serializeArtifactPath(key), row]),
      ),
      ssrManifest: {
        ...this.#manifest.ssrManifest,
        moduleMap: Object.fromEntries(
          Object.entries(this.#manifest.ssrManifest.moduleMap).map(([entryUrl, byName]) => [
            entryUrl,
            Object.fromEntries(
              Object.entries(byName).map(([name, entry]) => [
                name,
                {
                  ...entry,
                  id: this.#serializeArtifactPath(entry.id),
                  chunks: entry.chunks.map((chunk) => this.#serializeArtifactPath(chunk)),
                } satisfies SsrManifestEntry,
              ]),
            ),
          ]),
        ),
      },
    };
  }

  #serializeArtifactPath(artifactPath: string): string {
    if (!path.isAbsolute(artifactPath)) return artifactPath;
    return path.relative(this.#artifactDir, artifactPath).split(path.sep).join("/");
  }
}
