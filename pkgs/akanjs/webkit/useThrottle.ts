"use client";
import { useCallback, useRef } from "react";

/** Returns a callback that executes immediately, then ignores calls until delay passes. */
export const useThrottle = <Args extends unknown[], Return>(
  func: (...args: Args) => Return,
  delay = 200,
  deps: unknown[] = [],
) => {
  const throttleSeed = useRef<NodeJS.Timeout | null>(null);
  const throttleFunction = useCallback(
    (...args: Args) => {
      if (throttleSeed.current) return;
      func(...args);
      throttleSeed.current = setTimeout(() => {
        throttleSeed.current = null;
      }, delay);
    },
    [func, delay, ...deps],
  );
  return throttleFunction;
};
