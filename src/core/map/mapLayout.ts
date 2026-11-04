// Where things go on the world map (Task 006). Pure and unit-tested. Map coordinates are logical px on a
// map that may be wider than the screen; the scene scrolls it horizontally.

export interface MapPoint {
  x: number;
  y: number;
}

export const MAP = {
  /** First dot's x, distance between dots, and the dots' wavy heights (repeating). */
  firstX: 230,
  dotGap: 300,
  dotYs: [440, 330, 430, 320],
  dotR: 54,
  /** Tap target around a dot (square side; covers the dot, its stars and the avatar on it). */
  dotHit: 150,
  /** Teaser signposts after the last dot. */
  teaserGap: 270,
  teaserY: 390,
  teaserHit: 170,
  /** Space after the last item. */
  endPad: 230,
  /** Where the current dot sits on a scrolling map (fraction of the screen width). */
  focus: 0.42,
  /** Ground strip at the bottom of the screen. */
  groundY: 610,
  /** Avatar hop: time per dot (ms) and arc height (px). */
  hopMs: 420,
  hopLift: 70,
  /** A branch mouth (Task 037): centre height, picture size and tap target (a square, 170 px or more), and its offset from the fork dot. */
  mouthY: 245,
  mouthDx: 170,
  mouthW: 220,
  mouthH: 200,
  mouthHit: 180,
  /** On a branch map: the room added before the first dot, and where the way-back arch stands (300 px left of the first dot). */
  backLead: 240,
  backDx: -300,
  /** Hop to a mouth or an arch: px per second, never faster than a normal hop. */
  farHopPxPerSec: 700,
  farHopMaxMs: 1100,
} as const;

export interface MapGeometry {
  dots: MapPoint[];
  teasers: MapPoint[];
  /** One big mouth per branch (Task 037), standing above the path just after its fork dot. */
  branches: MapPoint[];
  /** The way-back arch on a branch map (Task 037), or null. */
  back: MapPoint | null;
  /** Width of the whole map (px). */
  width: number;
}

export interface MapGeometryOptions {
  /** The dot index each branch forks after (one mouth each). */
  branchAfter?: readonly number[];
  /** A branch map: leave room for the way-back arch before the first dot. */
  back?: boolean;
}

export function mapGeometry(dotCount: number, teaserCount: number, opts: MapGeometryOptions = {}): MapGeometry {
  const lead = opts.back ? MAP.backLead : 0;
  const dots = Array.from({ length: dotCount }, (_, i) => ({ x: lead + MAP.firstX + i * MAP.dotGap, y: MAP.dotYs[i % MAP.dotYs.length] }));
  const lastX = dots.length > 0 ? dots[dots.length - 1].x : lead + MAP.firstX - MAP.dotGap;
  const teasers = Array.from({ length: teaserCount }, (_, i) => ({ x: lastX + MAP.dotGap * 0.95 + i * MAP.teaserGap, y: MAP.teaserY }));
  const branches = (opts.branchAfter ?? []).filter((i) => i >= 0 && i < dots.length).map((i) => ({ x: dots[i].x + MAP.mouthDx, y: MAP.mouthY }));
  const back = opts.back && dots.length > 0 ? { x: dots[0].x + MAP.backDx, y: MAP.mouthY } : null;
  const lastItem = teasers.length > 0 ? teasers[teasers.length - 1].x : lastX;
  const rightmost = Math.max(lastItem, ...branches.map((b) => b.x));
  return { dots, teasers, branches, back, width: rightmost + MAP.endPad };
}

/** Duration (ms) of one long hop from a to b (to a mouth or an arch): never shorter than a normal hop. */
export function farHopMs(a: MapPoint, b: MapPoint): number {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return Math.round(Math.min(MAP.farHopMaxMs, Math.max(MAP.hopMs, (d / MAP.farHopPxPerSec) * 1000)));
}

/**
 * Horizontal scroll (map x at the screen's left edge) that shows `focusX` well: a map narrower than the
 * screen is centred (negative scroll); a wider one puts the focus at MAP.focus of the screen, clamped to the ends.
 */
export function scrollFor(mapWidth: number, screenWidth: number, focusX: number): number {
  if (mapWidth <= screenWidth) return -(screenWidth - mapWidth) / 2;
  return clampScroll(focusX - screenWidth * MAP.focus, mapWidth, screenWidth);
}

export function clampScroll(scroll: number, mapWidth: number, screenWidth: number): number {
  if (mapWidth <= screenWidth) return -(screenWidth - mapWidth) / 2;
  return Math.min(mapWidth - screenWidth, Math.max(0, scroll));
}

/** Index of the item whose square hit area contains the map point, or -1. */
export function hitIndex(points: readonly MapPoint[], x: number, y: number, size: number, dy = 0): number {
  return points.findIndex((p) => Math.abs(x - p.x) <= size / 2 && Math.abs(y - (p.y + dy)) <= size / 2);
}

/** Position of a hop from a to b at t (0..1): straight across with an arc on top. */
export function hopPoint(a: MapPoint, b: MapPoint, t: number, lift: number = MAP.hopLift): MapPoint & { lift: number } {
  const k = Math.min(1, Math.max(0, t));
  const arc = Math.sin(Math.PI * k) * lift;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, lift: arc };
}
