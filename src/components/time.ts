import { z } from "zod";
import { CAPTION } from "./core.ts";
import { Color, defineComponent, Icon, Label, PartId, uniqueIds, type Pt, type Rect } from "./registry.ts";

// Time and process: axes, protocols, lanes, countdowns, loops and stage chains.
// Layout helpers are exported so the renderers draw exactly what parts and edges say.

type Span = [number, number];
const SpanField = z.tuple([z.number(), z.number()]).describe("[from, to] of the time axis, e.g. [0, 60]");
const Unit = z.string().max(12).optional().describe("time unit shown on the axis, e.g. ms, s, min");
const Cursor = z.number().optional().describe("a 'now' marker at this time; set it to make it glide");
const Width = z.number().min(5).max(15).optional().describe("width in grid units, default 9");

const badSpan = ([a, b]: Span) => (a < b ? [] : ["span must go from earlier to later, e.g. [0, 60]"]);
const outside = (what: string, [a, b]: Span, from: number, to = from) => (from < a || to > b ? [`${what} is outside the span ${a} to ${b}`] : []);
const cursorErrors = (el: { span: Span; cursor?: number }) => (el.cursor === undefined ? [] : outside(`cursor at ${el.cursor}`, el.span, el.cursor));
const xOn = (v: number, [a, b]: Span, x0: number, x1: number) => x0 + ((v - a) / (b - a || 1)) * (x1 - x0);
const known = (ids: string[]) => `; there are: ${ids.join(", ")}`;

// timeline: a tag row for "now", one band row per range, the axis, two alternating label rows
export const TL = { tag: 0.4, range: 0.4, axis: 0.5, labels: 0.8, margin: 1 };
export function timelineLayout(el: { w?: number; span: Span; ranges?: unknown[] }) {
  const W = el.w ?? 9;
  const n = el.ranges?.length ?? 0;
  const H = TL.tag + n * TL.range + TL.axis + TL.labels;
  const top = -H / 2;
  const [x0, x1] = [-W / 2 + TL.margin, W / 2 - TL.margin];
  const axisY = top + TL.tag + n * TL.range + TL.axis / 2;
  return {
    W, H, x0, x1, axisY, tagY: top + TL.tag / 2,
    rangeY: (i: number) => top + TL.tag + (i + 0.5) * TL.range,
    labelY: (row: number) => axisY + 0.43 + row * 0.36,
    x: (v: number) => xOn(v, el.span, x0, x1),
  };
}
// events alternate below the axis by time order, so neighbours never share a row
export const eventRows = (events: { id: string; at: number }[]) =>
  new Map([...events].sort((a, b) => a.at - b.at).map((e, i) => [e.id, i % 2]));

// sequence: header cards, then one row per message
export const SEQ = { col: 2.8, head: 0.65, gap: 0.2, row: 0.6 };
export function sequenceLayout(el: { participants: { id: string }[]; messages: { from: string; to: string }[] }) {
  const n = el.participants.length;
  const H = SEQ.head + SEQ.gap + el.messages.length * SEQ.row + 0.15;
  const top = -H / 2;
  const px = (id: string) => (el.participants.findIndex((p) => p.id === id) - (n - 1) / 2) * SEQ.col;
  const rowY = (k: number) => top + SEQ.head + SEQ.gap + (k + 0.72) * SEQ.row;
  const line = (m: { from: string; to: string }, k: number): Pt[] => {
    const [a, b] = [px(m.from), px(m.to)];
    const s = Math.sign(b - a) || 1;
    return [[a + s * 0.06, rowY(k)], [b - s * 0.06, rowY(k)]];
  };
  return { W: n * SEQ.col, H, top, headY: top + SEQ.head / 2, px, rowY, line };
}

