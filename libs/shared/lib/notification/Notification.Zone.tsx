"use client";
// import { FirebaseMessagingOptions, useFirebaseMessaging } from "@libs/shared/client";
import { st } from "@libs/shared/client";
import { type FirebaseMessagingOptions, useFirebaseMessaging } from "@libs/shared/webkit";
import { getCookie } from "akanjs/client";
import { useEffect } from "react";

interface InitializeProps {
  options: FirebaseMessagingOptions;
  serverHttpUri: string;
}

export const Initialize = ({ options, serverHttpUri }: InitializeProps) => {
  const jwt = getCookie("jwt");
  const self = st.use.self();

  const { getToken, initialized } = useFirebaseMessaging({
    options,
    serverHttpUri,
  });
  useEffect(() => {
    // if (!initialized) return;
    const initialize = async () => {
      const token = await getToken();
      if (!token) return;
      await st.do.subscribeDefaultNotification(token);
    };
    void initialize();
  }, [initialized]);

  return <></>;
};
