import { InnerLine, InnerToken, Pre, type AnnotationHandler, type HighlightedCode } from "codehike/code";
import { calculateTransitions, getStartingSnapshot, type TokenTransitionsSnapshot } from "codehike/utils/token-transitions";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Easing, interpolate, interpolateColors, Sequence, spring, useCurrentFrame, useDelayRender } from "remotion";
import { CAPTION, iconFor, sizeOf, TRACE_STEP, type Pos } from "../spec.ts";
import { HOME, TIMING, type Timeline, type Track } from "../timeline.ts";
import { DIM, FADE_OUT, mono, palette, sans, SPRING } from "./theme.ts";

export type Ctx = { t: Timeline; frame: number; unit: number };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0 -> 1 over TIMING.anim seconds: every transition shares one calm pace.
const ease = (frame: number, fps: number) => spring({ frame, fps, config: SPRING, durationInFrames: Math.round(TIMING.anim * fps) });

// Value that eases to each step's target at its frame, starting from wherever it is.
function animate(initial: number, steps: { frame: number; value: number }[], frame: number, fps: number) {
  let v = initial;
  for (const s of steps) {
    if (frame < s.frame) break;
    v = interpolate(ease(frame - s.frame, fps), [0, 1], [v, s.value]);
  }
  return v;
}

// Whole-canvas transform so `to` sits at screen center, scaled by `zoom`.
export function cameraTransform({ t, frame, unit }: Ctx) {
  const at = (k: number) => animate(HOME.to[k], t.camera.map((c) => ({ frame: c.frame, value: c.to[k] })), frame, t.fps);
  const zoom = animate(HOME.zoom, t.camera.map((c) => ({ frame: c.frame, value: c.zoom })), frame, t.fps);
  return `translate(${t.width / 2}px, ${t.height / 2}px) scale(${zoom}) translate(${-at(0) * unit}px, ${-at(1) * unit}px)`;
}

const posAt = (tr: Track, { t, frame }: Ctx): Pos => {
  const at = "at" in tr.el && tr.el.at ? tr.el.at : HOME.to;
  return [0, 1].map((k) => animate(at[k], tr.moves.map((m) => ({ frame: m.frame, value: m.to[k] })), frame, t.fps)) as Pos;
};

const enterAt = (tr: Track, { t, frame }: Ctx) => ease(frame - tr.start, t.fps);
const exitAt = (tr: Track, { frame }: Ctx) => (tr.end === null ? 0 : interpolate(frame - tr.end, [0, FADE_OUT], [0, 1], clamp));

// Focus without lines dims every element not in the focused set that was already on screen.
// Something added at or after the focus moment is what the narration just introduced, so it stays bright.
// A line focus only lights up its own code panel and leaves every other element as it was.
const dimAt = (tr: Track, { t, frame }: Ctx) =>
  animate(1, t.focus.filter((f) => f.frame > tr.start && (!f.lines || f.ids?.[0] === tr.el.id))
    .map((f) => ({ frame: f.frame, value: f.ids && !f.ids.includes(tr.el.id) ? DIM : 1 })), frame, t.fps);

// Red/green alone fails for color-blind viewers, so `bad` also gets a dashed stroke.
const dashed = (bad: boolean, unit: number) => (bad ? `${0.12 * unit} ${0.08 * unit}` : undefined);
// Translucent version of any CSS color (hex or the rgba that color easing produces).
const alpha = (color: string, a: number) => `color-mix(in srgb, ${color} ${a * 100}%, transparent)`;

// Current color: the element's own, eased to each `color` op in turn; `bad` once it last turned bad.
function paint(tr: Track, { t, frame }: Ctx, fallback: string) {
  let name = "color" in tr.el ? tr.el.color : undefined;
  let color = name ? palette[name] : fallback;
  for (const c of tr.colors) {
    if (frame < c.frame) break;
    color = interpolateColors(ease(frame - c.frame, t.fps), [0, 1], [color, palette[c.color]]);
    name = c.color;
  }
  return { color, bad: name === "bad" };
}

// `data-id` lets the playground find what was clicked; display: contents keeps layout untouched.
export function Element({ tr, ctx }: { tr: Track; ctx: Ctx }) {
  if (ctx.frame < tr.start || (tr.end !== null && ctx.frame > tr.end + FADE_OUT)) return null;
  return <div data-id={tr.el.id} style={{ display: "contents" }}><Shape tr={tr} ctx={ctx} /></div>;
}

