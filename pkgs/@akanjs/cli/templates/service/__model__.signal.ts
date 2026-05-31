import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  Model: string;
  model: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict) {
  return `
import { endpoint, internal } from "akanjs/signal";

import * as srv from "../srv";

export class ${dict.Model}Internal extends internal(srv.${dict.model}, () => ({})) {}

export class ${dict.Model}Endpoint extends endpoint(srv.${dict.model}, ({ query, mutation }) => ({})) {}
`;
}
