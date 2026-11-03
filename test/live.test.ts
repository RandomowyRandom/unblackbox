import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseGame, scheduler } from "../src/game.ts";
import { Live } from "../src/live.ts";

const example = JSON.parse(readFileSync(new URL("../examples/queue-decoupling.game.json", import.meta.url), "utf8"));
const { game, model } = parseGame(example);
const live = () => new Live(game!, model!);
const ids = (l: Live) => l.t.tracks.filter((tr) => tr.end === null).map((tr) => tr.el.id);

test("ten minutes under load keep the timeline small: history folds into the elements", () => {
  const l = live();
  l.input({ param: "rate", value: 1 });
  const sizes: number[] = [];
  for (let min = 0; min < 10; min++) {
    l.input({ fault: "worker.down", on: min % 2 === 1 });
    l.advance(60 * 30);
    sizes.push(l.t.tracks.length + l.t.traces.length + l.t.tracks.reduce((n, tr) => n + tr.sets.length + tr.colors.length + tr.pulses.length, 0));
  }
  assert.ok(Math.max(...sizes) < 120, `sizes ${sizes}`);
  assert.ok(Math.max(...sizes.slice(5)) <= Math.max(...sizes.slice(0, 5)) * 1.5, `growing: ${sizes}`);
  assert.ok(l.w.next - 1041 > 500);
});

test("taking the queue out fades it and its arrows and draws a bridge; putting it back reverses that", () => {
  const l = live();
  l.advance(90);
  l.input({ remove: "queue", on: true });
  l.advance(90);
  assert.ok(!ids(l).includes("queue") && !ids(l).includes("enqueue") && !ids(l).includes("deliver"));
  const bridge = l.t.tracks.find((tr) => tr.el.id === "queue-bridge" && tr.end === null)!;
  assert.deepEqual([bridge.el.type === "arrow" && bridge.el.from, bridge.el.type === "arrow" && bridge.el.to], ["checkout", "worker"]);
  l.advance(300);
  assert.ok(l.t.traces.some((ev) => ev.ids[0] === "queue-bridge"), "orders ride the bridge");
  l.input({ remove: "queue", on: false });
  l.advance(90);
  assert.ok(ids(l).includes("queue") && ids(l).includes("enqueue") && !ids(l).includes("queue-bridge"));
});

test("packets carry the order number up to the audience limit; faults show on the board; notes fire once", () => {
  const l = live();
  l.input({ param: "rate", value: 1 });
  const said = l.advance(30 * 30);
  assert.ok(l.t.traces.some((ev) => ev.label?.startsWith("10") && ev.icon === "receipt"));
  assert.deepEqual(said.map((s) => s.key), ["note.0", "note.1"]); // piling up, then the queue is full
  assert.deepEqual(l.advance(30 * 30), []);
  l.input({ fault: "worker.slow", on: true });
  l.input({ fault: "worker.down", on: true });
  l.advance(3);
  assert.ok(ids(l).includes("worker-slow"));
  const worker = l.t.tracks.find((tr) => tr.el.id === "worker")!;
  assert.equal(worker.colors.at(-1)?.color, "bad");
});

test("step runs on until something moves, and inspect lines land at the current frame", () => {
  const l = live();
  const before = l.moved;
  l.stepToNext();
  assert.equal(l.moved, before + 1);
  const said = l.line("inspect.queue", { say: "The queue holds orders.", do: [{ op: "pulse", id: "queue" }] });
  assert.deepEqual(said, { key: "inspect.queue", say: "The queue holds orders." });
  assert.ok(l.t.tracks.find((tr) => tr.el.id === "queue")!.pulses.includes(l.frame));
});

test("a challenge plays as the build proved it, and a replay with the same inputs is the same run", () => {
  const c = game!.challenges.find((x) => x.id === "keepIt")!;
  const script = () => scheduler(c.setup.script, c.setup.params, c.setup.removed);
  const lost = new Live(game!, model!, { script: script() });
  lost.advance(c.by * 30);
  assert.equal(lost.now.lost, 1); // ack take: the crash loses the order it held
  const fixed = new Live(game!, model!, { script: script() });
  fixed.input({ param: "ack", value: "done" });
  fixed.advance(c.by * 30);
  assert.equal(fixed.now.lost, 0);
  const base = script();
  const again = new Live(game!, model!, { script: (w) => [...base(w), ...fixed.log.filter((x) => x.tick === w.tick).map((x) => x.input)] });
  again.advance(c.by * 30);
  assert.deepEqual([again.now, again.peak], [fixed.now, fixed.peak]);
});

test("probes a stage has not revealed are not on the board; the last run rides along on the chart", () => {
  const l = new Live(game!, model!, { hide: ["lost", "wait"], ghost: { depth: [0, 1, 2, 3, 4, 4] } });
  l.advance(10 * 30);
  assert.ok(!ids(l).includes("lost") && !ids(l).includes("wait") && ids(l).includes("depth"));
  const chart = l.t.tracks.find((tr) => tr.el.id === "depth")!;
  const last = ((chart.sets.at(-1)?.state ?? chart.el) as { series: unknown }).series as { label: string; points: number[]; color?: string }[];
  assert.deepEqual(last.map((s) => [s.label, s.color]), [["queue", undefined], ["last run", "muted"]]);
  assert.equal(last[1].points.length, last[0].points.length);
});
