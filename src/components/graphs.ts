import { z } from "zod";
import { colRects, Color, defineComponent, Icon, Label, PartId, uniqueIds, type Pt, type Rect } from "./registry.ts";

// One layout per type, in grid units from the element center. parts, edges, size and the renderer
// (src/video/components/graphs.tsx) all read it, so arrows, packets and pixels agree.
export type Layout = { nodes: Record<string, Rect>; links: Record<string, Pt[]>; labels: Record<string, Pt>; size: [number, number] };
type Link = { id: string; from: string; to: string; label?: string };

const CHAR = 0.13; // grid units per character of a 0.22-unit label (estimate)
const GAP = 0.08; // between a node outline and an arrowhead
const r2 = (v: number) => Math.round(v * 100) / 100;
const flip = (r: Rect): Rect => ({ x: r.y, y: r.x, w: r.h, h: r.w });
const flipPt = ([x, y]: Pt): Pt => [y, x];
const dedupe = (pts: Pt[]) => pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);
const list = (ids: string[]) => ids.slice(0, 8).join(", ") + (ids.length > 8 ? ", ..." : "");

// Distance from a node's center to its outline along the unit direction (dx, dy).
const reach = (r: Rect, dx: number, dy: number, diamond = false) => {
  const [ax, ay] = [Math.abs(dx) / (r.w / 2), Math.abs(dy) / (r.h / 2)];
  return (diamond ? 1 / (ax + ay || 1) : 1 / (Math.max(ax, ay) || 1)) + GAP;
};
// A straight link between two outlines; shift slides it sideways (+ = left of its direction).
function straight(a: Rect, b: Rect, shift = 0, da = false, db = false): Pt[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
  const [nx, ny] = [uy * shift, -ux * shift];
  const [s, e] = [reach(a, ux, uy, da) - GAP, reach(b, ux, uy, db)];
  return [[a.x + nx + ux * s, a.y + ny + uy * s], [b.x + nx - ux * e, b.y + ny - uy * e]];
}
// The axis direction closest to `out`.
const axis = (out: Pt): Pt => (Math.abs(out[0]) > Math.abs(out[1]) ? [Math.sign(out[0]), 0] : [0, Math.sign(out[1]) || -1]);
// A loop leaving and re-entering one node on the side `out` points to (snapped to an axis).
function loop(r: Rect, out: Pt): Pt[] {
  const d = axis(out);
  const t: Pt = [-d[1] * 0.22, d[0] * 0.22];
  const e = Math.abs(d[0]) * r.w / 2 + Math.abs(d[1]) * r.h / 2;
  const at = (k: number, s: number): Pt => [r.x + d[0] * k + t[0] * s, r.y + d[1] * k + t[1] * s];
  return [at(e, 1), at(e + 0.4, 1), at(e + 0.4, -1), at(e + GAP, -1)];
}
// Halfway along a polyline, and the direction there.
function midway(pts: Pt[]): { at: Pt; dir: Pt } {
  const segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = segs.reduce((s, x) => s + x, 0) / 2;
  for (let i = 0; i < segs.length; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    if (d <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? d / segs[i] : 0;
      return { at: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], dir: [(b[0] - a[0]) / (segs[i] || 1), (b[1] - a[1]) / (segs[i] || 1)] };
    }
    d -= segs[i];
  }
  return { at: pts[0], dir: [1, 0] };
}
// Center of a link's label beside its middle: on `side` if given, else on the side farther from other nodes.
function labelAt(pts: Pt[], text: string, side: Pt | undefined, avoid: Rect[]): Pt {
  const { at, dir } = midway(pts);
  const put = (n: Pt): Pt => { const d = 0.1 + Math.abs(n[0]) * text.length * CHAR / 2 + Math.abs(n[1]) * 0.15; return [at[0] + n[0] * d, at[1] + n[1] * d]; };
  const room = (p: Pt) => Math.min(9, ...avoid.map((r) => Math.max(Math.abs(p[0] - r.x) - r.w / 2, Math.abs(p[1] - r.y) - r.h / 2)));
  if (side) return put(side);
  const [l, r] = [put([dir[1], -dir[0]]), put([-dir[1], dir[0]])];
  return room(r) > room(l) + 0.05 ? r : l;
}
// Recenters everything on the bounding box (texts sized by character count), which becomes the footprint.
function finish(nodes: Record<string, Rect>, links: Record<string, Pt[]>, labels: Record<string, Pt> = {}, texts: Record<string, string> = {}, extra: Rect[] = []): Layout {
  const boxes = [...Object.values(nodes), ...extra, ...Object.values(links).flat().map(([x, y]) => ({ x, y, w: 0, h: 0 })),
    ...Object.entries(labels).map(([k, [x, y]]) => ({ x, y, w: (texts[k] ?? "").length * CHAR, h: 0.3 }))];
  if (!boxes.length) return { nodes, links, labels, size: [1, 1] };
  const lo = [Math.min(...boxes.map((b) => b.x - b.w / 2)), Math.min(...boxes.map((b) => b.y - b.h / 2))];
  const hi = [Math.max(...boxes.map((b) => b.x + b.w / 2)), Math.max(...boxes.map((b) => b.y + b.h / 2))];
  const [cx, cy] = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
  const mv = ([x, y]: Pt): Pt => [r2(x - cx), r2(y - cy)];
  const map = <T, U>(o: Record<string, T>, f: (v: T) => U) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
  return {
    nodes: map(nodes, (r) => ({ ...r, x: r2(r.x - cx), y: r2(r.y - cy) })),
    links: map(links, (pts) => pts.map(mv)),
    labels: map(labels, mv),
    size: [r2(hi[0] - lo[0] + 0.1), r2(hi[1] - lo[1] + 0.1)],
  };
}
const labelsOf = (links: Link[], pts: Record<string, Pt[]>, nodes: Record<string, Rect>, side?: (l: Link) => Pt | undefined) => {
  const labels: Record<string, Pt> = {}, texts: Record<string, string> = {};
  const avoid = Object.values(nodes);
  for (const l of links) {
    if (!l.label || !pts[l.id]) continue;
    [labels[l.id], texts[l.id]] = [labelAt(pts[l.id], l.label, side?.(l), avoid), l.label];
    avoid.push({ x: labels[l.id][0], y: labels[l.id][1], w: l.label.length * CHAR, h: 0.3 }); // later labels keep clear of this one
  }
  return { labels, texts };
};

