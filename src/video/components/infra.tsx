import React from "react";
import { interpolateColors } from "remotion";
import { CAPTION } from "../../components/core.ts";
import { clusterLayout, DEVICE, MEM, memoryLayout, NODE_R, shardsLayout, STORE_BODY, type infra as defs } from "../../components/infra.ts";
import type { Pt, TypesOf } from "../../components/registry.ts";
import { alpha, Caption, dashed, iconFor, mono, paint, partial, sans, stroke, svgPath, Text, type Renderers } from "../kit.tsx";

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const mix = (a: string, b: string, p: number) => (a === b ? b : interpolateColors(p, [0, 1], [a, b]));
// Center-relative grid units to px inside a w x h root.
const abs = (x: number, y: number, w: number, h: number, u: number): React.CSSProperties =>
  ({ position: "absolute", left: w / 2 + x * u, top: h / 2 + y * u, transform: "translate(-50%, -50%)" });
const Svg = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) =>
  <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>{children}</svg>;
// Old text fades and slides up while the new one rises in: a change you can see with the sound off.
function Swap({ prev, now, p, u, children }: { prev: string; now: string; p: number; u: number; children: (s: string) => React.ReactNode }) {
  if (prev === now || p >= 1) return <>{children(now)}</>;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ opacity: p, transform: `translateY(${(1 - p) * 0.15 * u}px)` }}>{children(now)}</div>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - p, transform: `translateY(${-p * 0.15 * u}px)` }}>{children(prev)}</div>
    </div>
  );
}

