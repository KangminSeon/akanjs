import { describe, expect, test } from "bun:test";
import { Logger, type LoggerSinkEntry } from "./Logger";

const resetLoggerLevels = () => {
  Logger.setLevel("log");
  Logger.setFileLevel("trace");
};

describe("Logger sinks", () => {
  test("emits file sink entries independently from terminal log level", () => {
    const entries: LoggerSinkEntry[] = [];
    const removeSink = Logger.addSink((entry) => entries.push(entry));

    try {
      Logger.setLevel("error");
      Logger.setFileLevel("trace");
      Logger.trace("file only", "sink-test", "LoggerTest");

      expect(entries.length).toBe(1);
      expect(entries[0]?.level).toBe("trace");
      expect(entries[0]?.plainMessage.includes("file only")).toBe(true);
    } finally {
      removeSink();
      resetLoggerLevels();
    }
  });

  test("filters sink entries with AKAN_LOG_FILE_LEVEL semantics", () => {
    const entries: LoggerSinkEntry[] = [];
    const removeSink = Logger.addSink((entry) => entries.push(entry));

    try {
      Logger.setLevel("error");
      Logger.setFileLevel("warn");
      Logger.info("skip file", "sink-test", "LoggerTest");
      Logger.warn("keep file", "sink-test", "LoggerTest");

      expect(entries.map((entry) => entry.level)).toEqual(["warn"]);
      expect(entries[0]?.plainMessage.includes("keep file")).toBe(true);
    } finally {
      removeSink();
      resetLoggerLevels();
    }
  });
});
