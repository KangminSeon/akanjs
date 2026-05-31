"use client";
import { cnst, st } from "@libs/shared/client";
import { useFetch } from "akanjs/webkit";
import { useEffect } from "react";

interface BridgeProps {
  mePromise?: Promise<{ id: string } | null>;
  selfPromise?: Promise<{ id: string } | null>;
}

export const Bridge = ({ mePromise, selfPromise }: BridgeProps) => {
  const { fulfilled: meFullfilled, value: me } = useFetch(mePromise);
  const { fulfilled: selfFullfilled, value: self } = useFetch(selfPromise);
  useEffect(() => {
    if (!meFullfilled || !selfFullfilled) return;
    st.set({
      ...(me ? { me: new cnst.Admin().set(me as cnst.Admin) } : {}),
      ...(self ? { self: new cnst.User().set(self as cnst.User) } : {}),
    });
  }, [meFullfilled, selfFullfilled]);
  return null;
};
