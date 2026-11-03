// Shared drawing kit for every component renderer: timing, color, state and geometry helpers.
// Renderers draw in px: `u` is one grid unit (after the element's size knob), `w`/`h` the footprint.
import React from "react";
import { interpolate, interpolateColors, spring } from "remotion";
import type { AddType } from "../components/index.ts";
import type { Pt } from "../components/registry.ts";
import { edgesOf, rectOf, type Add, type Color, type Pos } from "../spec.ts";
import { HOME, TIMING, type Timeline, type Track } from "../timeline.ts";
import type { Palette } from "../themes.ts";
import { DIM, mono, sans, SPRING } from "./theme.ts";

export { iconFor } from "../components/registry.ts";
export { mono, sans };

export type Ctx = { t: Timeline; frame: number; unit: number; pal: Palette };
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0 -> 1 over TIMING.anim seconds: every transition shares one calm pace.
export const ease = (frame: number, fps: number) => spring({ frame, fps, config: SPRING, durationInFrames: Math.round(TIMING.anim * fps) });

// Value that eases to each step's target at its frame, starting from wherever it is.
export function animate(initial: number, steps: { frame: number; value: number }[], frame: number, fps: number) {
  let v = initial;
  for (const s of steps) {
    if (frame < s.frame) break;
    v = interpolate(ease(frame - s.frame, fps), [0, 1], [v, s.value]);
  }
  return v;
}

// Red/green alone fails for color-blind viewers, so `bad` also gets a dashed stroke.
export const dashed = (bad: boolean, u: number) => (bad ? `${0.12 * u} ${0.08 * u}` : undefined);
export const stroke = (bad: boolean, u: number, color: string, width = 0.025) => `${width * u}px ${bad ? "dashed" : "solid"} ${color}`;
// Translucent version of any CSS color (hex or the rgba that color easing produces).
export const alpha = (color: string, a: number) => `color-mix(in srgb, ${color} ${a * 100}%, transparent)`;

// Current color: the element's own, eased to each `color` op in turn; `bad` once it last turned bad.
export function paint(tr: Track, { t, frame, pal }: Ctx, fallback: string) {
  let name = "color" in tr.el ? tr.el.color : undefined;
  let color = name ? pal[name] : fallback;
  for (const c of tr.colors) {
    if (frame < c.frame) break;
    color = interpolateColors(ease(frame - c.frame, t.fps), [0, 1], [color, pal[c.color]]);
    name = c.color;
  }
  return { color, bad: name === "bad" };
}
// A semantic color for a part of a component (a failed stage, a down node); bad parts should also be dashed.
export const tone = (pal: Palette, c: Color | undefined, fallback: string) => (c ? pal[c] : fallback);

// The element with every `set` up to now applied; history = the state after each set.
export function stateAt<E extends Add>(tr: Track, frame: number): E {
  return tr.sets.reduce((s, x) => (x.frame <= frame ? ({ ...s, ...x.state } as E) : s), tr.el as E);
}
export function history<E extends Add>(tr: Track): { frame: number; state: E }[] {
  let s = tr.el as E;
  return tr.sets.map((x) => ({ frame: x.frame, state: (s = { ...s, ...x.state } as E) }));
}

export const posAt = (tr: Track, { t, frame }: Ctx): Pos => {
  const at = "at" in tr.el && tr.el.at ? tr.el.at : HOME.to;
  return [0, 1].map((k) => animate(at[k], tr.moves.map((m) => ({ frame: m.frame, value: m.to[k] })), frame, t.fps)) as Pos;
};
export const trackOf = (t: Timeline, id: string) => t.tracks.find((tr) => tr.el.id === id);

// Where a ref ("cache", "cache.1042", or [x, y]) is right now, in grid units; w = h = 0 for a bare point.
export function refRect(ref: string | Pos, ctx: Ctx) {
  if (typeof ref !== "string") return { x: ref[0], y: ref[1], w: 0, h: 0 };
  const [id, part] = ref.split(".");
  const tr = trackOf(ctx.t, id)!;
  return rectOf(stateAt(tr, ctx.frame), posAt(tr, ctx), part);
}
// A component edge ("tree.child") as points on the canvas in grid units.
export function edgePoints(ref: string, ctx: Ctx): Pt[] {
  const [id, edge] = ref.split(".");
  const tr = trackOf(ctx.t, id)!;
  const [x, y] = posAt(tr, ctx);
  return (edgesOf(stateAt(tr, ctx.frame))[edge] ?? []).map(([dx, dy]) => [x + dx, y + dy]);
}

// Distance from a rect's center to its edge along a unit direction, plus a small gap; 0 for a point.
export const inset = (r: { w: number; h: number }, dx: number, dy: number) =>
  r.w ? Math.min(r.w / 2 / Math.abs(dx || 1e-9), r.h / 2 / Math.abs(dy || 1e-9)) + 0.12 : 0;

