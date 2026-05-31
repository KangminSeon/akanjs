import dayjs from "dayjs";

import { isDayjs } from "./isDayjs";

export const isQueryEqual = (value1: unknown, value2: unknown) => {
  if (value1 === value2) return true;
  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) return false;
    for (let i = 0; i < value1.length; i++) if (!isQueryEqual(value1[i], value2[i])) return false;
    return true;
  }
  if ([value1, value2].some((val) => val instanceof Date || isDayjs(val)))
    return dayjs(value1 as Date).isSame(dayjs(value2 as Date));
  if (typeof value1 === "object" && typeof value2 === "object") {
    if (value1 === null || value2 === null) return value1 === value2;
    if (Object.keys(value1).length !== Object.keys(value2).length) return false;
    const v1 = value1 as Record<string, unknown>;
    const v2 = value2 as Record<string, unknown>;
    for (const key of Object.keys(value1)) if (!isQueryEqual(v1[key], v2[key])) return false;
    return true;
  }
  return false;
};
