"use client";
import type { ReactFont } from "akanjs/client";
import { useEffect } from "react";
import { FontCss } from "./fontCss";

interface FontFaceProps {
  font: ReactFont;
}

export const FontFace = ({ font }: FontFaceProps) => {
  useEffect(() => {
    const fontText = FontCss.getRuntimeCss([font]);
    if (!fontText) return;
    const styleId = FontCss.getStyleId([font]);
    if (document.querySelector(`style[data-akan-fonts="${styleId}"]`)) return;

    const style = document.createElement("style");
    style.dataset.akanFonts = styleId;
    style.appendChild(document.createTextNode(fontText));
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [font]);
  return null;
};
