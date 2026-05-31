import type { AppInfo, LibInfo } from "akanjs";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: { [key: string]: string } = {}) {
  if (!scanInfo) return null;
  const libs = scanInfo.getLibs();
  const libInfos = scanInfo.getLibInfos();
  const extendedModels = Object.fromEntries(
    [...scanInfo.file.constant.databases]
      .map(
        (modelName) =>
          [
            modelName,
            [...libInfos.values()]
              .filter((libInfo) => libInfo.file.constant.databases.has(modelName))
              .map((libInfo) => libInfo.name),
          ] as [string, string[]],
      )
      .filter(([_, libNames]) => libNames.length > 0),
  );
  return `
${libs.map((lib) => `import { cnst as ${lib} } from "@libs/${lib}";`).join("\n")}

${Object.entries(extendedModels)
  .map(([modelName, extendedModels]) => {
    const ModelName = capitalize(modelName);
    return `export const ${modelName} = {
  inputs: [${extendedModels.map((libName) => `${libName}.${ModelName}Input`).join(", ")}] as const,
  objects: [${extendedModels.map((libName) => `${libName}.${ModelName}Object`).join(", ")}] as const,
  lights: [${extendedModels.map((libName) => `${libName}.Light${ModelName}`).join(", ")}] as const,
  models: [${extendedModels.map((libName) => `${libName}.${ModelName}`).join(", ")}] as const,
  insights: [${extendedModels.map((libName) => `${libName}.${ModelName}Insight`).join(", ")}] as const,
}`;
  })
  .join("\n")}
`;
}
