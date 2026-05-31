import type { ModelProps } from "akanjs/client";

import type * as cnst from "../cnst";

export const Card = ({ admin, href }: ModelProps<"admin", cnst.LightAdmin>) => {
  return <div>{admin.accountId}</div>;
};
