"use client";

import type { GraphNode } from "@/lib/types";

export default function HoverCard({
  node,
  x,
  y,
}: {
  node: GraphNode;
  x: number;
  y: number;
}) {
  const CARD_W = 240;
  const offset = 16;
  // Flip to the left side of the cursor if we'd overflow the viewport.
  const left =
    typeof window !== "undefined" && x + offset + CARD_W > window.innerWidth
      ? x - offset - CARD_W
      : x + offset;
  return (
    <div
      style={{
        position: "fixed",
        left,
        top: y + offset,
        width: CARD_W,
        zIndex: 50,
        pointerEvents: "none",
      }}
      className="rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/10"
    >
      <div className="aspect-[5/3] w-full overflow-hidden rounded-md bg-[#eef2f7]">
        <div className="flex h-full w-full items-center justify-center text-xs text-[#9ca3af]">
          preview
        </div>
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[#111827]">{node.title}</div>
          <div className="mt-0.5 text-xs leading-snug text-[#4b5563]">
            {node.summary.length > 90
              ? node.summary.slice(0, 88) + "…"
              : node.summary}
          </div>
        </div>
        <button
          type="button"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dbedfb] text-[#3a7bb0]"
          style={{ pointerEvents: "auto" }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M6 4h12v17l-6-4-6 4z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
