import { describe, expect, test } from "bun:test";

import {
  DEFAULT_AKAN_I18N,
  getAkanHmrPhase,
  getBasePathFromPathname,
  isAkanHmrApplying,
  parseAkanI18nEnv,
  parseBasePaths,
  randomPick,
  randomPicks,
  resolveAkanI18nConfig,
} from ".";

describe("runtime config helpers", () => {
  test("normalizes i18n config and validates default locale membership", () => {
    expect(DEFAULT_AKAN_I18N).toEqual({ defaultLocale: "en", locales: ["en", "ko"] });
    expect(resolveAkanI18nConfig({ defaultLocale: "ko", locales: [" en ", "ko", "ko"] })).toEqual({
      defaultLocale: "ko",
      locales: ["en", "ko"],
    });
    expect(() => resolveAkanI18nConfig({ defaultLocale: "ja", locales: ["en", "ko"] })).toThrow(
      '[i18n] defaultLocale "ja" must be included in locales: en,ko',
    );
    expect(() => resolveAkanI18nConfig({ locales: [" "] })).toThrow("[i18n] locales must include at least one locale");
  });

  test("parses i18n environment values", () => {
    expect(
      parseAkanI18nEnv({
        AKAN_PUBLIC_DEFAULT_LOCALE: "ko",
        AKAN_PUBLIC_LOCALES: "en,ko,ja",
      }),
    ).toEqual({ defaultLocale: "ko", locales: ["en", "ko", "ja"] });
  });

  test("parses and detects configured base paths", () => {
    expect(parseBasePaths("akanjs, soft,akanjs,,")).toEqual(["akanjs", "soft"]);
    expect(parseBasePaths(new Set(["akan", "akan", "admin"]))).toEqual(["akan", "admin"]);

    const options = {
      basePaths: ["akanjs", "soft"],
      i18n: { defaultLocale: "en", locales: ["en", "ko"] },
    };

    expect(getBasePathFromPathname("/ko/akanjs/home", options)).toBe("akanjs");
    expect(getBasePathFromPathname("/soft/home", options)).toBe("soft");
    expect(getBasePathFromPathname("/ko/unknown/home", options)).toBeNull();
    expect(getBasePathFromPathname("/unknown/home", { ...options, headerBasePath: "akanjs" })).toBe("akanjs");
    expect(getBasePathFromPathname("/unknown/home", { ...options, headerBasePath: "unknown" })).toBeNull();
  });

  test("reads Akan HMR phase from globalThis", () => {
    const previousPhase = globalThis.__AKAN_HMR_PHASE__;

    try {
      globalThis.__AKAN_HMR_PHASE__ = undefined;
      expect(getAkanHmrPhase()).toBeNull();
      expect(isAkanHmrApplying()).toBe(false);

      globalThis.__AKAN_HMR_PHASE__ = "refresh-import";
      expect(getAkanHmrPhase()).toBe("refresh-import");
      expect(isAkanHmrApplying()).toBe(true);

      globalThis.__AKAN_HMR_PHASE__ = "react-refresh";
      expect(getAkanHmrPhase()).toBe("react-refresh");
    } finally {
      globalThis.__AKAN_HMR_PHASE__ = previousPhase;
    }
  });

  test("random helpers pick values from the input collection", () => {
    const previousRandom = Math.random;
    Math.random = () => 0.5;

    try {
      expect(randomPick(["a", "b", "c"])).toBe("b");
      expect(randomPicks(["a", "b", "c"], 2, true)).toEqual(["b", "b"]);
      expect(randomPicks(["a", "b"], 3, false)).toEqual(["a", "b"]);
    } finally {
      Math.random = previousRandom;
    }
  });
});
