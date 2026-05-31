"use client";
import { lazy } from "akanjs/webkit";

export const Globe = lazy(() => import("./Globe_Dynamic"), { ssr: false });
