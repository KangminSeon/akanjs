"use client";
import { lazy } from "akanjs/webkit";

export const Slate = lazy(() => import("./Yoopta/Editor"));
export const SlateContent = lazy(() => import("./SlateContent"));
export const Yoopta = lazy(() => import("./Yoopta/Editor"));
export const YooptaContent = lazy(() => import("./SlateContent"));
