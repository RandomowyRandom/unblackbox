import { z } from "zod";
import { CAPTION } from "./core.ts";
import { colRects, Color, defineComponent, Label, rowRects, type Pt } from "./registry.ts";

// Small, glanceable widgets for state: a switch, a lock, a token bucket, a dial, a bar, a number, a checklist.
// Geometry in grid units from the element center; the renderers in src/video/components/control.tsx draw the same layout.
export const CTL = {
  mono: 0.16, // grid units per character of 0.26 mono text
  track: [1, 0.56], // toggle track
  lock: [0.9, 1.3], // padlock graphic, shackle lift included
  owner: 1.95, // room for the owner pill (12 characters)
  token: 0.5, // token pitch
  frame: 0.7, // token frame height
  dial: 1, // gauge radius
  sweep: 240, // gauge arc in degrees, opening at the bottom
  row: 0.5, // checklist row pitch
} as const;
const capW = (s = "") => s.length * 0.143 + 0.3; // a 0.26 sans caption
const short = (n: number) => z.string().max(n);
const Num = z.number().finite();
const fmt = (n: number) => String(Number(n.toFixed(2)));
const toggleText = (el: { onLabel?: string; offLabel?: string }) => Math.max((el.onLabel ?? "on").length, (el.offLabel ?? "off").length) * CTL.mono;
export const toggleW = (el: { onLabel?: string; offLabel?: string }) => CTL.track[0] + 0.2 + toggleText(el);
// Gauge: angle of a value in degrees, SVG style (0 = right, clockwise), and the point at radius r.
export const gaugeAngle = (el: { min: number; max: number }, v: number) =>
  90 + (360 - CTL.sweep) / 2 + (Math.min(Math.max((v - el.min) / (el.max - el.min), 0), 1)) * CTL.sweep;
export const polar = (deg: number, r: number): Pt => [Math.cos((deg * Math.PI) / 180) * r, Math.sin((deg * Math.PI) / 180) * r];
export const GAUGE_H = 1.85; // dial plus readout, above the caption
const gaugeCy = (h: number) => -h / 2 + 1.08; // dial center from the element center
export const progressW = (el: { label: string }) => Math.max(4, capW(el.label) + 2);
export const listW = (el: { items: { label: string }[]; label?: string }) => Math.max(2.4, ...el.items.map((i) => capW(i.label) + 0.75), capW(el.label));
const tokenX = (n: number, i: number) => (i - (n - 1) / 2) * CTL.token;

