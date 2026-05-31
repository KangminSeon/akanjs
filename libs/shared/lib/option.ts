import { generateHost } from "@libs/util/srvkit";
import { AkanOption } from "akanjs/server";
import { AccountMiddleware, initSsoProviders } from "../srvkit";
import type { LibOptions } from "./srv";

export interface AccountInfo {
  accountId: string;
  password: string;
}

export type ModulesOptions = LibOptions & {
  rootAdminInfo?: AccountInfo;
};

export const option = new AkanOption<ModulesOptions>()
  .use((options) => {
    initSsoProviders(generateHost(options), options.security?.sso ?? {});
    return {
      rootAdminInfo: options.rootAdminInfo ?? { accountId: "admin@mydomain.com", password: "admin1234" },
    };
  })
  .applyMiddleware(AccountMiddleware);
