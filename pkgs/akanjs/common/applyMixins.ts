import { getAllPropertyDescriptors } from "./getAllPropertyDescriptors";

type Cls<T = unknown> = new (...args: never[]) => T;

export const applyMixins = (derivedCtor: Cls, constructors: (Cls | undefined)[], avoidKeys?: Set<string>) => {
  constructors.forEach((baseCtor) => {
    if (!baseCtor) return;
    Object.entries(getAllPropertyDescriptors(baseCtor)).forEach(([name, descriptor]) => {
      if (name === "constructor" || avoidKeys?.has(name)) return;
      Object.defineProperty(derivedCtor.prototype, name, { ...descriptor, configurable: true });
    });
  });
  return derivedCtor;
};
