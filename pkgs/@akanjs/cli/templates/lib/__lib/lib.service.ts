import type { AppInfo, LibInfo } from "akanjs";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: { [key: string]: string } = {}) {
  if (!scanInfo) return null;
  const libs = scanInfo.getLibs();
  const libInfos = [...scanInfo.getLibInfos().values()];
  const extendedModels = Object.fromEntries(
    [...scanInfo.file.service.databases]
      .map(
        (modelName) =>
          [
            modelName,
            libInfos.filter((libInfo) => libInfo.file.service.databases.has(modelName)).map((libInfo) => libInfo.name),
          ] as [string, string[]],
      )
      .filter(([_, libNames]) => libNames.length > 0),
  );

  return `
${libs.map((lib) => `import { srv as ${lib} } from "@libs/${lib}/server";`).join("\n")}

${Object.entries(extendedModels)
  .map(([modelName, extendedModels]) => {
    const ModelName = capitalize(modelName);
    return `export const ${modelName} = {
  services: [${extendedModels.map((libName) => `${libName}.${ModelName}Service`).join(", ")}] as const,
}`;
  })
  .join("\n")}
`;
}
