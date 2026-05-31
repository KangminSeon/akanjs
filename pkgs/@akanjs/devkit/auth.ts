import { mkdir } from "node:fs/promises";

import {
  type AkanGlobalConfig,
  akanCloudHost,
  akanCloudUrl,
  basePath,
  configPath,
  defaultAkanGlobalConfig,
  defaultHostConfig,
  type HostConfig,
} from "./constants";
import { FileSys } from "./fileSys";

export const getAkanGlobalConfig = async () => {
  const exists = await FileSys.fileExists(configPath);
  const akanConfig = exists ? await FileSys.readJson<AkanGlobalConfig>(configPath) : defaultAkanGlobalConfig;
  return akanConfig;
};
export const setAkanGlobalConfig = async (akanConfig: AkanGlobalConfig) => {
  await mkdir(basePath, { recursive: true });
  await Bun.write(configPath, JSON.stringify(akanConfig, null, 2));
};
export const getHostConfig = async (host = akanCloudHost) => {
  const akanConfig = await getAkanGlobalConfig();
  return akanConfig.cloudHost[host] ?? defaultHostConfig;
};
export const setHostConfig = async (host = akanCloudHost, config: HostConfig = {}) => {
  const akanConfig = await getAkanGlobalConfig();
  akanConfig.cloudHost[host] = config;
  await setAkanGlobalConfig(akanConfig);
};
export const getSelf = async (token: string) => {
  try {
    const res = await fetch(`${akanCloudUrl}/user/getSelf`, { headers: { Authorization: `Bearer ${token}` } });
    const user = (await res.json()) as { id: string; nickname: string };
    return user;
  } catch (e) {
    return null;
  }
};
