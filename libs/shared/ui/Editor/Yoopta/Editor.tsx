"use client";
import type { cnst } from "@libs/shared/client";
import { st } from "@libs/shared/client";
import { addFileUntilActive } from "@libs/shared/webkit";
import Accordion from "@yoopta/accordion";
import Blockquote from "@yoopta/blockquote";
import Callout from "@yoopta/callout";
import CodePlugins from "@yoopta/code";
import Divider from "@yoopta/divider";
import YooptaEditor, {
  createYooptaEditor,
  type DeleteBlockOperation,
  type RenderBlockProps,
  type SlateElement,
  type YooptaBlockData,
  type YooptaContentValue,
  type YooptaPlugin,
} from "@yoopta/editor";
import Embed from "@yoopta/embed";
import File from "@yoopta/file";
import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import Image from "@yoopta/image";
import Link from "@yoopta/link";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import { Bold, CodeMark, Highlight, Italic, Strike, Underline } from "@yoopta/marks";
import Paragraph from "@yoopta/paragraph";
import Table from "@yoopta/table";
import { applyTheme } from "@yoopta/themes-shadcn";
import { BlockDndContext, SelectionBox, SlashCommandMenu, SortableBlock } from "@yoopta/ui";
import Video from "@yoopta/video";
import type { Any } from "akanjs/base";
import { clsx } from "akanjs/client";
import type { ProtoFile } from "akanjs/constant";
import { isEqual } from "lodash";
import { useCallback, useEffect, useMemo, useRef } from "react";

const defaultPlugins = [
  Paragraph,
  Table,
  Divider,
  Accordion,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  Blockquote,
  Callout,
  NumberedList,
  BulletedList,
  TodoList,
  CodePlugins.Code,
  Link,
  Embed,
];

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

const normalizeValue = (value: unknown): YooptaContentValue | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return undefined;
  if (Array.isArray(value)) return undefined;
  if (typeof value === "object" && Object.keys(value).length) return value as YooptaContentValue;
  return undefined;
};

const createEmptyValue = (): YooptaContentValue => {
  const blockId = crypto.randomUUID();
  const elementId = crypto.randomUUID();
  return {
    [blockId]: {
      id: blockId,
      type: "Paragraph",
      meta: { order: 0, depth: 0 },
      value: [{ id: elementId, type: "paragraph", children: [{ text: "" }] }],
    },
  } as YooptaContentValue;
};

type AddFile = (file: cnst.File | cnst.File[], options?: { idx?: number; limit?: number }) => unknown;

interface YooptaProps {
  defaultReadOnly?: boolean;
  className?: string;
  addFilesGql?: (fileList: FileList, id?: string) => Promise<(cnst.File | ProtoFile)[]>;
  addFile?: AddFile;
  onChange: (value: Any) => void;
  onDelete?: (blocks: YooptaBlockData<SlateElement>[]) => void;
  value?: unknown;
  height?: string;
  placeholder?: string;
  disabled?: boolean;
  debug?: boolean;
  plugins?: YooptaPlugin<Record<string, SlateElement>>[];
}

