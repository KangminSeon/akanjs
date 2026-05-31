"use client";
import { fetch, usePage } from "@libs/shared/client";
import { Model } from "akanjs/ui";
import { BiTrash } from "react-icons/bi";

interface RemoveProps {
  bannerId: string;
}
export const Remove = ({ bannerId }: RemoveProps) => {
  const { l } = usePage();
  return (
    <Model.Remove modelId={bannerId} slice={fetch.slice.banner}>
      <BiTrash /> {l("base.remove")}
    </Model.Remove>
  );
};
