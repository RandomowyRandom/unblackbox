import React from "react";
import { interpolate, interpolateColors } from "remotion";
import {
  CY, cycleLayout, eventLabelW, eventRows, fmt, LN, lanesLayout, PL, pipelineLayout, RING, SEQ, sequenceLayout, tagX, timelineLayout, TL, type time as defs,
} from "../../components/time.ts";
import type { Pt, TypesOf } from "../../components/registry.ts";
import type { Palette } from "../../themes.ts";
import { along, alpha, Caption, clamp, dashed, iconFor, mono, partial, sans, svgPath, Text, type Renderers } from "../kit.tsx";

type Box = { u: number; w: number; h: number };
type Align = "start" | "center" | "end";
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
// color cross-fade; p is clamped since the spring can overshoot
const mix = (a: string, b: string, p: number) => interpolateColors(Math.min(1, Math.max(0, p)), [0, 1], [a, b]);

// A w x h board: an svg layer whose origin is the element center (grid offsets * u), and HTML labels on top.
const Board = ({ w, h, svg, children }: { w: number; h: number; svg: React.ReactNode; children?: React.ReactNode }) => (
  <div style={{ position: "relative", width: w, height: h }}>
    <svg width={w} height={h} viewBox={`${-w / 2} ${-h / 2} ${w} ${h}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>{svg}</svg>
    {children}
  </div>
);
// A text box `width` units wide at offset (x, y): centered on x, or starting / ending there.
const spot = ({ u, w, h }: Box, x: number, y: number, width: number, align: Align = "center"): React.CSSProperties => ({
  position: "absolute", width: width * u, top: h / 2 + y * u, transform: "translateY(-50%)",
  left: w / 2 + (x - (align === "center" ? width / 2 : align === "end" ? width : 0)) * u,
  textAlign: align === "center" ? "center" : align === "end" ? "right" : "left",
});
const Svgtext = ({ u, x, y, color, anchor = "middle", size = 0.22, isMono, children }:
  { u: number; x: number; y: number; color: string; anchor?: "start" | "middle" | "end"; size?: number; isMono?: boolean; children: React.ReactNode }) => (
  <text x={x * u} y={y * u} fill={color} fontFamily={isMono ? mono : sans} fontSize={size * u} textAnchor={anchor} dominantBaseline="middle">{children}</text>
);
const head = (tip: Pt, from: Pt, u: number, color: string, opacity = 1) => {
  const angle = (Math.atan2(tip[1] - from[1], tip[0] - from[0]) * 180) / Math.PI;
  const s = 0.14 * u;
  return <polygon points={`0,0 ${-s},${-s * 0.6} ${-s},${s * 0.6}`} fill={color} opacity={opacity} transform={`translate(${tip[0] * u} ${tip[1] * u}) rotate(${angle})`} />;
};
// Items matched by id across a set: kept ones move from their old state, new ones fade in, dropped ones fade out.
function byId<T extends { id: string }>(prev: readonly T[], cur: readonly T[], p: number) {
  const kept = cur.map((item) => { const from = prev.find((x) => x.id === item.id); return { item, from: from ?? item, o: from ? 1 : p, gone: false }; });
  return [...kept, ...prev.filter((x) => !cur.some((c) => c.id === x.id)).map((item) => ({ item, from: item, o: 1 - p, gone: true }))];
}
// A vertical "now" line with its time on a tag at the top, the tag kept inside the footprint (half-width hw).
const Now = ({ u, x, y0, y1, hw, text, color, opacity }: { u: number; x: number; y0: number; y1: number; hw: number; text: string; color: string; opacity: number }) => (
  <g opacity={opacity}>
    <line x1={x * u} x2={x * u} y1={(y0 + 0.17) * u} y2={y1 * u} stroke={color} strokeWidth={0.03 * u} strokeLinecap="round" />
    <Svgtext u={u} x={tagX(x, text, hw)} y={y0} color={color} isMono>{text}</Svgtext>
  </g>
);

const statusLook = (pal: Palette, color: string, s: string) =>
  ({ pending: { tone: pal.muted, fill: 0.05, icon: "circle-dashed" }, running: { tone: color, fill: 0.18, icon: "loader" },
    done: { tone: pal.good, fill: 0.14, icon: "check" }, failed: { tone: pal.bad, fill: 0.14, icon: "x" } })[s] ?? { tone: pal.muted, fill: 0.05, icon: "circle-dashed" };

export const time: Renderers<TypesOf<typeof defs>> = {
  timeline: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const b = { u, w, h };
    const L = timelineLayout(el);
    const now = el.cursor === undefined ? undefined : tween((s) => s.cursor ?? s.span[0]);
    const eps = (el.span[1] - el.span[0]) * 0.02;
    const [rowsPrev, rowsNow] = [eventRows(change.prev.events), eventRows(el.events)];
    const events = byId(change.prev.events, el.events, change.p).map(({ item, from, o, gone }) => {
      const p = gone ? 0 : change.p;
      const x = lerp(L.x(from.at), L.x(item.at), p);
      const row = lerp(rowsPrev.get(from.id) ?? rowsNow.get(item.id)!, (gone ? rowsPrev : rowsNow).get(item.id)!, p);
      const past = now === undefined ? 1 : interpolate(now - item.at, [-eps, 0], [0, 1], clamp);
      return { e: item, x, row, o, past };
    });
    const [roomPrev, roomNow] = [eventLabelW(change.prev), eventLabelW(el)];
    const room = (id: string) => roomNow.get(id) ?? roomPrev.get(id)!;
    const labelX = (x: number, lw: number) => Math.min(L.W / 2 - lw / 2, Math.max(-L.W / 2 + lw / 2, x));
    return (
      <Board w={w} h={h} svg={<>
        {(el.ranges ?? []).map((r, i) => {
          const c = r.color ? pal[r.color] : color;
          return <rect key={i} x={L.x(r.from) * u} y={(L.rangeY(i) - 0.15) * u} width={(L.x(r.to) - L.x(r.from)) * u} height={0.3 * u} rx={0.06 * u}
            fill={alpha(c, 0.18)} stroke={c} strokeWidth={0.025 * u} strokeDasharray={dashed(r.color === "bad", u)} />;
        })}
        <line x1={L.x0 * u} x2={L.x1 * u} y1={L.axisY * u} y2={L.axisY * u} stroke={pal.muted} strokeWidth={0.03 * u} strokeDasharray={dashed(bad, u)} />
        <Svgtext u={u} x={L.x0 - TL.spanGap} y={L.axisY} color={pal.muted} anchor="end" isMono>{fmt(el.span[0], el.unit)}</Svgtext>
        <Svgtext u={u} x={L.x1 + TL.spanGap} y={L.axisY} color={pal.muted} anchor="start" isMono>{fmt(el.span[1], el.unit)}</Svgtext>
        {now !== undefined && <Now u={u} x={L.x(now)} y0={L.tagY} y1={L.axisY + 0.24} hw={L.W / 2} text={`now ${fmt(Math.round(now), el.unit)}`} color={color}
          opacity={change.prev.cursor === undefined ? change.p : 1} />}
        {events.map(({ e, x, row, o, past }) => {
          const Icon = e.icon ? iconFor(e.icon) : null;
          const c = e.color ? pal[e.color] : color;
          return (
            <g key={e.id} opacity={o}>
              {row > 0.5 && <line x1={x * u} x2={x * u} y1={(L.axisY + 0.24) * u} y2={(L.labelY(row) - 0.16) * u} stroke={alpha(pal.muted, 0.6)} strokeWidth={0.015 * u} />}
              <circle cx={x * u} cy={L.axisY * u} r={0.21 * u} fill={mix(pal.bg, c, past)} stroke={c} strokeWidth={0.03 * u} strokeDasharray={dashed(bad || e.color === "bad", u)} />
              {Icon ? <Icon x={(x - 0.13) * u} y={(L.axisY - 0.13) * u} size={0.26 * u} color={mix(c, pal.bg, past)} strokeWidth={2} />
                : <circle cx={x * u} cy={L.axisY * u} r={0.06 * u} fill={mix(c, pal.bg, past)} />}
            </g>
          );
        })}
      </>}>
        {(el.ranges ?? []).map((r, i) => (
          <Text key={i} u={u} size={0.2} color={pal.text} style={spot(b, (L.x(r.from) + L.x(r.to)) / 2, L.rangeY(i), Math.max(0.2, L.x(r.to) - L.x(r.from) - 0.1))}>{r.label}</Text>
        ))}
        {events.map(({ e, x, row, o }) => (
          <Text key={e.id} u={u} size={0.24} color={pal.text} style={{ ...spot(b, labelX(x, room(e.id)), L.labelY(row), room(e.id)), opacity: o }}>{e.label}</Text>
        ))}
      </Board>
    );
  },

  sequence: ({ el, u, w, h, color, bad, ctx, tween }) => {
    const { pal } = ctx;
    const b = { u, w, h };
    const S = sequenceLayout(el);
    const shown = tween((s) => s.shown ?? s.messages.length);
    const msgs = el.messages.map((m, k) => ({ m, k, r: Math.min(1, Math.max(0, shown - k)) })).filter((x) => x.r > 0.01);
    return (
      <Board w={w} h={h} svg={<>
        {el.participants.map((p) => (
          <g key={p.id}>
            <line x1={S.px(p.id) * u} x2={S.px(p.id) * u} y1={(S.top + SEQ.head) * u} y2={(S.H / 2 - 0.05) * u}
              stroke={pal.muted} strokeWidth={0.02 * u} strokeLinecap="round" strokeDasharray={`${0.01 * u} ${0.09 * u}`} />
            <rect x={(S.px(p.id) - (SEQ.col - 0.25) / 2) * u} y={S.top * u} width={(SEQ.col - 0.25) * u} height={SEQ.head * u} rx={0.12 * u}
              fill={alpha(color, 0.1)} stroke={color} strokeWidth={0.025 * u} strokeDasharray={dashed(bad, u)} />
          </g>
        ))}
        {msgs.map(({ m, k, r }) => {
          const pts = partial(S.line(m, k), r);
          return (
            <g key={m.id}>
              <path d={svgPath(pts, u)} stroke={color} strokeWidth={0.03 * u} fill="none" strokeDasharray={m.reply ? dashed(true, u) : undefined} />
              {head(pts.at(-1)!, pts[0], u, color)}
            </g>
          );
        })}
      </>}>
        {el.participants.map((p) => {
          const Icon = p.icon ? iconFor(p.icon) : null;
          return (
            <div key={p.id} style={{ ...spot(b, S.px(p.id), S.headY, SEQ.col - 0.4), display: "flex", alignItems: "center", justifyContent: "center", gap: 0.1 * u }}>
              {Icon && <Icon size={0.32 * u} color={color} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
              <Text u={u} color={pal.text} style={{ minWidth: 0 }}>{p.label}</Text>
            </div>
          );
        })}
        {msgs.map(({ m, k, r }) => {
          const [a, z] = S.line(m, k);
          // the label sits on a strip of background so the lifelines it spans do not run through its letters
          return (
            <div key={m.id} style={{ ...spot(b, (a[0] + z[0]) / 2, S.rowY(k) - 0.22, Math.abs(z[0] - a[0]) - 0.1), opacity: r, display: "flex", justifyContent: "center" }}>
              <Text u={u} size={0.22} color={m.reply ? pal.muted : pal.text}
                style={{ minWidth: 0, padding: `0 ${0.08 * u}px`, background: pal.bg }}>{m.label}</Text>
            </div>
          );
        })}
      </Board>
    );
  },

  lanes: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const b = { u, w, h };
    const L = lanesLayout(el);
    const P = lanesLayout(change.prev);
    const now = el.cursor === undefined ? undefined : tween((s) => s.cursor ?? s.span[0]);
    const n = Math.max(el.bars.length, change.prev.bars.length);
    const bars = Array.from({ length: n }, (_, i) => {
      const [cur, prv] = [el.bars[i], change.prev.bars[i]];
      const tone = (x: typeof cur) => (x.color ? pal[x.color] : color);
      if (!cur) return { bar: prv, from: P.x(prv.from), to: P.x(prv.to), y: P.laneY(prv.lane), o: 1 - change.p, c: tone(prv) };
      return {
        bar: cur,
        from: L.x(tween((s) => s.bars[i]?.from ?? cur.from)), to: L.x(tween((s) => s.bars[i]?.to ?? cur.to)),
        y: prv ? lerp(P.laneY(prv.lane), L.laneY(cur.lane), change.p) : L.laneY(cur.lane),
        o: prv ? 1 : change.p, c: prv ? mix(tone(prv), tone(cur), change.p) : tone(cur),
      };
    });
    return (
      <Board w={w} h={h} svg={<>
        {el.lanes.map((l) => (
          <rect key={l.id} x={L.x0 * u} y={(L.laneY(l.id) - 0.28) * u} width={(L.x1 - L.x0) * u} height={0.56 * u} rx={0.08 * u}
            fill={alpha(pal.muted, 0.08)} stroke={bad ? pal.bad : "none"} strokeWidth={0.02 * u} strokeDasharray={dashed(bad, u)} />
        ))}
        {bars.map(({ bar, from, to, y, o, c }, i) => (
          <rect key={i} x={from * u} y={(y - LN.bar / 2) * u} width={Math.max(0, to - from - 0.04) * u} height={LN.bar * u} rx={0.08 * u} opacity={o}
            fill={alpha(c, 0.25)} stroke={c} strokeWidth={0.025 * u} strokeDasharray={dashed(bar.color === "bad", u)} />
        ))}
        <Svgtext u={u} x={L.x0} y={L.axisY} color={pal.muted} anchor="start" isMono>{fmt(el.span[0], el.unit)}</Svgtext>
        <Svgtext u={u} x={L.x1} y={L.axisY} color={pal.muted} anchor="end" isMono>{fmt(el.span[1], el.unit)}</Svgtext>
        {now !== undefined && <Now u={u} x={L.x(now)} y0={L.tagY} y1={L.bottom} hw={L.W / 2} text={`now ${fmt(Math.round(now), el.unit)}`} color={color}
          opacity={change.prev.cursor === undefined ? change.p : 1} />}
      </>}>
        {el.lanes.map((l) => (
          <Text key={l.id} u={u} color={pal.text} style={spot(b, L.x0 - 0.15, L.laneY(l.id), LN.label - 0.25, "end")}>{l.label}</Text>
        ))}
        {bars.map(({ bar, from, to, y, o }, i) => bar.label && (
          <Text key={i} u={u} size={0.22} color={pal.text} style={{ ...spot(b, (from + to) / 2, y, Math.max(0.2, to - from - 0.12)), opacity: o }}>{bar.label}</Text>
        ))}
      </Board>
    );
  },

  timer: ({ el, u, color, bad, ctx, tween }) => {
    const { pal } = ctx;
    const left = tween((s) => s.remaining ?? s.total);
    const f = Math.min(1, Math.max(0, left / el.total));
    const doom = interpolate(f, [0, 0.12], [1, 0], clamp); // nearing zero it turns bad
    const ring = mix(color, pal.bad, doom);
    const D = RING * u;
    const r = (RING / 2 - 0.12) * u;
    const C = 2 * Math.PI * r;
    // tenths under 10 s (a 0.2 s timeout must not read "1 s"), m:ss from a minute, h:mm:ss from an hour
    const secs = Math.ceil(left - 1e-6);
    const two = (n: number) => String(n).padStart(2, "0");
    const clock = el.total < 10 ? `${(Math.ceil(left * 10 - 1e-6) / 10).toFixed(1)} s`
      : el.total < 3600 ? (el.total < 60 ? `${secs} s` : `${Math.floor(secs / 60)}:${two(secs % 60)}`)
      : `${Math.floor(secs / 3600)}:${two(Math.floor(secs / 60) % 60)}:${two(secs % 60)}`;
    const size = Math.min(0.4, 1.3 / (clock.length * 0.6)); // mono, fits inside the ring
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg width={D} height={D} viewBox={`${-D / 2} ${-D / 2} ${D} ${D}`}>
          <circle r={r} fill="none" stroke={mix(pal.muted, pal.bad, doom)} strokeOpacity={0.3 + 0.7 * doom} strokeWidth={0.08 * u}
            strokeDasharray={dashed(bad || doom > 0.5, u)} />
          <circle r={r} fill="none" stroke={ring} strokeWidth={0.14 * u} strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - f)}
            transform="rotate(-90)" opacity={f > 0.004 ? 1 : 0} />
          <Svgtext u={u} x={0} y={0} size={size} color={mix(pal.text, pal.bad, doom)} isMono>{clock}</Svgtext>
        </svg>
        <Caption u={u} text={el.label} pal={pal} />
      </div>
    );
  },

  cycle: ({ el, u, w, h, color, bad, ctx, change }) => {
    const { pal } = ctx;
    const b = { u, w, h };
    const C = cycleLayout(el);
    const on = (s: { active?: string }, id?: string) => (id === undefined ? s.active !== undefined : s.active === id) ? 1 : 0;
    const lit = (id?: string) => lerp(on(change.prev, id), on(el, id), change.p);
    const base = mix(pal.text, pal.muted, lit()); // once a step is active, the others step back
    // when the active step changes, a dot runs clockwise along the arcs from the old step to the new one
    const n = el.steps.length;
    const [i0, i1] = [el.steps.findIndex((s) => s.id === change.prev.active), el.steps.findIndex((s) => s.id === el.active)];
    const route = i0 >= 0 && i1 >= 0 && i0 !== i1 ? Array.from({ length: (i1 - i0 + n) % n }, (_, k) => C.arc((i0 + k) % n)).flat() : [];
    const dot = route.length ? along(route, change.p).at : null;
    return (
      <Board w={w} h={h} svg={<>
        {el.steps.map((s, i) => {
          const pts = C.arc(i);
          return (
            <g key={s.id}>
              <path d={svgPath(pts, u)} stroke={pal.muted} strokeWidth={0.03 * u} fill="none" strokeDasharray={dashed(bad, u)} />
              {head(pts.at(-1)!, pts.at(-2)!, u, pal.muted)}
            </g>
          );
        })}
        {el.steps.map((s, i) => {
          const [x, y] = C.at(i);
          const l = lit(s.id);
          const Icon = s.icon ? iconFor(s.icon) : null;
          return (
            <g key={s.id}>
              <circle cx={x * u} cy={y * u} r={(CY.node + 0.08) * u} fill="none" stroke={alpha(color, 0.35 * l)} strokeWidth={0.1 * u} />
              <circle cx={x * u} cy={y * u} r={CY.node * u} fill={mix(pal.bg, color, 0.12 + 0.88 * l)} stroke={color} strokeWidth={0.03 * u} strokeDasharray={dashed(bad, u)} />
              {Icon ? <Icon x={(x - 0.17) * u} y={(y - 0.17) * u} size={0.34 * u} color={mix(color, pal.bg, l)} strokeWidth={1.8} />
                : <Svgtext u={u} x={x} y={y} size={0.26} color={mix(color, pal.bg, l)} isMono>{i + 1}</Svgtext>}
            </g>
          );
        })}
        {dot && <circle cx={dot[0] * u} cy={dot[1] * u} r={0.11 * u} fill={color} stroke={pal.bg} strokeWidth={0.03 * u}
          opacity={interpolate(change.p, [0, 0.08, 0.85, 1], [0, 1, 1, 0], clamp)} />}
      </>}>
        {el.steps.map((s, i) => {
          const L = C.label(i);
          return <Text key={s.id} u={u} color={mix(base, pal.text, lit(s.id))} style={spot(b, L.x, L.y, L.w)}>{s.label}</Text>;
        })}
        {el.label && <Text u={u} size={0.24} color={pal.muted} style={spot(b, 0, 0, CY.middle)}>{el.label}</Text>}
      </Board>
    );
  },

  pipeline: ({ el, u, w, h, color, bad, ctx, change }) => {
    const { pal } = ctx;
    const b = { u, w, h };
    const [P, P0] = [pipelineLayout(el), pipelineLayout(change.prev)];
    const [T, B, M, N] = [P.cy - PL.h / 2, P.cy + PL.h / 2, P.cy, PL.notch];
    const chevron = (a: number, notch: boolean) => {
      const pts: Pt[] = [[a, T], [a + PL.w - N, T], [a + PL.w, M], [a + PL.w - N, B], [a, B], ...(notch ? [[a + N, M] as Pt] : [])];
      return pts.map(([x, y]) => `${x * u},${y * u}`).join(" ");
    };
    // matched by id across a set: kept stages slide to their new slot, new ones fade in, dropped ones fade out where they were
    const stages = byId(change.prev.stages, el.stages, change.p).map(({ item: s, from, o, gone }) => {
      const [i, j] = [el.stages.indexOf(s), change.prev.stages.indexOf(from)];
      const left = gone ? P0.left(j) : j < 0 ? P.left(i) : lerp(P0.left(j), P.left(i), change.p);
      const [was, is] = [from.status ?? "pending", s.status ?? "pending"];
      const p = was !== is ? change.p : 1;
      const [a, z] = [statusLook(pal, color, was), statusLook(pal, color, is)];
      return { s, left, notch: (gone ? j : i) > 0, was, is, p, o, tone: mix(a.tone, z.tone, p), fill: lerp(a.fill, z.fill, p) };
    });
    const spin = (ctx.frame / ctx.t.fps) * 180; // a running stage's loader turns, so "running" reads without the caption
    const caption = (cx: number, st: string, opacity: number) => {
      const look = statusLook(pal, color, st);
      const Icon = iconFor(look.icon);
      return (
        <div key={st} style={{ ...spot(b, cx, P.capY, PL.w - 0.3), display: "flex", alignItems: "center", justifyContent: "center", gap: 0.08 * u, opacity }}>
          <Icon size={0.24 * u} color={look.tone} strokeWidth={2.2} style={{ flexShrink: 0, transform: st === "running" ? `rotate(${spin}deg)` : undefined }} />
          <Text u={u} size={0.22} color={look.tone}>{st}</Text>
        </div>
      );
    };
    return (
      <Board w={w} h={h} svg={stages.map(({ s, left, notch, is, o, tone, fill }) => (
        <polygon key={s.id} points={chevron(left, notch)} opacity={o} fill={alpha(tone, fill)} stroke={tone} strokeWidth={0.03 * u} strokeLinejoin="round"
          strokeDasharray={dashed(bad || is === "failed", u)} />
      ))}>
        {stages.map(({ s, left, notch, was, is, p, o, tone }) => {
          const Icon = s.icon ? iconFor(s.icon) : null;
          const cx = left + PL.w / 2;
          return (
            <React.Fragment key={s.id}>
              <div style={{ ...spot(b, cx + (notch ? N / 3 : -N / 6), M, PL.text), display: "flex", alignItems: "center", justifyContent: "center", gap: 0.1 * u, opacity: o }}>
                {Icon && <Icon size={0.32 * u} color={tone} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
                <Text u={u} color={pal.text} style={{ minWidth: 0 }}>{s.label}</Text>
              </div>
              {/* the old status goes before the new one comes, so two words never sit on top of each other */}
              {was !== is && p < 0.5 && caption(cx, was, (1 - 2 * p) * o)}
              {caption(cx, is, (was !== is ? Math.min(1, Math.max(0, 2 * p - 1)) : 1) * o)}
            </React.Fragment>
          );
        })}
      </Board>
    );
  },
};
