import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { PushEvent } from "@octokit/webhooks-types";
import { dayjs } from "akanjs/base";

export type GithubPushEvent = PushEvent;
const execAsync = promisify(exec);

type GithubPublishIdentity = {
  id: string;
  login: string;
  accessToken: string;
};

type GithubApiError = {
  message?: string;
  errors?: { resource?: string; field?: string; code?: string; message?: string }[];
  documentation_url?: string;
};

const shellQuote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

export class GithubApp {
  readonly #baseUrl = "https://api.github.com";
  readonly #headers = {
    Accept: "application/json",
  };

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  async #api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const url = path.startsWith("http") ? path : `${this.#baseUrl}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: { ...this.#headers, ...init?.headers },
      signal: AbortSignal.timeout(20_000),
    });
    return (await response.json()) as T;
  }

  async getAccessToken(code: string) {
    const { access_token, expires_in, refresh_token } = await this.#api<{
      access_token: string;
      expires_in: number;
      refresh_token: string;
    }>("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: this.clientId, client_secret: this.clientSecret, code }),
    });

    return {
      accessToken: access_token,
      expiresAt: dayjs().add(expires_in, "seconds"),
      refreshToken: refresh_token,
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const { access_token, expires_in, refresh_token } = await this.#api<{
      access_token: string;
      expires_in: number;
      refresh_token: string;
    }>("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    return {
      accessToken: access_token,
      expiresAt: dayjs().add(expires_in, "seconds"),
      refreshToken: refresh_token,
    };
  }

  async getGithubInfo(accessToken: string) {
    return await this.#api<{
      id: number;
      login: string;
      node_id: string;
      type: string;
      name: string | null;
      email: string | null;
      site_admin: boolean;
      company?: string | null;
      blog?: string | null;
      location?: string | null;
    }>(`/user`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async listPullRequestFiles({
    owner,
    repo,
    pullNumber,
    accessToken,
  }: {
    owner: string;
    repo: string;
    pullNumber: number;
    accessToken: string;
  }) {
    return await this.#api<string[]>(`/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async createRepository(accessToken: string, repo: string, owner?: string) {
    const result = await this.#api<{ id?: number } & GithubApiError>(`/user/repos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: repo }),
    });
    if (result.id) return result as { id: number };
    if (owner) {
      const existing = await this.getRepository({ owner, repo, accessToken });
      if (existing?.id) return existing;
    }

    throw new Error(`Failed to create repository: ${this.#formatApiError(result)}`);
  }

  async getRepository({ owner, repo, accessToken }: { owner: string; repo: string; accessToken: string }) {
    const result = await this.#api<{ id?: number } & GithubApiError>(`/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return result.id ? (result as { id: number }) : null;
  }

  async registerWebhook({
    owner,
    repo,
    accessToken,
    webhookUrl,
    webhookSecret,
  }: {
    owner: string;
    repo: string;
    accessToken: string;
    webhookUrl: string;
    webhookSecret?: string;
  }) {
    return await this.#api<{ id: number }>(`/repos/${owner}/${repo}/hooks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: { url: webhookUrl, content_type: "json", secret: webhookSecret },
      }),
    });
  }

  async publishWorkspace({
    githubInfo,
    repo,
    projectPath,
    branch = "main",
    message,
  }: {
    githubInfo: GithubPublishIdentity;
    repo: string;
    projectPath: string;
    branch?: string;
    message?: string;
  }) {
    const authorEmail = `${githubInfo.id}+${githubInfo.login}@users.noreply.github.com`;
    const commitMessage = message ?? `Deploy by ${githubInfo.login}`;
    const projectPathArg = shellQuote(projectPath);
    const remoteUrlArg = `"https://x-access-token:$GITHUB_TOKEN@github.com/${githubInfo.login}/${repo}.git"`;

    await this.#execGit(`git -C ${projectPathArg} add .`);

    const hasChanges = await this.#hasStagedChanges(projectPathArg);
    if (hasChanges) {
      await this.#execGit(
        `git -C ${projectPathArg} -c user.name=${shellQuote(githubInfo.login)} -c user.email=${shellQuote(
          authorEmail,
        )} commit -m ${shellQuote(commitMessage)}`,
      );
    }

    await this.#execGit(`git -C ${projectPathArg} push ${remoteUrlArg} HEAD:${shellQuote(branch)}`, {
      GITHUB_TOKEN: githubInfo.accessToken,
    });
  }

  async #hasStagedChanges(projectPathArg: string) {
    try {
      await this.#execGit(`git -C ${projectPathArg} diff --cached --quiet`);
      return false;
    } catch {
      return true;
    }
  }

  async #execGit(command: string, env: Record<string, string> = {}) {
    return await execAsync(command, {
      env: { ...process.env, ...env },
      maxBuffer: 1024 * 1024 * 10,
    });
  }

  #formatApiError(error: GithubApiError) {
    const errors =
      error.errors
        ?.map((item) => [item.resource, item.field, item.code, item.message].filter(Boolean).join("/"))
        .join(", ") ?? "";
    return [error.message, errors, error.documentation_url].filter(Boolean).join(" - ") || "Unknown GitHub API error";
  }
}
