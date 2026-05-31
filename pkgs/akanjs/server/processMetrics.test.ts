import { describe, expect, test } from "bun:test";
import { ProcessMetricsCollector } from "./processMetricsCollector";

describe("process metrics helpers", () => {
  test("parses positive memory log intervals and falls back otherwise", () => {
    expect(ProcessMetricsCollector.parseMemoryLogIntervalMs("1000")).toBe(1000);
    expect(ProcessMetricsCollector.parseMemoryLogIntervalMs("0")).toBe(60_000);
    expect(ProcessMetricsCollector.parseMemoryLogIntervalMs("not-a-number")).toBe(60_000);
  });

  test("formats memory usage as stable one-line fields", () => {
    expect(ProcessMetricsCollector.formatBytes(1024 * 1024)).toBe("1.0MiB");
    expect(
      ProcessMetricsCollector.format({
        pid: 123,
        rssBytes: 2 * 1024 * 1024,
        heapUsedBytes: 3 * 1024 * 1024,
        heapTotalBytes: 4 * 1024 * 1024,
        externalBytes: 5 * 1024 * 1024,
        arrayBuffersBytes: 6 * 1024 * 1024,
      }),
    ).toBe("pid=123 rss=2.0MiB heapUsed=3.0MiB heapTotal=4.0MiB external=5.0MiB arrayBuffers=6.0MiB");
  });
});
