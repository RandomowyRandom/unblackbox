import assert from "node:assert/strict";
import { test } from "node:test";
import { lint, parseSpec } from "../src/spec.ts";
import { buildTimeline, settledFrame, toSrt } from "../src/timeline.ts";

const code = "const a = 1\nconst b = 2";
const base = {
  title: "t",
  beats: [
    { say: "one", do: [{ op: "add", type: "code", id: "c", lang: "ts", code }] },
    { say: "two", do: [{ op: "focus", id: "c", lines: [[2, 2]], wait: 1 }, { op: "morph", id: "c", code: "const b = 3" }] },
    { hold: 2, do: [{ op: "clear" }] },
  ],
};

test("valid spec fills defaults", () => {
  const { spec } = parseSpec(base);
  assert.ok(spec);
  assert.deepEqual(spec.format, { width: 1920, height: 1080, fps: 30 });
  assert.equal(spec.voice.provider, "kokoro");
});

test("timeline turns seconds into frames", () => {
  const { spec } = parseSpec(base);
  const t = buildTimeline(spec!, [{ file: "a.wav", sec: 2 }, { file: null, sec: 0.2 }, { file: null, sec: 0 }]);
  // beat 1: 2s speech + 1.0 pad; beat 2: focus wait 1 + 1.2 anim beats 1.2 speech+pad and 2 min; beat 3: hold 2
  assert.deepEqual(t.beats.map((b) => [b.start, b.frames]), [[0, 90], [90, 66], [156, 60]]);
  assert.equal(t.totalFrames, 216 + 45);
  assert.deepEqual(t.focus.map((f) => f.frame), [120, 156]);
  const [c] = t.tracks;
  assert.deepEqual([c.start, c.end, c.morphs[0].frame], [0, 156, 90]);
  assert.equal(settledFrame(t, 1), 155);
  assert.equal(toSrt(t), "1\n00:00:00,000 --> 00:00:02,000\none\n\n2\n00:00:03,000 --> 00:00:03,200\ntwo\n");
});

test("semantic errors carry paths", () => {
  const bad = {
    title: "t",
    beats: [
      { do: [{ op: "add", type: "box", id: "b", label: "B" }, { op: "morph", id: "b", code: "x" }] },
      { do: [{ op: "focus", id: "ghost" }, { op: "add", type: "arrow", id: "a", from: "b", to: "nope" }] },
      { do: [{ op: "remove", id: "b" }, { op: "add", type: "text", id: "b", text: "again" }] },
    ],
  };
  assert.deepEqual(parseSpec(bad).issues, [
    { path: "beats.0.do.1", message: "morph needs a code element, 'b' is box" },
    { path: "beats.1.do.0", message: "'ghost' is not on screen at this point" },
    { path: "beats.1.do.1", message: "'nope' is not on screen at this point" },
    { path: "beats.2.do.0", message: "'b' is still used by arrow 'a'; remove that first" },
    { path: "beats.2.do.1", message: "id 'b' already used; ids are unique for the whole video" },
  ]);
});

test("line ranges checked against current code", () => {
  const spec = structuredClone(base);
  (spec.beats[1].do[0] as { lines: number[][] }).lines = [[1, 3]];
  assert.deepEqual(parseSpec(spec).issues, [{ path: "beats.1.do.0", message: "line range [1, 3] invalid; code has 2 lines" }]);
});

test("schema errors carry paths", () => {
  const { issues } = parseSpec({ title: "t", beats: [{ do: [{ op: "add", type: "box", id: "b", label: "B", color: "#fff" }] }] });
  assert.equal(issues[0].path, "beats.0.do.0.color");
});

const flow = {
  title: "flow",
  audience: "novice",
  beats: [
    {
      say: "A request hits the api.",
      do: [
        { op: "add", type: "box", id: "api", label: "API", at: [4, 4.5] },
        { op: "add", type: "box", id: "db", label: "DB", at: [12, 4.5] },
        { op: "add", type: "arrow", id: "q", from: "api", to: "db", label: "query" },
        { op: "trace", ids: ["q"], wait: 1 },
      ],
    },
    { say: "What happens next?", think: 3, do: [{ op: "focus", id: ["api", "db"] }, { op: "camera", to: [12, 4.5], zoom: 2 }] },
    { do: [{ op: "clear" }] },
  ],
};

