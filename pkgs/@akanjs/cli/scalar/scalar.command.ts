import { command, Sys } from "@akanjs/devkit";
import { lowerlize } from "akanjs/common";

import { ScalarScript } from "./scalar.script";

export class ScalarCommand extends command("scalar", [ScalarScript], ({ public: target }) => ({
  createScalar: target({ desc: "Create a new scalar type (simple data model without DB)" })
    .arg("scalarName", String, { desc: "name of scalar" })
    .with(Sys)
    .option("ai", Boolean, { default: false, desc: "use ai to create scalar" })
    .exec(async function (scalarName, sys, ai) {
      const name = lowerlize(scalarName.replace(/ /g, ""));
      if (ai) await this.scalarScript.createScalarWithAi(sys, name);
      else await this.scalarScript.createScalar(sys, name);
    }),
  removeScalar: target({ desc: "Remove a scalar type from an app or library" })
    .arg("scalarName", String, { desc: "name of scalar" })
    .with(Sys)
    .exec(async function (scalarName, sys) {
      await this.scalarScript.removeScalar(sys, scalarName);
    }),
})) {}
