// "use client";
import { clsx, usePage } from "akanjs/client";
import type { ReactNode } from "react";
import { AiOutlineBlock } from "react-icons/ai";

interface UnauthorizedProps {
  className?: string;
  description?: ReactNode;
  children?: ReactNode;
  minHeight?: number;
}

export const Unauthorized = ({ className = "", description, children, minHeight = 300 }: UnauthorizedProps) => {
  const { l } = usePage();
  return (
    <div>
      <div
        className={clsx(
          `min-h-[ w-full${minHeight}px] flex flex-col items-center justify-center gap-3 pt-6 pb-3 text-base-content/30`,
          className,
        )}
      >
        <AiOutlineBlock className="scale-150 text-4xl" />
        <p>{description ?? l("base.unauthorized")}</p>
      </div>
      {children}
    </div>
  );
};