// Ranks by longest path from the sources (back links found by depth-first search are ignored), one barycenter
// pass against crossings. `down` ranks top to bottom, else left to right. Links that go back up, or skip a rank
// through another node, detour around the far side through the gaps between ranks.
export function layered(ids: string[], all: Link[], down: boolean, node: Pt, gap: Pt, diamonds: string[] = []): Layout {
  const links = all.filter((l) => ids.includes(l.from) && ids.includes(l.to));
  const seen: Record<string, number> = {};
  const back = new Set<string>();
  const visit = (id: string) => {
    seen[id] = 1;
    for (const l of links) if (l.from === id) { if (seen[l.to] === 1) back.add(l.id); else if (!seen[l.to]) visit(l.to); }
    seen[id] = 2;
  };
  ids.forEach((id) => seen[id] || visit(id));
  const fwd = links.filter((l) => !back.has(l.id));
  const rank = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let i = 0; i < ids.length; i++) for (const l of fwd) rank[l.to] = Math.max(rank[l.to], rank[l.from] + 1);
  const rows: string[][] = [];
  ids.forEach((id) => (rows[rank[id]] ??= []).push(id));
  // abstract coordinates: ranks along y, slots along x; flipped at the end for left-to-right
  const [w, h] = down ? node : flipPt(node);
  const cross: Record<string, number> = {};
  const mean = (id: string) => { const ps = fwd.filter((l) => l.to === id).map((l) => cross[l.from]); return ps.length ? ps.reduce((s, x) => s + x, 0) / ps.length : 0; };
  rows.forEach((row, r) => {
    if (r) row.sort((a, b) => mean(a) - mean(b));
    row.forEach((id, i) => (cross[id] = (i - (row.length - 1) / 2) * (w + gap[1])));
  });
  const R: Record<string, Rect> = Object.fromEntries(ids.map((id) => [id, { x: cross[id], y: rank[id] * (h + gap[0]), w, h }]));
  const isD = (id: string) => diamonds.includes(id);
  const blocked = (pts: Pt[], skip: string[]) => ids.some((id) => !skip.includes(id) && Array.from({ length: 13 }, (_, i) => i / 12).some((f) => {
    const [x, y] = [pts[0][0] + (pts[1][0] - pts[0][0]) * f, pts[0][1] + (pts[1][1] - pts[0][1]) * f];
    return Math.abs(x - R[id].x) < R[id].w / 2 + 0.05 && Math.abs(y - R[id].y) < R[id].h / 2 + 0.05;
  }));
  // outline below a node at sideways offset dx (diamonds slope)
  const below = (r: Rect, dx: number, diamond: boolean) => (diamond ? (r.h / 2) * (1 - Math.abs(dx) / (r.w / 2)) : r.h / 2);
  const edge = [Math.min(...ids.map((id) => R[id].x - R[id].w / 2)), Math.max(...ids.map((id) => R[id].x + R[id].w / 2))];
  let detours = 0;
  const pts: Record<string, Pt[]> = {};
  const out: Record<string, Pt> = {};
  for (const l of links) {
    const [a, b] = [R[l.from], R[l.to]];
    if (l.from === l.to) { pts[l.id] = loop(a, [1, 0]); out[l.id] = [1, 0]; continue; }
    const line = straight(a, b, 0, isD(l.from), isD(l.to));
    if (rank[l.to] === rank[l.from] + 1 || (rank[l.to] > rank[l.from] && !blocked(line, [l.from, l.to]))) { pts[l.id] = line; continue; }
    // around the side the target leans to, so the detour crosses as little as possible
    const k = b.x < 0 ? -1 : 1;
    const [dx, dy] = [k * a.w * 0.2, k * b.w * 0.2];
    const side = edge[k < 0 ? 0 : 1] + k * (0.35 + 0.25 * detours++);
    const [y1, y2] = [a.y + a.h / 2 + gap[0] / 2, b.y - b.h / 2 - gap[0] / 2];
    pts[l.id] = [[a.x + dx, a.y + below(a, dx, isD(l.from))], [a.x + dx, y1], [side, y1], [side, y2], [b.x + dy, y2], [b.x + dy, b.y - below(b, dy, isD(l.to)) - GAP]];
    out[l.id] = [k, 0];
  }
  const F = down ? (p: Pt) => p : flipPt;
  const nodes = Object.fromEntries(ids.map((id) => [id, down ? R[id] : flip(R[id])]));
  const screen = Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, v.map(F)]));
  const { labels, texts } = labelsOf(links, screen, nodes, (l) => out[l.id] && F(out[l.id]));
  return finish(nodes, screen, labels, texts);
}

