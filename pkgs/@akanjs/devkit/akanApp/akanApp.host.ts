import path from "node:path";
import { Logger } from "akanjs/common";
import type { BuilderMessage } from "akanjs/server";
import type { App } from "../commandDecorators";
import { createTunnel } from "../createTunnel";
import { WorkspaceExecutor } from "../executors";
import { IncrementalBuilderHost } from "../incrementalBuilder";

const backendMsgTypeSet = new Set<BuilderMessage["type"]>(["build-route"]);
const BACKEND_RESTART_DEBOUNCE_MS = 120;
const BACKEND_GRACEFUL_TIMEOUT_MS = 3000;
const BACKEND_RECOVERY_BASE_DELAY_MS = 1_000;
const BACKEND_RECOVERY_MAX_DELAY_MS = 30_000;
const BUILDER_READY_TIMEOUT_MS = 15000;
const BUILDER_START_MAX_ATTEMPTS = 3;
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const NON_SOURCE_EXT_RE =
  /\.(css|scss|sass|less|json|svg|png|jpe?g|webp|gif|avif|ico|woff2?|ttf|otf|mp3|mp4|wav|html)$/i;
const GRAPH_IMPORT_KINDS = new Set<Bun.ImportKind>([
  "import-statement",
  "require-call",
  "require-resolve",
  "dynamic-import",
]);

class BackendImportGraph {
  readonly #app: App;
  readonly #logger: Logger;
  readonly #tsTranspiler = new Bun.Transpiler({ loader: "ts" });
  readonly #tsxTranspiler = new Bun.Transpiler({ loader: "tsx" });
  readonly #jsTranspiler = new Bun.Transpiler({ loader: "js" });
  readonly #jsxTranspiler = new Bun.Transpiler({ loader: "jsx" });
  #files = new Set<string>();
  #ready = false;

  constructor(app: App, logger: Logger) {
    this.#app = app;
    this.#logger = logger;
  }

  get ready() {
    return this.#ready;
  }

  has(file: string) {
    return this.#files.has(path.resolve(file));
  }

  async refresh(): Promise<boolean> {
    try {
      const files = await this.#build();
      this.#files = files;
      this.#ready = true;
      this.#logger.verbose(`[backend-graph] scanned ${files.size} files`);
      return true;
    } catch (err) {
      this.#ready = this.#files.size > 0;
      this.#logger.warn(
        `[backend-graph] scan failed; ${this.#ready ? "using previous graph" : "using fallback rules"}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return this.#ready;
    }
  }

  async #build(): Promise<Set<string>> {
    const roots = await this.#entrypoints();
    const files = new Set<string>();
    const queue = [...roots];
    const workspaceRoot = path.resolve(this.#app.workspace.workspaceRoot);

    while (queue.length > 0) {
      const current = path.resolve(queue.pop() as string);
      if (files.has(current)) continue;
      if (!this.#isWorkspaceSource(current, workspaceRoot)) continue;
      if (!(await Bun.file(current).exists())) continue;

      files.add(current);
      const source = await Bun.file(current).text();
      const imports = this.#scanImports(current, source);
      const importerDir = path.dirname(current);
      for (const imp of imports) {
        if (!GRAPH_IMPORT_KINDS.has(imp.kind) || !imp.path || NON_SOURCE_EXT_RE.test(imp.path)) continue;
        const resolved = this.#resolve(imp.path, importerDir);
        if (!resolved || files.has(resolved)) continue;
        queue.push(resolved);
      }
    }
    return files;
  }

  async #entrypoints(): Promise<string[]> {
    const roots = [`${this.#app.cwdPath}/main.ts`, `${this.#app.cwdPath}/server.ts`];
    const existing: string[] = [];
    for (const root of roots) {
      const abs = path.resolve(root);
      if (await Bun.file(abs).exists()) existing.push(abs);
    }
    return existing;
  }

  #resolve(specifier: string, importerDir: string): string | null {
    try {
      const resolved = Bun.resolveSync(specifier, importerDir);
      if (!path.isAbsolute(resolved)) return null;
      if (!SOURCE_EXTS.has(path.extname(resolved).toLowerCase())) return null;
      return path.resolve(resolved);
    } catch {
      return null;
    }
  }

  #isWorkspaceSource(file: string, workspaceRoot: string): boolean {
    const rel = path.relative(workspaceRoot, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
    if (rel.includes(`${path.sep}node_modules${path.sep}`) || rel.includes(`${path.sep}.akan${path.sep}`)) return false;
    return SOURCE_EXTS.has(path.extname(file).toLowerCase());
  }

  #scanImports(file: string, source: string): Bun.Import[] {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".tsx") return this.#tsxTranspiler.scanImports(source);
    if (ext === ".jsx") return this.#jsxTranspiler.scanImports(source);
    if (ext === ".js" || ext === ".mjs" || ext === ".cjs") return this.#jsTranspiler.scanImports(source);
    return this.#tsTranspiler.scanImports(source);
  }
}

