"use client";
import { Loading } from "akanjs/ui";
import { lazy } from "akanjs/webkit";

export type { ChartData, ChartType } from "chart.js";
export const Bar = lazy(() => import("./Bar"), { ssr: false, loading: () => <Loading.Skeleton /> });
export const Line = lazy(() => import("./Line"), { ssr: false, loading: () => <Loading.Skeleton /> });
export const Doughnut = lazy(() => import("./Doughnut"), { ssr: false, loading: () => <Loading.Skeleton /> });
export const Pie = lazy(() => import("./Pie"), { ssr: false, loading: () => <Loading.Skeleton /> });
