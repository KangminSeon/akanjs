import { command, Module, Sys } from "@akanjs/devkit";
import { lowerlize } from "akanjs/common";

import { ModuleScript } from "./module.script";

export class ModuleCommand extends command("module", [ModuleScript], ({ public: target }) => ({
  createModule: target({ desc: "Create a new domain module (constant, service, signal, store, UI)" })
    .arg("moduleName", String, { desc: "name of module" })
    .with(Sys)
    .option("page", Boolean, { desc: "create page", default: false })
    .option("ai", Boolean, { desc: "use ai to create module constant and dictionary", default: false })
    .exec(async function (moduleName, sys, page, ai) {
      const name = lowerlize(moduleName.replace(/ /g, ""));
      if (ai) await this.moduleScript.createModule(sys, name, { page });
      else await this.moduleScript.createModuleTemplate(sys, name, { page });
    }),
  removeModule: target({ desc: "Remove a module from an app or library" })
    .with(Module)
    .exec(async function (module) {
      await this.moduleScript.removeModule(module);
    }),
  createService: target({ desc: "Create a service module without database files" })
    .arg("serviceName", String, { desc: "name of service module" })
    .with(Sys)
    .exec(async function (serviceName, sys) {
      const name = lowerlize(serviceName.replace(/ /g, "").replace(/^_+/, ""));
      await this.moduleScript.createService(sys, name);
    }),
  createView: target({ desc: "Create a View component for a module (full page view)" })
    .with(Module)
    .exec(async function (module) {
      await this.moduleScript.createView(module);
    }),
  createUnit: target({ desc: "Create a Unit component for a module (list/card item)" })
    .with(Module)
    .exec(async function (module) {
      await this.moduleScript.createUnit(module);
    }),
  createTemplate: target({ desc: "Create a Template component for a module (form)" })
    .with(Module)
    .exec(async function (module) {
      await this.moduleScript.createTemplate(module);
    }),
})) {}
