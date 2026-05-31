import { endpoint, internal } from "akanjs/signal";

import * as srv from "../srv";

export class MinimalInternal extends internal(srv.minimal, ({ cron }) => ({})) {}

export class MinimalEndpoint extends endpoint(srv.minimal, ({ query }) => ({
  benchPing: query(String).exec(() => "ok"),
  benchEcho: query(String)
    .param("value", String)
    .exec((value) => value),
})) {}
