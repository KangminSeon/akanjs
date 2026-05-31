import path from "node:path";
import {
  AiSession,
  akanCloudHost,
  akanCloudUrl,
  getHostConfig,
  getSelf,
  runner,
  setHostConfig,
  type Workspace,
} from "@akanjs/devkit";
import { confirm } from "@inquirer/prompts";
import { Logger, sleep } from "akanjs/common";
import chalk from "chalk";
import * as QRcode from "qrcode";
import { getLatestPackageVersion, getNpmRegistryUrl } from "../npmRegistry";
import { openBrowser } from "../openBrowser";

interface RegistryOptions {
  registryUrl?: string;
  confirmPublish?: boolean;
  tag?: string;
}

export class CloudRunner extends runner("cloud") {
  #akanFrameworkPackages = new Set(["akanjs", "@akanjs/devkit", "@akanjs/cli", "create-akan-workspace"]);

  #getRegistryArgs(registryUrl?: string) {
    return registryUrl ? ["--registry", getNpmRegistryUrl(registryUrl)] : [];
  }

  #getLocalRegistryAuthArgs(registryUrl?: string) {
    if (!registryUrl) return [];
    const { host, pathname } = new URL(getNpmRegistryUrl(registryUrl));
    const registryPath = pathname === "/" ? "/" : `${pathname.replace(/\/+$/, "")}/`;
    return [`--//${host}${registryPath}:_authToken=akan-local-registry`];
  }

  #getRegistryEnv(registryUrl?: string) {
    return registryUrl
      ? {
          ...process.env,
          AKAN_NPM_REGISTRY: getNpmRegistryUrl(registryUrl),
          NPM_CONFIG_REGISTRY: getNpmRegistryUrl(registryUrl),
        }
      : process.env;
  }

  async login() {
    const config = await getHostConfig();
    const self = config.auth ? await getSelf(config.auth.token) : null;
    if (self) {
      Logger.rawLog(chalk.green(`\n✓ Already logged in akan cloud as ${self.nickname}\n`));
      return true;
    }
    const remoteId = crypto.randomUUID();
    const signinUrl = `${akanCloudUrl}/signin?remoteId=${remoteId}`;

    Logger.rawLog(chalk.bold(`\n${chalk.green("➤")} Authentication Required`));
    Logger.rawLog(chalk.dim("Please visit or click the following URL:"));
    Logger.rawLog(`${chalk.cyan.underline(signinUrl)}\n`);

    try {
      const qrcode = await new Promise<string>((resolve, reject) => {
        QRcode.toString(signinUrl, { type: "terminal", small: true }, (err, data) => {
          if (err) reject(err);
          resolve(data);
        });
      });
      Logger.rawLog(qrcode);
      await openBrowser(signinUrl);
      Logger.rawLog(chalk.dim("Opening browser..."));
    } catch {
      Logger.rawLog(chalk.yellow("Could not open browser. Please visit the URL manually."));
    }

    Logger.rawLog(chalk.dim("Waiting for authentication..."));
    const MAX_RETRY = 300;
    for (let i = 0; i < MAX_RETRY; i++) {
      const res = await fetch(`${akanCloudUrl}/user/getRemoteAuthToken/${remoteId}`);
      const { jwt } = (await res.json()) as { jwt: string | null };
      const self = jwt ? await getSelf(jwt) : null;
      if (jwt && self) {
        setHostConfig(akanCloudHost, { auth: { token: jwt, self } });
        Logger.rawLog(chalk.green(`\r✓ Authentication successful!`));
        Logger.rawLog(chalk.green.bold(`\n✨ Welcome aboard, ${self.nickname}!`));
        Logger.rawLog(chalk.dim("You're now ready to use Akan CLI!\n"));
        return true;
      }
      await sleep(2000);
    }
    throw new Error(chalk.red("✖ Authentication timed out after 10 minutes. Please try again."));
  }
  async logout() {
    const config = await getHostConfig();
    if (config.auth) {
      setHostConfig(akanCloudHost, {});
      Logger.rawLog(chalk.magenta.bold(`\n👋 Goodbye, ${config.auth.self.nickname}!`));
      Logger.rawLog(chalk.dim("───────────────────────────────────────────────\n"));
      Logger.rawLog(chalk.cyan("You have been successfully logged out."));
      Logger.rawLog(chalk.dim("Thank you for using Akan CLI. Come back soon! 🌟\n"));
    } else {
      Logger.rawLog(chalk.yellow.bold("\n⚠️  No active session found"));
      Logger.rawLog(chalk.dim("You were not logged in to begin with\n"));
    }
  }
  async setLlm() {
    await AiSession.init({ useExisting: true });
  }
  resetLlm() {
    AiSession.setLlmConfig(null);
    Logger.rawLog(chalk.green("☑️ LLM model config is cleared. Please run `akan set-llm` to set a new LLM model."));
  }
  async getAkanPkgs(workspace: Workspace) {
    const pkgs = await workspace.getPkgs();
    return pkgs.filter((pkg) => pkg === "akanjs" || pkg === "create-akan-workspace" || pkg.startsWith("@akanjs/"));
  }
  async deployAkan(
    workspace: Workspace,
    akanPkgs: string[],
    { registryUrl, confirmPublish = true, tag: distTag }: RegistryOptions = {},
  ) {
    const registry = registryUrl ? getNpmRegistryUrl(registryUrl) : undefined;
    const akanPackageJson = (await workspace.readJson("pkgs/akanjs/package.json")) as { version: string };
    const [majorVersion, minorVersion, patchVersion, devPatchVersion] = akanPackageJson.version.split(".");
    const isOfficialRelease = !devPatchVersion;
    const targetVersionPrefix = isOfficialRelease
      ? `${majorVersion}.${minorVersion}`
      : `${majorVersion}.${minorVersion}.${patchVersion}`;
    const tag = distTag ?? (isOfficialRelease ? "latest" : (patchVersion.split("-").at(1) ?? "dev"));
    const getNextVersion = async (prefix: string, tag: string) => {
      try {
        const latestPublishedVersion = await getLatestPackageVersion("akanjs", tag, registry);
        const latestPatch = latestPublishedVersion.startsWith(prefix)
          ? parseInt(latestPublishedVersion.split(".").at(-1) ?? "-1")
          : -1;
        const nextVersion = `${prefix}.${latestPatch + 1}`;
        return { nextVersion, latestPublishedVersion };
      } catch {
        return { nextVersion: `${prefix}.0`, latestPublishedVersion: null };
      }
    };
    const { nextVersion, latestPublishedVersion } = await getNextVersion(targetVersionPrefix, tag);
    Logger.info(`Latest published version of akanjs: ${latestPublishedVersion ?? "none"}`);
    Logger.info(`Next version of akanjs: ${nextVersion}`);
    for (const library of akanPkgs) {
      const packageJson = (await workspace.readJson(`pkgs/${library}/package.json`)) as { version: string };
      const newPackageJsonStr = JSON.stringify(
        this.#normalizeAkanPackageJson(packageJson, library, nextVersion),
        null,
        2,
      );
      await workspace.writeFile(`pkgs/${library}/package.json`, newPackageJsonStr);
      const distPackageJson = (await workspace.readJson(`dist/pkgs/${library}/package.json`)) as {
        version: string;
        dependencies?: Record<string, string>;
      };
      const newDistPackageJson = this.#normalizeAkanPackageJson(distPackageJson, library, nextVersion);
      await workspace.writeJson(`dist/pkgs/${library}/package.json`, newDistPackageJson);
    }
    if (confirmPublish) {
      const isDeployConfirmed = await confirm({
        message: "Are you sure you want to deploy the libraries?",
      });
      if (!isDeployConfirmed) {
        Logger.error("Deployment cancelled");
        return;
      }
    }

    await Promise.all(
      akanPkgs.map(async (library) => {
        Logger.info(`Publishing ${library}@${nextVersion} to ${registry ?? "npm"}...`);
        await workspace.spawn(
          "npm",
          ["publish", "--tag", tag, ...this.#getRegistryArgs(registry), ...this.#getLocalRegistryAuthArgs(registry)],
          {
            cwd: path.join(workspace.workspaceRoot, "dist/pkgs", library),
            env: this.#getRegistryEnv(registry),
            stdio: "inherit",
          },
        );
        Logger.info(`${library}@${nextVersion} is published to ${registry ?? "npm"}`);
      }),
    );
    Logger.info(`All libraries are published to ${registry ?? "npm"}`);
  }
  async update(workspace: Workspace, tag: string = "latest", { registryUrl }: RegistryOptions = {}) {
    const registry = registryUrl ? getNpmRegistryUrl(registryUrl) : undefined;
    const registryArgs = this.#getRegistryArgs(registry);
    const env = this.#getRegistryEnv(registry);
    if (!(await workspace.exists("package.json")))
      await workspace.spawn("bun", ["update", "-g", "akanjs", "--latest", `--tag=${tag}`, ...registryArgs], { env });
    else
      await Promise.all([
        workspace.spawn("bun", ["update", "-g", "akanjs", "--latest", `--tag=${tag}`, ...registryArgs], { env }),
        this.#updateAkanPkgs(workspace, tag, registry),
      ]);
  }
  async #updateAkanPkgs(workspace: Workspace, tag: string = "latest", registryUrl?: string) {
    const latestPublishedVersion = await getLatestPackageVersion("akanjs", tag, registryUrl);
    const rootPackageJson = await workspace.getPackageJson();
    if (!rootPackageJson.dependencies) throw new Error("No dependencies found in package.json");
    if (rootPackageJson.dependencies.akanjs) rootPackageJson.dependencies.akanjs = latestPublishedVersion;
    if (rootPackageJson.devDependencies?.akanjs) rootPackageJson.devDependencies.akanjs = latestPublishedVersion;
    if (rootPackageJson.dependencies["@akanjs/devkit"])
      rootPackageJson.dependencies["@akanjs/devkit"] = latestPublishedVersion;
    if (rootPackageJson.devDependencies?.["@akanjs/devkit"])
      rootPackageJson.devDependencies["@akanjs/devkit"] = latestPublishedVersion;
    await workspace.setPackageJson(rootPackageJson);
    await workspace.spawn("bun", ["install", ...this.#getRegistryArgs(registryUrl)], {
      env: this.#getRegistryEnv(registryUrl),
    });
  }

  #normalizeAkanPackageJson<T extends { version: string }>(packageJson: T, packageName: string, version: string): T {
    const normalized = { ...packageJson, version } as T & {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const) {
      const dependencies = normalized[field];
      if (!dependencies) continue;
      normalized[field] = Object.fromEntries(
        Object.entries(dependencies).map(([dep, depVersion]) => [
          dep,
          dep !== packageName && this.#akanFrameworkPackages.has(dep) ? version : depVersion,
        ]),
      );
    }
    return normalized;
  }
}
