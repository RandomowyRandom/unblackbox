import React from "react";
import { Easing, interpolate } from "remotion";
import { defOf } from "../components/index.ts";
import { scaleOf, sizeOf, type Add } from "../spec.ts";
import { HOME, TIMING, type Track } from "../timeline.ts";
import { RENDERERS } from "./components/index.ts";
import {
  along, alpha, animate, arrowPath, clamp, dimAt, ease, edgePoints, history, iconFor, paint, posAt, sans, stateAt, trackOf,
  type Ctx, type Renderer, type RProps,
} from "./kit.tsx";
import { FADE_OUT } from "./theme.ts";

export type { Ctx };

// Whole-canvas transform so `to` sits at screen center, scaled by `zoom`.
export function cameraTransform({ t, frame, unit }: Ctx) {
  const at = (k: number) => animate(HOME.to[k], t.camera.map((c) => ({ frame: c.frame, value: c.to[k] })), frame, t.fps);
  const zoom = animate(HOME.zoom, t.camera.map((c) => ({ frame: c.frame, value: c.zoom })), frame, t.fps);
  return `translate(${t.width / 2}px, ${t.height / 2}px) scale(${zoom}) translate(${-at(0) * unit}px, ${-at(1) * unit}px)`;
}

const EXIT = { fade: FADE_OUT, cut: 1, slide: FADE_OUT * 1.5 } as const;
const enterAt = (tr: Track, { t, frame }: Ctx) => (tr.enter === "cut" ? 1 : ease(frame - tr.start, t.fps));
const exitAt = (tr: Track, { frame }: Ctx) => (tr.end === null ? 0 : interpolate(frame - tr.end, [0, EXIT[tr.exit]], [0, 1], clamp));
export const visible = (tr: Track, frame: number) => frame >= tr.start && (tr.end === null || frame <= tr.end + EXIT[tr.exit]);

// Rings that grow and fade around the footprint, one per pulse op.
function Pulses({ tr, ctx, u, color }: { tr: Track; ctx: Ctx; u: number; color: string }) {
  return tr.pulses.map((f, i) => {
    const local = ctx.frame - f;
    const len = TIMING.anim * ctx.t.fps;
    if (local < 0 || local > len) return null;
    const p = Easing.out(Easing.quad)(local / len);
    return <div key={i} style={{ position: "absolute", inset: -0.12 * u, borderRadius: 0.25 * u, border: `${0.06 * u}px solid ${color}`,
      transform: `scale(${1 + 0.25 * p})`, opacity: 0.9 * (1 - p), pointerEvents: "none" }} />;
  });
}

