import assert from "node:assert/strict";
import { test } from "node:test";
import { control } from "../../src/components/control.ts";
import { gallery } from "../../src/gallery.ts";
import { edgesOf, lint, parseSpec, partsOf, sizeOf, type Add } from "../../src/spec.ts";

const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const add = (type: string, fields: object) => ({ op: "add", type, id: "x", at: [8, 4.5], ...fields });
const example = (type: string) => control.find((d) => d.type === type)!.example;
const issues = (...ops: unknown[]) => parseSpec(one(...ops)).issues;
const el = (type: string, fields: object = example(type).add) => {
  const r = parseSpec(one(add(type, fields)));
  assert.deepEqual(r.issues, []);
  return r.spec!.beats[0].do[0] as Add;
};

test("control: every example adds and sets cleanly, with no lint", () => {
  const r = parseSpec(gallery("control"));
  assert.deepEqual(r.issues, []);
  assert.deepEqual(lint(r.spec!, 0, 99), []);
  for (const d of control) {
    const [w, h] = sizeOf(el(d.type));
    assert.ok(w >= 1 && w <= 7 && h >= 0.8 && h <= 4.5, `${d.type} footprint ${w} x ${h}`);
  }
});

// one check error per type, with its exact path and message (on add, or after a set)
test("control: check errors", () => {
  const cases: [unknown[], { path: string; message: string }[]][] = [
    [[add("toggle", { label: "flag", on: true, onLabel: "off" })], [{ path: "beats.0.do.0", message: "onLabel and offLabel are both 'off'; the two states need different words" }]],
    [[add("lock", { label: "row", locked: true, owner: "worker-2" }), { op: "set", id: "x", state: { locked: false } }],
      [{ path: "beats.0.do.1", message: `an unlocked lock has no owner; set owner: "" when 'worker-2' releases it` }]],
    [[add("tokens", { label: "pool", capacity: 8, filled: 9 })], [{ path: "beats.0.do.0", message: "filled 9 is more than capacity 8" }]],
    [[add("gauge", { label: "CPU", min: 0, max: 100, value: 120, unit: "%", zones: [{ to: 70, color: "good" }, { to: 60, color: "bad" }] })], [
      { path: "beats.0.do.0", message: "value 120 is outside 0..100" },
      { path: "beats.0.do.0", message: "zones.1 ends at 60, not above 70; zones go up from min" },
      { path: "beats.0.do.0", message: "the last zone ends at 60; end it at max 100" },
    ]],
    [[add("gauge", { label: "CPU", min: 5, max: 5, value: 5, unit: "" })], [{ path: "beats.0.do.0", message: "min 5 must be below max 5" }]],
    [[add("progress", { label: "upload", value: 0.4 }), { op: "set", id: "x", state: { value: 2 } }],
      [{ path: "beats.0.do.1", message: "value 2 is over 1; give a total, or a fraction 0..1" }]],
    [[add("progress", { label: "backfill", value: 50001, total: 48000 })], [{ path: "beats.0.do.0", message: "value 50001 is more than total 48000" }]],
    [[add("checklist", { items: [{ label: "db ping" }, { label: "db ping", done: true }] })], [{ path: "beats.0.do.0", message: "item 'db ping' is listed twice" }]],
  ];
  for (const [ops, want] of cases) assert.deepEqual(issues(...ops), want);
  // counter has nothing zod cannot check; its limit is the value length
  assert.deepEqual(issues(add("counter", { label: "retries", value: "123456789" })).map((i) => i.path), ["beats.0.do.0.value"]);
  // a released lock clears its owner
  assert.deepEqual(issues(add("lock", { label: "row", locked: true, owner: "w2" }), { op: "set", id: "x", state: { locked: false, owner: "" } }), []);
});

