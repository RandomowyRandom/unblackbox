import { z } from "zod";
import { Icon, Id, type Add, type Issue } from "./spec.ts";
import { Label } from "./components/registry.ts";

// A small deterministic simulation that runs a playground board: entities (orders, requests) are made by
// sources, wait in queues, are worked on by workers and end in sinks. Nothing is scripted; what the viewer
// sees (a queue filling, an order lost in a crash, a duplicate email) follows from these rules.
export const TICK = 0.1; // seconds per step; every time in the sim is a whole number of ticks
const SLOW = 4; // a slow node takes this many times longer
const WINDOW = 10; // seconds of finished spans a percentile looks back over
const EPS = 1e-9;

const ParamRef = z.strictObject({ param: Id.describe("a key of sim.params; the player can change it") });
const Num = z.union([z.number().min(0), ParamRef]);
const Flag = z.union([z.boolean(), ParamRef]);
const choice = <const T extends readonly [string, ...string[]]>(values: T) => z.union([z.enum(values), ParamRef]);
const Time = z.union([Num, z.tuple([z.number().min(0), z.number().min(0)]).refine(([a, b]) => a <= b, "[min, max]: min must not be above max")])
  .describe("seconds per entity; [min, max] picks evenly in between each time");
const From = z.string().max(120).optional().describe("where the number comes from: file:line, a config key, or 'illustrative'");
const Faults = z.array(z.enum(["down", "slow"])).min(1).optional().describe("faults the player (or a challenge script) may switch on");
const Removable = z.strictObject({ bridge: Label.describe("label of the arrow drawn in its place, from what fed it to what it fed") })
  .optional().describe("the player may take this part out; what fed it then sends straight to what it fed");

const Range = z.strictObject({
  label: Label, min: z.number(), max: z.number(), step: z.number().positive(), value: z.number(),
  unit: z.string().max(6).optional(), from: From,
});
const Choice = z.strictObject({
  label: Label, options: z.array(z.string().regex(/^[a-z][\w-]*$/)).min(2).max(4).describe("the values of the field it feeds; off/on for a yes/no field"),
  value: z.string(), from: From,
});
export const Param = z.union([Range, Choice]).describe("a lever: a number with a range, or a choice between options");

const SourceNode = z.strictObject({
  kind: z.literal("source"),
  rate: Num.describe("entities per second"),
  arrivals: z.enum(["even", "poisson"]).default("even").describe("even = one every 1/rate s (same in every run); poisson = random"),
  burst: z.number().int().min(1).max(20).optional().describe("the player may make this source send this many at once"),
});
const QueueNode = z.strictObject({
  kind: z.literal("queue"),
  overflow: choice(["block", "drop"]).default("block").describe("when full: block = the sender holds on, drop = the new entity is thrown away"),
  ack: choice(["take", "done"]).default("take").describe("take = gone from the queue once a worker takes it; done = kept until the worker finishes, so a crash redelivers it"),
  removable: Removable,
});
const WorkerNode = z.strictObject({
  kind: z.literal("worker"),
  time: Time,
  concurrency: Num.default(1).describe("entities it works on at once (workers, threads, slots)"),
  full: choice(["wait", "refuse"]).default("wait").describe("when every slot is busy: wait = senders hold on, refuse = the arrival is turned away"),
  awaits: z.boolean().default(false).describe("true when it waits for what it sends to finish (a synchronous call); its slot stays busy until then"),
  faults: Faults,
  removable: Removable,
  show: z.strictObject({ concurrency: Id.describe("a badge that shows the slot count, e.g. x2") }).optional(),
});
const SinkNode = z.strictObject({
  kind: z.literal("sink"),
  time: Time.default(0),
  dedupe: Flag.default(false).describe("true when it ignores an entity it already finished (an idempotency key)"),
  faults: Faults,
});
export const Node = z.discriminatedUnion("kind", [SourceNode, QueueNode, WorkerNode, SinkNode]);
export const Link = z.strictObject({
  latency: z.number().min(0).max(10).default(1).describe("seconds an entity travels along this arrow"),
  retry: z.strictObject({
    enabled: Flag.default(true),
    timeout: z.number().positive().max(30).describe("seconds without the receiver finishing before the sender sends again"),
    max: z.number().int().min(1).max(5).describe("resends before the sender gives up"),
    backoff: z.number().min(1).max(4).default(1).describe("each wait is this many times the last"),
  }).optional(),
  faults: z.array(z.literal("cut")).min(1).optional().describe("cut = what travels on it is lost (a network partition)"),
});
export const Sim = z.strictObject({
  seed: z.number().int().min(0).default(1),
  entity: z.strictObject({
    kind: Label.describe("what flows, e.g. order, request, message"),
    icon: Icon,
    first: z.number().int().min(0).default(1).describe("number of the first one; the rest count up (order 1041, 1042, ...)"),
  }),
  params: z.record(Id, Param).default({}),
  nodes: z.record(Id, Node).describe("board element id -> how it behaves; flow arrows between them are the links"),
  links: z.record(Id, Link).default({}).describe("arrow id -> how entities travel on it; arrows not listed take 1 s"),
  spans: z.record(Id, z.strictObject({ from: Id, to: Id })).default({})
    .describe("a timed stretch: from when an entity reaches `from` until `to` hands it on (or finishes it)"),
});
export type Sim = z.infer<typeof Sim>;
export type SimNode = z.infer<typeof Node>;
type LinkCfg = z.infer<typeof Link>;
type NumV = z.infer<typeof Num>;

