import { z } from "zod";
import { CAPTION, Highlight } from "./core.ts";
import { Color, defineComponent, GRID, Icon, Label, PartId, Pos, uniqueIds, type Pt, type Rect } from "./registry.ts";

// Text widths are estimates: about 0.55 em per character.
const fits = (what: string, text: string, max: number, where: string) =>
  text.length > max ? [`${what} is ${text.length} characters; ${where} fits ${max}`] : [];
const known = (ids: string[]) => ids.join(", ");
// boundary keys label the bar left to right; a repeat is an empty range or a wrap the bar cannot show
const dupKeys = (keys: string[]) => [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))]
  .map((k) => `boundary key '${k}' appears twice; keys run left to right, so each range needs its own from and to`);
const textW = (s: string | undefined, em = 0.26) => (s ? s.length * em * 0.55 : 0);

// store: the body of each shape, grid units (caption below).
export const STORE_BODY = { cylinder: [1.6, 1.9], bucket: [1.8, 1.8], disk: [2.6, 1.2] } as const;

// cluster: nodes on a ring, label under each node, caption under the ring. cy = ring center from the element center.
export const NODE_R = 0.4;
export function clusterLayout(n: number) {
  const R = n <= 1 ? 0 : n <= 3 ? 1 : n <= 5 ? 1.3 : 1.6; // 6-7 nodes: neighbours' labels need the room
  const ring = (i: number): Pt => [R * Math.sin((2 * Math.PI * i) / n), -R * Math.cos((2 * Math.PI * i) / n)];
  const low = Math.max(...Array.from({ length: n }, (_, i) => ring(i)[1])); // a triangle's bottom sits above the ring's
  const [w, h] = [2 * (R + NODE_R) + 0.8, R + low + 2 * NODE_R + 0.6 + CAPTION];
  const cy = -h / 2 + 0.1 + R + NODE_R;
  const at = (i: number): Pt => [ring(i)[0], cy + ring(i)[1]];
  return { w, h, at };
}

// shards: equal segments along a keyspace bar, boundary keys above it.
export const OWNER_CHARS = (seg: number) => Math.floor((seg - 0.12) / (0.22 * 0.55));
export function shardsLayout(n: number) {
  const seg = n <= 4 ? 1.5 : 7.2 / n;
  const [w, h] = [n * seg + 0.6, 0.4 + 0.65 + CAPTION];
  const barY = -h / 2 + 0.4 + 0.325;
  return { seg, w, h, barY, x: (i: number) => (i - (n - 1) / 2) * seg };
}

// memory: an address-space column, region height by relative size (a floor keeps every label readable).
export const MEM = { colW: 2, colH: 3.6, ptrW: 2.2, minH: 0.4, ptrGap: 0.3 } as const;
export function memoryLayout(el: { regions: { id: string; size: number }[]; pointers?: unknown[] }) {
  const ptrW = el.pointers ? MEM.ptrW : 0;
  const total = el.regions.reduce((s, r) => s + r.size, 0);
  const spare = MEM.colH - el.regions.length * MEM.minH;
  const cx = ptrW / 2;
  let top = -(MEM.colH + CAPTION) / 2;
  const rects: Record<string, Rect> = {};
  for (const r of el.regions) {
    const h = MEM.minH + (spare * r.size) / total;
    rects[r.id] = { x: cx, y: top + h / 2, w: MEM.colW, h };
    top += h;
  }
  return { w: MEM.colW + ptrW, h: MEM.colH + CAPTION, cx, rects };
}

// barrier: the label sits beside the middle, on the right (or below a level line), clear of the icon.
export function barrierLabel(el: { from: Pt; to: Pt }) {
  const [a, b] = [el.from, el.to];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [dx, dy] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  let [nx, ny] = [dy, -dx];
  if (nx < -0.01 || (Math.abs(nx) < 0.01 && ny < 0)) [nx, ny] = [-nx, -ny];
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  return { len, dx, dy, nx, ny, mid, at: [mid[0] + nx * 0.55, mid[1] + ny * 0.55] as Pt, anchor: Math.abs(nx) < 0.5 ? "middle" as const : "start" as const };
}

