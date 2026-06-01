import type { SupportedLlmModel } from "./aiEditor";

export const basePath = `${Bun.env.HOME ?? Bun.env.USERPROFILE}/.akan`;
export const configPath = `${basePath}/config.json`;
export const akanCloudHost =
  process.env.AKAN_PUBLIC_OPERATION_MODE === "local"
    ? "http://localhost"
    : "https://cloud.akanjs.com";
export const akanCloudUrl = `${akanCloudHost}${
  process.env.AKAN_PUBLIC_OPERATION_MODE === "local" ? ":8282" : ""
}/api`;

export interface HostConfig {
  auth?: {
    token: string;
    self: { id: string; nickname: string };
  };
}
export const defaultHostConfig: HostConfig = {};
export interface AkanGlobalConfig {
  cloudHost: {
    [key: string]: HostConfig;
  };
  llm: {
    model: SupportedLlmModel;
    apiKey: string;
  } | null;
}
export const defaultAkanGlobalConfig: AkanGlobalConfig = {
  cloudHost: {},
  llm: null,
};
