import type { ReactNode } from "react";
import { Portal } from "../Portal";

export interface BottomActionProps {
  className?: string;
  children: ReactNode;
}

export const BottomAction = ({ className, children }: BottomActionProps) => {
  return (
    <Portal id="bottomActionContent">
      <div className={className}>{children}</div>
    </Portal>
  );
};
