"use client";
import { loadCapacitorDevice, loadCapacitorFcm, loadCapacitorPushNotifications } from "akanjs/client/capacitor";

/** Capacitor push/FCM hook for permission, registration, and token retrieval. */
export const usePushNoti = () => {
  const init = async () => {
    const [{ Device }, { FCM }, { PushNotifications }] = await Promise.all([
      loadCapacitorDevice(),
      loadCapacitorFcm(),
      loadCapacitorPushNotifications(),
    ]);
    const device = await Device.getInfo();
    if (device.platform === "web") return;
    void FCM.setAutoInit({ enabled: true });
    void PushNotifications.requestPermissions().then(async (result) => {
      if (result.receive === "granted") {
        await PushNotifications.register();
      }
    });
  };

  const checkPermission = async () => {
    const { PushNotifications } = await loadCapacitorPushNotifications();
    const { receive } = await PushNotifications.checkPermissions();
    return receive === "granted";
  };
  const register = async () => {
    const [{ Device }, { PushNotifications }] = await Promise.all([
      loadCapacitorDevice(),
      loadCapacitorPushNotifications(),
    ]);
    const device = await Device.getInfo();
    if (device.platform === "web") return;
    const { receive } = await PushNotifications.checkPermissions();
    //푸시알림이 거절됐으면 앱 세팅으로 넘어감

    if (receive === "denied") location.assign("app-settings:");
    else await PushNotifications.register();
  };
  const getToken = async () => {
    const [{ Device }, { FCM }] = await Promise.all([loadCapacitorDevice(), loadCapacitorFcm()]);
    const device = await Device.getInfo();
    if (device.platform === "web") return;
    const { token } = await FCM.getToken();
    return token;
  };

  return { init, checkPermission, register, getToken };
};
