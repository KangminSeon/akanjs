import { spawn } from "node:child_process";

export function openBrowser(url: string): Promise<void> {
  const command =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  const child = spawn(command[0], command.slice(1), { detached: true, stdio: "ignore" });
  child.on("error", () => {
    // Browser opening is a convenience feature; callers can continue with the printed URL.
  });
  child.unref();
  return Promise.resolve();
}
