import { mkdir } from "node:fs/promises";
import path from "node:path";
import type {
  ReactFont,
  ReactFontDeclaration,
  ReactFontFace,
  ReactFontPath,
  ReactFontStyle,
  ReactFontSubset,
} from "akanjs/client";
import {
  type FontCategory,
  generateFontFace,
  getMetricsForFamily,
  readMetrics,
  resolveCategoryFallbacks,
} from "fontaine";
import { createFont, woff2 } from "fonteditor-core";
import subsetFont from "subset-font";
import ts from "typescript";
import type { App } from "../commandDecorators";

const FONT_URL_PREFIX = "/_akan/fonts";
const DEFAULT_FONT_SUBSETS: ReactFontSubset[] = ["latin"];

export interface OptimizeAppFontsResult {
  css: string;
  fonts: ReactFont[];
  files: string[];
}

export type FontOptimizerCommand = "build" | "start";

export class FontOptimizer {
  #app: App;
  #command: FontOptimizerCommand;
  #artifactRoot: string;
  #files: string[] = [];
  #cssParts: string[] = [];
  #woff2Ready: Promise<void> | null = null;

  static #ksX1001Text: string | null = null;

  constructor(app: App, command: FontOptimizerCommand = "start") {
    this.#app = app;
    this.#command = command;
    this.#artifactRoot = path.join(command === "build" ? app.dist.cwdPath : app.cwdPath, ".akan/artifact");
  }

  async optimize(): Promise<OptimizeAppFontsResult> {
    const fonts = await this.discoverFonts();
    for (const font of fonts) {
      if (!this.#isFontOptimizationEnabled(font)) continue;
      await this.#optimizeFont(font);
    }
    const fontUtilityCss = this.#buildFontUtilityRules(fonts);
    if (fontUtilityCss) this.#cssParts.push(fontUtilityCss);
    return { css: this.#cssParts.join("\n"), fonts, files: this.#files };
  }

  async discoverFonts(): Promise<ReactFont[]> {
    const pageKeys = await this.#app.getPageKeys();
    const fonts: ReactFont[] = [];
    await Promise.all(
      pageKeys.map(async (key) => {
        const filePath = path.resolve(this.#app.cwdPath, "page", key);
        const file = Bun.file(filePath);
        if (!(await file.exists())) return;
        fonts.push(...this.#extractFontsExport(await file.text(), filePath));
      }),
    );
    return this.#dedupeFonts(fonts);
  }

  async #optimizeFont(font: ReactFont) {
    const faceCss: string[] = [];
    for (const face of this.#getFontFaces(font)) {
      const sourcePath = await this.#resolveFontSourcePath(face.src);
      if (!sourcePath) {
        this.#app.logger.warn(`[font] source not found: ${face.src}`);
        continue;
      }

      const outputPath = path.join(this.#artifactRoot, face.optimizedSrc.replace(/^\/_akan\//, ""));
      await mkdir(path.dirname(outputPath), { recursive: true });

      const sourceBuffer = Buffer.from(await Bun.file(sourcePath).arrayBuffer());
      const outputBuffer =
        font.subset === false
          ? await this.#convertToWoff2(sourceBuffer, sourcePath)
          : await subsetFont(sourceBuffer, await this.#getSubsetText(font), { targetFormat: "woff2" });
      await Bun.write(outputPath, outputBuffer);
      this.#files.push(outputPath);

      faceCss.push(this.#buildOptimizedFontFaceRule(font, face));
      const fallbackCss = await this.#buildFontaineFallbackCss(font, face, outputPath);
      if (fallbackCss) faceCss.push(fallbackCss);
    }

    if (faceCss.length > 0) this.#cssParts.push(...faceCss, this.#buildRootVariableRule(font));
  }

  #extractFontsExport(source: string, filePath: string): ReactFont[] {
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const fonts: ReactFont[] = [];
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue;
      const modifiers = ts.canHaveModifiers(statement) ? ts.getModifiers(statement) : undefined;
      const isExported = modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      if (!isExported) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || declaration.name.text !== "fonts") continue;
        const value = declaration.initializer ? this.#literalToValue(declaration.initializer) : null;
        if (Array.isArray(value)) {
          fonts.push(...(value as ReactFont[]).map((font) => this.#withFontDefaults(font)));
        }
      }
    }
    return fonts;
  }

  #literalToValue(node: ts.Node): unknown {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(node)) return node.elements.map((element) => this.#literalToValue(element));
    if (ts.isObjectLiteralExpression(node)) {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const name = this.#getPropertyName(prop.name);
        if (!name) continue;
        obj[name] = this.#literalToValue(prop.initializer);
      }
      return obj;
    }
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
      return this.#literalToValue(node.expression);
    }
    return undefined;
  }

  #getPropertyName(name: ts.PropertyName): string | null {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
    return null;
  }

