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

/** Pastel palette inspired by the reference (yellow, green, pink, orange, blue). */
const PALETTE = [
  "#FBE38E", // yellow
  "#B8E3A4", // green
  "#F6B3B6", // pink
  "#F7B97A", // orange
  "#A6CFEA", // blue
  "#D9C7EF", // lavender
];

export function colorForId(id: string): string {
  const rng = seededRng(`color:${id}`);
  return PALETTE[Math.floor(rng() * PALETTE.length)];
}
