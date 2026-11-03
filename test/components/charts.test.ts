import assert from "node:assert/strict";
import { test } from "node:test";
import { charts, niceMax, vennLayout } from "../../src/components/charts.ts";
import { parseSpec, partsOf, sizeOf, type Add } from "../../src/spec.ts";

const def = (type: string) => charts.find((d) => d.type === type)!;
const add = (type: string, fields: Record<string, unknown>) => ({ op: "add", type, id: "c", at: [8, 4.5], ...fields });
const one = (...ops: unknown[]) => ({ title: "t", beats: [{ do: ops }] });
const set = (state: unknown) => ({ op: "set", id: "c", state });
const issues = (...ops: unknown[]) => parseSpec(one(...ops)).issues;

test("every charts example parses, and its set applies without errors", () => {
  assert.deepEqual(charts.map((d) => d.type), ["bars", "chart", "donut", "compare", "venn", "funnel"]);
  for (const d of charts) {
    assert.deepEqual(issues(add(d.type, d.example.add), set(d.example.set)), [], d.type);
    assert.ok(d.summary.length <= 90, d.type);
  }
});

test("axes end on a round number at or above the largest value", () => {
  assert.deepEqual([340, 210, 900, 1000, 0.3, 0].map(niceMax), [400, 250, 1000, 1000, 0.3, 1]);
});

test("bars: values past max are errors, a bar is a part, a negative value is rejected", () => {
  const bars = [{ label: "eu", value: 120 }, { label: "us", value: 340 }];
  assert.deepEqual(issues(add("bars", { unit: "ms", bars, max: 300 })), [{ path: "beats.0.do.0", message: "bar 'us' is 340, above max 300" }]);
  assert.deepEqual(issues(add("bars", { unit: "ms", bars: [...bars, { label: "eu", value: 1 }] })),
    [{ path: "beats.0.do.0", message: "two bars are labelled 'eu'; direct labels must tell them apart" }]);
  assert.deepEqual(Object.keys(partsOf(add("bars", { unit: "ms", bars }) as Add)), ["0", "1"]);
  assert.deepEqual(issues(add("bars", { unit: "ms", bars }), set({ bars: [{ label: "eu", value: -1 }] })).map((i) => i.path), ["beats.0.do.1.state.bars.0.value"]);
});

test("chart: series need distinct labels; only series can be set", () => {
  const chart = { xLabel: "min", yLabel: "ms", series: [{ label: "p99", points: [1, 2] }, { label: "p99", points: [3, 4] }] };
  assert.deepEqual(issues(add("chart", chart)), [{ path: "beats.0.do.0", message: "two series are labelled 'p99'; direct labels must tell them apart" }]);
  assert.deepEqual(issues(add("chart", def("chart").example.add), set({ xLabel: "s" })),
    [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "xLabel"; settable: series' }]);
});

test("donut: an empty whole is an error; a set may not drop to no slices", () => {
  assert.deepEqual(issues(add("donut", { slices: [{ label: "hit", value: 0 }] })), [{ path: "beats.0.do.0", message: "slices add up to 0; give at least one a value" }]);
  assert.deepEqual(issues(add("donut", def("donut").example.add), set({ slices: [] })).map((i) => i.path), ["beats.0.do.1.state.slices"]);
});

test("compare: titles must differ; a verdict is good or bad", () => {
  const col = { title: "A", items: ["x"] };
  assert.deepEqual(issues(add("compare", { columns: [col, col] })), [{ path: "beats.0.do.0", message: "two columns are labelled 'A'; direct labels must tell them apart" }]);
  assert.deepEqual(issues(add("compare", def("compare").example.add), set({ columns: [{ ...col, verdict: "meh" }, col] })).map((i) => i.path),
    ["beats.0.do.1.state.columns.0.verdict"]);
});

test("venn: sets are parts, items must name real sets, highlight is checked after a set", () => {
  const venn = def("venn").example.add as { sets: { id: string; label: string }[]; items: { label: string; in: string[] }[] };
  assert.deepEqual(Object.keys(partsOf(add("venn", venn) as Add)), ["admin", "billing"]);
  assert.deepEqual(issues(add("venn", { ...venn, items: [{ label: "Ana", in: ["ops"] }] })),
    [{ path: "beats.0.do.0", message: "item 'Ana' is in unknown set 'ops'; sets: admin, billing" }]);
  assert.deepEqual(issues(add("venn", venn), set({ highlight: ["ops"] })), [{ path: "beats.0.do.1", message: "highlight has unknown set 'ops'; sets: admin, billing" }]);
  assert.deepEqual(issues(add("venn", venn), set({ sets: [] })), [{ path: "beats.0.do.1.state", message: 'Unrecognized key: "sets"; settable: items, highlight' }]);
  // items sit in their own region: Ben (admin only) left of Ana (both), Chen (billing only) right
  const [ana, ben, chen] = vennLayout(venn).items;
  assert.ok(ben[0] < ana[0] && ana[0] < chen[0]);
});

test("funnel: a stage wider than the one before is an error; stages are parts", () => {
  const stages = [{ label: "free", value: 380 }, { label: "paid", value: 420 }];
  assert.deepEqual(issues(add("funnel", { stages })),
    [{ path: "beats.0.do.0", message: "stage 'paid' (420) is above the stage before it (380); a funnel only narrows" }]);
  const ok = def("funnel").example.add;
  assert.deepEqual(Object.keys(partsOf(add("funnel", ok) as Add)), ["0", "1", "2", "3"]);
  assert.deepEqual(issues(add("funnel", ok), set({ stages: [{ label: "a", value: 1 }] })).map((i) => i.path), ["beats.0.do.1.state.stages"]);
});

test("direct labels may not be empty: they are the only key", () => {
  assert.deepEqual(issues(add("bars", { unit: "ms", bars: [{ label: "", value: 1 }] })).map((i) => i.path), ["beats.0.do.0.bars.0.label"]);
  assert.deepEqual(issues(add("bars", { unit: "", bars: [{ label: "eu", value: 1 }] })).map((i) => i.path), ["beats.0.do.0.unit"]);
  assert.deepEqual(issues(add("compare", def("compare").example.add), set({ columns: [{ title: "A", items: [""] }, { title: "B", items: ["x"] }] })).map((i) => i.path),
    ["beats.0.do.1.state.columns.0.items.0"]);
  assert.deepEqual(issues(add("venn", { sets: [{ id: "a", label: "" }, { id: "b", label: "B" }], items: [] })).map((i) => i.path), ["beats.0.do.0.sets.0.label"]);
});

test("compare columns are wide enough for the longest title and item", () => {
  const long = { title: "Twenty characters ok", icon: "send", items: ["twenty-four characters!!"] };
  const [cw] = sizeOf(add("compare", { columns: [long, { title: "B", items: ["x"] }] }) as Add);
  assert.ok((cw - 0.3) / 2 >= 0.25 * 2 + 0.49 + 20 * 0.16, `compare ${cw}`);
});

test("a set that drops a bar an arrow points at is an error; tiny values still get an axis", () => {
  const bars = [{ label: "eu", value: 1 }, { label: "us", value: 2 }, { label: "ap", value: 3 }];
  const arrow = { op: "add", type: "arrow", id: "a", from: [1, 1], to: "c.2", label: "slow" };
  assert.deepEqual(issues(add("bars", { unit: "ms", bars }), arrow, set({ bars: bars.slice(0, 2) })),
    [{ path: "beats.0.do.2", message: "'a' still points at 'c.2', which this change removes" }]);
  assert.equal(niceMax(5e-324), 5e-324);
});
