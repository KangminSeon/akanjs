import { beforeAll, describe, expect, it } from "bun:test";
import * as userSpec from "@libs/shared/lib/user/user.signal.spec";
import type { Account } from "akanjs/fetch";

import type * as cnst from "../cnst";

const decodeJwtPayload = <Payload>(jwt: string): Payload => {
  return JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString()) as Payload;
};

describe("User Signal", () => {
  describe("User Service", () => {
    let userAgent: userSpec.UserAgent;
    let user: cnst.User;
    beforeAll(async () => {});

    it("can create user with password", async () => {
      userAgent = await userSpec.getUserAgentWithPassword();
      user = userAgent.user;
      expect(user.status).toBe("active");
    });

    it("can refresh user jwt with refresh token rotation", async () => {
      const decodedJwt = decodeJwtPayload<Account & { exp?: number; tokenType?: string }>(userAgent.accessToken.jwt);
      expect(decodedJwt.self).toBeTruthy();
      expect(decodedJwt.exp).toBeTruthy();
      expect(decodedJwt.tokenType).toBe("access");
      expect(userAgent.accessToken.refreshToken).toBeTruthy();

      const refreshedToken = await userAgent.fetch.refreshJwt(userAgent.accessToken.refreshToken);
      expect(refreshedToken.jwt).toBeTruthy();
      expect(refreshedToken.refreshToken).toBeTruthy();
      expect(refreshedToken.refreshToken).not.toBe(userAgent.accessToken.refreshToken);

      await expect(userAgent.fetch.refreshJwt(userAgent.accessToken.refreshToken)).rejects.toThrow();
      await expect(userAgent.fetch.refreshJwt(refreshedToken.refreshToken)).rejects.toThrow();
    });
  });
});
