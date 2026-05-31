import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  Model: string;
  model: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict) {
  return `
import { modelDictionary } from "akanjs/dictionary";

import type { ${dict.Model}Endpoint } from "../sig";

export const dictionary = modelDictionary(["en", "ko"])
  .of((t) => t(["${dict.model}", "${dict.model}"]).desc(["${dict.model} description", "${dict.model} 설명"]))
  .endpoint<${dict.Model}Endpoint>((fn) => ({}))
  .error({})
  .translate({});
`;
}
