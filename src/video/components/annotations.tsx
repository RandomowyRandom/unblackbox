import React from "react";
import type { annotations as defs } from "../../components/annotations.ts";
import type { Pt, TypesOf } from "../../components/registry.ts";
import type { Palette } from "../../themes.ts";
import { mono, partial, refRect, sans, stroke, svgPath, type Renderers } from "../kit.tsx";

// Annotations draw in canvas px and look up their target's live rect every frame, so they follow moves and sets.
type Side = "left" | "right" | "above" | "below";
type R = { x: number; y: number; w: number; h: number };
const NORMAL: Record<Side, Pt> = { left: [-1, 0], right: [1, 0], above: [0, -1], below: [0, 1] };
// a div whose near edge (the one facing the target) sits on its anchor point
const FACING: Record<Side, string> = { left: "translate(-100%, -50%)", right: "translate(0, -50%)", above: "translate(-50%, -100%)", below: "translate(-50%, 0)" };
// the middle of a rect's edge on one side, pushed `gap` grid units out
const edgeOf = (r: R, side: Side, gap = 0): Pt => {
  const [nx, ny] = NORMAL[side];
  return [r.x + nx * (r.w / 2 + gap), r.y + ny * (r.h / 2 + gap)];
};
// opaque so the target's outline does not show through
const fill = (color: string, pal: Palette, a = 0.14) => `color-mix(in srgb, ${color} ${a * 100}%, ${pal.bg})`;
const Svg = ({ ctx, children }: { ctx: { t: { width: number; height: number } }; children: React.ReactNode }) => (
  <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={ctx.t.width} height={ctx.t.height}>{children}</svg>
);
const at = ([x, y]: Pt, u: number, transform: string, style: React.CSSProperties = {}): React.CSSProperties =>
  ({ position: "absolute", left: x * u, top: y * u, transform, boxSizing: "border-box", whiteSpace: "nowrap", ...style });

