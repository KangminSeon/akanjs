import "./styles.css";

import { Auth } from "@libs/shared/ui";
import type { Font, LayoutProps } from "akanjs/client";

export const fonts: Font[] = [
  {
    name: "pretendard",
    default: true,
    paths: [
      { src: "/libs/shared/fonts/Pretendard-Thin.woff2", weight: 100 },
      { src: "/libs/shared/fonts/Pretendard-ExtraLight.woff2", weight: 200 },
      { src: "/libs/shared/fonts/Pretendard-Light.woff2", weight: 300 },
      { src: "/libs/shared/fonts/Pretendard-Regular.woff2", weight: 400 },
      { src: "/libs/shared/fonts/Pretendard-Medium.woff2", weight: 500 },
      { src: "/libs/shared/fonts/Pretendard-SemiBold.woff2", weight: 600 },
      { src: "/libs/shared/fonts/Pretendard-Bold.woff2", weight: 700 },
      { src: "/libs/shared/fonts/Pretendard-ExtraBold.woff2", weight: 800 },
      { src: "/libs/shared/fonts/Pretendard-Black.woff2", weight: 900 },
    ],
  },
  {
    name: "lemonmilk",
    paths: [{ src: "/libs/shared/fonts/Lemon Milk Pro Medium.otf", weight: 500 }],
  },
];

export const theme = "dark";
export const head = (
  <>
    <title>Akan.js</title>
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
    <link rel="icon" type="image/png" sizes="384x384" href="/icon-384x384.png" />
    <link rel="icon" type="image/png" sizes="256x256" href="/icon-256x256.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png" />
    <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png" />
    <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png" />
    <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png" />
    <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png" />
    <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png" />
    <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png" />
    <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="msapplication-TileColor" content="#ffffff" />
    <meta name="msapplication-TileImage" content="/ms-icon-144x144.png" />
    <meta name="theme-color" content="#ffffff" />
  </>
);

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {children}
      <Auth.User />
    </>
  );
}
