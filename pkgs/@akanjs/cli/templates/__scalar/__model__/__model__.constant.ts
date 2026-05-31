import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  model: string;
  Model: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict) {
  return `
import { via } from "akanjs/constant";

export class ${dict.Model} extends via((field) => ({
  field: field(String),
})) {}
`;
}
