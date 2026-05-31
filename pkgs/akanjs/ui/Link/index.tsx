import { getEnv } from "akanjs/base";

import Back from "./Back";
import Close from "./Close";
import CsrLink from "./CsrLink";
import Lang from "./Lang";
import SsrLink from "./SsrLink";
import type { CommonLinkProps } from "./types";

export const Link = ({ className, href, disabled = false, children, ...props }: CommonLinkProps) => {
  if (disabled || !href)
    return (
      <div className={className} {...(props as any)}>
        {children}
      </div>
    );

  if (getEnv().renderMode === "csr")
    return (
      <CsrLink className={className} href={href} {...props}>
        {children}
      </CsrLink>
    );
  return (
    <SsrLink className={className} href={href} {...props}>
      {children}
    </SsrLink>
  );
};
Link.Back = Back;
Link.Close = Close;
Link.Lang = Lang;
