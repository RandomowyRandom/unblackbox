import React, { useId } from "react";
import { interpolateColors } from "remotion";
import {
  BARS, barLabelW, barRect, barScale, barSlot, CHART, chartTop, COMPARE, compareH, DONUT, FUNNEL, funnelLabelW, funnelX, funnelY, VENN, vennLayout,
  type charts as defs,
} from "../../components/charts.ts";
import type { TypesOf } from "../../components/registry.ts";
import { alpha, dashed, iconFor, mono, Panel, sans, stroke, tone, type Renderers, type RProps } from "../kit.tsx";

const num = new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 });
const pct = new Intl.NumberFormat("en", { style: "percent", maximumSignificantDigits: 2 });
const fmt = (v: number) => num.format(v);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
// Fades between two semantic colors as a set changes one.
const mix = (a: string, b: string, p: number) => (a === b ? b : interpolateColors(p, [0, 1], [a, b]));
// Row i of a list a set changed: 1 if it stays, fading in if new, fading out if gone.
const presence = (now: unknown[], prev: unknown[], i: number, p: number) => (i < now.length ? (i < prev.length ? 1 : p) : 1 - p);
// Text that a set changed cross-fades instead of snapping.
const swap = (prev: string | undefined, now: string | undefined, p: number, draw: (s: string, o: number, key: string) => React.ReactNode) =>
  prev === now || prev === undefined ? (now === undefined ? null : draw(now, 1, "now")) : [draw(prev, 1 - p, "prev"), now !== undefined && draw(now, p, "now")];

// Every chart draws in an SVG with its origin at the element center, in px of `u` per grid unit,
// so a footprint that changes with a set never shifts what is drawn.
const Svg = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <svg width={w} height={h} viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>{children}</svg>
);
type T = { u: number; x: number; y: number; size?: number; fill: string; anchor?: "start" | "middle" | "end"; mono?: boolean; bold?: boolean; o?: number; children: React.ReactNode };
const Txt = ({ u, x, y, size = 0.24, fill, anchor = "middle", mono: m, bold, o = 1, children }: T) => (
  <text x={x * u} y={y * u} fill={fill} fontFamily={m ? mono : sans} fontSize={Math.max(size, 0.2) * u} fontWeight={bold ? 600 : 400}
    textAnchor={anchor} dominantBaseline="central" opacity={o}>{children}</text>
);

