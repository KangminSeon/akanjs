/** Lowercases only the first character of a string. */
export const lowerlize = (str: string) => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};
