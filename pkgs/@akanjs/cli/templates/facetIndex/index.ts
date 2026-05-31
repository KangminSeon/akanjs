import type { SysExecutor } from "@akanjs/devkit";
import type { AppInfo, LibInfo } from "akanjs";

interface Dict {
  [key: string]: string;
}

interface Options {
  exec?: SysExecutor;
  facet?: string;
}

const sourceFilePattern = /\.(ts|tsx)$/;
const excludedFilePattern = /(^index\.tsx?$|\.d\.ts$|\.(test|spec)\.(ts|tsx)$|\.css$|\.scss$|\.sass$)/;

export default async function getContent(scanInfo: AppInfo | LibInfo | null, dict: Dict = {}, options: Options = {}) {
  const { exec, facet } = options;
  if (!exec || !facet || !(await exec.exists(facet))) return null;

  const { files, dirs } = await exec.getFilesAndDirs(facet);
  const exportNames = [
    ...files
      .filter((filename) => sourceFilePattern.test(filename) && !excludedFilePattern.test(filename))
      .map((filename) => filename.replace(sourceFilePattern, "")),
    ...dirs.filter((dirname) => !dirname.startsWith(".")),
  ].sort();

  if (exportNames.length === 0) return null;
  return {
    filename: "index.ts",
    content: `${exportNames.map((name) => `export * from "./${name}";`).join("\n")}\n`,
  };
}
