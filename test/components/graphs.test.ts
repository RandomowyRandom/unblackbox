import assert from "node:assert/strict";
import { test } from "node:test";
import { fileRows, graphs } from "../../src/components/graphs.ts";
import { edgesOf, parseSpec, partsOf, type Add } from "../../src/spec.ts";

const def = (type: string) => graphs.find((d) => d.type === type)!;
const add = (type: string, extra: Record<string, unknown> = {}) => ({ op: "add", type, id: "x", ...def(type).example.add, ...extra });
const set = (state: Record<string, unknown>) => ({ op: "set", id: "x", state });
const issues = (...ops: unknown[]) => parseSpec({ title: "t", beats: [{ do: ops }] }).issues;
const parsed = (type: string) => parseSpec({ title: "t", beats: [{ do: [add(type)] }] }).spec!.beats[0].do[0] as Add;
const names = (o: Record<string, unknown>) => Object.keys(o).sort();

test("every graphs example parses and its set applies", () => {
  for (const d of graphs) assert.deepEqual(issues(add(d.type), set(d.example.set!)), [], d.type);
});

test("parts and edges are named by the ids inside", () => {
  const expect: Record<string, [string[], string[]]> = {
    tree: [["body", "cart", "footer", "main", "nav", "pay"], ["cart", "footer", "main", "nav", "pay"]],
    graph: [["api", "auth", "db", "kafka", "orders", "web"], ["api-auth", "api-orders", "orders-db", "orders-kafka", "web-api"]],
    states: [["cancelled", "delivered", "paid", "placed", "shipped"], ["cancel", "declined", "deliver", "pay", "refund", "ship"]],
    flow: [["backorder", "charge", "order", "paid", "ship", "stock"], ["charged", "check", "in-stock", "no-stock", "retry", "send"]],
    layers: [["app", "http", "ip", "tcp", "tls"], ["down-app", "down-http", "down-tcp", "down-tls", "up-http", "up-ip", "up-tcp", "up-tls"]],
    files: [["checkout", "pkg", "schema", "tax", "test"], []],
    commits: [["a1", "b2", "c3", "d4", "e5"], ["b2", "c3", "d4", "e5"]],
  };
  for (const d of graphs) {
    const el = parsed(d.type);
    assert.deepEqual([names(partsOf(el)), names(edgesOf(el))], expect[d.type], d.type);
    // every edge is a polyline a packet can travel
    for (const pts of Object.values(edgesOf(el))) assert.ok(pts.length >= 2 && pts.every((p) => p.every(Number.isFinite)), d.type);
  }
});

test("check() errors land on the op with an exact message", () => {
  const at = (message: string, i = 0) => [{ path: `beats.0.do.${i}`, message }];
  assert.deepEqual(issues(add("tree", { nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }] })),
    at("a tree has exactly one root (a node without parent); this one has 2: a, b"));
  assert.deepEqual(issues(add("tree", { nodes: [{ id: "a", label: "A" }, { id: "b", label: "B", parent: "z" }] })),
    at("parent of 'b' points at 'z', which is not one of its nodes: a, b"));
  assert.deepEqual(issues(add("tree", { nodes: [{ id: "a", label: "A" }, { id: "b", label: "B", parent: "c" }, { id: "c", label: "C", parent: "b" }] })),
    at("node 'b' is not under the root; its parents form a loop").concat(at("node 'c' is not under the root; its parents form a loop")));
  assert.deepEqual(issues(add("graph", { edges: [{ id: "e", from: "web", to: "cache" }] })),
    at("edge 'e' points at 'cache', which is not one of its nodes: web, api, auth, orders, db, kafka"));
  assert.deepEqual(issues(add("states", { current: "lost" })),
    at("current points at 'lost', which is not one of its states: placed, paid, shipped, delivered, cancelled"));
  assert.deepEqual(issues(add("flow"), set({ active: "refund" })),
    at("active points at 'refund', which is not one of its steps: order, stock, charge, backorder, paid, ship", 1));
  assert.deepEqual(issues(add("layers"), set({ highlight: ["dns"] })),
    at("highlight points at 'dns', which is not one of its layers: app, http, tls, tcp, ip", 1));
  assert.deepEqual(issues(add("files", { entries: [{ id: "a", path: "src/a.ts" }, { id: "b", path: "src/a.ts" }] })), at("path 'src/a.ts' listed twice"));
  assert.deepEqual(issues(add("commits", { commits: [{ id: "a1", branch: "main" }, { id: "b2", branch: "main", parents: ["c3"] }, { id: "c3", branch: "dev" }] })),
    at("commit 'c3' points at 'dev', which is not one of its branches: main, fix").concat(at("parent 'c3' of commit 'b2' must be a commit listed before it")));
});

test("a set outside the type's state is rejected with its path", () => {
  const bad = (type: string, state: Record<string, unknown>) => issues(add(type), set(state)).map((i) => i.path);
  assert.deepEqual(issues(add("tree"), set({ dir: "right" })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "dir"; settable: nodes, highlight' }]);
  assert.deepEqual(bad("graph", { highlight: "orders" }), ["beats.0.do.1.state.highlight"]);
  assert.deepEqual(bad("states", { states: [] }), ["beats.0.do.1.state"]);
  assert.deepEqual(bad("flow", { active: 5 }), ["beats.0.do.1.state.active"]);
  assert.deepEqual(bad("layers", { layers: [] }), ["beats.0.do.1.state"]);
  assert.deepEqual(bad("files", { entries: [{ id: "a", path: "/etc/passwd" }] }), ["beats.0.do.1.state.entries.0.path"]);
  assert.deepEqual(bad("commits", { head: "fix tax" }), ["beats.0.do.1.state.head"]);
});

test("arrows attach to parts and packets ride edges", () => {
  const ops = [add("layers", { at: [8, 4.5] }), { op: "add", type: "box", id: "user", label: "Ana", at: [3, 2] },
    { op: "add", type: "arrow", id: "req", from: "user", to: "x.app", label: "order 1042" }, { op: "trace", ids: ["req", "x.down-app", "x.down-http"] }];
  assert.deepEqual(issues(...ops), []);
  assert.deepEqual(issues(add("layers"), { op: "trace", ids: ["x.down-ip"] }),
    [{ path: "beats.0.do.1.ids.0", message: "'x' has no edge 'down-ip': down-app, down-http, up-http, down-tls, up-tls, down-tcp, up-tcp, up-ip" }]);
});

test("layouts: retry loops detour, files nest, merges get a second edge", () => {
  const flow = edgesOf(parsed("flow"));
  assert.equal(flow.retry.length, 6); // around the side, not through Charge card
  assert.equal(flow.check.length, 2);
  assert.deepEqual(fileRows([{ id: "a", path: "src/a.ts" }, { id: "r", path: "README.md" }, { id: "b", path: "src/lib/b.ts" }]).rows.map((r) => r.key),
    ["src/", "src/a.ts", "src/lib/", "src/lib/b.ts", "README.md"]);
  const merged = parseSpec({ title: "t", beats: [{ do: [add("commits"), set(def("commits").example.set!)] }] }).spec!.beats[0].do;
  const after = { ...(merged[0] as Add), ...(merged[1] as { state: object }).state } as Add;
  assert.deepEqual(names(edgesOf(after)), ["b2", "c3", "d4", "e5", "f6", "f6-2"]);
});
