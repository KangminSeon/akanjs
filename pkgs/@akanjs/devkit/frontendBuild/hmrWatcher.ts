import fs from "node:fs";
import path from "node:path";
import type { Logger } from "akanjs/common";
import type { ChangeBatch, ChangeKind } from "akanjs/server";
import { HmrChangeClassifier } from "./hmrChangeClassifier";

export type { ChangeBatch, ChangeKind };

export interface WatcherOptions {
  roots: string[];
  debounceMs?: number;
  logger: Logger;
  onBatch: (batch: ChangeBatch) => void | Promise<void>;
}

/**
 * Recursive filesystem watcher with debounced batching. We deliberately keep
 * classification coarse (`code` / `css` / `config`) so the orchestrator can
 * decide whether a full rebuild-and-reload or a narrower action (e.g. CSS
 * hot-swap) is sufficient.
 */
export class HmrWatcher {
  readonly #roots: string[];
  readonly #debounceMs: number;
  readonly #onBatch: WatcherOptions["onBatch"];
  readonly #logger: Logger;
  readonly #watchers: fs.FSWatcher[] = [];
  readonly #pending = new Map<string, Exclude<ChangeKind, "ignore">>();
  readonly #classifier = new HmrChangeClassifier();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #stopped = false;
  #flushing = false;

  constructor(opts: WatcherOptions) {
    this.#roots = [...new Set(opts.roots.map((r) => path.resolve(r)))];
    this.#debounceMs = opts.debounceMs ?? 80;
    this.#onBatch = opts.onBatch;
    this.#logger = opts.logger;
  }

  start(): void {
    for (const root of this.#roots) {
      try {
        const w = fs.watch(root, { recursive: true, persistent: false }, (_event, filename) => {
          if (!filename) return;
          const abs = path.resolve(root, filename.toString());
          this.#queue(abs);
        });
        this.#watchers.push(w);
        this.#logger.verbose(`[hmr] watching ${root}`);
      } catch (err) {
        this.#logger.error(`[hmr] failed to watch ${root}: ${(err as Error).message}`);
      }
    }
  }

  stop(): void {
    this.#stopped = true;
    if (this.#timer) clearTimeout(this.#timer);
    for (const w of this.#watchers) {
      try {
        w.close();
      } catch {
        // ignore
      }
    }
  }

  #queue(abs: string): void {
    const kind = this.#classifier.classify(abs);
    if (kind === "ignore") return;
    this.#pending.set(abs, kind);
    if (this.#flushing) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#flush(), this.#debounceMs);
  }

  #flush(): void {
    this.#timer = null;
    if (this.#stopped || this.#pending.size === 0 || this.#flushing) return;
    void this.#drain();
  }

  async #drain(): Promise<void> {
    this.#flushing = true;
    try {
      while (!this.#stopped && this.#pending.size > 0) {
        const files = Array.from(this.#pending.keys());
        const kinds = new Set(this.#pending.values());
        this.#pending.clear();
        try {
          await this.#onBatch({ files, kinds });
        } catch (e) {
          this.#logger.error(`[hmr] onBatch error: ${(e as Error).message}`);
        }
      }
    } finally {
      this.#flushing = false;
      if (!this.#stopped && this.#pending.size > 0) this.#timer = setTimeout(() => this.#flush(), this.#debounceMs);
    }
  }
}
