export type RawTopic = {
  index: number;
  title: string;
  summary: string;
  keywords: string[];
  parents: number[];
};

export type RawTopics = {
  "Lecture Title": string;
  topics: RawTopic[];
};

export type GraphNode = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  parentId: string | null;
  childIds: string[];
  /** depth from root in the canonical tree */
  depth: number;
  /** stable color seeded from id; `base` is the head/uniform fill and `deep`
   *  is the saturated color at the tail tip of the gradient */
  color: { base: string; deep: string };
};

export type WorldPos = {
  x: number;
  y: number;
  /** angle (radians) from this node back to its parent (super direction) */
  superAngle: number;
};

export type GraphData = {
  rootId: string;
  nodes: Record<string, GraphNode>;
  positions: Record<string, WorldPos>;
};