// Nodes evenly on an ellipse, first one top-left, clockwise. A link with a reverse twin shifts aside so both show.
export function ring(ids: string[], all: Link[], node: Pt): Layout {
  const n = ids.length;
  const [rx, ry] = [1 + 0.36 * n, 0.5 + 0.2 * n];
  const R: Record<string, Rect> = Object.fromEntries(ids.map((id, i) => {
    const a = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n;
    return [id, { x: n > 1 ? rx * Math.cos(a) : 0, y: n > 1 ? ry * Math.sin(a) : 0, w: node[0], h: node[1] }];
  }));
  const links = all.filter((l) => R[l.from] && R[l.to]);
  const pts: Record<string, Pt[]> = {};
  const side: Record<string, Pt> = {};
  for (const l of links) {
    const [a, b] = [R[l.from], R[l.to]];
    const outward: Pt = n > 1 ? [a.x / rx, a.y / ry] : [0, -1];
    if (l.from === l.to) { pts[l.id] = loop(a, outward); side[l.id] = axis(outward); continue; }
    const twin = links.some((m) => m.from === l.to && m.to === l.from);
    pts[l.id] = straight(a, b, twin ? 0.13 : 0);
    // twins keep their labels on their own (left) side
    if (twin) { const { dir } = midway(pts[l.id]); side[l.id] = [dir[1], -dir[0]]; }
  }
  const { labels, texts } = labelsOf(links, pts, R, (l) => side[l.id]);
  return finish(R, pts, labels, texts);
}

// ---- tree ----
const TREE = { node: [1.8, 0.6] as Pt, down: [2.1, 1.1] as Pt, right: [2.4, 0.8] as Pt };
type TreeNode = { id: string; label: string; icon?: string; parent?: string };
// Tidy tree: leaves get consecutive slots, a parent sits centered over its children.
export function treeLayout(el: { nodes: TreeNode[]; dir?: "down" | "right" }): Layout {
  const ids = new Set(el.nodes.map((n) => n.id));
  const slot: Record<string, Pt> = {};
  let leaf = 0;
  const place = (id: string, depth: number): number => {
    slot[id] = [0, depth]; // marks it placed, so a loop of parents cannot recurse forever
    const kids = el.nodes.filter((n) => n.parent === id && !(n.id in slot)).map((n) => place(n.id, depth + 1));
    return (slot[id][0] = kids.length ? (kids[0] + kids.at(-1)!) / 2 : leaf++);
  };
  for (const n of el.nodes) if (!n.parent || !ids.has(n.parent)) place(n.id, 0);
  const down = el.dir !== "right";
  const [sx, sy] = down ? TREE.down : flipPt(TREE.right);
  const nodes: Record<string, Rect> = {};
  for (const [id, [s, d]] of Object.entries(slot)) nodes[id] = down ? { x: s * sx, y: d * sy, w: TREE.node[0], h: TREE.node[1] } : flip({ x: s * sx, y: d * sy, w: TREE.node[1], h: TREE.node[0] });
  // elbow from the parent's bottom (or right) to the child's top (or left), named by the child
  const links: Record<string, Pt[]> = {};
  for (const n of el.nodes) {
    if (!n.parent || !nodes[n.parent] || !nodes[n.id] || n.parent === n.id) continue;
    const [a, b] = down ? [nodes[n.parent], nodes[n.id]] : [flip(nodes[n.parent]), flip(nodes[n.id])];
    const [y0, y1] = [a.y + a.h / 2, b.y - b.h / 2];
    const m = (y0 + y1) / 2;
    const pts = dedupe([[a.x, y0], [a.x, m], [b.x, m], [b.x, y1]]);
    links[n.id] = down ? pts : pts.map(flipPt);
  }
  return finish(nodes, links);
}

