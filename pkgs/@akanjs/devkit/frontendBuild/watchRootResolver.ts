import fs from "node:fs";
import path from "node:path";
import type { App } from "../commandDecorators";

export class WatchRootResolver {
  #app: App;

  constructor(app: App) {
    this.#app = app;
  }

  async resolve(): Promise<string[]> {
    const tsconfig = await this.#app.getTsConfig();
    const set = new Set<string>();
    set.add(path.resolve(`${this.#app.cwdPath}/page`));
    for (const targets of Object.values(tsconfig.compilerOptions.paths ?? {})) {
      for (const target of targets) {
        if (!target) continue;
        if (path.isAbsolute(target)) continue;
        // Strip the trailing filename and glob so we watch the package root dir.
        const cleaned = target.replace(/\/?\*+.*$/, "").replace(/\/[^/]+\.[^/]+$/, "");
        const resolved = path.resolve(this.#app.workspace.workspaceRoot, cleaned);
        if (fs.existsSync(resolved)) set.add(resolved);
      }
    }
    return [...set];
  }
}