export const infra: Renderers<TypesOf<typeof defs>> = {
  store: ({ el, u, w, h, color, bad, ctx, tween }) => {
    const [W, H] = STORE_BODY[el.shape];
    const fill = tween((e) => e.fill ?? 0);
    const Icon = el.icon ? iconFor(el.icon) : null;
    const line = { stroke: color, strokeWidth: 0.035 * u, fill: "none", strokeDasharray: dashed(bad, u) };
    const s = 0.04, ry = 0.2, rx = W / 2 - s;
    const clip = `store-${el.id}`;
    const P = (d: string) => d.replace(/-?\d+(\.\d+)?/g, (v) => String(+v * u)); // a path in grid units
    let body = "", rim = <></>, level = <></>;
    if (el.shape === "disk") {
      body = P(`M ${s} ${s} H ${W - s} V ${H - s} H ${s} Z`);
      level = <>
        <rect x={0.3 * u} y={(H - 0.4) * u} width={(W - 0.6) * u} height={0.16 * u} rx={0.08 * u} fill={alpha(color, 0.15)} />
        <rect x={0.3 * u} y={(H - 0.4) * u} width={(W - 0.6) * fill * u} height={0.16 * u} rx={0.08 * u} fill={alpha(color, 0.7)} />
      </>;
    } else {
      // cylinder: straight sides; bucket: tapers to 70% at the bottom
      const bottom = el.shape === "bucket" ? 0.7 : 1;
      const rxAt = (y: number) => lerp(rx, rx * bottom, (y - ry) / (H - 2 * ry));
      const [l, r] = [W / 2 - rx * bottom, W / 2 + rx * bottom];
      body = P(`M ${s} ${ry} L ${l} ${H - ry} A ${rx * bottom} ${ry} 0 0 0 ${r} ${H - ry} L ${W - s} ${ry} A ${rx} ${ry} 0 0 0 ${s} ${ry} Z`);
      rim = <ellipse cx={(W / 2) * u} cy={ry * u} rx={rx * u} ry={ry * u} {...line} />;
      const ly = H - ry - fill * (H - 2 * ry);
      level = fill > 0.005 ? <>
        <g opacity={0.28} clipPath={`url(#${clip})`}>
          <rect x={0} y={ly * u} width={W * u} height={(H - ly) * u} fill={color} />
          <ellipse cx={(W / 2) * u} cy={ly * u} rx={rxAt(ly) * u} ry={ry * u} fill={color} />
        </g>
        <ellipse cx={(W / 2) * u} cy={ly * u} rx={rxAt(ly) * u} ry={ry * u} fill="none" stroke={alpha(color, 0.6)} strokeWidth={0.025 * u} />
      </> : <></>;
    }
    const disk = el.shape === "disk";
    return (
      <div style={{ width: w, height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
        <div style={{ position: "relative", width: W * u, height: H * u }}>
          <svg width={W * u} height={H * u} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs><clipPath id={clip}><path d={body} /></clipPath></defs>
            <path d={body} {...line} fill={alpha(color, 0.06)} strokeLinejoin="round" />
            {level}
            {rim}
          </svg>
          <div style={{ position: "absolute", inset: 0, bottom: disk ? 0.45 * u : 0, display: "flex", flexDirection: disk ? "row" : "column",
            alignItems: "center", justifyContent: "center", gap: (disk ? 0.3 : 0.06) * u, paddingTop: disk ? 0 : 0.3 * u }}>
            {Icon && <Icon size={(disk ? 0.45 : 0.55) * u} color={color} strokeWidth={1.6} />}
            {el.fill !== undefined && <Text u={u} size={0.24} mono color={ctx.pal.text}>{Math.round(fill * 100)}%</Text>}
          </div>
        </div>
        <Caption u={u} text={el.label} pal={ctx.pal} />
      </div>
    );
  },

  cluster: ({ el, u, w, h, color, bad, ctx, change, tween }) => {
    const { pal } = ctx;
    const { prev, p } = change;
    const [now, was] = [clusterLayout(el.nodes.length), clusterLayout(prev.nodes.length)];
    const tone = (n: (typeof el.nodes)[number]) => (n.state === "down" ? pal.bad : n.state === "lagging" ? pal.muted : color);
    // every node, now and just removed, at its gliding position
    const nodes = [
      ...el.nodes.map((n, i) => {
        const j = prev.nodes.findIndex((m) => m.id === n.id);
        const [a, b] = [j < 0 ? now.at(i) : was.at(j), now.at(i)];
        return { n, old: prev.nodes[j] ?? n, at: [lerp(a[0], b[0], p), lerp(a[1], b[1], p)] as Pt, opacity: j < 0 ? p : 1 };
      }),
      ...prev.nodes.flatMap((n, j) => (el.nodes.some((m) => m.id === n.id) ? [] : [{ n, old: n, at: was.at(j), opacity: 1 - p }])),
    ];
    const posOf = (id?: string) => nodes.find((x) => x.n.id === id);
    const leadNow = el.nodes.find((n) => n.role === "leader")?.id;
    const leadWas = prev.nodes.find((n) => n.role === "leader")?.id;
    // replication lines: leader -> follower; a pair that exists before and after stays, others fade
    const pairs = (list: typeof el.nodes, lead?: string) => (lead ? list.filter((n) => n.id !== lead).map((n) => `${lead}>${n.id}`) : []);
    const [pNow, pWas] = [pairs(el.nodes, leadNow), pairs(prev.nodes, leadWas)];
    const lines = [...new Set([...pNow, ...pWas])].map((k) => {
      const [a, b] = k.split(">").map(posOf);
      const o = (pNow.includes(k) ? (pWas.includes(k) ? 1 : p) : 1 - p) * Math.min(a!.opacity, b!.opacity);
      const d = Math.hypot(b!.at[0] - a!.at[0], b!.at[1] - a!.at[1]) || 1;
      const [ux, uy] = [(b!.at[0] - a!.at[0]) / d, (b!.at[1] - a!.at[1]) / d];
      const k2 = NODE_R + 0.06;
      const st = el.nodes.find((n) => n.id === b!.n.id)?.state ?? b!.n.state;
      return { k, o: st === "down" ? o * 0.35 : o, st,
        pts: [[a!.at[0] + ux * k2, a!.at[1] + uy * k2], [b!.at[0] - ux * k2, b!.at[1] - uy * k2]] as Pt[] };
    });
    const crown = leadNow && leadWas && leadNow !== leadWas
      ? { at: [0, 1].map((k) => lerp(posOf(leadWas)!.at[k], posOf(leadNow)!.at[k], p)), o: 1 }
      : leadNow ? { at: posOf(leadNow)!.at, o: leadWas ? 1 : p } : leadWas ? { at: posOf(leadWas)!.at, o: 1 - p } : null;
    const Crown = iconFor("crown");
    const Clock = iconFor("clock");
    const up = Math.round(tween((e) => e.nodes.filter((n) => n.state !== "down").length));
    const cx = (x: number) => w / 2 + x * u, cy = (y: number) => h / 2 + y * u;
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        <Svg w={w} h={h}>
          {lines.map((l) => (
            <path key={l.k} d={svgPath(l.pts, u, w / 2 / u, h / 2 / u)} stroke={l.st === "down" ? pal.bad : pal.muted} strokeWidth={0.03 * u} opacity={l.o}
              strokeDasharray={l.st === "down" ? dashed(true, u) : l.st === "lagging" ? `${0.01 * u} ${0.08 * u}` : undefined} strokeLinecap="round" />
          ))}
          {nodes.map(({ n, old, at, opacity }) => {
            const c = mix(tone(old), tone(n), p);
            const [wasDown, isDown] = [old.state === "down", n.state === "down"];
            const lead = n.role === "leader" ? (old.role === "leader" ? 1 : p) : old.role === "leader" ? 1 - p : 0;
            const ring = (dash: boolean, o: number) => o > 0 && (
              <circle key={String(dash)} cx={cx(at[0])} cy={cy(at[1])} r={NODE_R * u} stroke={c} strokeWidth={0.035 * u} opacity={o * opacity}
                fill={alpha(c, 0.1 + 0.25 * lead)} strokeDasharray={dashed(dash || bad, u)} />
            );
            return <g key={n.id}>{ring(false, isDown ? (wasDown ? 0 : 1 - p) : wasDown ? p : 1)}{ring(true, isDown ? (wasDown ? 1 : p) : wasDown ? 1 - p : 0)}</g>;
          })}
        </Svg>
        {nodes.map(({ n, old, at, opacity }) => {
          const c = mix(tone(old), tone(n), p);
          const down = n.state === "down" ? (old.state === "down" ? 1 : p) : old.state === "down" ? 1 - p : 0;
          const lag = n.state === "lagging" ? (old.state === "lagging" ? 1 : p) : old.state === "lagging" ? 1 - p : 0;
          const [On, Off] = [iconFor("server"), iconFor("server-off")];
          return (
            <React.Fragment key={n.id}>
              <div style={{ ...abs(at[0], at[1], w, h, u), opacity }}>
                <div style={{ position: "relative", width: 0.42 * u, height: 0.42 * u }}>
                  <On size={0.42 * u} color={c} strokeWidth={1.6} style={{ position: "absolute", opacity: 1 - down }} />
                  <Off size={0.42 * u} color={c} strokeWidth={1.6} style={{ position: "absolute", opacity: down }} />
                </div>
              </div>
              {lag > 0 && (
                <div style={{ ...abs(at[0] + 0.3, at[1] + 0.3, w, h, u), opacity: lag * opacity, background: pal.bg, borderRadius: "50%", padding: 0.02 * u, display: "flex" }}>
                  <Clock size={0.26 * u} color={pal.muted} strokeWidth={2} />
                </div>
              )}
              {/* on a bg pad: replication lines pass behind the label */}
              <div style={{ ...abs(at[0], at[1] + NODE_R + 0.2, w, h, u), opacity, background: pal.bg, borderRadius: 0.06 * u, padding: `0 ${0.06 * u}px` }}>
                <Text u={u} size={0.22} color={pal.text}>{n.label ?? n.id}</Text>
              </div>
            </React.Fragment>
          );
        })}
        {crown && (
          <div style={{ ...abs(crown.at[0] + 0.3, crown.at[1] - 0.32, w, h, u), opacity: crown.o, background: pal.bg, borderRadius: "50%", padding: 0.03 * u, display: "flex" }}>
            <Crown size={0.3 * u} color={color} strokeWidth={2} fill={alpha(color, 0.3)} />
          </div>
        )}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", gap: 0.2 * u, alignItems: "flex-end", height: CAPTION * u }}>
          <Text u={u} color={pal.text}>{el.label}</Text>
          <Text u={u} size={0.22} mono color={pal.muted}>{up}/{el.nodes.length} up</Text>
        </div>
      </div>
    );
  },

  shards: ({ el, u, w, h, color, bad, ctx, change }) => {
    const { pal } = ctx;
    const { prev, p } = change;
    const [now, was] = [shardsLayout(el.ranges.length), shardsLayout(prev.ranges.length)];
    const segs = [
      ...el.ranges.map((r, i) => {
        const j = prev.ranges.findIndex((x) => x.id === r.id);
        const lit = el.highlight?.includes(i) ? 1 : 0;
        const litWas = j >= 0 && prev.highlight?.includes(j) ? 1 : 0;
        return { r, old: prev.ranges[j] ?? r, x: lerp(j < 0 ? now.x(i) : was.x(j), now.x(i), p), seg: lerp(j < 0 ? 0 : was.seg, now.seg, p), lit: lerp(litWas, lit, p), o: 1 };
      }),
      ...prev.ranges.flatMap((r, j) => (el.ranges.some((x) => x.id === r.id) ? [] : [{ r, old: r, x: was.x(j), seg: was.seg * (1 - p), lit: 0, o: 1 - p }])),
    ];
    // boundary keys, matched by key so a split slides its neighbours apart
    const keys = (rs: typeof el.ranges, l: typeof now) => rs.length ? [{ k: rs[0].from, x: l.x(0) - l.seg / 2 }, ...rs.map((r, i) => ({ k: r.to, x: l.x(i) + l.seg / 2 }))] : [];
    const [kNow, kWas] = [keys(el.ranges, now), keys(prev.ranges, was)];
    const marks = [
      ...kNow.map((k) => { const o = kWas.find((x) => x.k === k.k); return { k: k.k, x: o ? lerp(o.x, k.x, p) : k.x, o: o ? 1 : p }; }),
      ...kWas.filter((k) => !kNow.some((x) => x.k === k.k)).map((k) => ({ k: k.k, x: k.x, o: 1 - p })),
    ];
    const barH = 0.65;
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {segs.map(({ r, old, x, seg, lit, o }) => (
          <div key={r.id} style={{ ...abs(x, now.barY, w, h, u), width: Math.max(0, seg - 0.06) * u, height: barH * u, opacity: o, boxSizing: "border-box",
            border: stroke(bad, u, color), borderRadius: 0.08 * u, background: alpha(color, 0.15 + 0.45 * lit), boxShadow: lit ? `0 0 ${0.25 * u * lit}px ${color}` : undefined,
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Swap prev={old.owner ?? ""} now={r.owner ?? ""} p={p} u={u}>{(s) => <Text u={u} size={0.22} color={pal.text}>{s}</Text>}</Swap>
          </div>
        ))}
        <Svg w={w} h={h}>
          {marks.map((m) => (
            <line key={m.k} x1={w / 2 + m.x * u} x2={w / 2 + m.x * u} y1={h / 2 + (now.barY - barH / 2 - 0.12) * u} y2={h / 2 + (now.barY - barH / 2 + 0.06) * u}
              stroke={pal.muted} strokeWidth={0.025 * u} opacity={m.o} />
          ))}
        </Svg>
        {marks.map((m) => (
          <div key={m.k} style={{ ...abs(m.x, now.barY - barH / 2 - 0.27, w, h, u), opacity: m.o }}>
            <Text u={u} size={0.22} mono color={pal.muted}>{m.k}</Text>
          </div>
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}><Caption u={u} text={el.label} pal={pal} /></div>
      </div>
    );
  },

  memory: ({ el, u, w, h, color, bad, ctx, change }) => {
    const { pal } = ctx;
    const { prev, p } = change;
    const [now, was] = [memoryLayout(el), memoryLayout(prev)];
    const tone = (r: (typeof el.regions)[number]) => (r.color ? pal[r.color] : color);
    const regions = [
      ...el.regions.map((r) => {
        const o = prev.regions.find((x) => x.id === r.id);
        const [a, b] = [o ? was.rects[r.id] : now.rects[r.id], now.rects[r.id]];
        return { r, c: mix(tone(o ?? r), tone(r), p), x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), rh: lerp(a.h, b.h, p), o: o ? 1 : p };
      }),
      ...prev.regions.filter((r) => !el.regions.some((x) => x.id === r.id)).map((r) => ({ r, c: tone(r), ...was.rects[r.id], rh: was.rects[r.id].h, o: 1 - p })),
    ];
    // pointers into a region spread over its height; matched by label so they glide to a new target
    const spots = (l: typeof now, ps: NonNullable<typeof el.pointers>) => ps.map((q) => {
      const same = ps.filter((x) => x.to === q.to);
      const r = l.rects[q.to];
      return { q, y: r.y + (same.indexOf(q) - (same.length - 1) / 2) * Math.min(0.4, r.h / same.length), edge: l.cx - MEM.colW / 2 };
    });
    const [sNow, sWas] = [spots(now, el.pointers ?? []), spots(was, prev.pointers ?? [])];
    const ptrs = [
      ...sNow.map((s) => { const o = sWas.find((x) => x.q.label === s.q.label); return { key: s.q.label, y: o ? lerp(o.y, s.y, p) : s.y, edge: o ? lerp(o.edge, s.edge, p) : s.edge, o: o ? 1 : p }; }),
      ...sWas.filter((s) => !sNow.some((x) => x.q.label === s.q.label)).map((s) => ({ key: s.q.label, y: s.y, edge: s.edge, o: 1 - p })),
    ];
    const px = (x: number) => w / 2 + x * u, py = (y: number) => h / 2 + y * u;
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {regions.map(({ r, c, x, y, rh, o }) => (
          <div key={r.id} style={{ ...abs(x, y, w, h, u), width: (MEM.colW - 0.04) * u, height: Math.max(0, rh - 0.05) * u, opacity: o, boxSizing: "border-box",
            border: stroke(bad || r.color === "bad", u, c), borderRadius: 0.06 * u, background: alpha(c, 0.14), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Text u={u} size={0.24} color={pal.text}>{r.label}</Text>
          </div>
        ))}
        <Svg w={w} h={h}>
          {ptrs.map((q) => {
            const [x0, x1] = [q.edge - 0.5, q.edge - 0.06];
            return (
              <g key={q.key} opacity={q.o}>
                <line x1={px(x0)} x2={px(x1 - 0.1)} y1={py(q.y)} y2={py(q.y)} stroke={pal.muted} strokeWidth={0.03 * u} />
                <polygon points={`${px(x1)},${py(q.y)} ${px(x1 - 0.14)},${py(q.y - 0.08)} ${px(x1 - 0.14)},${py(q.y + 0.08)}`} fill={pal.muted} />
              </g>
            );
          })}
        </Svg>
        {ptrs.map((q) => (
          <div key={q.key} style={{ position: "absolute", right: w - px(q.edge - 0.58), top: py(q.y), transform: "translateY(-50%)", opacity: q.o, maxWidth: 1.6 * u }}>
            <Text u={u} size={0.22} mono color={pal.text}>{q.key}</Text>
          </div>
        ))}
        <div style={{ position: "absolute", left: px(now.cx) - u * 1.5, width: 3 * u, bottom: 0 }}><Caption u={u} text={el.label} pal={pal} /></div>
      </div>
    );
  },

  barrier: ({ el, tr, ctx, enter, change }) => {
    const { unit: u, t, pal } = ctx;
    const { prev, p } = change;
    const broken = el.broken ? (prev.broken ? 1 : p) : prev.broken ? 1 - p : 0;
    // a healed partition calms to muted; a breached wall or boundary turns bad
    const paint0 = paint(tr, ctx, { partition: pal.bad, firewall: pal.accent, boundary: pal.muted }[el.kind]);
    const color = mix(paint0.color, el.kind === "partition" ? pal.muted : pal.bad, broken);
    const bad = paint0.bad || (el.kind !== "partition" && broken > 0.5);
    const [a, b] = [el.from, el.to];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [dx, dy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    let [nx, ny] = [dy, -dx];
    if (nx < -0.01 || (Math.abs(nx) < 0.01 && ny < 0)) [nx, ny] = [-nx, -ny]; // label to the right, or below
    const at = (f: number, off = 0): Pt => [a[0] + dx * len * f + nx * off, a[1] + dy * len * f + ny * off];
    const steps = Math.max(2, Math.round(len / 0.35));
    const points: Pt[] = el.kind === "partition"
      ? Array.from({ length: steps + 1 }, (_, i) => at(i / steps, i === 0 || i === steps ? 0 : i % 2 ? 0.1 : -0.1))
      : [at(0), at(1)];
    // each half grows in from its end; breaking opens a gap around the middle
    const reach = (0.5 - 0.06 - 0.12 * broken) * enter;
    const halves = [partial(points, reach), partial([...points].reverse(), reach)];
    const style = {
      partition: { width: 0.04, dash: dashed(true, u) },
      firewall: { width: 0.09, dash: dashed(bad, u) },
      boundary: { width: 0.05, dash: `${0.01 * u} ${0.14 * u}` },
    }[el.kind];
    const ticks = el.kind === "firewall"
      ? Array.from({ length: Math.floor(len / 0.4) }, (_, i) => (i + 0.5) * 0.4 / len).filter((f) => f < reach || f > 1 - reach) : [];
    const [On, Off] = { partition: ["unplug", "plug"], firewall: ["brick-wall", "brick-wall-fire"], boundary: ["shield", "shield-off"] }[el.kind].map((n) => iconFor(n));
    const mid = at(0.5);
    const [lx, ly] = at(0.5, 0.55);
    const anchor = Math.abs(nx) < 0.5 ? "middle" : "start";
    const icon = (I: typeof On, o: number) => (
      <I x={(mid[0] - 0.21) * u} y={(mid[1] - 0.21) * u} width={0.42 * u} height={0.42 * u} color={color} strokeWidth={1.8} opacity={o * enter} />
    );
    return (
      <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={t.width} height={t.height}>
        {halves.map((hp, i) => (
          <path key={i} d={svgPath(hp, u)} stroke={color} strokeWidth={style.width * u} fill="none" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={style.dash} opacity={1 - 0.4 * broken} />
        ))}
        {ticks.map((f) => { const [c0, c1] = [at(f, 0.13), at(f, -0.13)]; return <path key={f} d={svgPath([c0, c1], u)} stroke={pal.bg} strokeWidth={0.03 * u} />; })}
        <circle cx={mid[0] * u} cy={mid[1] * u} r={0.32 * u} fill={pal.bg} stroke={alpha(color, 0.6)} strokeWidth={0.025 * u} opacity={enter} strokeDasharray={dashed(bad, u)} />
        {icon(On, 1 - broken)}
        {icon(Off, broken)}
        <text x={lx * u} y={ly * u} fill={pal.text} fontFamily={sans} fontSize={0.24 * u} textAnchor={anchor} dominantBaseline="middle" opacity={enter}>{el.label}</text>
      </svg>
    );
  },

  device: ({ el, u, w, h, color, bad, ctx, change }) => {
    const { pal } = ctx;
    const { prev, p } = change;
    const d = DEVICE[el.kind];
    const frame: React.CSSProperties = { position: "absolute", boxSizing: "border-box", border: stroke(bad, u, color, 0.035), background: alpha(color, 0.06) };
    const rows = Math.max(el.lines.length, prev.lines.length);
    const btn = (s: string, o: number) => s && o > 0 && (
      <div key={s} style={{ ...abs(d.btn.x, d.btn.y, w, h, u), width: d.btn.w * u, height: d.btn.h * u, borderRadius: 0.25 * u, background: color, opacity: o,
        transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * o})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Text u={u} size={0.24} bold color={pal.bg}>{s}</Text>
      </div>
    );
    const [bWas, bNow] = [prev.button ?? "", el.button ?? ""];
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {el.kind === "phone" && <>
          <div style={{ ...frame, inset: 0, borderRadius: 0.32 * u }} />
          <div style={{ position: "absolute", left: w / 2 - 0.3 * u, top: 0.16 * u, width: 0.6 * u, height: 0.1 * u, borderRadius: u, background: alpha(color, 0.5) }} />
        </>}
        {el.kind === "laptop" && <>
          <div style={{ ...frame, left: 0.25 * u, right: 0.25 * u, top: 0, bottom: 0.3 * u, borderRadius: 0.14 * u }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0.05 * u, height: 0.18 * u, borderRadius: `0 0 ${0.12 * u}px ${0.12 * u}px`, background: alpha(color, 0.45) }} />
        </>}
        {el.kind === "browser" && <>
          <div style={{ ...frame, inset: 0, borderRadius: 0.14 * u }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 0.55 * u, borderTop: stroke(false, u, alpha(color, 0.4)) }} />
          <div style={{ position: "absolute", left: 0.25 * u, top: 0.12 * u, height: 0.43 * u, maxWidth: w - 0.5 * u, boxSizing: "border-box", padding: `0 ${0.2 * u}px`,
            borderRadius: `${0.1 * u}px ${0.1 * u}px 0 0`, background: alpha(color, 0.16), display: "flex", alignItems: "center" }}>
            <Text u={u} size={0.24} color={pal.text}>{el.title}</Text>
          </div>
        </>}
        {el.kind !== "browser" && (
          <div style={{ position: "absolute", left: 0, right: 0, top: (el.kind === "phone" ? 0.42 : 0.25) * u, display: "flex", justifyContent: "center" }}>
            <Text u={u} size={0.26} bold color={pal.text}>{el.title}</Text>
          </div>
        )}
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} style={{ position: "absolute", left: d.left * u, right: d.left * u, top: (d.top + i * 0.4) * u }}>
            <Swap prev={prev.lines[i] ?? ""} now={el.lines[i] ?? ""} p={p} u={u}>
              {(s) => <Text u={u} size={0.24} color={pal.text} style={{ minHeight: 0.3 * u }}>{s}</Text>}
            </Swap>
          </div>
        ))}
        {bWas === bNow ? btn(bNow, 1) : <>{btn(bWas, 1 - p)}{btn(bNow, p)}</>}
      </div>
    );
  },
};