// ---- graph, states, flow ----
const GRAPH_NODE: Pt = [2, 0.7];
type GraphEl = { nodes: { id: string }[]; edges: Link[]; layout?: "layered" | "circle" };
export const graphLayout = (el: GraphEl) => el.layout === "circle"
  ? ring(el.nodes.map((n) => n.id), el.edges, GRAPH_NODE)
  : layered(el.nodes.map((n) => n.id), el.edges, false, GRAPH_NODE, [1.1, 0.45]);
export const statesLayout = (el: { states: { id: string }[]; transitions: Link[] }) => ring(el.states.map((s) => s.id), el.transitions, [1.7, 0.65]);
type Step = { id: string; kind?: "start" | "step" | "decision" | "end" };
export const flowLayout = (el: { steps: Step[]; links: Link[] }) =>
  layered(el.steps.map((s) => s.id), el.links, true, [2.3, 0.7], [0.65, 0.5], el.steps.filter((s) => s.kind === "decision").map((s) => s.id));

// ---- layers ----
export const LAYER = { w: 4.4, h: 0.62, step: 0.76, lane: 1.65 } as const;
// Bars top to bottom; a packet descends on the left lane (down-<id>) and climbs on the right (up-<id>), named by the layer it leaves.
export function layersLayout(el: { layers: { id: string }[] }): Layout {
  const rects = colRects(el.layers.length, LAYER.step, LAYER.w, LAYER.h);
  const ids = el.layers.map((l) => l.id);
  const links: Record<string, Pt[]> = {};
  ids.forEach((id, i) => {
    if (i < ids.length - 1) links[`down-${id}`] = [[-LAYER.lane, rects[i].y], [-LAYER.lane, rects[i + 1].y]];
    if (i > 0) links[`up-${id}`] = [[LAYER.lane, rects[i].y], [LAYER.lane, rects[i - 1].y]];
  });
  return { nodes: Object.fromEntries(ids.map((id, i) => [id, rects[i]])), links, labels: {}, size: [LAYER.w, ids.length * LAYER.step - (LAYER.step - LAYER.h)] };
}

// ---- files ----
export const FILE = { row: 0.42, indent: 0.36, char: 0.145 } as const;
export type FileRow = { key: string; name: string; depth: number; folder: boolean; entry?: string; y: number };
// Every entry plus the folders above it, in tree order: a folder's new children go after its last descendant.
export function fileRows(entries: { id: string; path: string }[]): { rows: FileRow[]; size: [number, number]; parts: Record<string, Rect> } {
  const rows: FileRow[] = [];
  for (const e of entries) {
    const segs = e.path.split("/").filter(Boolean);
    segs.forEach((name, d) => {
      const folder = d < segs.length - 1 || e.path.endsWith("/");
      const key = segs.slice(0, d + 1).join("/") + (folder ? "/" : "");
      let row = rows.find((r) => r.key === key);
      if (!row) {
        const parent = segs.slice(0, d).join("/") + "/";
        const last = d ? rows.findLastIndex((r) => r.key.startsWith(parent)) : -1;
        rows.splice(last < 0 ? rows.length : last + 1, 0, (row = { key, name, depth: d, folder, y: 0 }));
      }
      if (d === segs.length - 1) row.entry = e.id;
    });
  }
  rows.forEach((r, i) => (r.y = r2((i - (rows.length - 1) / 2) * FILE.row)));
  const w = r2(Math.max(...rows.map((r) => r.depth * FILE.indent + 0.45 + (r.name.length + (r.folder ? 1 : 0)) * FILE.char)) + 0.5);
  const parts = Object.fromEntries(rows.filter((r) => r.entry).map((r) => [r.entry!, { x: 0, y: r.y, w: w - 0.2, h: FILE.row - 0.02 }]));
  return { rows, size: [w, r2(rows.length * FILE.row + 0.3)], parts };
}
const EXT: [RegExp, string][] = [
  [/\.(ts|tsx|js|jsx|mjs|py|go|rs|java|kt|rb|c|cc|cpp|h|cs|swift|php|vue|svelte)$/, "file-code"],
  [/\.json$/, "file-braces"], [/\.(ya?ml|toml|ini|env|conf|cfg)$|(^|\/)\.env/, "file-cog"],
  [/\.(md|mdx|txt|rst)$/, "file-text"], [/\.(png|jpe?g|gif|svg|webp)$/, "file-image"],
  [/\.(sql|db|sqlite)$/, "file-database"], [/\.(sh|bash|ps1)$/, "file-terminal"], [/\.lock$|lock\.json$/, "file-lock"],
];
export const fileIcon = (r: { name: string; folder: boolean }) => (r.folder ? "folder-open" : EXT.find(([re]) => re.test(r.name))?.[1] ?? "file");

// ---- commits ----
export const COMMIT = { dot: 0.34, step: 0.9, lane: 1.1 } as const;
type CommitsEl = { branches: { id: string; label: string }[]; commits: { id: string; branch: string; label?: string; parents?: string[] }[]; head?: string };
// Parents as written, or else the previous commit on the same branch.
export const parentsOf = (el: CommitsEl, i: number) =>
  el.commits[i].parents ?? el.commits.slice(0, i).filter((c) => c.branch === el.commits[i].branch).slice(-1).map((c) => c.id);
