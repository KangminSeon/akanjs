import { createHash, randomBytes } from "node:crypto";

export const createOpaqueToken = (byteLength = 48) => randomBytes(byteLength).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