// device: frame size per kind; where the lines start (from the top-left), how many characters fit, the button.
export const DEVICE = {
  phone: { size: [2.4, 3.8], top: 1, left: 0.3, line: 13, title: 12, button: 12, btn: { x: 0, y: 1.35, w: 1.8, h: 0.5 } },
  laptop: { size: [4.4, 3.2], top: 0.75, left: 0.55, line: 25, title: 22, button: 10, btn: { x: 0.9, y: 0.9, w: 1.6, h: 0.5 } },
  browser: { size: [4.4, 3.2], top: 0.8, left: 0.35, line: 28, title: 16, button: 10, btn: { x: 1.1, y: 1.15, w: 1.6, h: 0.5 } },
} as const;

const Node = z.strictObject({
  id: PartId.max(16),
  label: Label.max(10).optional().describe("short name under the node, default its id"),
  role: z.enum(["leader", "follower"]).describe("the leader wears a crown; followers replicate from it"),
  state: z.enum(["up", "down", "lagging"]).describe("down = bad and dashed, lagging = muted with a clock"),
});
const Range = z.strictObject({
  id: PartId.max(16),
  from: z.string().max(6).describe("first key of the range, shown at its left boundary"),
  to: z.string().max(6).describe("end key, shown at its right boundary; the next range starts here"),
  owner: Label.max(10).optional().describe("node or partition that holds it, shown inside the segment"),
});
const Region = z.strictObject({
  id: PartId.max(16),
  label: Label.max(14).describe("fits inside the column"),
  size: z.number().positive().max(1e6).describe("relative size: heights are proportional"),
  color: Color.optional().describe("e.g. muted for free space, bad for garbage"),
});
const Pointer = z.strictObject({
  label: Label.max(12).describe("the variable or reference, e.g. 'order 1042'"),
  to: PartId.describe("region id it points into"),
});

