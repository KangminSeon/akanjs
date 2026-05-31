import path from "node:path";
import {
  FileSys,
  type PackageJson,
  type Pkg,
  runner,
  TypeScriptDependencyScanner,
  type Workspace,
} from "@akanjs/devkit";
import { Logger } from "akanjs/common";
import { $ } from "bun";

export class PackageRunner extends runner("package") {
  async version(workspace: Workspace | null, { log = true }: { log?: boolean } = {}) {
    const pkgJson =
      process.env.USE_AKANJS_PKGS === "true"
        ? await FileSys.readJson<PackageJson>(`${workspace?.workspaceRoot ?? process.cwd()}/pkgs/akanjs/package.json`)
        : await this.#getInstalledPackageJson();
    const version = pkgJson.name === "akanjs" ? pkgJson.version : (pkgJson.dependencies?.akanjs ?? pkgJson.version);
    if (log) Logger.rawLog(`akanjs@${version}`);
    return version;
  }

  async #getInstalledPackageJson(): Promise<PackageJson> {
    const packageJsonCandidates = [
      `${path.dirname(Bun.main)}/package.json`,
      `${process.cwd()}/node_modules/akanjs/package.json`,
    ];
    try {
      packageJsonCandidates.unshift(Bun.resolveSync("akanjs/package.json", path.dirname(Bun.main)));
    } catch {
      // The bundled CLI can still report the matching runtime version from its own package.json dependency.
    }
    for (const packageJsonPath of packageJsonCandidates) {
      if (!(await Bun.file(packageJsonPath).exists())) continue;
      const packageJson = await FileSys.readJson<PackageJson>(packageJsonPath);
      if (packageJson.name === "akanjs" || packageJson.name === "@akanjs/cli") return packageJson;
    }
    throw new Error(`[package] failed to locate akanjs package.json from ${path.dirname(Bun.main)}`);
  }
  async createPackage(workspace: Workspace, pkgName: string) {
    await workspace.applyTemplate({ basePath: `pkgs/${pkgName}`, template: "pkgRoot", dict: { pkgName } });
    await workspace.setPkgTsPaths(pkgName);
  }
  async removePackage(pkg: Pkg) {
    await pkg.workspace.exec(`rm -rf pkgs/${pkg.name}`);
    await pkg.workspace.unsetPkgTsPaths(pkg.name);
  }
  async scanSync(pkg: Pkg) {
    const scanResult = await pkg.scan();
    return scanResult;
  }
  async buildPackage(pkg: Pkg) {
    await $`rm -rf ${pkg.dist.cwdPath}`;
    await pkg.dist.mkdir(pkg.dist.cwdPath);
    const scanner = await TypeScriptDependencyScanner.from(pkg);
    const { npmDeps, npmDevDeps, missingDeps } = await scanner.getPackageBuildDependencies(pkg.name);
    const packageRuntimeDependencies: Record<string, string[]> = {
      "@akanjs/devkit": ["daisyui", "tailwind-scrollbar"],
    };
    const packageRuntimeDevDependencies: Record<string, string[]> = { akanjs: ["@biomejs/biome", "@types/bun"] };
    if (pkg.name === "@akanjs/cli") {
      const devkitPackageJson = await pkg.workspace.readJson("pkgs/@akanjs/devkit/package.json");
      packageRuntimeDependencies[pkg.name] = [
        ...Object.keys(((devkitPackageJson as PackageJson).dependencies ?? {}) as Record<string, string>),
        "daisyui",
        "tailwind-scrollbar",
      ].filter((dep) => dep !== "akanjs" && dep !== "@akanjs/devkit");
    }
    const bundledRuntimeDeps = new Set(pkg.name === "@akanjs/cli" ? ["@akanjs/devkit"] : []);
    const forcedRuntimeDeps = packageRuntimeDependencies[pkg.name] ?? [];
    const forcedRuntimeDevDeps = packageRuntimeDevDependencies[pkg.name] ?? [];
    const [rootPackageJson, pkgJson] = await Promise.all([pkg.workspace.getPackageJson(), pkg.getPackageJson()]);
    const optionalPeerDeps = new Set(
      Object.entries(pkgJson.peerDependenciesMeta ?? {})
        .filter(([, meta]) => meta.optional)
        .map(([dep]) => dep),
    );
    const packageRuntimeDeps = [...new Set([...npmDeps, ...forcedRuntimeDeps])].filter(
      (dep) => !optionalPeerDeps.has(dep) && !bundledRuntimeDeps.has(dep),
    );
    const packageRuntimeDevDeps = [...new Set([...npmDevDeps, ...forcedRuntimeDevDeps])].filter(
      (dep) => !optionalPeerDeps.has(dep),
    );
    const rootDeps = { ...rootPackageJson.dependencies, ...rootPackageJson.devDependencies };
    const missingForcedDeps = forcedRuntimeDeps.filter((dep) => !rootDeps[dep]);
    const missingForcedDevDeps = forcedRuntimeDevDeps.filter((dep) => !rootDeps[dep]);
    const requiredMissingDeps = missingDeps.filter((dep) => !optionalPeerDeps.has(dep));
    const allMissingDeps = [...new Set([...requiredMissingDeps, ...missingForcedDeps, ...missingForcedDevDeps])].sort();
    if (allMissingDeps.length > 0)
      throw new Error(`Missing dependency versions in root package.json: ${allMissingDeps.join(", ")}`);

    await pkg.updatePackageJsonDependencies(packageRuntimeDeps, packageRuntimeDevDeps);

    const hasBuildFile = await Bun.file(`${pkg.cwdPath}/build.ts`).exists();
    if (hasBuildFile) {
      await pkg.workspace.spawn(process.execPath, [`${pkg.cwdPath}/build.ts`], { env: process.env, stdio: "inherit" });
    } else {
      await $`cp -r ${pkg.cwdPath}/. ${pkg.dist.cwdPath}`;
      await Promise.all([
        pkg.generateDistPackageJson(packageRuntimeDeps, packageRuntimeDevDeps),
        pkg.generateTsconfigJson(),
      ]);
    }
  }

  async updateWorskpaceRootPackageJson(workspace: Workspace, rootPackageJson: PackageJson) {
    const templatePath = "pkgs/@akanjs/cli/templates/workspaceRoot/package.json.template";
    const pkgJsonTemplate = (await workspace.readJson(templatePath)) as PackageJson;
    const { dependencies = {}, devDependencies = {} } = pkgJsonTemplate;
    const newRootPackageJson = {
      ...pkgJsonTemplate,
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([key, value]) => [key, rootPackageJson.dependencies?.[key] ?? value]),
      ),
      devDependencies: Object.fromEntries(
        Object.entries(devDependencies).map(([key, value]) => [key, rootPackageJson.devDependencies?.[key] ?? value]),
      ),
    };
    await workspace.writeJson(templatePath, newRootPackageJson);
  }
}
