import type { AkanI18nConfig } from "./localeConfig";

export const parseBasePaths = (value: string | string[] | Set<string> | undefined | null): string[] => {
  const items =
    typeof value === "string"
      ? value.split(",")
      : value instanceof Set
        ? [...value]
        : Array.isArray(value)
          ? value
          : [];
  return [...new Set(items.map((basePath) => basePath.trim()).filter(Boolean))];
};

export const getBasePathFromPathname = (
  pathname: string,
  {
    basePaths,
    i18n,
    headerBasePath,
  }: {
    basePaths: Iterable<string>;
    i18n?: Pick<AkanI18nConfig, "locales" | "defaultLocale">;
    headerBasePath?: string | null;
  },
): string | null => {
  const configuredBasePaths = new Set(parseBasePaths([...basePaths]));
  if (headerBasePath && configuredBasePaths.has(headerBasePath)) return headerBasePath;

  const segments = pathname.split("/").filter(Boolean);
  const locales = new Set(i18n?.locales ?? (i18n?.defaultLocale ? [i18n.defaultLocale] : []));
  const maybeBasePath = locales.has(segments[0] ?? "") ? segments[1] : segments[0];
  return maybeBasePath && configuredBasePaths.has(maybeBasePath) ? maybeBasePath : null;
};