export const annotations: Renderers<TypesOf<typeof defs>> = {
  callout: ({ el, ctx, u, color, bad, enter }) => {
    const side = el.side ?? "right";
    const r = refRect(el.on, ctx);
    const tip = edgeOf(r, side, 0.08);
    const near = edgeOf(r, side, 0.7);
    return (
      <>
        <Svg ctx={ctx}>
          <path d={svgPath(partial([near, tip], enter), u)} stroke={color} strokeWidth={0.025 * u} strokeLinecap="round" fill="none" />
          <circle cx={tip[0] * u} cy={tip[1] * u} r={0.05 * u} fill={color} opacity={enter} />
        </Svg>
        <div style={at(near, u, FACING[side], { border: stroke(bad, u, color), borderRadius: 0.12 * u, background: fill(color, ctx.pal),
          padding: `${0.08 * u}px ${0.18 * u}px`, fontFamily: sans, fontSize: 0.26 * u, color: ctx.pal.text })}>{el.text}</div>
      </>
    );
  },
  brace: ({ el, ctx, u, color, bad, enter }) => {
    const side = el.side ?? "below";
    const [a, b] = [refRect(el.from, ctx), refRect(el.to, ctx)];
    const vertical = side === "left" || side === "right";
    const [ax, ay] = vertical ? ["y", "x"] as const : ["x", "y"] as const; // along the span, out from it
    const lo = Math.min(a[ax] - a[vertical ? "h" : "w"] / 2, b[ax] - b[vertical ? "h" : "w"] / 2);
    const hi = Math.max(a[ax] + a[vertical ? "h" : "w"] / 2, b[ax] + b[vertical ? "h" : "w"] / 2);
    const out = side === "below" || side === "right" ? 1 : -1;
    const half = (v: R) => v[vertical ? "w" : "h"] / 2;
    const base = out > 0 ? Math.max(a[ay] + half(a), b[ay] + half(b)) + 0.15 : Math.min(a[ay] - half(a), b[ay] - half(b)) - 0.15;
    // a classic curly brace in (along, out) coordinates, growing from its middle as it enters
    const m = (lo + hi) / 2;
    const s = ((hi - lo) / 2 - 0.05) * (0.3 + 0.7 * enter);
    const d = 0.13;
    const q = Math.min(d, s / 2);
    const pt = (t: number, n: number) => { const o = base + out * n; return `${(vertical ? o : t) * u} ${(vertical ? t : o) * u}`; };
    const path = `M${pt(m - s, 0)} Q${pt(m - s, d)} ${pt(m - s + q, d)} L${pt(m - q, d)} Q${pt(m, d)} ${pt(m, 2 * d)}`
      + ` Q${pt(m, d)} ${pt(m + q, d)} L${pt(m + s - q, d)} Q${pt(m + s, d)} ${pt(m + s, 0)}`;
    const tipOut = base + out * (2 * d + 0.1);
    const labelAt: Pt = vertical ? [tipOut, m] : [m, tipOut];
    return (
      <>
        <Svg ctx={ctx}>
          <path d={path} stroke={color} strokeWidth={0.03 * u} strokeLinecap="round" strokeLinejoin="round" fill="none"
            strokeDasharray={bad ? `${0.08 * u} ${0.06 * u}` : undefined} />
        </Svg>
        <div style={at(labelAt, u, FACING[side], { fontFamily: sans, fontSize: 0.26 * u, color: ctx.pal.text })}>{el.label}</div>
      </>
    );
  },
  badge: ({ el, ctx, u, color, bad, change }) => {
    const r = refRect(el.on, ctx);
    const [v, h] = (el.corner ?? "top-right").split("-");
    const corner: Pt = [r.x + (h === "left" ? -1 : 1) * r.w / 2, r.y + (v === "top" ? -1 : 1) * r.h / 2];
    const size = 0.22;
    const width = (s: string) => (s.length * size * 0.6 + 0.3) * u; // mono: 0.6 em per character, plus padding
    const swapping = change.p < 1 && change.prev.text !== el.text;
    const p = swapping ? change.p : 1;
    const line = (text: string, o: number, dy: number) => (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: o, transform: `translateY(${dy * u}px)` }}>{text}</div>
    );
    return (
      <div style={at(corner, u, "translate(-50%, -50%)", { width: swapping ? width(change.prev.text) + (width(el.text) - width(change.prev.text)) * p : width(el.text),
        height: size * u * 1.9, overflow: "hidden", border: stroke(bad, u, color), borderRadius: u, background: fill(color, ctx.pal, 0.3),
        fontFamily: mono, fontSize: size * u, fontWeight: 700, color: ctx.pal.text })}>
        {swapping && line(change.prev.text, 1 - p, -0.25 * p)}
        {line(el.text, p, 0.25 * (1 - p))}
      </div>
    );
  },
  bubble: ({ el, ctx, u, color, bad, enter }) => {
    const r = refRect(el.on, ctx);
    const side: Side = r.y - r.h / 2 < 1.5 ? "below" : "above"; // no room above: hang it below
    const out = side === "above" ? -1 : 1;
    const think = el.kind === "think";
    const foot = edgeOf(r, side, 0.06); // where the tail ends, at the speaker
    const anchor = edgeOf(r, side, think ? 0.6 : 0.4);
    const bg = fill(color, ctx.pal, 0.1);
    const border = think && !bad ? `${0.03 * u}px dotted ${color}` : stroke(bad, u, color);
    // say: a pointed tail whose fill hides the bubble's border where they join; think: a trail of shrinking dots
    const tri: Pt[] = [[anchor[0] - 0.13, anchor[1] + out * 0.04], foot, [anchor[0] + 0.13, anchor[1] + out * 0.04]];
    const tailDraw = think
      ? [[0.13, 0.08], [0.3, 0.055], [0.44, 0.035]].map(([d, rad]) => (
        <circle key={d} cx={foot[0] * u} cy={(anchor[1] - out * d) * u} r={rad * u} fill={bg} stroke={color} strokeWidth={0.02 * u} opacity={enter} />
      ))
      : <>
        <polygon points={tri.map(([x, y]) => `${x * u},${y * u}`).join(" ")} fill={bg} />
        <path d={svgPath(tri, u)} stroke={color} strokeWidth={0.025 * u} fill="none" strokeLinejoin="round" strokeDasharray={bad ? `${0.08 * u} ${0.06 * u}` : undefined} />
      </>;
    return (
      <>
        <div style={at(anchor, u, FACING[side], { border, borderRadius: (think ? 0.45 : 0.18) * u, background: bg,
          padding: `${0.12 * u}px ${0.24 * u}px`, fontFamily: sans, fontSize: 0.26 * u, color: ctx.pal.text, fontStyle: think ? "italic" : undefined })}>{el.text}</div>
        <Svg ctx={ctx}>{tailDraw}</Svg>
      </>
    );
  },
};