export const infra = [
  defineComponent({
    type: "store", family: "infra", summary: "where data rests: a database, a disk or an object bucket, with how full it is",
    fields: {
      shape: z.enum(["cylinder", "disk", "bucket"]).describe("cylinder = database, disk = local drive, bucket = object storage"),
      label: Label.max(24).describe("caption under it"),
      icon: Icon.optional().describe("lucide icon inside the shape"),
      fill: z.number().min(0).max(1).optional().describe("how full, 0..1; shown as a level and a percentage"),
    },
    state: ["fill"],
    size: (el) => [Math.max(STORE_BODY[el.shape][0], textW(el.label)), STORE_BODY[el.shape][1] + CAPTION],
    example: { add: { shape: "cylinder", label: "orders DB", icon: "database", fill: 0.35 }, set: { fill: 0.8 } },
  }),
  defineComponent({
    type: "cluster", family: "infra", summary: "replicas of one service: who leads, who is down or behind (replication, failover)",
    fields: {
      nodes: z.array(Node).min(1).max(7),
      label: Label.max(24).describe("caption under the ring"),
    },
    state: ["nodes"],
    size: (el) => { const l = clusterLayout(el.nodes.length); return [Math.max(l.w, textW(el.label) + 1.2), l.h]; },
    parts: (el) => { const l = clusterLayout(el.nodes.length); return Object.fromEntries(el.nodes.map((n, i) => [n.id, { x: l.at(i)[0], y: l.at(i)[1], w: 2 * NODE_R, h: 2 * NODE_R }])); },
    // leader -> follower, circle edge to circle edge: a trace on "db.n2" shows one write replicating
    edges: (el) => {
      const l = clusterLayout(el.nodes.length);
      const lead = el.nodes.findIndex((n) => n.role === "leader");
      if (lead < 0) return {};
      const a = l.at(lead);
      return Object.fromEntries(el.nodes.flatMap((n, i) => {
        if (i === lead) return [];
        const b = l.at(i);
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const [ux, uy] = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
        const k = NODE_R + 0.06;
        return [[n.id, [[a[0] + ux * k, a[1] + uy * k], [b[0] - ux * k, b[1] - uy * k]] as Pt[]]];
      }));
    },
    check: (el) => {
      const leaders = el.nodes.filter((n) => n.role === "leader").map((n) => n.id);
      return [...uniqueIds("node", el.nodes.map((n) => n.id)),
        ...(leaders.length > 1 ? [`cluster has ${leaders.length} leaders (${known(leaders)}); one node leads at a time`] : []),
        ...el.nodes.filter((n) => n.label === undefined && n.id.length > 10)
          .map((n) => `node '${n.id}' shows its id as its name, ${n.id.length} characters; give it a label of up to 10`)];
    },
    lint: (el) => (el.nodes.length > 5 ? [`cluster of ${el.nodes.length} nodes; 3 or 5 show a quorum and read faster`] : []),
    example: {
      add: { label: "orders DB", nodes: [
        { id: "n1", label: "db-1", role: "leader", state: "up" },
        { id: "n2", label: "db-2", role: "follower", state: "up" },
        { id: "n3", label: "db-3", role: "follower", state: "lagging" }] },
      set: { nodes: [
        { id: "n1", label: "db-1", role: "follower", state: "down" },
        { id: "n2", label: "db-2", role: "leader", state: "up" },
        { id: "n3", label: "db-3", role: "follower", state: "up" }] },
    },
  }),
  defineComponent({
    type: "shards", family: "infra", summary: "a keyspace split into ranges, each owned by a node (partitioning, sharding)",
    fields: {
      ranges: z.array(Range).min(1).max(8).describe("left to right; each starts where the previous one ends"),
      label: Label.max(30).describe("caption under the bar, e.g. 'users by key'"),
      highlight: Highlight.describe("0-based ranges to make glow, e.g. the one that moved"),
    },
    state: ["ranges", "highlight"],
    size: (el) => { const l = shardsLayout(el.ranges.length); return [Math.max(l.w, textW(el.label)), l.h]; },
    parts: (el) => { const l = shardsLayout(el.ranges.length); return Object.fromEntries(el.ranges.map((r, i) => [r.id, { x: l.x(i), y: l.barY, w: l.seg * 0.95, h: 0.65 }])); },
    check: (el) => { const fit = OWNER_CHARS(shardsLayout(el.ranges.length).seg); return [
      ...uniqueIds("range", el.ranges.map((r) => r.id)),
      ...el.ranges.slice(1).flatMap((r, i) => r.from === el.ranges[i].to ? []
        : [`range '${r.id}' starts at '${r.from}' but '${el.ranges[i].id}' ends at '${el.ranges[i].to}'; ranges must be contiguous`]),
      ...(el.highlight?.some((i) => i >= el.ranges.length) ? [`highlight index out of range; shards has ${el.ranges.length} ranges`] : []),
      ...dupKeys([el.ranges[0].from, ...el.ranges.map((r) => r.to)]),
      ...el.ranges.filter((r) => (r.owner ?? "").length > fit)
        .map((r) => `owner '${r.owner}' of range '${r.id}' is ${r.owner!.length} characters; with ${el.ranges.length} ranges a segment fits ${fit}`),
    ]; },
    example: {
      add: { label: "users by key", ranges: [
        { id: "r1", from: "a", to: "h", owner: "node-1" },
        { id: "r2", from: "h", to: "p", owner: "node-2" },
        { id: "r3", from: "p", to: "z", owner: "node-3" }] },
      set: { ranges: [
        { id: "r1", from: "a", to: "h", owner: "node-1" },
        { id: "r2", from: "h", to: "l", owner: "node-2" },
        { id: "r4", from: "l", to: "p", owner: "node-4" },
        { id: "r3", from: "p", to: "z", owner: "node-3" }], highlight: [2] },
    },
  }),
  defineComponent({
    type: "memory", family: "infra", summary: "an address space: stack, heap, buffers as regions, and what points into them",
    fields: {
      regions: z.array(Region).min(1).max(6).describe("top (high addresses) to bottom"),
      pointers: z.array(Pointer).max(4).optional().describe("references drawn from the left into a region; give [] to keep room for later ones"),
      label: Label.max(24).optional().describe("caption under the column"),
    },
    state: ["regions", "pointers"],
    // the caption is centered under the column, which sits right of center when there are pointers
    size: (el) => { const l = memoryLayout(el); return [Math.max(l.w, 2 * l.cx + textW(el.label)), l.h]; },
    parts: (el) => memoryLayout(el).rects,
    check: (el) => {
      const ids = el.regions.map((r) => r.id);
      const ptrs = el.pointers ?? [];
      const rects = memoryLayout(el).rects;
      const crowded = el.regions.filter((r) => {
        const n = ptrs.filter((p) => p.to === r.id).length;
        return n > 1 && rects[r.id].h / n < MEM.ptrGap;
      });
      return [...uniqueIds("region", ids),
        ...[...new Set(ptrs.filter((p, i) => ptrs.findIndex((q) => q.label === p.label) !== i).map((p) => p.label))]
          .map((l) => `pointer label '${l}' used twice; each pointer needs its own name`),
        ...ptrs.filter((p) => !ids.includes(p.to)).map((p) => `pointer '${p.label}' points at '${p.to}', which is not a region: ${known(ids)}`),
        ...crowded.map((r) => `region '${r.id}' is too short for ${ptrs.filter((p) => p.to === r.id).length} pointer labels; give it a larger size`)];
    },
    example: {
      add: { label: "process memory", regions: [
        { id: "stack", label: "stack", size: 1 },
        { id: "free", label: "free", size: 3, color: "muted" },
        { id: "heap", label: "heap", size: 2 }],
        pointers: [{ label: "order 1042", to: "heap" }] },
      set: { regions: [
        { id: "stack", label: "stack", size: 1 },
        { id: "free", label: "free", size: 1.2, color: "muted" },
        { id: "heap", label: "heap", size: 3.8 }],
        pointers: [{ label: "order 1042", to: "heap" }, { label: "cart", to: "heap" }] },
    },
  }),
  defineComponent({
    type: "barrier", family: "infra", summary: "a line systems cannot cross freely: network partition, firewall, trust boundary",
    placed: false,
    fields: {
      from: Pos.describe("one end, [x, y] in grid units"),
      to: Pos.describe("other end"),
      kind: z.enum(["partition", "firewall", "boundary"]).describe("partition = zigzag, bad; firewall = solid wall; boundary = dotted, muted"),
      label: Label.max(30).describe("what it is, e.g. 'network partition'"),
      broken: z.boolean().optional().describe("true = a gap opens in the middle: the partition heals, the wall is breached"),
    },
    state: ["broken"],
    size: () => [0, 0],
    check: (el) => {
      const len = Math.hypot(el.to[0] - el.from[0], el.to[1] - el.from[1]);
      return !len ? ["barrier needs two different points"] : len < 2 ? [`barrier is ${Math.round(len * 100) / 100} units long; make it at least 2 so the gap a break opens shows`] : [];
    },
    lint: (el) => {
      const { at, anchor } = barrierLabel(el);
      const tw = textW(el.label, 0.24);
      const [x0, x1] = anchor === "start" ? [at[0], at[0] + tw] : [at[0] - tw / 2, at[0] + tw / 2];
      return x0 < 0 || x1 > GRID.w || at[1] < 0.2 || at[1] > GRID.h - 0.2 ? ["barrier label runs past the canvas edge; move the barrier or shorten the label"] : [];
    },
    chunks: 0,
    example: { add: { from: [8, 1.5], to: [8, 7.5], kind: "partition", label: "network partition" }, set: { broken: true } },
  }),
  defineComponent({
    type: "device", family: "infra", summary: "what the user sees right now: a phone, laptop or browser screen",
    fields: {
      kind: z.enum(["phone", "laptop", "browser"]),
      title: Label.max(22).describe("screen title, or the page in a browser tab"),
      lines: z.array(z.string().max(28)).max(4).describe("up to 4 short lines of what the screen shows"),
      button: z.string().max(12).optional().describe("the call to action; \"\" hides it"),
    },
    state: ["lines", "button"],
    size: (el) => [DEVICE[el.kind].size[0], DEVICE[el.kind].size[1]],
    parts: (el): Record<string, Rect> => (el.button ? { button: { ...DEVICE[el.kind].btn } } : {}),
    check: (el) => {
      const d = DEVICE[el.kind];
      return [
        ...fits("title", el.title, d.title, `a ${el.kind}`),
        ...el.lines.flatMap((l, i) => fits(`line ${i + 1}`, l, d.line, `a ${el.kind}`)),
        ...fits("button", el.button ?? "", d.button, `a ${el.kind}`),
      ];
    },
    example: {
      add: { kind: "phone", title: "Checkout", lines: ["Order 1042", "2 items", "Total $38.00"], button: "Pay" },
      set: { lines: ["Order 1042", "Paid $38.00", "Receipt sent"], button: "Track order" },
    },
  }),
] as const;