// An arrow's path in grid units: straight or bent by `curve`, slid sideways by `offset`, clipped to both ends.
export function arrowPath(el: Extract<Add, { type: "arrow" }>, ctx: Ctx) {
  const a = refRect(el.from, ctx);
  const b = refRect(el.to, ctx);
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const len = Math.hypot(dx, dy) || 1;
  const normal: Pt = [dy / len, -dx / len]; // left of the direction
  const shift = el.offset ?? 0;
  const bend = (el.curve ?? 0) * len * 0.5;
  const ctrl: Pt = [(a.x + b.x) / 2 + normal[0] * (bend + shift), (a.y + b.y) / 2 + normal[1] * (bend + shift)];
  const dirTo = (p: { x: number; y: number }, q: Pt) => { const d = Math.hypot(q[0] - p.x, q[1] - p.y) || 1; return [(q[0] - p.x) / d, (q[1] - p.y) / d]; };
  const [sx, sy] = dirTo(a, ctrl);
  const [ex, ey] = dirTo(b, ctrl);
  const p0: Pt = [a.x + normal[0] * shift + sx * inset(a, sx, sy), a.y + normal[1] * shift + sy * inset(a, sx, sy)];
  const p2: Pt = [b.x + normal[0] * shift + ex * inset(b, ex, ey), b.y + normal[1] * shift + ey * inset(b, ex, ey)];
  const at = (s: number): Pt => [0, 1].map((k) => (1 - s) ** 2 * p0[k] + 2 * (1 - s) * s * ctrl[k] + s ** 2 * p2[k]) as Pt;
  const n = el.curve ? 25 : 2;
  const points = Array.from({ length: n }, (_, i) => at(i / (n - 1)));
  const side = (el.curve ?? 0) !== 0 ? Math.sign(el.curve!) : shift < 0 ? -1 : 1;
  return { points, mid: at(0.5), normal, side, ctrl };
}

// Point at fraction p (0..1) of a polyline's length, and its direction.
export function along(points: Pt[], p: number): { at: Pt; dir: Pt } {
  const segs = points.slice(1).map((q, i) => Math.hypot(q[0] - points[i][0], q[1] - points[i][1]));
  let d = Math.max(0, Math.min(1, p)) * segs.reduce((s, x) => s + x, 0);
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = [points[i], points[i + 1]];
    const dir: Pt = [(b[0] - a[0]) / (segs[i] || 1), (b[1] - a[1]) / (segs[i] || 1)];
    if (d <= segs[i] || i === segs.length - 1) { const f = segs[i] ? Math.min(1, d / segs[i]) : 1; return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir }; }
    d -= segs[i];
  }
  return { at: points[0], dir: [1, 0] };
}
// The first part of a polyline, up to fraction p: an edge or arrow drawing itself in.
export const partial = (points: Pt[], p: number): Pt[] => {
  if (p >= 1) return points;
  const end = along(points, p).at;
  const segs = points.slice(1).map((q, i) => Math.hypot(q[0] - points[i][0], q[1] - points[i][1]));
  const total = segs.reduce((s, x) => s + x, 0);
  const out: Pt[] = [points[0]];
  let d = 0;
  for (let i = 0; i < segs.length && (d += segs[i]) < p * total; i++) out.push(points[i + 1]);
  return [...out, end];
};
export const svgPath = (points: Pt[], u: number, dx = 0, dy = 0) => points.map(([x, y], i) => `${i ? "L" : "M"}${(x + dx) * u} ${(y + dy) * u}`).join(" ");

// Focus without lines dims every element not in the focused set that was already on screen.
// Something added at or after the focus moment is what the narration just introduced, so it stays bright.
// A line focus only lights up its own code panel and leaves every other element as it was.
export const dimAt = (tr: Track, { t, frame }: Ctx) =>
  animate(1, t.focus.filter((f) => f.frame > tr.start && (!f.lines || f.ids?.[0] === tr.el.id))
    .map((f) => ({ frame: f.frame, value: f.ids && !f.ids.includes(tr.el.id) ? DIM : 1 })), frame, t.fps);

// What every renderer gets. `el` is the element as it is now (sets applied).
export type RProps<T extends AddType> = {
  el: Extract<Add, { type: T }>;
  tr: Track;
  ctx: Ctx;
  u: number; // px per grid unit, size knob applied
  w: number; // footprint in px (0 for free-drawn elements: arrows, annotations)
  h: number;
  color: string; // current color (accent unless set), eased through color ops
  bad: boolean;
  enter: number; // 0 -> 1 as it appears
  // eases a number from the state as it was to the state now (needle, bar height, counter)
  tween: (pick: (el: Extract<Add, { type: T }>) => number) => number;
  // the state before the latest set, and 0 -> 1 progress since that set (for typing, sliding, swapping)
  change: { prev: Extract<Add, { type: T }>; p: number };
};
export type Renderer<T extends AddType> = (p: RProps<T>) => React.ReactNode;
export type Renderers<T extends AddType> = { [K in T]: Renderer<K> };

// Small text under or inside a component. Sizes in grid units; never smaller than 0.2 so it reads at 1080p.
export function Text({ u, size = 0.26, color, mono: isMono, bold, children, style }:
  { u: number; size?: number; color: string; mono?: boolean; bold?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: isMono ? mono : sans, fontSize: Math.max(size, 0.2) * u, fontWeight: bold ? 600 : 400, color, lineHeight: 1.15,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...style }}>{children}</div>
  );
}
// A caption row of CAPTION height (0.45 units), text at its bottom: matches the core icon and cells captions.
export const Caption = ({ u, text, pal }: { u: number; text?: string; pal: Palette }) => text ? (
  <div style={{ height: 0.45 * u, display: "flex", alignItems: "flex-end", justifyContent: "center", whiteSpace: "nowrap",
    fontFamily: sans, fontSize: 0.26 * u, lineHeight: 1, color: pal.text }}>{text}</div>
) : null;
// A quiet rounded panel in the theme's panel color, the background of cards, terminals and tables.
export const Panel = ({ u, color, bad, children, style }: { u: number; color: string; bad?: boolean; children?: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ boxSizing: "border-box", border: stroke(!!bad, u, alpha(color, 0.7)), borderRadius: 0.15 * u, background: alpha(color, 0.08), ...style }}>{children}</div>
);
