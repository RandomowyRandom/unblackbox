import assert from "node:assert/strict";
import { test } from "node:test";
import { infra } from "../../src/components/infra.ts";
import { edgesOf, parseSpec, partsOf, type Add } from "../../src/spec.ts";

const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const add = (type: string, fields: object, at: number[] | null = [8, 4.5]) => ({ op: "add", type, id: "x", ...(at ? { at } : {}), ...fields });
const issues = (...ops: unknown[]) => parseSpec(one(...ops)).issues;
const set = (state: object) => ({ op: "set", id: "x", state });
const example = (type: string) => infra.find((d) => d.type === type)!.example as { add: object; set?: object };
const el = (op: object) => parseSpec(one(op)).spec!.beats[0].do[0] as Add;

test("every infra example parses, and its set applies", () => {
  for (const d of infra) {
    const op = add(d.type, d.example.add, d.placed ? [8, 4.5] : null);
    assert.deepEqual(issues(op, ...(d.example.set ? [set(d.example.set)] : [])), [], d.type);
  }
});

test("store: fill is a level from 0 to 1, and the only thing a set changes", () => {
  const db = add("store", example("store").add);
  assert.deepEqual(issues({ ...db, fill: 1.5 }).map((i) => i.path), ["beats.0.do.0.fill"]);
  assert.deepEqual(issues(db, set({ shape: "disk" })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "shape"; settable: fill' }]);
  assert.deepEqual(issues(db, set({ fill: -1 })).map((i) => i.path), ["beats.0.do.1.state.fill"]);
  assert.deepEqual([partsOf(el(db)), edgesOf(el(db))], [{}, {}]);
});

test("cluster: one leader at a time, nodes are parts, replication runs leader to follower", () => {
  const { add: a, set: s } = example("cluster") as { add: { nodes: { id: string }[] }; set: object };
  const c = add("cluster", a);
  assert.deepEqual(Object.keys(partsOf(el(c))), ["n1", "n2", "n3"]);
  assert.deepEqual(Object.keys(edgesOf(el(c))), ["n2", "n3"]);
  assert.deepEqual(Object.keys(edgesOf(el(add("cluster", { ...a, ...s })))), ["n1", "n3"]); // failover: n2 leads now
  const two = a.nodes.map((n, i) => ({ ...n, role: i < 2 ? "leader" : "follower" }));
  assert.deepEqual(issues(c, set({ nodes: two })),
    [{ path: "beats.0.do.1", message: "cluster has 2 leaders (n1, n2); one node leads at a time" }]);
  assert.deepEqual(issues(add("cluster", { ...a, nodes: [a.nodes[0], a.nodes[1], a.nodes[1]] })),
    [{ path: "beats.0.do.0", message: "node id 'n2' used twice" }]);
  assert.deepEqual(issues(c, set({ nodes: [{ ...a.nodes[0], state: "crashed" }] })).map((i) => i.path), ["beats.0.do.1.state.nodes.0.state"]);
  // a trace can follow one write from the leader to a replica
  const user = { op: "add", type: "icon", id: "ana", icon: "user", at: [2, 4.5] };
  const arrow = { op: "add", type: "arrow", id: "w", from: "ana", to: "x.n1", label: "write" };
  assert.deepEqual(issues(c, user, arrow, { op: "trace", ids: ["w", "x.n2"], label: "order 1042" }), []);
});

test("shards: ranges are contiguous parts along the keyspace", () => {
  const { add: a } = example("shards") as { add: { ranges: { id: string; from: string; to: string }[] } };
  const s = add("shards", a);
  assert.deepEqual(Object.keys(partsOf(el(s))), ["r1", "r2", "r3"]);
  assert.deepEqual(issues(s, set({ ranges: [a.ranges[0], { ...a.ranges[1], from: "k" }, a.ranges[2]] })),
    [{ path: "beats.0.do.1", message: "range 'r2' starts at 'k' but 'r1' ends at 'h'; ranges must be contiguous" }]);
  assert.deepEqual(issues(s, set({ highlight: [3] })),
    [{ path: "beats.0.do.1", message: "highlight index out of range; shards has 3 ranges" }]);
  assert.deepEqual(issues(s, set({ label: "x" })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "label"; settable: ranges, highlight' }]);
});

test("memory: regions are parts, pointers must point at one", () => {
  const { add: a } = example("memory") as { add: { regions: object[]; pointers: object[] } };
  const m = add("memory", a);
  assert.deepEqual(Object.keys(partsOf(el(m))), ["stack", "free", "heap"]);
  assert.deepEqual(issues(m, set({ pointers: [{ label: "order 1042", to: "heap2" }] })),
    [{ path: "beats.0.do.1", message: "pointer 'order 1042' points at 'heap2', which is not a region: stack, free, heap" }]);
  assert.deepEqual(issues(m, set({ regions: [] })).map((i) => i.path), ["beats.0.do.1.state.regions"]);
  // region heights follow size and fill the column
  const parts = partsOf(el(m));
  assert.ok(parts.heap.h > parts.stack.h);
  assert.equal(Math.round(Object.values(parts).reduce((s, r) => s + r.h, 0) * 100) / 100, 3.6);
});

test("barrier: drawn between two points, a set breaks it", () => {
  const b = add("barrier", example("barrier").add, null);
  assert.deepEqual(issues({ ...b, to: [8, 1.5] }), [{ path: "beats.0.do.0", message: "barrier needs two different points" }]);
  assert.deepEqual(issues({ ...b, at: [8, 4.5] }).map((i) => i.path), ["beats.0.do.0"]); // not placed
  assert.deepEqual(issues(b, set({ broken: "yes" })).map((i) => i.path), ["beats.0.do.1.state.broken"]);
  assert.deepEqual(issues(b, { op: "add", type: "arrow", id: "a", from: "x", to: [2, 2], label: "l" }),
    [{ path: "beats.0.do.1", message: "'x' is a barrier, which nothing can attach to" }]);
});

test("device: text must fit the screen, the button is a part while it shows", () => {
  const d = add("device", example("device").add);
  assert.deepEqual(Object.keys(partsOf(el(d))), ["button"]);
  assert.deepEqual(Object.keys(partsOf(el({ ...d, button: "" }))), []);
  assert.deepEqual(issues(d, set({ lines: ["Order 1042", "Shipped to Ana Lopez"] })),
    [{ path: "beats.0.do.1", message: "line 2 is 20 characters; a phone fits 13" }]);
  assert.deepEqual(issues(d, set({ title: "Cart" })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "title"; settable: lines, button' }]);
  // an arrow from the button keeps it: hiding it is an error
  const arrow = { op: "add", type: "arrow", id: "a", from: "x.button", to: [14, 4.5], label: "POST /pay" };
  assert.deepEqual(issues(d, arrow, set({ button: "" })),
    [{ path: "beats.0.do.2", message: "'a' still points at 'x.button', which this change removes" }]);
});
