import { beforeAll, describe, expect, it } from "bun:test";
import * as adminSpec from "@libs/shared/lib/admin/admin.signal.spec";
import * as notificationSpec from "@libs/shared/lib/notification/notification.signal.spec";
import type * as userSpec from "@libs/shared/lib/user/user.signal.spec";

import type * as cnst from "../cnst";

describe("Notification Signal", () => {
  describe("Notification Service", () => {
    let adminAgent: userSpec.AdminAgent;
    let userAgent: userSpec.UserAgent;
    let notification: cnst.Notification;
    beforeAll(async () => {
      adminAgent = await adminSpec.getAdminAgentWithInitialize();
    });

    it("can create notification", async () => {
      notification = await notificationSpec.createNotification(adminAgent, userAgent);
      expect(notification.id).toBeTruthy();
    });
  });
});
