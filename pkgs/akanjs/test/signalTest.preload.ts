import { afterAll } from "bun:test";
import { terminateSignalTestContext } from "./signalTestRuntime";

const isSignalTarget = process.env.AKAN_TEST_SIGNAL === "1";

if (isSignalTarget) {
  afterAll(async () => {
    await terminateSignalTestContext();
  });
}
