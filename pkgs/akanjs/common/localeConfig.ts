export interface AkanI18nConfig {
  defaultLocale: string;
  locales: string[];
}

export interface AkanI18nConfigInput {
  defaultLocale?: string;
  locales?: readonly string[];
}

export const DEFAULT_AKAN_I18N: AkanI18nConfig = Object.freeze({
  defaultLocale: "en",
  locales: Object.freeze(["en", "ko"]) as unknown as string[],
});

const normalizeLocale = (locale: string) => locale.trim();

export function resolveAkanI18nConfig(input: AkanI18nConfigInput = {}): AkanI18nConfig {
  const locales = [...new Set((input.locales ?? DEFAULT_AKAN_I18N.locales).map(normalizeLocale).filter(Boolean))];
  const defaultLocale = normalizeLocale(input.defaultLocale ?? DEFAULT_AKAN_I18N.defaultLocale);

  if (locales.length === 0) throw new Error("[i18n] locales must include at least one locale");
  if (!defaultLocale) throw new Error("[i18n] defaultLocale must not be empty");
  if (!locales.includes(defaultLocale)) {
    throw new Error(`[i18n] defaultLocale "${defaultLocale}" must be included in locales: ${locales.join(",")}`);
  }

  return { defaultLocale, locales };
}

export function parseAkanI18nEnv(
  env: Record<string, string | undefined> = {
    AKAN_PUBLIC_DEFAULT_LOCALE: typeof process !== "undefined" ? process.env.AKAN_PUBLIC_DEFAULT_LOCALE : undefined,
    AKAN_PUBLIC_LOCALES: typeof process !== "undefined" ? process.env.AKAN_PUBLIC_LOCALES : undefined,
  },
): AkanI18nConfig {
  return resolveAkanI18nConfig({
    defaultLocale: env.AKAN_PUBLIC_DEFAULT_LOCALE,
    locales: env.AKAN_PUBLIC_LOCALES?.split(","),
  });
}