  #dedupeFonts(fonts: ReactFont[]) {
    const map = new Map<string, ReactFont>();
    for (const font of fonts) map.set(JSON.stringify(font), font);
    return [...map.values()];
  }

  #withFontDefaults(font: ReactFont): ReactFont {
    return { ...font, subsets: font.subsets ?? [...DEFAULT_FONT_SUBSETS] };
  }

  #getFontSubsets(font: ReactFont): ReactFontSubset[] {
    return font.subsets ?? DEFAULT_FONT_SUBSETS;
  }

  #getFontVariableName(font: ReactFont) {
    return font.variable ?? `--font-${font.name}`;
  }

  #getFontFallbackName(font: ReactFont) {
    return font.fallbackName ?? `${font.name} fallback`;
  }

  #isFontOptimizationEnabled(font: ReactFont) {
    return font.optimize !== false;
  }

  #getFontStyles(font: ReactFont): ReactFontStyle[] {
    return font.styles?.length ? font.styles : ["normal"];
  }

  #getFontFaces(font: ReactFont): ReactFontFace[] {
    const enabledStyles = new Set(this.#getFontStyles(font));
    return font.paths
      .map((fontPath) => {
        const style = fontPath.style ?? "normal";
        return {
          font,
          path: fontPath,
          src: fontPath.src,
          weight: fontPath.weight,
          style,
          optimizedSrc: this.#getOptimizedFontSrc(font, fontPath),
        };
      })
      .filter((face) => enabledStyles.has(face.style));
  }

  #getOptimizedFontSrc(font: ReactFont, fontPath: ReactFontPath) {
    const style = fontPath.style ?? "normal";
    const hash = this.#hashFontConfig({
      name: font.name,
      src: fontPath.src,
      weight: fontPath.weight,
      style,
      display: font.display,
      subset: font.subset,
      subsets: this.#getFontSubsets(font),
      subsetText: font.subsetText,
      subsetFiles: font.subsetFiles,
      declarations: [...(font.declarations ?? []), ...(fontPath.declarations ?? [])],
    });
    return `${FONT_URL_PREFIX}/${this.#slugFontPart(font.name)}-${this.#slugFontPart(String(fontPath.weight))}-${style}-${hash}.woff2`;
  }

  #hashFontConfig(value: unknown) {
    const input = this.#stableStringify(value);
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
  }

  #stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map((item) => this.#stableStringify(item)).join(",")}]`;
    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));
      return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${this.#stableStringify(v)}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  #slugFontPart(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "font"
    );
  }

  async #resolveFontSourcePath(src: string) {
    if (!src.startsWith("/")) return null;
    const rel = src.replace(/^\//, "");
    const candidates = [
      this.#command === "build" ? path.join(this.#app.dist.cwdPath, "public", rel) : null,
      path.join(this.#app.cwdPath, "public", rel),
      this.#resolveWorkspacePublicPath(rel),
    ].filter(Boolean) as string[];
    for (const candidate of candidates) {
      if (await Bun.file(candidate).exists()) return candidate;
    }
    return null;
  }

  async #convertToWoff2(buffer: Buffer, sourcePath: string) {
    await this.#initWoff2();
    const font = createFont(buffer, { type: this.#getFontType(sourcePath, buffer) });
    return font.write({ type: "woff2", toBuffer: true });
  }

  async #initWoff2() {
    this.#woff2Ready ??= woff2.init().then(() => undefined);
    return this.#woff2Ready;
  }

  #getFontType(sourcePath: string, buffer: Buffer) {
    const signature = buffer.toString("ascii", 0, 4);
    if (signature === "wOFF") return "woff";
    if (signature === "wOF2") return "woff2";
    if (signature === "OTTO") return "otf";
    const ext = path.extname(sourcePath).slice(1).toLowerCase();
    if (ext === "otf" || ext === "woff" || ext === "woff2") return ext;
    return "ttf";
  }

  #resolveWorkspacePublicPath(rel: string) {
    const [root, dep, ...rest] = rel.split("/");
    if (root !== "libs" || !dep || rest.length === 0) return null;
    return path.join(this.#app.workspace.workspaceRoot, "libs", dep, "public", ...rest);
  }

  async #getSubsetText(font: ReactFont) {
    const parts = new Set<string>();
    const subsets = this.#getFontSubsets(font);
    for (const subset of subsets) parts.add(await this.#getSubsetPresetText(subset));
    if (font.subsetText) parts.add(font.subsetText);
    for (const filePath of font.subsetFiles ?? []) {
      const abs = path.isAbsolute(filePath) ? filePath : path.join(this.#app.cwdPath, filePath);
      const file = Bun.file(abs);
      if (await file.exists()) parts.add(await file.text());
    }
    return [...parts].join("");
  }

  async #getSubsetPresetText(subset: ReactFontSubset) {
    if (subset === "latin") return this.#rangeText(0x20, 0x7e);
    if (subset === "latin-ext") return `${this.#rangeText(0x20, 0x7e)}${this.#rangeText(0xa0, 0x024f)}`;
    if (subset === "ks-x-1001") return FontOptimizer.#getKsX1001Text();
    if (subset === "auto") return this.#collectAutoSubsetText();
    return "";
  }

  async #collectAutoSubsetText() {
    const roots = ["page", "ui"].map((dir) => path.join(this.#app.cwdPath, dir));
    const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,html,md}");
    const parts: string[] = [];
    await Promise.all(
      roots.map(async (root) => {
        if (!(await Bun.file(root).exists())) return;
        for await (const filePath of glob.scan({ cwd: root, absolute: true })) {
          parts.push(await Bun.file(filePath).text());
        }
      }),
    );
    return parts.join("");
  }

  #rangeText(start: number, end: number) {
    let text = "";
    for (let code = start; code <= end; code++) text += String.fromCodePoint(code);
    return text;
  }

  static #getKsX1001Text() {
    if (FontOptimizer.#ksX1001Text) return FontOptimizer.#ksX1001Text;
    try {
      const decoder = new TextDecoder("euc-kr");
      const chars = new Set<string>();
      for (let lead = 0xa1; lead <= 0xfe; lead++) {
        for (let trail = 0xa1; trail <= 0xfe; trail++) {
          const char = decoder.decode(Uint8Array.of(lead, trail));
          if (char && char !== "\uFFFD") chars.add(char);
        }
      }
      FontOptimizer.#ksX1001Text = [...chars].join("");
    } catch {
      FontOptimizer.#ksX1001Text = FontOptimizer.#rangeTextStatic(0xac00, 0xd7a3);
    }
    return FontOptimizer.#ksX1001Text;
  }

  static #rangeTextStatic(start: number, end: number) {
    let text = "";
    for (let code = start; code <= end; code++) text += String.fromCodePoint(code);
    return text;
  }

  #buildOptimizedFontFaceRule(font: ReactFont, face: ReactFontFace) {
    const declarations = [
      ["font-family", this.#quote(font.name)],
      ["src", `url(${this.#quote(face.optimizedSrc)}) format("woff2")`],
      ["font-weight", String(face.weight)],
      ["font-style", face.style],
      ["font-display", font.display ?? "swap"],
      ...this.#toDeclarationEntries(font.declarations),
      ...this.#toDeclarationEntries(face.path.declarations),
    ];
    return `@font-face {\n${declarations.map(([prop, value]) => `  ${prop}: ${value};`).join("\n")}\n}`;
  }

  async #buildFontaineFallbackCss(font: ReactFont, face: ReactFontFace, outputPath: string) {
    if (font.adjustFontFallback === false) return "";
    const metrics = await readMetrics(outputPath).catch(() => null);
    if (!metrics) return "";
    const fallbacks = resolveCategoryFallbacks({
      fontFamily: font.name,
      fallbacks: font.fallbacks ?? {},
      metrics: { ...metrics, category: font.category },
    });
    const css: string[] = [];
    for (let i = fallbacks.length - 1; i >= 0; i--) {
      const fallback = fallbacks[i];
      const fallbackMetrics = await getMetricsForFamily(fallback);
      if (!fallbackMetrics) continue;
      css.push(
        generateFontFace(
          { ...metrics, category: font.category as FontCategory | undefined },
          {
            name: this.#getFontFallbackName(font),
            font: fallback,
            metrics: fallbackMetrics,
            "font-weight": String(face.weight),
            "font-style": face.style,
          },
        ),
      );
    }
    return css.join("");
  }

  #buildRootVariableRule(font: ReactFont) {
    return `:root { ${this.#getFontVariableName(font)}: ${this.#quote(font.name)}, ${this.#quote(
      this.#getFontFallbackName(font),
    )}; }`;
  }

  #buildFontUtilityRules(fonts: ReactFont[]) {
    const rules: string[] = [];
    const seen = new Set<string>();
    for (const font of fonts) {
      const className = font.className || `font-${font.name}`;
      const selector = `.${this.#escapeCssClassName(className)}`;
      const rule = `${selector} { font-family: var(${this.#getFontVariableName(font)}); }`;
      if (seen.has(rule)) continue;
      seen.add(rule);
      rules.push(rule);
    }
    return rules.join("\n");
  }

  #escapeCssClassName(value: string) {
    return value.replace(/^-?\d|[^a-zA-Z0-9_-]/g, (part) =>
      [...part].map((char) => `\\${char.codePointAt(0)?.toString(16)} `).join(""),
    );
  }

  #toDeclarationEntries(declarations: ReactFontDeclaration[] = []) {
    return declarations.map((declaration) => [declaration.prop, declaration.value] as const);
  }

  #quote(value: string) {
    return JSON.stringify(value);
  }
}
