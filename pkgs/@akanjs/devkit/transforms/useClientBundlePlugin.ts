import type { BunPlugin } from "bun";
import { transformUseClient } from "./rscUseClientTransform";

/**
 * BunPlugin that stubs `"use client"` modules so the server bundle sees
 * `registerClientReference(proxy, absPath, name)` stubs instead of the
 * original client code.
 *
 * The bundle produced by `PagesBundleBuilder` is loaded in the RSC worker
 * with `--conditions react-server`; client components are never supposed
 * to execute there. The resulting stub references keep the client
 * component manifest lookups working at render time while ensuring the
 * server bundle never drags the real client source graph in.
 *
 * Important: the second argument to `registerClientReference` must match the
 * key the client manifest uses. When `workspaceRoot` is provided, both sides
 * use workspace-relative keys so production artifacts are portable.
 */
export function createUseClientBundlePlugin(options: { workspaceRoot?: string } = {}): BunPlugin {
  return {
    name: "akan-use-client-bundle",
    setup(build) {
      build.onLoad({ filter: /\.(tsx|ts|jsx|js)$/ }, async (args) => {
        if (args.path.includes("/node_modules/")) return undefined;
        let source: string;
        try {
          source = await Bun.file(args.path).text();
        } catch {
          return undefined;
        }
        const stubbed = transformUseClient(source, {
          path: args.path,
          workspaceRoot: options.workspaceRoot,
        });
        if (stubbed === null) return undefined;
        return { contents: stubbed, loader: loaderFor(args.path) };
      });
    },
  };
}

function loaderFor(absPath: string): "ts" | "tsx" | "js" | "jsx" {
  if (absPath.endsWith(".tsx")) return "tsx";
  if (absPath.endsWith(".jsx")) return "jsx";
  if (absPath.endsWith(".ts")) return "ts";
  return "js";
}
