import dayjs, { type Dayjs } from "dayjs";

interface AccessTokenDto {
  jwt: string;
  refreshToken: string | null;
  expiresAt: string | null;
}
interface AccessToken {
  jwt: string;
  refreshToken: string | null;
  expiresAt: Dayjs | null;
}

class HttpClient {
  readonly baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  async get<T>(
    url: string,
    { headers }: { headers?: Record<string, string> } = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${url}`, {
      headers: { "Content-Type": "application/json", ...headers },
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
        : { "Content-Type": "application/json", ...headers },
    });
    return response.json();
  }
}

export class CloudApi {
  readonly api: HttpClient;
  #accessToken: AccessToken | null = null;
  constructor(
    host: string,
    { accessToken }: { accessToken?: AccessToken } = {},
  ) {
    this.api = new HttpClient(`${host}/api`);
    this.#accessToken = accessToken ?? null;
  }

  async uploadEnv(devProjectId: string, file: File): Promise<boolean> {
    const formData = new FormData();
    formData.append("devProjectId", devProjectId);
    formData.append("file", file);
    const response = await this.api.post<{ success: boolean }>(
      `/uploadEnv/${devProjectId}`,
      formData,
    );
    return response.success;
  }
  async downloadEnv(devProjectId: string): Promise<boolean> {
    const response = await this.api.get<{ success: boolean }>(
      `/downloadEnv/${devProjectId}`,
    );
    return response.success;
  }
  async getRemoteAuthToken(remoteId: string): Promise<AccessToken> {
    if (this.#needRefreshToken()) return await this.refreshAuthToken();
    else if (this.#accessToken) return this.#accessToken;
    const accessToken = await this.api.get<AccessTokenDto>(
      `/getRemoteAuthToken/${remoteId}`,
    );
    this.#accessToken = {
      jwt: accessToken.jwt,
      refreshToken: accessToken.refreshToken,
      expiresAt: accessToken.expiresAt ? dayjs(accessToken.expiresAt) : null,
    };
    return this.#accessToken;
  }
  async refreshAuthToken(): Promise<AccessToken> {
    const response = await this.api.post<AccessTokenDto>(
      `/refreshRemoteAuthToken`,
      {
        refreshToken: this.#accessToken?.refreshToken,
      },
    );
    this.#accessToken = {
      jwt: response.jwt,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt ? dayjs(response.expiresAt) : null,
    };
    return this.#accessToken;
  }
  #needRefreshToken(): boolean {
    return !!this.#accessToken?.expiresAt?.isBefore(dayjs().add(1, "hour"));
  }
}
