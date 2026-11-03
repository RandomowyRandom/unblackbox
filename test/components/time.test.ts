import assert from "node:assert/strict";
import { test } from "node:test";
import { eventLabelW, fmt, MONO, tagX, time, timelineLayout, TL } from "../../src/components/time.ts";
import { gallery } from "../../src/gallery.ts";
import { edgesOf, parseSpec, partsOf, sizeOf, type Add } from "../../src/spec.ts";

const add = (type: string, fields: Record<string, unknown>) => ({ op: "add", type, id: "x", at: [8, 4.5], ...fields });
const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const set = (state: Record<string, unknown>) => ({ op: "set", id: "x", state });
const issues = (...ops: unknown[]) => parseSpec(one(...ops)).issues;
const el = (type: string, fields: Record<string, unknown>) => {
  const { spec, issues } = parseSpec(one(add(type, fields)));
  assert.deepEqual(issues, []);
  return spec!.beats[0].do[0] as Add;
};
const ex = (type: string) => time.find((d) => d.type === type)!.example;

test("every time example parses, sets included, and fits the canvas", () => {
  const { spec, issues: found } = parseSpec(gallery("time"));
  assert.deepEqual(found, []);
  assert.deepEqual(spec!.beats.map((b) => b.chapter), time.map((d) => `time: ${d.type}`));
  for (const d of time) {
    const [w, h] = sizeOf(el(d.type, d.example.add));
    assert.ok(w >= 1.5 && w <= 12 && h >= 1 && h <= 5, `${d.type} footprint ${w} x ${h}`);
  }
});

test("timeline: events are parts, inside the span; cursor and events can be set", () => {
  assert.deepEqual(Object.keys(partsOf(el("timeline", ex("timeline").add))), ["write", "read", "expire"]);
  const base = { span: [0, 60], unit: "s", events: [{ id: "expire", at: 90, label: "expired" }] };
  assert.deepEqual(issues(add("timeline", base)), [{ path: "beats.0.do.0", message: "event 'expire' at 90 is outside the span 0 to 60" }]);
  assert.deepEqual(issues(add("timeline", { ...base, span: [60, 0] })), [{ path: "beats.0.do.0", message: "span must go from earlier to later, e.g. [0, 60]" }]);
  const ok = add("timeline", { ...base, events: [] });
  assert.deepEqual(issues(ok, set({ cursor: 61 })), [{ path: "beats.0.do.1", message: "cursor at 61 is outside the span 0 to 60" }]);
  assert.deepEqual(issues(ok, set({ span: [0, 10] })), [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "span"; settable: cursor, events' }]);
  // a span whose width overflows to Infinity would put every event at the left end
  assert.deepEqual(issues(add("timeline", { span: [-1e308, 1e308], events: [] })).map((i) => i.message),
    ["span is too wide to draw; pick a unit that keeps the numbers small, e.g. [0, 60] min"]);
});

test("timeline and lanes: span labels and the now tag stay inside the footprint", () => {
  assert.equal(fmt(86400, "ms"), "86,400 ms");
  assert.equal(fmt(1_500_000, "ms"), "1.5M ms");
  assert.equal(fmt(2.25), "2.3");
  // a long span label pushes the axis in instead of spilling past the left edge
  const L = timelineLayout({ span: [86400, 172800], unit: "s", w: 9 });
  assert.ok(L.x0 - TL.spanGap - fmt(86400, "s").length * MONO >= -L.W / 2, "start label fits");
  assert.ok(L.x1 + TL.spanGap + fmt(172800, "s").length * MONO <= L.W / 2, "end label fits");
  assert.equal(timelineLayout({ span: [0, 60], w: 9 }).x0, -3.5, "short labels keep the default margin");
  // a cursor at the span end of lanes (axis runs to the edge) keeps its tag inside
  const text = "now 40 ms";
  assert.ok(tagX(4.4, text, 4.5) + (text.length * MONO) / 2 <= 4.5);
  assert.equal(tagX(0, text, 4.5), 0);
});

test("lint: labels that would end in '...' are reported, the examples are not", () => {
  const lint = (type: string, fields: Record<string, unknown>) => (time.find((d) => d.type === type) as { lint?: (e: never) => string[] }).lint?.(el(type, fields) as never) ?? [];
  for (const d of time) assert.deepEqual(lint(d.type, d.example.add), [], `${d.type} example`);
  // crowded events sit 0.6 units apart: their labels shorten instead of overlapping, and lint says so
  const events = Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, at: i * 10, label: "SET user:42" }));
  const crowded = { span: [0, 50], w: 5, events };
  assert.ok(Math.max(...eventLabelW(crowded as never).values()) < 2);
  assert.match(lint("timeline", crowded).join(), /end in '\.\.\.'/);
  assert.deepEqual(lint("pipeline", { stages: [{ id: "a", label: "integration tests", icon: "bug" }, { id: "b", label: "deploy" }] }),
    ["'integration tests' is too long for the stage chevron and ends in '...'; use one or two short words"]);
});

