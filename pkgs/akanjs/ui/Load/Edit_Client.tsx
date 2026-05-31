"use client";
import { deepObjectify } from "akanjs/common";
import type { ClientEdit, ServerEdit, SliceMeta } from "akanjs/fetch";
import type { CreateOption } from "akanjs/store";
import { useFetch } from "akanjs/webkit";
import type { ReactNode } from "react";

import { Empty } from "../Empty";
import { Model } from "../Model";

interface DefaultProps {
  type?: "modal" | "form" | "empty";
  className?: string;
  modalClassName?: string;
  checkSubmit?: boolean;
  slice: SliceMeta;
  modal?: string;
  children?: ReactNode;
  onSubmit?: string;
  onCancel?: string;
  submitText?: string;
  submitClassName?: string;
  submitOption?: CreateOption<any>;
  renderSubmit?: boolean;
}

export interface EditProps<T extends string, Full extends { id: string }> extends DefaultProps {
  edit: ClientEdit<T, Full> | Partial<Full> | Promise<Partial<Full>>;
}

interface RenderProps<T extends string, Full extends { id: string }> extends DefaultProps {
  edit: ServerEdit<T, Full> | Partial<Full> | Promise<Partial<Full>>;
}

function Render<T extends string, Full extends { id: string }>({
  className,
  checkSubmit,
  modalClassName,
  type,
  edit,
  modal,
  slice,
  children,
  onSubmit,
  onCancel,
  submitText,
  submitClassName,
  submitOption,
  renderSubmit,
}: RenderProps<T, Full>) {
  const editType: "edit" | "new" =
    (edit as ServerEdit<string, Full>).refName &&
    ((edit as ServerEdit<string, Full>)[`${(edit as ServerEdit<string, Full>).refName}Obj`] as Full)
      ? "edit"
      : "new";
  const modelId =
    editType === "edit"
      ? ((edit as ServerEdit<string, Full>)[`${(edit as ServerEdit<string, Full>).refName}Obj`] as Full).id
      : undefined;
  return (
    <Model.EditModal
      type={type}
      id={modelId}
      checkSubmit={checkSubmit}
      className={className}
      modalClassName={modalClassName}
      slice={slice}
      edit={
        editType === "edit"
          ? (edit as ServerEdit<string, Full>)
          : deepObjectify(edit as Partial<Full>, { serializable: true })
      }
      modal={modal}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitText={submitText}
      submitClassName={submitClassName}
      submitOption={submitOption}
      renderSubmit={renderSubmit}
    >
      {children}
    </Model.EditModal>
  );
}

export default function Edit_Client<T extends string, Full extends { id: string }>({
  className,
  checkSubmit,
  modalClassName,
  type,
  edit,
  modal,
  slice,
  children,
  onSubmit,
  onCancel,
  submitText,
  submitClassName,
  submitOption,
  renderSubmit,
}: EditProps<T, Full>) {
  const props: EditProps<T, Full> = {
    className,
    checkSubmit,
    modalClassName,
    type,
    edit,
    modal,
    slice,
    children,
    onSubmit,
    onCancel,
    submitText,
    submitClassName,
    submitOption,
    renderSubmit,
  };
  const { fulfilled, value: promiseEdit } = useFetch(edit);
  return fulfilled ? promiseEdit ? <Render {...props} edit={promiseEdit} /> : <Empty /> : <Empty />;
}
