import { jwtVerify as joseVerify, SignJWT } from "jose";

const encodeSecret = (secret: string) => new TextEncoder().encode(secret);

export interface JwtSignOption {
  expiresIn?: string | number;
  jwtId?: string;
  issuedAt?: boolean;
}

export const jwtSign = async (
  message: object,
  secret: string,
  { expiresIn, jwtId, issuedAt }: JwtSignOption = {},
): Promise<string> => {
  const payload = JSON.parse(JSON.stringify(message));
  let jwt = new SignJWT(payload).setProtectedHeader({ alg: "HS256" });
  if (issuedAt) jwt = jwt.setIssuedAt();
  if (expiresIn) jwt = jwt.setExpirationTime(expiresIn);
  if (jwtId) jwt = jwt.setJti(jwtId);
  return await jwt.sign(encodeSecret(secret));
};

export const jwtVerify = async (message: string, secret: string): Promise<Record<string, unknown>> => {
  const { payload } = await joseVerify(message, encodeSecret(secret));
  return payload;
};
