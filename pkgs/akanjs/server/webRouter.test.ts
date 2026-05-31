import { describe, expect, test } from "bun:test";
import { DEFAULT_AKAN_I18N } from "akanjs/common";
import { normalizeRscTargetUrlForHostBasePath } from "./webRouter";

describe("WebRouter RSC target normalization", () => {
  test("maps public host paths to the hidden basePath route for RSC navigation", () => {
    const target = new URL("https://akanjs.com/en/docs/intro/quickstart");

    const normalized = normalizeRscTargetUrlForHostBasePath(target, {
      basePath: "akanjs",
      i18n: DEFAULT_AKAN_I18N,
    });

    expect(normalized.url.href).toBe("https://akanjs.com/en/akanjs/docs/intro/quickstart");
    expect(normalized.basePath).toBe("akanjs");
  });

  test("maps debug public paths by matching configured basePath route seeds", () => {
    const target = new URL("https://akanjs-debug.akanjs.com/en/references/cli/overview");

    const normalized = normalizeRscTargetUrlForHostBasePath(target, {
      basePath: null,
      basePaths: ["office", "akanjs", "soft"],
      i18n: DEFAULT_AKAN_I18N,
      seedEntries: [
        {
          routeId: "/:lang/akanjs/references/cli/overview",
          pattern: "/:lang/akanjs/references/cli/overview",
          seeds: [],
        },
      ],
    });

    expect(normalized.url.href).toBe("https://akanjs-debug.akanjs.com/en/akanjs/references/cli/overview");
    expect(normalized.basePath).toBe("akanjs");
  });

  test("does not duplicate an already internal basePath route", () => {
    const target = new URL("https://akanjs.com/en/akanjs/docs/intro/quickstart");

    const normalized = normalizeRscTargetUrlForHostBasePath(target, {
      basePath: "akanjs",
      i18n: DEFAULT_AKAN_I18N,
    });

    expect(normalized.url.href).toBe("https://akanjs.com/en/akanjs/docs/intro/quickstart");
    expect(normalized.basePath).toBe("akanjs");
  });
});
