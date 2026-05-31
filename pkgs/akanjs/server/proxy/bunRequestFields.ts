export const copyBunRequestFields = (target: Request, source: Request): Request => {
  const sourceWithParams = source as Request & { params?: Record<string, string> };
  if (sourceWithParams.params) {
    Object.defineProperty(target, "params", {
      configurable: true,
      enumerable: true,
      value: sourceWithParams.params,
      writable: true,
    });
  }
  return target;
};
