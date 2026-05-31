import { type Sys, script } from "@akanjs/devkit";

import { ScalarRunner } from "./scalar.runner";

export class ScalarScript extends script("scalar", [ScalarRunner]) {
  async createScalar(sys: Sys, scalarName: string) {
    await this.scalarRunner.applyScalarTemplate(sys, scalarName);
  }
  async createScalarWithAi(sys: Sys, scalarName: string) {
    const { session, scalarNames } = await this.scalarRunner.createScalarConstant(sys, scalarName);
    await this.scalarRunner.updateScalarDictionaries(sys, scalarNames, { session });
  }
  async removeScalar(sys: Sys, scalarName: string) {
    await sys.removeDir(`lib/__scalar/${scalarName}`);
  }
}