export class AkanAppHost {
  logger = new Logger("AkanAppHost");
  readonly withInk: boolean;
  readonly env: Record<string, string>;
  #backend: Bun.Subprocess<"ignore", "inherit", "inherit"> | null = null;
  #builder: IncrementalBuilderHost | null = null;
  #backendReady = false;
  #plannedBackendStops = new WeakSet<Bun.Subprocess<"ignore", "inherit", "inherit">>();
  #restartTimer: ReturnType<typeof setTimeout> | null = null;
  #backendRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  #backendRecoveryAttempts = 0;
  #restartFiles = new Set<string>();
  #latestPagesUpdated: Extract<BuilderMessage, { type: "pages-updated" }> | null = null;
  #latestCssUpdated: Extract<BuilderMessage, { type: "css-updated" }> | null = null;
  #builderMessageQueue: Promise<void> = Promise.resolve();
  #backendGraph: BackendImportGraph;
  constructor(
    private readonly app: App,
    { env, withInk = false }: { env: Record<string, string>; withInk?: boolean },
  ) {
    this.env = env;
    this.withInk = withInk;
    this.#backendGraph = new BackendImportGraph(app, this.logger);
  }
  async start() {
    if (this.#backend) await this.#stopBackend();
    if (this.#builder) this.#stopBuilder();
    const [redisHost] = await Promise.all([
      this.#prepareDatabase("redis"),
      this.#backendGraph.refresh(),
      this.#startBuilder(),
    ]);
    Object.assign(this.env, { REDIS_HOST: redisHost });
    this.#startBackend();
    return this;
  }
  async stop() {
    if (this.#restartTimer) {
      clearTimeout(this.#restartTimer);
      this.#restartTimer = null;
    }
    if (this.#backendRecoveryTimer) {
      clearTimeout(this.#backendRecoveryTimer);
      this.#backendRecoveryTimer = null;
    }
    await this.#stopBackend();
    this.#stopBuilder();
    return this;
  }
  kill() {
    void this.stop();
  }

  async #prepareDatabase(type: "redis") {
    const environment = WorkspaceExecutor.getBaseDevEnv().env;
    if (environment === "local") return "localhost";
    return await createTunnel(type, { app: this.app, environment });
  }
  #startBackend() {
    this.#backendReady = false;
    const backend = Bun.spawn(["bun", `apps/${this.app.name}/main.ts`], {
      cwd: this.app.workspace.workspaceRoot,
      stdio: this.withInk ? ["ignore", "pipe", "pipe"] : ["inherit", "inherit", "inherit"],
      env: this.env,
      ipc: (msg: BuilderMessage) => {
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "backend-ready") {
          this.#backendReady = true;
          this.#backendRecoveryAttempts = 0;
          this.logger.verbose(`backend ready pid=${msg.pid}`);
          this.#replayBuilderState();
          return;
        }
        if (backendMsgTypeSet.has(msg.type)) this.#sendToBuilder(msg);
      },
      serialization: "advanced",
      onExit: () => {
        this.#backendReady = false;
        if (this.#backend === backend) this.#backend = null;
        if (this.#plannedBackendStops.has(backend)) {
          this.#plannedBackendStops.delete(backend);
          return;
        }
        this.#scheduleBackendRecovery("backend-exit");
      },
    });
    this.#backend = backend;
    this.logger.verbose(`backend spawned pid=${backend.pid}`);
  }
  #sendToBackend(message: BuilderMessage) {
    if (!this.#backend || !this.#backendReady) {
      if (message.type === "css-updated" || message.type === "pages-updated") {
        this.logger.verbose(`backend is not ready; will replay ${message.type}`);
        return;
      }
      if (message.type !== "builder-ready") this.logger.warn(`backend is not ready; dropping ${message.type}`);
      return;
    }
    try {
      this.#backend.send(message);
    } catch (err) {
      this.logger.warn(
        `failed to send ${message.type} to backend: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  async #stopBackend() {
    if (!this.#backend) return;
    const backend = this.#backend;
    this.#plannedBackendStops.add(backend);
    this.#backendReady = false;
    this.logger.verbose(`stopping backend pid=${backend.pid}`);
    try {
      backend.kill("SIGTERM");
      const timeout = new Promise<"timeout">((resolve) =>
        setTimeout(() => resolve("timeout"), BACKEND_GRACEFUL_TIMEOUT_MS),
      );
      const result = await Promise.race([backend.exited, timeout]);
      if (result === "timeout") {
        this.logger.warn(`backend pid=${backend.pid} did not exit in ${BACKEND_GRACEFUL_TIMEOUT_MS}ms; force killing`);
        backend.kill("SIGKILL");
        await backend.exited.catch(() => undefined);
      }
    } finally {
      if (this.#backend === backend) this.#backend = null;
    }
  }
  #scheduleBackendRestart(files: string[]) {
    for (const file of files) this.#restartFiles.add(file);
    if (this.#backendRecoveryTimer) {
      clearTimeout(this.#backendRecoveryTimer);
      this.#backendRecoveryTimer = null;
    }
    if (this.#restartTimer) clearTimeout(this.#restartTimer);
    this.#restartTimer = setTimeout(() => {
      this.#restartTimer = null;
      const changed = [...this.#restartFiles];
      this.#restartFiles.clear();
      void this.#restartBackend(changed);
    }, BACKEND_RESTART_DEBOUNCE_MS);
  }
  async #restartBackend(files: string[]) {
    this.logger.verbose(`[backend-reload] restarting backend for ${files.length} file(s)`);
    this.#backendRecoveryAttempts = 0;
    await Promise.all([this.#stopBackend(), this.#backendGraph.refresh()]);
    this.#startBackend();
  }
  #scheduleBackendRecovery(reason: string) {
    if (this.#backendRecoveryTimer || this.#backend) return;
    const attempt = this.#backendRecoveryAttempts;
    const delay = Math.min(BACKEND_RECOVERY_BASE_DELAY_MS * 2 ** attempt, BACKEND_RECOVERY_MAX_DELAY_MS);
    this.#backendRecoveryAttempts = attempt + 1;
    this.logger.warn(
      `[backend-recovery] backend exited unexpectedly (${reason}); restarting in ${delay}ms (attempt ${this.#backendRecoveryAttempts})`,
    );
    this.#backendRecoveryTimer = setTimeout(() => {
      this.#backendRecoveryTimer = null;
      if (this.#backend) return;
      void this.#backendGraph.refresh().finally(() => {
        if (!this.#backend) this.#startBackend();
      });
    }, delay);
  }
  #enqueueBuilderMessage(message: BuilderMessage) {
    this.#builderMessageQueue = this.#builderMessageQueue
      .then(() => this.#handleBuilderMessage(message))
      .catch((err) => {
        this.logger.warn(`failed to handle builder message: ${err instanceof Error ? err.message : String(err)}`);
      });
  }
  async #handleBuilderMessage(message: BuilderMessage) {
    if (message.type === "pages-updated") this.#latestPagesUpdated = message;
    if (message.type === "css-updated") this.#latestCssUpdated = message;
    if (message.type === "invalidate") {
      await this.#handleInvalidate(message);
      return;
    }
    this.#sendToBackend(message);
  }
  async #handleInvalidate(message: Extract<BuilderMessage, { type: "invalidate" }>) {
    if (await this.#shouldRestartBackend(message)) {
      this.#scheduleBackendRestart(message.files);
      return;
    }
    this.#sendToBackend(message);
  }
  #replayBuilderState() {
    if (!this.#backendReady) return;
    if (this.#latestCssUpdated) this.#sendToBackend(this.#latestCssUpdated);
    if (this.#latestPagesUpdated) this.#sendToBackend(this.#latestPagesUpdated);
  }
  async #shouldRestartBackend(message: Extract<BuilderMessage, { type: "invalidate" }>): Promise<boolean> {
    if (message.kinds.length === 1 && message.kinds[0] === "css") return false;
    if (!this.#backendGraph.ready && message.kinds.includes("code")) await this.#backendGraph.refresh();
    return message.files.some((file) => this.#isBackendFile(file));
  }
  #isBackendFile(file: string): boolean {
    return this.#backendGraph.has(file);
  }
  async #startBuilder() {
    const startTime = Date.now();
    this.app.verbose(`[cli] waiting for builder to complete initial base build…`);
    let lastError: unknown;
    for (let attempt = 1; attempt <= BUILDER_START_MAX_ATTEMPTS; attempt++) {
      this.#builder = await IncrementalBuilderHost.create(this.app, this.env, (msg) => {
        this.#enqueueBuilderMessage(msg);
      });
      try {
        await this.#waitForBuilderReady(attempt);
        this.app.verbose(`[cli] base build ready in ${Date.now() - startTime}ms — starting backend`);
        return this.#builder;
      } catch (err) {
        lastError = err;
        this.#stopBuilder();
        if (attempt >= BUILDER_START_MAX_ATTEMPTS) break;
        this.app.verbose(`[cli] builder failed before ready; retrying (${attempt + 1}/${BUILDER_START_MAX_ATTEMPTS})`);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
  #waitForBuilderReady(attempt: number) {
    return new Promise<void>((resolve, reject) => {
      if (!this.#builder) throw new Error("Builder Not Found");
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        fn();
      };
      const timeout = setTimeout(() => {
        settle(() => reject(new Error("[cli] builder timed out before emitting builder-ready")));
      }, BUILDER_READY_TIMEOUT_MS);
      this.#builder.start({
        onExit: () => {
          settle(() => reject(new Error(`[cli] builder exited before emitting builder-ready (attempt ${attempt})`)));
        },
        onReady: () => {
          settle(resolve);
        },
        onRestartReady: () => {
          this.logger.verbose("[builder-recovery] builder ready after restart; replaying latest state");
          this.#replayBuilderState();
        },
      });
    });
  }
  #sendToBuilder(message: BuilderMessage) {
    if (this.#builder?.send(message)) return;
    if (message.type === "build-route") {
      this.#sendToBackend({
        type: "build-route-res",
        id: message.id,
        ok: false,
        error: `builder is ${this.#builder?.status ?? "stopped"}; reload after the builder is ready`,
      });
      return;
    }
    this.logger.warn("akanAppHost builder is not running");
  }
  #stopBuilder() {
    if (!this.#builder) return;
    this.#builder.stop();
    this.#builder = null;
  }
}
