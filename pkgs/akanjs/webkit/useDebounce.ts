"use client";
import { useCallback } from "react";

const debounce = <Args extends unknown[], Return>(callback: (...args: Args) => Return, wait = 500) => {
  // 실행한 함수(setTimeout())를 취소
  let timer: NodeJS.Timeout;
  return (...args: Args) => {
    clearTimeout(timer);
    // delay가 지나면 callback 함수를 실행
    timer = setTimeout(() => {
      callback(...args);
    }, wait);
  };
};

/** Returns a callback that runs only after calls have stopped for the wait time. */
export const useDebounce = <Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
  states: unknown[] = [],
  wait = 100,
) => {
  const fn = useCallback(debounce(callback, wait), states);
  return fn;
};
