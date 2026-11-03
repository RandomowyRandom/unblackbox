import { z } from "zod";
import { Color, defineComponent, Icon, Label, PartId, uniqueIds, type Pt, type Rect } from "./registry.ts";

// Quantities and comparison. Axes start at 0, values are labelled directly, no legends.
// Geometry lives here (Node-safe) so footprints, parts and the renderers in src/video/components/charts.tsx agree.
// All offsets are from the element center, in grid units.

const Value = z.number().min(0).max(1e12);
const CH = 0.13; // grid units per character of 0.24-unit text, to size label columns
const longest = (names: string[]) => Math.max(0, ...names.map((n) => n.length));
// Direct labels are the only key, so two equal ones make the chart unreadable.
const twice = (what: string, names: string[]) =>
  names.filter((n, i) => names.indexOf(n) !== i).map((n) => `two ${what} are labelled '${n}'; direct labels must tell them apart`);
const words = (s: string) => s.trim().split(/\s+/).length;

// Axis top: the first 1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 x 10^k at or above v.
export const niceMax = (v: number) => {
  if (!(v > 0)) return 1;
  const k = 10 ** Math.floor(Math.log10(v));
  return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => Number((m * k).toPrecision(6))).find((m) => m >= v * (1 - 1e-9))!;
};

// bars: vertical bars stand on a baseline, one slot each; horizontal rows grow right from a label column.
type BarsEl = { bars: { label: string; value: number }[]; orient?: "h" | "v"; max?: number };
export const BARS = { plot: 2, base: 1.1, row: 0.5, track: 3, cap: 0.35, thick: 0.5, rowThick: 0.3 } as const;
export const barScale = (el: BarsEl) => el.max ?? niceMax(Math.max(...el.bars.map((b) => b.value)));
export const barSlot = (el: BarsEl) => Math.max(0.9, longest(el.bars.map((b) => b.label)) * CH + 0.2);
export const barLabelW = (el: BarsEl) => Math.max(0.6, longest(el.bars.map((b) => b.label)) * CH);
const barsSize = (el: BarsEl): [number, number] => el.orient === "h"
  ? [barLabelW(el) + 0.15 + BARS.track + 0.9, BARS.cap + el.bars.length * BARS.row + 0.1]
  : [Math.max(2.4, el.bars.length * barSlot(el) + 0.2), 3.2];
// The bar itself (value `frac` of the scale) with `n` bars in the row: what parts, arrows and the renderer use.
export function barRect(el: BarsEl, i: number, n: number, frac: number): Rect {
  if (el.orient !== "h") {
    const len = Math.max(BARS.plot * frac, 0.02);
    return { x: (i - (n - 1) / 2) * barSlot(el), y: BARS.base - len / 2, w: BARS.thick, h: len };
  }
  const len = Math.max(BARS.track * frac, 0.02);
  const x0 = -barsSize(el)[0] / 2 + barLabelW(el) + 0.15;
  return { x: x0 + len / 2, y: -(BARS.cap + n * BARS.row) / 2 + BARS.cap + (i + 0.5) * BARS.row, w: len, h: BARS.rowThick };
}

// chart: fixed plot box, labels for the y axis on the left, direct series labels on the right.
export const CHART = { w: 6.4, h: 3.6, x0: -2.45, x1: 1.85, y0: -1.3, y1: 1.2 } as const;
type ChartEl = { series: { points: number[] }[]; threshold?: { value: number } };
export const chartTop = (el: ChartEl) => niceMax(Math.max(el.threshold?.value ?? 0, ...el.series.flatMap((s) => s.points)));

// donut: ring around the center, labels outside at each slice's middle angle.
export const DONUT = { r: 1.1, ring: 0.36, label: 1.3 } as const;
const donutSize = (el: { slices: { label: string }[] }): [number, number] =>
  [2 * (DONUT.label + longest(el.slices.map((s) => s.label)) * CH + 0.65), 3];

// compare: one panel per column, a header row then one row per item.
export const COMPARE = { col: 3, gap: 0.3, head: 0.7, item: 0.42, pad: 0.25 } as const;
export const compareH = (maxItems: number) => COMPARE.head + maxItems * COMPARE.item + COMPARE.pad;