test("trace, think, camera and audience shape the timeline", () => {
  const { spec } = parseSpec(flow);
  const t = buildTimeline(spec!, [{ file: null, sec: 1 }, { file: null, sec: 1 }, { file: null, sec: 0 }]);
  // beat 1: trace wait 1 + 1 step 1.0 + anim 1.2 = 3.2s beats 1s speech + novice pad 1.2
  // beat 2: 1 + 1.2 pad + 3 think = 5.2s; beat 3: 2s minimum
  assert.deepEqual(t.beats.map((b) => [b.frames, b.thinkFrames]), [[96, 0], [156, 90], [60, 0]]);
  assert.deepEqual(t.traces, [{ frame: 30, ids: ["q"], label: undefined, icon: undefined, step: 30, color: undefined }]);
  assert.deepEqual(t.focus[0].ids, ["api", "db"]);
  assert.deepEqual(t.camera.map((c) => [c.frame, c.zoom]), [[96, 2], [252, 1]]);
  // think beat still lands mid-window so the question overlay is fully visible
  assert.equal(settledFrame(t, 1), 96 + 156 - 1 - 45);
});

test("trace and multi-focus are checked", () => {
  const bad = structuredClone(flow) as any;
  bad.beats[0].do[3].ids = ["api"];
  bad.beats[1].do[0] = { op: "focus", id: ["api", "db"], lines: [[1, 1]] };
  assert.deepEqual(parseSpec(bad).issues, [
    { path: "beats.0.do.3.ids.0", message: "trace step 'api' is not a live arrow" },
    { path: "beats.1.do.0", message: "focus lines needs exactly one code element" },
  ]);
});

test("lint flags research-backed problems", () => {
  const spec = parseSpec({
    title: "t",
    audience: "novice",
    beats: [
      {
        say: "Look at isExpired before we show it.",
        do: [
          ...["a", "b", "c", "d", "e"].map((id, i) => ({ op: "add", type: "box", id, label: id, at: [2 + i * 3, 2] })),
          { op: "add", type: "arrow", id: "x", from: "a", to: "b" },
          { op: "add", type: "arrow", id: "y", from: "c", to: "d", label: "y" },
          { op: "trace", ids: ["x", "y"] },
          { op: "add", type: "code", id: "fn", lang: "ts", code: ["// here we return age greater than max", "return age > maxAgeMs;"] },
        ],
      },
      { say: "Here we return age greater than max age ms.", think: 2, do: [] },
    ],
  }).spec!;
  assert.deepEqual(lint(spec, 400), [
    { path: "beats.0.do.4", message: "more than 4 elements on screen; split the scene or zoom" },
    { path: "beats.0.do.5", message: "arrow has no label; name what flows along it" },
    { path: "beats.0.do.7", message: "trace jumps from 'x' to 'y'; each arrow should start where the last ended" },
    { path: "beats.0.say", message: "'isExpired' is a function or variable name; talk about the component and what it does" },
    { path: "beats.1.say", message: "narration reads a code line aloud; say what it means instead" },
    { path: "beats.1.say", message: "a think beat should end with the question to predict" },
    { path: "beats", message: "only text boxes; give key components icons, and use icons, cells and packets so the picture carries meaning" },
    { path: "beats", message: "no real example end to end: trace one concrete case (label it like 'order 1042') through every component, trigger to result" },
    { path: "beats", message: "about 7 min; split into a series of videos under 6 min" },
  ]);
  assert.equal((spec.beats[0].do[8] as { code: string }).code, "// here we return age greater than max\nreturn age > maxAgeMs;");
});

