import { randomBytes } from "node:crypto";

export const generatePassword = (length: number = 16) => randomBytes(length).toString("base64url");
