import { ENDPOINT_META, INJECT_META, INTERNAL_META } from "akanjs/base";
import type { DocumentModel } from "akanjs/constant";
import {
  type Adaptor,
  type AdaptorCls,
  type AkanJob,
  type AkanJobOptions,
  adapt,
  type QueueAdaptor,
  QueueAdaptorRole,
} from "akanjs/service";
import type { ServerWebSocket } from "bun";
import type { EndpointCls } from "./endpoint";
import type { EndpointInfo } from "./endpointInfo";
import type { InternalCls } from "./internal";
import type { InternalInfo } from "./internalInfo";

export interface ServerSignal extends Adaptor {
  readonly websocket: ServerWebSocket;
  readonly queue: QueueAdaptor;
}

type EndpointServerSignalMethods<EnpCls> = EnpCls extends { [ENDPOINT_META]: infer EndpointInfoObj }
  ? {
      [K in keyof EndpointInfoObj as EndpointInfoObj[K] extends EndpointInfo<
        "pubsub",
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any
      >
        ? K
        : never]: EndpointInfoObj[K] extends EndpointInfo<
        any,
        any,
        any,
        any,
        any,
        infer ServerArgs,
        any,
        infer ClientReturns,
        any,
        any
      >
        ? (...args: [...ServerArgs, data: DocumentModel<ClientReturns>]) => void
        : never;
    }
  : never;

type InternalServerSignalMethods<IntCls> = IntCls extends { [INTERNAL_META]: infer InternalInfoObj }
  ? {
      [K in keyof InternalInfoObj as InternalInfoObj[K] extends InternalInfo<
        "process",
        any,
        any,
        any,
        any,
        any,
        any,
        any
      >
        ? K
        : never]: InternalInfoObj[K] extends InternalInfo<
        any,
        any,
        infer ServerArgs,
        any,
        any,
        any,
        infer ServerReturns
      >
        ? (...args: [...args: ServerArgs, jobOptions?: AkanJobOptions]) => Promise<AkanJob<any, ServerReturns>>
        : never;
    }
  : never;

type ServerSignalClsStatics = {
  readonly refName: string;
  readonly [INJECT_META]: { queue: QueueAdaptor };
  readonly [ENDPOINT_META]: { [key: string]: EndpointInfo };
  readonly [INTERNAL_META]: { [key: string]: InternalInfo };
};

// type ServerSignalClsStatics<EnpCls, IntCls> = EnpCls extends {
//   refName: infer RefName;
//   [ENDPOINT_META]: infer EndpointInfoObj;
// }
//   ? IntCls extends { [ENDPOINT_META]: infer InternalInfoObj }
//     ? {
//         readonly refName: RefName;
//         readonly [ENDPOINT_META]: EndpointInfoObj;
//         readonly [ENDPOINT_META]: InternalInfoObj;
//         readonly [INJECT_META]: { queue: QueueAdaptor };
//       }
//     : never
//   : never;

export type ServerSignalCls<EnpCls = any, IntCls = any> = AdaptorCls<
  EndpointServerSignalMethods<EnpCls> & InternalServerSignalMethods<IntCls> & ServerSignal
> &
  ServerSignalClsStatics;

/** Composes endpoint and internal classes into a server-side signal class. */
export const serverSignal = <EnpCls, IntCls>(
  endpointRef: EnpCls,
  internalRef: IntCls,
): ServerSignalCls<EnpCls, IntCls> => {
  const refName = (endpointRef as unknown as EndpointCls).refName.slice(0, -8);
  return class ServerSignal extends adapt(`${refName}Signal`, ({ plug }) => ({
    // websocket: use<ServerWebSocket>(),
    queue: plug(QueueAdaptorRole),
  })) {
    static readonly [ENDPOINT_META] = Object.fromEntries(
      Object.entries((endpointRef as unknown as EndpointCls)[ENDPOINT_META])
        .filter(([key, endpointInfo]) => endpointInfo.type === "pubsub")
        .map(([key, value]) => [key, value]),
    );
    static readonly [INTERNAL_META] = Object.fromEntries(
      Object.entries((internalRef as unknown as InternalCls)[INTERNAL_META])
        .filter(([key, internalInfo]) => internalInfo.type === "process")
        .map(([key, value]) => [key, value]),
    );
  } as unknown as ServerSignalCls<EnpCls, IntCls>;
};
