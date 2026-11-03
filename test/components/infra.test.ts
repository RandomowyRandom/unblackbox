import assert from "node:assert/strict";
import { test } from "node:test";
import { infra, memoryLayout } from "../../src/components/infra.ts";
import { edgesOf, parseSpec, partsOf, sizeOf, type Add } from "../../src/spec.ts";

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

test("cluster: a node without a label shows its id, so the id must fit under the node", () => {
  const { add: a } = example("cluster") as { add: { nodes: { id: string; label?: string }[] } };
  const { label: _, ...long } = { ...a.nodes[1], id: "replica-east-2" };
  assert.deepEqual(issues(add("cluster", { ...a, nodes: [a.nodes[0], long] })),
    [{ path: "beats.0.do.0", message: "node 'replica-east-2' shows its id as its name, 14 characters; give it a label of up to 10" }]);
  assert.deepEqual(issues(add("cluster", { ...a, nodes: [a.nodes[0], { ...long, label: "east-2" }] })), []);
});

test("shards: boundary keys never repeat, owners fit their segment", () => {
  const { add: a } = example("shards") as { add: object };
  // an empty range (from = to) repeats a boundary key
  assert.deepEqual(issues(add("shards", { ...a, ranges: [{ id: "r1", from: "a", to: "a" }, { id: "r2", from: "a", to: "z" }] })),
    [{ path: "beats.0.do.0", message: "boundary key 'a' appears twice; keys run left to right, so each range needs its own from and to" }]);
  const eight = Array.from({ length: 8 }, (_, i) => ({ id: `r${i}`, from: String(i), to: String(i + 1), owner: "node-1" }));
  assert.deepEqual(issues(add("shards", { ...a, ranges: eight })), []);
  assert.deepEqual(issues(add("shards", { ...a, ranges: eight.map((r, i) => (i ? r : { ...r, owner: "eu-west-1" })) })),
    [{ path: "beats.0.do.0", message: "owner 'eu-west-1' of range 'r0' is 9 characters; with 8 ranges a segment fits 6" }]);
});

test("memory: pointer labels are unique, a region has room for its pointers, the caption stays in the footprint", () => {
  const { add: a } = example("memory") as { add: { regions: { id: string; size: number }[]; pointers: object[] } };
  const m = add("memory", a);
  assert.deepEqual(issues(m, set({ pointers: [{ label: "cart", to: "heap" }, { label: "cart", to: "stack" }] })),
    [{ path: "beats.0.do.1", message: "pointer label 'cart' used twice; each pointer needs its own name" }]);
  const four = ["a", "b", "c", "d"].map((label) => ({ label, to: "stack" }));
  assert.deepEqual(issues(m, set({ pointers: four })),
    [{ path: "beats.0.do.1", message: "region 'stack' is too short for 4 pointer labels; give it a larger size" }]);
  assert.deepEqual(issues(add("memory", { ...a, regions: a.regions.map((r) => ({ ...r, label: "a".repeat(15) })) })).map((i) => i.path),
    ["beats.0.do.0.regions.0.label", "beats.0.do.0.regions.1.label", "beats.0.do.0.regions.2.label"]);
  // the caption is centered under the column, which sits right of center beside pointers
  const wide = el(add("memory", { ...a, label: "x".repeat(24) })) as Extract<Add, { type: "memory" }>;
  assert.ok(sizeOf(wide)[0] / 2 >= memoryLayout(wide).cx + (24 * 0.26 * 0.55) / 2 - 1e-9);
});

test("barrier: long enough for its break to show, label warned when it runs off the canvas", () => {
  const b = add("barrier", example("barrier").add, null);
  assert.deepEqual(issues({ ...b, from: [8, 4], to: [8, 5] }),
    [{ path: "beats.0.do.0", message: "barrier is 1 units long; make it at least 2 so the gap a break opens shows" }]);
  const lint = infra.find((d) => d.type === "barrier")!.lint!;
  assert.deepEqual(lint(el({ ...b, from: [15, 1], to: [15, 8] }) as never), ["barrier label runs past the canvas edge; move the barrier or shorten the label"]);
  assert.deepEqual(lint(el(b) as never), []);
});
