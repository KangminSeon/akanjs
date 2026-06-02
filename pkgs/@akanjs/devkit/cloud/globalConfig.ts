import { mkdir } from "node:fs/promises";
import dayjs from "dayjs";
import { FileSys } from "../fileSys";
import {
  type AccessToken,
  type AccessTokenDto,
  type AkanGlobalConfig,
  akanCloudHost,
  basePath,
  configPath,
  defaultAkanGlobalConfig,
  defaultHostConfig,
  type HostConfig,
  type HostConfigDto,
} from "./constants";

export class GlobalConfig {
  static async #getAkanGlobalConfig(): Promise<AkanGlobalConfig> {
    const exists = await FileSys.fileExists(configPath);
    const akanConfig = exists
      ? await FileSys.readJson<AkanGlobalConfig>(configPath)
      : defaultAkanGlobalConfig;
    return akanConfig;
  }
  static async #setAkanGlobalConfig(akanConfig: AkanGlobalConfig) {
    await mkdir(basePath, { recursive: true });
    await Bun.write(configPath, JSON.stringify(akanConfig, null, 2));
  }
  static async getHostConfig(host = akanCloudHost): Promise<HostConfig> {
    const akanConfig = await GlobalConfig.#getAkanGlobalConfig();
    return GlobalConfig.toHostConfig(
      akanConfig.cloudHost[host] ?? defaultHostConfig,
    );
  }
  static async setHostConfig(host = akanCloudHost, config: HostConfig = {}) {
    const akanConfig = await GlobalConfig.#getAkanGlobalConfig();
    akanConfig.cloudHost[host] = GlobalConfig.toHostConfigDto(config);
    await GlobalConfig.#setAkanGlobalConfig(akanConfig);
  }
  static async getLlmConfig(): Promise<AkanGlobalConfig["llm"]> {
    const akanConfig = await GlobalConfig.#getAkanGlobalConfig();
    return akanConfig.llm ?? null;
  }
  static async setLlmConfig(llmConfig: AkanGlobalConfig["llm"]) {
    const akanConfig = await GlobalConfig.#getAkanGlobalConfig();
    await GlobalConfig.#setAkanGlobalConfig({ ...akanConfig, llm: llmConfig });
  }
  static needRefreshToken(accessToken: AccessToken): boolean {
    return !!accessToken?.expiresAt?.isBefore(dayjs().add(1, "hour"));
  }
  static toAccessToken(accessToken: AccessTokenDto): AccessToken {
    return {
      jwt: accessToken.jwt,
      refreshToken: accessToken.refreshToken ?? null,
      expiresAt: accessToken.expiresAt ? dayjs(accessToken.expiresAt) : null,
    };
  }
  static toAccessTokenDto(accessToken: AccessToken): AccessTokenDto {
    return {
      jwt: accessToken.jwt,
      refreshToken: accessToken.refreshToken ?? null,
      expiresAt: accessToken.expiresAt?.toString() ?? null,
    };
  }
  static toHostConfigDto(hostConfig: HostConfig): HostConfigDto {
    return {
      auth: {
        accessToken: hostConfig.auth?.accessToken
          ? GlobalConfig.toAccessTokenDto(hostConfig.auth.accessToken)
          : undefined,
        self: hostConfig.auth?.self,
      },
    };
  }
  static toHostConfig(hostConfigDto: HostConfigDto): HostConfig {
    return {
      auth: {
        accessToken: hostConfigDto.auth?.accessToken
          ? GlobalConfig.toAccessToken(hostConfigDto.auth.accessToken)
          : undefined,
        self: hostConfigDto.auth?.self,
      },
    };
  }
}