export const KINDS = {
  source: { types: ["icon", "box"], metrics: ["length"], faults: [] },
  queue: { types: ["cells"], metrics: ["length", "dropped"], faults: [] },
  worker: { types: ["box", "icon"], metrics: ["length", "busy", "utilization", "refused", "done"], faults: ["down", "slow"] },
  sink: { types: ["icon", "box", "store"], metrics: ["busy", "done", "duplicates"], faults: ["down", "slow"] },
} as const;
export const EVENTS = ["blocked", "dropped", "refused", "lost", "redelivered", "retried", "duplicate", "deduped", "down", "drained", "removed"] as const;
export type EventType = (typeof EVENTS)[number];
export type SimEvent = { type: EventType; at: string; entity?: string; tick: number };
export type Hop = { link: string; from: string; to: string; entity: string; sec: number; tick: number };
export type Input = { param: string; value: number | string } | { fault: string; on: boolean } | { remove: string; on: boolean } | { burst: string };

// What the arrows say: which node sends where. One way out of every node but a sink.
// A queue holds as many entities as its cells element has slots.
export type Model = { sim: Sim; links: Record<string, { from: string; to: string }>; out: Record<string, string>; capacity: Record<string, number> };

export function modelOf(sim: Sim, scene: Add[]): { model: Model | null; issues: Issue[] } {
  const issues: Issue[] = [];
  const fail = (path: string, message: string) => issues.push({ path, message });
  const els = new Map(scene.map((a) => [a.id, a]));
  const links: Model["links"] = {};
  const out: Model["out"] = {};
  for (const [id, node] of Object.entries(sim.nodes)) {
    const el = els.get(id);
    const types: readonly string[] = KINDS[node.kind].types;
    if (!el) fail(`sim.nodes.${id}`, `'${id}' is not on the board`);
    else if (!types.includes(el.type)) fail(`sim.nodes.${id}.kind`, `a ${node.kind} needs ${types.join(" or ")} element; '${id}' is ${el.type}`);
  }
  for (const a of scene) {
    if (a.type !== "arrow" || typeof a.from !== "string" || typeof a.to !== "string") continue;
    if (!(a.from in sim.nodes) || !(a.to in sim.nodes)) continue;
    links[a.id] = { from: a.from, to: a.to };
    if (out[a.from]) fail(`sim.nodes.${a.from}`, `'${a.from}' sends on both '${out[a.from]}' and '${a.id}'; a node has one way out`);
    out[a.from] = a.id;
  }
  const into = (id: string) => Object.entries(links).filter(([, l]) => l.to === id).map(([k]) => k);
  for (const [id, node] of Object.entries(sim.nodes)) {
    if (node.kind === "sink" && out[id]) fail(`sim.nodes.${id}`, `a sink ends the flow; '${id}' sends on '${out[id]}'`);
    if (node.kind !== "sink" && !out[id]) fail(`sim.nodes.${id}`, `no flow arrow leaves '${id}'; draw an arrow to the next node, or make it a sink`);
    if (node.kind === "source" && into(id).length) fail(`sim.nodes.${id}`, `a source makes entities; '${id}' also receives on '${into(id)[0]}'`);
    if (node.kind !== "source" && !into(id).length) fail(`sim.nodes.${id}`, `no flow arrow reaches '${id}'`);
    if ("removable" in node && node.removable && into(id).length !== 1) fail(`sim.nodes.${id}.removable`, `a bridge needs one arrow in and one out; '${id}' has ${into(id).length} in`);
    if ("removable" in node && node.removable && els.has(`${id}-bridge`)) fail(`sim.nodes.${id}.removable`, `'${id}-bridge' is the bridge arrow's id; rename that element`);
    if (node.kind === "worker" && node.show && els.get(node.show.concurrency)?.type !== "badge") fail(`sim.nodes.${id}.show.concurrency`, `'${node.show.concurrency}' must be a badge on the board`);
  }
  for (const id of Object.keys(sim.links)) if (!links[id]) fail(`sim.links.${id}`, `'${id}' is not a flow arrow between two sim nodes`);
  // the nodes after `id`, in order, until a sink (or a loop)
  const path = (id: string) => {
    const seen = [id];
    for (let at = id; out[at] && !seen.includes(links[out[at]].to);) seen.push((at = links[out[at]].to));
    return seen;
  };
  const sources = Object.keys(sim.nodes).filter((id) => sim.nodes[id].kind === "source");
  if (!sources.length) fail("sim.nodes", "no source; one node must make the entities (kind: source)");
  const fed = new Set(sources.flatMap(path)); // "no source feeds" only when no missing arrow explains it already
  for (const id of Object.keys(sim.nodes)) {
    const end = path(id).at(-1)!;
    if (out[id] && sim.nodes[end].kind !== "sink") fail(`sim.nodes.${id}`, `the flow from '${id}' never reaches a sink; it ${out[end] ? `loops back from '${end}'` : `stops at '${end}'`}`);
    else if (sources.length && !fed.has(id) && !issues.length) fail(`sim.nodes.${id}`, `no source feeds '${id}'`);
  }
  for (const [id, s] of Object.entries(sim.spans)) {
    if (id in sim.nodes) fail(`sim.spans.${id}`, `'${id}' is a node id; name the span something else so their metrics stay apart`);
    for (const end of ["from", "to"] as const) if (!(s[end] in sim.nodes)) fail(`sim.spans.${id}.${end}`, `'${s[end]}' is not a sim node`);
    if (s.from in sim.nodes && s.to in sim.nodes && !path(s.from).includes(s.to)) fail(`sim.spans.${id}.to`, `'${s.to}' is not downstream of '${s.from}': ${path(s.from).join(" -> ")}`);
  }
  const fields = (node: SimNode): [string, unknown, readonly string[] | "number" | "flag"][] => {
    if (node.kind === "source") return [["rate", node.rate, "number"]];
    if (node.kind === "queue") return [["overflow", node.overflow, ["block", "drop"]], ["ack", node.ack, ["take", "done"]]];
    if (node.kind === "worker") return [["time", node.time, "number"], ["concurrency", node.concurrency, "number"], ["full", node.full, ["wait", "refuse"]]];
    return [["time", node.time, "number"], ["dedupe", node.dedupe, "flag"]];
  };
  const refs: [string, unknown, readonly string[] | "number" | "flag"][] = [
    ...Object.entries(sim.nodes).flatMap(([id, n]) => fields(n).map(([k, v, t]) => [`sim.nodes.${id}.${k}`, v, t] as [string, unknown, typeof t])),
    ...Object.entries(sim.links).map(([id, l]) => [`sim.links.${id}.retry.enabled`, l.retry?.enabled, "flag"] as [string, unknown, "flag"]),
  ];
  for (const [path, v, want] of refs) {
    if (!v || typeof v !== "object" || !("param" in v)) continue;
    const name = (v as { param: string }).param;
    const p = sim.params[name];
    if (!p) { fail(path, `param '${name}' is not in sim.params${some(Object.keys(sim.params))}`); continue; }
    const isRange = "min" in p;
    if (want === "number" && !isRange) fail(path, `param '${name}' is a choice; this field needs a number`);
    if (want === "number" && isRange && p.min < 0) fail(path, `param '${name}' can go below 0 (min ${p.min}); ${path.split(".").pop()} needs 0 or more`);
    if (path.endsWith(".concurrency") && isRange && (p.min < 1 || !Number.isInteger(p.min) || !Number.isInteger(p.step))) fail(path, `param '${name}' must be whole numbers from 1 (integer min and step) for concurrency`);
    if (want === "flag" && (isRange || [...p.options].sort().join() !== "off,on")) fail(path, `param '${name}' must have options off, on for a yes/no field`);
    if (Array.isArray(want) && (isRange || p.options.some((o) => !want.includes(o)))) fail(path, `param '${name}' has ${isRange ? "a range" : `options ${p.options.join(", ")}`}; ${path.split(".").pop()} needs ${want.join(", ")}`);
  }
  for (const [id, p] of Object.entries(sim.params)) {
    const path = `sim.params.${id}`;
    if ("min" in p) {
      if (p.min >= p.max) fail(path, `min ${p.min} must be below max ${p.max}`);
      if (p.value < p.min || p.value > p.max) fail(`${path}.value`, `${p.value} is outside ${p.min}..${p.max}`);
      else if (Math.abs((p.value - p.min) / p.step - Math.round((p.value - p.min) / p.step)) > 1e-6) fail(`${path}.value`, `${p.value} is not on the slider's steps (${p.min}, ${p.min + p.step}, ...)`);
    } else {
      if (!p.options.includes(p.value)) fail(`${path}.value`, `'${p.value}' is not one of ${p.options.join(", ")}`);
      if (new Set(p.options).size !== p.options.length) fail(`${path}.options`, "an option is listed twice");
    }
    if (!refs.some(([, v]) => v && typeof v === "object" && (v as { param?: string }).param === id)) fail(path, `param '${id}' feeds no field; point a field at it with { "param": "${id}" }`);
  }
  const capacity = Object.fromEntries(scene.flatMap((a) => (a.type === "cells" && sim.nodes[a.id]?.kind === "queue" ? [[a.id, a.items.length]] : [])));
  return issues.length ? { model: null, issues } : { model: { sim, links, out, capacity }, issues };
}
const some = (keys: string[]) => (keys.length ? `: ${keys.join(", ")}` : "; it has none");