export const charts: Renderers<TypesOf<typeof defs>> = {
  bars: ({ el, u, w, h, color, ctx, tween, change }) => {
    const { pal } = ctx;
    const n = tween((e) => e.bars.length);
    const scale = tween(barScale);
    const prev = change.prev.bars;
    const rows = Array.from({ length: Math.max(el.bars.length, prev.length) }, (_, i) => {
      const b = el.bars[i] ?? prev[i];
      const o = presence(el.bars, prev, i, change.p);
      const value = tween((e) => e.bars[i]?.value ?? 0);
      const r = barRect(el, i, n, value / scale);
      const c = mix(tone(pal, prev[i]?.color, color), tone(pal, el.bars[i]?.color, color), change.p);
      const bad = b.color === "bad";
      const label = (s: string, lo: number, key: string) => el.orient === "h"
        ? <Txt key={key} u={u} x={r.x - r.w / 2 - 0.15} y={r.y} anchor="end" fill={pal.muted} o={lo}>{s}</Txt>
        : <Txt key={key} u={u} x={r.x} y={BARS.base + 0.28} fill={pal.muted} o={lo}>{s}</Txt>;
      return (
        <g key={i} opacity={o}>
          <rect x={(r.x - r.w / 2) * u} y={(r.y - r.h / 2) * u} width={r.w * u} height={r.h * u} rx={0.05 * u}
            fill={alpha(c, 0.45)} stroke={c} strokeWidth={0.025 * u} strokeDasharray={dashed(bad, u)} />
          {el.orient === "h"
            ? <Txt u={u} x={r.x + r.w / 2 + 0.1} y={r.y} size={0.22} anchor="start" mono fill={pal.text}>{fmt(value)}</Txt>
            : <Txt u={u} x={r.x} y={r.y - r.h / 2 - 0.18} size={0.22} mono fill={pal.text}>{fmt(value)}</Txt>}
          {swap(prev[i]?.label, el.bars[i]?.label, change.p, label)}
        </g>
      );
    });
    // the unit once, top-left, and the baseline every bar stands on
    const v = el.orient !== "h";
    const left = v ? -(n * barSlot(el)) / 2 : -w / u / 2;
    const top = v ? -1.4 : -(BARS.cap + n * BARS.row) / 2 + 0.15;
    const x0 = left + barLabelW(el) + 0.15;
    const span = (BARS.cap + n * BARS.row) / 2;
    return (
      <Svg w={w} h={h}>
        <Txt u={u} x={left} y={top} size={0.22} anchor="start" fill={pal.muted}>{el.unit}</Txt>
        {v
          ? <line x1={left * u} x2={-left * u} y1={BARS.base * u} y2={BARS.base * u} stroke={pal.muted} strokeWidth={0.02 * u} />
          : <line x1={x0 * u} x2={x0 * u} y1={(-span + BARS.cap) * u} y2={span * u} stroke={pal.muted} strokeWidth={0.02 * u} />}
        {rows}
      </Svg>
    );
  },

  chart: ({ el, u, w, h, color, ctx, tween, change }) => {
    const { pal } = ctx;
    const { x0, x1, y0, y1 } = CHART;
    const top = tween(chartTop);
    const n = tween((e) => Math.max(...e.series.map((s) => s.points.length)));
    const step = (x1 - x0) / Math.max(n - 1, 1);
    const y = (v: number) => y1 - (v / top) * (y1 - y0);
    const thr = el.threshold;
    const prev = change.prev.series;
    const lines = Array.from({ length: Math.max(el.series.length, prev.length) }, (_, s) => {
      const sr = el.series[s] ?? prev[s];
      const len = tween((e) => e.series[s]?.points.length ?? 1);
      const count = Math.max(el.series[s]?.points.length ?? 0, prev[s]?.points.length ?? 0);
      // new points start on the last one and slide out as the x step shrinks: the line extends
      const pts = Array.from({ length: count }, (_, k) => {
        const v = tween((e) => { const p = e.series[s]?.points; return p ? (p[k] ?? p.at(-1)!) : 0; });
        return { x: x0 + Math.min(k, len - 1) * step, y: y(v), v };
      });
      const c = mix(tone(pal, prev[s]?.color, color), tone(pal, el.series[s]?.color, color), change.p);
      return { label: sr.label, c, bad: sr.color === "bad", pts, o: presence(el.series, prev, s, change.p), end: pts.at(-1)! };
    });
    // direct labels at the line ends and the threshold's (i = -1) in the right column, nudged apart so they never overlap
    const ends = [...lines.map((l, i) => ({ i, y: l.end.y })), ...(thr ? [{ i: -1, y: y(thr.value) }] : [])].sort((a, b) => a.y - b.y);
    ends.forEach((e, k) => { if (k) e.y = Math.max(e.y, ends[k - 1].y + 0.3); });
    const ticks = [0, top / 2, top];
    return (
      <Svg w={w} h={h}>
        <Txt u={u} x={-CHART.w / 2 + 0.1} y={-CHART.h / 2 + 0.2} size={0.22} anchor="start" fill={pal.muted}>{el.yLabel}</Txt>
        {ticks.map((t, i) => (
          <g key={i}>
            {i > 0 && <line x1={x0 * u} x2={x1 * u} y1={y(t) * u} y2={y(t) * u} stroke={alpha(pal.muted, 0.25)} strokeWidth={0.015 * u} />}
            <Txt u={u} x={x0 - 0.12} y={y(t)} size={0.2} anchor="end" mono fill={pal.muted}>{fmt(t)}</Txt>
          </g>
        ))}
        <path d={`M${x0 * u} ${y0 * u} L${x0 * u} ${y1 * u} L${x1 * u} ${y1 * u}`} stroke={pal.muted} strokeWidth={0.02 * u} fill="none" />
        <Txt u={u} x={(x0 + x1) / 2} y={y1 + 0.35} size={0.22} fill={pal.muted}>{el.xLabel}</Txt>
        {thr && (
          <g>
            <line x1={x0 * u} x2={x1 * u} y1={y(thr.value) * u} y2={y(thr.value) * u} stroke={pal.muted} strokeWidth={0.02 * u} strokeDasharray={dashed(true, u)} />
            <Txt u={u} x={x1 + 0.15} y={ends.find((e) => e.i === -1)!.y} size={0.2} anchor="start" fill={pal.muted}>{thr.label}</Txt>
          </g>
        )}
        {lines.map((l, s) => (
          <g key={s} opacity={l.o}>
            <path d={l.pts.map((p, k) => `${k ? "L" : "M"}${p.x * u} ${p.y * u}`).join(" ")} stroke={l.c} strokeWidth={0.045 * u}
              strokeLinejoin="round" strokeLinecap="round" fill="none" strokeDasharray={dashed(l.bad, u)} />
            {thr && l.pts.map((p, k) => (
              <circle key={k} cx={p.x * u} cy={p.y * u} r={0.08 * u} fill={pal.bad} opacity={clamp01((p.v - thr.value) / (top * 0.03))} />
            ))}
            <Txt u={u} x={l.end.x + 0.15} y={ends.find((e) => e.i === s)!.y} size={0.22} anchor="start" fill={l.c}>{l.label}</Txt>
          </g>
        ))}
      </Svg>
    );
  },

  donut: ({ el, u, w, h, color, ctx, tween, change }) => {
    const { pal } = ctx;
    const prev = change.prev.slices;
    const count = Math.max(el.slices.length, prev.length);
    const vals = Array.from({ length: count }, (_, i) => tween((e) => e.slices[i]?.value ?? 0));
    const total = vals.reduce((s, v) => s + v, 0) || 1;
    const { r, ring, label: lr } = DONUT;
    const at = (a: number, rad: number) => `${Math.cos(a) * rad * u} ${Math.sin(a) * rad * u}`;
    let acc = 0;
    const slices = vals.map((v, i) => {
      const frac = v / total;
      const a0 = -Math.PI / 2 + acc * 2 * Math.PI;
      acc += frac;
      const gap = Math.min(0.04, frac * Math.PI);
      const [s, e] = [a0 + gap / 2, a0 + frac * 2 * Math.PI - gap / 2];
      const large = e - s > Math.PI ? 1 : 0;
      const sl = el.slices[i] ?? prev[i];
      const c = mix(tone(pal, prev[i]?.color, color), tone(pal, el.slices[i]?.color, color), change.p);
      // slices without their own color are told apart by fill strength
      const fill = alpha(c, sl.color ? 0.55 : [0.7, 0.45, 0.3, 0.2, 0.14, 0.1][i]);
      const mid = (s + e) / 2;
      const cos = Math.cos(mid);
      const o = presence(el.slices, prev, i, change.p) * clamp01(frac / 0.02);
      const text = (str: string, so: number, key: string) => (
        <Txt key={key} u={u} x={cos * lr} y={Math.sin(mid) * lr} anchor={cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle"} fill={pal.text} o={so}>
          {str} <tspan fontFamily={mono} fontSize={0.22 * u} fill={pal.muted}>{pct.format(frac)}</tspan>
        </Txt>
      );
      return (
        <g key={i} opacity={o}>
          {e > s && <path d={`M${at(s, r)} A${r * u} ${r * u} 0 ${large} 1 ${at(e, r)} L${at(e, r - ring)} A${(r - ring) * u} ${(r - ring) * u} 0 ${large} 0 ${at(s, r - ring)} Z`}
            fill={fill} stroke={c} strokeWidth={0.02 * u} strokeDasharray={dashed(sl.color === "bad", u)} />}
          {swap(prev[i]?.label, el.slices[i]?.label, change.p, text)}
        </g>
      );
    });
    return (
      <Svg w={w} h={h}>
        {slices}
        <Txt u={u} x={0} y={el.center ? -0.1 : 0} size={0.42} mono fill={pal.text}>{pct.format(vals[0] / total)}</Txt>
        {el.center && <Txt u={u} x={0} y={0.25} size={0.2} fill={pal.muted}>{el.center}</Txt>}
      </Svg>
    );
  },

  compare: ({ el, u, color, ctx, tween, change }) => {
    const { pal } = ctx;
    const height = compareH(tween((e) => Math.max(...e.columns.map((c) => c.items.length))));
    const verdict = (v: "good" | "bad" | undefined) => (v ? pal[v] : color);
    return (
      <div style={{ display: "flex", gap: COMPARE.gap * u, alignItems: "center" }}>
        {el.columns.map((col, i) => {
          const was = change.prev.columns[i];
          const c = mix(verdict(was?.verdict), verdict(col.verdict), change.p);
          const Icon = col.icon ? iconFor(col.icon) : null;
          const mark = (v: "good" | "bad" | undefined, o: number, key: string) => {
            const M = iconFor(v === "good" ? "check" : "x");
            return v && <M key={key} size={0.34 * u} color={pal[v]} strokeWidth={2.4} style={{ position: "absolute", right: 0.2 * u, opacity: o }} />;
          };
          const row = (s: string, o: number, key: string) => (
            <div key={key} style={{ position: "absolute", inset: 0, opacity: o, transform: `translateY(${(1 - o) * 0.12 * u}px)`,
              overflow: "hidden", textOverflow: "ellipsis" }}>{s}</div>
          );
          const items = Array.from({ length: Math.max(col.items.length, was?.items.length ?? 0) }, (_, k) => (
            <div key={k} style={{ position: "relative", height: COMPARE.item * u }}>{swap(was?.items[k], col.items[k], change.p, row)}</div>
          ));
          return (
            <Panel key={i} u={u} color={c} bad={col.verdict === "bad"} style={{ width: COMPARE.col * u, height: height * u, overflow: "hidden" }}>
              <div style={{ position: "relative", height: COMPARE.head * u, display: "flex", alignItems: "center", gap: 0.15 * u, padding: `0 ${0.25 * u}px`,
                fontFamily: sans, fontSize: 0.28 * u, fontWeight: 600, color: pal.text }}>
                {Icon && <Icon size={0.34 * u} color={c} strokeWidth={1.8} />}
                {col.title}
                {swap(was?.verdict, col.verdict, change.p, (v, o, key) => mark(v as "good" | "bad", o, key))}
              </div>
              <div style={{ padding: `0 ${0.25 * u}px`, fontFamily: sans, fontSize: 0.24 * u, lineHeight: `${COMPARE.item * u}px`, color: pal.text, whiteSpace: "nowrap" }}>
                {items}
              </div>
            </Panel>
          );
        })}
      </div>
    );
  },

  venn: (p) => <Venn {...p} />,

  funnel: ({ el, u, w, h, color, ctx, tween, change }) => {
    const { pal } = ctx;
    const n = tween((e) => e.stages.length);
    const first = tween((e) => e.stages[0].value) || 1;
    const prev = change.prev.stages;
    const cx = funnelX(el);
    const lx = cx - FUNNEL.track / 2 - FUNNEL.gap;
    const stages = Array.from({ length: Math.max(el.stages.length, prev.length) }, (_, i) => {
      const v = tween((e) => e.stages[i]?.value ?? 0);
      return { v, w: Math.max(FUNNEL.track * (v / first), 0.04), y: funnelY(i, n), o: presence(el.stages, prev, i, change.p) };
    });
    const half = FUNNEL.thick / 2;
    return (
      <Svg w={w} h={h}>
        {stages.slice(1).map((s, i) => {
          const a = stages[i];
          return <polygon key={`j${i}`} opacity={s.o} fill={alpha(color, 0.12)}
            points={[[cx - a.w / 2, a.y + half], [cx + a.w / 2, a.y + half], [cx + s.w / 2, s.y - half], [cx - s.w / 2, s.y - half]].map(([x, y]) => `${x * u},${y * u}`).join(" ")} />;
        })}
        {stages.map((s, i) => (
          <g key={i} opacity={s.o}>
            <rect x={(cx - s.w / 2) * u} y={(s.y - half) * u} width={s.w * u} height={FUNNEL.thick * u} rx={0.05 * u}
              fill={alpha(color, 0.45)} stroke={color} strokeWidth={0.025 * u} />
            {swap(prev[i]?.label, el.stages[i]?.label, change.p, (str, o, key) => (
              <Txt key={key} u={u} x={lx} y={s.y} anchor="end" fill={pal.text} o={o}>{str}</Txt>
            ))}
            <Txt u={u} x={cx + FUNNEL.track / 2 + FUNNEL.gap} y={s.y} size={0.22} anchor="start" mono fill={pal.text}>
              {fmt(s.v)} <tspan fill={pal.muted}>{pct.format(s.v / first)}</tspan>
            </Txt>
          </g>
        ))}
      </Svg>
    );
  },
};

// Circles, a glowing region (the old one fades out as the new one fades in), set labels, and items that glide between regions.
function Venn({ el, u, w, h, color, bad, ctx, tween, change }: RProps<"venn">) {
  const { pal } = ctx;
  const uid = useId().replace(/[^\w-]/g, "");
  const { centers, labels } = vennLayout(el);
  const R = VENN.r * u;
  const prev = change.prev.items;
  const region = (hl: string[] | undefined, o: number, key: string) => {
    if (!hl?.length || o <= 0) return null;
    const inside = el.sets.flatMap((s, i) => (hl.includes(s.id) ? [i] : []));
    const outside = el.sets.flatMap((s, i) => (hl.includes(s.id) ? [] : [i]));
    const fill = <rect x={-w} y={-h} width={2 * w} height={2 * h} fill={alpha(color, 0.4)} />;
    return (
      <g key={key} opacity={o}>
        <mask id={`${uid}${key}`}>
          <rect x={-w} y={-h} width={2 * w} height={2 * h} fill="white" />
          {outside.map((i) => <circle key={i} cx={centers[i][0] * u} cy={centers[i][1] * u} r={R} fill="black" />)}
        </mask>
        <g mask={`url(#${uid}${key})`}>{inside.reduceRight((child, i) => <g clipPath={`url(#${uid}c${i})`}>{child}</g>, fill)}</g>
      </g>
    );
  };
  const same = JSON.stringify(change.prev.highlight ?? []) === JSON.stringify(el.highlight ?? []);
  return (
    <Svg w={w} h={h}>
      <defs>{centers.map(([x, y], i) => <clipPath key={i} id={`${uid}c${i}`}><circle cx={x * u} cy={y * u} r={R} /></clipPath>)}</defs>
      {same ? region(el.highlight, 1, "now") : [region(change.prev.highlight, 1 - change.p, "prev"), region(el.highlight, change.p, "now")]}
      {centers.map(([x, y], i) => (
        <circle key={i} cx={x * u} cy={y * u} r={R} fill={alpha(color, 0.06)} stroke={color} strokeWidth={0.025 * u} strokeDasharray={dashed(bad, u)} />
      ))}
      {labels.map(([x, y], i) => <Txt key={i} u={u} x={x} y={y} size={0.26} bold fill={pal.text}>{el.sets[i].label}</Txt>)}
      {Array.from({ length: Math.max(el.items.length, prev.length) }, (_, i) => {
        const x = tween((e) => (e.items[i] ? vennLayout(e).items[i][0] : 0));
        const y = tween((e) => (e.items[i] ? vennLayout(e).items[i][1] : 0));
        return (
          <Txt key={i} u={u} x={x} y={y} size={0.22} fill={pal.text} o={presence(el.items, prev, i, change.p)}>{(el.items[i] ?? prev[i]).label}</Txt>
        );
      })}
    </Svg>
  );
}
