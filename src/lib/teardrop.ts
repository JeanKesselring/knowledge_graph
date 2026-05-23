/**
 * SVG path for a unit-radius teardrop.
 *
 * Normalized from the symmetric hand-drawn shape in /teardrop_correct.svg:
 *   - head center at (0, 0)
 *   - head radius 1
 *   - tail tip exactly on the +x axis at (1.3643, 0)
 *
 * Every point has a perfect ±y partner — the previous tilted version is gone.
 *
 * Consumers rotate this path so the tail points at the parent and scale it
 * to the desired pixel size via motion.path's `rotate` / `scale` props.
 */
export const TEARDROP_PATH =
  "M -1 0 " +
  "C -1 -0.5523 -0.5523 -1 0 -1 " +
  "C 0.3285 -1 0.62 -0.8416 0.8024 -0.5969 " +
  "C 0.8334 -0.5553 0.8681 -0.4972 0.9091 -0.4318 " +
  "C 0.9496 -0.367 0.9961 -0.2958 1.0499 -0.2298 " +
  "C 1.1334 -0.1272 1.2360 -0.0356 1.3643 0 " +
  "C 1.2360 0.0356 1.1334 0.1272 1.0499 0.2298 " +
  "C 0.9961 0.2958 0.9496 0.367 0.9091 0.4318 " +
  "C 0.8681 0.4972 0.8334 0.5553 0.8024 0.5969 " +
  "C 0.62 0.8416 0.3285 1 0 1 " +
  "C -0.5523 1 -1 0.5523 -1 0 Z";

export function teardropPath(_r?: number): string {
  return TEARDROP_PATH;
}
