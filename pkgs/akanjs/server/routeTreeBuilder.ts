import type {
  Head,
  LayoutProps,
  PageProps,
  PageState,
  PathRoute,
  ResolveHead,
  Route,
  RouteModule,
  RouteRender,
} from "akanjs/client";
import {
  assertUniqueRoutePatterns,
  compareRouteSpecificity,
  matchRoutePattern,
  parseBasePaths,
  parseRouteModuleKey,
  routeSegmentToTreePath,
} from "akanjs/common";

export type PagesContext = Record<string, () => Promise<RouteModule>>;

export const defaultPageState: PageState = {
  transition: "none",
  topSafeArea: 0,
  bottomSafeArea: 0,
  topInset: 0,
  bottomInset: 0,
  gesture: true,
  cache: false,
  topSafeAreaColor: "transparent",
  bottomSafeAreaColor: "transparent",
};

export interface RouteModuleCacheStats {
  moduleCount: number;
  loadedModuleCount: number;
  cacheHits: number;
  cacheMisses: number;
  cacheDisabled: boolean;
  loadedModuleKeys: string[];
}

export class RouteTreeBuilder {
  static readonly #pageRouteExports = new Set(["default", "pageConfig", "head", "generateHead", "Loading"]);
  static readonly #rootLayoutExports = new Set([
    "default",
    "head",
    "generateHead",
    "fonts",
    "manifest",
    "theme",
    "reconnect",
    "layoutStyle",
    "gaTrackingId",
    "Loading",
  ]);
  static readonly #layoutRouteExports = new Set(["default", "head", "generateHead", "Loading"]);
  static readonly #moduleCacheStats: RouteModuleCacheStats = {
    moduleCount: 0,
    loadedModuleCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheDisabled: process.env.AKAN_ROUTE_MODULE_CACHE === "0",
    loadedModuleKeys: [],
  };

  readonly #context: PagesContext;
  readonly #baseLayoutPaths: string[];
  readonly #routeMap = new Map<string, Route>();
  readonly #pagePatterns: { key: string; pattern: string }[] = [];

  constructor(context: PagesContext) {
    this.#context = context;
    const basePaths = process.env.AKAN_PUBLIC_BASE_PATHS ? parseBasePaths(process.env.AKAN_PUBLIC_BASE_PATHS) : null;
    this.#baseLayoutPaths = ["/", "/:lang", ...(basePaths?.map((bp) => `/:lang/${bp}`) ?? [])];
    this.#routeMap.set("/", { path: "/", children: new Map() });
  }

  build(): PathRoute[] {
    RouteTreeBuilder.resetCacheStats();
    for (const [filePath, loader] of Object.entries(this.#context)) this.#addRouteModule(filePath, loader);
    assertUniqueRoutePatterns(this.#pagePatterns);

    const rootRoute = this.#routeMap.get("/");
    if (!rootRoute) throw new Error("No root route");
    return this.#getPathRoutes(rootRoute).sort((a, b) => compareRouteSpecificity(a.path, b.path));
  }

  static getCacheStats(): RouteModuleCacheStats {
    return {
      ...RouteTreeBuilder.#moduleCacheStats,
      cacheDisabled: process.env.AKAN_ROUTE_MODULE_CACHE === "0",
      loadedModuleKeys: [...RouteTreeBuilder.#moduleCacheStats.loadedModuleKeys],
    };
  }

  static resetCacheStats() {
    RouteTreeBuilder.#moduleCacheStats.moduleCount = 0;
    RouteTreeBuilder.#moduleCacheStats.loadedModuleCount = 0;
    RouteTreeBuilder.#moduleCacheStats.cacheHits = 0;
    RouteTreeBuilder.#moduleCacheStats.cacheMisses = 0;
    RouteTreeBuilder.#moduleCacheStats.cacheDisabled = process.env.AKAN_ROUTE_MODULE_CACHE === "0";
    RouteTreeBuilder.#moduleCacheStats.loadedModuleKeys = [];
  }

  static match(
    pathname: string,
    pathRoutes: PathRoute[],
  ): { pathRoute: PathRoute; params: Record<string, string> } | null {
    for (const pathRoute of pathRoutes) {
      const params = matchRoutePattern(pathRoute.path, pathname);
      if (params) return { pathRoute, params };
    }
    return null;
  }

  static parseSearchParams(search: string): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    const urlSearchParams = new URLSearchParams(search);
    for (const [key, value] of urlSearchParams.entries()) {
      const existing = result[key];
      if (existing !== undefined) result[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
      else result[key] = value;
    }
    return result;
  }

  #addRouteModule(filePath: string, loader: () => Promise<RouteModule>) {
    const parsed = parseRouteModuleKey(filePath);
    if (parsed.kind === "page") this.#pagePatterns.push({ key: filePath, pattern: parsed.pattern });
    const pathSegments = ["/", ...parsed.routeSegments.map(routeSegmentToTreePath)];

    const targetRouteMap = pathSegments.slice(0, -1).reduce((rMap: Map<string, Route>, p: string) => {
      if (!rMap.has(p)) rMap.set(p, { path: p, children: new Map() });
      const children = rMap.get(p)?.children;
      if (!children) throw new Error("No children");
      return children;
    }, this.#routeMap);
    if (!targetRouteMap) return;

    const targetPath = pathSegments[pathSegments.length - 1];
    if (!targetPath) return;

    const routeRender = RouteTreeBuilder.#makeRouteRender(filePath, parsed.kind, loader);
    targetRouteMap.set(targetPath, {
      ...(targetRouteMap.get(targetPath) ?? { path: targetPath, children: new Map<string, Route>() }),
      ...(parsed.kind === "layout"
        ? { renderLayout: routeRender }
        : {
            renderPage: routeRender,
            pageIncludesOwnLayout: parsed.leaf === "_index",
            isSpecialRoute: parsed.isSpecialRoute,
          }),
    } as Route);
  }

  #getPathRoutes(
    route: Route,
    parentRootLayouts: RouteRender[] = [],
    parentLayouts: RouteRender[] = [],
    parentPaths: string[] = [],
    parentHead?: ResolveHead,
  ): PathRoute[] {
    const parentPath = parentPaths.filter((p) => p !== "/").join("");
    const currentPathSegment = /^\/\(.*\)$/.test(route.path) ? "" : route.path;
    const isRoot = this.#baseLayoutPaths.includes(parentPath + currentPathSegment) && parentRootLayouts.length < 2;
    const routePath = parentPath + currentPathSegment;
    const pathSegments = [...parentPaths, ...(currentPathSegment ? [currentPathSegment] : [])];
    const currentRootLayout = isRoot && route.renderLayout ? route.renderLayout : null;
    const currentLayout = !isRoot && route.renderLayout ? route.renderLayout : null;
    const renderRootLayouts = [...parentRootLayouts, ...(currentRootLayout ? [currentRootLayout] : [])];
    const renderLayouts = [...parentLayouts, ...(currentLayout ? [currentLayout] : [])];
    const routeHead = RouteTreeBuilder.#composeHeadResolvers(route.renderLayout?.resolveHead, parentHead);
    const pageRenderRootLayouts =
      route.pageIncludesOwnLayout === false && currentRootLayout ? parentRootLayouts : renderRootLayouts;
    const pageRenderLayouts = route.pageIncludesOwnLayout === false && currentLayout ? parentLayouts : renderLayouts;
    const pageHead = route.pageIncludesOwnLayout === false ? parentHead : routeHead;
    return [
      ...(route.renderPage
        ? [
            {
              path: routePath,
              pathSegments,
              renderPage: route.renderPage,
              renderRootLayouts: pageRenderRootLayouts,
              renderLayouts: pageRenderLayouts,
              resolveHead: RouteTreeBuilder.#composeHeadResolvers(route.renderPage.resolveHead, pageHead),
              isSpecialRoute: route.isSpecialRoute,
              pageState: route.pageState ?? defaultPageState,
            },
          ]
        : []),
      ...(route.children.size
        ? [...route.children.values()].flatMap((child) =>
            this.#getPathRoutes(child, renderRootLayouts, renderLayouts, pathSegments, routeHead),
          )
        : []),
    ];
  }

  static #makeLazyModule(key: string, kind: "page" | "layout", loader: () => Promise<RouteModule>) {
    let cached: RouteModule | null = null;
    let loaded = false;
    RouteTreeBuilder.#moduleCacheStats.moduleCount += 1;
    return async () => {
      if (cached && process.env.AKAN_ROUTE_MODULE_CACHE !== "0") {
        RouteTreeBuilder.#moduleCacheStats.cacheHits += 1;
        return cached;
      }
      RouteTreeBuilder.#moduleCacheStats.cacheMisses += 1;
      const mod = await loader();
      RouteTreeBuilder.#validateRouteModuleExports(key, kind, mod);
      if (!loaded) {
        RouteTreeBuilder.#moduleCacheStats.loadedModuleCount += 1;
        RouteTreeBuilder.#moduleCacheStats.loadedModuleKeys.push(key);
        loaded = true;
      }
      if (process.env.AKAN_ROUTE_MODULE_CACHE !== "0") cached = mod;
      return mod;
    };
  }

  static #validateRouteModuleExports(key: string, kind: "page" | "layout", mod: RouteModule) {
    const parsed = parseRouteModuleKey(key);
    const allowed =
      kind === "page"
        ? RouteTreeBuilder.#pageRouteExports
        : parsed.isInternalRootLayout
          ? RouteTreeBuilder.#rootLayoutExports
          : RouteTreeBuilder.#layoutRouteExports;
    for (const exportName of Object.keys(mod)) {
      if (!allowed.has(exportName)) {
        throw new Error(`[route-convention] unsupported export "${exportName}" in ${key}`);
      }
    }
    if (!mod.default) throw new Error(`[route-convention] ${key} has no default export`);
    if ("head" in mod && "generateHead" in mod) {
      throw new Error(`[route-convention] head and generateHead cannot both be exported in ${key}`);
    }
  }

  static #makeRouteRender(key: string, kind: "page" | "layout", loader: () => Promise<RouteModule>): RouteRender {
    const loadModule = RouteTreeBuilder.#makeLazyModule(key, kind, loader);
    const routeRender: RouteRender = {
      render: async (props: LayoutProps | PageProps) => {
        const mod = await loadModule();
        routeRender.Loading = mod.Loading as never;
        if (!mod.default) throw new Error(`[route-convention] ${key} has no default export`);
        return mod.default(props as never);
      },
      resolveHead: async (props: PageProps) => {
        const mod = await loadModule();
        routeRender.Loading = mod.Loading as never;
        if (mod.generateHead) return mod.generateHead(props);
        return mod.head as Head | null | undefined;
      },
    };
    if (kind === "page") {
      routeRender.getPageConfig = async () => {
        const mod = await loadModule();
        return "pageConfig" in mod ? mod.pageConfig : undefined;
      };
    }
    return routeRender;
  }

  static #composeHeadResolvers(...resolvers: (ResolveHead | undefined)[]): ResolveHead | undefined {
    const chain = resolvers.filter((resolver): resolver is ResolveHead => Boolean(resolver));
    if (chain.length === 0) return undefined;
    return async (props) => {
      for (const resolver of chain) {
        const head = await resolver(props);
        if (head !== null && head !== undefined) return head;
      }
      return undefined;
    };
  }
}