export const control = [
  defineComponent({
    type: "toggle", family: "control", summary: "a switch with two states: feature flag, circuit breaker, config switch",
    fields: {
      label: Label.describe("what it switches, e.g. 'new checkout', 'breaker to payments'"),
      on: z.boolean(),
      onLabel: short(12).optional().describe("word for on, default 'on' (e.g. 'closed', 'enabled')"),
      offLabel: short(12).optional().describe("word for off, default 'off' (e.g. 'open', 'disabled')"),
    },
    state: ["on"],
    size: (el) => [Math.max(toggleW(el), capW(el.label)), 0.6 + CAPTION],
    parts: (el) => ({ knob: { x: -toggleW(el) / 2 + CTL.track[0] / 2 + (el.on ? 0.22 : -0.22), y: -CAPTION / 2, w: 0.44, h: 0.44 } }),
    check: (el) => ((el.onLabel ?? "on") === (el.offLabel ?? "off") ? [`onLabel and offLabel are both '${el.onLabel ?? "on"}'; the two states need different words`] : []),
    example: { add: { label: "new checkout", on: false, onLabel: "enabled", offLabel: "disabled" }, set: { on: true } },
  }),
  defineComponent({
    type: "lock", family: "control", summary: "a lock and who holds it: mutex, row lock, lease, leader lock",
    fields: {
      label: Label.describe("what it guards, e.g. 'order 1042 row', 'leader'"),
      locked: z.boolean(),
      owner: short(12).optional().describe("who holds it, e.g. 'worker-2'; \"\" once released"),
    },
    state: ["locked", "owner"],
    size: (el) => [Math.max(CTL.lock[0] + 0.15 + CTL.owner, capW(el.label)), CTL.lock[1] + CAPTION],
    parts: () => {
      const left = -(CTL.lock[0] + 0.15 + CTL.owner) / 2;
      return {
        body: { x: left + CTL.lock[0] / 2, y: -CAPTION / 2, w: CTL.lock[0], h: CTL.lock[1] },
        owner: { x: left + CTL.lock[0] + 0.15 + CTL.owner / 2, y: -CAPTION / 2 + 0.34, w: CTL.owner, h: 0.42 },
      };
    },
    check: (el) => (!el.locked && el.owner ? [`an unlocked lock has no owner; set owner: "" when '${el.owner}' releases it`] : []),
    example: { add: { label: "order 1042 row", locked: false }, set: { locked: true, owner: "worker-2" } },
  }),
  defineComponent({
    type: "tokens", family: "control", summary: "tokens taken and refilled: rate limit, semaphore, connection pool",
    fields: {
      label: Label.describe("what it limits, e.g. 'rate limit', 'db pool'"),
      capacity: z.number().int().min(1).max(12),
      filled: z.number().int().min(0).describe("tokens left, 0..capacity; the rest show as empty slots"),
      rate: short(8).optional().describe("refill rate shown next to the caption, e.g. '5/s'"),
    },
    state: ["filled"],
    size: (el) => [Math.max(el.capacity * CTL.token + 0.3, capW(el.label + (el.rate ? `  ${el.rate}` : ""))), CTL.frame + CAPTION],
    parts: (el) => Object.fromEntries(rowRects(el.capacity, CTL.token, 0.4, 0.4, -CAPTION / 2).map((r, i) => [String(i), r])),
    // take: the last token leaves through the top; refill: a new one slides in from the right into the first empty slot
    edges: (el) => {
      const y = -CAPTION / 2;
      const take = tokenX(el.capacity, Math.max(el.filled - 1, 0));
      const next = tokenX(el.capacity, Math.min(el.filled, el.capacity - 1));
      const right = (el.capacity * CTL.token) / 2 + 0.6;
      return { take: [[take, y], [take, y - 1]], refill: [[right, y], [next, y]] };
    },
    check: (el) => (el.filled > el.capacity ? [`filled ${el.filled} is more than capacity ${el.capacity}`] : []),
    lint: (el) => (el.capacity > 8 ? [`${el.capacity} tokens are hard to count at a glance; show 8 or fewer`] : []),
    example: { add: { label: "rate limit", capacity: 8, filled: 8, rate: "5/s" }, set: { filled: 3 } },
  }),
  defineComponent({
    type: "gauge", family: "control", summary: "a dial with a needle and zones: load, CPU, saturation",
    fields: {
      label: Label.describe("what it measures, e.g. 'CPU', 'queue depth'"),
      min: Num, max: Num, value: Num,
      unit: short(6).describe("shown after the value, e.g. '%', 'ms', '' for none"),
      zones: z.array(z.strictObject({ to: Num.describe("upper end of this zone"), color: Color })).max(4).optional()
        .describe("bands from min upwards, each up to `to`; the last ends at max (e.g. good to 70, accent to 90, bad to 100)"),
    },
    state: ["value"],
    size: (el) => [Math.max(2.6, capW(el.label)), GAUGE_H + CAPTION],
    parts: (el) => {
      const [x, y] = polar(gaugeAngle(el, el.value), CTL.dial * 0.7);
      return { needle: { x, y: gaugeCy(GAUGE_H + CAPTION) + y, w: 0.3, h: 0.3 } };
    },
    check: (el) => {
      if (el.min >= el.max) return [`min ${fmt(el.min)} must be below max ${fmt(el.max)}`];
      const out = el.value < el.min || el.value > el.max ? [`value ${fmt(el.value)} is outside ${fmt(el.min)}..${fmt(el.max)}`] : [];
      const zones = el.zones ?? [];
      zones.forEach((z, i) => {
        const from = i ? zones[i - 1].to : el.min;
        if (z.to <= from) out.push(`zones.${i} ends at ${fmt(z.to)}, not above ${fmt(from)}; zones go up from min`);
      });
      if (zones.length && zones.at(-1)!.to !== el.max) out.push(`the last zone ends at ${fmt(zones.at(-1)!.to)}; end it at max ${fmt(el.max)}`);
      return out;
    },
    example: {
      add: { label: "CPU", min: 0, max: 100, value: 35, unit: "%", zones: [{ to: 70, color: "good" }, { to: 90, color: "accent" }, { to: 100, color: "bad" }] },
      set: { value: 92 },
    },
  }),
  defineComponent({
    type: "progress", family: "control", summary: "a bar filling up: migration, replication catch-up, upload",
    fields: {
      label: Label.describe("what is progressing, e.g. 'backfill orders'"),
      value: Num.min(0).describe("done so far: out of total, or a fraction 0..1 without one"),
      total: Num.positive().optional().describe("the whole, e.g. 48000 rows; shows '12k / 48k'"),
    },
    state: ["value"],
    size: (el) => [progressW(el), 0.8],
    parts: (el) => ({ bar: { x: 0, y: 0.28, w: progressW(el), h: 0.24 } }),
    check: (el) => el.total !== undefined
      ? (el.value > el.total ? [`value ${fmt(el.value)} is more than total ${fmt(el.total)}`] : [])
      : (el.value > 1 ? [`value ${fmt(el.value)} is over 1; give a total, or a fraction 0..1`] : []),
    example: { add: { label: "backfill orders", value: 12000, total: 48000 }, set: { value: 41000 } },
  }),
  defineComponent({
    type: "counter", family: "control", summary: "a number that changes: retries, version, p99 latency, a count",
    fields: {
      label: Label.describe("what it counts, e.g. 'retries', 'p99 latency'"),
      value: z.union([Num, short(8)]).describe("a number, or a short string such as 'v12' or '1.2k'"),
      unit: short(6).optional().describe("shown small after the value, e.g. 'ms'"),
    },
    state: ["value"],
    size: (el) => [Math.max(2.2, String(el.value).length * 0.3 + (el.unit ? el.unit.length * 0.13 + 0.12 : 0) + 0.6, capW(el.label)), 0.8 + CAPTION],
    lint: (el) => (String(el.value).length > 6 ? [`counter value '${el.value}' is long; round it (e.g. '1.2k') so it reads at a glance`] : []),
    example: { add: { label: "p99 latency", value: 180, unit: "ms" }, set: { value: 1240 } },
  }),
  defineComponent({
    type: "checklist", family: "control", summary: "items ticked off: health checks, acceptance criteria, steps done",
    fields: {
      items: z.array(z.strictObject({ label: short(32), done: z.boolean().optional() })).min(1).max(6),
      label: Label.optional().describe("caption under the list, e.g. 'health checks'"),
    },
    state: ["items"],
    size: (el) => [listW(el), el.items.length * CTL.row + 0.2 + (el.label ? CAPTION : 0)],
    parts: (el) => Object.fromEntries(colRects(el.items.length, CTL.row, listW(el) - 0.1, CTL.row - 0.05)
      .map((r, i) => [String(i), { ...r, y: r.y - (el.label ? CAPTION / 2 : 0) }])),
    check: (el) => el.items.map((i) => i.label).filter((l, i, all) => all.indexOf(l) !== i).map((l) => `item '${l}' is listed twice`),
    lint: (el) => [
      ...(el.items.length > 4 ? [`${el.items.length} items; 4 or fewer read at a glance`] : []),
      ...el.items.filter((i) => i.label.split(/\s+/).filter(Boolean).length > 5).map((i) => `item '${i.label}' is over 5 words; keep it a label`),
    ],
    example: {
      add: { label: "health checks", items: [{ label: "db ping", done: true }, { label: "cache warm" }, { label: "queue drained" }] },
      set: { items: [{ label: "db ping", done: true }, { label: "cache warm", done: true }, { label: "queue drained" }] },
    },
  }),
] as const;
