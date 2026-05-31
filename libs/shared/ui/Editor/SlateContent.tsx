"use client";

import Yoopta from "./Yoopta/Editor";

export default function SlateContent({ content, className = "" }: { content: unknown; className?: string }) {
  return <Yoopta readOnly className={className} value={content} onChange={() => {}} />;
}
