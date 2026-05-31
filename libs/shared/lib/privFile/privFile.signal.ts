import { endpoint, internal, None, slice } from "akanjs/signal";

import * as srv from "../srv";

export class PrivFileInternal extends internal(srv.privFile, () => ({})) {}

export class PrivFileSlice extends slice(srv.privFile, { guards: { root: None, get: None, cru: None } }, () => ({})) {}

export class PrivFileEndpoint extends endpoint(srv.privFile, () => ({})) {}
