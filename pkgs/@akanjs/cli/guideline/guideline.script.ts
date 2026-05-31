import { type AiSession, Prompter, script, type Workspace } from "@akanjs/devkit";

import { GuidelineRunner } from "./guideline.runner";

export class GuidelineScript extends script("guideline", [GuidelineRunner]) {
  async generateInstruction(workspace: Workspace, name: string | null = null) {
    const guideName = name ?? (await Prompter.selectGuideline());
    await this.guidelineRunner.generateInstruction(workspace, guideName);
  }
  async updateInstruction(workspace: Workspace, name: string | null = null, updateRequest: string) {
    const guideName = name ?? (await Prompter.selectGuideline());
    const { guideJson, session } = await this.guidelineRunner.updateInstruction(workspace, guideName, {
      updateRequest,
    });
    if (guideJson.page) await this.updateDocument(workspace, guideName, { updateRequest, session });
  }
  async generateDocument(workspace: Workspace, name: string | null = null) {
    const guideName = name ?? (await Prompter.selectGuideline());
    await this.guidelineRunner.generateDocument(workspace, guideName);
  }
  async updateDocument(
    workspace: Workspace,
    name: string | null = null,
    { updateRequest, session }: { updateRequest: string; session: AiSession },
  ) {
    const guideName = name ?? (await Prompter.selectGuideline());
    await this.guidelineRunner.updateDocument(workspace, guideName, { updateRequest, session });
  }
  async reapplyInstruction(workspace: Workspace, name: string | null = null) {
    const guideName = name ?? (await Prompter.selectGuideline());
    await this.guidelineRunner.reapplyInstruction(workspace, guideName);
  }
}
