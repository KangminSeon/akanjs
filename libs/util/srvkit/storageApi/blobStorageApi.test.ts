import { afterEach, describe, expect, test } from "bun:test";
import type { BackendEnv } from "akanjs/base";

import { option } from "../../lib/option";
import { BlobStorageApi } from "./blobStorageApi";

const originalPort = process.env.PORT;
const originalAppName = process.env.AKAN_PUBLIC_APP_NAME;
const originalRepoName = process.env.AKAN_PUBLIC_REPO_NAME;
const originalServeDomain = process.env.AKAN_PUBLIC_SERVE_DOMAIN;

afterEach(() => {
  if (originalPort === undefined) delete process.env.PORT;
  else process.env.PORT = originalPort;
  if (originalAppName === undefined) delete process.env.AKAN_PUBLIC_APP_NAME;
  else process.env.AKAN_PUBLIC_APP_NAME = originalAppName;
  if (originalRepoName === undefined) delete process.env.AKAN_PUBLIC_REPO_NAME;
  else process.env.AKAN_PUBLIC_REPO_NAME = originalRepoName;
  if (originalServeDomain === undefined) delete process.env.AKAN_PUBLIC_SERVE_DOMAIN;
  else process.env.AKAN_PUBLIC_SERVE_DOMAIN = originalServeDomain;
});

const createEnv = (operationMode: BackendEnv["operationMode"], port = 18482): BackendEnv => ({
  repoName: "test-repo",
  serveDomain: "example.test",
  appName: "test-app",
  environment: "testing",
  operationMode,
  tunnelUsername: "",
  tunnelPassword: "",
  port,
});

describe("BlobStorageApi", () => {
  test("uses the API route prefix for local file blob URLs by default", () => {
    const storage = new BlobStorageApi("test-app", {});

    expect(storage.urlPrefix).toBe("/api/localFile/getBlob");
  });

  test("builds util option blob URLs from the API route prefix", () => {
    delete process.env.PORT;
    process.env.AKAN_PUBLIC_APP_NAME = "test-app";
    process.env.AKAN_PUBLIC_REPO_NAME = "test-repo";
    process.env.AKAN_PUBLIC_SERVE_DOMAIN = "example.test";

    const localUses = option.getUses(createEnv("local"));
    const cloudUses = option.getUses(createEnv("cloud"));

    expect((localUses.blobStorageApi as BlobStorageApi).urlPrefix).toBe("http://localhost:18482/api/localFile/getBlob");
    expect((cloudUses.blobStorageApi as BlobStorageApi).urlPrefix).toBe("/api/localFile/getBlob");
  });
});
