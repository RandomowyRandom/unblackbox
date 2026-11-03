import assert from "node:assert/strict";
import { test } from "node:test";
import { collections } from "../../src/components/collections.ts";
import { defOf } from "../../src/components/index.ts";
import { edgesOf, parseSpec, partsOf, sizeOf, type Add } from "../../src/spec.ts";

const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const add = (type: string, extra: Record<string, unknown> = {}) => ({ op: "add", type, id: "x", at: [8, 4.5], ...defOf(type).example.add, ...extra });
const set = (state: Record<string, unknown>) => ({ op: "set", id: "x", state });
const issues = (...ops: unknown[]) => parseSpec(one(...ops)).issues;
// the element after its example set, as the renderer sees it
const after = (type: string) => {
  const { spec } = parseSpec(one(add(type), set(defOf(type).example.set!)));
  const [a, s] = spec!.beats[0].do as [Add, { state: object }];
  return { ...a, ...s.state } as Add;
};
const parts = (type: string, extra = {}) => Object.keys(partsOf(parseSpec(one(add(type, extra))).spec!.beats[0].do[0] as Add));

test("every collections example and its set are valid and fit the canvas", () => {
  for (const d of collections) {
    assert.deepEqual(issues(add(d.type), set(d.example.set!)), [], d.type);
    const [w, h] = sizeOf(after(d.type));
    assert.ok(w >= 2 && w <= 7 && h >= 1 && h <= 4.65, `${d.type}: ${w} x ${h}`);
    assert.ok(d.summary.length <= 90);
  }
});

test("stack: top is slot 0; highlight must name a slot", () => {
  assert.deepEqual(parts("stack"), ["0", "1"]);
  assert.deepEqual(issues(add("stack", { highlight: [2] })), [{ path: "beats.0.do.0", message: "highlight index out of range; stack has 2" }]);
  assert.deepEqual(issues(add("stack"), set({ label: "x" })).map((i) => i.path), ["beats.0.do.1.state"]);
  assert.deepEqual(issues(add("stack"), set({ items: ["a".repeat(17)] })).map((i) => i.path), ["beats.0.do.1.state.items.0"]);
});

test("ring: slots are parts, loop is an edge; pointers stay on the ring", () => {
  assert.deepEqual(parts("ring"), ["0", "1", "2", "3", "4", "5", "6", "7"]);
  const loop = edgesOf(after("ring")).loop;
  // starts at slot 0 (top) and comes back to it, so a packet goes once around
  assert.equal(loop.length, 49);
  for (const pt of [loop[0], loop.at(-1)!]) assert.ok(Math.hypot(pt[0], pt[1] + 1.35) < 1e-9);
  assert.deepEqual(issues(add("ring"), set({ pointers: [{ label: "write", at: 9 }] })),
    [{ path: "beats.0.do.1", message: "pointer 'write' at slot 9; the ring has 8 slots" }]);
  assert.deepEqual(issues(add("ring", { pointers: [{ label: "read", at: 1 }, { label: "read", at: 2 }] })),
    [{ path: "beats.0.do.0", message: "pointer id 'read' used twice" }]);
  assert.deepEqual(issues(add("ring"), set({ pointers: [{ label: "read" }] })).map((i) => i.path), ["beats.0.do.1.state.pointers.0.at"]);
});

test("table: rows are parts by key; cells, keys and highlights are checked", () => {
  assert.deepEqual(parts("table"), ["1041", "1042"]);
  assert.deepEqual(issues(add("table"), set({ rows: [{ key: "1042", cells: ["Ana"] }] })),
    [{ path: "beats.0.do.1", message: "row '1042' has 1 cells; it needs 2, one per column after the key" }]);
  assert.deepEqual(issues(add("table", { highlight: [["1042", "total"], "1050"] })), [
    { path: "beats.0.do.0", message: "highlight row '1050' is not there" },
    { path: "beats.0.do.0", message: "highlight column 'total' is not there" },
  ]);
  assert.deepEqual(issues(add("table"), set({ columns: ["a", "b"] })).map((i) => i.path), ["beats.0.do.1.state"]);
  assert.deepEqual(issues(add("table"), set({ rows: [{ key: "sess ana", cells: ["", ""] }] })).map((i) => i.path), ["beats.0.do.1.state.rows.0.key"]);
});