// venn: circles of radius 1.2; items sit in the region of exactly their sets, stacked 0.32 apart.
type VennEl = { sets: { id: string; label: string }[]; items: { label: string; in: string[] }[] };
export const VENN = { r: 1.2, stack: 0.32 } as const;
const mean = (ps: Pt[]): Pt => [ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length];
export function vennLayout(el: VennEl) {
  const three = el.sets.length === 3;
  const dy = three ? -0.15 : 0.15; // centers the circles plus their labels on the element
  const centers: Pt[] = (three ? [[-0.7, -0.45], [0.7, -0.45], [0, 0.75]] : [[-0.7, 0], [0.7, 0]]).map(([x, y]) => [x, y + dy]);
  // a region's anchor: the middle of its circles, pushed 0.5 away from the circles it is not in
  const anchor = (inside: number[]): Pt => {
    const m = mean(inside.map((i) => centers[i]));
    const rest = centers.filter((_, i) => !inside.includes(i));
    if (!rest.length) return m;
    const o = mean(rest);
    const d = Math.hypot(m[0] - o[0], m[1] - o[1]) || 1;
    return [m[0] + ((m[0] - o[0]) / d) * 0.5, m[1] + ((m[1] - o[1]) / d) * 0.5];
  };
  const keyOf = (ids: string[]) => el.sets.map((s, i) => (ids.includes(s.id) ? i : -1)).filter((i) => i >= 0);
  const regions = el.items.map((it) => keyOf(it.in).join());
  const items = el.items.map((it, i): Pt => {
    const same = regions.flatMap((r, j) => (r === regions[i] ? [j] : []));
    const [x, y] = anchor(keyOf(it.in));
    return [x, y + (same.indexOf(i) - (same.length - 1) / 2) * VENN.stack];
  });
  // set labels above the top circles (outer side), below the bottom one
  const labels = centers.map(([x, y]): Pt => (y > 0.3 ? [x, y + VENN.r + 0.25] : [x + Math.sign(x) * 0.72, y - VENN.r - 0.25]));
  return { centers, items, labels, regions };
}
const vennSize = (el: VennEl): [number, number] =>
  [2 * Math.max(1.95, 1.42 + longest(el.sets.map((s) => s.label)) * 0.07 + 0.1), el.sets.length === 3 ? 4.4 : 3];

// funnel: label column, centered rows narrowing with their value, value column.
export const FUNNEL = { track: 2.6, pitch: 0.62, thick: 0.4, gap: 0.2, values: 1.3 } as const;
type FunnelEl = { stages: { label: string; value: number }[] };
export const funnelLabelW = (el: FunnelEl) => Math.max(0.8, longest(el.stages.map((s) => s.label)) * CH);
const funnelW = (el: FunnelEl) => funnelLabelW(el) + FUNNEL.gap + FUNNEL.track + FUNNEL.gap + FUNNEL.values;
// center x of the rows, relative to the element center
export const funnelX = (el: FunnelEl) => -funnelW(el) / 2 + funnelLabelW(el) + FUNNEL.gap + FUNNEL.track / 2;
export const funnelY = (i: number, n: number) => (i - (n - 1) / 2) * FUNNEL.pitch;

