import React from "react";
import { interpolateColors } from "remotion";
import { control as defs, CTL, GAUGE_H, gaugeAngle, polar, toggleW } from "../../components/control.ts";
import type { TypesOf } from "../../components/registry.ts";
import { alpha, Caption, dashed, iconFor, mono, Panel, stroke, Text, type Renderers } from "../kit.tsx";

const unit01 = (v: number) => Math.min(Math.max(v, 0), 1);
// The footprint, a column: the widget, then its caption.
const Col = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => (
  <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>{children}</div>
);
// The old content rolls out and the new one in, clipped to one cell (p: 0 -> 1; up: the new one comes from below).
const Roll = ({ from, to, p, up = true, style }: { from: React.ReactNode; to: React.ReactNode; p: number; up?: boolean; style?: React.CSSProperties }) => {
  const [q, d] = [unit01(p), up ? 1 : -1];
  return (
    <span style={{ display: "inline-grid", overflow: "hidden", ...style }}>
      <span style={{ gridArea: "1 / 1", transform: `translateY(${-q * d * 100}%)`, opacity: 1 - q }}>{from}</span>
      <span style={{ gridArea: "1 / 1", transform: `translateY(${(1 - q) * d * 100}%)`, opacity: q }}>{to}</span>
    </span>
  );
};
// 12000 -> "12k", 1250000 -> "1.3M"; small numbers keep one decimal unless whole. Values stop at 1e12.
const compact = (n: number, whole: boolean) => {
  const r = (x: number) => String(Number(x.toFixed(1)));
  if (Math.abs(n) >= 1e12) return `${r(n / 1e12)}T`;
  if (Math.abs(n) >= 1e9) return `${r(n / 1e9)}B`;
  if (Math.abs(n) >= 1e6) return `${r(n / 1e6)}M`;
  if (Math.abs(n) >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (Math.abs(n) >= 1e3) return `${r(n / 1e3)}k`;
  return whole ? String(Math.round(n)) : r(n);
};
const arc = (a0: number, a1: number, r: number, cx: number, cy: number, u: number) => {
  const [p, q] = [polar(a0, r), polar(a1, r)];
  return `M${(cx + p[0]) * u} ${(cy + p[1]) * u} A${r * u} ${r * u} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${(cx + q[0]) * u} ${(cy + q[1]) * u}`;
};

export const control: Renderers<TypesOf<typeof defs>> = {
  // track and knob ease from muted to the element's color; the state word cross-fades beside it
  toggle: ({ el, u, w, h, color, bad, ctx, tween }) => {
    const k = tween((e) => (e.on ? 1 : 0));
    const tint = interpolateColors(unit01(k), [0, 1], [ctx.pal.muted, color]);
    const [tw, th] = CTL.track;
    const word = (text: string, on: boolean) => <Text u={u} mono color={on ? color : ctx.pal.muted}>{text}</Text>;
    return (
      <Col w={w} h={h}>
        <div style={{ width: toggleW(el) * u, height: 0.6 * u, display: "flex", alignItems: "center", gap: 0.2 * u }}>
          <div style={{ position: "relative", flex: "none", width: tw * u, height: th * u, boxSizing: "border-box", borderRadius: th * u,
            border: stroke(bad, u, bad ? color : tint, 0.03), background: alpha(tint, 0.12 + 0.3 * unit01(k)) }}>
            <div style={{ position: "absolute", top: "50%", left: (tw / 2 - 0.22 + (2 * k - 1) * 0.22 - 0.03) * u, width: 0.44 * u, height: 0.44 * u,
              transform: "translateY(-50%) scale(0.86)", borderRadius: "50%", background: tint }} />
          </div>
          <Roll from={word(el.offLabel ?? "off", false)} to={word(el.onLabel ?? "on", true)} p={k} />
        </div>
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </Col>
    );
  },
  // the shackle drops into the body as it locks; the owner pill (or "free") cross-fades beside it
  lock: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const k = tween((e) => (e.locked ? 1 : 0));
    const tint = interpolateColors(unit01(k), [0, 1], [ctx.pal.muted, color]);
    const [lw, lh] = CTL.lock;
    const top = 0.68; // body top in the graphic
    const lift = (1 - k) * 0.2;
    const sw = 0.1;
    // locked with no owner named is still held, never "free"
    const holder = (e: typeof el) => (e.locked ? e.owner || "held" : "");
    const [now, was] = [holder(el), holder(change.prev)];
    const pill = (who: string) => who ? (
      <div style={{ display: "inline-flex", height: 0.42 * u, alignItems: "center", padding: `0 ${0.16 * u}px`, boxSizing: "border-box",
        borderRadius: 0.21 * u, border: stroke(bad, u, color), background: alpha(color, 0.15) }}>
        <Text u={u} size={0.22} mono color={ctx.pal.text}>{who}</Text>
      </div>
    ) : <div style={{ height: 0.42 * u, display: "flex", alignItems: "center" }}><Text u={u} size={0.24} color={ctx.pal.muted}>free</Text></div>;
    return (
      <Col w={w} h={h}>
        <div style={{ display: "flex", gap: 0.15 * u, width: (lw + 0.15 + CTL.owner) * u, height: lh * u }}>
          <svg width={lw * u} height={lh * u} style={{ flex: "none", overflow: "visible" }}>
            <path d={`M${0.19 * u} ${(top + 0.3 - lift) * u} V${(top - 0.16 - lift) * u} A${0.26 * u} ${0.26 * u} 0 0 1 ${0.71 * u} ${(top - 0.16 - lift) * u} V${(top + 0.04 - lift) * u}`}
              fill="none" stroke={tint} strokeWidth={sw * u} strokeLinecap="round" />
            <rect x={0.05 * u} y={top * u} width={0.8 * u} height={(lh - top - 0.02) * u} rx={0.1 * u} fill={ctx.pal.bg} />
            <rect x={0.05 * u} y={top * u} width={0.8 * u} height={(lh - top - 0.02) * u} rx={0.1 * u} fill={alpha(tint, 0.2)}
              stroke={bad ? color : tint} strokeWidth={0.035 * u} strokeDasharray={dashed(bad, u)} />
            <circle cx={0.45 * u} cy={(top + 0.25) * u} r={0.07 * u} fill={tint} />
            <path d={`M${0.45 * u} ${(top + 0.27) * u} V${(top + 0.45) * u}`} stroke={tint} strokeWidth={0.05 * u} strokeLinecap="round" />
          </svg>
          <div style={{ width: CTL.owner * u, marginTop: (top + (lh - top) / 2 - 0.21) * u }}>
            {now === was ? pill(now) : <Roll from={pill(was)} to={pill(now)} p={change.p} up={!!now} />}
          </div>
        </div>
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </Col>
    );
  },
  // tokens leave from the right one by one (shrinking upwards) and come back in the same order
  tokens: ({ el, u, w, h, color, bad, ctx, change }) => {
    const [was, now, p] = [change.prev.filled, el.filled, unit01(change.p)];
    const m = Math.abs(now - was);
    const level = (i: number) => {
      if (i < Math.min(was, now)) return 1;
      if (i >= Math.max(was, now)) return 0;
      const step = unit01(p * m - (now < was ? was - 1 - i : i - was));
      return now < was ? 1 - step : step;
    };
    const Refill = iconFor("refresh-cw");
    return (
      <Col w={w} h={h}>
        <Panel u={u} color={color} bad={bad} style={{ width: (el.capacity * CTL.token + 0.3) * u, height: CTL.frame * u, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {Array.from({ length: el.capacity }, (_, i) => {
            const f = level(i);
            return (
              <div key={i} style={{ width: CTL.token * u, display: "flex", justifyContent: "center" }}>
                <div style={{ width: 0.34 * u, height: 0.34 * u, borderRadius: "50%", boxSizing: "border-box", border: stroke(bad, u, alpha(color, 0.45)), position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0.03 * u, borderRadius: "50%", background: color, opacity: f,
                    transform: `translateY(${-(1 - f) * 0.15 * u}px) scale(${0.5 + 0.5 * f})` }} />
                </div>
              </div>
            );
          })}
        </Panel>
        <div style={{ height: 0.45 * u, display: "flex", alignItems: "flex-end", gap: 0.18 * u }}>
          <Text u={u} color={ctx.pal.text} style={{ lineHeight: 1 }}>{el.label}</Text>
          {el.rate && <div style={{ display: "flex", alignItems: "center", gap: 0.06 * u }}>
            <Refill size={0.2 * u} color={ctx.pal.muted} strokeWidth={2} />
            <Text u={u} size={0.22} mono color={ctx.pal.muted} style={{ lineHeight: 1 }}>{el.rate}</Text>
          </div>}
        </div>
      </Col>
    );
  },
  // zones painted on a 240° dial, the needle eases to the new value, the readout counts with it
  gauge: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const v = tween((e) => e.value);
    const cx = w / u / 2;
    const cy = 1.08;
    const a = (x: number) => gaugeAngle(el, x);
    const zones = el.zones ?? [];
    const zone = zones.find((z) => v <= z.to) ?? zones.at(-1);
    const whole = Number.isInteger(el.value) && Number.isInteger(change.prev.value);
    const [nx, ny] = polar(a(v), 0.72);
    const sw = 0.14;
    return (
      <Col w={w} h={h}>
        <svg width={w} height={GAUGE_H * u}>
          {zones.length ? zones.map((z, i) => (
            <path key={i} d={arc(a(i ? zones[i - 1].to : el.min), a(z.to), CTL.dial, cx, cy, u)} fill="none" stroke={ctx.pal[z.color]}
              strokeOpacity={0.85} strokeWidth={sw * u} strokeDasharray={dashed(z.color === "bad", u)} />
          )) : <>
            <path d={arc(a(el.min), a(el.max), CTL.dial, cx, cy, u)} fill="none" stroke={alpha(ctx.pal.muted, 0.35)} strokeWidth={sw * u} />
            {v > el.min && <path d={arc(a(el.min), a(v), CTL.dial, cx, cy, u)} fill="none" stroke={color} strokeWidth={sw * u} strokeDasharray={dashed(bad, u)} />}
          </>}
          <line x1={cx * u} y1={cy * u} x2={(cx + nx) * u} y2={(cy + ny) * u} stroke={ctx.pal.text} strokeWidth={0.05 * u} strokeLinecap="round" />
          <circle cx={cx * u} cy={cy * u} r={0.08 * u} fill={ctx.pal.text} />
          <text x={cx * u} y={(cy + 0.66) * u} textAnchor="middle" fontFamily={mono} fontSize={0.36 * u} fill={zone ? ctx.pal[zone.color] : color}>
            {compact(v, whole)}
            <tspan fontSize={0.22 * u} fill={ctx.pal.muted} dx={0.04 * u}>{el.unit}</tspan>
          </text>
        </svg>
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </Col>
    );
  },
  // the fill eases to the new value; the readout counts with it
  progress: ({ el, u, w, h, color, bad, ctx, tween }) => {
    const v = tween((e) => e.value);
    const whole = Number.isInteger(el.value) && Number.isInteger(el.total ?? 0.5);
    const frac = unit01(el.total ? v / el.total : v);
    const read = el.total ? `${compact(v, whole)} / ${compact(el.total, whole)}` : `${Math.round(frac * 100)}%`;
    return (
      <div style={{ width: w, height: h, display: "flex", flexDirection: "column", gap: 0.14 * u }}>
        <div style={{ height: 0.42 * u, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 0.3 * u }}>
          <Text u={u} color={ctx.pal.text}>{el.label}</Text>
          <Text u={u} size={0.24} mono color={ctx.pal.muted}>{read}</Text>
        </div>
        <div style={{ height: 0.24 * u, borderRadius: 0.12 * u, boxSizing: "border-box", border: stroke(bad, u, alpha(color, 0.6)), background: alpha(ctx.pal.muted, 0.15), overflow: "hidden" }}>
          <div style={{ width: `${frac * 100}%`, height: "100%", background: color, borderRadius: 0.12 * u }} />
        </div>
      </div>
    );
  },
  // digits that changed roll from the old value to the new one (up when it grows)
  counter: ({ el, u, w, h, color, bad, ctx, change }) => {
    const [a, b] = [String(change.prev.value), String(el.value)];
    const n = Math.max(a.length, b.length);
    const [from, to] = [a.padStart(n), b.padStart(n)];
    const up = typeof el.value === "number" && typeof change.prev.value === "number" ? el.value >= change.prev.value : true;
    return (
      <Col w={w} h={h}>
        <Panel u={u} color={color} bad={bad} style={{ width: w, height: 0.8 * u, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: mono, fontSize: 0.5 * u, lineHeight: 1.2, color: ctx.pal.text, whiteSpace: "pre" }}>
            {[...to].map((c, i) => c === from[i] ? <span key={i}>{c}</span> : <Roll key={i} from={from[i]} to={c} p={change.p} up={up} />)}
          </div>
          {el.unit && <Text u={u} size={0.22} mono color={ctx.pal.muted} style={{ marginLeft: 0.08 * u, alignSelf: "center", marginTop: 0.12 * u }}>{el.unit}</Text>}
        </Panel>
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </Col>
    );
  },
  // a newly done item's check draws itself in; one undone fades out
  checklist: ({ el, u, w, h, color, bad, ctx, change }) => {
    const p = unit01(change.p);
    return (
      <Col w={w} h={h}>
        <Panel u={u} color={color} bad={bad} style={{ width: w, padding: `${0.1 * u}px 0`, display: "flex", flexDirection: "column" }}>
          {el.items.map((item, i) => {
            const before = change.prev.items[i];
            const d = item.done ? (before?.done ? 1 : p) : before?.done ? 1 - p : 0;
            return (
              <div key={i} style={{ height: CTL.row * u, display: "flex", alignItems: "center", gap: 0.2 * u, padding: `0 ${0.2 * u}px` }}>
                <svg width={0.3 * u} height={0.3 * u} style={{ flex: "none", overflow: "visible" }}>
                  <rect x={0.015 * u} y={0.015 * u} width={0.27 * u} height={0.27 * u} rx={0.06 * u} fill={alpha(color, 0.25 * d)}
                    stroke={color} strokeWidth={0.03 * u} strokeDasharray={dashed(bad, u / 2)} />
                  <path d={`M${0.07 * u} ${0.155 * u} L${0.13 * u} ${0.215 * u} L${0.235 * u} ${0.09 * u}`} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - d}
                    fill="none" stroke={color} strokeWidth={0.045 * u} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Text u={u} color={ctx.pal.text} style={{ opacity: before && before.label !== item.label ? p : 1 }}>{item.label}</Text>
              </div>
            );
          })}
        </Panel>
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </Col>
    );
  },
};
