"use client";
import { clsx, isMobileDevice } from "akanjs/client";
import { lazy } from "akanjs/webkit";
import { Pagination } from "./Pagination";

const InfiniteScroll = lazy(() => import("./InfiniteScroll").then((mod) => mod.InfiniteScroll), { ssr: false });

interface MoreProps {
  total: number;
  itemsPerPage: number;
  currentPage: number;
  onAddPage: (page: number) => Promise<void>;
  onPageSelect: (page: number) => void;
  children?: React.ReactNode;
  className?: string;
  reverse?: boolean;
}

export const More = ({
  total,
  itemsPerPage,
  currentPage,
  onAddPage,
  onPageSelect,
  children,
  className,
  reverse,
}: MoreProps) => {
  if (total <= itemsPerPage) {
    return <>{children}</>;
  }

  if (isMobileDevice()) {
    return (
      <InfiniteScroll
        total={total}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        onAddPage={onAddPage}
        onPageSelect={onPageSelect}
        reverse={reverse}
      >
        {children}
      </InfiniteScroll>
    );
  }
  return (
    <>
      {children}
      <div className={clsx("mt-4 flex w-full flex-wrap justify-center", className)}>
        <Pagination currentPage={currentPage} total={total} itemsPerPage={itemsPerPage} onPageSelect={onPageSelect} />
      </div>
    </>
  );
};
