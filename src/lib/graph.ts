import type { GraphData, GraphNode, RawTopics, WorldPos } from "./types";
import { colorForId, seededRng } from "./random";

export const ROOT_ID = "root";

/** Distance (world units) from root to its children. */
export const BASE_CHILD_DISTANCE = 240;
/** Each level deeper, distances shrink by this factor. */
export const DEPTH_SCALE = 3;
/** Random angle jitter applied to each child, in radians. */
const ANGLE_JITTER = (5 * Math.PI) / 180;
/** Random distance variation factor (±). */
const DISTANCE_JITTER = 0.125;

export function buildGraph(raw: RawTopics): GraphData {
  const nodes: Record<string, GraphNode> = {};

  // Virtual root that represents the lecture.
  nodes[ROOT_ID] = {
    id: ROOT_ID,
    title: raw["Lecture Title"],
    summary: "Lecture overview — every topic in this lecture sits beneath this node.",
    keywords: [],
    parentId: null,
    childIds: [],
    depth: 0,
    color: colorForId(ROOT_ID),
  };

  // First pass: create every topic node, picking the first parent as canonical.
  for (const t of raw.topics) {
    const id = String(t.index);
    const parentId = t.parents.length > 0 ? String(t.parents[0]) : ROOT_ID;
    nodes[id] = {
      id,
      title: t.title,
      summary: t.summary,
      keywords: t.keywords,
      parentId,
      childIds: [],
      depth: 0,
      color: colorForId(id),
    };
  }

  // Second pass: wire up childIds in the order topics appear.
  for (const t of raw.topics) {
    const id = String(t.index);
    const parentId = nodes[id].parentId!;
    nodes[parentId].childIds.push(id);
  }

  // Assign depth via BFS from the root.
  const queue: string[] = [ROOT_ID];
  nodes[ROOT_ID].depth = 0;
  while (queue.length) {
    const id = queue.shift()!;
    const d = nodes[id].depth;
    for (const c of nodes[id].childIds) {
      nodes[c].depth = d + 1;
      queue.push(c);
    }
  }

  const positions = layoutPositions(nodes);
  return { rootId: ROOT_ID, nodes, positions };
}

function layoutPositions(nodes: Record<string, GraphNode>): Record<string, WorldPos> {
  const positions: Record<string, WorldPos> = {};

  // Root sits at the origin; pick an arbitrary super-direction so root's children
  // are spaced like every other node.
  positions[ROOT_ID] = { x: 0, y: 0, superAngle: Math.PI / 2 };

  const stack: string[] = [ROOT_ID];
  while (stack.length) {
    const parentId = stack.pop()!;
    const parent = nodes[parentId];
    const parentPos = positions[parentId];
    const children = parent.childIds;
    const n = children.length;
    if (n === 0) continue;

    const baseDistance = BASE_CHILD_DISTANCE / Math.pow(DEPTH_SCALE, parent.depth);
    const spacing = (2 * Math.PI) / (n + 1);

    for (let i = 0; i < n; i++) {
      const childId = children[i];
      const rng = seededRng(`pos:${childId}`);
      const angleJitter = (rng() - 0.5) * 2 * ANGLE_JITTER;
      const distFactor = 1 + (rng() - 0.5) * 2 * DISTANCE_JITTER;
      const angle = parentPos.superAngle + spacing * (i + 1) + angleJitter;
      const distance = baseDistance * distFactor;
      const x = parentPos.x + Math.cos(angle) * distance;
      const y = parentPos.y + Math.sin(angle) * distance;
      // The child's super-direction is the opposite of how we arrived at it.
      positions[childId] = { x, y, superAngle: angle + Math.PI };
      stack.push(childId);
    }
  }

  return positions;
}
