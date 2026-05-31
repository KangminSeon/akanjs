type Cls<T = unknown> = new (...args: never[]) => T;
export const getAllPropertyDescriptors = (objRef: Cls): { [key: string]: PropertyDescriptor } => {
  const descriptors: Record<string, PropertyDescriptor> = {};
  let current = objRef.prototype as object | null;
  while (current) {
    Object.getOwnPropertyNames(current).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(current, name);
      if (descriptor) descriptors[name] ??= descriptor;
    });
    current = Object.getPrototypeOf(current) as Cls | object;
  }
  return descriptors;
};
