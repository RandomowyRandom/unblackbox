import assert from "node:assert/strict";
import { test } from "node:test";
import { jsonLines, lineText } from "../../src/components/messages.ts";
import { gallery } from "../../src/gallery.ts";
import { edgesOf, parseSpec, partsOf, sizeOf, type Add } from "../../src/spec.ts";
import { buildTimeline } from "../../src/timeline.ts";

const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const add = (type: string, fields: object) => ({ op: "add", type, id: "x", at: [8, 4.5], ...fields });
const set = (state: object) => ({ op: "set", id: "x", state });
const issues = (...ops: unknown[]) => parseSpec(one(...ops)).issues;
const parsed = (type: string, fields: object) => parseSpec(one(add(type, fields))).spec!.beats[0].do[0] as Add;

const msg = { kind: "event", title: "OrderPlaced", fields: [{ key: "orderId", value: "1042" }, { key: "total", value: "EUR 42.50" }] };
const req = { method: "POST", path: "/orders/1042/pay", status: 201, latency: 84 };
const tok = { segments: [{ label: "header", value: "alg: HS256" }, { label: "payload", value: "sub: ana" }], signed: true };
const json = { value: { user: { id: 1042, name: "Ana" }, items: ["mug", "tea"], total: 42.5 } };
const diff = { title: "retry.ts", lines: [{ op: "-", text: "attempts: 1," }, { op: "+", text: "attempts: 3," }] };
const term = { title: "api", lines: ["$ curl -s localhost:8080/health", "ok"] };
const tf = { input: "hunter2", fn: { label: "SHA-256", icon: "hash" }, output: "f52f…a3c1" };

test("every messages example parses, sets included, and builds a timeline", () => {
  const { spec, issues } = parseSpec(gallery("messages"));
  assert.deepEqual(issues, []);
  const t = buildTimeline(spec!, spec!.beats.map(() => ({ file: null, sec: 0 })));
  assert.equal(t.beats.length, 7);
});

