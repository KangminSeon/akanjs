type Indexable = Record<string | number, unknown>;

const isIndexable = (value: unknown): value is Indexable => Object(value) === value;

export const pathGet = (
  path: string | (string | number)[],
  obj: unknown,
  separator = ".",
  fallback: unknown = null,
): unknown => {
  const properties = Array.isArray(path) ? path : path.split(separator);
  return properties.reduce((prev, curr) => (isIndexable(prev) ? (prev[curr] ?? fallback) : fallback), obj);
};
