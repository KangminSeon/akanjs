import {
  AiSession,
  type App,
  FileSys,
  getRelatedCnsts,
  type Module,
  ModuleExecutor,
  type Sys,
  script,
  type Workspace,
} from "@akanjs/devkit";
import { input } from "@inquirer/prompts";
import { capitalize, randomPicks } from "akanjs/common";

import { PageScript } from "../page/page.script";
import { pluralizeName } from "../pluralizeName";
import * as request from "./module.request";
import { ModuleRequest } from "./module.request";
import { ModuleRunner } from "./module.runner";

export class ModuleScript extends script("module", [ModuleRunner, PageScript]) {
  async createModuleTemplate(sys: Sys, name: string, { page = false }: { page?: boolean } = {}) {
    const mod = ModuleExecutor.from(sys, name);
    await this.moduleRunner.createModuleTemplate(mod);
    if (page && sys.type === "app")
      await this.pageScript.createCrudPage(mod, { app: sys as App, basePath: null, single: false });
    await sys.scan();
  }
  async createModule(
    sys: Sys,
    name: string,
    {
      page = false,
      description,
      schemaDescription,
    }: { page?: boolean; description?: string; schemaDescription?: string } = {},
  ) {
    const isContinued = await sys.exists(`lib/${name}/${name}.constant.ts`);
    const session = new AiSession("createModule", { workspace: sys.workspace, cacheKey: name, isContinued });
    const moduleConstantExampleFiles = await sys.workspace.getConstantFiles();
    const executor = ModuleExecutor.from(sys, name);
    const { constant, dictionary } = await this.moduleRunner.createModuleTemplate(executor);
    if (page && sys.type === "app")
      await this.pageScript.createCrudPage(executor, { app: sys as App, basePath: null, single: false });

    const modelDesc = description ?? (await input({ message: "description of module" }));
    const modelSchemaDesign = schemaDescription ?? (await input({ message: "schema description of module" }));
    const config = await sys.getConfig();
    const moduleRequest = new ModuleRequest({ sysType: sys.type, sysName: sys.name, modelName: name, config });
    const constantRequestPrompt = await moduleRequest.requestModelConstant({
      modelDesc,
      modelSchemaDesign,
      boilerplate: constant.content,
      exampleFiles: randomPicks(moduleConstantExampleFiles, Math.min(10, moduleConstantExampleFiles.length)),
    });

    const constantGuide = await ModuleRequest.getGuideJson("modelConstant");
    const constantWrites = await session.writeTypescripts(constantRequestPrompt, sys, {
      validate: constantGuide.update.rules,
    });
    for (const scalarName of this.#getCreatedScalarNames(constantWrites.map(({ filePath }) => filePath))) {
      await sys.applyTemplate({
        basePath: "./lib/__scalar",
        template: "__scalar",
        dict: { model: scalarName, models: pluralizeName(scalarName), sysName: sys.name },
        overwrite: false,
      });
    }

    const constantContent = await sys.readFile(`lib/${name}/${name}.constant.ts`);
    const dictionaryGuide = await ModuleRequest.getGuideJson("modelDictionary");
    await session.writeTypescripts(
      request.requestDictionary({
        sysName: sys.name,
        modelName: name,
        constant: constantContent,
        modelDesc,
        modelSchemaDesign,
        boilerplate: dictionary.content,
        exampleFiles: randomPicks(moduleConstantExampleFiles, Math.min(10, moduleConstantExampleFiles.length)),
      }),
      sys,
      { validate: dictionaryGuide.update.rules },
    );

    await sys.scan();
    sys.log(`Module ${name} created in ${sys.type}s/${sys.name}/lib/${name}`);
  }
  #getCreatedScalarNames(filePaths: string[]) {
    return [
      ...new Set(
        filePaths
          .map((filePath) => /^lib\/__scalar\/([^/]+)\/[^/]+\.constant\.ts$/.exec(filePath)?.[1])
          .filter((scalarName) => !!scalarName),
      ),
    ] as string[];
  }
  async removeModule(mod: Module) {
    await this.moduleRunner.removeModule(mod);
  }
  async createService(sys: Sys, name: string) {
    const service = ModuleExecutor.from(sys, `_${name}`);
    await this.moduleRunner.createService(service);
    await sys.scan();
  }
  async createTest(workspace: Workspace, name: string) {
    //
  }
  async createTemplate(mod: Module) {
    const { component: template } = await this.moduleRunner.createComponentTemplate(mod, "template");
    const templateExampleFiles = (await mod.sys.getTemplatesSourceCode()).filter(
      (f) => !f.filePath.includes(`${mod.name}.Template.tsx`),
    );
    const Name = capitalize(mod.name);
    const relatedCnsts = getRelatedCnsts(`${mod.sys.cwdPath}/lib/${mod.name}/${mod.name}.constant.ts`);
    const constant = await FileSys.readText(`${mod.sys.cwdPath}/lib/${mod.name}/${mod.name}.constant.ts`);
    const session = new AiSession("createTemplate", { workspace: mod.sys.workspace, cacheKey: mod.name });
    const promptRst = request.requestTemplate({
      sysName: mod.sys.name,
      modelName: mod.name,
      ModelName: Name,
      constant: constant,
      boilerplate: template.content,
      properties: relatedCnsts.map((r) => ({ key: r.key, source: r.source })),
      exampleFiles: randomPicks(templateExampleFiles, Math.min(20, templateExampleFiles.length)),
    });
    const content = await session.editTypescript(promptRst);

    //! 파일을 {name}.View.tsx에 저장.

    mod.writeFile(`${Name}.Template.tsx`, content);
  }

  async createUnit(mod: Module) {
    const { component: unit } = await this.moduleRunner.createComponentTemplate(mod, "unit");
    const Name = capitalize(mod.name);
    const unitExampleFiles = (await mod.sys.getUnitsSourceCode()).filter(
      (f) => !f.filePath.includes(`${mod.name}.Unit.tsx`),
    );
    const relatedCnsts = getRelatedCnsts(`${mod.sys.cwdPath}/lib/${mod.name}/${mod.name}.constant.ts`);
    const constant = await FileSys.readText(`${mod.sys.cwdPath}/lib/${mod.name}/${mod.name}.constant.ts`);
    const session = new AiSession("createUnit", { workspace: mod.sys.workspace, cacheKey: mod.name });

    const promptRst = request.requestUnit({
      sysName: mod.sys.name,
      modelName: mod.name,
      ModelName: Name,
      constant: constant,
      properties: relatedCnsts.map((r) => ({ key: r.key, source: r.source })),
      exampleFiles: randomPicks(unitExampleFiles, Math.min(10, unitExampleFiles.length)),
      boilerplate: unit.content,
    });

    const content = await session.editTypescript(promptRst);

    //! 파일을 {name}.Unit.tsx에 저장.

    mod.writeFile(`${Name}.Unit.tsx`, content);
  }

  async createView(mod: Module) {
    const { component: view } = await this.moduleRunner.createComponentTemplate(mod, "view");
    const viewExampleFiles = (await mod.sys.getViewsSourceCode()).filter(
      (f) => !f.filePath.includes(`${mod.name}.View.tsx`),
    );
    const Name = capitalize(mod.name);
    const relatedCnsts = getRelatedCnsts(`${mod.sys.cwdPath}/lib/${mod.name}/${mod.name}.constant.ts`);
    const constant = await FileSys.readText(`${mod.sys.cwdPath}/lib/${mod.name}/${mod.name}.constant.ts`);
    const session = new AiSession("createView", { workspace: mod.sys.workspace, cacheKey: mod.name });
    const promptRst = request.requestView({
      sysName: mod.sys.name,
      modelName: mod.name,
      ModelName: Name,
      constant: constant,
      boilerplate: view.content,
      properties: relatedCnsts.map((r) => ({ key: r.key, source: r.source })),
      exampleFiles: randomPicks(viewExampleFiles, Math.min(20, viewExampleFiles.length)),
    });

    const content = await session.editTypescript(promptRst);

    //! 파일을 {name}.View.tsx에 저장.

    mod.writeFile(`${Name}.View.tsx`, content);
  }
}
// the metric of how well the person lives now.
// happiness, wealth, health, mentalHealth, and whatever you want to add to be helpful
// remove socialConnections and add personalVision
