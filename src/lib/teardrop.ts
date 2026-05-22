/**
 * SVG path for a teardrop centered at (0, 0) with main radius R, tail along +x.
 *
 * Construction follows the design spec:
 *   - A main circle of radius R (the visible node body).
 *   - Two construction circles of radius r = R/4, each externally tangent to the
 *     main circle and tangent to each other. They are NOT drawn — they only
 *     define the concave arcs that bound the small "tail" appendage.
 *   - The tail is the curvilinear-triangle interstitial gap between the three
 *     circles, attached to the main circle on the right.
 *
 * Geometry: small-circle centers sit at (5R/4 · cos α, ±5R/4 · sin α) with
 *   sin α = 1/5, cos α = √24 / 5 = 2√6 / 5.
 * Tangent points:
 *   TU = ( R·cos α, −R·sin α )         big ↔ top-small
 *   TL = ( R·cos α, +R·sin α )         big ↔ bottom-small
 *   Tm = ( 5R/4·cos α, 0 )             small ↔ small  (tail tip)
 *
 * Returned path is a single string with two sub-paths (big circle + tail), both
 * traversed in the same direction so the default `nonzero` fill rule fills the
 * union cleanly.
 */
export function teardropPath(R: number): string {
  const r = R / 4;
  const cosA = Math.sqrt(24) / 5;
  const sinA = 1 / 5;

  const TUx = R * cosA;
  const TUy = -R * sinA;
  const TLx = R * cosA;
  const TLy = R * sinA;
  const Tmx = (5 * R) / 4 * cosA;

  return [
    // Big circle, two CW half-arcs.
    `M ${-R} 0`,
    `A ${R} ${R} 0 0 1 ${R} 0`,
    `A ${R} ${R} 0 0 1 ${-R} 0`,
    `Z`,
    // Tail: TU → Tm → TL, closed by chord TL → TU (which lies on the big
    // circle's edge so there is no visible seam). Small-arc sweeps bow the
    // sides inward toward the centerline, giving the pinched teardrop tip.
    `M ${TUx} ${TUy}`,
    `A ${r} ${r} 0 0 1 ${Tmx} 0`,
    `A ${r} ${r} 0 0 1 ${TLx} ${TLy}`,
    `Z`,
  ].join(" ");
}
