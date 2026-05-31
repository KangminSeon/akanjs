import { command, Workspace } from "@akanjs/devkit";

import { GuidelineScript } from "./guideline.script";

export class GuidelineCommand extends command("guideline", [GuidelineScript], ({ public: target }) => ({
  generateInstruction: target({ devOnly: true, desc: "Generate AI development guideline/instruction for your project" })
    .arg("name", String, { ask: "name of the instruction", nullable: true })
    .with(Workspace)
    .exec(async function (name, workspace) {
      await this.guidelineScript.generateInstruction(workspace, name);
    }),
  updateInstruction: target({ devOnly: true, desc: "Update existing AI guideline/instruction" })
    .arg("name", String, { ask: "name of the instruction", nullable: true })
    .option("request", String, { ask: "What do you want to update?" })
    .with(Workspace)
    .exec(async function (name, request, workspace) {
      await this.guidelineScript.updateInstruction(workspace, name, request);
    }),
  generateDocument: target({ devOnly: true, desc: "Generate documentation from guideline/instruction" })
    .arg("name", String, { ask: "name of the instruction", nullable: true })
    .with(Workspace)
    .exec(async function (name, workspace) {
      await this.guidelineScript.generateDocument(workspace, name);
    }),
  reapplyInstruction: target({ devOnly: true, desc: "Re-apply guideline/instruction to codebase" })
    .arg("name", String, { ask: "name of the instruction", nullable: true })
    .with(Workspace)
    .exec(async function (name, workspace) {
      await this.guidelineScript.reapplyInstruction(workspace, name);
    }),
})) {}
