import type { ENDPOINT_META, PromiseOrObject } from "akanjs/base";
import type { FetchPolicy } from "akanjs/common";
import type { EndpointCls, EndpointInfo } from "akanjs/signal";

type EndpInfoType<E> = E extends EndpointInfo<infer T, any, any, any, any, any, any, any, any, any> ? T : never;
type EndpInfoArgs<E> = E extends EndpointInfo<any, any, any, infer A, any, any, any, any, any, any> ? A : never;
type EndpInfoReturns<E> =
  E extends EndpointInfo<any, any, any, any, any, any, any, infer R, any, infer N>
    ? R | (N extends true ? null : never)
    : never;

type QueryOrMutationFetchFn<E> = (
  ...args: [...EndpInfoArgs<E>, fetchPolicy?: FetchPolicy]
) => Promise<EndpInfoReturns<E>>;

type MessageEmitFn<E> = (...args: EndpInfoArgs<E>) => EndpInfoReturns<E>;

type MessageListenFn<E> = (
  handleEvent: (data: EndpInfoReturns<E>) => PromiseOrObject<void>,
  options?: FetchPolicy,
) => () => void;

type PubsubSubscribeFn<E> = (
  ...args: [...EndpInfoArgs<E>, handleEvent: (data: EndpInfoReturns<E>) => PromiseOrObject<void>, options?: FetchPolicy]
) => () => void;

// Keys kept as-is: query / mutation / message (emit)
type PrimaryFetchType<EInfoObj extends { [key: string]: EndpointInfo }> = {
  [K in keyof EInfoObj as EndpInfoType<EInfoObj[K]> extends "query" | "mutation" | "message" ? K : never]: EndpInfoType<
    EInfoObj[K]
  > extends "query" | "mutation"
    ? QueryOrMutationFetchFn<EInfoObj[K]>
    : EndpInfoType<EInfoObj[K]> extends "message"
      ? MessageEmitFn<EInfoObj[K]>
      : never;
};

// Keys remapped to `subscribe${Key}`
type PubsubFetchType<EInfoObj extends { [key: string]: EndpointInfo }> = {
  [K in keyof EInfoObj as EndpInfoType<EInfoObj[K]> extends "pubsub"
    ? K extends string
      ? `subscribe${Capitalize<K>}`
      : never
    : never]: PubsubSubscribeFn<EInfoObj[K]>;
};

// Keys remapped to `listen${Key}`
type MessageListenFetchType<EInfoObj extends { [key: string]: EndpointInfo }> = {
  [K in keyof EInfoObj as EndpInfoType<EInfoObj[K]> extends "message"
    ? K extends string
      ? `listen${Capitalize<K>}`
      : never
    : never]: MessageListenFn<EInfoObj[K]>;
};

export type GetFetchTypeFromEndpoint<
  EndpCls extends EndpointCls,
  _EndpointInfoObj extends { [key: string]: EndpointInfo } = EndpCls[typeof ENDPOINT_META],
> = PrimaryFetchType<_EndpointInfoObj> & PubsubFetchType<_EndpointInfoObj> & MessageListenFetchType<_EndpointInfoObj>;
