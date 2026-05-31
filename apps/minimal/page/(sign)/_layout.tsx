import { Globe } from "@apps/minimal/ui";
import type { LayoutProps } from "akanjs/client";
import { ClientSide } from "akanjs/ui";

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative h-screen w-full">
      <div className="absolute">
        <ClientSide>
          <Globe />
        </ClientSide>
      </div>
      {children}
    </div>
  );
}
