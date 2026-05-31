// @ts-nocheck — see ./react.ts for the rationale.
import * as m from "react-server-dom-webpack/client.browser";

export default m;
export const {
  createFromFetch,
  createFromReadableStream,
  createServerReference,
  createTemporaryReferenceSet,
  encodeReply,
  registerServerReference,
} = m;
