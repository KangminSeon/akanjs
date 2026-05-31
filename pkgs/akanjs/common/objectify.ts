export const objectify = <T extends object>(obj: T, keys = Object.keys(obj) as (keyof T)[]): Partial<T> => {
  const val: Partial<T> = {};
  keys.forEach((key) => {
    if (typeof obj[key] !== "function") val[key] = obj[key];
  });
  return val;
};
