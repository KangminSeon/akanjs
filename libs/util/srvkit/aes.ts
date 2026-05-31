import { createHash } from "node:crypto";

const toArrayBufferView = (value: Uint8Array): Uint8Array<ArrayBuffer> => {
  return new Uint8Array(value);
};

const evpBytesToKey = async (
  password: string,
  salt: Uint8Array,
  keyLen: number,
  ivLen: number,
): Promise<{ key: Uint8Array; iv: Uint8Array }> => {
  const enc = new TextEncoder();
  const passBytes = enc.encode(password);
  const result: number[] = [];
  let prev = new Uint8Array(0);

  while (result.length < keyLen + ivLen) {
    const data = new Uint8Array([...prev, ...passBytes, ...salt]);
    const hash = createHash("md5").update(data).digest();
    prev = new Uint8Array(hash);
    result.push(...prev);
  }

  return {
    key: new Uint8Array(result.slice(0, keyLen)),
    iv: new Uint8Array(result.slice(keyLen, keyLen + ivLen)),
  };
};

export const aesDecrypt = async (hash: string, aesKey: string): Promise<string> => {
  // crypto-js Base64 디코딩
  const raw = Uint8Array.from(atob(hash), (c) => c.charCodeAt(0));

  // "Salted__" (8 bytes) + salt (8 bytes) + ciphertext
  const salt = raw.slice(8, 16);
  const ciphertext = raw.slice(16);

  // EVP_BytesToKey로 key(32) + iv(16) 파생
  const { key, iv } = await evpBytesToKey(aesKey, salt, 32, 16);
  const cryptoKey = await crypto.subtle.importKey("raw", toArrayBufferView(key), { name: "AES-CBC" }, false, [
    "decrypt",
  ]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: toArrayBufferView(iv) },
    cryptoKey,
    toArrayBufferView(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
};

export async function aesEncrypt(data: string, aesKey: string): Promise<string> {
  // 랜덤 salt 8 bytes 생성
  const salt = crypto.getRandomValues(new Uint8Array(8));

  const { key, iv } = await evpBytesToKey(aesKey, salt, 32, 16);

  const cryptoKey = await crypto.subtle.importKey("raw", toArrayBufferView(key), { name: "AES-CBC" }, false, [
    "encrypt",
  ]);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: toArrayBufferView(iv) },
    cryptoKey,
    toArrayBufferView(new TextEncoder().encode(data)),
  );

  // crypto-js 포맷: "Salted__" + salt(8) + ciphertext → Base64
  const salted = new Uint8Array([
    ...new TextEncoder().encode("Salted__"), // 8 bytes
    ...salt, // 8 bytes
    ...new Uint8Array(encrypted),
  ]);

  return btoa(String.fromCharCode(...salted));
}
