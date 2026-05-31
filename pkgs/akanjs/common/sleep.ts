/** Resolves after the requested delay in milliseconds. */
export const sleep = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, ms);
  });
};
