import "./styles.css";

import { Auth } from "@libs/shared/ui";
import type { Font, LayoutProps } from "akanjs/client";

export const fonts: Font[] = [
  {
    name: "nanumcode",
    default: true,
    paths: [{ src: "/fonts/D2Coding-Ver1.3.2.ttf", weight: 500 }],
  },
  {
    name: "lemonmilk",
    paths: [{ src: "/libs/shared/fonts/Lemon Milk Pro Medium.otf", weight: 500 }],
  },
];

export const head = (
  <>
    <link rel="icon" href="/favicon.ico" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="icons/icon-192x192.png" />
    <meta name="msapplication-TileColor" content="#ffffff" />
    <meta name="theme-color" content="#ffffff" />
    <link
      href="splashscreens/iphone5_splash.png"
      media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/iphone6_splash.png"
      media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/iphoneplus_splash.png"
      media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/iphonex_splash.png"
      media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/iphonexr_splash.png"
      media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/iphonexsmax_splash.png"
      media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/ipad_splash.png"
      media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/ipadpro1_splash.png"
      media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/ipadpro3_splash.png"
      media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
    <link
      href="splashscreens/ipadpro2_splash.png"
      media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)"
      rel="apple-touch-startup-image"
    />
  </>
);

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {children}
      <Auth.User />
      <Auth.Admin />
    </>
  );
}
