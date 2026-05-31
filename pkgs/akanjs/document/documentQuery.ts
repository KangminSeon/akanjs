import { type Dayjs, dayjs } from "akanjs/base";

export type DocumentId = string & { readonly __brand: "DocumentId" };

const documentIdProcessRandom = crypto.getRandomValues(new Uint8Array(5));
let documentIdCounter = crypto.getRandomValues(new Uint8Array(3)).reduce((count, byte) => (count << 8) + byte, 0);

const hex = (bytes: Uint8Array) => [...bytes].reduce((acc, byte) => acc + byte.toString(16).padStart(2, "0"), "");

export const createDocumentId = (now = Date.now()): DocumentId => {
  const timestampHex = Math.floor(now / 1000)
    .toString(16)
    .padStart(8, "0");
  const processHex = hex(documentIdProcessRandom);
  documentIdCounter = (documentIdCounter + 1) & 0xffffff;
  const counterHex = documentIdCounter.toString(16).padStart(6, "0");
  return `${timestampHex}${processHex}${counterHex}` as DocumentId;
};

export const isDocumentId = (value: unknown): value is DocumentId =>
  typeof value === "string" && /^[0-9a-f]{24}$/i.test(value);

export type DocumentPrimitive = string | number | boolean | null | Dayjs | Date;
export type DocumentPath<T = any> = Extract<keyof T, string> | (string & {});

export type DocumentQueryNode =
  | { kind: "all"; queries: DocumentQuery[] }
  | { kind: "any"; queries: DocumentQuery[] }
  | { kind: "not"; query: DocumentQuery }
  | { kind: "op"; op: DocumentQueryOperator; value?: unknown }
  | { kind: "raw"; sql: string; params: unknown[] };

export type DocumentQueryOperator =
  | "eq"
  | "ne"
  | "oneOf"
  | "notOneOf"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "exists"
  | "missing"
  | "empty"
  | "has"
  | "contains";

export type DocumentQueryValue =
  | DocumentPrimitive
  | DocumentPrimitive[]
  | DocumentQueryNode
  | undefined
  | Record<string, unknown>;

export interface DocumentUpdate {
  [key: string]: unknown;
  set?: Record<string, unknown>;
  unset?: Record<string, unknown> | string[];
  addToSet?: Record<string, unknown>;
  pull?: Record<string, unknown>;
  push?: Record<string, unknown>;
  inc?: Record<string, number>;
  setOnInsert?: Record<string, unknown>;
}

export interface DocumentUpdateOptions {
  upsert?: boolean;
}

export type DocumentQuery<T = any> =
  | DocumentQueryNode
  | {
      [K in DocumentPath<T>]?: DocumentQueryValue;
    };

export interface SqlFragment {
  sql: string;
  params: unknown[];
}

const op = (op: DocumentQueryOperator, value?: unknown): DocumentQueryNode => ({ kind: "op", op, value });

export const createDocumentQueryHelper = () => ({
  all: (...queries: (DocumentQuery | null | undefined | false)[]): DocumentQueryNode => ({
    kind: "all",
    queries: queries.filter(Boolean) as DocumentQuery[],
  }),
  any: (...queries: (DocumentQuery | null | undefined | false)[]): DocumentQueryNode => ({
    kind: "any",
    queries: queries.filter(Boolean) as DocumentQuery[],
  }),
  not: (query: DocumentQuery): DocumentQueryNode => ({ kind: "not", query }),
  eq: (value: unknown) => op("eq", value),
  ne: (value: unknown) => op("ne", value),
  oneOf: (values: readonly unknown[]) => op("oneOf", [...values]),
  notOneOf: (values: readonly unknown[]) => op("notOneOf", [...values]),
  gt: (value: unknown) => op("gt", value),
  gte: (value: unknown) => op("gte", value),
  lt: (value: unknown) => op("lt", value),
  lte: (value: unknown) => op("lte", value),
  between: (from: unknown, to: unknown) => op("between", [from, to]),
  exists: (path: string) => ({ [path]: op("exists") }),
  missing: (path: string) => ({ [path]: op("missing") }),
  empty: (path: string) => ({ [path]: op("empty") }),
  has: (value: unknown) => op("has", value),
  contains: (value: unknown) => op("contains", value),
  raw: (sql: string, params: unknown[] = []): DocumentQueryNode => ({ kind: "raw", sql, params }),
  when: (condition: unknown, query: DocumentQuery): DocumentQuery => (condition ? query : {}),
});

export type DocumentQueryHelper = ReturnType<typeof createDocumentQueryHelper>;

export const documentQueryHelper = createDocumentQueryHelper();

export const encodeDocumentValue = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (dayjs.isDayjs(value)) return value.valueOf();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.map(encodeDocumentValue);
  if (typeof value === "object") return JSON.stringify(sanitizeJson(value));
  return value;
};

export const sanitizeJson = (value: unknown): unknown => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (dayjs.isDayjs(value)) return value.valueOf();
  if (value instanceof Date) return value.getTime();
  if (value instanceof Map)
    return Object.fromEntries([...value.entries()].map(([key, val]) => [key, sanitizeJson(val)]));
  if (Array.isArray(value)) return value.map(sanitizeJson).filter((item) => item !== undefined);
  if (typeof value !== "object") return value;
  const entries = Object.entries(value as Record<string, unknown>).flatMap(([key, val]) => {
    if (["__proto__", "constructor", "prototype"].includes(key)) {
      throw new Error(`Unsafe JSON key: ${key}`);
    }
    const sanitized = sanitizeJson(val);
    return sanitized === undefined ? [] : [[key, sanitized] as const];
  });
  return Object.fromEntries(entries);
};
