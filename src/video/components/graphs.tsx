import React from "react";
import { interpolateColors } from "remotion";
import {
  COMMIT, commitLayout, FILE, fileIcon, fileRows, flowLayout, graphLayout, headCommit, layersLayout, statesLayout, treeLayout,
  type graphs as defs, type Layout,
} from "../../components/graphs.ts";
import type { Pt, Rect, TypesOf } from "../../components/registry.ts";
import type { Palette } from "../../themes.ts";
import { alpha, dashed, iconFor, mono, Panel, sans, stroke, svgPath, Text, tone, type Renderers } from "../kit.tsx";

type Shape = "box" | "pill" | "diamond" | "dot";
type DNode = { id: string; r: Rect; label?: string; icon?: string; shape: Shape; lit: number; o?: number };
type DLink = { id: string; pts: Pt[]; label?: string; at?: Pt; c: string; bad?: boolean; head?: boolean; o?: number };
type Scene = { nodes: DNode[]; links: DLink[] };
type Base = { u: number; w: number; h: number; color: string; bad: boolean; ctx: { pal: Palette } };

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const lerpPt = (a: Pt, b: Pt, p: number): Pt => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
// The scene before the latest set blended into the one now: kept things glide, new ones fade in, gone ones fade out.
function blend<T extends { id: string; o?: number }>(prev: T[], now: T[], p: number, mix: (a: T, b: T) => T): T[] {
  const was = new Map(prev.map((x) => [x.id, x]));
  const ids = new Set(now.map((x) => x.id));
  return [...now.map((b) => { const a = was.get(b.id); return a ? mix(a, b) : { ...b, o: p }; }), ...prev.filter((a) => !ids.has(a.id)).map((a) => ({ ...a, o: 1 - p }))];
}
const mixScene = (a: Scene, b: Scene, p: number): Scene => ({
  nodes: blend(a.nodes, b.nodes, p, (x, y) => ({ ...y, lit: lerp(x.lit, y.lit, p),
    r: { x: lerp(x.r.x, y.r.x, p), y: lerp(x.r.y, y.r.y, p), w: lerp(x.r.w, y.r.w, p), h: lerp(x.r.h, y.r.h, p) } })),
  links: blend(a.links, b.links, p, (x, y) => ({ ...y, c: interpolateColors(p, [0, 1], [x.c, y.c]),
    pts: x.pts.length === y.pts.length ? y.pts.map((q, i) => lerpPt(x.pts[i], q, p)) : y.pts, at: x.at && y.at ? lerpPt(x.at, y.at, p) : y.at })),
});
const lit = (ids: readonly string[] | undefined, id: string) => (ids?.includes(id) ? 1 : 0);

