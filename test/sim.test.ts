import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorld, metric, modelOf, Sim, step, TICK, type Input, type Model, type SimEvent, type World } from "../src/sim.ts";
import { parseSpec, type Add } from "../src/spec.ts";

const scene = parseSpec({ title: "t", beats: [{ do: [
  { op: "add", type: "icon", id: "customer", icon: "user", at: [1, 4] },
  { op: "add", type: "box", id: "checkout", label: "Checkout", at: [4, 4] },
  { op: "add", type: "cells", id: "queue", items: ["", "", "", ""], at: [8, 4] },
  { op: "add", type: "box", id: "worker", label: "Worker", at: [12, 4] },
  { op: "add", type: "icon", id: "mail", icon: "mail", at: [15, 4] },
  { op: "add", type: "arrow", id: "pay", from: "customer", to: "checkout", label: "pay" },
  { op: "add", type: "arrow", id: "enqueue", from: "checkout", to: "queue", label: "order" },
  { op: "add", type: "arrow", id: "deliver", from: "queue", to: "worker", label: "next" },
  { op: "add", type: "arrow", id: "send", from: "worker", to: "mail", label: "send" },
] }] }).spec!.beats[0].do as Add[];

function model(nodes: Record<string, object> = {}, links: Record<string, object> = {}): Model {
  const sim = Sim.parse({
    entity: { kind: "order", icon: "receipt", first: 1041 },
    nodes: {
      customer: { kind: "source", rate: 0.25 },
      checkout: { kind: "worker", time: 0.3, concurrency: 4 },
      queue: { kind: "queue", removable: { bridge: "order" } },
      worker: { kind: "worker", time: 1.5, awaits: true },
      mail: { kind: "sink", time: 0.5 },
      ...nodes,
    },
    links: { pay: { latency: 0.8 }, ...links },
    spans: { wait: { from: "customer", to: "checkout" } },
  });
  const { model, issues } = modelOf(sim, scene);
  assert.deepEqual(issues, []);
  return model!;
}

// Runs `sec` seconds; inputs keyed by the second they happen at.
function run(m: Model, sec: number, at: Record<number, Input[]> = {}, seed = 1) {
  const w = createWorld(m, seed);
  const events: SimEvent[] = [];
  const peak: Record<string, number> = {};
  const due = new Map(Object.entries(at).map(([sec, inputs]) => [Math.round(Number(sec) / TICK), inputs]));
  for (let t = 0; t < sec / TICK; t++) {
    events.push(...step(m, w, due.get(t)).events);
    for (const k of ["queue.length", "wait.p90", "lost"]) peak[k] = Math.max(peak[k] ?? 0, metric(m, w, k));
  }
  const count = (type: string, at?: string) => events.filter((e) => e.type === type && (!at || e.at === at)).length;
  return { w, events, peak, count, metric: (k: string) => metric(m, w, k) };
}

test("a calm system delivers everything and the wait is pay plus checkout", () => {
  const r = run(model(), 30);
  assert.equal(r.metric("lost"), 0);
  assert.ok(r.metric("mail.done") >= 6, `done ${r.metric("mail.done")}`);
  assert.equal(r.peak["wait.p90"], 1.1);
});

test("a slow worker fills the queue; block makes checkout hold on, drop throws orders away", () => {
  const slow = { customer: { kind: "source", rate: 1 }, worker: { kind: "worker", time: 4, awaits: true } };
  const block = run(model(slow, {}), 40);
  assert.equal(block.peak["queue.length"], 4);
  assert.ok(block.count("blocked", "queue") > 0);
  assert.equal(block.count("dropped"), 0);
  const drop = run(model({ ...slow, queue: { kind: "queue", overflow: "drop" } }), 40);
  assert.ok(drop.count("dropped", "queue") > 0);
  assert.equal(drop.count("blocked", "queue"), 0);
});

test("a crash loses the order with ack take, and redelivers it with ack done", () => {
  const crash = { 5: [{ fault: "worker.down", on: true }], 10: [{ fault: "worker.down", on: false }] };
  const take = run(model({ worker: { kind: "worker", time: 3, awaits: true, faults: ["down"] } }), 30, crash);
  assert.ok(take.metric("lost") >= 1);
  const done = run(model({ worker: { kind: "worker", time: 3, awaits: true, faults: ["down"] }, queue: { kind: "queue", ack: "done" } }), 30, crash);
  assert.equal(done.metric("lost"), 0);
  assert.ok(done.count("redelivered", "queue") >= 1);
});

test("a retry on a slow receiver sends twice; an idempotency key absorbs the copy", () => {
  const retry = { send: { latency: 0.8, retry: { timeout: 1.5, max: 2 } } };
  const slow = { 0: [{ fault: "mail.slow", on: true }] };
  const dup = run(model({ mail: { kind: "sink", time: 0.5, faults: ["slow"] } }, retry), 20, slow);
  assert.ok(dup.metric("mail.duplicates") > 0 && dup.count("retried", "send") > 0);
  const keyed = run(model({ mail: { kind: "sink", time: 0.5, faults: ["slow"], dedupe: true } }, retry), 20, slow);
  assert.equal(keyed.metric("mail.duplicates"), 0);
  assert.ok(keyed.count("deduped", "mail") > 0);
});

