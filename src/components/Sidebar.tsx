"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { GraphNode } from "@/lib/types";

export default function Sidebar({
  node,
  open,
  onToggle,
}: {
  node: GraphNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative flex items-stretch">
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        className="absolute -left-3 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#374151] shadow ring-1 ring-black/10"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          {open ? (
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
            className="overflow-hidden"
          >
            <div className="ml-4 flex h-full w-[300px] flex-col gap-3">
              <section className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                <div className="aspect-[5/3] w-full overflow-hidden rounded-md bg-[#eef2f7]">
                  <div className="flex h-full w-full items-center justify-center text-xs text-[#9ca3af]">
                    preview
                  </div>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-[#111827]">
                      {node.title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#4b5563]">
                      {node.summary}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dbedfb] text-[#3a7bb0]"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M6 4h12v17l-6-4-6 4z" />
                    </svg>
                  </button>
                </div>
                {node.keywords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {node.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-medium text-[#475569]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
                <div className="text-sm font-semibold text-[#111827]">Insights</div>
                <div className="mt-3 flex h-24 items-end gap-2">
                  {[40, 70, 55, 85, 30].map((h, i) => {
                    const colors = ["#f4b3b6", "#fbe38e", "#b8e3a4", "#a6cfea", "#d9c7ef"];
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{ height: `${h}%`, background: colors[i] }}
                      />
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#9ca3af]">
                  <span>&lt;20%</span>
                  <span>&lt;40%</span>
                  <span>&lt;60%</span>
                  <span>&lt;80%</span>
                  <span>&lt;100%</span>
                </div>
              </section>

              <button
                type="button"
                className="flex items-center justify-between rounded-2xl bg-[#3a7bb0] px-4 py-3 text-white shadow-sm"
              >
                <span className="text-sm font-medium">Go to course</span>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