// The commit HEAD points at: a commit id, or a branch's newest commit.
export const headCommit = (el: CommitsEl) => el.commits.some((c) => c.id === el.head) ? el.head : el.commits.filter((c) => c.branch === el.head).at(-1)?.id;
// One lane per branch, time to the right. A branch's first commit leaves its parent's lane at once, a merge joins late;
// the steep part sits between columns so it never crosses a commit's label.
export function commitLayout(el: CommitsEl): Layout {
  const col = Math.max(...el.branches.map((b) => b.label.length)) * CHAR + 0.5;
  const lane = (b: string) => Math.max(0, el.branches.findIndex((x) => x.id === b)) * COMMIT.lane;
  const nodes: Record<string, Rect> = Object.fromEntries(el.commits.map((c, i) => [c.id, { x: col + i * COMMIT.step, y: lane(c.branch), w: COMMIT.dot, h: COMMIT.dot }]));
  const links: Record<string, Pt[]> = {};
  el.commits.forEach((c, i) => parentsOf(el, i).forEach((p, k) => {
    const [a, b] = [nodes[p], nodes[c.id]];
    if (!a) return;
    const first = !el.commits.slice(0, i).some((x) => x.branch === c.branch);
    const x0 = first ? a.x + 0.35 : b.x - 0.55;
    links[k ? `${c.id}-2` : c.id] = a.y === b.y ? [[a.x, a.y], [b.x, b.y]] : dedupe([[a.x, a.y], [x0, a.y], [x0 + 0.2, b.y], [b.x, b.y]]);
  }));
  const labels = Object.fromEntries(el.branches.map((b) => [`branch:${b.id}`, [(col - 0.4) / 2, lane(b.id)] as Pt]));
  const texts = Object.fromEntries(el.branches.map((b) => [`branch:${b.id}`, b.label]));
  // room for each commit's label below its dot and the HEAD tag above it
  const extra = el.commits.flatMap((c) => [{ x: nodes[c.id].x, y: nodes[c.id].y + 0.38, w: Math.max(0.6, (c.label ?? "").length * 0.12), h: 0.26 },
    { x: nodes[c.id].x, y: nodes[c.id].y - 0.42, w: 0.8, h: 0.28 }]);
  return finish(nodes, links, labels, texts, extra);
}

// ---- shared checks and lint ----
// "<what> points at '<ref>', which is not one of its <kind>: a, b, c"
const known = (kind: string, ids: string[], refs: [string, string | undefined][]) =>
  refs.filter(([, r]) => r !== undefined && !ids.includes(r)).map(([what, r]) => `${what} points at '${r}', which is not one of its ${kind}: ${list(ids)}`);
const linkRefs = (what: string, links: Link[]) => links.flatMap((l): [string, string][] => [[`${what} '${l.id}'`, l.from], [`${what} '${l.id}'`, l.to]]);
// Characters that fit on a node `w` wide at label size 0.26 (about 0.13 units each), less the icon.
const room = (w: number, icon?: string) => Math.floor((w - 0.3 - (icon ? 0.42 : 0)) / 0.13);
const fits = (what: string, items: { label?: string; icon?: string }[], w: number) =>
  items.filter((n) => n.label && n.label.length > room(w, n.icon)).map((n) => `${what} label '${n.label}' is too long for its box; keep it to ${room(w, n.icon)} characters`);
const tooWide = (size: Pt) => (size[0] > 14 || size[1] > 8 ? [`it is ${size[0]} x ${size[1]} units, too big for the canvas with room to spare; show fewer items`] : []);

const Highlight = (n: number) => z.array(PartId).max(n).optional().describe("ids of the items that glow, e.g. the one that changed");
const LinkOf = (what: string) => z.strictObject({
  id: PartId.describe(`${what} id; traceable as element.${what}`),
  from: PartId.describe("node id it leaves"),
  to: PartId.describe("node id it enters"),
});

