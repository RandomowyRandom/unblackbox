import React from "react";
import {
  bytesH, byteCell, byteX, collections as defs, gridAt, GRID_STEP, kvCols, logCell, logH, logX, RING, ringAngle, ringAt, ringSlot, ROW, sheetRowY, stackY, tableCols,
} from "../../components/collections.ts";
import { CAPTION } from "../../components/core.ts";
import type { Pt, TypesOf } from "../../components/registry.ts";
import type { Palette } from "../../themes.ts";
import { alpha, Caption, dashed, mono, Panel, sans, stroke, type Renderers } from "../kit.tsx";

// Everything is drawn centered on the element in grid units, so a footprint that grows or shrinks never makes the content jump.
// Items are keyed: kept ones glide from their old spot, new ones fade in from `enter`, dropped ones fade out toward `exit`.

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
type Item = { key: string };
type Laid<T> = { key: string; now?: T; was?: T; x: number; y: number; o: number };

function keyed<T extends Item>(prev: T[], now: T[], at: (i: number, all: T[]) => Pt, p: number, enter: Pt = [0, 0], exit: Pt = enter): Laid<T>[] {
  const old = new Map(prev.map((t, i) => [t.key, i]));
  const out: Laid<T>[] = now.map((t, i) => {
    const [x, y] = at(i, now);
    const j = old.get(t.key);
    if (j === undefined) return { key: t.key, now: t, x: x + enter[0] * (1 - p), y: y + enter[1] * (1 - p), o: p };
    const [px, py] = at(j, prev);
    return { key: t.key, now: t, was: prev[j], x: lerp(px, x, p), y: lerp(py, y, p), o: 1 };
  });
  const kept = new Set(now.map((t) => t.key));
  if (p < 1) prev.forEach((t, j) => {
    if (kept.has(t.key)) return;
    const [x, y] = at(j, prev);
    out.push({ key: t.key, was: t, x: x + exit[0] * p, y: y + exit[1] * p, o: 1 - p });
  });
  return out;
}
// 0..1 glow: was lit before the latest change -> lit now
const glow = (was: boolean, now: boolean, p: number) => lerp(was ? 1 : 0, now ? 1 : 0, p);

// Absolute box of bw x bh grid units centered at (x, y) from the element center, inside a root of w x h px.
const boxAt = (u: number, w: number, h: number, x: number, y: number, bw: number, bh: number): React.CSSProperties =>
  ({ position: "absolute", left: w / 2 + (x - bw / 2) * u, top: h / 2 + (y - bh / 2) * u, width: bw * u, height: bh * u, boxSizing: "border-box" });