function Shape({ tr, ctx }: { tr: Track; ctx: Ctx }) {
  if (tr.el.type === "arrow") return <Arrow tr={tr} ctx={ctx} />;
  const { unit } = ctx;
  const enter = enterAt(tr, ctx);
  const [x, y] = posAt(tr, ctx);
  const style: React.CSSProperties = {
    position: "absolute",
    left: x * unit,
    top: y * unit,
    transform: `translate(-50%, -50%) translateY(${(1 - enter) * 0.15 * unit}px) scale(${0.96 + 0.04 * enter})`,
    opacity: enter * (1 - exitAt(tr, ctx)) * dimAt(tr, ctx),
  };
  const el = tr.el;
  if (el.type === "text") {
    const size = { h1: 0.62, h2: 0.42, body: 0.3 }[el.size ?? "body"];
    return (
      <div style={{ ...style, fontFamily: sans, fontSize: size * unit, fontWeight: el.size === "body" || !el.size ? 400 : 600,
        color: paint(tr, ctx, palette.text).color, whiteSpace: "pre-wrap", textAlign: "center", width: "max-content", maxWidth: 14 * unit }}>
        {el.text}
      </div>
    );
  }
  if (el.type === "code") return <Code tr={tr} ctx={ctx} style={style} />;
  const [w, h] = sizeOf(el);
  const { color, bad } = paint(tr, ctx, palette.accent);
  const stroke = `${0.025 * unit}px ${bad ? "dashed" : "solid"}`;
  // Captions sit in the element's own column, inside the footprint arrows clip to.
  const column: React.CSSProperties = { ...style, display: "flex", flexDirection: "column", alignItems: "center" };
  const caption = (text?: string) => text && (
    <div style={{ height: CAPTION * unit, display: "flex", alignItems: "flex-end", whiteSpace: "nowrap",
      fontFamily: sans, fontSize: 0.26 * unit, lineHeight: 1, color: palette.text }}>{text}</div>
  );
  if (el.type === "box") {
    const Icon = el.icon ? iconFor(el.icon) : null;
    return (
      <div style={{ ...style, width: w * unit, height: h * unit, border: `${stroke} ${color}`, borderRadius: 0.15 * unit, background: alpha(color, 0.1),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.12 * unit, boxSizing: "border-box",
        fontFamily: sans, fontSize: 0.3 * unit, color: palette.text, textAlign: "center", padding: 0.1 * unit, whiteSpace: "pre-wrap" }}>
        {Icon && <Icon size={0.55 * unit} color={color} strokeWidth={1.6} />}
        {el.label}
      </div>
    );
  }
  if (el.type === "icon") {
    const Icon = iconFor(el.icon);
    return (
      <div style={column}>
        <Icon size={w * unit} color={color} strokeWidth={1.4} />
        {caption(el.label)}
      </div>
    );
  }
  if (el.type === "cells") {
    const now = tr.fills.findLast((f) => f.frame <= ctx.frame) ?? el;
    return (
      <div style={column}>
        <div style={{ display: "flex", gap: 0.06 * unit }}>
          {now.items.map((item, i) => {
            const lit = now.highlight?.includes(i);
            return (
              <div key={i} style={{ width: 0.74 * unit, height: 0.74 * unit, boxSizing: "border-box", border: `${stroke} ${color}`, borderRadius: 0.08 * unit,
                background: lit ? alpha(color, 0.6) : item ? alpha(color, 0.2) : "transparent", boxShadow: lit ? `0 0 ${0.25 * unit}px ${color}` : undefined,
                display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 0.22 * unit, color: palette.text, overflow: "hidden" }}>{item}</div>
            );
          })}
        </div>
        {caption(el.label)}
      </div>
    );
  }
  // group: a quiet system boundary drawn behind its components, name in the corner
  return (
    <div style={{ ...style, width: w * unit, height: h * unit, border: `${stroke} ${alpha(color, 0.4)}`, borderRadius: 0.25 * unit, background: alpha(color, 0.05), boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 0.25 * unit, top: 0.15 * unit, fontFamily: sans, fontSize: 0.22 * unit, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase", color: palette.muted }}>{el.label}</div>
    </div>
  );
}

function Code({ tr, ctx, style }: { tr: Track; ctx: Ctx; style: React.CSSProperties }) {
  const { t, frame, unit } = ctx;
  if (tr.el.type !== "code" || !tr.highlighted) throw new Error(`code '${tr.el.id}' was not highlighted before render`);
  const id = tr.el.id;
  const versions = tr.highlighted;
  const inRanges = (n: number, lines: [number, number][]) => lines.some(([a, b]) => n >= a && n <= b);
  const lineOpacity = (n: number) =>
    animate(1, t.focus.map((f) => ({ frame: f.frame, value: f.ids?.[0] === id && f.lines && !inRanges(n, f.lines) ? DIM : 1 })), frame, t.fps);
  const handlers: AnnotationHandler[] = [
    { name: "token-transitions", Token: (p) => <InnerToken merge={p} style={{ display: "inline-block" }} /> },
    { name: "line-focus", Line: (p) => <InnerLine merge={p} style={{ opacity: lineOpacity(p.lineNumber) }} /> },
  ];
  const preStyle: React.CSSProperties = { ...versions[0].style, background: "transparent", margin: 0, position: "relative",
    fontFamily: mono, fontSize: 0.3 * unit, lineHeight: 1.5, tabSize: 2, fontVariantLigatures: "none" }; // "===" stays three characters
  const morphs = tr.morphs;
  return (
    <div style={{ ...style, background: palette.panel, borderRadius: 0.15 * unit, padding: `${0.3 * unit}px ${0.4 * unit}px` }}>
      {tr.el.title && <div style={{ fontFamily: sans, fontSize: 0.2 * unit, color: palette.muted, marginBottom: 0.15 * unit }}>{tr.el.title}</div>}
      {(!morphs.length || frame < morphs[0].frame) && <Pre code={versions[0]} handlers={handlers} style={preStyle} />}
      {morphs.map((m, k) => (
        <Sequence key={k} from={m.frame} durationInFrames={(morphs[k + 1]?.frame ?? Infinity) - m.frame} layout="none">
          <Morph from={versions[k]} to={versions[k + 1]} handlers={handlers} style={preStyle} frames={Math.round(TIMING.anim * t.fps)} />
        </Sequence>
      ))}
    </div>
  );
}

// Token glide between two code versions. Pattern from Remotion's Code Hike template.
function Morph({ from, to, handlers, style, frames }: { from: HighlightedCode; to: HighlightedCode; handlers: AnnotationHandler[]; style: React.CSSProperties; frames: number }) {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLPreElement>(null);
  const [snapshot, setSnapshot] = useState<TokenTransitionsSnapshot | null>(null);
  const { delayRender, continueRender } = useDelayRender();
  const [handle] = useState(() => delayRender("code morph"));

  useLayoutEffect(() => {
    if (!snapshot) return setSnapshot(getStartingSnapshot(ref.current!));
    for (const { element, keyframes, options } of calculateTransitions(ref.current!, snapshot)) {
      const delay = frames * options.delay;
      const linear = interpolate(frame, [delay, delay + frames * options.duration], [0, 1], clamp);
      const p = Easing.bezier(0.17, 0.67, 0.76, 0.91)(linear);
      const { translateX, translateY, color, opacity } = keyframes;
      if (opacity) element.style.opacity = String(linear);
      if (color) element.style.color = interpolateColors(p, [0, 1], color);
      element.style.translate = `${translateX ? interpolate(p, [0, 1], translateX) : 0}px ${translateY ? interpolate(p, [0, 1], translateY) : 0}px`;
    }
    continueRender(handle);
  });

  return <Pre ref={ref} code={snapshot ? to : from} handlers={handlers} style={style} />;
}

// Arrow endpoints in px, clipped to box edges so lines start and end just outside them.
function arrowEnds(tr: Track, ctx: Ctx) {
  if (tr.el.type !== "arrow") throw new Error(`'${tr.el.id}' is not an arrow`);
  const { t, unit } = ctx;
  const box = (end: string | Pos) => (typeof end === "string" ? t.tracks.find((b) => b.el.id === end)! : null);
  const center = (end: string | Pos): Pos => { const b = box(end); return b ? posAt(b, ctx) : (end as Pos); };
  const a = center(tr.el.from);
  const b = center(tr.el.to);
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  // Distance from a box center to its edge along the arrow direction, plus a small gap.
  const inset = (end: string | Pos) => {
    const bx = box(end);
    if (!bx) return 0;
    const [w, h] = sizeOf(bx.el);
    return Math.min(w / 2 / Math.abs(dx / len || 1e-9), h / 2 / Math.abs(dy / len || 1e-9)) + 0.12;
  };
  // Left-hand normal of the direction; `offset` slides the whole arrow along it.
  const normal: Pos = [dy / len, -dx / len];
  const shift = tr.el.offset ?? 0;
  const at = (d: number): Pos => [0, 1].map((k) => (a[k] + ([dx, dy][k] / len) * d + normal[k] * shift) * unit) as Pos;
  return { from: at(inset(tr.el.from)), to: at(len - inset(tr.el.to)), dir: [dx / len, dy / len] as Pos, normal, side: shift < 0 ? -1 : 1 };
}

const lerp = (a: Pos, b: Pos, p: number): Pos => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];

function Arrow({ tr, ctx }: { tr: Track; ctx: Ctx }) {
  if (tr.el.type !== "arrow") return null;
  const { t, unit } = ctx;
  const el = tr.el;
  const { from, to, dir, normal, side } = arrowEnds(tr, ctx);
  const grow = enterAt(tr, ctx);
  const [x1, y1] = lerp(from, to, grow);
  const angle = (Math.atan2(dir[1], dir[0]) * 180) / Math.PI;
  const { color, bad } = paint(tr, ctx, palette.muted);
  const head = 0.16 * unit;
  const [mx, my] = lerp(from, to, 0.5);
  // Label sits beside the line on the offset side, anchored away from it so it never crosses it.
  const [nx, ny] = [normal[0] * side, normal[1] * side];
  const anchor = Math.abs(nx) < 0.5 ? "middle" : nx < 0 ? "end" : "start";
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - exitAt(tr, ctx)) * dimAt(tr, ctx) }} width={t.width} height={t.height}>
      <line x1={from[0]} y1={from[1]} x2={x1} y2={y1} stroke={color} strokeWidth={0.035 * unit} strokeLinecap="round" strokeDasharray={dashed(bad, unit)} />
      <polygon points={`0,0 ${-head},${-head * 0.6} ${-head},${head * 0.6}`} fill={color} transform={`translate(${x1} ${y1}) rotate(${angle})`} />
      {el.label && (
        <text x={mx + nx * 0.25 * unit} y={my + ny * 0.3 * unit} fill={palette.muted} fontFamily={sans} fontSize={0.22 * unit}
          textAnchor={anchor} dominantBaseline="middle" opacity={grow}>
          {el.label}
        </text>
      )}
    </svg>
  );
}