test("lint keeps videos system-level and visual", () => {
  const long = Array.from({ length: 10 }, (_, i) => `line ${i}`);
  const spec = parseSpec({
    title: "t",
    beats: [
      { say: "The OrderService talks to the database.", do: [
        { op: "add", type: "box", id: "m", label: "Order service that talks to the database", icon: "refresh-cw", at: [2, 2] },
        { op: "add", type: "code", id: "c1", lang: "ts", code: long, at: [8, 3] },
      ] },
      { do: [{ op: "morph", id: "c1", code: "a" }, { op: "add", type: "text", id: "t1", text: "a", at: [2, 7] }] },
      { do: [{ op: "add", type: "code", id: "c2", lang: "ts", code: "b", at: [13, 2] }, { op: "add", type: "text", id: "t2", text: "b", at: [5, 7] }] },
      { do: [{ op: "add", type: "text", id: "t3", text: "c", at: [10, 7] }, { op: "add", type: "text", id: "t4", text: "d", at: [14, 7] }] },
    ],
  }).spec!;
  assert.deepEqual(lint(spec, 60), [
    { path: "beats.0.do.0", message: "7 words on screen; keep labels to 5, say the rest" },
    { path: "beats.0.do.1", message: "10 lines of code; show a key type or interface in 8 or fewer, not an implementation" },
    { path: "beats.0.say", message: "'OrderService' is spoken before it is on screen" },
    { path: "beats.3.do.0", message: "more than 5 elements on screen; split the scene or zoom" },
    { path: "beats", message: "3 beats show code; explain the system with components and flows, keep code to 2 beats" },
    { path: "beats", message: "4 text elements; the voice explains, the screen shows things, not words" },
  ]);
  assert.equal(parseSpec({ title: "t", beats: [{ do: [{ op: "add", type: "icon", id: "i", icon: "not-an-icon" }] }] }).issues[0].path, "beats.0.do.0.icon");
});

test("lint wants one concrete case traced end to end", () => {
  const spec = (label: string, hops: string[]) => parseSpec({ title: "t", beats: [{ do: [
    ...["a", "b", "c", "d"].map((id, i) => ({ op: "add", type: "icon", id, icon: "box", at: [2 + i * 4, 4] })),
    ...["ab", "bc", "cd"].map((id) => ({ op: "add", type: "arrow", id, from: id[0], to: id[1], label: id })),
    { op: "trace", ids: hops, label },
  ] }] }).spec!;
  const e2e = (s: ReturnType<typeof spec>) => lint(s, 60).some((i) => i.message.startsWith("no real example"));
  assert.equal(e2e(spec("order 1042", ["ab", "bc", "cd"])), false);
  assert.equal(e2e(spec("order", ["ab", "bc", "cd"])), true);
  assert.equal(e2e(spec("Ana", ["ab", "bc", "cd"])), false);
  assert.equal(e2e(spec("order 1042", ["ab", "bc"])), true);
  const split = spec("order 1042", ["ab"]);
  split.beats[0].do.push({ op: "trace", ids: ["bc", "cd"], label: "order 1042" });
  assert.equal(e2e(split), false);
  assert.deepEqual(lint(spec("order", ["ab"]), 0), []); // playground walkthroughs skip it
});

test("color and fill changes become timed track events and are checked", () => {
  const spec = {
    title: "t",
    beats: [
      { do: [{ op: "add", type: "box", id: "a", label: "A" }, { op: "add", type: "cells", id: "q", items: ["", "x"], highlight: [1] }] },
      { do: [{ op: "color", id: "a", color: "bad", wait: 0.5 }, { op: "fill", id: "q", items: ["1042", "x"], highlight: [0], wait: 1 }] },
    ],
  };
  const t = buildTimeline(parseSpec(spec).spec!, [{ file: null, sec: 0 }, { file: null, sec: 0 }]);
  assert.deepEqual(t.tracks[0].colors, [{ frame: 60 + 15, color: "bad" }]);
  assert.deepEqual(t.tracks[1].sets, [{ frame: 60 + 30, state: { items: ["1042", "x"], highlight: [0] } }]);
  const bad = structuredClone(spec) as any;
  bad.beats[0].do[1].highlight = [2];
  bad.beats[0].do.push({ op: "add", type: "code", id: "c", lang: "ts", code: "x" });
  bad.beats[1].do.push({ op: "color", id: "c", color: "good" });
  bad.beats[1].do.push({ op: "fill", id: "q", items: ["1"] }, { op: "fill", id: "a", items: ["1"] });
  assert.deepEqual(parseSpec(bad).issues, [
    { path: "beats.0.do.1", message: "highlight index out of range; cells has 2 slots" },
    { path: "beats.1.do.2", message: "code takes its colors from syntax highlighting; focus lines instead" },
    { path: "beats.1.do.3", message: "fill has 1 slots; 'q' has 2" },
    { path: "beats.1.do.4", message: "fill needs a cells element, 'a' is box" },
  ]);
});
