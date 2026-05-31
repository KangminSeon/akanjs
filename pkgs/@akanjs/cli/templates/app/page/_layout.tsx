import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  appName: string;
}
export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict, options: { libs: string[] }) {
  const isUsingShared = options.libs.includes("shared");
  return {
    filename: "_layout.tsx",
    content: `
import "./styles.css";
import type { LayoutProps } from "akanjs/client";
${isUsingShared ? "import { Auth } from '@shared/ui';" : ""}

export const head = (
  <>
    <title>${dict.appName}</title>
    <link rel="icon" href="/favicon.ico" />
  </>
);

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {children}${isUsingShared ? "\n      <Auth.User />\n      <Auth.Admin />" : ""}
    </>
  );
}
  `,
  };
}
