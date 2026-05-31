import path from "node:path";

export const getDirname = (url: string) => path.dirname(new URL(url).pathname);
