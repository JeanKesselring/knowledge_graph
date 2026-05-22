"use client";

import { useState } from "react";
import type { GraphData } from "@/lib/types";
import KnowledgeGraph, { type HoverInfo } from "./KnowledgeGraph";
import Header from "./Header";
import Sidebar from "./Sidebar";
import HoverCard from "./HoverCard";

export default function KnowledgeGraphPage({ graph }: { graph: GraphData }) {
  const [focusId, setFocusId] = useState(graph.rootId);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const focusNode = graph.nodes[focusId];
  const hoverNode = hover ? graph.nodes[hover.id] : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex flex-1 items-stretch gap-4 px-4 py-4">
        <section className="relative flex-1 overflow-hidden rounded-2xl bg-[#dbedfb] ring-1 ring-black/5">
          <h2 className="absolute left-6 top-5 z-10 text-xl font-semibold text-[#111827]">
            Knowledge Graph
          </h2>

          <div className="absolute inset-0">
            <KnowledgeGraph
              graph={graph}
              focusId={focusId}
              onFocus={setFocusId}
              onHover={setHover}
            />
          </div>
        </section>

        <Sidebar
          node={focusNode}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
        />
      </main>

      {hoverNode && hover && (
        <HoverCard node={hoverNode} x={hover.clientX} y={hover.clientY} />
      )}
    </div>
  );
}
