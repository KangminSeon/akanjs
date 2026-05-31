interface NpmPackageMetadata {
  "dist-tags"?: Record<string, string>;
}

const defaultNpmRegistry = "https://registry.npmjs.org";

export const getNpmRegistryUrl = (registryUrl = process.env.AKAN_NPM_REGISTRY ?? defaultNpmRegistry) =>
  registryUrl.replace(/\/+$/, "");

export async function getLatestPackageVersion(
  packageName: string,
  tag = "latest",
  registryUrl?: string,
): Promise<string> {
  const registry = getNpmRegistryUrl(registryUrl);
  const url = `${registry}/${encodeURIComponent(packageName).replace(/^%40/, "@")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${packageName} metadata from ${registry}`);
  const metadata = (await res.json()) as NpmPackageMetadata;
  const version = metadata["dist-tags"]?.[tag];
  if (!version) throw new Error(`No npm dist-tag "${tag}" found for ${packageName}`);
  return version;
}