export const graphs = [
  defineComponent({
    type: "tree", family: "graphs", summary: "a hierarchy: DOM, B-tree, org chart, call tree",
    fields: {
      nodes: z.array(z.strictObject({
        id: PartId, label: Label.describe("short node name, ~9 characters"), icon: Icon.optional(),
        parent: PartId.optional().describe("parent node id; leave out on the one root"),
      })).min(1).max(15).describe("every node, each pointing at its parent; parts are node ids, edges are named by the child"),
      dir: z.enum(["down", "right"]).optional().describe("down (default) or right"),
      highlight: Highlight(15),
    },
    state: ["nodes", "highlight"],
    size: (el) => treeLayout(el).size,
    parts: (el) => treeLayout(el).nodes,
    edges: (el) => treeLayout(el).links,
    check: (el) => {
      const ids = el.nodes.map((n) => n.id);
      const roots = el.nodes.filter((n) => !n.parent).map((n) => n.id);
      const placed = treeLayout(el).nodes;
      return [
        ...uniqueIds("node", ids),
        ...(roots.length === 1 ? [] : [`a tree has exactly one root (a node without parent); this one has ${roots.length}${roots.length ? `: ${list(roots)}` : ""}`]),
        ...known("nodes", ids, el.nodes.map((n): [string, string | undefined] => [`parent of '${n.id}'`, n.parent])),
        ...(roots.length === 1 ? ids.filter((id) => !(id in placed)).map((id) => `node '${id}' is not under the root; its parents form a loop`) : []),
        ...known("nodes", ids, (el.highlight ?? []).map((h): [string, string] => ["highlight", h])),
      ];
    },
    lint: (el) => [...fits("node", el.nodes, TREE.node[0]), ...tooWide(treeLayout(el).size)],
    example: {
      add: { nodes: [
        { id: "body", label: "<body>" }, { id: "nav", label: "<nav>", parent: "body" }, { id: "main", label: "<main>", parent: "body" },
        { id: "cart", label: "<ul.cart>", parent: "main" }, { id: "pay", label: "<button>", parent: "main" }, { id: "footer", label: "<footer>", parent: "body" },
      ] },
      set: { nodes: [
        { id: "body", label: "<body>" }, { id: "nav", label: "<nav>", parent: "body" }, { id: "main", label: "<main>", parent: "body" },
        { id: "cart", label: "<ul.cart>", parent: "main" }, { id: "pay", label: "<button>", parent: "main" }, { id: "footer", label: "<footer>", parent: "body" },
        { id: "toast", label: "<div.toast>", parent: "body" },
      ], highlight: ["toast"] },
    },
  }),
  defineComponent({
    type: "graph", family: "graphs", summary: "nodes and links: service dependencies, a DAG, a network",
    fields: {
      nodes: z.array(z.strictObject({ id: PartId, label: Label.describe("short node name, ~8 characters"), icon: Icon.optional() }))
        .min(1).max(10).describe("parts are node ids"),
      edges: z.array(LinkOf("edge").extend({
        label: Label.optional().describe("what flows, one or two words"),
        color: Color.optional().describe("bad = failing link (dashed), good = healthy, muted default"),
      })).max(16).describe("directed links; traceable by edge id"),
      layout: z.enum(["layered", "circle"]).optional().describe("layered (default): sources left, dependencies right; circle: a ring, for peers"),
      highlight: Highlight(10),
    },
    state: ["highlight", "edges"],
    size: (el) => graphLayout(el).size,
    parts: (el) => graphLayout(el).nodes,
    edges: (el) => graphLayout(el).links,
    check: (el) => {
      const ids = el.nodes.map((n) => n.id);
      return [...uniqueIds("node", ids), ...uniqueIds("edge", el.edges.map((e) => e.id)),
        ...known("nodes", ids, linkRefs("edge", el.edges)), ...known("nodes", ids, (el.highlight ?? []).map((h): [string, string] => ["highlight", h]))];
    },
    lint: (el) => [...fits("node", el.nodes, GRAPH_NODE[0]), ...tooWide(graphLayout(el).size)],
    example: {
      add: {
        nodes: [{ id: "web", label: "Web app", icon: "globe" }, { id: "api", label: "API", icon: "server" }, { id: "auth", label: "Auth", icon: "key" },
          { id: "orders", label: "Orders", icon: "package" }, { id: "db", label: "Postgres", icon: "database" }, { id: "kafka", label: "Kafka", icon: "send" }],
        edges: [{ id: "web-api", from: "web", to: "api", label: "HTTPS" }, { id: "api-auth", from: "api", to: "auth" }, { id: "api-orders", from: "api", to: "orders" },
          { id: "orders-db", from: "orders", to: "db", label: "SQL" }, { id: "orders-kafka", from: "orders", to: "kafka", label: "events" }],
      },
      set: {
        highlight: ["orders"],
        edges: [{ id: "web-api", from: "web", to: "api", label: "HTTPS" }, { id: "api-auth", from: "api", to: "auth" }, { id: "api-orders", from: "api", to: "orders" },
          { id: "orders-db", from: "orders", to: "db", label: "timeout", color: "bad" }, { id: "orders-kafka", from: "orders", to: "kafka", label: "events" }],
      },
    },
  }),
  defineComponent({
    type: "states", family: "graphs", summary: "a state machine or lifecycle; the current state glows",
    fields: {
      states: z.array(z.strictObject({ id: PartId, label: Label.describe("state name, ~8 characters") })).min(1).max(7).describe("parts are state ids"),
      transitions: z.array(LinkOf("transition").extend({ label: Label.describe("the event that moves it, one or two words") }))
        .max(14).describe("from = to is a self-loop; traceable by transition id"),
      current: PartId.optional().describe("the state it is in now; set it to move the glow"),
    },
    state: ["current"],
    size: (el) => statesLayout(el).size,
    parts: (el) => statesLayout(el).nodes,
    edges: (el) => statesLayout(el).links,
    check: (el) => {
      const ids = el.states.map((s) => s.id);
      return [...uniqueIds("state", ids), ...uniqueIds("transition", el.transitions.map((t) => t.id)),
        ...known("states", ids, [...linkRefs("transition", el.transitions), ["current", el.current]])];
    },
    lint: (el) => fits("state", el.states, 1.7),
    example: {
      add: {
        states: [{ id: "placed", label: "Placed" }, { id: "paid", label: "Paid" }, { id: "shipped", label: "Shipped" },
          { id: "delivered", label: "Delivered" }, { id: "cancelled", label: "Cancelled" }],
        transitions: [{ id: "pay", from: "placed", to: "paid", label: "pay" }, { id: "ship", from: "paid", to: "shipped", label: "ship" },
          { id: "deliver", from: "shipped", to: "delivered", label: "deliver" }, { id: "cancel", from: "placed", to: "cancelled", label: "cancel" },
          { id: "refund", from: "paid", to: "cancelled", label: "refund" }, { id: "declined", from: "placed", to: "placed", label: "card declined" }],
        current: "placed",
      },
      set: { current: "paid" },
    },
  }),
  defineComponent({
    type: "flow", family: "graphs", summary: "a flowchart: decision logic or an algorithm, the active step lit",
    fields: {
      steps: z.array(z.strictObject({
        id: PartId, label: Label.describe("short step, ~12 characters; a decision is a question"),
        kind: z.enum(["start", "step", "decision", "end"]).optional().describe("start and end are pills, decision a diamond; default step"),
      })).min(1).max(10).describe("top to bottom in reading order; parts are step ids"),
      links: z.array(LinkOf("link").extend({ label: Label.optional().describe("yes / no out of a decision") }))
        .max(14).describe("a link back up (a retry loop) goes around the right side; traceable by link id"),
      active: PartId.optional().describe("the step running now; set it to move the light"),
    },
    state: ["active"],
    size: (el) => flowLayout(el).size,
    parts: (el) => flowLayout(el).nodes,
    edges: (el) => flowLayout(el).links,
    check: (el) => {
      const ids = el.steps.map((s) => s.id);
      return [...uniqueIds("step", ids), ...uniqueIds("link", el.links.map((l) => l.id)),
        ...known("steps", ids, [...linkRefs("link", el.links), ["active", el.active]])];
    },
    lint: (el) => [
      ...fits("step", el.steps.filter((s) => s.kind !== "decision"), 2.3), ...fits("decision", el.steps.filter((s) => s.kind === "decision"), 1.7),
      ...el.steps.filter((s) => s.kind === "decision" && el.links.filter((l) => l.from === s.id).length < 2)
        .map((s) => `decision '${s.id}' has fewer than two ways out; give it a yes and a no link`),
      ...tooWide(flowLayout(el).size),
    ],
    example: {
      add: {
        steps: [{ id: "order", label: "Order 1042", kind: "start" }, { id: "stock", label: "In stock?", kind: "decision" },
          { id: "charge", label: "Charge card" }, { id: "backorder", label: "Backorder", kind: "end" },
          { id: "paid", label: "Paid?", kind: "decision" }, { id: "ship", label: "Ship it", kind: "end" }],
        links: [{ id: "check", from: "order", to: "stock" }, { id: "in-stock", from: "stock", to: "charge", label: "yes" },
          { id: "no-stock", from: "stock", to: "backorder", label: "no" }, { id: "charged", from: "charge", to: "paid" },
          { id: "retry", from: "paid", to: "charge", label: "no, retry" }, { id: "send", from: "paid", to: "ship", label: "yes" }],
        active: "stock",
      },
      set: { active: "paid" },
    },
  }),
  defineComponent({
    type: "layers", family: "graphs", summary: "a stack of layers: OSI, middleware, abstraction levels",
    fields: {
      layers: z.array(z.strictObject({ id: PartId, label: Label.describe("layer name, a few words"), icon: Icon.optional() }))
        .min(1).max(7).describe("top to bottom; parts are layer ids, edges down-<id> (to the layer below) and up-<id> (to the layer above)"),
      highlight: Highlight(7),
    },
    state: ["highlight"],
    size: (el) => layersLayout(el).size,
    parts: (el) => layersLayout(el).nodes,
    edges: (el) => layersLayout(el).links,
    check: (el) => {
      const ids = el.layers.map((l) => l.id);
      return [...uniqueIds("layer", ids), ...known("layers", ids, (el.highlight ?? []).map((h): [string, string] => ["highlight", h]))];
    },
    lint: (el) => fits("layer", el.layers, 2 * LAYER.lane - 0.3),
    example: {
      add: { layers: [{ id: "app", label: "Checkout app", icon: "shopping-cart" }, { id: "http", label: "HTTP", icon: "globe" },
        { id: "tls", label: "TLS", icon: "lock" }, { id: "tcp", label: "TCP", icon: "repeat" }, { id: "ip", label: "IP", icon: "network" }] },
      set: { highlight: ["tls"] },
    },
  }),
  defineComponent({
    type: "files", family: "graphs", summary: "where code lives: a file tree with folder and file icons",
    fields: {
      entries: z.array(z.strictObject({
        id: PartId,
        path: z.string().max(60).regex(/^[^/\s]+(\/[^/\s]+)*\/?$/, "a relative path like src/orders/tax.ts; a folder ends with /")
          .describe("relative path; parent folders are drawn for you, a folder ends with /"),
      })).min(1).max(12).describe("the files that matter; parts are entry ids"),
      highlight: Highlight(12),
    },
    state: ["entries", "highlight"],
    size: (el) => fileRows(el.entries).size,
    parts: (el) => fileRows(el.entries).parts,
    check: (el) => {
      const ids = el.entries.map((e) => e.id);
      const paths = el.entries.map((e) => e.path);
      return [...uniqueIds("entry", ids), ...paths.filter((p, i) => paths.indexOf(p) !== i).map((p) => `path '${p}' listed twice`),
        ...known("entries", ids, (el.highlight ?? []).map((h): [string, string] => ["highlight", h]))];
    },
    lint: (el) => { const n = fileRows(el.entries).rows.length; return n > 12 ? [`${n} rows with their folders; show the files that matter, 12 rows at most`] : []; },
    example: {
      add: { entries: [{ id: "checkout", path: "src/orders/checkout.ts" }, { id: "tax", path: "src/orders/tax.ts" },
        { id: "schema", path: "src/db/schema.sql" }, { id: "test", path: "test/checkout.test.ts" }, { id: "pkg", path: "package.json" }] },
      set: { entries: [{ id: "checkout", path: "src/orders/checkout.ts" }, { id: "tax", path: "src/orders/tax.ts" }, { id: "refund", path: "src/orders/refund.ts" },
        { id: "schema", path: "src/db/schema.sql" }, { id: "test", path: "test/checkout.test.ts" }, { id: "pkg", path: "package.json" }], highlight: ["refund"] },
    },
  }),
  defineComponent({
    type: "commits", family: "graphs", summary: "git history: branches, commits, merges and HEAD",
    fields: {
      branches: z.array(z.strictObject({ id: PartId, label: Label.describe("branch name, e.g. main, fix/tax") })).min(1).max(4).describe("one lane each, top to bottom"),
      commits: z.array(z.strictObject({
        id: PartId, branch: PartId.describe("branch id: the lane it sits on"),
        label: Label.optional().describe("short sha or tag, ~7 characters"),
        parents: z.array(PartId).min(1).max(2).optional().describe("earlier commit ids; two for a merge; default the previous commit on its branch"),
      })).min(1).max(12).describe("oldest first; parts are commit ids, edges are named by the child (<child>-2 for a merge's second parent)"),
      head: PartId.optional().describe("commit or branch id HEAD points at"),
    },
    state: ["commits", "head"],
    size: (el) => commitLayout(el).size,
    parts: (el) => commitLayout(el).nodes,
    edges: (el) => commitLayout(el).links,
    check: (el) => {
      const ids = el.commits.map((c) => c.id);
      const branches = el.branches.map((b) => b.id);
      return [
        ...uniqueIds("branch", branches), ...uniqueIds("commit", ids),
        ...known("branches", branches, el.commits.map((c): [string, string] => [`commit '${c.id}'`, c.branch])),
        ...el.commits.flatMap((c, i) => (c.parents ?? []).filter((p) => !ids.slice(0, i).includes(p))
          .map((p) => `parent '${p}' of commit '${c.id}' must be a commit listed before it`)),
        ...(el.head === undefined || ids.includes(el.head) || branches.includes(el.head) ? [] : [`head points at '${el.head}', which is neither a commit nor a branch`]),
      ];
    },
    lint: (el) => el.commits.filter((c) => (c.label ?? "").length > 7).map((c) => `commit label '${c.label}' is wider than the gap between commits; keep it to 7 characters`),
    example: {
      add: {
        branches: [{ id: "main", label: "main" }, { id: "fix", label: "fix/tax" }],
        commits: [{ id: "a1", branch: "main", label: "a1f3" }, { id: "b2", branch: "main", label: "b2c4" }, { id: "c3", branch: "fix", label: "c3d9", parents: ["b2"] },
          { id: "d4", branch: "main", label: "d4e1" }, { id: "e5", branch: "fix", label: "e5f0" }],
        head: "fix",
      },
      set: {
        commits: [{ id: "a1", branch: "main", label: "a1f3" }, { id: "b2", branch: "main", label: "b2c4" }, { id: "c3", branch: "fix", label: "c3d9", parents: ["b2"] },
          { id: "d4", branch: "main", label: "d4e1" }, { id: "e5", branch: "fix", label: "e5f0" }, { id: "f6", branch: "main", label: "f6a2", parents: ["d4", "e5"] }],
        head: "main",
      },
    },
  }),
] as const;
