import path from "node:path";
import {
  type App,
  AppExecutor,
  type ChangeBatch,
  type ClientEntryDiscovery,
  CsrArtifactBuilder,
  type CssCompiler,
  FontOptimizer,
  GraphClientEntryDiscovery,
  HmrWatcher,
  PagesBundleBuilder,
  RouteClientBuilder,
  SsrBaseArtifactBuilder,
  WatchRootResolver,
  WorkspaceExecutor,
} from "@akanjs/devkit";
import { Logger } from "akanjs/common";
import type {
  BaseBuildArtifact,
  BuilderEvent,
  BuilderMessage,
  BuilderReq,
  BuilderRes,
  BuildRouteResultPayload,
} from "akanjs/server";

interface IncrementalBuilderOptions {
  app: App;
  artifact: BaseBuildArtifact;
  watch: boolean;
  cssCompiler: CssCompiler;
  optimizedFonts: Awaited<ReturnType<FontOptimizer["optimize"]>>;
  discovery: ClientEntryDiscovery;
}

class IncrementalBuilder {
  #logger = new Logger("IncrementalBuilder");
  #app: App;
  #artifact: BaseBuildArtifact;
  #watch: boolean;
  #cssCompiler: CssCompiler;
  #optimizedFonts: Awaited<ReturnType<FontOptimizer["optimize"]>>;
  #discovery: ClientEntryDiscovery;
  #generation = 0;
  #workQueue: Promise<void> = Promise.resolve();
  #cssRebuildQueue: Promise<void> = Promise.resolve();
  #cssRebuildTimer: ReturnType<typeof setTimeout> | null = null;
  #pendingCssRebuild: { artifactDir: string; refresh: boolean; generation?: number; changedFiles?: string[] } | null =
    null;
  constructor(options: IncrementalBuilderOptions) {
    this.#app = options.app;
    this.#artifact = options.artifact;
    this.#watch = options.watch;
    this.#cssCompiler = options.cssCompiler;
    this.#optimizedFonts = options.optimizedFonts;
    this.#discovery = options.discovery;
  }

  async handleBuildRoute(msg: BuilderReq): Promise<BuilderRes> {
    return this.#enqueueWork(`build-route:${msg.routeId}`, async () => this.#handleBuildRoute(msg));
  }

