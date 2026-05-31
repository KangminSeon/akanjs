import type { ModelProps } from "akanjs/client";

import type * as cnst from "../cnst";

export const Card = ({ className, notification }: ModelProps<"notification", cnst.LightNotification>) => {
  return <div>{notification.id}</div>;
};
