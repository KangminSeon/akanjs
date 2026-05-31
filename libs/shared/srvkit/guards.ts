import type { Me, Self } from "@libs/shared/base";
import type { Guard, SignalContext } from "akanjs/signal";
import type { SerAccount } from "./account";

export const allow = (
  context: SignalContext,
  account: SerAccount<{ self?: Self; me?: Me }> | null,
  roles: ("user" | "admin" | "superAdmin")[],
) => {
  if (!account) throw new Error("No Authentication Account");
  for (const role of roles) {
    if (role === "user" && !account.self?.removedAt && account.self?.roles.includes("user")) return true;
    else if (role === "admin" && !account.me?.removedAt && account.me?.roles.includes("admin")) return true;
    else if (role === "superAdmin" && !account.me?.removedAt && account.me?.roles.includes("superAdmin")) return true;
  }
  throw new Error(
    `[${context.key}] No Authentication With Roles: ${roles.join(", ")}, Your roles are ${[
      ...(account.self?.roles ?? []),
      ...(account.me?.roles ?? []),
    ].join(", ")}${!account.self?.roles.length && !account.me?.roles.length ? " (No Roles)" : ""}`,
  );
};

export class Every implements Guard {
  static name = "Every";
  canPass(context: SignalContext): boolean {
    const account =
      context.transport === "http"
        ? (context.getHttpContext<{ account?: SerAccount }>().req.account ?? null)
        : (context.getWebSocketContext<{ account?: SerAccount }>().ws.data.account ?? null);
    return allow(context, account, ["user", "admin", "superAdmin"]);
  }
}

export class Owner implements Guard {
  static name = "Owner";
  canPass(context: SignalContext): boolean {
    const account =
      context.transport === "http"
        ? (context.getHttpContext<{ account?: SerAccount }>().req.account ?? null)
        : (context.getWebSocketContext<{ account?: SerAccount }>().ws.data.account ?? null);
    return allow(context, account, ["user", "admin", "superAdmin"]);
  }
}

export class Admin implements Guard {
  static name = "Admin";
  canPass(context: SignalContext): boolean {
    const account =
      context.transport === "http"
        ? (context.getHttpContext<{ account?: SerAccount }>().req.account ?? null)
        : (context.getWebSocketContext<{ account?: SerAccount }>().ws.data.account ?? null);
    return allow(context, account, ["admin", "superAdmin"]);
  }
}

export class SuperAdmin implements Guard {
  static name = "SuperAdmin";
  canPass(context: SignalContext): boolean {
    const account =
      context.transport === "http"
        ? (context.getHttpContext<{ account?: SerAccount }>().req.account ?? null)
        : (context.getWebSocketContext<{ account?: SerAccount }>().ws.data.account ?? null);
    return allow(context, account, ["superAdmin"]);
  }
}

export class User implements Guard {
  static name = "User";
  canPass(context: SignalContext): boolean {
    const account =
      context.transport === "http"
        ? (context.getHttpContext<{ account?: SerAccount }>().req.account ?? null)
        : (context.getWebSocketContext<{ account?: SerAccount }>().ws.data.account ?? null);
    return allow(context, account, ["user"]);
  }
}