test("kv: keys are parts; duplicate keys and unknown highlights are errors", () => {
  assert.deepEqual(parts("kv"), ["sess-ana", "sess-ben"]);
  assert.deepEqual(issues(add("kv"), set({ entries: [{ key: "a", value: "1" }, { key: "a", value: "2" }] })),
    [{ path: "beats.0.do.1", message: "key id 'a' used twice" }]);
  assert.deepEqual(issues(add("kv"), set({ highlight: ["sess-zoe"] })), [{ path: "beats.0.do.1", message: "highlight key 'sess-zoe' is not there" }]);
  assert.deepEqual(issues(add("kv"), set({ entries: [{ key: "a" }] })).map((i) => i.path), ["beats.0.do.1.state.entries.0.value"]);
});

test("log: offsets are parts; cursors stay inside the log", () => {
  assert.deepEqual(parts("log"), ["40", "41", "42", "43", "44"]);
  assert.deepEqual(Object.keys(partsOf(after("log"))).at(-1), "45");
  assert.deepEqual(issues(add("log"), set({ cursors: { billing: 39 } })),
    [{ path: "beats.0.do.1", message: "cursor 'billing' at 39 is outside the log: 40 to 45" }]);
  assert.deepEqual(issues(add("log"), set({ cursors: { billing: -1 } })).map((i) => i.path), ["beats.0.do.1.state.cursors.billing"]);
});

test("grid: cells are r-c parts; rows must be even and highlights inside", () => {
  assert.deepEqual(parts("grid", { rows: [["1", "0"], ["0", "1"]] }), ["0-0", "0-1", "1-0", "1-1"]);
  assert.deepEqual(issues(add("grid", { rows: [["1", "0"], ["0"]] })), [{ path: "beats.0.do.0", message: "row 1 has 1 cells; every row needs 2" }]);
  assert.deepEqual(issues(add("grid"), set({ highlight: [[3, 0]] })), [{ path: "beats.0.do.1", message: "highlight [3, 0] is outside the 3 x 6 grid" }]);
  assert.deepEqual(issues(add("grid"), set({ shade: false })).map((i) => i.path), ["beats.0.do.1.state"]);
});

test("bytes: byte indexes and field names are parts; fields stay in range and apart", () => {
  assert.deepEqual(parts("bytes"), ["0", "1", "2", "3", "4", "5", "6", "7", "ver", "type", "length", "order_id"]);
  const p = partsOf(after("bytes"));
  assert.equal(p.order_id.x, (p["4"].x + p["7"].x) / 2);
  assert.deepEqual(issues(add("bytes", { fields: [{ name: "a", from: 0, to: 2 }, { name: "b", from: 2, to: 9 }] })), [
    { path: "beats.0.do.0", message: "field 'b' covers bytes 2 to 9; there are 8 bytes, 0 to 7" },
    { path: "beats.0.do.0", message: "fields 'a' and 'b' overlap" },
  ]);
  assert.deepEqual(issues(add("bytes"), set({ values: ["GG"] })).map((i) => [i.path, i.message]),
    [["beats.0.do.1.state.values.0", 'a byte as hex ("C3") or bits ("0101")']]);
});

test("arrows attach to collection parts and traces run along the ring", () => {
  const { issues: is } = parseSpec(one(
    { op: "add", type: "box", id: "api", label: "API", at: [2, 2] },
    add("table", { id: "orders", at: [8, 2] }),
    { op: "add", type: "arrow", id: "w", from: "api", to: "orders.1042", label: "INSERT" },
    add("ring", { id: "buf", at: [12, 6] }),
    { op: "trace", ids: ["w", "buf.loop"], label: "order 1042" },
    { op: "set", id: "orders", state: { rows: [] } },
  ));
  assert.deepEqual(is, [{ path: "beats.0.do.5", message: "'w' still points at 'orders.1042', which this change removes" }]);
});
