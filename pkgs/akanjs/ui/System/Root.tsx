"use client";
import type { ReactNode } from "react";

// TODO: may be deprecated?
export interface RootProps {
  children: ReactNode;
  st: unknown;
}
export const Root = ({ children, st }: RootProps) => {
  return <>{children}</>;
};
