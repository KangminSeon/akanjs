"use client";

import { Constant } from "akanjs/ui";

interface SampleSchemaProps {
  className?: string;
}

export const SampleSchema = ({ className }: SampleSchemaProps) => {
  return <Constant.Doc.Zone />;
};
