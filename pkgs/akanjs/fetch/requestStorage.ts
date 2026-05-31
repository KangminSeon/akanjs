export interface RequestStorage {
  run<T>(store: Request, callback: () => T): T;
  getStore(): Request | undefined;
}

export type AkanTheme = "css" | "system" | (string & {});

declare global {
  var __AKAN_REQUEST_STORAGE__: RequestStorage | undefined;
  var __AKAN_REQUEST_THEME__: WeakMap<Request, AkanTheme> | undefined;
  var __AKAN_REQUEST_QUERY_CACHE__: WeakMap<Request, Map<string, Promise<unknown>>> | undefined;
  var __AKAN_REQUEST_FALLBACK_STACK__: Request[] | undefined;
}

let _requestStorage: RequestStorage | null = null;
if (typeof window === "undefined") {
  try {
    // Keep this module synchronous. CSR builds import `akanjs/fetch` through
    // Bun's HMR runtime, and a top-level `await import("node:async_hooks")`
    // turns the whole `export *` chain into an async module. Named imports
    // from that chain can then be observed as `null` during evaluation
    // (notably `FetchClient` in `akanjs/client/useClient.ts`).
    const { AsyncLocalStorage } = require("node:async_hooks") as typeof import("node:async_hooks");
    globalThis.__AKAN_REQUEST_STORAGE__ ??= new AsyncLocalStorage() as RequestStorage;
    _requestStorage = globalThis.__AKAN_REQUEST_STORAGE__;
  } catch {}
}

export const requestStorage: RequestStorage | null = _requestStorage;

function requestThemeMap(): WeakMap<Request, AkanTheme> {
  globalThis.__AKAN_REQUEST_THEME__ ??= new WeakMap<Request, AkanTheme>();
  return globalThis.__AKAN_REQUEST_THEME__;
}

function requestQueryCacheMap(): WeakMap<Request, Map<string, Promise<unknown>>> {
  globalThis.__AKAN_REQUEST_QUERY_CACHE__ ??= new WeakMap<Request, Map<string, Promise<unknown>>>();
  return globalThis.__AKAN_REQUEST_QUERY_CACHE__;
}

/** Stores theme preference on the active request when server rendering. */
export function setRequestTheme(theme: AkanTheme | undefined): void {
  const req = getRequest();
  if (!req || theme === undefined) return;
  requestThemeMap().set(req, theme);
}

export function getRequestTheme(): AkanTheme | undefined {
  const req = getRequest();
  if (!req) return undefined;
  return requestThemeMap().get(req);
}

export function pushRequestFallback(req: Request): () => void {
  globalThis.__AKAN_REQUEST_FALLBACK_STACK__ ??= [];
  const stack = globalThis.__AKAN_REQUEST_FALLBACK_STACK__;
  stack.push(req);
  return () => {
    const index = stack.lastIndexOf(req);
    if (index >= 0) stack.splice(index, 1);
  };
}

// Lightweight server-side helpers for server components to read the incoming
// request's headers/cookies. Kept in akanjs/fetch (no heavy client deps) so
// they can be imported from inside the RSC worker without pulling `akanjs/
// client`'s useClient macro chain.
/** Returns the active server request from AsyncLocalStorage or the fallback stack. */
export function getRequest(): Request | undefined {
  return requestStorage?.getStore() ?? globalThis.__AKAN_REQUEST_FALLBACK_STACK__?.at(-1);
}

/** Deduplicates a promise-producing query within the active request. */
export function memoizeRequestQuery<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const req = getRequest();
  if (!req) return factory();
  const cacheMap = requestQueryCacheMap();
  let cache = cacheMap.get(req);
  if (!cache) {
    cache = new Map<string, Promise<unknown>>();
    cacheMap.set(req, cache);
  }
  const existing = cache.get(key);
  if (existing) return existing as Promise<T>;
  const promise = factory();
  cache.set(key, promise);
  return promise;
}

/** Returns current request headers as a Map, or an empty Map outside a request. */
export function headers(): Map<string, string> {
  const req = getRequest();
  const map = new Map<string, string>();
  if (!req) return map;
  req.headers.forEach((value, key) => {
    map.set(key, value);
  });
  return map;
}

export interface CookieEntry {
  name: string;
  value: string;
}

export function parseCookieHeader(cookieHeader: string): Map<string, CookieEntry> {
  const out = new Map<string, CookieEntry>();
  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim();
    // Support the `j:<json>` convention used elsewhere in akanjs.
    const value = raw.startsWith("j:")
      ? (() => {
          try {
            return JSON.parse(raw.slice(2)) as string;
          } catch {
            return raw;
          }
        })()
      : raw;
    out.set(name, { name, value });
  }
  return out;
}

/** Returns parsed cookies from the current request, or an empty Map outside a request. */
export function cookies(): Map<string, CookieEntry> {
  const req = getRequest();
  if (!req) return new Map();
  return parseCookieHeader(req.headers.get("cookie") ?? "");
}
