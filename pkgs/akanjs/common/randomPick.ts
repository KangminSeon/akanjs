export const randomPick = <T = unknown>(arr: T[] | readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
