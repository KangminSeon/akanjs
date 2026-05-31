import type { Head, PathRoute, RouteRender } from "akanjs/client";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode, Suspense } from "react";

export class RouteElementComposer {
  static compose({
    pathRoute,
    params,
    searchParams,
  }: {
    pathRoute: PathRoute;
    params: Record<string, string>;
    searchParams: Record<string, string | string[]>;
  }): ReactNode {
    const renders = [...pathRoute.renderRootLayouts, ...pathRoute.renderLayouts, pathRoute.renderPage];
    let element: ReactNode = null;
    for (let i = renders.length - 1; i >= 0; i--) {
      const routeRender = renders[i];
      if (!routeRender) continue;
      element = (
        <Suspense fallback={RouteElementComposer.#composeLoadingFallback(renders.slice(i), params)}>
          <RouteElementComposer.AsyncRender routeRender={routeRender} params={params} searchParams={searchParams}>
            {element}
          </RouteElementComposer.AsyncRender>
        </Suspense>
      );
    }
    return element;
  }

  static async resolveHead({
    pathRoute,
    params,
    searchParams,
  }: {
    pathRoute: PathRoute;
    params: Record<string, string>;
    searchParams: Record<string, string | string[]>;
  }): Promise<Head | null | undefined> {
    return pathRoute.resolveHead?.({ params, searchParams });
  }

  static async renderAsync({
    routeRender,
    children,
    params,
    searchParams,
  }: {
    routeRender: RouteRender;
    children: ReactNode;
    params: Record<string, string>;
    searchParams: Record<string, string | string[]>;
  }) {
    const node = await routeRender.render({ children, params, searchParams } as never);
    return RouteElementComposer.#normalizeReactNode(node);
  }

  static AsyncRender = (props: {
    routeRender: RouteRender;
    children: ReactNode;
    params: Record<string, string>;
    searchParams: Record<string, string | string[]>;
  }) => RouteElementComposer.renderAsync(props);

  static #normalizeReactNode(node: ReactNode): ReactNode {
    if (Array.isArray(node)) return Children.toArray(node).map(RouteElementComposer.#normalizeReactNode);
    if (!isValidElement(node)) return node;

    const props = node.props as { children?: ReactNode };
    if (!("children" in props)) return node;

    const normalizedChildren = RouteElementComposer.#normalizeReactChildren(props.children);
    if (normalizedChildren === props.children) return node;

    return cloneElement(node as ReactElement<{ children?: ReactNode }>, undefined, normalizedChildren);
  }

  static #normalizeReactChildren(children: ReactNode): ReactNode {
    if (Array.isArray(children)) return Children.toArray(children).map(RouteElementComposer.#normalizeReactNode);
    return RouteElementComposer.#normalizeReactNode(children);
  }

  static #composeLoadingFallback(renders: RouteRender[], params: Record<string, string>): ReactNode {
    let element: ReactNode = null;
    for (let i = renders.length - 1; i >= 0; i--) {
      const Loading = renders[i]?.Loading;
      if (!Loading) continue;
      element = Loading({ params, children: element } as never) as ReactNode;
    }
    return element;
  }
}