// `data-id` lets the playground find what was clicked. Placed elements get a box at their footprint;
// free ones (arrows, annotations) draw in canvas px inside a full-canvas layer.
export function Element({ tr, ctx }: { tr: Track; ctx: Ctx }) {
  if (!visible(tr, ctx.frame)) return null;
  const def = defOf(tr.el.type);
  const el = stateAt(tr, ctx.frame);
  const k = scaleOf(el);
  const u = ctx.unit * k;
  // the footprint eases with each set, like everything else, instead of snapping
  const [w, h] = def.placed
    ? [0, 1].map((k) => animate(sizeOf(tr.el)[k], history(tr).map((s) => ({ frame: s.frame, value: sizeOf(s.state)[k] })), ctx.frame, ctx.t.fps) * ctx.unit)
    : [0, 0];
  const enter = enterAt(tr, ctx);
  const exit = exitAt(tr, ctx);
  const { color, bad } = paint(tr, ctx, ctx.pal.accent);
  const states = history(tr).filter((s) => s.frame <= ctx.frame);
  const props: RProps<Add["type"]> = {
    el, tr, ctx, u, w, h, color, bad, enter,
    tween: (pick) => animate(pick(tr.el as never), history(tr).map((s) => ({ frame: s.frame, value: pick(s.state as never) })), ctx.frame, ctx.t.fps),
    change: { prev: (states.at(-2)?.state ?? tr.el) as never, p: states.length ? ease(ctx.frame - states.at(-1)!.frame, ctx.t.fps) : 1 },
  };
  const R = RENDERERS[el.type] as Renderer<Add["type"]>;
  const quiet = "emphasis" in el && el.emphasis === "quiet";
  const strong = "emphasis" in el && el.emphasis === "strong";
  const slide = (tr.enter === "slide" ? (1 - enter) * 1.5 : 0) - (tr.exit === "slide" ? exit * 1.5 : 0);
  const motion = tr.enter === "fade" ? `translateY(${(1 - enter) * 0.15 * ctx.unit}px) scale(${0.96 + 0.04 * enter})` : "";
  const style: React.CSSProperties = {
    opacity: enter * (1 - exit) * dimAt(tr, ctx) * (quiet ? 0.55 : 1),
    filter: strong ? `drop-shadow(0 0 ${0.18 * u}px ${alpha(color, 0.9)})` : undefined,
  };
  if (!def.placed) {
    return (
      <div data-id={tr.el.id} style={{ ...style, position: "absolute", inset: 0, transform: `translateX(${slide * ctx.unit}px)`, pointerEvents: "none" }}>
        <R {...props} />
      </div>
    );
  }
  const [x, y] = posAt(tr, ctx);
  return (
    <div data-id={tr.el.id} style={{ ...style, position: "absolute", left: x * ctx.unit, top: y * ctx.unit, width: w || undefined, height: h || undefined,
      transform: `translate(-50%, -50%) translateX(${slide * ctx.unit}px) ${motion}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <R {...props} />
      <Pulses tr={tr} ctx={ctx} u={u} color={ctx.pal.accent} />
    </div>
  );
}

// The points one trace hop follows: an arrow's (possibly curved) path, or a component edge.
function hop(ref: string, ctx: Ctx) {
  if (ref.includes(".")) return edgePoints(ref, ctx);
  const tr = trackOf(ctx.t, ref)!;
  return arrowPath(stateAt<Extract<Add, { type: "arrow" }>>(tr, ctx.frame), ctx).points;
}

// A glowing dot, or a labelled packet, that runs one request along a chain of arrows and edges.
export function Traces({ ctx }: { ctx: Ctx }) {
  const { t, frame, unit, pal } = ctx;
  return t.traces.map((ev, i) => {
    const local = frame - ev.frame;
    const total = ev.ids.length * ev.step;
    if (local < 0 || local > total + FADE_OUT) return null;
    const k = Math.min(Math.floor(local / ev.step), ev.ids.length - 1);
    const p = Easing.inOut(Easing.quad)(Math.min((local - k * ev.step) / ev.step, 1));
    const [x, y] = along(hop(ev.ids[k], ctx), p).at;
    const opacity = interpolate(local, [0, 4, total, total + FADE_OUT], [0, 1, 1, 0], clamp);
    const Icon = ev.icon ? iconFor(ev.icon) : null;
    const fill = pal[ev.color ?? "accent"];
    const glow = `0 0 ${0.3 * unit}px ${fill}`;
    return (
      <div key={i} style={{ position: "absolute", left: x * unit, top: y * unit, transform: "translate(-50%, -50%)", opacity }}>
        {Icon || ev.label ? (
          <div style={{ display: "flex", alignItems: "center", gap: 0.08 * unit, padding: `${0.06 * unit}px ${0.16 * unit}px`, borderRadius: unit,
            background: fill, boxShadow: glow, color: pal.bg, fontFamily: sans, fontSize: 0.22 * unit, fontWeight: 600, whiteSpace: "nowrap" }}>
            {Icon && <Icon size={0.28 * unit} color={pal.bg} strokeWidth={2} />}
            {ev.label}
          </div>
        ) : (
          <div style={{ width: 0.2 * unit, height: 0.2 * unit, borderRadius: "50%", background: fill, boxShadow: glow }} />
        )}
      </div>
    );
  });
}

// The question stays readable during a beat's think window, with a countdown bar under it.
// Screen-fixed, outside the camera, and not a spec element, so it costs no on-screen slot.
export function Think({ ctx }: { ctx: Ctx }) {
  const { t, frame, unit, pal } = ctx;
  const beat = t.beats.find((b) => b.thinkFrames && frame >= b.start + b.frames - b.thinkFrames && frame < b.start + b.frames);
  if (!beat) return null;
  const local = frame - (beat.start + beat.frames - beat.thinkFrames);
  const opacity = interpolate(local, [0, 8, beat.thinkFrames - 8, beat.thinkFrames], [0, 1, 1, 0], clamp);
  const left = 1 - local / beat.thinkFrames;
  return (
    <div style={{ position: "absolute", left: "50%", bottom: 0.4 * unit, transform: "translateX(-50%)", opacity, textAlign: "center",
      fontFamily: sans, fontSize: 0.22 * unit, color: pal.muted, maxWidth: 14 * unit, width: "max-content",
      background: alpha(pal.bg, 0.95), borderRadius: 0.15 * unit, padding: `${0.2 * unit}px ${0.4 * unit}px` }}>
      <div style={{ fontSize: 0.32 * unit, color: pal.text, marginBottom: 0.15 * unit }}>{beat.say}</div>
      pause and predict
      <div style={{ margin: `${0.12 * unit}px auto 0`, width: 3 * unit, height: 0.04 * unit, borderRadius: unit, background: pal.panel }}>
        <div style={{ width: `${left * 100}%`, height: "100%", borderRadius: unit, background: pal.accent }} />
      </div>
    </div>
  );
}

// The current chapter, small in the top-left corner, screen-fixed like Think.
export function Chapter({ ctx }: { ctx: Ctx }) {
  const { t, frame, unit, pal } = ctx;
  const ch = t.chapters.findLast((c) => c.frame <= frame);
  if (!ch) return null;
  const enter = ease(frame - ch.frame, t.fps);
  return (
    <div style={{ position: "absolute", left: 0.5 * unit, top: 0.35 * unit, display: "flex", alignItems: "center", gap: 0.15 * unit, opacity: enter,
      transform: `translateX(${(1 - enter) * -0.3 * unit}px)`, fontFamily: sans, fontSize: 0.22 * unit, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", color: pal.muted }}>
      <div style={{ width: 0.06 * unit, height: 0.3 * unit, borderRadius: unit, background: pal.accent }} />
      {ch.title}
    </div>
  );
}
