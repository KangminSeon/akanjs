import type { AppInfo, LibInfo } from "akanjs";

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export default function getContent(scanInfo: AppInfo | LibInfo | null, dict: { [key: string]: string } = {}) {
  if (!scanInfo) return null;
  const databaseModules = [...scanInfo.database.entries()]
    .filter(([_, files]) => files.has("signal"))
    .map(([module]) => module);
  const serviceModules = [...scanInfo.service.entries()]
    .filter(([_, files]) => files.has("signal"))
    .map(([module]) => module);
  const libs = scanInfo.getLibs();

  return `
import { FetchClient } from "akanjs/fetch";
import { SignalRegistry, serverSignal${libs.length === 0 ? ", fetch as base" : ""} } from "akanjs/signal";
${libs.map((lib) => `import { fetch as ${lib} } from "@libs/${lib}/server";`).join("\n")}

${[...scanInfo.database.entries()]
  .filter(([_, files]) => files.has("signal"))
  .map(([module]) => `import * as ${module}Sig from "./${module}/${module}.signal";`)
  .join("\n")}
${[...scanInfo.service.entries()]
  .filter(([_, files]) => files.has("signal"))
  .map(([module]) => `import * as ${module}Sig from "./_${module}/${module}.signal";`)
  .join("\n")}

${[...scanInfo.database.entries()]
  .filter(([_, files]) => files.has("signal"))
  .map(([module]) => `export * from "./${module}/${module}.signal";`)
  .join("\n")}
${[...scanInfo.service.entries()]
  .filter(([_, files]) => files.has("signal"))
  .map(([module]) => `export * from "./_${module}/${module}.signal";`)
  .join("\n")}

${[...scanInfo.database.entries()]
  .filter(([_, files]) => files.has("signal"))
  .map(
    ([module]) =>
      `export class ${capitalize(module)} extends serverSignal(${module}Sig.${capitalize(module)}Endpoint, ${module}Sig.${capitalize(module)}Internal) {}`,
  )
  .join("\n")}
${[...scanInfo.service.entries()]
  .filter(([_, files]) => files.has("signal"))
  .map(
    ([module]) =>
      `export class ${capitalize(module)} extends serverSignal(${module}Sig.${capitalize(module)}Endpoint, ${module}Sig.${capitalize(module)}Internal) {}`,
  )
  .join("\n")}

${databaseModules.map((module) => `export const ${module} = SignalRegistry.registerDatabase("${module}" as const, ${module}Sig.${capitalize(module)}Internal, ${module}Sig.${capitalize(module)}Endpoint, ${module}Sig.${capitalize(module)}Slice, ${capitalize(module)});`).join("\n")}
${serviceModules.map((module) => `export const ${module} = SignalRegistry.registerService("${module}" as const, ${module}Sig.${capitalize(module)}Internal, ${module}Sig.${capitalize(module)}Endpoint, ${capitalize(module)});`).join("\n")}

export const fetch = FetchClient.from(${[...(libs.length === 0 ? ["base"] : libs), ...databaseModules, ...serviceModules].join(", ")});

export const getSerializedSignal = () => fetch.serializedSignal
`;
}
