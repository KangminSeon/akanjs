import { lazy } from "akanjs/webkit";
import type { ReactNode } from "react";
import type { ProviderProps } from "./Provider";

const Provider = lazy(() => import("./Provider"), { ssr: false });
const DragEmpty = lazy(() => import("./DragEmpty"), { ssr: false });
const DraggableUnit = lazy(() => import("./DraggableUnit"), { ssr: false });
const DroppableColumn = lazy(() => import("./DroppableColumn"), { ssr: false });

export * from "./util";

interface DndKitProps extends ProviderProps {
  children: ReactNode;
}

export const DndKit = ({ children, ...props }: DndKitProps) => {
  return <Provider {...props}>{children}</Provider>;
};

DndKit.Provider = Provider;
DndKit.DroppableColumn = DroppableColumn;
DndKit.DraggableUnit = DraggableUnit;
DndKit.DragEmpty = DragEmpty;
