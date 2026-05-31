import { clsx } from "akanjs/client";
import { Clipboard } from "akanjs/ui";
import type { ReactNode } from "react";

interface CodeViewProps {
  className?: string;
  title?: string;
  children: ReactNode;
  copyText?: string;
  wrapperClassName?: string;
}

export const CodeView = ({ className, title, children, wrapperClassName, copyText }: CodeViewProps) => (
  <div className={clsx("flex justify-center", wrapperClassName)}>
    <div className={clsx("relative overflow-x-scroll rounded-md bg-[#2a2a2a]", className)}>
      {title ? (
        <div className="sticky inset-x-0 top-0 flex h-10 w-full items-center justify-between bg-[#3a3a3a] pr-2 pl-4 font-bold text-gray-300 text-sm">
          {title}
          {copyText ? <Clipboard text={copyText} /> : null}
        </div>
      ) : null}
      {children}
    </div>
  </div>
);
