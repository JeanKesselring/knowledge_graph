"use client";

import { useEffect, useMemo } from "react";
import {
  animate,
  motion,
  motionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { GraphData } from "@/lib/types";
import { DEPTH_SCALE } from "@/lib/graph";
import { teardropPath } from "@/lib/teardrop";

const VIEW_W = 1100;
const VIEW_H = 720;

const SIZE_FOCUS = 60;
const SIZE_CHILD = 20;
const SIZE_GRANDCHILD = 3;

const STROKE_SUPER = 3;
const STROKE_CHILD = 1.5;
const STROKE_GRANDCHILD = 0.75;

const TRANSITION = {
  type: "spring" as const,
  stiffness: 70,
  damping: 18,
  mass: 0.9,
};

const TEARDROP_UNIT = teardropPath(1);

type Role = "focus" | "super" | "child" | "grandchild" | "hidden";
type MV = { x: MotionValue<number>; y: MotionValue<number> };

function roleFor(nodeId: string, focusId: string, graph: GraphData): Role {
  if (nodeId === focusId) return "focus";
  const focus = graph.nodes[focusId];
  if (focus.parentId === nodeId) return "super";
  const node = graph.nodes[nodeId];
  if (!node) return "hidden";
  if (node.parentId === focusId) return "child";
  if (node.parentId && graph.nodes[node.parentId]?.parentId === focusId) {
    return "grandchild";
  }
  return "hidden";
}

export type HoverInfo = { id: string; clientX: number; clientY: number };

function Connection({
  from,
  to,
  strokeWidth,
  isClickable,
  onClick,
}: {
  from: MV;
  to: MV;
  strokeWidth: number;
  isClickable?: boolean;
  onClick?: () => void;
}) {
  return (
    <>
      <motion.line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="#2f3640"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {isClickable && (
        <motion.line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke="transparent"
          strokeWidth={Math.max(strokeWidth * 4, 14)}
          strokeLinecap="round"
          style={{ cursor: "pointer" }}
          onClick={onClick}
        />
      )}
    </>
  );
}

const CHIP_CHILD_W = 150;
const CHIP_CHILD_H = 22;
const CHIP_SUPER_W = 220;
const CHIP_SUPER_H = 24;

function ChildChip({
  label,
  mv,
  size,
}: {
  label: string;
  mv: MV;
  size: number;
}) {
  const offsetX = useTransform([mv.x, mv.y], (latest) => {
    const [x, y] = latest as number[];
    const len = Math.hypot(x, y);
    if (len < 0.001) return -CHIP_CHILD_W / 2;
    return (x / len) * (size + 14) - CHIP_CHILD_W / 2;
  });
  const offsetY = useTransform([mv.x, mv.y], (latest) => {
    const [x, y] = latest as number[];
    const len = Math.hypot(x, y);
    if (len < 0.001) return -CHIP_CHILD_H / 2;
    return (y / len) * (size + 14) - CHIP_CHILD_H / 2;
  });

  return (
    <motion.foreignObject
      x={offsetX}
      y={offsetY}
      width={CHIP_CHILD_W}
      height={CHIP_CHILD_H}
      style={{ pointerEvents: "none", overflow: "visible" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            background: "rgba(255, 255, 255, 0.88)",
            borderRadius: 6,
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
            border: "1px solid rgba(0, 0, 0, 0.04)",
            fontSize: 11,
            fontWeight: 500,
            color: "#1f2937",
            whiteSpace: "nowrap",
            maxWidth: CHIP_CHILD_W - 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </div>
    </motion.foreignObject>
  );
}

function SuperChip({ label, mv }: { label: string; mv: MV }) {
  const SUPER_ALONG = 260;
  const SUPER_PERP = 22;

  const x = useTransform([mv.x, mv.y], (latest) => {
    const [sx, sy] = latest as number[];
    const len = Math.hypot(sx, sy);
    if (len < 0.001) return -CHIP_SUPER_W / 2;
    const t = Math.min(1, SUPER_ALONG / len);
    const perpX = -sy / len;
    return sx * t + perpX * SUPER_PERP - CHIP_SUPER_W / 2;
  });
  const y = useTransform([mv.x, mv.y], (latest) => {
    const [sx, sy] = latest as number[];
    const len = Math.hypot(sx, sy);
    if (len < 0.001) return -CHIP_SUPER_H / 2;
    const t = Math.min(1, SUPER_ALONG / len);
    const perpY = sx / len;
    return sy * t + perpY * SUPER_PERP - CHIP_SUPER_H / 2;
  });

  return (
    <motion.foreignObject
      x={x}
      y={y}
      width={CHIP_SUPER_W}
      height={CHIP_SUPER_H}
      style={{ pointerEvents: "none", overflow: "visible" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-sans)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            background: "rgba(255, 255, 255, 0.92)",
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            border: "1px solid rgba(0, 0, 0, 0.04)",
            fontSize: 12,
            fontWeight: 500,
            color: "#1f2937",
            whiteSpace: "nowrap",
            maxWidth: CHIP_SUPER_W - 4,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>
      </div>
    </motion.foreignObject>
  );
}

export default function KnowledgeGraph({
  graph,
  focusId,
  onFocus,
  onHover,
}: {
  graph: GraphData;
  focusId: string;
  onFocus: (id: string) => void;
  onHover: (info: HoverInfo | null) => void;
}) {
  const focus = graph.nodes[focusId];
  const focusPos = graph.positions[focusId];
  const zoom = Math.pow(DEPTH_SCALE, focus.depth);

  // One MotionValue pair per node, sourced from the graph (stable for the
  // lifetime of the component). Lines and node groups both read from these,
  // guaranteeing endpoints stay glued during transitions.
  const motionPositions = useMemo(() => {
    const map = new Map<string, MV>();
    for (const id of Object.keys(graph.nodes)) {
      const wp = graph.positions[id];
      const sx = (wp.x - focusPos.x) * zoom;
      const sy = (wp.y - focusPos.y) * zoom;
      map.set(id, { x: motionValue(sx), y: motionValue(sy) });
    }
    return map;
    // Intentional: re-init only if the graph identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  useEffect(() => {
    const controls: Array<{ stop: () => void }> = [];
    for (const id of Object.keys(graph.nodes)) {
      const wp = graph.positions[id];
      const targetX = (wp.x - focusPos.x) * zoom;
      const targetY = (wp.y - focusPos.y) * zoom;
      const mv = motionPositions.get(id);
      if (!mv) continue;
      controls.push(animate(mv.x, targetX, TRANSITION));
      controls.push(animate(mv.y, targetY, TRANSITION));
    }
    return () => {
      controls.forEach((c) => c.stop());
    };
  }, [focusId, focusPos.x, focusPos.y, zoom, graph, motionPositions]);

  // Role + tipAngle per node, recomputed when focus changes.
  const renderInfo = useMemo(() => {
    type Info = { role: Role; tipAngleDeg: number };
    const info: Record<string, Info> = {};
    for (const id of Object.keys(graph.nodes)) {
      const node = graph.nodes[id];
      const wp = graph.positions[id];
      let tipRad: number;
      if (node.parentId) {
        const pp = graph.positions[node.parentId];
        tipRad = Math.atan2(pp.y - wp.y, pp.x - wp.x);
      } else {
        tipRad = wp.superAngle;
      }
      info[id] = {
        role: roleFor(id, focusId, graph),
        tipAngleDeg: (tipRad * 180) / Math.PI,
      };
    }
    return info;
  }, [graph, focusId]);

  type Conn = {
    key: string;
    fromId: string;
    toId: string;
    role: "super" | "child" | "grandchild";
  };
  const connections: Conn[] = [];
  if (focus.parentId) {
    connections.push({
      key: `super:${focusId}->${focus.parentId}`,
      fromId: focusId,
      toId: focus.parentId,
      role: "super",
    });
  }
  for (const cid of focus.childIds) {
    connections.push({
      key: `child:${focusId}->${cid}`,
      fromId: focusId,
      toId: cid,
      role: "child",
    });
    for (const gcid of graph.nodes[cid].childIds) {
      connections.push({
        key: `gc:${cid}->${gcid}`,
        fromId: cid,
        toId: gcid,
        role: "grandchild",
      });
    }
  }

  return (
    <svg
      viewBox={`${-VIEW_W / 2} ${-VIEW_H / 2} ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full select-none"
      overflow="hidden"
      style={{ overflow: "hidden" }}
      onMouseLeave={() => onHover(null)}
    >
      {connections.map((c) => {
        const fromMV = motionPositions.get(c.fromId);
        const toMV = motionPositions.get(c.toId);
        if (!fromMV || !toMV) return null;
        const sw =
          c.role === "super"
            ? STROKE_SUPER
            : c.role === "child"
            ? STROKE_CHILD
            : STROKE_GRANDCHILD;
        return (
          <Connection
            key={c.key}
            from={fromMV}
            to={toMV}
            strokeWidth={sw}
            isClickable={c.role === "super"}
            onClick={c.role === "super" ? () => onFocus(c.toId) : undefined}
          />
        );
      })}

      {focus.parentId && motionPositions.get(focus.parentId) && (
        <SuperChip
          key={`superchip:${focus.parentId}`}
          label={graph.nodes[focus.parentId].title}
          mv={motionPositions.get(focus.parentId)!}
        />
      )}

      {Object.entries(renderInfo).map(([id, info]) => {
        const node = graph.nodes[id];
        const role = info.role;
        const size =
          role === "focus"
            ? SIZE_FOCUS
            : role === "child"
            ? SIZE_CHILD
            : role === "grandchild"
            ? SIZE_GRANDCHILD
            : 0;
        const visible =
          role === "focus" || role === "child" || role === "grandchild";
        const fill = role === "grandchild" ? "#3a3a3a" : node.color;
        const mv = motionPositions.get(id);
        if (!mv) return null;

        return (
          <motion.g
            key={id}
            initial={false}
            style={{
              x: mv.x,
              y: mv.y,
              pointerEvents: visible ? "auto" : "none",
              cursor:
                role === "child" || role === "grandchild"
                  ? "pointer"
                  : "default",
            }}
            animate={{ opacity: visible ? 1 : 0 }}
            transition={TRANSITION}
            onClick={(e) => {
              e.stopPropagation();
              if (role === "child" || role === "grandchild") onFocus(id);
            }}
            onMouseEnter={(e) =>
              visible && onHover({ id, clientX: e.clientX, clientY: e.clientY })
            }
            onMouseMove={(e) =>
              visible && onHover({ id, clientX: e.clientX, clientY: e.clientY })
            }
            onMouseLeave={() => onHover(null)}
          >
            <motion.path
              d={TEARDROP_UNIT}
              initial={false}
              animate={{
                scale: size,
                rotate: info.tipAngleDeg,
                fill,
              }}
              transition={TRANSITION}
              stroke="rgba(0, 0, 0, 0.18)"
              strokeWidth={role === "grandchild" ? 0 : 0.04}
              vectorEffect="non-scaling-stroke"
            />

            {role === "focus" && (
              <foreignObject
                x={-size + 6}
                y={-size + 6}
                width={2 * (size - 6)}
                height={2 * (size - 6)}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    color: "#111827",
                    padding: "0 4px",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {node.title}
                </div>
              </foreignObject>
            )}

            {role === "child" && (
              <ChildChip label={node.title} mv={mv} size={size} />
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