test("control: parts and edges", () => {
  assert.deepEqual(Object.keys(partsOf(el("toggle"))), ["knob"]);
  assert.deepEqual(Object.keys(partsOf(el("lock"))), ["body", "owner"]);
  assert.deepEqual(Object.keys(partsOf(el("tokens"))), ["0", "1", "2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(Object.keys(partsOf(el("gauge"))), ["needle"]);
  assert.deepEqual(Object.keys(partsOf(el("progress"))), ["bar"]);
  assert.deepEqual(Object.keys(partsOf(el("counter"))), []);
  assert.deepEqual(Object.keys(partsOf(el("checklist"))), ["0", "1", "2"]);
  // the knob sits on the side of its state; take leaves from the last token, refill lands in the first empty slot
  const knob = (on: boolean) => partsOf(el("toggle", { label: "flag", on })).knob.x;
  assert.ok(knob(true) > knob(false));
  const t = el("tokens", { label: "pool", capacity: 4, filled: 2 });
  assert.deepEqual(Object.keys(edgesOf(t)), ["take", "refill"]);
  assert.equal(edgesOf(t).take[0][0], partsOf(t)["1"].x);
  assert.equal(edgesOf(t).refill.at(-1)![0], partsOf(t)["2"].x);
  // an arrow can attach to a token and a trace can run along take
  assert.deepEqual(issues(add("tokens", { label: "pool", capacity: 4, filled: 2 }), { op: "add", type: "icon", id: "ana", icon: "user", at: [3, 4.5] },
    { op: "add", type: "arrow", id: "a", from: "ana", to: "x.1", label: "request 1042" }, { op: "trace", ids: ["a", "x.take"] }), []);
});

test("control: sets outside the state are rejected with their path", () => {
  const cases: [string, object, string, string?][] = [
    ["toggle", { label: "x" }, "beats.0.do.1.state", 'Unrecognized key: "label"; settable: on'],
    ["lock", { locked: "yes" }, "beats.0.do.1.state.locked"],
    ["tokens", { capacity: 4 }, "beats.0.do.1.state", 'Unrecognized key: "capacity"; settable: filled'],
    ["gauge", { value: "high" }, "beats.0.do.1.state.value"],
    ["progress", { value: -1 }, "beats.0.do.1.state.value"],
    ["counter", { unit: "s" }, "beats.0.do.1.state", 'Unrecognized key: "unit"; settable: value'],
    ["checklist", { items: [] }, "beats.0.do.1.state.items"],
  ];
  for (const [type, state, path, message] of cases) {
    const got = issues(add(type, example(type).add), { op: "set", id: "x", state });
    assert.deepEqual(got.map((i) => i.path), [path], type);
    if (message) assert.equal(got[0].message, message);
  }
});

test("control: lint flags what will not read at a glance", () => {
  const msgs = (type: string, fields: object) => lint(parseSpec(one(add(type, fields))).spec!, 0, 99).map((i) => i.message);
  assert.deepEqual(msgs("tokens", { label: "pool", capacity: 12, filled: 3 }), ["12 tokens are hard to count at a glance; show 8 or fewer"]);
  assert.deepEqual(msgs("counter", { label: "rows", value: "1234567" }), ["counter value '1234567' is long; round it (e.g. '1.2k') so it reads at a glance"]);
  assert.deepEqual(msgs("checklist", { items: ["a", "b", "c", "d", "e"].map((label) => ({ label })) }), ["5 items; 4 or fewer read at a glance"]);
});

// regressions: empty words drew blanks, and huge numbers overflowed the readouts
test("control: empty words and out-of-range numbers are rejected with their path", () => {
  const cases: [string, object, string][] = [
    ["toggle", { label: "flag", on: true, onLabel: "" }, "beats.0.do.0.onLabel"],
    ["tokens", { label: "pool", capacity: 4, filled: 2, rate: "" }, "beats.0.do.0.rate"],
    ["counter", { label: "retries", value: "" }, "beats.0.do.0.value"],
    ["checklist", { items: [{ label: "" }] }, "beats.0.do.0.items.0.label"],
    ["gauge", { label: "CPU", min: 0, max: 1e13, value: 5, unit: "" }, "beats.0.do.0.max"],
    ["progress", { label: "rows", value: 1, total: 2e12 }, "beats.0.do.0.total"],
  ];
  for (const [type, fields, path] of cases) assert.deepEqual(issues(add(type, fields)).map((i) => i.path), [path], type);
  // a released owner and a gauge with no unit stay valid
  assert.deepEqual(issues(add("lock", { label: "row", locked: false, owner: "" })), []);
  assert.deepEqual(issues(add("gauge", { label: "CPU", min: -1e12, max: 1e12, value: 0, unit: "" })), []);
});
