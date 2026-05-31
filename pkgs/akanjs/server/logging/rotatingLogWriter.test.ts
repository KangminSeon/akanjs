import { describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RotatingLogWriter } from "./rotatingLogWriter";

const createTmp = () => mkdtemp(join(tmpdir(), "akan-logs-"));

describe("RotatingLogWriter", () => {
  test("rotates by size and sanitizes filename parts", async () => {
    const tmp = await createTmp();
    const writer = new RotatingLogWriter({
      logDir: tmp,
      appName: "my/app",
      environment: "local env",
      operationMode: "local",
      maxSizeBytes: 10,
      now: () => new Date(2026, 4, 25, 10),
    });

    try {
      writer.write("gateway", "12345\n");
      writer.write("gateway", "67890\n");
      await writer.close();

      expect((await readdir(tmp)).sort()).toEqual([
        "my_app-local_env-local-2026-05-25-gateway-0001.log",
        "my_app-local_env-local-2026-05-25-gateway-0002.log",
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  test("rotates by local date", async () => {
    const tmp = await createTmp();
    let now = new Date(2026, 4, 25, 23);
    const writer = new RotatingLogWriter({
      logDir: tmp,
      appName: "akan",
      environment: "local",
      operationMode: "local",
      maxSizeBytes: 1024,
      now: () => now,
    });

    try {
      writer.write("0-federation", "before\n");
      now = new Date(2026, 4, 26, 0);
      writer.write("0-federation", "after\n");
      await writer.close();

      expect((await readdir(tmp)).sort()).toEqual([
        "akan-local-local-2026-05-25-0-federation-0001.log",
        "akan-local-local-2026-05-26-0-federation-0001.log",
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  test("continues with the next sequence on restart", async () => {
    const tmp = await createTmp();
    const options = {
      logDir: tmp,
      appName: "akan",
      environment: "local",
      operationMode: "local",
      maxSizeBytes: 1024,
      now: () => new Date(2026, 4, 25, 10),
    };

    try {
      const first = new RotatingLogWriter(options);
      first.write("gateway", "first\n");
      await first.close();

      const second = new RotatingLogWriter(options);
      second.write("gateway", "second\n");
      await second.close();

      expect((await readdir(tmp)).sort()).toEqual([
        "akan-local-local-2026-05-25-gateway-0001.log",
        "akan-local-local-2026-05-25-gateway-0002.log",
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  test("keeps retention per process key", async () => {
    const tmp = await createTmp();
    const writer = new RotatingLogWriter({
      logDir: tmp,
      appName: "akan",
      environment: "local",
      operationMode: "local",
      maxSizeBytes: 5,
      maxFiles: 2,
      now: () => new Date(2026, 4, 25, 10),
    });

    try {
      writer.write("gateway", "11111\n");
      writer.write("gateway", "22222\n");
      writer.write("gateway", "33333\n");
      writer.write("0-federation", "child\n");
      await writer.close();

      expect((await readdir(tmp)).sort()).toEqual([
        "akan-local-local-2026-05-25-0-federation-0001.log",
        "akan-local-local-2026-05-25-gateway-0002.log",
        "akan-local-local-2026-05-25-gateway-0003.log",
      ]);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