// ---- runtime ----

type Copy = { name: string; n: number; uid: number; from?: string }; // from = queue that still holds it (ack done)
type Slot = { e: Copy; phase: "work" | "out" | "await"; left: number; blocked?: boolean; to?: string };
type Item = { e: Copy; taken: boolean }; // taken = a worker has it, the queue keeps it until the worker finishes
type NodeState = {
  slots: Slot[]; // worker and sink: entities inside; source: its outbox (phase out)
  items: Item[]; // queue: oldest first, never more than its cells
  seen: Record<string, true>; // sink: names finished
  reserved: number; // entities on their way that already have a place here
  acc: number; // source: fraction of the next arrival
  dropped: number; refused: number; done: number; duplicates: number;
};
type Transit = { e: Copy; link: string; to: string; left: number; reserved: boolean };
type Retry = NonNullable<LinkCfg["retry"]>;
type Pending = { link: string; from: string; to: string; e: Copy; due: number; tries: number; retry: Retry };
export type World = {
  tick: number; rng: number; params: Record<string, number | string>;
  nodes: Record<string, NodeState>; transits: Transit[]; pending: Pending[];
  faults: string[]; removed: string[]; next: number; uid: number; lost: Record<string, true>; done: number;
  spans: Record<string, { open: Record<string, number>; closed: [number, number][] }>;
};

