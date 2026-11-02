import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { appendLine, applyColors, initialColors, parseGame, pickOutcome, walkthrough } from "../src/game.ts";
import { buildTimeline, type Voiced } from "../src/timeline.ts";

const example = JSON.parse(readFileSync(new URL("../examples/queue-decoupling.game.json", import.meta.url), "utf8"));

test("example game parses into a linear walkthrough", () => {
  const { game, issues } = parseGame(example);
  assert.deepEqual(issues, []);
  const spec = walkthrough(game!);
  // board + intro + 5 inspect lines + 3 + 2 + 2 + 2 outcomes
  assert.equal(spec.beats.length, 1 + 1 + 5 + 9);
  assert.equal(spec.beats[0].do.length, game!.scene.length);
});

test("outcomes follow the board's colors", () => {
  const game = parseGame(example).game!;
  const order = game.events.find((e) => e.id === "order")!;
  const crash = game.events.find((e) => e.id === "crash")!;
  let colors = initialColors(game);
  assert.equal(colors.worker, "accent");
  assert.equal(colors.pay, "muted");
  assert.equal(pickOutcome(order, colors), 2);
  colors = applyColors(colors, crash.outcomes[pickOutcome(crash, colors)]);
  assert.equal(colors.worker, "bad");
  assert.equal(pickOutcome(order, colors), 0);
  assert.equal(pickOutcome(crash, colors), 0);
});

test("appendLine starts each line where the player acted", () => {
  const game = parseGame(example).game!;
  const [board] = walkthrough(game).beats;
  let live = { beats: [board], voiced: [{ file: null, sec: 0 }] as Voiced[] };
  live = appendLine(live, game.intro, { file: "intro.wav", sec: 3 }, 0);
  live = appendLine(live, game.inspect.queue, { file: "q.wav", sec: 2 }, 4);
  const t = buildTimeline({ ...walkthrough(game), beats: live.beats }, live.voiced);
  // board 2 s, intro 3 + 1 s quiet, 4 s idle gap, then the queue line
  assert.deepEqual(t.beats.map((b) => b.start), [0, 60, 180, 300]);
  assert.equal(t.beats[3].audio, "q.wav");
});

test("game mistakes are reported where they are in the game file", () => {
  const bad = structuredClone(example);
  bad.events[0].outcomes[0].do.push({ op: "add", type: "box", id: "x", label: "X" });
  bad.events[1].outcomes.reverse();
  bad.events[2].outcomes[0].do[1].ids = ["nope"];
  bad.inspect.ghost = { say: "boo" };
  const { issues } = parseGame(bad);
  assert.deepEqual(issues.map((i) => i.path), ["events.0.outcomes.0.do.1"]);
  delete bad.events[0].outcomes[0].do[1];
  bad.events[0].outcomes[0].do = bad.events[0].outcomes[0].do.filter(Boolean);
  assert.deepEqual(parseGame(bad).issues, [
    { path: "events.2.outcomes.0.do.1", message: "trace step 'nope' is not a live arrow" },
    { path: "events.1.outcomes", message: "the last outcome must have no `if`, so every press does something" },
    { path: "inspect.ghost", message: "'ghost' is not on the board" },
  ]);
});
