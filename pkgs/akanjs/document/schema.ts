import { dayjs } from "akanjs/base";
import { isValidDate } from "akanjs/common";
import { DocumentSchema } from "./documentSchema";

export const getDefaultSchemaOptions = <TSchema, TDocument>() => new DocumentSchema<TDocument>();

const convertOperatorValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((v) => convertOperatorValue(v));
  else if (!value) return value;
  else if (isValidDate(value as Date)) return dayjs(value as Date).valueOf();
  else if (typeof value !== "object") return value;
  else if (value.constructor !== Object) return value;
  else
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, value]) => [key, convertOperatorValue(value)]),
    );
};
export const convertAggregateMatch = (query: unknown) => {
  return Object.fromEntries(
    Object.entries(query as Record<string, unknown>).map(([key, value]) => {
      return [key, convertOperatorValue(value)];
    }),
  );
};
