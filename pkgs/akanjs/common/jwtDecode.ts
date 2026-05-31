function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  if (typeof atob === "function") return atob(padded);
  return Buffer.from(padded, "base64").toString("binary");
}

/** Decodes a JWT payload without validating its signature. */
export function decodeJwtPayload<T = unknown>(jwt: string): T {
  const [, payload] = jwt.split(".");
  if (!payload) throw new Error("Invalid JWT payload");
  const binary = decodeBase64Url(payload);
  const json = decodeURIComponent(
    [...binary].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""),
  );
  return JSON.parse(json) as T;
}