// Nodes (boxes, pills, diamonds, dots) over their links, positioned from the element center.
function Diagram({ u, w, h, color, bad, ctx: { pal }, nodes, links, children }: Base & Scene & { children?: React.ReactNode }) {
  const [ox, oy] = [w / 2 / u, h / 2 / u];
  return (
    <div style={{ position: "relative", width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {links.map((l) => {
          const [end, before] = [l.pts.at(-1)!, l.pts.at(-2) ?? l.pts[0]];
          const angle = (Math.atan2(end[1] - before[1], end[0] - before[0]) * 180) / Math.PI;
          const s = 0.13 * u;
          return (
            <g key={l.id} opacity={l.o ?? 1}>
              <path d={svgPath(l.pts, u, ox, oy)} stroke={l.c} strokeWidth={0.03 * u} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed(!!l.bad, u)} />
              {l.head && <polygon points={`0,0 ${-s},${-s * 0.6} ${-s},${s * 0.6}`} fill={l.c} transform={`translate(${(end[0] + ox) * u} ${(end[1] + oy) * u}) rotate(${angle})`} />}
              {l.label && l.at && (
                <text x={(l.at[0] + ox) * u} y={(l.at[1] + oy) * u} fill={l.bad || l.c !== pal.muted ? l.c : pal.muted} fontFamily={sans} fontSize={0.22 * u}
                  textAnchor="middle" dominantBaseline="middle" stroke={pal.bg} strokeWidth={0.08 * u} paintOrder="stroke" strokeLinejoin="round">{l.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => <Node key={n.id} n={n} u={u} color={color} bad={bad} pal={pal} left={(n.r.x - n.r.w / 2 + ox) * u} top={(n.r.y - n.r.h / 2 + oy) * u} />)}
      {children}
    </div>
  );
}

function Node({ n, u, color, bad, pal, left, top }: { n: DNode; u: number; color: string; bad: boolean; pal: Palette; left: number; top: number }) {
  const [w, h] = [n.r.w * u, n.r.h * u];
  const glow = n.lit > 0.01 ? `0 0 ${0.3 * u * n.lit}px ${alpha(color, n.lit)}` : undefined;
  const fill = alpha(color, 0.1 + 0.45 * n.lit);
  const Icon = n.icon ? iconFor(n.icon) : null;
  const base: React.CSSProperties = { position: "absolute", left, top, width: w, height: h, opacity: n.o ?? 1, boxSizing: "border-box" };
  if (n.shape === "dot") {
    return (
      <div style={{ ...base, borderRadius: "50%", background: color, border: stroke(bad, u, color), boxShadow: glow }}>
        {n.label && <Text u={u} size={0.2} mono color={pal.text} style={{ position: "absolute", top: h + 0.06 * u, left: "50%", transform: "translateX(-50%)", overflow: "visible" }}>{n.label}</Text>}
      </div>
    );
  }
  const label = (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.1 * u, padding: `0 ${0.15 * u}px` }}>
      {Icon && <Icon size={0.3 * u} color={color} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
      <Text u={u} size={n.shape === "diamond" ? 0.24 : 0.26} color={pal.text} style={{ minWidth: 0 }}>{n.label}</Text>
    </div>
  );
  if (n.shape === "diamond") {
    const sw = 0.025 * u;
    return (
      <div style={base}>
        <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", filter: glow && `drop-shadow(${glow})` }}>
          <polygon points={`${w / 2},${sw} ${w - sw},${h / 2} ${w / 2},${h - sw} ${sw},${h / 2}`} fill={fill} stroke={color} strokeWidth={sw} strokeDasharray={dashed(bad, u)} />
        </svg>
        {label}
      </div>
    );
  }
  return <div style={{ ...base, border: stroke(bad, u, color), borderRadius: n.shape === "pill" ? h / 2 : 0.12 * u, background: fill, boxShadow: glow }}>{label}</div>;
}

// Links of a layout as drawn: muted unless colored, arrowheads unless a hierarchy.
const linksOf = (L: Layout, pal: Palette, items: { id: string; label?: string; color?: "accent" | "muted" | "good" | "bad" }[], head = true): DLink[] =>
  items.filter((l) => L.links[l.id]).map((l) => ({ id: l.id, pts: L.links[l.id], label: l.label, at: L.labels[l.id], c: tone(pal, l.color, pal.muted), bad: l.color === "bad", head }));
const nodesOf = (L: Layout, items: { id: string; label?: string; icon?: string }[], shape: (id: string) => Shape, on: (id: string) => number): DNode[] =>
  items.filter((n) => L.nodes[n.id]).map((n) => ({ id: n.id, r: L.nodes[n.id], label: n.label, icon: n.icon, shape: shape(n.id), lit: on(n.id) }));

export const graphs: Renderers<TypesOf<typeof defs>> = {
  tree: (p) => {
    const scene = (e: typeof p.el): Scene => {
      const L = treeLayout(e);
      return { nodes: nodesOf(L, e.nodes, () => "box", (id) => lit(e.highlight, id)), links: linksOf(L, p.ctx.pal, e.nodes.map((n) => ({ id: n.id })), false) };
    };
    return <Diagram {...p} {...mixScene(scene(p.change.prev), scene(p.el), p.change.p)} />;
  },
  graph: (p) => {
    const scene = (e: typeof p.el): Scene => {
      const L = graphLayout(e);
      return { nodes: nodesOf(L, e.nodes, () => "box", (id) => lit(e.highlight, id)), links: linksOf(L, p.ctx.pal, e.edges) };
    };
    return <Diagram {...p} {...mixScene(scene(p.change.prev), scene(p.el), p.change.p)} />;
  },
  states: (p) => {
    const scene = (e: typeof p.el): Scene => {
      const L = statesLayout(e);
      return { nodes: nodesOf(L, e.states, () => "pill", (id) => (id === e.current ? 1 : 0)), links: linksOf(L, p.ctx.pal, e.transitions) };
    };
    return <Diagram {...p} {...mixScene(scene(p.change.prev), scene(p.el), p.change.p)} />;
  },
  flow: (p) => {
    const scene = (e: typeof p.el): Scene => {
      const L = flowLayout(e);
      const kind = (id: string) => e.steps.find((s) => s.id === id)?.kind;
      const shape = (id: string): Shape => (kind(id) === "decision" ? "diamond" : kind(id) === "start" || kind(id) === "end" ? "pill" : "box");
      return { nodes: nodesOf(L, e.steps, shape, (id) => (id === e.active ? 1 : 0)), links: linksOf(L, p.ctx.pal, e.links) };
    };
    return <Diagram {...p} {...mixScene(scene(p.change.prev), scene(p.el), p.change.p)} />;
  },
  layers: (p) => {
    const scene = (e: typeof p.el): Scene => ({ nodes: nodesOf(layersLayout(e), e.layers, () => "box", (id) => lit(e.highlight, id)), links: [] });
    return <Diagram {...p} {...mixScene(scene(p.change.prev), scene(p.el), p.change.p)} />;
  },
  commits: (p) => {
    const { u, w, h, color, ctx: { pal }, change } = p;
    const scene = (e: typeof p.el): Scene => {
      const L = commitLayout(e);
      const head = headCommit(e);
      return { nodes: nodesOf(L, e.commits, () => "dot", (id) => (id === head ? 1 : 0)), links: Object.entries(L.links).map(([id, pts]) => ({ id, pts, c: color })) };
    };
    const tag = (e: typeof p.el) => { const id = headCommit(e); return id ? commitLayout(e).nodes[id] : undefined; };
    const [was, now] = [tag(change.prev), tag(p.el)];
    const at = now && (was ? lerpPt([was.x, was.y], [now.x, now.y], change.p) : [now.x, now.y]);
    const L = commitLayout(p.el);
    const place = (x: number, y: number): React.CSSProperties => ({ position: "absolute", left: x * u + w / 2, top: y * u + h / 2, transform: "translate(-50%, -50%)" });
    return (
      <Diagram {...p} {...mixScene(scene(change.prev), scene(p.el), change.p)}>
        {p.el.branches.map((b) => {
          const pt = L.labels[`branch:${b.id}`];
          return <Text key={b.id} u={u} size={0.22} color={pal.muted} style={{ ...place(pt[0], pt[1]), fontFamily: sans, fontWeight: 600 }}>{b.label}</Text>;
        })}
        {at && (
          <div style={{ ...place(at[0], at[1] - COMMIT.dot / 2 - 0.22), opacity: was ? 1 : change.p, padding: `${0.02 * u}px ${0.1 * u}px`, borderRadius: u,
            background: color, color: pal.bg, fontFamily: mono, fontSize: 0.2 * u, fontWeight: 700, lineHeight: 1.2 }}>HEAD</div>
        )}
      </Diagram>
    );
  },
  files: ({ el, u, color, bad, ctx: { pal }, change, tween }) => {
    const rowsOf = (e: typeof el) => fileRows(e.entries).rows.map((r) => ({ ...r, id: r.key, lit: r.entry ? lit(e.highlight, r.entry) : 0, o: 1 }));
    const rows = blend(rowsOf(change.prev), rowsOf(el), change.p, (a, b) => ({ ...b, y: lerp(a.y, b.y, change.p), lit: lerp(a.lit, b.lit, change.p) }));
    const [W, H] = [tween((e) => fileRows(e.entries).size[0]) * u, tween((e) => fileRows(e.entries).size[1]) * u];
    return (
      <Panel u={u} color={color} bad={bad} style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>
        {rows.map((r) => {
          const Icon = iconFor(fileIcon(r));
          return (
            <div key={r.id} style={{ position: "absolute", left: 0.1 * u, right: 0.1 * u, top: H / 2 + (r.y - FILE.row / 2 + 0.01) * u, height: (FILE.row - 0.02) * u,
              paddingLeft: (0.15 + r.depth * FILE.indent) * u, display: "flex", alignItems: "center", gap: 0.12 * u, borderRadius: 0.08 * u,
              background: alpha(color, 0.4 * r.lit), boxShadow: r.lit > 0.01 ? `0 0 ${0.2 * u * r.lit}px ${alpha(color, r.lit * 0.8)}` : undefined, opacity: r.o }}>
              <Icon size={0.28 * u} color={r.folder ? color : pal.muted} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              <Text u={u} size={0.24} mono color={r.folder ? pal.muted : pal.text}>{r.name}{r.folder ? "/" : ""}</Text>
            </div>
          );
        })}
      </Panel>
    );
  },
};
