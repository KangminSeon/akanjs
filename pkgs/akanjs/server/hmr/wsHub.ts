import { Logger } from "akanjs/common";

export interface HmrWsData {
  kind: "akan-hmr";
  openedAt: number;
}

export type HmrMessage =
  | {
      type: "hello";
      buildId: number;
      cssAssets?: Record<string, { cssUrl: string; cssRelPath: string }>;
    }
  | { type: "reload"; buildId: number }
  | { type: "rsc-refresh"; buildId: number; generation?: number; changedFiles?: string[]; routeIds?: string[] }
  | {
      type: "client-refresh";
      buildId: number;
      generation?: number;
      changedFiles?: string[];
      routeIds?: string[];
    }
  | { type: "css-update"; cssAssets?: Record<string, { cssUrl: string; cssRelPath: string }> }
  | { type: "error"; message: string };

export const HMR_WS_TOPIC = "__akan_hmr";

export class HmrWsHub {
  readonly #logger = new Logger("HmrWsHub");
  readonly #conns = new Set<Bun.ServerWebSocket<HmrWsData>>();
  #publish: ((topic: string, payload: string) => void) | null = null;

  get size(): number {
    return this.#conns.size;
  }

  setPublisher(publish: (topic: string, payload: string) => void): void {
    this.#publish = publish;
  }

  attach(ws: Bun.ServerWebSocket<HmrWsData>): void {
    ws.subscribe(HMR_WS_TOPIC);
    this.#conns.add(ws);
    this.#logger.verbose(`[hmr] ws connected (total=${this.#conns.size})`);
  }

  detach(ws: Bun.ServerWebSocket<HmrWsData>): void {
    ws.unsubscribe(HMR_WS_TOPIC);
    if (this.#conns.delete(ws)) this.#logger.verbose(`[hmr] ws disconnected (total=${this.#conns.size})`);
  }

  broadcast(msg: HmrMessage): void {
    const payload = JSON.stringify(msg);
    this.#publish?.(HMR_WS_TOPIC, payload);
  }
}
