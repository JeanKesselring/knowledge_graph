"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  animate,
  motion,
  motionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { GraphData } from "@/lib/types";
import { DEPTH_SCALE } from "@/lib/graph";
import { teardropPath } from "@/lib/teardrop";

const VIEW_W = 1100;
const VIEW_H = 720;

const SIZE_FOCUS = 96;
const SIZE_CHILD = 40;
const SIZE_GRANDCHILD = 6;

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

/** Project (x, y) from origin to the viewport rectangle boundary, leaving margin px gap. */
function projectToViewportEdge(
  x: number,
  y: number,
  margin = 40,
): [number, number] {
  const len = Math.hypot(x, y);
  if (len < 0.001) return [0, -(VIEW_H / 2 - margin)];
  const tx = (VIEW_W / 2 - margin) / Math.abs(x);
  const ty = (VIEW_H / 2 - margin) / Math.abs(y);
  const t = Math.min(tx, ty);
  return [x * t, y * t];
}

type Role = "focus" | "super" | "child" | "grandchild" | "hidden";
type MV = {
  x: MotionValue<number>;
  y: MotionValue<number>;
  size: MotionValue<number>;
};

function sizeForRole(role: Role): number {
  if (role === "focus") return SIZE_FOCUS;
  if (role === "child") return SIZE_CHILD;
  if (role === "grandchild") return SIZE_GRANDCHILD;
  return 0;
}

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

const CHIP_CHILD_W = 140;
const CHIP_CHILD_H = 48;
const CHIP_SUPER_W = 200;
const CHIP_SUPER_H = 48;

function ChildChip({
  label,
  labelAngleDeg,
  id,
  onClick,
  onHover,
}: {
  label: string;
  labelAngleDeg: number;
  id: string;
  onClick: () => void;
  onHover: (info: HoverInfo | null) => void;
}) {
  const angleRad = (labelAngleDeg * Math.PI) / 180;
  const baseDist = SIZE_CHILD + 80;
  const offsetX = Math.cos(angleRad) * (baseDist + 20) - CHIP_CHILD_W / 2;
  const offsetY = Math.sin(angleRad) * baseDist - CHIP_CHILD_H / 2;

  return (
    <foreignObject
      x={offsetX}
      y={offsetY}
      width={CHIP_CHILD_W}
      height={CHIP_CHILD_H}
      style={{ pointerEvents: "auto", overflow: "visible", cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={(e) =>
        onHover({ id, clientX: e.clientX, clientY: e.clientY })
      }
      onMouseMove={(e) =>
        onHover({ id, clientX: e.clientX, clientY: e.clientY })
      }
      onMouseLeave={() => onHover(null)}
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
            padding: "4px 8px",
            background: "#ffffff",
            borderRadius: 6,
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
            border: "1.5px solid #4A4A4A",
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.2,
            color: "#1f2937",
            textAlign: "center",
            whiteSpace: "normal",
            wordBreak: "break-word",
            maxWidth: CHIP_CHILD_W - 4,
          }}
        >
          {label}
        </span>
      </div>
    </foreignObject>
  );
}

function SuperChip({
  label,
  mv,
  id,
  onClick,
  onHover,
}: {
  label: string;
  mv: MV;
  id: string;
  onClick: () => void;
  onHover: (info: HoverInfo | null) => void;
}) {
  const SUPER_ALONG = 260;
  const SUPER_PERP = 110;

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
      style={{ pointerEvents: "auto", overflow: "visible", cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={(e) =>
        onHover({ id, clientX: e.clientX, clientY: e.clientY })
      }
      onMouseMove={(e) =>
        onHover({ id, clientX: e.clientX, clientY: e.clientY })
      }
      onMouseLeave={() => onHover(null)}
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
            padding: "4px 8px",
            background: "#ffffff",
            borderRadius: 6,
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
            border: "1.5px solid #4A4A4A",
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.2,
            color: "#1f2937",
            textAlign: "center",
            whiteSpace: "normal",
            wordBreak: "break-word",
            maxWidth: CHIP_SUPER_W - 4,
          }}
        >
          {label}
        </span>
      </div>
    </motion.foreignObject>
  );
}

/**
 * Renders the teardrop path with the SVG `transform` attribute set
 * imperatively from the size motion value. The angle is static per node
 * (pure world geometry, doesn't depend on focus). Using the SVG
 * `transform` attribute — not CSS transform — means `rotate(...)` and
 * `scale(...)` pivot at (0, 0) of the parent's user space *unambiguously*,
 * regardless of `transform-box` or `transform-origin` interpretation.
 * The path's local (0, 0) is the head center, so the head stays exactly at
 * the parent's (0, 0), where the connection lines also land.
 */
