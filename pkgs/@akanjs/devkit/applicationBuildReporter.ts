import { Logger } from "akanjs/common";

export interface ApplicationBuildPhaseResult {
  id: string;
  label: string;
  durationMs: number;
  summary?: string;
  skipped?: boolean;
}

export interface ApplicationBuildResult {
  phases: ApplicationBuildPhaseResult[];
  durationMs: number;
  outputDir: string;
  artifactDir: string;
}

export interface ApplicationBuildProgressReporter {
  phaseStart?(phase: Pick<ApplicationBuildPhaseResult, "id" | "label">): void;
  phaseDone?(phase: ApplicationBuildPhaseResult): void;
  phaseFail?(phase: Pick<ApplicationBuildPhaseResult, "id" | "label">, error: unknown): void;
}

export class ApplicationBuildReporter {
  static create(): ApplicationBuildProgressReporter {
    return {
      phaseDone: (phase) => Logger.rawLog(ApplicationBuildReporter.formatPhaseLine(phase)),
    };
  }

  static printSummary(result: ApplicationBuildResult) {
    Logger.rawLog("");
    Logger.rawLog(`Route artifacts: ${result.artifactDir}`);
    Logger.rawLog(`Server output: ${result.outputDir}`);
    Logger.rawLog(`Done in ${ApplicationBuildReporter.formatDuration(result.durationMs)}`);
  }

  static formatError(error: unknown): string {
    if (error instanceof AggregateError) {
      const nestedMessages = error.errors
        .map(
          (nestedError, index) =>
            ApplicationBuildReporter.formatError(nestedError).trim() || `Unknown error ${index + 1}`,
        )
        .map((message) => message.replace(/^/gm, "  "))
        .join("\n");

      return nestedMessages ? `${error.message}\n${nestedMessages}` : error.message;
    }
    if (error instanceof Error) {
      const causeMessage = error.cause ? `\nCaused by: ${ApplicationBuildReporter.formatError(error.cause)}` : "";
      return `${error.message}${causeMessage}`;
    }
    if (typeof error === "object" && error !== null && "message" in error) return String(error.message);
    return String(error);
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${Math.round(ms / 100) / 10}s`;
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  static formatPhaseLine(phase: ApplicationBuildPhaseResult): string {
    const summary = phase.summary ? `: ${phase.summary}` : "";
    return `✓ ${phase.label}${summary} (${ApplicationBuildReporter.formatDuration(phase.durationMs)})`;
  }
}
