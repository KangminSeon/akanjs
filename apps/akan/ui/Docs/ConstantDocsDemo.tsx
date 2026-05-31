"use client";

import "@apps/akan/lib/cnst";

import { Constant } from "akanjs/ui";

export const ConstantDocsDemo = () => (
  <Constant.Doc.Zone
    models={["user", "bizContract", "project"]}
    scalars={["estimate", "cashflow", "history"]}
    openAll
  />
);

export const ConstantDocsPrintDemo = () => (
  <Constant.Doc.Print models={["user", "bizContract"]} scalars={["estimate", "cashflow"]} />
);