function NodeShape({
  angle,
  sizeMV,
  fill,
  strokeW,
}: {
  angle: number;
  sizeMV: MotionValue<number>;
  fill: string;
  strokeW: number;
}) {
  const gRef = useRef<SVGGElement>(null);

  useMotionValueEvent(sizeMV, "change", (s) => {
    if (gRef.current) {
      gRef.current.setAttribute("transform", `rotate(${angle}) scale(${s})`);
    }
  });

  useLayoutEffect(() => {
    if (gRef.current) {
      gRef.current.setAttribute(
        "transform",
        `rotate(${angle}) scale(${sizeMV.get()})`,
      );
    }
  }, [angle, sizeMV]);

  return (
    <g ref={gRef}>
      <motion.path
        d={TEARDROP_UNIT}
        initial={false}
        animate={{ fill }}
        transition={TRANSITION}
        stroke="#4A4A4A"
        strokeWidth={strokeW}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
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
      let sx = (wp.x - focusPos.x) * zoom;
      let sy = (wp.y - focusPos.y) * zoom;
      if (id === focus.parentId) {
        [sx, sy] = projectToViewportEdge(sx, sy);
      }
      const initialRole = roleFor(id, focusId, graph);
      map.set(id, {
        x: motionValue(sx),
        y: motionValue(sy),
        size: motionValue(sizeForRole(initialRole)),
      });
    }
    return map;
    // Intentional: re-init only if the graph identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  useEffect(() => {
    const controls: Array<{ stop: () => void }> = [];
    for (const id of Object.keys(graph.nodes)) {
      const wp = graph.positions[id];
      let targetX = (wp.x - focusPos.x) * zoom;
      let targetY = (wp.y - focusPos.y) * zoom;
      if (id === focus.parentId) {
        [targetX, targetY] = projectToViewportEdge(targetX, targetY);
      }
      const targetSize = sizeForRole(roleFor(id, focusId, graph));
      const mv = motionPositions.get(id);
      if (!mv) continue;
      controls.push(animate(mv.x, targetX, TRANSITION));
      controls.push(animate(mv.y, targetY, TRANSITION));
      controls.push(animate(mv.size, targetSize, TRANSITION));
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

  // Label angle for each child node: prefer left/right, avoid parent edge and grandchildren.
  const labelAngleDeg = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const childId of focus.childIds) {
      const childWP = graph.positions[childId];
      const grandchildIds = graph.nodes[childId].childIds;

      // Preferred direction: 0 for right, π for left, based on child position relative to focus
      const preferredAngle = childWP.x > focusPos.x ? 0 : Math.PI;

      if (grandchildIds.length === 0) {
        result[childId] = (preferredAngle * 180) / Math.PI;
        continue;
      }

      // Angle from child back to parent (where the connecting edge comes from)
      const parentAngle = Math.atan2(
        focusPos.y - childWP.y,
        focusPos.x - childWP.x,
      );

      // Angles of all grandchildren, sorted
      const angles = grandchildIds
        .map((gcId) => {
          const gc = graph.positions[gcId];
          return Math.atan2(gc.y - childWP.y, gc.x - childWP.x);
        })
        .sort((a, b) => a - b);

      // Find all gaps, excluding the one containing the parent edge
      const gaps: { midAngle: number }[] = [];
      for (let i = 0; i < angles.length; i++) {
        const curr = angles[i];
        const next = angles[(i + 1) % angles.length];
        const gapSize = (next - curr + 2 * Math.PI) % (2 * Math.PI);
        const midAngle = curr + gapSize / 2;

        // Check if parent edge is in this gap
        const parentInGap =
          (parentAngle - curr + 2 * Math.PI) % (2 * Math.PI) < gapSize;

        if (!parentInGap) {
          gaps.push({ midAngle });
        }
      }

      // Find gap closest to preferred direction
      let bestAngle = preferredAngle;
      if (gaps.length > 0) {
        let minDistance = Math.PI;
        for (const gap of gaps) {
          // Angular distance (shortest path around circle)
          let dist = Math.abs(gap.midAngle - preferredAngle);
          if (dist > Math.PI) dist = 2 * Math.PI - dist;

          if (dist < minDistance) {
            minDistance = dist;
            bestAngle = gap.midAngle;
          }
        }
      }

      result[childId] = (bestAngle * 180) / Math.PI;
    }
    return result;
  }, [focusId, graph]);

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
          onClick={() => onFocus(focus.parentId!)}
          onHover={onHover}
          id={focus.parentId}
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
        const strokeW =
          role === "grandchild" ? 0.5 : role === "focus" ? 4 : 1.5;
        const fill = role === "grandchild" ? "#3a3a3a" : node.color.base;
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
            <NodeShape
              angle={info.tipAngleDeg}
              sizeMV={mv.size}
              fill={fill}
              strokeW={strokeW}
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
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    color: "#111827",
                    padding: "0 6px",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {node.title}
                </div>
              </foreignObject>
            )}

            {role === "child" && (
              <ChildChip
                label={node.title}
                labelAngleDeg={labelAngleDeg[id] ?? 0}
                onClick={() => onFocus(id)}
                onHover={onHover}
                id={id}
              />
            )}
          </motion.g>
        );
      })}
    </svg>
  );
}