const Yoopta = ({
  defaultReadOnly = false,
  className,
  onChange,
  onDelete,
  value,
  addFile,
  addFilesGql,
  plugins,
  height,
  placeholder,
  disabled,
}: YooptaProps) => {
  const theme = st.use.theme();
  const readOnly = defaultReadOnly || !!disabled;
  const emptyValueRef = useRef<YooptaContentValue>(createEmptyValue());
  const lastValueRef = useRef<YooptaContentValue>(normalizeValue(value) ?? emptyValueRef.current);

  const resolvedPlugins = useMemo(() => {
    const uploadPlugins = addFilesGql
      ? [
          Image.extend({
            options: {
              upload: async (fileData) => {
                const file = await addFileUntilActive(fileData, addFilesGql);
                if (addFile) await addFile(file as cnst.File);
                const [width = 0, height = 0] = file.imageSize ?? [];
                return { id: file.id, src: file.url, alt: file.filename, sizes: { width, height } };
              },
            },
          }),
          Video.extend({
            options: {
              upload: async (fileData: File) => {
                const file = await addFileUntilActive(fileData, addFilesGql);
                if (addFile) await addFile(file as cnst.File);
                const [width = 0, height = 0] = file.imageSize ?? [];
                return { id: file.id, src: file.url, sizes: { width, height } };
              },
              uploadPoster: async (fileData: File) => {
                const file = await addFileUntilActive(fileData, addFilesGql);
                if (addFile) await addFile(file as cnst.File);
                return file.url;
              },
            },
          }),
          File.extend({
            options: {
              upload: async (fileData) => {
                const file = await addFileUntilActive(fileData, addFilesGql);
                if (addFile) await addFile(file as cnst.File);
                return {
                  id: file.id,
                  src: file.url,
                  name: file.filename,
                  size: file.size,
                  format: file.filename?.split(".").pop(),
                };
              },
            },
          }),
        ]
      : [];

    return applyTheme([...(plugins ?? []), ...defaultPlugins, ...uploadPlugins] as YooptaPlugin<
      Record<string, SlateElement>
    >[]);
  }, [addFile, addFilesGql, plugins]);

  const editor = useMemo(
    () =>
      createYooptaEditor({
        plugins: resolvedPlugins,
        marks: readOnly ? [] : MARKS,
        value: lastValueRef.current,
        readOnly,
      }),
    [readOnly, resolvedPlugins],
  );

  useEffect(() => {
    const nextValue = normalizeValue(value);
    const nextEditorValue = nextValue ?? emptyValueRef.current;
    if (isEqual(lastValueRef.current, nextEditorValue)) return;
    lastValueRef.current = nextEditorValue;
    editor.setEditorValue(nextEditorValue);
  }, [editor, value]);

  useEffect(() => {
    editor.readOnly = readOnly;
  }, [editor, readOnly]);

  const renderBlock = useCallback(
    ({ blockId, children }: RenderBlockProps) => (
      <SortableBlock id={blockId} disabled={readOnly}>
        {children}
      </SortableBlock>
    ),
    [readOnly],
  );

  const editorContent = (
    <YooptaEditor
      className={clsx(
        "[&_.yoo-embed-items-center]:text-black! [&_.yoo-image-font-medium]:text-gray-500! [&_.yoo-video-font-medium]:text-gray-500! [&_.yoopta-button]:text-black [&_.yoopta-mark-code]:text-black",
        className,
        {
          "[&_.yoopta-block-actions_button]:text-white!": theme === "dark" || theme === "system",
          "[&_.yoo-file-font-normal]:text-gray-400!": theme === "dark" || theme === "system",
        },
      )}
      editor={editor}
      placeholder={placeholder ?? "Type something"}
      style={{ width: "100%", minHeight: height ?? (readOnly ? undefined : "8rem") }}
      onChange={(nextValue, options) => {
        lastValueRef.current = nextValue;
        onChange(nextValue as unknown as Any);

        if (!onDelete) return;
        const deleteBlocks = options.operations.filter((operation) => operation.type === "delete_block");
        if (deleteBlocks.length > 0) {
          onDelete(
            deleteBlocks.map(
              (operation: DeleteBlockOperation) => operation.block as unknown as YooptaBlockData<SlateElement>,
            ),
          );
        }
      }}
      renderBlock={renderBlock}
    >
      {!readOnly ? (
        <>
          <SlashCommandMenu>
            <SlashCommandMenu.Content>
              <SlashCommandMenu.Input placeholder="Search blocks..." />
              <SlashCommandMenu.List>
                <SlashCommandMenu.Empty>No blocks found</SlashCommandMenu.Empty>
              </SlashCommandMenu.List>
            </SlashCommandMenu.Content>
          </SlashCommandMenu>
          <SelectionBox />
        </>
      ) : null}
    </YooptaEditor>
  );

  return (
    <BlockDndContext editor={editor}>
      <div>{editorContent}</div>
    </BlockDndContext>
  );
};

interface EditorProps {
  readOnly?: boolean;
  className?: string;
  value?: unknown;
  onChange: (slate: unknown) => void;
  onDelete?: (blocks: YooptaBlockData<SlateElement>[]) => void;
  addFilesGql?: (fileList: FileList, id?: string) => Promise<(cnst.File | ProtoFile)[]>;
  addFile?: AddFile;
  defaultValue?: unknown;
  height?: string;
  placeholder?: string;
  disabled?: boolean;
  debug?: boolean;
  plugins?: YooptaPlugin<Record<string, SlateElement>>[];
}

export default function Editor({
  readOnly = false,
  className,
  value,
  defaultValue,
  onChange,
  onDelete,
  addFilesGql,
  addFile,
  plugins,
  height,
  placeholder,
  disabled,
}: EditorProps) {
  return (
    <Yoopta
      value={value ?? defaultValue}
      defaultReadOnly={readOnly}
      className={className}
      addFilesGql={addFilesGql}
      addFile={addFile}
      onChange={onChange}
      onDelete={onDelete}
      plugins={plugins}
      height={height}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
