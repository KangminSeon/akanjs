"use client";
import { Loading } from "akanjs/ui";
import { useFetch } from "akanjs/webkit";
import { useMemo, useState } from "react";
import { GoFold, GoUnfold } from "react-icons/go";

interface Shiki_ClientProps {
  className?: string;
  htmlPromise: Promise<string>;
  focusLines?: [number, number][];
}

interface LineData {
  lineNum: number;
  html: string;
  className: string;
}

interface Segment {
  type: "visible" | "hidden";
  lines: LineData[];
  startLine: number;
}

const isLineInFocus = (lineNum: number, ranges: [number, number][]) => {
  return ranges.some(([start, end]) => lineNum >= start && lineNum <= end);
};

interface CollapsedSectionProps {
  sectionId: string;
  startLine: number;
  endLine: number;
  lines: LineData[];
  isExpanded: boolean;
  onToggle: () => void;
}

const CollapsedSection = ({ sectionId, lines, isExpanded, onToggle }: CollapsedSectionProps) => {
  return (
    <div className={`collapsed-section ${isExpanded ? "expanded" : ""}`} data-section={sectionId}>
      <button className="expand-btn" onClick={onToggle}>
        <span className="expand-icon">{isExpanded ? <GoFold size={12} /> : <GoUnfold size={12} />}</span>
      </button>
      <div className="collapsed-lines opacity-30">
        {lines.map((line) => (
          <span
            key={line.lineNum}
            className={line.className}
            data-line={line.lineNum}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <HTML 코드를 직접 설정>
            dangerouslySetInnerHTML={{ __html: line.html }}
          />
        ))}
      </div>
    </div>
  );
};

export const Shiki_Client = ({ className, htmlPromise, focusLines }: Shiki_ClientProps) => {
  const { fulfilled, value } = useFetch(htmlPromise);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const { preClass, codeClass, segments } = useMemo(() => {
    if (!value) return { preClass: "", codeClass: "", segments: [] };

    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const pre = doc.querySelector("pre");
    const code = doc.querySelector("code");

    if (!code) return { preClass: "", codeClass: "", segments: [] };

    const preClass = pre?.className ?? "";
    const codeClass = code.className;

    if (!focusLines || focusLines.length === 0) {
      // No focus lines - return all lines as visible
      const lines = Array.from(code.querySelectorAll(".line[data-line]"));
      const lineData: LineData[] = lines.map((line) => ({
        lineNum: parseInt(line.getAttribute("data-line") ?? "0"),
        html: line.innerHTML,
        className: line.className,
      }));
      return {
        preClass,
        codeClass,
        segments: [{ type: "visible" as const, lines: lineData, startLine: 1 }],
      };
    }

    const lines = Array.from(code.querySelectorAll(".line[data-line]"));
    if (lines.length === 0) return { preClass, codeClass, segments: [] };

    // Build segments: groups of consecutive visible or hidden lines
    const segments: Segment[] = [];
    let currentSegment: Segment | null = null;

    lines.forEach((line) => {
      const lineNum = parseInt(line.getAttribute("data-line") ?? "0");
      const isVisible = isLineInFocus(lineNum, focusLines);
      const type = isVisible ? "visible" : "hidden";
      const lineData: LineData = { lineNum, html: line.innerHTML, className: line.className };

      if (currentSegment?.type !== type) {
        currentSegment = { type, lines: [lineData], startLine: lineNum };
        segments.push(currentSegment);
      } else currentSegment.lines.push(lineData);
    });

    return { preClass, codeClass, segments };
  }, [value, focusLines]);

  if (!fulfilled)
    return (
      <pre className={className}>
        <code>
          <Loading.Skeleton active />
        </code>
      </pre>
    );

  return (
    <div className={className}>
      <pre className={preClass}>
        <code className={codeClass}>
          {segments.map((segment, index) => {
            if (segment.type === "visible") {
              return segment.lines.map((line) => (
                <span
                  key={line.lineNum}
                  className={line.className}
                  data-line={line.lineNum}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: <HTML 코드를 직접 설정>
                  dangerouslySetInnerHTML={{ __html: line.html }}
                />
              ));
            } else {
              const sectionId = `section-${index}`;
              const isExpanded = expandedSections.has(sectionId);
              const endLine = segment.startLine + segment.lines.length - 1;

              return (
                <CollapsedSection
                  key={sectionId}
                  sectionId={sectionId}
                  startLine={segment.startLine}
                  endLine={endLine}
                  lines={segment.lines}
                  isExpanded={isExpanded}
                  onToggle={() => {
                    toggleSection(sectionId);
                  }}
                />
              );
            }
          })}
        </code>
      </pre>
    </div>
  );
};
