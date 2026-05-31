"use client";

import { fetch } from "@libs/shared/client";
import { getCookie, setAuth } from "akanjs/client";
import { decodeJwtPayload, Logger } from "akanjs/common";
import { useEffect } from "react";

type AuthScope = "user" | "admin";

interface TokenPayload {
  exp?: number;
  self?: { id: string };
  me?: { id: string };
}

interface TokenRefreshProps {
  scope: AuthScope;
}

const refreshBeforeMs = 2 * 60 * 1000;
const retryDelayMs = 30 * 1000;

const hasScope = (payload: TokenPayload, scope: AuthScope) => {
  return scope === "user" ? !!payload.self : !!payload.me;
};

const refreshToken = async (scope: AuthScope) => {
  const accessToken = scope === "user" ? await fetch.refreshJwt(null) : await fetch.refreshAdminJwt(null);
  setAuth({ jwt: accessToken.jwt });
};

export const TokenRefresh = ({ scope }: TokenRefreshProps) => {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let refreshing = false;
    let disposed = false;

    const clearRefreshTimeout = () => {
      if (!timeout) return;
      clearTimeout(timeout);
      timeout = null;
    };

    const schedule = () => {
      clearRefreshTimeout();
      const jwt = getCookie("jwt");
      if (!jwt) return;

      let payload: TokenPayload;
      try {
        payload = decodeJwtPayload<TokenPayload>(jwt);
      } catch {
        return;
      }
      if (!hasScope(payload, scope) || !payload.exp) return;

      const delay = Math.max(payload.exp * 1000 - Date.now() - refreshBeforeMs, 0);
      timeout = setTimeout(async () => {
        if (refreshing || disposed) return;
        refreshing = true;
        try {
          await refreshToken(scope);
          schedule();
        } catch (error) {
          Logger.warn(`Failed to refresh ${scope} token: ${error instanceof Error ? error.message : String(error)}`);
          timeout = setTimeout(schedule, retryDelayMs);
        } finally {
          refreshing = false;
        }
      }, delay);
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      disposed = true;
      clearRefreshTimeout();
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [scope]);

  return null;
};
