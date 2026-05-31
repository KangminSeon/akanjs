import os from "node:os";
import type { CapacitorConfig } from "@capacitor/cli";
import type { AkanMobileTargetConfig, AppScanResult } from "akanjs";

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const iface = interfaces[interfaceName];
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) return alias.address;
    }
  }
  return "127.0.0.1"; // fallback to localhost if no suitable IP found
};

const normalizeBasePath = (basePath: string | undefined) => basePath?.replace(/^\/+|\/+$/g, "");

const routeBasePaths = (appInfo: AppScanResult) =>
  new Set(
    appInfo.routes
      .map((route) => route.replace(/^\.\//, "").split("/")[0])
      .filter((segment): segment is string => !!segment && !segment.startsWith("_") && !segment.startsWith("(")),
  );

const resolveTarget = (appInfo: AppScanResult, targetName = process.env.AKAN_MOBILE_TARGET) => {
  const targets = appInfo.akanConfig.mobile.targets;
  if (!targets || Object.keys(targets).length === 0) throw new Error("Akan mobile target metadata is missing.");
  if (targetName) {
    const target = targets[targetName];
    if (!target) {
      const basePath = normalizeBasePath(targetName);
      const [template] = Object.values(targets);
      if (basePath && template && routeBasePaths(appInfo).has(basePath))
        return { ...template, name: basePath, basePath };
      throw new Error(`Akan mobile target '${targetName}' was not found.`);
    }
    return target;
  }
  const entries = Object.entries(targets);
  if (entries.length !== 1) throw new Error("AKAN_MOBILE_TARGET is required when multiple mobile targets exist.");
  return entries[0]?.[1] as AkanMobileTargetConfig;
};

const localCsrUrl = (ip: string, target: AkanMobileTargetConfig) => {
  const basePath = normalizeBasePath(target.basePath);
  const port = process.env.AKAN_PUBLIC_CLIENT_PORT ?? process.env.PORT ?? "8282";
  return `http://${ip}:${port}/${basePath ? `${basePath}` : ""}?csr=true`;
};

export const withBase = (
  configImp: (config: CapacitorConfig, target: AkanMobileTargetConfig) => CapacitorConfig = (config) => config,
  appData?: AppScanResult,
  targetName?: string,
) => {
  const ip = getLocalIP();
  const appInfo = appData;
  if (!appInfo) throw new Error("withBase requires apps/<app>/akan.app.json metadata.");
  const target = resolveTarget(appInfo, targetName);
  const baseConfig: CapacitorConfig = {
    ...target,
    appId: target.appId,
    appName: target.appName,
    webDir: "dist",
    server:
      process.env.APP_OPERATION_MODE !== "release"
        ? {
            androidScheme: "http",
            url: localCsrUrl(ip, target),
            cleartext: true,
            allowNavigation: [ip, "localhost"],
          }
        : {
            allowNavigation: ["*"],
          },
    plugins: {
      CapacitorCookies: { enabled: true },
      ...target.plugins,
    },
    android: {
      ...target.android,
    },
    ios: {
      ...target.ios,
    },
  };
  return configImp(baseConfig, target);
};
