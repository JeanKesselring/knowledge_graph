/** Tiny deterministic hash → 32-bit unsigned int. */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG. Returns a function that yields floats in [0, 1). */
export function seededRng(seed: string | number) {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type NodeColor = { base: string; deep: string };

/**
 * Pastel palette paired with a saturated counterpart for the tail-tip stop
 * of the teardrop gradient. The head reads as the pastel `base`; the tail
 * pulls toward `deep`.
 */
const PALETTE: NodeColor[] = [
  { base: "#FBE38E", deep: "#E0A800" }, // yellow
  { base: "#B8E3A4", deep: "#2E7D32" }, // green
  { base: "#F6B3B6", deep: "#D32F2F" }, // pink → red
  { base: "#F7B97A", deep: "#E65100" }, // orange
  { base: "#A6CFEA", deep: "#1565C0" }, // blue
  { base: "#D9C7EF", deep: "#6A1B9A" }, // lavender
];

export function colorForId(id: string): NodeColor {
  const rng = seededRng(`color:${id}`);
  return PALETTE[Math.floor(rng() * PALETTE.length)];
}
