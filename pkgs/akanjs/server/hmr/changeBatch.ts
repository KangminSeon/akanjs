/**
 * Runtime-safe change-classification types shared between the dev-time
 * filesystem watcher (which lives in `akanjs/devkit/frontendBuild`) and
 * the server-side HMR controller that consumes its batches over IPC.
 *
 * Keeping these as a types-only module lets the server package stay
 * completely independent of `fs.watch` / `node:fs`.
 */
export type ChangeKind = "code" | "css" | "config" | "ignore";

export interface ChangeBatch {
  files: string[];
  kinds: Set<Exclude<ChangeKind, "ignore">>;
}