export const charts = [
  defineComponent({
    type: "bars", family: "charts", summary: "quantities side by side: latency per region, jobs per worker",
    fields: {
      bars: z.array(z.strictObject({
        label: Label.max(16).describe("what the bar is, e.g. 'eu-west'"),
        value: Value,
        color: Color.optional().describe("bad for the one that is wrong; it is also dashed"),
      })).min(1).max(8).describe("one bar per thing compared, in a meaningful order"),
      unit: Label.max(16).describe("what the values count, shown once in the corner: 'p99 ms', 'jobs'"),
      orient: z.enum(["v", "h"]).optional().describe("v: bars stand up (default); h: rows, for long labels"),
      max: z.number().positive().max(1e12).optional().describe("axis end, so two moments share one scale; default: just above the largest bar"),
    },
    state: ["bars"],
    size: barsSize,
    parts: (el) => Object.fromEntries(el.bars.map((b, i) => [String(i), barRect(el, i, el.bars.length, b.value / barScale(el))])),
    check: (el) => [
      ...el.bars.filter((b) => el.max !== undefined && b.value > el.max).map((b) => `bar '${b.label}' is ${b.value}, above max ${el.max}`),
      ...twice("bars", el.bars.map((b) => b.label)),
    ],
    lint: (el) => (el.bars.length > 6 ? [`${el.bars.length} bars; keep it to 6 so each one reads`] : []),
    example: {
      add: { unit: "p99 ms", bars: [{ label: "eu-west", value: 120 }, { label: "us-east", value: 340, color: "bad" }, { label: "ap-south", value: 210 }] },
      set: { bars: [{ label: "eu-west", value: 120 }, { label: "us-east", value: 90, color: "good" }, { label: "ap-south", value: 210 }] },
    },
  }),
  defineComponent({
    type: "chart", family: "charts", summary: "a value over time: latency, queue depth, a spike past a limit",
    fields: {
      series: z.array(z.strictObject({
        label: Label.max(12).describe("direct label at the line's end, e.g. 'p99'"),
        points: z.array(Value).min(2).max(40).describe("values at even steps along x"),
        color: Color.optional(),
      })).min(1).max(3),
      xLabel: Label.max(24).describe("what x counts, e.g. 'minutes'"),
      yLabel: Label.max(24).describe("what y measures, e.g. 'latency ms'"),
      threshold: z.strictObject({ value: Value, label: Label.max(12).describe("e.g. 'SLO 500 ms'") }).optional()
        .describe("a dashed limit line; points above it get a bad dot"),
    },
    state: ["series"],
    size: () => [CHART.w, CHART.h],
    check: (el) => twice("series", el.series.map((s) => s.label)),
    lint: (el) => el.series.filter((s) => s.points.length > 30).map((s) => `series '${s.label}' has ${s.points.length} points; 30 or fewer read as a shape`),
    example: {
      add: {
        xLabel: "minutes", yLabel: "checkout latency ms", threshold: { value: 500, label: "SLO 500 ms" },
        series: [{ label: "p99", points: [180, 190, 185, 200, 640, 910, 870] }, { label: "p50", points: [80, 85, 82, 90, 210, 260, 240], color: "muted" }],
      },
      set: {
        series: [{ label: "p99", points: [180, 190, 185, 200, 640, 910, 870, 420, 230, 190, 185] },
          { label: "p50", points: [80, 85, 82, 90, 210, 260, 240, 150, 95, 88, 85], color: "muted" }],
      },
    },
  }),
  defineComponent({
    type: "donut", family: "charts", summary: "shares of a whole: cache hit ratio, traffic split",
    fields: {
      slices: z.array(z.strictObject({ label: Label.max(14), value: Value, color: Color.optional() })).min(1).max(6)
        .describe("the first slice is the headline: its share is shown big in the middle"),
      center: Label.max(12).optional().describe("caption under the headline share, e.g. 'cache hits'"),
    },
    state: ["slices"],
    size: donutSize,
    check: (el) => [
      ...(el.slices.some((s) => s.value > 0) ? [] : ["slices add up to 0; give at least one a value"]),
      ...twice("slices", el.slices.map((s) => s.label)),
    ],
    lint: (el) => {
      const total = el.slices.reduce((s, x) => s + x.value, 0);
      return [
        ...(el.slices.length > 4 ? [`${el.slices.length} slices; keep it to 4, merge the rest into 'other'`] : []),
        ...el.slices.filter((s) => total && s.value > 0 && s.value / total < 0.03).map((s) => `slice '${s.label}' is under 3%; merge it into 'other'`),
      ];
    },
    example: {
      add: { center: "cache hits", slices: [{ label: "hit", value: 82, color: "good" }, { label: "miss", value: 18, color: "bad" }] },
      set: { slices: [{ label: "hit", value: 95, color: "good" }, { label: "miss", value: 5, color: "bad" }] },
    },
  }),
  defineComponent({
    type: "compare", family: "charts", summary: "two or three options side by side: before/after, A vs B, a trade-off",
    fields: {
      columns: z.array(z.strictObject({
        title: Label.max(20),
        icon: Icon.optional(),
        items: z.array(Label.max(24)).min(1).max(5).describe("short facts, a few words each"),
        verdict: z.enum(["good", "bad"]).optional().describe("marks the column with a check or a cross and its color"),
      })).min(2).max(3),
    },
    state: ["columns"],
    size: (el) => [el.columns.length * COMPARE.col + (el.columns.length - 1) * COMPARE.gap, compareH(Math.max(...el.columns.map((c) => c.items.length)))],
    check: (el) => twice("columns", el.columns.map((c) => c.title)),
    lint: (el) => el.columns.flatMap((c) => [
      ...(c.items.length > 4 ? [`column '${c.title}' has ${c.items.length} items; keep it to 4`] : []),
      ...c.items.filter((it) => words(it) > 5).map((it) => `item '${it}' is ${words(it)} words; keep it to 5`),
    ]),
    example: {
      add: { columns: [
        { title: "Polling", icon: "refresh-cw", items: ["asks every 30 s", "simple to run", "wasted requests"] },
        { title: "Webhooks", icon: "send", items: ["pushed on change", "needs a public URL"] },
      ] },
      set: { columns: [
        { title: "Polling", icon: "refresh-cw", items: ["asks every 30 s", "simple to run", "wasted requests"], verdict: "bad" },
        { title: "Webhooks", icon: "send", items: ["pushed on change", "needs a public URL", "retries needed"], verdict: "good" },
      ] },
    },
  }),
  defineComponent({
    type: "venn", family: "charts", summary: "overlapping sets: shared permissions, common dependencies",
    fields: {
      sets: z.array(z.strictObject({ id: PartId.describe("ref it as 'venn.<id>'"), label: Label.max(16) })).min(2).max(3),
      items: z.array(z.strictObject({
        label: Label.max(12).describe("short: it has to fit its region, e.g. 'Ana'"),
        in: z.array(PartId).min(1).max(3).describe("ids of the sets it belongs to; it sits where exactly those overlap"),
      })).max(8),
      highlight: z.array(PartId).max(3).optional().describe("glow the region where exactly these sets overlap, e.g. ['admin', 'billing']"),
    },
    state: ["items", "highlight"],
    size: vennSize,
    parts: (el) => Object.fromEntries(vennLayout(el).centers.map(([x, y], i) => [el.sets[i].id, { x, y, w: 2 * VENN.r, h: 2 * VENN.r }])),
    check: (el) => {
      const ids = el.sets.map((s) => s.id);
      const known = `; sets: ${ids.join(", ")}`;
      const unknown = (what: string, list: string[]) => list.filter((id) => !ids.includes(id)).map((id) => `${what} unknown set '${id}'${known}`);
      return [
        ...uniqueIds("set", ids),
        ...el.items.flatMap((it) => [...unknown(`item '${it.label}' is in`, it.in), ...uniqueIds(`item '${it.label}' set`, it.in)]),
        ...unknown("highlight has", el.highlight ?? []),
        ...uniqueIds("highlight set", el.highlight ?? []),
      ];
    },
    lint: (el) => {
      const regions = vennLayout(el).regions;
      const crowded = [...new Set(regions)].filter((r) => regions.filter((x) => x === r).length > 3);
      return [
        ...(el.items.length > 6 ? [`${el.items.length} items; keep it to 6 so each region reads`] : []),
        ...crowded.map(() => "more than 3 items in one region; they will not fit"),
      ];
    },
    example: {
      add: {
        sets: [{ id: "admin", label: "Admins" }, { id: "billing", label: "Billing" }],
        items: [{ label: "Ana", in: ["admin", "billing"] }, { label: "Ben", in: ["admin"] }, { label: "Chen", in: ["billing"] }],
      },
      set: { items: [{ label: "Ana", in: ["admin", "billing"] }, { label: "Ben", in: ["admin", "billing"] }, { label: "Chen", in: ["billing"] }], highlight: ["admin", "billing"] },
    },
  }),
  defineComponent({
    type: "funnel", family: "charts", summary: "stages that filter: requests through auth, rate limit and cache",
    fields: {
      stages: z.array(z.strictObject({ label: Label.max(16), value: Value })).min(2).max(5).describe("top to bottom; each at most the one before it"),
    },
    state: ["stages"],
    size: (el) => [funnelW(el), el.stages.length * FUNNEL.pitch + 0.1],
    parts: (el) => Object.fromEntries(el.stages.map((s, i) => [String(i),
      { x: funnelX(el), y: funnelY(i, el.stages.length), w: Math.max(FUNNEL.track * (s.value / (el.stages[0].value || 1)), 0.04), h: FUNNEL.thick }])),
    check: (el) => [
      ...(el.stages[0].value > 0 ? [] : ["the first stage needs a value above 0"]),
      ...el.stages.slice(1).flatMap((s, i) => (s.value > el.stages[i].value
        ? [`stage '${s.label}' (${s.value}) is above the stage before it (${el.stages[i].value}); a funnel only narrows`] : [])),
    ],
    example: {
      add: { stages: [{ label: "requests", value: 1000 }, { label: "authenticated", value: 860 }, { label: "under rate limit", value: 540 }, { label: "cache miss", value: 180 }] },
      set: { stages: [{ label: "requests", value: 1000 }, { label: "authenticated", value: 860 }, { label: "under rate limit", value: 780 }, { label: "cache miss", value: 260 }] },
    },
  }),
] as const;
