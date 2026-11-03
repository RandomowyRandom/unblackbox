import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { DEFS } from "../src/components/index.ts";
import { gallery } from "../src/gallery.ts";
import { lint, parseSpec } from "../src/spec.ts";
import { themeOf } from "../src/themes.ts";
import { buildTimeline } from "../src/timeline.ts";

const box = (id: string, at: number[], extra = {}) => ({ op: "add", type: "box", id, label: id, at, ...extra });
const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const silent = (n: number) => Array.from({ length: n }, () => ({ file: null, sec: 0 }));

test("unknown keys are errors with their path, at every level", () => {
  const { issues } = parseSpec({ title: "t", colour: "x", beats: [{ say: "a", do: [{ ...box("a", [2, 2]), lable: "typo" }], pause: 1 }] });
  assert.deepEqual(issues.map((i) => i.path).sort(), ["", "beats.0", "beats.0.do.0"]);
  assert.ok(issues.every((i) => /unrecognized key/i.test(i.message)));
});

test("place puts an element next to another, as it is at that moment", () => {
  const { spec, issues } = parseSpec(one(
    box("a", [4, 4.5]),
    { op: "move", id: "a", to: [3, 4] },
    { op: "add", type: "box", id: "b", label: "B", place: { of: "a", side: "right" } }, // a is 3 wide: 3 + 1.5 + 0.6 + 1.5 = 6.6
    { op: "add", type: "cells", id: "q", items: ["", ""], place: { of: "b", side: "below", gap: 1 } }, // 4 + 0.7 (half the box) + 1 + 0.4 (half the row) = 6.1
    { op: "camera", on: "q.1", zoom: 2 },
  ));
  assert.deepEqual(issues, []);
  const [, , b, q, cam] = spec!.beats[0].do as { at?: number[]; to?: number[] }[];
  assert.deepEqual(b.at, [6.6, 4]);
  assert.deepEqual(q.at, [6.6, 6.1]);
  assert.deepEqual(cam.to, [7, 6.1]);
  assert.deepEqual(parseSpec(one(box("a", [4, 4]), { ...box("b", [1, 1]), place: { of: "a", side: "left" } })).issues,
    [{ path: "beats.0.do.1.place", message: "use `at` or `place`, not both" }]);
});

test("refs to parts and edges are checked against the element's state", () => {
  const q = { op: "add", type: "cells", id: "q", items: ["", ""], at: [8, 2] };
  assert.deepEqual(parseSpec(one(box("a", [2, 2]), q, { op: "add", type: "arrow", id: "x", from: "a", to: "q.5", label: "l" })).issues,
    [{ path: "beats.0.do.2", message: "'q' has no part '5': 0, 1" }]);
  assert.deepEqual(parseSpec(one(q, { op: "trace", ids: ["q.e"] }, { op: "camera", to: [1, 1], on: "q" })).issues, [
    { path: "beats.0.do.1.ids.0", message: "'q' has no edge 'e'; it has none" },
    { path: "beats.0.do.2", message: "camera takes `to` or `on`, not both" },
  ]);
  // a set may not take away a part something points at
  const shrink = one(box("a", [2, 2]), q, { op: "add", type: "arrow", id: "x", from: "a", to: "q.1", label: "l" }, { op: "set", id: "q", state: { items: ["1"] } });
  assert.deepEqual(parseSpec(shrink).issues, [{ path: "beats.0.do.3", message: "'x' still points at 'q.1', which this change removes" }]);
});