test("sequence: participants are parts, messages are edges a packet can ride", () => {
  const seq = el("sequence", { ...ex("sequence").add, shown: undefined });
  assert.deepEqual(Object.keys(partsOf(seq)), ["browser", "api"]);
  assert.deepEqual(Object.keys(edgesOf(seq)), ["hello", "cert", "key", "done"]);
  const [a, b] = edgesOf(seq).cert;
  assert.ok(a[1] === b[1] && a[0] > b[0], "a reply runs back along its row");
  // only drawn messages carry a packet: shown 1 hides 'cert' until a set reveals it
  const hidden = add("sequence", ex("sequence").add);
  assert.deepEqual(issues(hidden, { op: "trace", ids: ["x.hello", "x.cert"], label: "Ana" }),
    [{ path: "beats.0.do.1.ids.1", message: "'x' has no edge 'cert': hello" }]);
  assert.deepEqual(issues(hidden, set({ shown: 2 }), { op: "trace", ids: ["x.hello", "x.cert"], label: "Ana" }), []);
  const two = { participants: [{ id: "a", label: "A" }, { id: "b", label: "B" }], messages: [{ id: "m", from: "a", to: "db", label: "GET" }] };
  assert.deepEqual(issues(add("sequence", two)), [{ path: "beats.0.do.0", message: "message 'm' names unknown participant 'db'; there are: a, b" }]);
  const ok = add("sequence", { ...two, messages: [{ id: "m", from: "a", to: "b", label: "GET" }] });
  assert.deepEqual(issues(ok, set({ shown: 3 })), [{ path: "beats.0.do.1", message: "shown is 3, but there are 1 messages" }]);
  assert.deepEqual(issues(ok, set({ shown: -1 })).map((i) => i.path), ["beats.0.do.1.state.shown"]);
});

test("lanes: lanes are parts; bars must sit on a lane inside the span", () => {
  assert.deepEqual(Object.keys(partsOf(el("lanes", ex("lanes").add))), ["w1", "w2"]);
  const base = { lanes: [{ id: "w1", label: "worker 1" }, { id: "w2", label: "worker 2" }], span: [0, 40] };
  assert.deepEqual(issues(add("lanes", { ...base, bars: [{ lane: "w3", from: 0, to: 10, label: "read 100" }] })),
    [{ path: "beats.0.do.0", message: "bar 'read 100' is on unknown lane 'w3'; there are: w1, w2" }]);
  assert.deepEqual(issues(add("lanes", { ...base, bars: [{ lane: "w1", from: 10, to: 5 }] })), [{ path: "beats.0.do.0", message: "bar 0 must end after it starts" }]);
  assert.deepEqual(issues(add("lanes", { ...base, bars: [] }), set({ cursor: "now" })).map((i) => i.path), ["beats.0.do.1.state.cursor"]);
});

test("timer: remaining stays between 0 and the total", () => {
  const t = add("timer", ex("timer").add);
  assert.deepEqual(Object.keys(partsOf(el("timer", ex("timer").add))), []);
  assert.deepEqual(issues(t, set({ remaining: 40 })), [{ path: "beats.0.do.1", message: "remaining 40 is more than the total 30" }]);
  assert.deepEqual(issues(t, set({ remaining: -1 })).map((i) => i.path), ["beats.0.do.1.state.remaining"]);
  assert.deepEqual(issues(t, set({ total: 60 })).map((i) => i.path), ["beats.0.do.1.state"]);
});

test("cycle: steps are parts and edges that close the loop", () => {
  const c = el("cycle", ex("cycle").add);
  const ids = ["observe", "diff", "act", "requeue"];
  assert.deepEqual(Object.keys(partsOf(c)), ids);
  assert.deepEqual(Object.keys(edgesOf(c)), ids);
  // each arc ends next to the following step, the last one back at the first
  ids.forEach((id, i) => {
    const end = edgesOf(c)[id].at(-1)!;
    const next = partsOf(c)[ids[(i + 1) % ids.length]];
    assert.ok(Math.hypot(end[0] - next.x, end[1] - next.y) < 0.6, `${id} ends at the next step`);
  });
  assert.deepEqual(issues(add("cycle", { ...ex("cycle").add, active: "nope" })),
    [{ path: "beats.0.do.0", message: "active 'nope' is not a step; there are: observe, diff, act, requeue" }]);
  assert.deepEqual(issues(add("cycle", ex("cycle").add), set({ active: "not a step" })).map((i) => i.path), ["beats.0.do.1.state.active"]);
});

test("pipeline: stages are parts, each has an edge to the next", () => {
  const p = el("pipeline", ex("pipeline").add);
  assert.deepEqual(Object.keys(partsOf(p)), ["lint", "test", "build", "deploy"]);
  assert.deepEqual(Object.keys(edgesOf(p)), ["lint", "test", "build"]);
  assert.deepEqual(edgesOf(p).lint.at(-1), edgesOf(p).test[0], "edges chain stage to stage");
  assert.deepEqual(issues(add("pipeline", { stages: [{ id: "a", label: "lint" }, { id: "a", label: "test" }] })), [{ path: "beats.0.do.0", message: "stage id 'a' used twice" }]);
  assert.deepEqual(issues(add("pipeline", ex("pipeline").add), set({ stages: [{ id: "lint", label: "lint", status: "broken" }, { id: "test", label: "test" }] })).map((i) => i.path),
    ["beats.0.do.1.state.stages.0.status"]);
});
