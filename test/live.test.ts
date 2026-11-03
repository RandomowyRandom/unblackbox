import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseGame } from "../src/game.ts";
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
