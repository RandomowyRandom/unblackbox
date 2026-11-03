import assert from "node:assert/strict";
import { test } from "node:test";
import { annotations } from "../../src/components/annotations.ts";
import { parseSpec, sizeOf, type Add } from "../../src/spec.ts";

const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const ex = (type: string) => annotations.find((d) => d.type === type)!.example;
// host, then the annotation (fields patched), then any extra ops
const spec = (type: string, patch: Record<string, unknown> = {}, ...more: unknown[]) =>
  one(ex(type).host, { op: "add", type, id: "a", ...ex(type).add, ...patch }, ...more);
const issues = (s: unknown) => parseSpec(s).issues;

test("every annotation example parses, with its set, and has no footprint", () => {
  for (const d of annotations) {
    const set = d.example.set ? [{ op: "set", id: "a", state: d.example.set }] : [];
    const r = parseSpec(spec(d.type, {}, ...set));
    assert.deepEqual(r.issues, [], d.type);
    assert.deepEqual(sizeOf(r.spec!.beats[0].do[1] as Add), [0, 0]);
    assert.equal(d.placed, false);
    assert.equal(d.chunks, 0);
    assert.equal(d.parts, undefined, `${d.type} has no parts`);
    assert.equal(d.edges, undefined, `${d.type} has no edges`);
  }
});

test("word caps and brace ends are errors with their path", () => {
  assert.deepEqual(issues(spec("callout", { text: "this note is far too long here" })),
    [{ path: "beats.0.do.1", message: "callout text is 7 words; keep it to 6" }]);
  assert.deepEqual(issues(spec("badge", { text: "no longer fresh now" })),
    [{ path: "beats.0.do.1", message: "badge text is 4 words; keep it to 3" }]);
  assert.deepEqual(issues(spec("bubble", { text: "I wonder where my order 1042 went off to" })),
    [{ path: "beats.0.do.1", message: "bubble text is 9 words; keep it to 8" }]);
  assert.deepEqual(issues(spec("brace", { to: "batch.0" })), [{ path: "beats.0.do.1", message: "brace needs two different ends" }]);
  assert.deepEqual(issues(spec("brace", { from: [2, 2], to: [2, 2] })), [{ path: "beats.0.do.1", message: "brace needs two different ends" }]);
  // a set runs the check again
  assert.deepEqual(issues(spec("badge", {}, { op: "set", id: "a", state: { text: "a b c d" } })),
    [{ path: "beats.0.do.2", message: "badge text is 4 words; keep it to 3" }]);
});

test("refs must be live parts, and the target outlives the annotation", () => {
  assert.deepEqual(issues(spec("callout", { on: "cache.9" })), [{ path: "beats.0.do.1", message: "'cache' has no part '9': 0, 1, 2" }]);
  assert.deepEqual(issues(spec("brace", { to: "nope" })), [{ path: "beats.0.do.1", message: "'nope' is not on screen at this point" }]);
  assert.deepEqual(issues(spec("badge", {}, { op: "remove", id: "page" })),
    [{ path: "beats.0.do.2", message: "'page' is still used by badge 'a'; remove that first" }]);
  assert.deepEqual(issues(spec("bubble", {}, { op: "remove", id: "a" }, { op: "remove", id: "ana" })), []);
  assert.deepEqual(issues(spec("bubble", {}, { op: "move", id: "a", to: [1, 1] })),
    [{ path: "beats.0.do.2", message: "a bubble follows what it attaches to; move that instead" }]);
});

test("only a badge has state, and its set is validated", () => {
  assert.deepEqual(issues(spec("badge", {}, { op: "set", id: "a", state: { corner: "top-left" } })),
    [{ path: "beats.0.do.2.state", message: 'Unrecognized key: "corner"; settable: text' }]);
  assert.deepEqual(issues(spec("badge", {}, { op: "set", id: "a", state: { text: 5 } })).map((i) => i.path), ["beats.0.do.2.state.text"]);
  for (const type of ["callout", "brace", "bubble"]) {
    assert.deepEqual(issues(spec(type, {}, { op: "set", id: "a", state: { text: "x" } })),
      [{ path: "beats.0.do.2", message: `a ${type} has no state to set; use color, move or a new element` }]);
  }
  // fields zod owns: enums and unknown keys
  assert.deepEqual(issues(spec("callout", { side: "top" })).map((i) => i.path), ["beats.0.do.1.side"]);
  assert.deepEqual(issues(spec("bubble", { at: [2, 2] })).map((i) => i.path), ["beats.0.do.1"]);
});

test("blank text is an error on the field, on add and on set", () => {
  assert.deepEqual(issues(spec("callout", { text: "  " })), [{ path: "beats.0.do.1.text", message: "write some text; it cannot be blank" }]);
  assert.deepEqual(issues(spec("brace", { label: "" })).map((i) => i.path), ["beats.0.do.1.label"]);
  assert.deepEqual(issues(spec("bubble", { text: "" })).map((i) => i.path), ["beats.0.do.1.text"]);
  assert.deepEqual(issues(spec("badge", {}, { op: "set", id: "a", state: { text: " " } })),
    [{ path: "beats.0.do.2.state.text", message: "write some text; it cannot be blank" }]);
});

test("a brace between two points needs them spread along its side", () => {
  assert.deepEqual(issues(spec("brace", { from: [2, 2], to: [2, 5] })),
    [{ path: "beats.0.do.1", message: "brace ends [2,2] and [2,5] line up across side 'below'; spread them along it or use side left or right" }]);
  assert.deepEqual(issues(spec("brace", { from: [2, 2], to: [2, 5], side: "left" })), []);
  assert.deepEqual(issues(spec("brace", { from: [2, 2], to: [6, 2], side: "right" })).map((i) => i.message.slice(0, 41)),
    ["brace ends [2,2] and [6,2] line up across"]);
});
