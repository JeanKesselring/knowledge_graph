'use client';

import { useCallback, useMemo, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Topic {
  index: number;
  title: string;
  summary: string;
  keywords: string[];
  parents: number[];
}

export interface GraphData {
  'Lecture Title': string;
  topics: Topic[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const W = 800, H = 520;
const CX = W / 2, CY = H / 2 + 10;
const CENTER_R = 56;
const CHILD_R = 38;
const LEAF_R = 5.5;
const CHILD_DIST = 165;
const LEAF_DIST = 110;
const TAIL_LEN = 36;
const CHILD_TAIL_FACTOR = 0.88;
const PARENT_DIR = Math.PI / 2; // gap direction (toward parent = downward)
const STROKE = '#333';
const PALETTE = ['#f08080', '#a8d8a8', '#f4b06a', '#a8c8e8', '#d4a8d4', '#a8d8c8', '#f4d0a0'];
const ANIM_MS = 600;
const ZOOM_ROOT = 1.0;   // zoom level when at root
const ZOOM_DEEP = 1.3;   // zoom level when at any non-root node

// ── Pure utilities ─────────────────────────────────────────────────────────────
function seededRandom(seed: number): number {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

function wrapWords(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && next.length > maxChars) { lines.push(cur); cur = w; }
    else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

function childAngles(count: number, parentAngle: number): number[] {
  if (!count) return [];
  const gapHalf = Math.PI / 4;
  const arcStart = parentAngle + gapHalf;
  const totalArc = 2 * Math.PI - 2 * gapHalf;
  const step = totalArc / (count + 1);
  return Array.from({ length: count }, (_, i) => {
    const base = arcStart + step * (i + 1);
    const jitter = (seededRandom(i * 17 + count * 3) - 0.5) * 0.7;
    return base + jitter;
  });
}

function leafAngles(count: number, parentInwardAngle: number): number[] {
  if (!count) return [];
  const gapHalf = Math.PI / 4;
  const arcStart = parentInwardAngle + gapHalf;
  const totalArc = 2 * Math.PI - 2 * gapHalf;
  const step = totalArc / count;
  return Array.from({ length: count }, (_, i) => arcStart + step * i + step / 2);
}

function tailPath(cx: number, cy: number, r: number, tailAngle: number, tailLen: number): string {
  const cutout = Math.PI / 6;
  const p1a = tailAngle - cutout, p2a = tailAngle + cutout;
  const p1x = cx + Math.cos(p1a) * r, p1y = cy + Math.sin(p1a) * r;
  const p2x = cx + Math.cos(p2a) * r, p2y = cy + Math.sin(p2a) * r;
  const tx = cx + Math.cos(tailAngle) * (r + tailLen);
  const ty = cy + Math.sin(tailAngle) * (r + tailLen);
  const t = tailLen * 0.55, s = tailLen * 0.32;
  const c1x = p1x + (-Math.sin(p1a)) * t, c1y = p1y + Math.cos(p1a) * t;
  const c2x = tx - Math.cos(tailAngle) * s, c2y = ty - Math.sin(tailAngle) * s;
  const c3x = c2x, c3y = c2y;
  const c4x = p2x + Math.sin(p2a) * t, c4y = p2y - Math.cos(p2a) * t;
  const f = (n: number) => n.toFixed(2);
  return [
    `M ${f(p1x)} ${f(p1y)}`,
    `C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(tx)} ${f(ty)}`,
    `C ${f(c3x)} ${f(c3y)}, ${f(c4x)} ${f(c4y)}, ${f(p2x)} ${f(p2y)}`,
    'Z',
  ].join(' ');
}

// ── Graph builder ──────────────────────────────────────────────────────────────
function buildGraph(data: GraphData) {
  const nodeMap: Record<number, Topic> = {};
  const childrenMap: Record<number, number[]> = {};
  const parentMap: Record<number, number[]> = {};
  const branchColor: Record<number, string> = {};

  data.topics.forEach(t => {
    nodeMap[t.index] = t;
    childrenMap[t.index] = [];
    parentMap[t.index] = [];
  });
  data.topics.forEach(t => t.parents.forEach(p => {
    if (p in childrenMap) childrenMap[p].push(t.index);
    if (t.index in parentMap) parentMap[t.index].push(p);
  }));

  const root = data.topics.find(t => t.parents.length === 0) ?? data.topics[0];
  (childrenMap[root.index] ?? []).forEach((ci, i) => {
    const color = PALETTE[i % PALETTE.length];
    const paint = (idx: number) => { branchColor[idx] = color; (childrenMap[idx] ?? []).forEach(paint); };
    paint(ci);
  });
  branchColor[root.index] = '#e87878';

  return { nodeMap, childrenMap, parentMap, branchColor, rootIndex: root.index };
}

// ── Fixed layout ───────────────────────────────────────────────────────────────
// All positions and angles are computed ONCE and never change. Navigation moves
// the camera, not the nodes. This eliminates all positional/rotational snapping.
interface FixedNode {
  idx: number;
  cx: number;
  cy: number;
  parentIdx: number | null;
  tailAngle: number;                       // fixed: direction from this node toward its parent
  kwDots: Array<{ x: number; y: number }>; // fixed: keyword dot positions (leaf topic nodes only)
}

function buildFixedLayout(
  rootIndex: number,
  childrenMap: Record<number, number[]>,
  nodeMap: Record<number, Topic>,
): Record<number, FixedNode> {
  const layout: Record<number, FixedNode> = {};

  function place(idx: number, cx: number, cy: number, tailAngle: number, parentIdx: number | null) {
    const hasChildren = (childrenMap[idx] ?? []).length > 0;
    const keywords = nodeMap[idx]?.keywords ?? [];
    // Pre-compute keyword dot positions for leaf nodes — fixed forever
    const kwDots: Array<{ x: number; y: number }> = (!hasChildren && keywords.length > 0)
      ? leafAngles(keywords.length, tailAngle).map(a => ({
          x: cx + Math.cos(a) * LEAF_DIST,
          y: cy + Math.sin(a) * LEAF_DIST,
        }))
      : [];

    layout[idx] = { idx, cx, cy, parentIdx, tailAngle, kwDots };

    const children = childrenMap[idx] ?? [];
    const angles = childAngles(children.length, tailAngle);
    children.forEach((childIdx, i) => {
      const dist = CHILD_DIST * (0.78 + seededRandom(childIdx * 31 + 7) * 0.35);
      const childCx = cx + Math.cos(angles[i]) * dist;
      const childCy = cy + Math.sin(angles[i]) * dist;
      // Child's tail points back toward this parent node — fixed forever
      const childTailAngle = Math.atan2(cy - childCy, cx - childCx);
      place(childIdx, childCx, childCy, childTailAngle, idx);
    });
  }

  place(rootIndex, CX, CY, PARENT_DIR, null);
  return layout;
}

// ── Graph distances (BFS, bidirectional) ───────────────────────────────────────
function getDistances(
  fromIdx: number,
  childrenMap: Record<number, number[]>,
  parentMap: Record<number, number[]>,
): Record<number, number> {
  const dist: Record<number, number> = {};
  const queue: [number, number][] = [[fromIdx, 0]];
  while (queue.length) {
    const [idx, d] = queue.shift()!;
    if (idx in dist) continue;
    dist[idx] = d;
    (childrenMap[idx] ?? []).forEach(c => queue.push([c, d + 1]));
    (parentMap[idx] ?? []).forEach(p => queue.push([p, d + 1]));
  }
  return dist;
}

// ── KnowledgeGraph ─────────────────────────────────────────────────────────────
export function KnowledgeGraph({ data }: { data: GraphData }) {
  const { nodeMap, childrenMap, parentMap, branchColor, rootIndex } = useMemo(() => buildGraph(data), [data]);
  const graphTitle = data['Lecture Title'];

  // Fixed layout: computed once, positions and angles never change
  const fixedLayout = useMemo(
    () => buildFixedLayout(rootIndex, childrenMap, nodeMap),
    [rootIndex, childrenMap, nodeMap],
  );
  // Stable idx order: DOM elements never reorder, preserving CSS transition state
  const allNodes = useMemo(
    () => Object.values(fixedLayout).sort((a, b) => a.idx - b.idx),
    [fixedLayout],
  );

  const [currentIdx, setCurrentIdx] = useState(rootIndex);
  const [history, setHistory] = useState<number[]>([rootIndex]);

  const navigate = useCallback((idx: number) => {
    setCurrentIdx(idx);
    setHistory(h => {
      const pos = h.indexOf(idx);
      return pos >= 0 ? h.slice(0, pos + 1) : [...h, idx];
    });
  }, []);

  // Camera: translate + scale. The wrapper <g> moves so the focused node appears at (CX, CY).
  // Zoom is deeper for non-root nodes, giving a "zoom in" feel on first navigation.
  const camera = fixedLayout[currentIdx];
  const zoomScale = currentIdx === rootIndex ? ZOOM_ROOT : ZOOM_DEEP;
  const tx = CX - camera.cx * zoomScale;
  const ty = CY - camera.cy * zoomScale;

  const distances = useMemo(
    () => getDistances(currentIdx, childrenMap, parentMap),
    [currentIdx, childrenMap, parentMap],
  );

  const rForDist = (d: number): number =>
    d === 0 ? CENTER_R : d === 1 ? CHILD_R : d === 2 ? LEAF_R : 0;

  const isRoot = currentIdx === rootIndex;
  const currentNode = nodeMap[currentIdx];
  const parentIdx = currentNode.parents[0] ?? null;
  const canNavParent = !isRoot && parentIdx !== null;
  const parentLabel = isRoot ? graphTitle : (parentIdx !== null ? nodeMap[parentIdx]?.title ?? '' : '');

  // Parent link geometry — anchored to camera (focused node) in world space
  const linkStart = CENTER_R + TAIL_LEN + 2;
  const linkEnd = linkStart + 72;
  const plx1 = camera.cx + Math.cos(PARENT_DIR) * linkStart;
  const ply1 = camera.cy + Math.sin(PARENT_DIR) * linkStart;
  const plx2 = camera.cx + Math.cos(PARENT_DIR) * linkEnd;
  const ply2 = camera.cy + Math.sin(PARENT_DIR) * linkEnd;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f0ebe3] p-5">
      <div
        className="relative bg-[#cde8f5] rounded-[18px] px-7 pt-6 pb-5 shadow-[0_2px_16px_rgba(0,0,0,0.08)]"
        style={{ width: 860, maxWidth: '100%' }}
      >
        <div className="text-[22px] font-extrabold text-[#1a1a2e] mb-2 tracking-tight">
          Knowledge Graph
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full block overflow-visible"
          style={{ height: 560 }}
        >
          {/* ── Camera wrapper ────────────────────────────────────────────────────
              translate: moves so focused node appears at screen center (CX, CY)
              scale: zoom level — deeper nodes zoom in relative to root
              transformOrigin '0 0': scale happens around SVG origin (correct math)
              Text sizes inside use /zoomScale to appear at constant screen size. */}
          <g style={{
            transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${zoomScale})`,
            transition: `transform ${ANIM_MS}ms ease`,
            transformOrigin: '0 0',
          }}>

            {/* ── Parent link ───────────────────────────────────────────────── */}
            <g
              onClick={canNavParent ? () => navigate(parentIdx!) : undefined}
              style={{ cursor: canNavParent ? 'pointer' : 'default' }}
              className={canNavParent ? 'group' : ''}
            >
              <line
                x1={plx1} y1={ply1} x2={plx2} y2={ply2}
                stroke={STROKE} strokeWidth={2.6}
                className={canNavParent ? 'transition-opacity group-hover:opacity-55' : ''}
              />
              <text
                x={plx2} y={ply2 + 17 / zoomScale} textAnchor="middle"
                fontSize={12 / zoomScale} fontWeight={500} fill="#333"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                className={canNavParent ? 'transition-opacity group-hover:opacity-55' : ''}
              >{parentLabel}</text>
              <rect
                x={Math.min(plx1, plx2) - 22} y={Math.min(ply1, ply2) - 8}
                width={Math.abs(plx2 - plx1) + 44} height={Math.abs(ply2 - ply1) + 38}
                fill="transparent" style={{ pointerEvents: 'all' }}
              />
            </g>

            {/* ── Edges ─────────────────────────────────────────────────────── */}
            {allNodes.map(n => {
              if (n.parentIdx === null) return null;
              const dN = distances[n.idx] ?? 99;
              const dP = distances[n.parentIdx] ?? 99;
              if (Math.min(dN, dP) > 2) return null;
              const par = fixedLayout[n.parentIdx];
              return (
                <line key={`edge-${n.idx}`}
                  x1={par.cx} y1={par.cy} x2={n.cx} y2={n.cy}
                  stroke="#2a2a2a" strokeWidth={dN === 1 ? 1.8 : 1.1}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}

            {/* ── Keyword dots — fixed positions, never recomputed ──────────── */}
            {allNodes.map(n => {
              const d = distances[n.idx] ?? 99;
              if (d !== 1 || n.kwDots.length === 0) return null;
              return n.kwDots.map((dot, li) => (
                <g key={`kw-${n.idx}-${li}`}>
                  <line x1={n.cx} y1={n.cy} x2={dot.x} y2={dot.y}
                    stroke="#5a5a5a" strokeWidth={1.1} style={{ pointerEvents: 'none' }} />
                  <circle cx={dot.x} cy={dot.y} r={LEAF_R}
                    fill="#4a4a4a" stroke={STROKE} strokeWidth={0.8}
                    style={{ pointerEvents: 'none' }} />
                </g>
              ));
            })}

            {/* ── Topic nodes ───────────────────────────────────────────────────
                Stable DOM order (by idx) → CSS r + fill transitions fire correctly.
                tailAngle is FIXED — never recomputed from camera, never snaps.
                Color: dark grey for d>1, actual branch color for d≤1 (CSS fill transition). */}
            {allNodes.map(n => {
              const d = distances[n.idx] ?? 99;
              const r = rForDist(d);
              const isClickable = d > 0 && d <= 2;
              const color = branchColor[n.idx] ?? '#e87878';
              const nodeColor = d <= 1 ? color : '#5a5a5a';
              const tailLen = d === 0 ? TAIL_LEN : TAIL_LEN * CHILD_TAIL_FACTOR;
              // Label placed in direction away from parent (opposite of tail)
              const labelAngle = n.tailAngle + Math.PI;

              return (
                <g
                  key={`node-${n.idx}`}
                  onClick={isClickable ? () => navigate(n.idx) : undefined}
                  style={{
                    cursor: isClickable ? 'pointer' : 'default',
                    transform: 'translate(0,0)', // stacking context for zIndex
                    zIndex: d === 0 ? 3 : d === 1 ? 2 : 1,
                  }}
                  className={d === 1 ? 'group' : ''}
                >
                  {d <= 1 && r > 0 && (
                    <path
                      d={tailPath(n.cx, n.cy, r, n.tailAngle, tailLen)}
                      stroke={STROKE}
                      strokeWidth={d === 0 ? 2 : 1.5} strokeLinejoin="round"
                      style={{ fill: nodeColor, transition: `fill ${ANIM_MS}ms ease` }}
                    />
                  )}
                  <circle
                    cx={n.cx} cy={n.cy}
                    r={Math.max(0, r)}
                    stroke={STROKE}
                    strokeWidth={d === 0 ? 2 : d === 1 ? 1.5 : 0.8}
                    style={{
                      fill: nodeColor,
                      r: `${Math.max(0, r)}`,
                      transition: `r ${ANIM_MS}ms ease, fill ${ANIM_MS}ms ease`,
                    } as React.CSSProperties}
                    className={d === 1 ? 'transition-[filter] group-hover:brightness-110' : ''}
                  />
                  {d === 0 && (
                    <CenterLabel cx={n.cx} cy={n.cy} title={nodeMap[n.idx].title} scale={zoomScale} />
                  )}
                  {d === 1 && r > 0 && (
                    <ChildLabel
                      cx={n.cx} cy={n.cy}
                      title={nodeMap[n.idx].title}
                      angle={labelAngle}
                      scale={zoomScale}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
        {history.length > 1 && (
          <div className="text-xs text-[#555] mt-2">
            {history.map((idx, i) => {
              const label = nodeMap[idx]?.title ?? graphTitle;
              return i === history.length - 1
                ? <strong key={idx}>{label}</strong>
                : (
                  <span key={idx}>
                    <span
                      className="text-[#2a7ab5] underline cursor-pointer hover:text-[#1a5a8a]"
                      onClick={() => navigate(idx)}
                    >{label}</span>
                    {' › '}
                  </span>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CenterLabel ────────────────────────────────────────────────────────────────
// Font size divided by scale so text appears at constant screen size regardless of zoom.
function CenterLabel({ cx, cy, title, scale }: { cx: number; cy: number; title: string; scale: number }) {
  const lines = wrapWords(title, 11, 3);
  const lineH = 15 / scale;
  const midY = cy - CENTER_R * 0.15;
  const startY = midY - ((lines.length - 1) * lineH) / 2;
  return (
    <text textAnchor="middle" fontSize={13 / scale} fontWeight={800} fill="#1a1a2e"
      style={{ pointerEvents: 'none', userSelect: 'none' }}>
      {lines.map((line, li) => (
        <tspan key={li} x={cx} y={(startY + li * lineH + lineH * 0.36).toFixed(1)}>{line}</tspan>
      ))}
    </text>
  );
}

// ── ChildLabel ─────────────────────────────────────────────────────────────────
// All measurements divided by scale for constant screen size.
// angle = direction away from parent (where label is placed).
function ChildLabel({ cx, cy, title, angle, scale }: {
  cx: number; cy: number; title: string; angle: number; scale: number;
}) {
  const lines = wrapWords(title, 10, 2);
  const lineH = 14 / scale;
  const padX = 7 / scale, padY = 4 / scale;
  const charW = 6.6 / scale;
  const boxW = Math.max(46 / scale, Math.max(...lines.map(l => l.length)) * charW + padX * 2);
  const boxH = lines.length * lineH + padY * 2;
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const proj = Math.abs(cosA) * boxW / 2 + Math.abs(sinA) * boxH / 2;
  const dist = CHILD_R + 14 / scale + proj;
  const bx = cx + cosA * dist;
  const by = cy + sinA * dist;
  const startY = by - ((lines.length - 1) * lineH) / 2;
  return (
    <g style={{ pointerEvents: 'none', userSelect: 'none' }}>
      <rect
        x={(bx - boxW / 2).toFixed(1)} y={(by - boxH / 2).toFixed(1)}
        width={boxW.toFixed(1)} height={boxH.toFixed(1)}
        rx={5 / scale} ry={5 / scale}
        fill="rgba(255,255,255,0.82)" stroke={STROKE} strokeWidth={0.8 / scale}
      />
      <text textAnchor="middle" fontSize={12 / scale} fontWeight={600} fill="#1a1a2e">
        {lines.map((line, li) => (
          <tspan key={li} x={bx.toFixed(1)} y={(startY + li * lineH + lineH * 0.36).toFixed(1)}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}
