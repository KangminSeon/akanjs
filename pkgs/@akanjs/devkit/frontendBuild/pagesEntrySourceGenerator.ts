import path from "node:path";
import type { PageEntry } from "../artifact/implicitRootLayout";

export class PagesEntrySourceGenerator {
  #pageEntries: PageEntry[];

  constructor(pageEntries: PageEntry[]) {
    this.#pageEntries = pageEntries;
  }

  static generate(pageEntries: PageEntry[]): string {
    return new PagesEntrySourceGenerator(pageEntries).generate();
  }

  generate(): string {
    const lines = this.#pageEntries.map(({ key, moduleAbsPath }) => {
      const absPath = path.resolve(moduleAbsPath);
      return `  ${JSON.stringify(key)}: () => import(${JSON.stringify(absPath)}),`;
    });
    return `export const pages = {\n${lines.join("\n")}\n};\n`;
  }

  static generateStatic(pageEntries: PageEntry[]): string {
    return new PagesEntrySourceGenerator(pageEntries).generateStatic();
  }

  generateStatic(): string {
    const imports = this.#pageEntries.map(({ moduleAbsPath }, index) => {
      const absPath = path.resolve(moduleAbsPath);
      return `import * as page${index} from ${JSON.stringify(absPath)};`;
    });
    const entries = this.#pageEntries.map(({ key }, index) => {
      return `  ${JSON.stringify(key)}: async () => page${index},`;
    });
    return `${imports.join("\n")}\nexport const pages = {\n${entries.join("\n")}\n};\n`;
  }
}