// lanes: a label column, one track per lane, a tick row
export const LN = { label: 1.8, row: 0.7, tag: 0.4, axis: 0.4, bar: 0.46 };
export function lanesLayout(el: { w?: number; span: Span; lanes: { id: string }[] }) {
  const W = el.w ?? 9;
  const H = LN.tag + el.lanes.length * LN.row + LN.axis;
  const top = -H / 2;
  const [x0, x1] = [-W / 2 + LN.label, W / 2 - 0.1];
  return {
    W, H, x0, x1, tagY: top + LN.tag / 2, bottom: top + LN.tag + el.lanes.length * LN.row, axisY: H / 2 - LN.axis / 2,
    laneY: (id: string) => top + LN.tag + (el.lanes.findIndex((l) => l.id === id) + 0.5) * LN.row,
    x: (v: number) => xOn(v, el.span, x0, x1),
  };
}

// timer: one ring, caption under it
export const RING = 1.8;

// cycle: step nodes clockwise from the top, labels outside the circle, arcs between neighbours
export const CY = { r: 1.45, node: 0.34 };
const textW = (s: string) => Math.min(s.length * 0.15 + 0.1, 2.4);
export function cycleLayout(el: { steps: { label: string }[] }) {
  const n = el.steps.length;
  const ang = (i: number) => (2 * Math.PI * i) / n;
  const at = (i: number): Pt => [CY.r * Math.sin(ang(i)), -CY.r * Math.cos(ang(i))];
  const label = (i: number) => {
    const [x, y] = at(i);
    const [s, c] = [Math.sin(ang(i)), -Math.cos(ang(i))];
    const d = CY.node + 0.14;
    const w = textW(el.steps[i].label);
    const align = s > 0.3 ? "start" : s < -0.3 ? "end" : "center";
    const lx = x + s * d + (align === "start" ? w / 2 : align === "end" ? -w / 2 : 0);
    const ly = y + c * d + (align === "center" ? Math.sign(c) * 0.17 : 0);
    return { x: lx, y: ly, w, align } as const;
  };
  const gap = (CY.node + 0.12) / CY.r;
  const arc = (i: number): Pt[] => Array.from({ length: 13 }, (_, k) => {
    const a = ang(i) + gap + ((ang(i + 1) - ang(i) - 2 * gap) * k) / 12;
    return [CY.r * Math.sin(a), -CY.r * Math.cos(a)];
  });
  const idx = [...Array(n).keys()];
  const hw = Math.max(...idx.map((i) => Math.max(Math.abs(at(i)[0]) + CY.node, Math.abs(label(i).x) + label(i).w / 2)));
  const hh = Math.max(...idx.map((i) => Math.max(Math.abs(at(i)[1]) + CY.node, Math.abs(label(i).y) + 0.17)));
  return { at, label, arc, size: [2 * hw + 0.1, 2 * hh + 0.1] as [number, number] };
}

// pipeline: interlocking chevrons, a status caption row under them
export const PL = { w: 2.2, h: 0.9, cap: 0.4, notch: 0.3, gap: 0.08 };
const PITCH = PL.w - PL.notch + PL.gap;
export function pipelineLayout(el: { stages: unknown[] }) {
  const n = el.stages.length;
  const W = n * PITCH + PL.notch - PL.gap;
  const H = PL.h + PL.cap;
  const left = (i: number) => -W / 2 + i * PITCH;
  return { W, H, left, cx: (i: number) => left(i) + PL.w / 2, cy: -H / 2 + PL.h / 2, capY: H / 2 - PL.cap / 2 };
}
export const STATUS = ["pending", "running", "done", "failed"] as const;

const Participant = z.strictObject({ id: PartId, label: Label.describe("who takes part: a client, a server, a service"), icon: Icon.optional() });
const Message = z.strictObject({
  id: PartId.describe("names the message so a trace can ride it as id.message"),
  from: PartId.describe("participant id"), to: PartId.describe("participant id"),
  label: Label.describe("what is sent, e.g. ClientHello, 200 OK"),
  reply: z.boolean().optional().describe("a reply: drawn dashed, going back"),
});
const Bar = z.strictObject({
  lane: PartId.describe("lane id"), from: z.number(), to: z.number(),
  label: Label.optional().describe("what runs, e.g. 'read 100'"),
  color: Color.optional().describe("bad = the conflicting or lost work"),
});
const Stage = z.strictObject({
  id: PartId, label: Label.describe("stage name, one or two words"), icon: Icon.optional(),
  status: z.enum(STATUS).optional().describe("pending (default), running, done, failed (drawn bad and dashed)"),
});
const Step = z.strictObject({ id: PartId, label: Label.describe("one or two words"), icon: Icon.optional() });