export function createWorld(m: Model, seed = m.sim.seed): World {
  const blank = (): NodeState => ({ slots: [], items: [], seen: {}, reserved: 0, acc: 1, dropped: 0, refused: 0, done: 0, duplicates: 0 });
  return {
    tick: 0, rng: seed >>> 0, params: Object.fromEntries(Object.entries(m.sim.params).map(([k, p]) => [k, p.value])),
    nodes: Object.fromEntries(Object.keys(m.sim.nodes).map((id) => [id, blank()])), transits: [], pending: [],
    faults: [], removed: [], next: m.sim.entity.first, uid: 0, lost: {}, done: 0,
    spans: Object.fromEntries(Object.keys(m.sim.spans).map((id) => [id, { open: {}, closed: [] }])),
  };
}

function rand(w: World) { // mulberry32: same seed, same run
  let t = (w.rng = (w.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const num = (w: World, v: NumV) => (typeof v === "number" ? v : Number(w.params[v.param]));
const pick = <T extends string>(w: World, v: T | { param: string }) => (typeof v === "string" ? v : (w.params[v.param] as T));
const flag = (w: World, v: boolean | { param: string }) => (typeof v === "boolean" ? v : w.params[v.param] === "on");
const timeOf = (w: World, v: z.infer<typeof Time>) => (Array.isArray(v) ? v[0] + rand(w) * (v[1] - v[0]) : num(w, v));
const slotsOf = (w: World, node: SimNode) => (node.kind === "worker" ? Math.max(1, Math.round(num(w, node.concurrency))) : Infinity);
const isDown = (w: World, id: string) => w.faults.includes(`${id}.down`);
const cfgOf = (m: Model, link: string): LinkCfg => m.sim.links[link] ?? { latency: 1 };
const capOf = (m: Model, id: string) => m.capacity[id];
const waiting = (s: NodeState) => s.items.filter((i) => !i.taken).length;

// Where `id` sends now: its arrow, or the bridge around removed nodes (latencies add up, the first arrow's retry holds).
type Route = { link: string; to: string; cfg: LinkCfg; skipped: string[] };
function route(m: Model, w: World, id: string): Route | null {
  let link = m.out[id];
  if (!link) return null;
  let to = m.links[link].to;
  let cfg = cfgOf(m, link);
  const skipped: string[] = [];
  while (w.removed.includes(to)) {
    const next = m.out[to];
    cfg = { ...cfg, latency: cfg.latency + cfgOf(m, next).latency };
    skipped.push(to);
    link = `${to}-bridge`;
    to = m.links[next].to;
  }
  return { link, to, cfg, skipped };
}

// "yes" reserves a place, "late" accepts now and decides on arrival (drop or refuse), "no" makes the sender hold on.
function room(m: Model, w: World, to: string): "yes" | "late" | "no" {
  const node = m.sim.nodes[to];
  const s = w.nodes[to];
  if (isDown(w, to)) return "no";
  if (node.kind === "queue") {
    if (s.items.length + s.reserved < capOf(m, to)) return "yes";
    return pick(w, node.overflow) === "drop" ? "late" : "no";
  }
  if (node.kind === "worker") {
    if (s.slots.length + s.reserved < slotsOf(w, node)) return "yes";
    return pick(w, node.full) === "refuse" ? "late" : "no";
  }
  return "late";
}

type Out = { events: SimEvent[]; hops: Hop[] };
const ev = (w: World, o: Out, type: EventType, at: string, e?: Copy) => o.events.push({ type, at, entity: e && String(e.n), tick: w.tick });

function spanStart(m: Model, w: World, at: string, e: Copy) {
  for (const [id, s] of Object.entries(m.sim.spans)) if (s.from === at) w.spans[id].open[e.name] ??= w.tick;
}
function spanEnd(m: Model, w: World, at: string, e: Copy) {
  for (const [id, s] of Object.entries(m.sim.spans)) {
    const span = w.spans[id];
    if (s.to !== at || span.open[e.name] === undefined) continue;
    span.closed.push([w.tick, (w.tick - span.open[e.name]) * TICK]);
    delete span.open[e.name];
    while (span.closed.length && w.tick - span.closed[0][0] > WINDOW / TICK) span.closed.shift();
  }
}

// Another copy of this entity can still finish: on an arrow, in a slot (not one only waiting on a call) or waiting in a queue.
const alive = (w: World, name: string) => w.transits.some((t) => t.e.name === name)
  || Object.values(w.nodes).some((s) => s.slots.some((sl) => sl.phase !== "await" && sl.e.name === name) || s.items.some((i) => !i.taken && i.e.name === name));

// A copy of e is gone at `at` (crash, cut link, refused, dropped). In this order: a pending retry will send it
// again; the queue it came from (ack done) hands it out again; another copy decides its fate; a caller waiting on
// it fails in turn; otherwise it is over, and `lost` when nothing else counted it (refused and dropped count themselves).
function settle(m: Model, w: World, o: Out, at: string, e: Copy, lost: boolean) {
  if (w.pending.some((p) => p.e.name === e.name)) return;
  const held = e.from && !w.removed.includes(e.from) ? w.nodes[e.from].items.find((i) => i.taken && i.e.name === e.name) : undefined;
  if (held) {
    held.taken = false;
    return ev(w, o, "redelivered", e.from!, e);
  }
  if (alive(w, e.name)) return;
  const callers = Object.entries(w.nodes).flatMap(([id, s]) => {
    const mine = s.slots.filter((sl) => sl.phase === "await" && sl.e.name === e.name);
    s.slots = s.slots.filter((sl) => !mine.includes(sl));
    return mine.map((sl) => [id, sl] as const);
  });
  if (callers.length) return callers.forEach(([id, sl]) => settle(m, w, o, id, sl.e, lost));
  for (const s of Object.values(w.spans)) delete s.open[e.name];
  if (!lost || w.lost[e.name] || Object.values(w.nodes).some((s) => s.seen[e.name])) return;
  w.lost[e.name] = true;
  ev(w, o, "lost", at, e);
}

function send(m: Model, w: World, o: Out, from: string, e: Copy, r: Route, retry = true) {
  for (const id of r.skipped) { spanStart(m, w, id, e); spanEnd(m, w, id, e); } // a removed part takes no time
  const reserved = room(m, w, r.to) === "yes";
  if (reserved) w.nodes[r.to].reserved++;
  w.transits.push({ e, link: r.link, to: r.to, left: r.cfg.latency, reserved });
  o.hops.push({ link: r.link, from, to: r.to, entity: String(e.n), sec: r.cfg.latency, tick: w.tick });
  const rt = r.cfg.retry;
  if (retry && rt && flag(w, rt.enabled) && !w.pending.some((p) => p.e.name === e.name && p.to === r.to)) {
    w.pending.push({ link: r.link, from, to: r.to, e, due: w.tick + Math.round(rt.timeout / TICK), tries: 0, retry: rt });
  }
}

// `at` finished with e: retries stop, a caller waiting on it finishes too, the queue lets go of its copy.
function finish(m: Model, w: World, at: string, e: Copy) {
  w.pending = w.pending.filter((p) => !(p.e.name === e.name && p.to === at));
  if (e.from) w.nodes[e.from].items = w.nodes[e.from].items.filter((i) => !(i.taken && i.e.name === e.name));
  for (const [id, s] of Object.entries(w.nodes)) {
    const k = s.slots.findIndex((sl) => sl.phase === "await" && sl.to === at && sl.e.name === e.name);
    if (k < 0) continue;
    const [sl] = s.slots.splice(k, 1);
    s.done++;
    finish(m, w, id, sl.e);
  }
}

function arrive(m: Model, w: World, o: Out, t: Transit) {
  const s = w.nodes[t.to];
  if (t.reserved) s.reserved--;
  const node = m.sim.nodes[t.to];
  if (w.faults.includes(`${t.link}.cut`)) return settle(m, w, o, t.link, t.e, true);
  if (w.removed.includes(t.to) || isDown(w, t.to)) return settle(m, w, o, t.to, t.e, true);
  if (node.kind === "queue") {
    if (!t.reserved && s.items.length >= capOf(m, t.to)) {
      s.dropped++;
      ev(w, o, "dropped", t.to, t.e);
      return settle(m, w, o, t.to, t.e, false);
    }
    s.items.push({ e: t.e, taken: false });
    spanStart(m, w, t.to, t.e);
    return finish(m, w, t.to, t.e);
  }
  if (node.kind === "worker" && !t.reserved && s.slots.length >= slotsOf(w, node)) {
    s.refused++;
    ev(w, o, "refused", t.to, t.e);
    return settle(m, w, o, t.to, t.e, false);
  }
  if (node.kind === "sink" && flag(w, node.dedupe) && s.seen[t.e.name]) {
    ev(w, o, "deduped", t.to, t.e);
    return finish(m, w, t.to, t.e);
  }
  if (node.kind === "sink" && flag(w, node.dedupe) && s.slots.some((sl) => sl.e.name === t.e.name)) return ev(w, o, "deduped", t.to, t.e); // the first copy finishes for both
  s.slots.push({ e: t.e, phase: "work", left: timeOf(w, (node as { time: z.infer<typeof Time> }).time) });
  spanStart(m, w, t.to, t.e);
}

function apply(m: Model, w: World, o: Out, input: Input) {
  if ("param" in input) return void (w.params[input.param] = input.value);
  if ("burst" in input) {
    const node = m.sim.nodes[input.burst];
    if (node.kind === "source") for (let i = 0; i < (node.burst ?? 1); i++) emit(m, w, input.burst);
    return;
  }
  const key = "fault" in input ? input.fault : input.remove;
  const list = "fault" in input ? w.faults : w.removed;
  if (input.on === list.includes(key)) return;
  if (!input.on) return void list.splice(list.indexOf(key), 1);
  list.push(key);
  if ("fault" in input && !key.endsWith(".down")) return;
  const id = "fault" in input ? key.slice(0, -5) : key;
  const s = w.nodes[id];
  ev(w, o, "fault" in input ? "down" : "removed", id);
  const resend = w.pending.filter((p) => p.from === id); // a node that is gone sends nothing again
  w.pending = w.pending.filter((p) => p.from !== id);
  const gone = [...s.items.filter((i) => !i.taken).map((i) => i.e), ...s.slots.map((sl) => sl.e), ...resend.map((p) => p.e)];
  s.slots = [];
  s.items = [];
  for (const e of gone) settle(m, w, o, id, e, true);
}

function emit(m: Model, w: World, id: string) {
  const n = w.next++;
  const e = { name: `${m.sim.entity.kind} ${n}`, n, uid: ++w.uid };
  w.nodes[id].slots.push({ e, phase: "out", left: 0 });
  spanStart(m, w, id, e);
}

// One tick. Order is fixed (inputs, sources, work, arrivals, sends in node order, retries) so a seed always gives the same run.
export function step(m: Model, w: World, inputs: Input[] = []): Out {
  const o: Out = { events: [], hops: [] };
  for (const input of inputs) apply(m, w, o, input);
  const ids = Object.keys(m.sim.nodes).filter((id) => !w.removed.includes(id));
  const before = Object.fromEntries(ids.map((id) => [id, waiting(w.nodes[id])]));
  for (const id of ids) {
    const node = m.sim.nodes[id];
    if (node.kind !== "source") continue;
    const s = w.nodes[id];
    const rate = num(w, node.rate);
    if (node.arrivals === "poisson") { if (rand(w) < rate * TICK) emit(m, w, id); continue; }
    for (; s.acc >= 1 - EPS; s.acc -= 1) emit(m, w, id);
    s.acc += rate * TICK;
  }
  for (const id of ids) {
    const node = m.sim.nodes[id];
    const s = w.nodes[id];
    if ((node.kind !== "worker" && node.kind !== "sink") || isDown(w, id)) continue;
    const pace = w.faults.includes(`${id}.slow`) ? 1 / SLOW : 1;
    for (const sl of [...s.slots]) {
      if (sl.phase !== "work" || (sl.left -= TICK * pace) > EPS) continue;
      if (node.kind === "worker") { sl.phase = "out"; continue; }
      s.slots.splice(s.slots.indexOf(sl), 1);
      s.done++;
      w.done++;
      if (s.seen[sl.e.name]) { s.duplicates++; ev(w, o, "duplicate", id, sl.e); }
      s.seen[sl.e.name] = true;
      spanEnd(m, w, id, sl.e);
      finish(m, w, id, sl.e);
    }
  }
  const moving = w.transits;
  w.transits = [];
  for (const t of moving) {
    t.left -= TICK;
    if (t.left > EPS) w.transits.push(t);
    else arrive(m, w, o, t);
  }
  for (const id of ids) {
    const node = m.sim.nodes[id];
    const s = w.nodes[id];
    const r = route(m, w, id);
    if (!r || isDown(w, id)) continue;
    if (node.kind === "queue") {
      // hand out the oldest waiting one while the next part has room; a refusing worker only gets one per free slot
      for (let item = s.items.find((i) => !i.taken); item; item = s.items.find((i) => !i.taken)) {
        const fits = room(m, w, r.to);
        if (fits === "no" || (fits === "late" && m.sim.nodes[r.to].kind === "worker")) break;
        const keep = pick(w, node.ack) === "done";
        if (keep) item.taken = true;
        else s.items.splice(s.items.indexOf(item), 1);
        spanEnd(m, w, id, item.e);
        send(m, w, o, id, { ...item.e, from: keep ? id : undefined }, r);
      }
      if (before[id] && !waiting(s)) ev(w, o, "drained", id);
      continue;
    }
    for (const sl of s.slots.filter((x) => x.phase === "out")) {
      if (room(m, w, r.to) === "no") {
        if (!sl.blocked) ev(w, o, "blocked", r.to, sl.e);
        sl.blocked = true;
        continue;
      }
      spanEnd(m, w, id, sl.e);
      send(m, w, o, id, { ...sl.e, from: undefined }, r); // the queue's copy is the worker's business, not the receiver's
      if (node.kind === "worker" && node.awaits) Object.assign(sl, { phase: "await", to: r.to, blocked: false });
      else { s.slots.splice(s.slots.indexOf(sl), 1); if (node.kind === "worker") s.done++; finish(m, w, id, sl.e); }
    }
  }
  for (const p of [...w.pending]) {
    if (w.tick < p.due) continue;
    const r = route(m, w, p.from);
    if (!r || r.to !== p.to || !flag(w, p.retry.enabled) || p.tries >= p.retry.max) {
      w.pending.splice(w.pending.indexOf(p), 1); // gives up: what happens now depends on whether a copy still gets there
      settle(m, w, o, p.link, p.e, true);
      continue;
    }
    if (room(m, w, p.to) === "no") continue;
    p.tries++;
    p.due = w.tick + Math.round((p.retry.timeout * p.retry.backoff ** p.tries) / TICK);
    ev(w, o, "retried", p.link, p.e);
    send(m, w, o, p.from, { ...p.e, uid: ++w.uid }, r, false);
  }
  w.tick++;
  return o;
}

// ---- reading the world ----

export function metricsOf(m: Model): string[] {
  return [
    "lost", "done",
    ...Object.entries(m.sim.nodes).flatMap(([id, n]) => KINDS[n.kind].metrics.map((k) => `${id}.${k}`)),
    ...Object.keys(m.sim.spans).flatMap((id) => ["p50", "p90", "max"].map((k) => `${id}.${k}`)),
  ];
}

const percentile = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
};
const round = (v: number) => Math.round(v * 10) / 10;

// A metric's value now. Span percentiles cover the last WINDOW seconds, counting entities still on the way
// at their age so far, so a stall shows up while it happens and not only once it ends.
export function metric(m: Model, w: World, name: string): number {
  if (name === "lost") return Object.keys(w.lost).length;
  if (name === "done") return w.done;
  const [id, k] = name.split(".");
  if (w.spans[id]) {
    const span = w.spans[id];
    const recent = span.closed.filter(([t]) => w.tick - t <= WINDOW / TICK).map(([, sec]) => sec);
    const ages = Object.values(span.open).map((t) => (w.tick - t) * TICK);
    const all = [...recent, ...ages];
    return round(k === "max" ? Math.max(0, ...all) : percentile(all, k === "p50" ? 0.5 : 0.9));
  }
  const s = w.nodes[id];
  const node = m.sim.nodes[id];
  if (k === "length") return node.kind === "queue" ? s.items.length : s.slots.filter((x) => x.phase === "out").length;
  if (k === "busy") return s.slots.length;
  if (k === "utilization") return round(s.slots.length / slotsOf(w, node));
  return s[k as "dropped" | "refused" | "done" | "duplicates"];
}

// How the board looks now, as the same ops a video uses: queue slots hold entity numbers (the ones a worker has
// but the queue still keeps glow); workers and sinks are muted when idle, accent when busy, bad when down;
// a worker's badge shows its slot count.
export type ViewOp = { op: "fill"; id: string; items: string[]; highlight: number[] } | { op: "color"; id: string; color: "muted" | "accent" | "bad" } | { op: "set"; id: string; state: { text: string } };
export function view(m: Model, w: World): ViewOp[] {
  return Object.entries(m.sim.nodes).flatMap(([id, node]): ViewOp[] => {
    const s = w.nodes[id];
    if (node.kind === "queue") {
      const items = s.items.map((i) => String(i.e.n));
      const highlight = s.items.flatMap((i, k) => (i.taken ? [k] : []));
      return [{ op: "fill", id, items: [...items, ...Array<string>(capOf(m, id) - items.length).fill("")], highlight }];
    }
    if (node.kind === "source") return [];
    const color = isDown(w, id) ? "bad" : s.slots.length ? "accent" : "muted";
    const badge: ViewOp[] = node.kind === "worker" && node.show ? [{ op: "set", id: node.show.concurrency, state: { text: `x${slotsOf(w, node)}` } }] : [];
    return [{ op: "color", id, color }, ...badge];
  });
}
