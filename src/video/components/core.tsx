import { InnerLine, InnerToken, Pre, type AnnotationHandler, type HighlightedCode } from "codehike/code";
import { calculateTransitions, getStartingSnapshot, type TokenTransitionsSnapshot } from "codehike/utils/token-transitions";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Easing, interpolate, interpolateColors, Sequence, useCurrentFrame, useDelayRender } from "remotion";
import type { core as defs } from "../../components/core.ts";
import type { TypesOf } from "../../components/registry.ts";
import { TIMING } from "../../timeline.ts";
import { alpha, animate, arrowPath, Caption, clamp, dashed, iconFor, mono, paint, partial, sans, stroke, svgPath, type Renderers } from "../kit.tsx";
import { DIM } from "../theme.ts";

export const core: Renderers<TypesOf<typeof defs>> = {
  box: ({ el, u, w, h, color, bad, ctx }) => {
    const Icon = el.icon ? iconFor(el.icon) : null;
    return (
      <div style={{ width: w, height: h, border: stroke(bad, u, color), borderRadius: 0.15 * u, background: alpha(color, 0.1),
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.12 * u, boxSizing: "border-box",
        fontFamily: sans, fontSize: 0.3 * u, color: ctx.pal.text, textAlign: "center", padding: 0.1 * u, whiteSpace: "pre-wrap" }}>
        {Icon && <Icon size={0.55 * u} color={color} strokeWidth={1.6} />}
        {el.label}
      </div>
    );
  },
  icon: ({ el, u, w, color, ctx }) => {
    const Icon = iconFor(el.icon);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Icon size={w} color={color} strokeWidth={1.4} />
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </div>
    );
  },
  // a quiet system boundary drawn behind its components, name in the corner
  group: ({ el, u, w, h, color, bad, ctx }) => (
    <div style={{ position: "relative", width: w, height: h, border: stroke(bad, u, alpha(color, 0.4)), borderRadius: 0.25 * u, background: alpha(color, 0.05), boxSizing: "border-box" }}>
      <div style={{ position: "absolute", left: 0.25 * u, top: 0.15 * u, fontFamily: sans, fontSize: 0.22 * u, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase", color: ctx.pal.muted }}>{el.label}</div>
    </div>
  ),
  cells: ({ el, u, color, bad, ctx }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 0.06 * u }}>
        {el.items.map((item, i) => {
          const lit = el.highlight?.includes(i);
          return (
            <div key={i} style={{ width: 0.74 * u, height: 0.74 * u, boxSizing: "border-box", border: stroke(bad, u, color), borderRadius: 0.08 * u,
              background: lit ? alpha(color, 0.6) : item ? alpha(color, 0.2) : "transparent", boxShadow: lit ? `0 0 ${0.25 * u}px ${color}` : undefined,
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 0.22 * u, color: ctx.pal.text, overflow: "hidden" }}>{item}</div>
          );
        })}
      </div>
      <Caption u={u} text={el.label} pal={ctx.pal} />
    </div>
  ),
  text: ({ el, u, tr, ctx }) => {
    const size = { h1: 0.62, h2: 0.42, body: 0.3 }[el.size ?? "body"];
    return (
      <div style={{ fontFamily: sans, fontSize: size * u, fontWeight: el.size === "body" || !el.size ? 400 : 600,
        color: paint(tr, ctx, ctx.pal.text).color, whiteSpace: "pre-wrap", textAlign: "center", width: "max-content", maxWidth: 14 * u }}>
        {el.text}
      </div>
    );
  },
  code: (p) => <Code {...p} />,
  arrow: ({ el, tr, ctx, enter }) => {
    const { unit: u, t, pal } = ctx;
    const { points, mid, normal, side } = arrowPath(el, ctx);
    const { color, bad } = paint(tr, ctx, pal.muted);
    const weight = { thin: 0.022, normal: 0.035, thick: 0.06 }[el.weight ?? "normal"];
    const dash = bad || el.line === "dashed" ? dashed(true, u) : el.line === "dotted" ? `${0.01 * u} ${0.09 * u}` : undefined;
    const grow = partial(points, enter);
    const [end, before] = [grow.at(-1)!, grow.at(-2)!];
    const head = (tip: number[], from: number[], key: string) => {
      const angle = (Math.atan2(tip[1] - from[1], tip[0] - from[0]) * 180) / Math.PI;
      const s = 0.16 * u * Math.sqrt(weight / 0.035);
      return <polygon key={key} points={`0,0 ${-s},${-s * 0.6} ${-s},${s * 0.6}`} fill={color} transform={`translate(${tip[0] * u} ${tip[1] * u}) rotate(${angle})`} />;
    };
    // label sits beside the line on the bend/offset side, anchored away from it so it never crosses it
    const [nx, ny] = [normal[0] * side, normal[1] * side];
    const anchor = Math.abs(nx) < 0.5 ? "middle" : nx < 0 ? "end" : "start";
    return (
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={t.width} height={t.height}>
        <path d={svgPath(grow, u)} stroke={color} strokeWidth={weight * u} strokeLinecap="round" fill="none" strokeDasharray={dash} />
        {el.heads !== "none" && head(end, before, "end")}
        {el.heads === "both" && enter > 0.95 && head(points[0], points[1], "start")}
        {el.label && (
          <text x={(mid[0] + nx * 0.25) * u} y={(mid[1] + ny * 0.3) * u} fill={pal.muted} fontFamily={sans} fontSize={0.22 * u}
            textAnchor={anchor} dominantBaseline="middle" opacity={enter}>{el.label}</text>
        )}
      </svg>
    );
  },
};

function Code({ el, tr, ctx, u }: Parameters<(typeof core)["code"]>[0]) {
  const { t, frame, pal } = ctx;
  if (!tr.highlighted) throw new Error(`code '${el.id}' was not highlighted before render`);
  const id = el.id;
  const versions = tr.highlighted;
  const inRanges = (n: number, lines: [number, number][]) => lines.some(([a, b]) => n >= a && n <= b);
  const lineOpacity = (n: number) =>
    animate(1, t.focus.map((f) => ({ frame: f.frame, value: f.ids?.[0] === id && f.lines && !inRanges(n, f.lines) ? DIM : 1 })), frame, t.fps);
  const handlers: AnnotationHandler[] = [
    { name: "token-transitions", Token: (p) => <InnerToken merge={p} style={{ display: "inline-block" }} /> },
    { name: "line-focus", Line: (p) => <InnerLine merge={p} style={{ opacity: lineOpacity(p.lineNumber) }} /> },
  ];
  const preStyle: React.CSSProperties = { ...versions[0].style, background: "transparent", margin: 0, position: "relative",
    fontFamily: mono, fontSize: 0.3 * u, lineHeight: 1.5, tabSize: 2, fontVariantLigatures: "none" }; // "===" stays three characters
  const morphs = tr.morphs;
  return (
    <div style={{ background: pal.panel, borderRadius: 0.15 * u, padding: `${0.3 * u}px ${0.4 * u}px`, whiteSpace: "nowrap" }}>
      {el.title && <div style={{ fontFamily: sans, fontSize: 0.2 * u, color: pal.muted, marginBottom: 0.15 * u }}>{el.title}</div>}
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
