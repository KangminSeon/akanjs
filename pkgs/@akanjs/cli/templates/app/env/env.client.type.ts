import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  [key: string]: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict = {}) {
  return `
import type { ClientEnv } from "akanjs/base";

export type AppClientEnv = ClientEnv & {
  cloudflare?: {
    siteKey: string;
  };
};
  `;
}
