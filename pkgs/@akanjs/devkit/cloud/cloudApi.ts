import {
  type AccessToken,
  type AccessTokenDto,
  akanCloudHost,
  type HostConfig,
} from "./constants";
import { GlobalConfig } from "./globalConfig";

class HttpClient {
  readonly baseUrl: string;
  readonly headers: Record<string, string> = {};
  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = headers;
  }
  async get<T>(
    url: string,
    { headers }: { headers?: Record<string, string> } = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
        ...headers,
      },
    });
    return response.json();
  }
  async post<T>(
    url: string,
    data: unknown,
    { headers }: { headers?: Record<string, string> } = {},
  ): Promise<T> {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "POST",
      body: isFormData ? data : JSON.stringify(data),
      headers: isFormData
        ? headers
        : { "Content-Type": "application/json", ...this.headers, ...headers },
    });
    return response.json();
  }
  setHeaders(headers: Record<string, string>) {
    Object.assign(this.headers, headers);
    return this;
  }
}

export class CloudApi {
  readonly #api: HttpClient;
  #accessToken: AccessToken | null = null;

  constructor(hostConfig: HostConfig) {
    const host = akanCloudHost;
    this.#api = new HttpClient(`${host}/api`);
    this.#accessToken = hostConfig.auth?.accessToken ?? null;
    if (this.#accessToken && !GlobalConfig.needRefreshToken(this.#accessToken))
      this.#api.setHeaders({
        Authorization: `Bearer ${this.#accessToken.jwt}`,
      });
  }

  async uploadEnv(devProjectId: string, file: File): Promise<boolean> {
    const formData = new FormData();
    formData.append("devProjectId", devProjectId);
    formData.append("file", file);
    const data = await this.#api.post<boolean>(
      `/uploadEnv/${devProjectId}`,
      formData,
    );
    return data;
  }
  async downloadEnv(devProjectId: string): Promise<string> {
    const data = await this.#api.get<{ url: string }>(
      `/downloadEnv/${devProjectId}`,
    );
    return data.url;
  }
  async getRemoteAuthToken(remoteId: string): Promise<AccessToken | null> {
    try {
      if (this.#accessToken) {
        if (GlobalConfig.needRefreshToken(this.#accessToken))
          return await this.refreshAuthToken();
        else return await this.refreshAuthToken();
      }
      const accessToken = await this.#api.get<AccessTokenDto>(
        `/getRemoteAuthToken/${remoteId}`,
      );
      this.#accessToken = GlobalConfig.toAccessToken(accessToken);
      this.#api.setHeaders({
        Authorization: `Bearer ${this.#accessToken.jwt}`,
      });
      return this.#accessToken;
    } catch (_) {
      return null;
    }
  }
  async refreshAuthToken(): Promise<AccessToken> {
    const response = await this.#api.post<AccessTokenDto>(
      `/refreshRemoteAuthToken`,
      {
        refreshToken: this.#accessToken?.refreshToken,
      },
    );
    this.#accessToken = GlobalConfig.toAccessToken(response);
    this.#api.setHeaders({ Authorization: `Bearer ${this.#accessToken.jwt}` });
    return this.#accessToken;
  }
  async getRemoteSelf(): Promise<{ id: string; nickname: string } | null> {
    try {
      const data = await this.#api.get<{ id: string; nickname: string }>(
        `/getRemoteSelf`,
      );
      return data;
    } catch {
      return null;
    }
  }
}
