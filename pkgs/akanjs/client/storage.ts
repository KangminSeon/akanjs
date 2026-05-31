import { getEnv } from "akanjs/base";
import { loadCapacitorPreferences } from "./capacitor";

const getLocalStorageItem = (key: string) => localStorage.getItem(key);

const setLocalStorageItem = (key: string, value: string) => {
  localStorage.setItem(key, value);
};

const removeLocalStorageItem = (key: string) => {
  localStorage.removeItem(key);
};

export const storage = {
  getItem: async (key: string) => {
    const env = getEnv();
    if (env.side === "server") return;
    if (env.renderMode === "ssr") return getLocalStorageItem(key);
    try {
      const { Preferences } = await loadCapacitorPreferences();
      return (await Preferences.get({ key })).value;
    } catch {
      return getLocalStorageItem(key);
    }
  },
  setItem: async (key: string, value: string) => {
    const env = getEnv();
    if (env.side === "server") return;
    if (env.renderMode === "ssr") {
      setLocalStorageItem(key, value);
      return;
    }
    try {
      const { Preferences } = await loadCapacitorPreferences();
      await Preferences.set({ key, value });
      return;
    } catch {
      setLocalStorageItem(key, value);
      return;
    }
  },
  removeItem: async (key: string) => {
    const env = getEnv();
    if (env.side === "server") return;
    if (env.renderMode === "ssr") {
      removeLocalStorageItem(key);
      return;
    }
    try {
      const { Preferences } = await loadCapacitorPreferences();
      return Preferences.remove({ key });
    } catch {
      removeLocalStorageItem(key);
      return;
    }
  },
};