test("set is validated against the type's settable fields", () => {
  const q = { op: "add", type: "cells", id: "q", items: ["", ""], at: [8, 2] };
  assert.deepEqual(parseSpec(one(q, { op: "set", id: "q", state: { label: "x", highlight: [0] } })).issues,
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "label"; settable: items, highlight' }]);
  assert.deepEqual(parseSpec(one(q, { op: "set", id: "q", state: { highlight: [3] } })).issues,
    [{ path: "beats.0.do.1", message: "highlight index out of range; cells has 2 slots" }]);
  assert.deepEqual(parseSpec(one(q, { op: "set", id: "q", state: { items: "x" } })).issues.map((i) => i.path), ["beats.0.do.1.state.items"]);
  assert.deepEqual(parseSpec(one(box("a", [2, 2]), { op: "set", id: "a", state: {} })).issues,
    [{ path: "beats.0.do.1", message: "a box has no state to set; use color, move or a new element" }]);
  const t = buildTimeline(parseSpec(one(q, { op: "set", id: "q", state: { items: ["1", ""] }, wait: 1 }, { op: "pulse", id: "q" })).spec!, silent(1));
  assert.deepEqual([t.tracks[0].sets, t.tracks[0].pulses], [[{ frame: 30, state: { items: ["1", ""] } }], [0]]);
});

test("chapters, transitions, trace speed and theme reach the timeline", () => {
  const spec = parseSpec({
    title: "t", theme: { preset: "light" },
    beats: [
      { chapter: "Setup", do: [box("a", [2, 2]), box("b", [8, 2]), { op: "add", type: "arrow", id: "x", from: "a", to: "b", label: "l", curve: 0.3 }] },
      { transition: "slide", do: [{ op: "trace", ids: ["x"], speed: 0.5, color: "bad" }, { op: "clear", wait: 1 }, box("c", [2, 2])] },
    ],
  }).spec!;
  const t = buildTimeline(spec, silent(2));
  assert.deepEqual(t.chapters, [{ frame: 0, title: "Setup" }]);
  assert.deepEqual(t.beats.map((b) => b.chapter), ["Setup", "Setup"]);
  assert.deepEqual(t.tracks.map((tr) => [tr.el.id, tr.enter, tr.exit]), [["a", "fade", "slide"], ["b", "fade", "slide"], ["x", "fade", "slide"], ["c", "slide", "fade"]]);
  assert.equal(t.traces[0].step, 15);
  assert.equal(t.pal.bg, "#ffffff");
  assert.deepEqual(lint({ ...spec, beats: [{ ...spec.beats[0], chapter: "a very long chapter name" }] }, 0)[0],
    { path: "beats.0.chapter", message: "chapter label of 5 words; keep it to 4" });
});

test("lint flags overlapping footprints and the canvas edge, once each", () => {
  const spec = parseSpec({ title: "t", beats: [{ do: [box("a", [4, 4]), box("b", [5, 4.5]), box("c", [15.5, 8.5])] }, { do: [box("d", [9, 2])] }] }).spec!;
  assert.deepEqual(lint(spec, 0).filter((i) => i.path !== "beats"), [
    { path: "beats.0.do.1", message: "'b' overlaps 'a'; give each its own space (place: {of, side} helps)" },
    { path: "beats.0.do.2", message: "'c' goes past the edge of the canvas; move it or make it smaller" },
  ]);
});

// WCAG relative luminance contrast
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("every theme keeps text readable and colors distinct from the background", () => {
  for (const preset of ["dim", "light", "contrast"] as const) for (const accent of ["blue", "violet", "teal", "amber"] as const) {
    const p = themeOf({ preset, accent });
    for (const bg of [p.bg, p.panel]) {
      for (const k of ["text", "muted"] as const) assert.ok(contrast(p[k], bg) >= 4.5, `${preset}/${accent} ${k} on ${bg}: ${contrast(p[k], bg).toFixed(2)}`);
      for (const k of ["accent", "good", "bad"] as const) assert.ok(contrast(p[k], bg) >= 3, `${preset}/${accent} ${k} on ${bg}: ${contrast(p[k], bg).toFixed(2)}`);
    }
  }
});

test("every component's example is valid and builds a timeline", () => {
  const { spec, issues } = parseSpec(gallery());
  assert.deepEqual(issues, []);
  const t = buildTimeline(spec!, silent(spec!.beats.length));
  assert.equal(t.beats.length, DEFS.length);
  for (const d of DEFS) assert.ok(d.summary && d.summary.length <= 90, `${d.type}: one-line summary`);
});

test("AGENTS.md lists every element type", () => {
  const guide = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  assert.deepEqual(DEFS.map((d) => d.type).filter((t) => !guide.includes(`| \`${t}\` |`)), []);
});