// Old text slides up and out while the new one slides in from below.
function Swap({ from, to, p, u }: { from?: string; to?: string; p: number; u: number }) {
  if (from === undefined || to === undefined || from === to || p >= 1) return <>{to ?? from}</>;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.25 * u}px)` }}>{to || " "}</span>
      <span style={{ position: "absolute", left: "50%", top: 0, opacity: 1 - p, transform: `translate(-50%, ${-p * 0.25 * u}px)` }}>{from}</span>
    </span>
  );
}

// One slot, the same look as core cells: filled when it holds something, glowing when lit.
type SlotProps = { u: number; style: React.CSSProperties; color: string; bad: boolean; pal: Palette; fill: number; lit: number; o: number; size?: number; children?: React.ReactNode };
const Slot = ({ u, style, color, bad, pal, fill, lit, o, size = 0.22, children }: SlotProps) => (
  <div style={{ ...style, border: stroke(bad, u, color), borderRadius: 0.08 * u, background: alpha(color, Math.min(0.65, fill + 0.4 * lit)),
    boxShadow: lit > 0.01 ? `0 0 ${0.25 * u * lit}px ${color}` : undefined, opacity: o, display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: mono, fontSize: size * u, color: pal.text, overflow: "hidden", whiteSpace: "nowrap" }}>{children}</div>
);
const filled = (v?: string) => (v ? 0.2 : 0);

// Caption row at the bottom of a body of height H units.
const Cap = ({ u, w, h, H, text, pal }: { u: number; w: number; h: number; H: number; text?: string; pal: Palette }) =>
  text ? <div style={boxAt(u, w, h, 0, H / 2 - CAPTION / 2, w / u, CAPTION)}><Caption u={u} text={text} pal={pal} /></div> : null;

// A small mono label centered at (x, y).
const Mark = ({ u, w, h, x, y, color, o = 1, children }: { u: number; w: number; h: number; x: number; y: number; color: string; o?: number; children: React.ReactNode }) => (
  <div style={{ position: "absolute", left: w / 2 + x * u, top: h / 2 + y * u, transform: "translate(-50%, -50%)", opacity: o,
    fontFamily: mono, fontSize: 0.2 * u, color, whiteSpace: "nowrap", lineHeight: 1 }}>{children}</div>
);

// table and kv: a panel of keyed rows; a changed cell swaps its text, lit rows get a band and lit cells a fill.
type Row = Item & { cells: string[] };
type Hl = readonly (string | readonly [string, string])[] | undefined;
const rowLit = (hl: Hl, key: string) => !!hl?.some((x) => x === key);
const cellLit = (hl: Hl, key: string, col?: string) => !!hl?.some((x) => typeof x !== "string" && x[0] === key && x[1] === col);
function Sheet({ u, w, h, color, bad, pal, cols, n, header, prev, now, hl, p, label }: {
  u: number; w: number; h: number; color: string; bad: boolean; pal: Palette; cols: number[]; n: number; header?: string[];
  prev: Row[]; now: Row[]; hl: [Hl, Hl]; p: number; label?: string;
}) {
  const cap = label ? CAPTION : 0;
  const W = sum(cols);
  const H = (header ? ROW : 0) + ROW * n + 0.1;
  const top = -(H + cap) / 2;
  const xs = cols.map((c, j) => -W / 2 + sum(cols.slice(0, j)) + c / 2);
  const rows = keyed(prev, now, (i, all) => [0, sheetRowY(i, all.length, !!header, cap)], p, [0, 0.3]);
  return (
    <>
      <Panel u={u} color={color} bad={bad} style={boxAt(u, w, h, 0, top + H / 2, W + 0.1, H)} />
      {header?.map((name, j) => (
        <div key={j} style={{ ...boxAt(u, w, h, xs[j], top + 0.05 + ROW / 2, cols[j], ROW), display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: sans, fontSize: 0.22 * u, fontWeight: 600, color: pal.muted }}>{name}</div>
      ))}
      {header && <div style={{ ...boxAt(u, w, h, 0, top + 0.05 + ROW, W - 0.1, 0), borderTop: stroke(false, u, alpha(color, 0.4), 0.02) }} />}
      {!header && cols.length === 2 && <div style={{ ...boxAt(u, w, h, xs[0] + cols[0] / 2, top + H / 2, 0, H - 0.2), borderLeft: stroke(false, u, alpha(color, 0.4), 0.02) }} />}
      {rows.map((r) => {
        const band = glow(rowLit(hl[0], r.key) && !!r.was, rowLit(hl[1], r.key) && !!r.now, p);
        return (
          <div key={r.key} style={{ ...boxAt(u, w, h, 0, r.y, W, ROW), opacity: r.o }}>
            {band > 0.01 && <div style={{ position: "absolute", inset: `${0.04 * u}px ${0.06 * u}px`, borderRadius: 0.06 * u, background: alpha(color, 0.3 * band) }} />}
            {cols.map((c, j) => {
              const lit = glow(cellLit(hl[0], r.key, header?.[j]) && !!r.was, cellLit(hl[1], r.key, header?.[j]) && !!r.now, p);
              return (
                <div key={j} style={{ ...boxAt(u, W * u, ROW * u, xs[j], 0, c - 0.12, ROW - 0.1), display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 0.06 * u, background: lit > 0.01 ? alpha(color, 0.5 * lit) : undefined, boxShadow: lit > 0.01 ? `0 0 ${0.2 * u * lit}px ${alpha(color, lit)}` : undefined,
                  overflow: "hidden", fontFamily: mono, fontSize: 0.22 * u, color: j === 0 && !header ? pal.muted : pal.text, fontWeight: j === 0 && header ? 600 : 400, whiteSpace: "nowrap" }}>
                  <Swap from={r.was?.cells[j]} to={r.now?.cells[j]} p={p} u={u} />
                </div>
              );
            })}
          </div>
        );
      })}
      <Cap u={u} w={w} h={h} H={H + cap} text={label} pal={pal} />
    </>
  );
}

const Root = ({ w, h, children }: { w: number; h: number; children: React.ReactNode }) => <div style={{ position: "relative", width: w, height: h }}>{children}</div>;

export const collections: Renderers<TypesOf<typeof defs>> = {
  // slabs in an open-top box: a push drops in from above, a pop lifts off
  stack: ({ el, u, w, h, color, bad, ctx, tween, change: { prev, p } }) => {
    const cap = el.label ? CAPTION : 0;
    const body = tween((e) => Math.max(e.items.length, 1) * 0.58 + 0.22);
    const items = (s: typeof el) => s.items.map((v, i, a) => ({ key: String(a.length - 1 - i), v, i }));
    const slabs = keyed(items(prev), items(el), (i, all) => [0, stackY(i, all.length, cap)], p, [0, -0.6]);
    const lit = (s: typeof el, i?: number) => i !== undefined && !!s.highlight?.includes(i);
    const top = -(body + cap) / 2;
    return (
      <Root w={w} h={h}>
        <div style={{ ...boxAt(u, w, h, 0, top + body / 2 + 0.02, 2.7, body - 0.04), border: stroke(bad, u, alpha(color, 0.6), 0.03), borderTop: "none",
          borderRadius: `0 0 ${0.12 * u}px ${0.12 * u}px` }} />
        {slabs.map((s) => (
          <Slot key={s.key} u={u} style={boxAt(u, w, h, s.x, s.y, 2.4, 0.5)} color={color} bad={bad} pal={ctx.pal} fill={0.2} o={s.o}
            lit={glow(lit(prev, s.was?.i), lit(el, s.now?.i), p)}>
            <Swap from={s.was?.v} to={s.now?.v} p={p} u={u} />
          </Slot>
        ))}
        <Cap u={u} w={w} h={h} H={body + cap} text={el.label} pal={ctx.pal} />
      </Root>
    );
  },
  // slots on a faint circle; pointers are markers outside it that always advance clockwise
  ring: ({ el, u, w, h, color, bad, ctx, change: { prev, p } }) => {
    const n = el.slots.length;
    const s = ringSlot(n);
    const items = (x: typeof el) => x.slots.map((v, i) => ({ key: String(i), v }));
    const slots = keyed(items(prev), items(el), (i, all) => ringAt(i, all.length), p);
    const was = new Map((prev.pointers ?? []).map((q) => [q.label, q.at]));
    const ptrs = [
      ...(el.pointers ?? []).map((q) => {
        const from = was.get(q.label);
        return { label: q.label, a: ringAngle(from === undefined ? q.at : from + ((q.at - from + n) % n) * p, n), o: from === undefined ? p : 1 };
      }),
      ...(prev.pointers ?? []).filter((q) => !el.pointers?.some((x) => x.label === q.label)).map((q) => ({ label: q.label, a: ringAngle(q.at, n), o: 1 - p })),
    ];
    const near = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.15;
    const [cx, cy] = [w / 2, h / 2];
    const tip = RING + s / 2 + 0.08;
    return (
      <Root w={w} h={h}>
        <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={w} height={h}>
          <circle cx={cx} cy={cy} r={RING * u} fill="none" stroke={alpha(color, 0.35)} strokeWidth={0.025 * u} strokeDasharray={dashed(bad, u)} />
          {ptrs.map((q, k) => {
            const [dx, dy] = [Math.cos(q.a), Math.sin(q.a)];
            const [nx, ny] = [-dy, dx];
            const pt = (r: number, side = 0) => `${cx + (dx * r + nx * side) * u},${cy + (dy * r + ny * side) * u}`;
            const lift = ptrs.slice(0, k).filter((x) => near(x.a, q.a)).length * 0.28;
            const r = tip + 0.36 + lift;
            return (
              <g key={q.label} opacity={q.o}>
                <polygon points={`${pt(tip)} ${pt(tip + 0.2, 0.11)} ${pt(tip + 0.2, -0.11)}`} fill={ctx.pal.text} />
                <text x={cx + dx * r * u} y={cy + dy * r * u} fill={ctx.pal.text} fontFamily={sans} fontSize={0.22 * u} dominantBaseline="middle"
                  textAnchor={dx > 0.35 ? "start" : dx < -0.35 ? "end" : "middle"}>{q.label}</text>
              </g>
            );
          })}
        </svg>
        {slots.map((x) => (
          <Slot key={x.key} u={u} style={boxAt(u, w, h, x.x, x.y, s, s)} color={color} bad={bad} pal={ctx.pal} o={x.o} lit={0}
            fill={lerp(filled(x.was?.v ?? x.now?.v), filled(x.now?.v ?? x.was?.v), p)} size={0.2}>
            <Swap from={x.was?.v} to={x.now?.v} p={p} u={u} />
          </Slot>
        ))}
        {el.label && <Mark u={u} w={w} h={h} x={0} y={0} color={ctx.pal.muted}><span style={{ fontFamily: sans, fontSize: 0.26 * u }}>{el.label}</span></Mark>}
      </Root>
    );
  },
  table: ({ el, u, w, h, color, bad, ctx, tween, change: { prev, p } }) => {
    const rows = (s: typeof el) => s.rows.map((r) => ({ key: r.key, cells: [r.key, ...r.cells] }));
    return (
      <Root w={w} h={h}>
        <Sheet u={u} w={w} h={h} color={color} bad={bad} pal={ctx.pal} cols={el.columns.map((_, j) => tween((e) => tableCols(e)[j]))}
          n={tween((e) => Math.max(e.rows.length, 1))} header={el.columns} prev={rows(prev)} now={rows(el)} hl={[prev.highlight, el.highlight]} p={p} label={el.label} />
      </Root>
    );
  },
  kv: ({ el, u, w, h, color, bad, ctx, tween, change: { prev, p } }) => {
    const rows = (s: typeof el) => s.entries.map((e) => ({ key: e.key, cells: [e.key, e.value] }));
    return (
      <Root w={w} h={h}>
        <Sheet u={u} w={w} h={h} color={color} bad={bad} pal={ctx.pal} cols={[0, 1].map((j) => tween((e) => kvCols(e)[j]))}
          n={tween((e) => Math.max(e.entries.length, 1))} prev={rows(prev)} now={rows(el)} hl={[prev.highlight, el.highlight]} p={p} label={el.label} />
      </Root>
    );
  },
  // offsets above, a faint spare slot where the next append lands, cursor markers below that glide to their new offset
  log: ({ el, u, w, h, color, bad, ctx, tween, change: { prev, p } }) => {
    const H = tween((e) => logH(e));
    const top = -H / 2;
    const cell = tween((e) => logCell(e.entries));
    const items = (s: typeof el) => s.entries.map((v, i) => ({ key: String((s.start ?? 0) + i), v }));
    const entries = keyed(items(prev), items(el), (i, all) => [logX(i, all.map((x) => x.v)), 0], p, [0.6, 0], [-0.6, 0]);
    const spare = tween((e) => logX(e.entries.length, e.entries));
    const names = [...new Set([...Object.keys(prev.cursors ?? {}), ...Object.keys(el.cursors ?? {})])];
    const xOf = (s: typeof el, name: string) => (s.cursors?.[name] === undefined ? undefined : logX(s.cursors[name] - (s.start ?? 0), s.entries));
    const cursors = names.map((name) => {
      const [a, b] = [xOf(prev, name), xOf(el, name)];
      return { name, x: lerp(a ?? b!, b ?? a!, p), o: glow(a !== undefined, b !== undefined, p) };
    });
    return (
      <Root w={w} h={h}>
        <div style={{ ...boxAt(u, w, h, spare, top + 0.7, cell, 0.74), border: stroke(false, u, alpha(ctx.pal.muted, 0.35)), borderRadius: 0.08 * u }} />
        {entries.map((e) => (
          <React.Fragment key={e.key}>
            <Mark u={u} w={w} h={h} x={e.x} y={top + 0.15} color={ctx.pal.muted} o={e.o}>{e.key}</Mark>
            <Slot u={u} style={boxAt(u, w, h, e.x, top + 0.7, cell, 0.74)} color={color} bad={bad} pal={ctx.pal} fill={0.2} lit={0} o={e.o}>
              <Swap from={e.was?.v} to={e.now?.v} p={p} u={u} />
            </Slot>
          </React.Fragment>
        ))}
        <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={w} height={h}>
          {cursors.map((c) => {
            const [x, y] = [w / 2 + c.x * u, h / 2 + (top + 1.12) * u];
            return <polygon key={c.name} opacity={c.o} fill={ctx.pal.text} points={`${x},${y} ${x - 0.11 * u},${y + 0.18 * u} ${x + 0.11 * u},${y + 0.18 * u}`} />;
          })}
        </svg>
        {cursors.map((c, k) => {
          const below = cursors.slice(0, k).filter((x) => Math.abs(x.x - c.x) < 0.3).length;
          return (
            <Mark key={c.name} u={u} w={w} h={h} x={c.x} y={top + 1.46 + below * 0.28} color={ctx.pal.text} o={c.o}>
              <span style={{ fontFamily: sans, fontSize: 0.22 * u }}>{c.name}</span>
            </Mark>
          );
        })}
        <Cap u={u} w={w} h={h} H={H} text={el.label} pal={ctx.pal} />
      </Root>
    );
  },
  // with shade on, numeric cells fill by value, so hot spots stand out without reading a number
  grid: ({ el, u, w, h, color, bad, ctx, change: { prev, p } }) => {
    const cap = el.label ? CAPTION : 0;
    const items = (s: typeof el) => s.rows.flatMap((row, r) => row.map((v, c) => ({ key: `${r}-${c}`, v, r, c, R: s.rows.length, C: row.length })));
    const cells = keyed(items(prev), items(el), (i, all) => gridAt(all[i].r, all[i].c, all[i].R, all[i].C, cap), p);
    const fillOf = (s: typeof el) => {
      const nums = s.rows.flat().map(Number).filter((v, i) => s.rows.flat()[i] !== "" && Number.isFinite(v));
      const max = Math.max(1e-9, ...nums);
      return (v?: string) => (s.shade && v && Number.isFinite(Number(v)) ? 0.06 + 0.5 * Math.max(0, Number(v)) / max : filled(v));
    };
    const [fWas, fNow] = [fillOf(prev), fillOf(el)];
    const lit = (s: typeof el, x?: { r: number; c: number }) => !!x && !!s.highlight?.some(([r, c]) => r === x.r && c === x.c);
    const H = el.rows.length * GRID_STEP + 0.05 + cap;
    return (
      <Root w={w} h={h}>
        {cells.map((x) => (
          <Slot key={x.key} u={u} style={boxAt(u, w, h, x.x, x.y, 0.5, 0.5)} color={color} bad={bad} pal={ctx.pal} o={x.o} size={0.2}
            fill={lerp(fWas(x.was?.v ?? x.now?.v), fNow(x.now?.v ?? x.was?.v), p)} lit={glow(lit(prev, x.was), lit(el, x.now), p)}>
            <Swap from={x.was?.v} to={x.now?.v} p={p} u={u} />
          </Slot>
        ))}
        <Cap u={u} w={w} h={h} H={H} text={el.label} pal={ctx.pal} />
      </Root>
    );
  },
  // byte indexes above, a bracket and name under each field
  bytes: ({ el, u, w, h, color, bad, ctx, change: { prev, p } }) => {
    const H = bytesH(el);
    const top = -H / 2;
    const cw = byteCell(el.values);
    const items = (s: typeof el) => s.values.map((v, i) => ({ key: String(i), v }));
    const cells = keyed(items(prev), items(el), (i, all) => [byteX(i, all.map((x) => x.v)), top + 0.59], p);
    const lit = (s: typeof el, k?: string) => k !== undefined && !!s.highlight?.includes(Number(k));
    const y = (top + 1.04) * u + h / 2;
    return (
      <Root w={w} h={h}>
        {cells.map((c) => (
          <React.Fragment key={c.key}>
            <Mark u={u} w={w} h={h} x={c.x} y={top + 0.14} color={ctx.pal.muted} o={c.o}>{c.key}</Mark>
            <Slot u={u} style={boxAt(u, w, h, c.x, c.y, cw, 0.62)} color={color} bad={bad} pal={ctx.pal} fill={0.2} o={c.o}
              lit={glow(lit(prev, c.was && c.key), lit(el, c.now && c.key), p)}>
              <Swap from={c.was?.v} to={c.now?.v} p={p} u={u} />
            </Slot>
          </React.Fragment>
        ))}
        <svg style={{ position: "absolute", inset: 0, overflow: "visible" }} width={w} height={h}>
          {(el.fields ?? []).map((f) => {
            const [x0, x1] = [w / 2 + (byteX(f.from, el.values) - cw / 2 + 0.04) * u, w / 2 + (byteX(f.to, el.values) + cw / 2 - 0.04) * u];
            return <path key={f.name} d={`M${x0} ${y - 0.08 * u} L${x0} ${y} L${x1} ${y} L${x1} ${y - 0.08 * u}`} fill="none" stroke={alpha(color, 0.6)} strokeWidth={0.025 * u} />;
          })}
        </svg>
        {(el.fields ?? []).map((f) => (
          <Mark key={f.name} u={u} w={w} h={h} x={(byteX(f.from, el.values) + byteX(f.to, el.values)) / 2} y={top + 1.26} color={ctx.pal.text}>{f.name}</Mark>
        ))}
        <Cap u={u} w={w} h={h} H={H} text={el.label} pal={ctx.pal} />
      </Root>
    );
  },
};
