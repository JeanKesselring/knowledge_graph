# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Build for production
npm start            # Run production server
npm run lint         # Lint code
```

The dev server has HMR enabled and reloads automatically on file changes.

## Architecture Overview

This is a **knowledge graph visualization** of a lecture's topic hierarchy. The architecture has three main phases:

### 1. Data & Graph Building (`src/lib/graph.ts`)

**Input:** `topics.json` — an array of topics with parent references and metadata.

**Output:** `GraphData` object containing:
- `nodes`: lookup table of node metadata (title, summary, keywords, tree relationships)
- `positions`: world-space coordinates for each node (x, y, angle to parent)
- `rootId`: virtual root node representing the lecture

**Algorithm:** 
- Create nodes in two passes: first instantiate all nodes, then wire up `childIds`
- Assign depth via BFS from root
- Compute positions via `layoutPositions()` — a depth-first post-order traversal that places each child radially around its parent, scaled by depth (farther depths are closer together via `DEPTH_SCALE = 3`)
- All positions are deterministic: seeded by node ID using FNV-1a hash + mulberry32 PRNG for stable layout across reloads

**Key constants:**
- `BASE_CHILD_DISTANCE = 240` — world units from parent to children at depth 0
- `DEPTH_SCALE = 3` — scales distances down by 3× per level
- `ANGLE_JITTER = 5°` and `DISTANCE_JITTER = ±12.5%` — jitter is seeded by node ID for determinism

### 2. Page & UI State (`src/components/KnowledgeGraphPage.tsx`)

**State:**
- `focusId` — the root node currently being viewed (all rendering is relative to this node)
- `hover` — current hovered node for the HoverCard popup
- `sidebarOpen` — whether the right sidebar is visible

**Children:**
- `KnowledgeGraph` — the SVG visualization (focus node + its children and grandchildren)
- `Sidebar` — displays focused node's title, summary, keywords
- `HoverCard` — tooltip showing hovered node details
- `Header` — top navigation

### 3. Visualization (`src/components/KnowledgeGraph.tsx`)

**Role-based rendering:** Nodes are categorized into roles:
- `focus` — the currently viewed node (large, center)
- `super` — the parent of focus (animated projection to viewport edge)
- `child` — direct children of focus (medium size, arranged radially with labels)
- `grandchild` — children of each child (small dots, avoid overlapping labels)
- `hidden` — all others (opacity: 0)

**Rendering pipeline:**
1. Build `renderInfo` — maps node ID to (role, tip angle) for all visible nodes
2. Compute `labelAngleDeg` — determines label placement for each child node:
   - Prefers left (180°) or right (0°) based on child's x-position relative to focus
   - Avoids the angular gap where the parent connection comes from
   - Avoids gaps occupied by grandchildren
   - Selects the remaining gap whose midpoint is closest to the preferred horizontal direction
3. Render connections (lines) and nodes (SVG path + label chips)

**Motion & Animation:**
- Each node has a `MotionValue` for x/y/size tied to its world position scaled for the viewport
- Labels are rendered as `<foreignObject>` placed relative to the node center via trigonometric offset based on `labelAngleDeg`
- Nodes animate smoothly when focus changes via Framer Motion's spring transitions

**Key SVG mechanics:**
- Teardrop shapes (`TEARDROP_PATH` from `src/lib/teardrop.ts`) are unit-radius, normalized with head at (0, 0)
- Each teardrop is rotated via SVG `transform` attribute (not Framer Motion, to ensure pivot is exact) using `tipAngleDeg` so the tail points toward the parent
- Scaling is done via MotionValue to react to zoom/pan
- `foreignObject` elements (chip labels) are children of `motion.g` positioned at node screen coordinates, so chip offsets are relative to node center

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/graph.ts` | Tree building and world-space layout algorithm |
| `src/lib/types.ts` | Type definitions for graph data |
| `src/lib/random.ts` | Seeded RNG (FNV-1a + mulberry32) and color assignment |
| `src/lib/teardrop.ts` | SVG teardrop path definition |
| `src/components/KnowledgeGraph.tsx` | Main visualization: node rendering, label placement, animations |
| `src/components/KnowledgeGraphPage.tsx` | Page layout and state management |
| `src/data/topics.json` | Topic hierarchy input data |

## Important Concepts

### World Space vs Screen Space

- **World space:** Node positions from `graph.positions` (computed once, stable across zoom/pan)
- **Screen space:** Where nodes appear on the viewport (derived from world position + zoom + pan transform)
- Angles are **preserved under zoom and pan** (linear transformations don't rotate directions), so label angles computed in world space work directly in screen space

### Seeded Layout

Every node's position is deterministic via `seededRng(seed)`, where seed is `"pos:${nodeId}"`:
- Same seed always produces the same random sequence
- Angle jitter and distance jitter are deterministic per node
- Reload the page → same layout

### Label Placement Algorithm (Gap-Aware)

For each child node with grandchildren:
1. Calculate preferred direction (0° = right, π = left) based on child's x-position
2. Find angle of parent edge (direction from child back to parent)
3. Get angles of all grandchildren, sorted
4. Find all gaps between grandchildren, excluding the gap containing the parent edge
5. Among remaining gaps, find the one whose midpoint is closest to preferred direction (shortest angular distance)
6. Place label at midpoint of that gap, at distance `SIZE_CHILD + 80 + 20` (px) in x-direction, `SIZE_CHILD + 80` (px) in y-direction

This avoids label-grandchild overlap while preserving left/right preference.

### Framer Motion Patterns

- `MotionValue` objects drive updates without triggering React re-renders (efficient for frequent updates)
- `useTransform` computes derived values reactively from MotionValues
- SVG `transform` attribute is set imperatively via `useMotionValueEvent` to avoid React lifecycle delays
- Spring transitions use `{ type: "spring", stiffness: 70, damping: 18, mass: 0.9 }`

## Common Development Tasks

**Modifying node appearance:** Adjust colors in `src/lib/random.ts` (PALETTE array), or node size constants in `KnowledgeGraph.tsx` (SIZE_FOCUS, SIZE_CHILD, SIZE_GRANDCHILD).

**Changing layout geometry:** Adjust `BASE_CHILD_DISTANCE`, `DEPTH_SCALE`, `ANGLE_JITTER`, or `DISTANCE_JITTER` in `src/lib/graph.ts`.

**Tweaking label placement:** Edit the `labelAngleDeg` useMemo in `KnowledgeGraph.tsx`. The current algorithm prefers horizontal placement and avoids parent edges and grandchildren.

**Changing animation feel:** Adjust the `TRANSITION` constant in `KnowledgeGraph.tsx` (spring stiffness/damping/mass) or animation timings in useEffect hooks.

**Adding data:** Replace `src/data/topics.json` with new topic data matching the `RawTopics` schema (see `src/lib/types.ts`).

## TypeScript & Paths

- `@/*` resolves to `src/*` (configured in tsconfig.json)
- Strict mode is enabled (`strict: true`)
- JSON modules are allowed (`resolveJsonModule: true`)

## Known Patterns

- **Two-pass node building:** First create all nodes (computing their parents), then wire up childIds. This avoids issues with nodes referencing children that don't exist yet.
- **Role-based rendering:** All render logic keys off the node's "role" (focus/super/child/grandchild/hidden) rather than checking parentId each time.
- **Stable SVG transform pivot:** The teardrop path's local (0, 0) is the head center, which matches the parent's (0, 0), so rotating via SVG transform attribute keeps the head exactly at the connection point.