// A glowing dot, or a labelled packet, that runs one request along a chain of arrows.
export function Traces({ ctx }: { ctx: Ctx }) {
  const { t, frame, unit } = ctx;
  const step = TRACE_STEP * t.fps;
  return t.traces.map((ev, i) => {
    const local = frame - ev.frame;
    const total = ev.ids.length * step;
    if (local < 0 || local > total + FADE_OUT) return null;
    const k = Math.min(Math.floor(local / step), ev.ids.length - 1);
    const p = Easing.inOut(Easing.quad)(Math.min((local - k * step) / step, 1));
    const { from, to } = arrowEnds(t.tracks.find((tr) => tr.el.id === ev.ids[k])!, ctx);
    const [x, y] = lerp(from, to, p);
    const opacity = interpolate(local, [0, 4, total, total + FADE_OUT], [0, 1, 1, 0], clamp);
    const Icon = ev.icon ? iconFor(ev.icon) : null;
    const glow = `0 0 ${0.3 * unit}px ${palette.accent}`;
    return (
      <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity }}>
        {Icon || ev.label ? (
          <div style={{ display: "flex", alignItems: "center", gap: 0.08 * unit, padding: `${0.06 * unit}px ${0.16 * unit}px`, borderRadius: unit,
            background: palette.accent, boxShadow: glow, color: palette.bg, fontFamily: sans, fontSize: 0.22 * unit, fontWeight: 600, whiteSpace: "nowrap" }}>
            {Icon && <Icon size={0.28 * unit} color={palette.bg} strokeWidth={2} />}
            {ev.label}
          </div>
        ) : (
          <div style={{ width: 0.2 * unit, height: 0.2 * unit, borderRadius: "50%", background: palette.accent, boxShadow: glow }} />
        )}
      </div>
    );
  });
}