export const time = [
  defineComponent({
    type: "timeline", family: "time", summary: "events on a time axis: a TTL window, ordering, history, with a gliding 'now'",
    fields: {
      span: SpanField, unit: Unit, w: Width,
      events: z.array(z.strictObject({
        id: PartId, at: z.number().describe("time of the event, inside the span"),
        label: Label.describe("what happens, e.g. 'SET user:42'"), icon: Icon.optional(),
        color: Color.optional().describe("bad = a failure such as a cache miss (dashed); default the element's color"),
      })).max(8).describe("points in time, labelled under the axis; addressable as id.event"),
      ranges: z.array(z.strictObject({ from: z.number(), to: z.number(), label: Label, color: Color.optional() })).max(3).optional()
        .describe("stretches of time drawn as bands above the axis, e.g. a TTL window"),
      cursor: Cursor,
    },
    state: ["cursor", "events"],
    size: (el) => [timelineLayout(el).W, timelineLayout(el).H],
    parts: (el) => {
      const L = timelineLayout(el);
      return Object.fromEntries(el.events.map((e) => [e.id, { x: L.x(e.at), y: L.axisY, w: 0.44, h: 0.44 }]));
    },
    check: (el) => badSpan(el.span).length ? badSpan(el.span) : [
      ...uniqueIds("event", el.events.map((e) => e.id)),
      ...el.events.flatMap((e) => outside(`event '${e.id}' at ${e.at}`, el.span, e.at)),
      ...(el.ranges ?? []).flatMap((r) => r.from < r.to ? outside(`range '${r.label}' (${r.from} to ${r.to})`, el.span, r.from, r.to) : [`range '${r.label}' must end after it starts`]),
      ...cursorErrors(el),
    ],
    lint: (el) => (el.events.length > 6 ? [`${el.events.length} events on one timeline; keep the 6 the story needs`] : []),
    example: {
      add: {
        span: [0, 75], unit: "s", cursor: 10,
        events: [
          { id: "write", at: 0, label: "SET user:42", icon: "pencil" },
          { id: "read", at: 20, label: "GET hit", icon: "search" },
          { id: "expire", at: 60, label: "expired", icon: "timer-off" },
        ],
        ranges: [{ from: 0, to: 60, label: "TTL 60 s" }],
      },
      set: {
        cursor: 70,
        events: [
          { id: "write", at: 0, label: "SET user:42", icon: "pencil" },
          { id: "read", at: 20, label: "GET hit", icon: "search" },
          { id: "expire", at: 60, label: "expired", icon: "timer-off" },
          { id: "miss", at: 70, label: "GET miss", icon: "x", color: "bad" },
        ],
      },
    },
  }),
  defineComponent({
    type: "sequence", family: "time", summary: "a sequence diagram: who sends what to whom, in order (handshake, request/reply)",
    fields: {
      participants: z.array(Participant).min(2).max(5).describe("columns with lifelines, left to right; addressable as id.participant"),
      messages: z.array(Message).max(8).describe("top to bottom in time order; a trace rides one as id.message"),
      shown: z.number().int().min(0).optional().describe("how many messages are drawn, default all; set it to reveal the next ones"),
    },
    state: ["shown"],
    size: (el) => [sequenceLayout(el).W, sequenceLayout(el).H],
    parts: (el) => {
      const S = sequenceLayout(el);
      return Object.fromEntries(el.participants.map((p) => [p.id, { x: S.px(p.id), y: S.headY, w: SEQ.col - 0.25, h: SEQ.head }]));
    },
    edges: (el) => Object.fromEntries(el.messages.map((m, k) => [m.id, sequenceLayout(el).line(m, k)])),
    check: (el) => {
      const ids = el.participants.map((p) => p.id);
      return [
        ...uniqueIds("participant", ids),
        ...uniqueIds("message", el.messages.map((m) => m.id)),
        ...el.messages.flatMap((m) => [m.from, m.to].filter((p) => !ids.includes(p)).map((p) => `message '${m.id}' names unknown participant '${p}'${known(ids)}`)),
        ...el.messages.filter((m) => m.from === m.to).map((m) => `message '${m.id}' goes from '${m.from}' to itself`),
        ...(el.shown !== undefined && el.shown > el.messages.length ? [`shown is ${el.shown}, but there are ${el.messages.length} messages`] : []),
      ];
    },
    lint: (el) => (el.messages.length > 6 ? [`${el.messages.length} messages; keep the exchange to the 6 the story needs`] : []),
    example: {
      add: {
        participants: [{ id: "browser", label: "Ana's browser", icon: "monitor" }, { id: "api", label: "api.shop.com", icon: "server" }],
        messages: [
          { id: "hello", from: "browser", to: "api", label: "ClientHello" },
          { id: "cert", from: "api", to: "browser", label: "ServerHello + cert", reply: true },
          { id: "key", from: "browser", to: "api", label: "key exchange" },
          { id: "done", from: "api", to: "browser", label: "Finished", reply: true },
        ],
        shown: 1,
      },
      set: { shown: 4 },
    },
  }),
  defineComponent({
    type: "lanes", family: "time", summary: "work on parallel time lanes: threads, serial vs parallel, race conditions",
    fields: {
      lanes: z.array(z.strictObject({ id: PartId, label: Label.describe("a thread, worker or request") })).min(1).max(5)
        .describe("one row each, top to bottom; addressable as id.lane"),
      span: SpanField, unit: Unit, w: Width,
      bars: z.array(Bar).max(12).describe("work on a lane from one time to another; set them to slide or overlap"),
      cursor: Cursor,
    },
    state: ["bars", "cursor"],
    size: (el) => [lanesLayout(el).W, lanesLayout(el).H],
    parts: (el) => {
      const L = lanesLayout(el);
      return Object.fromEntries(el.lanes.map((l) => [l.id, { x: (L.x0 + L.x1) / 2, y: L.laneY(l.id), w: L.x1 - L.x0, h: LN.row - 0.14 }]));
    },
    check: (el) => {
      if (badSpan(el.span).length) return badSpan(el.span);
      const ids = el.lanes.map((l) => l.id);
      return [
        ...uniqueIds("lane", ids),
        ...el.bars.flatMap((b, i) => {
          const what = b.label ? `bar '${b.label}'` : `bar ${i}`;
          if (!ids.includes(b.lane)) return [`${what} is on unknown lane '${b.lane}'${known(ids)}`];
          return b.from < b.to ? outside(`${what} (${b.from} to ${b.to})`, el.span, b.from, b.to) : [`${what} must end after it starts`];
        }),
        ...cursorErrors(el),
      ];
    },
    lint: (el) => (el.bars.length > 8 ? [`${el.bars.length} bars; keep the few that show the overlap`] : []),
    example: {
      add: {
        lanes: [{ id: "w1", label: "worker 1" }, { id: "w2", label: "worker 2" }], span: [0, 40], unit: "ms",
        bars: [
          { lane: "w1", from: 0, to: 10, label: "read 100" }, { lane: "w1", from: 10, to: 20, label: "write 101" },
          { lane: "w2", from: 20, to: 30, label: "read 101" }, { lane: "w2", from: 30, to: 40, label: "write 102" },
        ],
      },
      set: {
        cursor: 25,
        bars: [
          { lane: "w1", from: 0, to: 10, label: "read 100" }, { lane: "w1", from: 10, to: 20, label: "write 101" },
          { lane: "w2", from: 5, to: 15, label: "read 100" }, { lane: "w2", from: 15, to: 25, label: "write 101", color: "bad" },
        ],
      },
    },
  }),
  defineComponent({
    type: "timer", family: "time", summary: "a countdown ring that drains: a timeout, lease, backoff or TTL",
    fields: {
      total: z.number().positive().max(86400).describe("full time in seconds"),
      remaining: z.number().min(0).optional().describe("seconds left, default total; set it to drain the ring (0 = expired, turns bad)"),
      label: Label.optional().describe("caption under the ring, e.g. 'lease: worker-3'"),
    },
    state: ["remaining"],
    size: (el) => [Math.max(RING, (el.label?.length ?? 0) * 0.15), RING + (el.label ? CAPTION : 0)],
    check: (el) => (el.remaining !== undefined && el.remaining > el.total ? [`remaining ${el.remaining} is more than the total ${el.total}`] : []),
    example: { add: { total: 30, label: "lease: worker-3" }, set: { remaining: 0 } },
  }),
  defineComponent({
    type: "cycle", family: "time", summary: "steps that repeat around a loop: event loop, retry loop, reconcile loop",
    fields: {
      steps: z.array(Step).min(3).max(6).describe("clockwise from the top; addressable as id.step, and id.step is also the edge to the next step"),
      active: PartId.optional().describe("the step running now; set it to move around the loop"),
      label: Label.optional().describe("name of the loop, shown in the middle"),
    },
    state: ["active"],
    size: (el) => cycleLayout(el).size,
    parts: (el) => {
      const C = cycleLayout(el);
      return Object.fromEntries(el.steps.map((s, i): [string, Rect] => [s.id, { x: C.at(i)[0], y: C.at(i)[1], w: 2 * CY.node, h: 2 * CY.node }]));
    },
    edges: (el) => Object.fromEntries(el.steps.map((s, i) => [s.id, cycleLayout(el).arc(i)])),
    check: (el) => {
      const ids = el.steps.map((s) => s.id);
      return [...uniqueIds("step", ids), ...(el.active !== undefined && !ids.includes(el.active) ? [`active '${el.active}' is not a step${known(ids)}`] : [])];
    },
    example: {
      add: {
        label: "reconcile", active: "observe",
        steps: [
          { id: "observe", label: "observe", icon: "eye" }, { id: "diff", label: "diff", icon: "file-diff" },
          { id: "act", label: "act", icon: "zap" }, { id: "requeue", label: "requeue 30 s", icon: "clock" },
        ],
      },
      set: { active: "act" },
    },
  }),
  defineComponent({
    type: "pipeline", family: "time", summary: "stages in a row, each with a status: CI, ETL, a middleware chain",
    fields: {
      stages: z.array(Stage).min(2).max(6)
        .describe("left to right; addressable as id.stage, and id.stage is also the edge to the next stage; a set keeps the same stages and changes their status"),
    },
    state: ["stages"],
    size: (el) => [pipelineLayout(el).W, pipelineLayout(el).H],
    parts: (el) => {
      const P = pipelineLayout(el);
      return Object.fromEntries(el.stages.map((s, i) => [s.id, { x: P.cx(i), y: P.cy, w: PL.w, h: PL.h }]));
    },
    edges: (el) => {
      const P = pipelineLayout(el);
      return Object.fromEntries(el.stages.slice(0, -1).map((s, i): [string, Pt[]] => [s.id, [[P.cx(i), P.cy], [P.cx(i + 1), P.cy]]]));
    },
    check: (el) => uniqueIds("stage", el.stages.map((s) => s.id)),
    example: {
      add: {
        stages: [
          { id: "lint", label: "lint", icon: "list-checks", status: "done" }, { id: "test", label: "test", icon: "bug", status: "running" },
          { id: "build", label: "build", icon: "package" }, { id: "deploy", label: "deploy", icon: "cloud" },
        ],
      },
      set: {
        stages: [
          { id: "lint", label: "lint", icon: "list-checks", status: "done" }, { id: "test", label: "test", icon: "bug", status: "failed" },
          { id: "build", label: "build", icon: "package" }, { id: "deploy", label: "deploy", icon: "cloud" },
        ],
      },
    },
  }),
] as const;