  async #handleBuildRoute(msg: BuilderReq): Promise<BuilderRes> {
    try {
      const delta = await new RouteClientBuilder({
        app: this.#app,
        routeId: msg.routeId,
        seeds: msg.seeds,
        artifact: this.#artifact,
        knownEntries: new Set<string>(msg.knownEntries),
        discovery: this.#discovery,
      }).build();
      this.#logger.verbose(`build-route ok routeId=${msg.routeId} newEntries=${delta.newEntries.length}`);
      return {
        type: "build-route-res",
        id: msg.id,
        ok: true,
        data: {
          manifestDelta: delta.manifestDelta as BuildRouteResultPayload["manifestDelta"],
          ssrManifestDelta: delta.ssrManifestDelta.moduleMap as BuildRouteResultPayload["ssrManifestDelta"],
          newEntries: delta.newEntries,
          discoveredEntries: delta.discoveredEntries,
          clientDeps: delta.clientDeps,
          clientDepsByEntry: delta.clientDepsByEntry,
          routeId: msg.routeId,
          generation: msg.generation,
        } as BuildRouteResultPayload,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.#logger.error(`build-route failed routeId=${msg.routeId}: ${errMsg}`);
      return { type: "build-route-res", id: msg.id, ok: false, error: errMsg };
    }
  }
  async #enqueueWork<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const started = Date.now();
    const run = this.#workQueue.then(fn, fn);
    this.#workQueue = run.then(() => undefined).catch(() => undefined);
    try {
      return await run;
    } finally {
      this.#logger.verbose(`[work-queue] ${label} finished in ${Date.now() - started}ms`);
    }
  }
  batchTouchesPagesTree(appDir: string, batch: ChangeBatch): boolean {
    const absAppDir = path.resolve(appDir);
    for (const f of batch.files) {
      const abs = path.resolve(f);
      if (!abs.startsWith(`${absAppDir}${path.sep}`) && abs !== absAppDir) continue;
      if (/\.(tsx|ts|jsx|js)$/.test(abs)) return true;
    }
    return false;
  }
  async batchMayChangePageKeys(appDir: string, batch: ChangeBatch): Promise<boolean> {
    const absAppDir = path.resolve(appDir);
    const pageKeys = new Set((await this.#app.getPageKeys()).map((key) => path.normalize(key)));
    for (const f of batch.files) {
      const abs = path.resolve(f);
      if (!abs.startsWith(`${absAppDir}${path.sep}`) && abs !== absAppDir) continue;
      if (!/\.(tsx|ts|jsx|js)$/.test(abs)) continue;
      const rel = path.normalize(path.relative(absAppDir, abs));
      if (!(await Bun.file(abs).exists()) || !pageKeys.has(rel)) return true;
    }
    return false;
  }
  async rebuildCssArtifact(
    artifactDir: string,
    { refresh, generation, changedFiles }: { refresh: boolean; generation?: number; changedFiles?: string[] },
  ) {
    const cssStarted = Date.now();
    const cssByBasePathStarted = Date.now();
    const cssByBasePath = await this.#cssCompiler.getCssByBasePath({ refresh });
    this.#logger.verbose(`css-get-by-base-path ok (${Date.now() - cssByBasePathStarted}ms)`);
    const fontStarted = Date.now();
    const optimizedFonts = await this.#getOptimizedFonts(changedFiles ?? []);
    this.#logger.verbose(`font-assets ready (${Date.now() - fontStarted}ms)`);
    const cssAssetEntries: Array<[string, { cssUrl: string; cssRelPath: string }]> = [];
    const cssBase64ByUrl: Record<string, string> = {};
    await Promise.all(
      Object.entries(cssByBasePath).flatMap(([basePath, baseCssText]) => {
        const cssText = [baseCssText, optimizedFonts.css].filter(Boolean).join("\n");
        if (!cssText) return [];
        return [
          (async () => {
            const cssAssetName = basePath || "root";
            const cssHash = Bun.hash(`${basePath}\n${cssText}`).toString(36);
            const cssRelPath = `styles/${cssAssetName}-${cssHash}.css`;
            const cssUrl = `/_akan/styles/${cssAssetName}-${cssHash}.css`;
            await Bun.write(path.join(artifactDir, cssRelPath), cssText);
            cssAssetEntries.push([basePath, { cssUrl, cssRelPath }]);
            cssBase64ByUrl[cssUrl] = Buffer.from(new TextEncoder().encode(cssText)).toString("base64");
          })(),
        ];
      }),
    );
    const cssAssets = Object.fromEntries(cssAssetEntries);
    if (JSON.stringify(this.#artifact.cssAssets ?? {}) === JSON.stringify(cssAssets)) {
      this.#logger.verbose("css-rebuild unchanged assets; broadcast skipped");
      return;
    }
    this.#artifact = { ...this.#artifact, cssAssets };
    this.#logger.verbose(`css-compile ok assets=${Object.keys(cssAssets).length} (${Date.now() - cssStarted}ms)`);
    process.send?.({
      type: "css-updated",
      data: {
        cssAssets,
        cssBase64ByUrl,
        generation,
        changedFiles,
      },
    });
  }

  scheduleCssRebuild(
    artifactDir: string,
    { refresh, generation, changedFiles }: { refresh: boolean; generation?: number; changedFiles?: string[] },
  ) {
    this.#pendingCssRebuild = { artifactDir, refresh, generation, changedFiles };
    if (this.#cssRebuildTimer) clearTimeout(this.#cssRebuildTimer);
    this.#cssRebuildTimer = setTimeout(() => {
      this.#cssRebuildTimer = null;
      const next = this.#pendingCssRebuild;
      this.#pendingCssRebuild = null;
      if (!next) return;
      this.#cssRebuildQueue = this.#cssRebuildQueue
        .then(async () => {
          const started = Date.now();
          await this.rebuildCssArtifact(next.artifactDir, {
            refresh: next.refresh,
            generation: next.generation,
            changedFiles: next.changedFiles,
          });
          this.#logger.verbose(`css-rebuild checked (${Date.now() - started}ms)`);
        })
        .catch((err) => {
          this.#logger.error(`css-rebuild failed: ${err instanceof Error ? err.message : err}`);
        });
    }, 150);
  }

  async #getOptimizedFonts(changedFiles: string[]) {
    if (!this.#shouldReoptimizeFonts(changedFiles)) {
      this.#logger.verbose(`font-optimize cached files=${this.#optimizedFonts.files.length}`);
      return this.#optimizedFonts;
    }
    const started = Date.now();
    this.#optimizedFonts = await new FontOptimizer(this.#app, "start").optimize();
    this.#logger.verbose(`font-optimize ok files=${this.#optimizedFonts.files.length} (${Date.now() - started}ms)`);
    return this.#optimizedFonts;
  }

  #shouldReoptimizeFonts(changedFiles: string[]) {
    if (changedFiles.length === 0) return false;
    return changedFiles.some((file) => {
      const normalized = path.resolve(file);
      if (/\.(woff2?|ttf|otf)$/i.test(normalized)) return true;
      return this.#optimizedFonts.files.some((fontFile) => path.resolve(fontFile) === normalized);
    });
  }
  async installWatcher() {
    const [appDir, artifactDir] = [`${this.#app.cwdPath}/page`, `${this.#app.cwdPath}/.akan/artifact`];
    const roots = await new WatchRootResolver(this.#app).resolve();
    const watcher = new HmrWatcher({
      roots,
      logger: this.#logger,
      onBatch: async (batch: ChangeBatch) => {
        await this.#enqueueWork("hmr-batch", async () => this.#handleWatchBatch(appDir, artifactDir, batch));
      },
    });
    watcher.start();
    this.#logger.verbose(`watching ${roots.length} roots`);
  }

  async #handleWatchBatch(appDir: string, artifactDir: string, batch: ChangeBatch) {
    const kinds = [...batch.kinds] as ("code" | "css" | "config")[];
    if (kinds.length === 0) return;
    const generation = ++this.#generation;
    this.#logger.verbose(`[hmr] batch generation=${generation} kinds=${kinds.join(",")} files=${batch.files.length}`);

    if (kinds.includes("code")) {
      const started = Date.now();
      if (kinds.includes("config")) this.#discovery = await GraphClientEntryDiscovery.create(this.#app);
      else this.#discovery.invalidate?.(batch.files);
      this.#logger.verbose(
        `client-entry-discovery ${kinds.includes("config") ? "refreshed" : "invalidated"} (${Date.now() - started}ms)`,
      );
    }

    if (kinds.includes("code") && (await this.batchMayChangePageKeys(appDir, batch))) {
      const started = Date.now();
      await this.#app.getPageKeys({ refresh: true });
      this.#logger.verbose(`pageKeys updated, app pageKeys are refreshed (${Date.now() - started}ms)`);
    } else if (kinds.includes("code") && this.batchTouchesPagesTree(appDir, batch)) {
      this.#logger.verbose("pageKeys refresh skipped; changed page source cannot add/remove a route key");
    }

    if (kinds.includes("code") && this.#shouldRebuildCsr()) {
      try {
        const started = Date.now();
        await new CsrArtifactBuilder(this.#app).build();
        this.#logger.verbose(`csr-rebundle ok (${Date.now() - started}ms)`);
      } catch (err) {
        this.#logger.error(`csr-rebundle failed: ${err instanceof Error ? err.message : err}`);
      }
    } else if (kinds.includes("code")) {
      this.#logger.verbose(`csr-rebundle skipped; set AKAN_DEV_CSR_REBUILD=1 to enable per-save CSR rebuilds`);
    }

    const event: BuilderEvent = { type: "invalidate", kinds, files: batch.files, generation };
    process.send?.(event);

    if (kinds.includes("code")) {
      try {
        const started = Date.now();
        const next = await new PagesBundleBuilder(this.#app).build();
        process.send?.({
          type: "pages-updated",
          data: { bundlePath: next.bundlePath, buildId: next.buildId, generation, changedFiles: batch.files },
        });
        this.#logger.verbose(`pages-rebundle ok buildId=${next.buildId} (${Date.now() - started}ms)`);
      } catch (err) {
        this.#logger.error(`pages-rebundle failed: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (kinds.includes("code") || kinds.includes("css")) {
      this.scheduleCssRebuild(artifactDir, { refresh: true, generation, changedFiles: batch.files });
      this.#logger.verbose(`css-rebuild scheduled generation=${generation}`);
    }
  }

  async boot(): Promise<void> {
    process.on("message", async (msg: BuilderMessage) => {
      if (!msg || typeof msg !== "object") return;
      switch (msg.type) {
        case "build-route": {
          const res = await this.handleBuildRoute(msg);
          process.send?.(res);
          return;
        }
        default:
          return;
      }
    });
    if (this.#watch) await this.installWatcher();
    process.send?.({ type: "builder-ready" });
    this.#logger.verbose(`ready (watch=${this.#watch})`);
  }

  #shouldRebuildCsr() {
    // CSR is served by `akn start`, so rebuild dev CSR artifacts until incremental CSR HMR is implemented.
    return true;
  }

  static async create() {
    const { appName, repoName, workspaceRoot } = WorkspaceExecutor.getBaseDevEnv();
    if (!workspaceRoot || !appName) throw new Error("AKAN_WORKSPACE_ROOT or AKAN_PUBLIC_APP_NAME is not set");
    const workspace = WorkspaceExecutor.fromRoot({ workspaceRoot, repoName });
    const app = AppExecutor.from(workspace, appName);
    const watch = process.env.AKAN_WATCH !== "0";
    const { artifact, cssCompiler, optimizedFonts } = await new SsrBaseArtifactBuilder(app).build();
    await new CsrArtifactBuilder(app).build();
    const discovery = await GraphClientEntryDiscovery.create(app);
    return new IncrementalBuilder({ app, cssCompiler, artifact, watch, optimizedFonts, discovery });
  }
}

void (await IncrementalBuilder.create()).boot().catch((err) => {
  console.error(err);
  process.exit(1);
});
