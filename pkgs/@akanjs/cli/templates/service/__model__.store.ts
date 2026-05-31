import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  Model: string;
  model: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict) {
  return `
import { store } from "akanjs/store";

export class ${dict.Model}Store extends store("${dict.model}" as const, () => ({
  // state
})) {
  // action
}
`;
}
