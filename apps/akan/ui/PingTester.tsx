"use client";
import { fetch } from "@apps/akan/client";
import { Signal } from "akanjs/ui";

interface PingTesterProps {
  className?: string;
}
export const PingTester = ({ className }: PingTesterProps) => {
  return <Signal.RestApi.Endpoints fetch={fetch} refName="base" endpoints={["ping"]} openAll />;
};