test("message: field keys are parts; highlight must name a field", () => {
  assert.deepEqual(Object.keys(partsOf(parsed("message", msg))), ["orderId", "total"]);
  assert.deepEqual(issues(add("message", { ...msg, highlight: ["status"] })),
    [{ path: "beats.0.do.0", message: "highlight key 'status' is not a field: orderId, total" }]);
  assert.deepEqual(issues(add("message", { ...msg, fields: [msg.fields[0], msg.fields[0]] })),
    [{ path: "beats.0.do.0", message: "field id 'orderId' used twice" }]);
  assert.deepEqual(issues(add("message", msg), set({ title: "x" })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "title"; settable: fields, highlight' }]);
});

test("request: status is a part; latency needs a status; status stays a code", () => {
  assert.deepEqual(Object.keys(partsOf(parsed("request", req))), ["status"]);
  assert.deepEqual(issues(add("request", { method: "GET", path: "/health", latency: 12 })),
    [{ path: "beats.0.do.0", message: "latency needs a status; set both when the response arrives" }]);
  assert.deepEqual(issues(add("request", req), set({ status: 700 })).map((i) => i.path), ["beats.0.do.1.state.status"]);
});

test("token: segments and the seal are parts; tampered names a segment of a signed token", () => {
  assert.deepEqual(Object.keys(partsOf(parsed("token", tok))), ["header", "payload", "seal"]);
  assert.deepEqual(issues(add("token", tok), set({ tampered: "body" })),
    [{ path: "beats.0.do.1", message: "tampered segment 'body' is not one of: header, payload" }]);
  assert.deepEqual(issues(add("token", { ...tok, signed: false, tampered: "payload" })),
    [{ path: "beats.0.do.0", message: "tampered needs signed: true; only a signed token shows the change" }]);
  assert.deepEqual(issues(add("token", tok), set({ signed: false })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "signed"; settable: segments, tampered' }]);
});

test("json: prints like JSON, top-level keys are parts, depth, length and highlight paths are checked", () => {
  assert.deepEqual(jsonLines(json.value).map(lineText), [
    "{", '  "user": {', '    "id": 1042,', '    "name": "Ana"', "  },", '  "items": ["mug", "tea"],', '  "total": 42.5', "}",
  ]);
  const parts = partsOf(parsed("json", json));
  assert.deepEqual(Object.keys(parts), ["user", "items", "total"]);
  assert.equal(parts.user.h, 4 * 0.4); // the user block spans its 4 lines
  assert.deepEqual(issues(add("json", { ...json, highlight: ["user.email"] })),
    [{ path: "beats.0.do.0", message: "highlight 'user.email' is not a path in value" }]);
  assert.deepEqual(issues(add("json", { value: { a: { b: { c: { d: 1 } } } } })),
    [{ path: "beats.0.do.0", message: "value is 4 levels deep; keep it to 3" }]);
  const long = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`k${i}`, i]));
  assert.deepEqual(issues(add("json", json), set({ value: long })),
    [{ path: "beats.0.do.1", message: "value renders 11 lines; keep it to 10" }]);
  assert.deepEqual(issues(add("json", json), set({ highlight: ["a b"] })).map((i) => i.path), ["beats.0.do.1.state.highlight.0"]);
});

test("diff: needs a change; lines are checked on set", () => {
  assert.deepEqual(issues(add("diff", { ...diff, lines: [{ op: " ", text: "same" }] })),
    [{ path: "beats.0.do.0", message: "a diff needs at least one + or - line" }]);
  assert.deepEqual(issues(add("diff", diff), set({ lines: [{ op: "*", text: "x" }] })).map((i) => i.path), ["beats.0.do.1.state.lines.0.op"]);
});

test("terminal: a prompt needs a command; lines are capped", () => {
  assert.deepEqual(issues(add("terminal", term), set({ lines: [...term.lines, "$ "] })),
    [{ path: "beats.0.do.1", message: "line 3 is a bare prompt; write the command after '$ '" }]);
  assert.deepEqual(issues(add("terminal", term), set({ lines: Array(9).fill("ok") })).map((i) => i.path), ["beats.0.do.1.state.lines"]);
});

test("transform: input, fn and output are parts, edges run through it, a packet can trace them", () => {
  const el = parsed("transform", tf);
  assert.deepEqual(Object.keys(partsOf(el)), ["input", "fn", "output"]);
  const edges = edgesOf(el);
  assert.deepEqual(Object.keys(edges), ["in", "out", "through"]);
  assert.deepEqual(edges.through, [...edges.in, ...edges.out]);
  assert.deepEqual(issues(add("transform", tf), { op: "trace", ids: ["x.through"] }), []);
  assert.deepEqual(issues(add("transform", { ...tf, output: "hunter2" })),
    [{ path: "beats.0.do.0", message: "output equals input; a transform changes it" }]);
  assert.deepEqual(issues(add("transform", tf), set({ fn: { label: "MD5", icon: "hash" } })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "fn"; settable: input, output' }]);
});

test("titles and paths are not empty; diff and terminal lines are single lines", () => {
  assert.deepEqual(issues(add("message", { ...msg, title: "" })).map((i) => i.path), ["beats.0.do.0.title"]);
  assert.deepEqual(issues(add("request", { ...req, path: "" })).map((i) => i.path), ["beats.0.do.0.path"]);
  assert.deepEqual(issues(add("diff", { ...diff, lines: [{ op: "+", text: "a\nb" }] })).map((i) => i.path), ["beats.0.do.0.lines.0.text"]);
  assert.deepEqual(issues(add("terminal", term), set({ lines: ["$ ls\tx"] })).map((i) => i.path), ["beats.0.do.1.state.lines.0"]);
});

test("cards are as wide as their title and text, never squeezed so text is cut off", () => {
  const width = (type: string, fields: object) => sizeOf(parsed(type, fields))[0];
  assert.ok(width("diff", { ...diff, title: "a".repeat(60) }) >= 60 * 0.15);
  assert.ok(width("terminal", { ...term, title: "a".repeat(60) }) >= 60 * 0.15);
  assert.ok(width("message", { ...msg, fields: [{ key: "k".repeat(24), value: "v".repeat(40) }] }) >= (24 + 40) * 0.15);
  assert.ok(partsOf(parsed("transform", { ...tf, input: "i".repeat(32) })).input.w >= 32 * 0.15);
});

test("token: a signed token has no segment called seal; nothing is wider than the canvas", () => {
  assert.deepEqual(issues(add("token", { segments: [{ label: "seal", value: "x" }], signed: true })),
    [{ path: "beats.0.do.0", message: "segment label 'seal' is taken by the seal part of a signed token; rename the segment" }]);
  const wide = /wider than the 16-unit canvas/;
  assert.match(issues(add("token", { segments: ["a", "b", "c", "d"].map((label) => ({ label, value: "v".repeat(24) })), signed: true }))[0].message, wide);
  assert.match(issues(add("transform", { input: "i".repeat(32), output: "o".repeat(32), fn: { label: "f".repeat(60), icon: "hash" } }))[0].message, wide);
  assert.match(issues(add("json", json), set({ value: { list: Array(6).fill("s".repeat(40)) } }))[0].message, wide);
});

test("json: highlight paths may use ':' like the keys they name", () => {
  assert.deepEqual(issues(add("json", { value: { "user:42": { name: "Ana" } }, highlight: ["user:42.name"] })), []);
});

test("json: a nested limit names its own path and says what is wrong, not 'Invalid input'", () => {
  assert.deepEqual(issues(add("json", { value: { a: [1, 2, 3, 4, 5, 6, 7] } })),
    [{ path: "beats.0.do.0.value.a", message: "array of 7 items; show at most 6" }]);
  assert.deepEqual(issues(add("json", { value: { a: { b: ["s".repeat(41)] } } })).map((i) => i.path), ["beats.0.do.0.value.a.b.0"]);
  assert.deepEqual(issues(add("json", json), set({ value: { a: { "x y": 1 } } })),
    [{ path: "beats.0.do.1.state.value.a.x y", message: "key 'x y': use up to 24 letters, digits, _, - or : so it works as a part ref" }]);
});
