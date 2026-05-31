import { Avatar as AvatarUI } from "@libs/util/ui";
import type { ModelProps } from "akanjs/client";

import type * as cnst from "../cnst";

export const Card = ({ user }: ModelProps<"user", cnst.LightUser>) => {
  return <div>{user.id}</div>;
};

export const Avatar = ({ user }: ModelProps<"user", cnst.LightUser>) => {
  return (
    <div data-tip={user.nickname} className="tooltip">
      <AvatarUI src={user.image?.url} />
    </div>
  );
};