test("without the queue a slow worker makes customers wait", () => {
  const cut = { 0: [{ remove: "queue", on: true }], 5: [{ fault: "worker.slow", on: true }] };
  const r = run(model({ worker: { kind: "worker", time: 1.5, awaits: true, faults: ["slow"] } }), 25, cut);
  assert.ok(r.count("blocked", "worker") > 0);
  assert.ok(r.peak["wait.p90"] > 2, `p90 ${r.peak["wait.p90"]}`);
  const kept = run(model({ worker: { kind: "worker", time: 1.5, awaits: true, faults: ["slow"] } }), 25, { 5: cut[5] });
  assert.equal(kept.peak["wait.p90"], 1.1);
});

test("same seed, same run; poisson arrivals differ by seed", () => {
  const m = model({ customer: { kind: "source", rate: 1, arrivals: "poisson" } });
  assert.deepEqual(run(m, 20, {}, 3).events, run(m, 20, {}, 3).events);
  assert.notDeepEqual(run(m, 20, {}, 3).events, run(m, 20, {}, 4).events);
});

test("model errors name the field", () => {
  const sim = Sim.parse({
    entity: { kind: "order", icon: "receipt" },
    params: { mode: { label: "Mode", options: ["off", "on"], value: "off" } },
    nodes: { customer: { kind: "source", rate: 1 }, queue: { kind: "queue", ack: { param: "mode" } }, worker: { kind: "sink" } },
  });
  assert.deepEqual(modelOf(sim, scene).issues.map((i) => `${i.path}: ${i.message}`), [
    "sim.nodes.customer: no flow arrow leaves 'customer'; draw an arrow to the next node, or make it a sink",
    "sim.nodes.queue: no flow arrow reaches 'queue'",
    "sim.nodes.queue.ack: param 'mode' has options off, on; ack needs take, done",
  ]);
});

test("a synchronous worker recovers when what it sent is lost, and a bridge keeps the arrow's retry", () => {
  const down = { 6: [{ fault: "mail.down", on: true }], 7: [{ fault: "mail.down", on: false }] };
  const r = run(model({ mail: { kind: "sink", time: 2, faults: ["down"] } }), 60, down);
  assert.equal(r.metric("lost"), 1);
  assert.ok(r.metric("mail.done") >= 8, `done ${r.metric("mail.done")}`); // not stuck awaiting the lost order
  const bridged = run(model({}, { enqueue: { latency: 1, retry: { timeout: 3, max: 3 } } }), 30, { 0: [{ remove: "queue", on: true }] });
  assert.equal(bridged.metric("lost"), 0);
  assert.equal(bridged.count("retried"), 0);
});

test("a crash while waiting on mail loses nothing: mail still has the order", () => {
  const r = run(model({ worker: { kind: "worker", time: 0.5, awaits: true, faults: ["down"] }, mail: { kind: "sink", time: 3 } }), 30, { 5: [{ fault: "worker.down", on: true }] });
  assert.equal(r.metric("lost"), 0);
  assert.equal(r.count("lost"), 0);
});

// Every entity ends exactly one way (finished at a sink, lost, dropped or refused) or is still inside, under random levers and faults.
test("conservation under random faults, removals and retries", () => {
  const m = model(
    { customer: { kind: "source", rate: 1, burst: 5 }, checkout: { kind: "worker", time: 0.3, concurrency: 2, full: "refuse", faults: ["down"] },
      queue: { kind: "queue", overflow: "drop", ack: "done", removable: { bridge: "order" } },
      worker: { kind: "worker", time: [0.5, 2], awaits: true, faults: ["down", "slow"] }, mail: { kind: "sink", time: [0.2, 3], faults: ["down", "slow"], dedupe: true } },
    { pay: { latency: 0.8, retry: { timeout: 2, max: 2 } }, deliver: { latency: 0.5 }, send: { latency: 0.8, retry: { timeout: 1.5, max: 2, backoff: 2 }, faults: ["cut"] } },
  );
  const controls: Input[] = ["checkout.down", "worker.down", "worker.slow", "mail.down", "mail.slow", "send.cut"].flatMap((f) => [{ fault: f, on: true }, { fault: f, on: false }]);
  controls.push({ remove: "queue", on: true }, { remove: "queue", on: false }, { burst: "customer" });
  for (let seed = 1; seed <= 40; seed++) {
    let x = seed;
    const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    const w = createWorld(m, seed);
    const ended: Record<string, string[]> = {};
    let made = 0;
    for (let t = 0; t < 600; t++) {
      const inputs = rnd() < 0.05 ? [controls[Math.floor(rnd() * controls.length)]] : [];
      for (const e of step(m, w, inputs).events) if (["lost", "dropped", "refused"].includes(e.type)) (ended[e.entity!] ??= []).push(e.type);
      made = w.next - 1041;
    }
    const inside = (w2: World, n: string) => w2.transits.some((tr) => String(tr.e.n) === n) || w2.pending.some((p) => String(p.e.n) === n)
      || Object.values(w2.nodes).some((s) => s.slots.some((sl) => String(sl.e.n) === n) || s.items.some((i) => String(i.e.n) === n));
    for (let n = 1041; n < 1041 + made; n++) {
      const name = String(n);
      const done = !!w.nodes.mail.seen[`order ${n}`];
      const lost = (ended[name] ?? []).filter((k) => k === "lost").length;
      assert.ok(lost <= 1, `seed ${seed}: order ${n} lost ${lost} times`);
      assert.ok(!(done && lost), `seed ${seed}: order ${n} delivered and lost`);
      assert.ok(done || ended[name] || inside(w, name), `seed ${seed}: order ${n} vanished`);
    }
  }
});
