import type { Assign } from "akanjs/base";
import type { DatabaseSignal, ServiceSignal } from "akanjs/signal";
import type { FetchProxy } from "../client";
import type { GetFetchTypeFromEndpoint } from "./endpointFetch.type";
import type { GetFetchTypeFromSlice } from "./sliceFetch.type";

type GetFetchType<Signal extends FetchProxy<any> | DatabaseSignal<any, any, any, any> | ServiceSignal<any, any, any>> =
  Signal extends FetchProxy<infer FetchType>
    ? FetchType
    : Signal extends DatabaseSignal<any, infer EndpCls, infer SlceCls, any>
      ? GetFetchTypeFromEndpoint<EndpCls> & GetFetchTypeFromSlice<SlceCls>
      : Signal extends ServiceSignal<any, infer EndpCls, any>
        ? GetFetchTypeFromEndpoint<EndpCls>
        : unknown;

export type MergeAllFetchTypes<
  Signals extends (FetchProxy<any> | DatabaseSignal<any, any, any, any> | ServiceSignal<any, any, any>)[],
  Acc = unknown,
> = Signals extends [
  infer First extends FetchProxy<any> | DatabaseSignal<any, any, any, any> | ServiceSignal<any, any, any>,
  ...infer Rest extends (FetchProxy<any> | DatabaseSignal<any, any, any, any> | ServiceSignal<any, any, any>)[],
]
  ? MergeAllFetchTypes<Rest, Assign<Acc, GetFetchType<First>>>
  : Acc;
