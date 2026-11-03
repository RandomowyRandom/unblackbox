import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { linesOf, parseGame, simulate, verify, walkthrough } from "../src/game.ts";

const example = JSON.parse(readFileSync(new URL("../examples/queue-decoupling.game.json", import.meta.url), "utf8"));
const issues = (edit: (g: any) => void) => {
  const g = structuredClone(example);
  edit(g);
  return parseGame(g).issues.map((i) => `${i.path}: ${i.message}`);
};
const checked = (edit: (g: any) => void) => {
  const g = structuredClone(example);
  edit(g);
  const { game, model, issues } = parseGame(g);
  assert.deepEqual(issues, []);
  return verify(game!, model!);
};

test("the example verifies on every seed with nothing to warn about", () => {
  const { game, model } = parseGame(example);
  const { errors, warnings, runs } = verify(game!, model!);
  assert.deepEqual([errors, warnings], [[], []]);
  assert.deepEqual(runs[0], { run: "defaults", peak: { lost: 0, "queue.length": 0, "customerWait.p90": 1.1, "mail.duplicates": 0 }, notes: [] });
  const crash = runs.find((r) => r.run === "keepIt: setup")!;
  assert.equal(crash.peak.lost, 1);
  assert.ok(crash.notes.includes(3)); // "The worker crashed holding this order"
});

test("every line has a voice key and a path; the walkthrough is the board then the lines", () => {
  const { game } = parseGame(example);
  const lines = linesOf(game!);
  assert.deepEqual(lines.slice(0, 2).map((l) => [l.key, l.path]), [["stage.run", "stages.0.say"], ["challenge.keepIt.ask", "challenges.0.ask"]]);
  assert.equal(walkthrough(game!).beats.length, lines.length + 1);
});

test("runs are deterministic and the board they leave is drawn with the scene's own components", () => {
  const { game, model } = parseGame(example);
  const plan = { name: "x", sec: 30, params: { rate: 1 } };
  assert.deepEqual(simulate(game!, model!, plan, 3), simulate(game!, model!, plan, 3));
  const ops = simulate(game!, model!, plan, 3).ops;
  const fill = ops.find((o) => o.op === "fill")!;
  assert.ok(fill.op === "fill" && fill.id === "queue" && fill.items.length === 4);
  assert.ok(ops.some((o) => o.op === "set" && o.id === "depth"));
});

test("shape and meaning mistakes are reported where they are in the game file", () => {
  assert.deepEqual(issues((g) => { g.sim.nodes.worker.lable = "x"; }), ['sim.nodes.worker: Unrecognized key: "lable"']);
  assert.deepEqual(issues((g) => {
    g.sim.params.workers.value = 4;
    g.sim.nodes.queue.ack = { param: "retry" };
  }), [
    "sim.nodes.queue.ack: param 'retry' has options off, on; ack needs take, done",
    "sim.params.workers.value: 4 is outside 1..3",
    `sim.params.ack: param 'ack' feeds no field; point a field at it with { "param": "ack" }`,
  ]);
  assert.deepEqual(issues((g) => { g.probes[2].show = "worker"; }), [
    "probes.2.show: 'worker' is box; a number needs a counter, gauge, progress or chart",
    "challenges.0.goal.0.metric: 'lost' is not shown by any probe; the player must see what the goal checks",
    "stages.1.reveal.0: 'lost' is not a probe's element: depth, wait, dupes",
  ]);
  assert.deepEqual(issues((g) => {
    g.stages[0].controls.push("worker.crash");
    g.challenges[0].controls.push("worker.down");
    g.stages[1].reveal = [];
    g.stages.pop();
  }), [
    "challenges.0.controls: 'worker.down' is driven by the script; it cannot also be a control",
    "stages.0.controls.2: 'worker.crash' is not a control; 'worker' has worker.down, worker.slow",
    "challenges.0.goal.0.metric: 'lost' (lost) is not revealed by stage 'crash' or before it",
    'stages.3.controls: the last stage is the sandbox; give it "controls": "all"',
  ]);
});

test("the headless runs catch a solution that fails, a predict that cannot decide and a note that never fires", () => {
  const { errors, warnings } = checked((g) => {
    g.challenges[0].solution = [{ at: 0, param: "workers", value: 3 }];
    g.challenges[0].controls = ["workers"];
    g.challenges[1].predict.options[0].when = { metric: "customerWait.p90", at: "peak", moreThan: 1 };
    g.notes.push({ on: "refused", at: "worker", say: "The worker turned this order away." });
  });
  assert.deepEqual(errors.map((e) => e.path), ["challenges.0.solution", "challenges.1.predict.options"]);
  assert.match(errors[0].message, /^lost = 1 at 30 s \(seed \d\); goal needs lost ≤ 0$/);
  assert.match(errors[1].message, /^options 0, 1 all hold on seed \d; exactly one must$/);
  // workers=3 is no solution, so no crash ever redelivers (notes.4) either
  assert.deepEqual(warnings, [{ path: "notes.4", message: "never fired in 236 runs" }, { path: "notes.7", message: "never fired in 236 runs" }]);
});

test("a goal the setup already meets teaches nothing", () => {
  const { errors } = checked((g) => { g.challenges[0].setup.params.ack = "done"; g.challenges[0].predict = undefined; });
  assert.deepEqual(errors, [{ path: "challenges.0", message: "the setup already meets the goal on every seed; it teaches nothing" }]);
});