// The question stays readable during a beat's think window, with a countdown bar under it.
// Screen-fixed, outside the camera, and not a spec element, so it costs no on-screen slot.
export function Think({ ctx }: { ctx: Ctx }) {
  const { t, frame, unit } = ctx;
  const beat = t.beats.find((b) => b.thinkFrames && frame >= b.start + b.frames - b.thinkFrames && frame < b.start + b.frames);
  if (!beat) return null;
  const local = frame - (beat.start + beat.frames - beat.thinkFrames);
  const opacity = interpolate(local, [0, 8, beat.thinkFrames - 8, beat.thinkFrames], [0, 1, 1, 0], clamp);
  const left = 1 - local / beat.thinkFrames;
  return (
    <div style={{ position: "absolute", left: "50%", bottom: 0.4 * unit, transform: "translateX(-50%)", opacity, textAlign: "center",
      fontFamily: sans, fontSize: 0.22 * unit, color: palette.muted, maxWidth: 14 * unit, width: "max-content",
      background: `${palette.bg}f2`, borderRadius: 0.15 * unit, padding: `${0.2 * unit}px ${0.4 * unit}px` }}>
      <div style={{ fontSize: 0.32 * unit, color: palette.text, marginBottom: 0.15 * unit }}>{beat.say}</div>
      pause and predict
      <div style={{ margin: `${0.12 * unit}px auto 0`, width: 3 * unit, height: 0.04 * unit, borderRadius: unit, background: palette.panel }}>
        <div style={{ width: `${left * 100}%`, height: "100%", borderRadius: unit, background: palette.accent }} />
      </div>
    </div>
  );
}
