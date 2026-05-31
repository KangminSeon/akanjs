import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  Model: string;
  model: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict) {
  return `
import { serve } from "akanjs/service";

export class ${dict.Model}Service extends serve("${dict.model}" as const, ({ use, service, env, signal }) => ({})) {}
`;
}
