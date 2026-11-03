import { z } from "zod";
import { CAPTION } from "./core.ts";
import { defineComponent, Label, PartId, uniqueIds, type Pt, type Rect } from "./registry.ts";

// Data structures drawn as what they are: a stack of slabs, a ring of slots, a table, a log with offsets.
// The layout helpers below are shared with the renderers (src/video/components/collections.tsx), so parts sit where things are drawn.

const Short = z.string().max(16);
const Key = PartId.max(16);
const Index = z.number().int().min(0);
const Caption = Label.optional().describe("caption under it");
const Slots = z.array(Index).max(16).optional().describe("0-based slots that glow, e.g. the one that changed");
const MONO = 0.135; // grid units per character of 0.22u mono text
const chars = (s: string[]) => Math.max(0, ...s.map((x) => x.length));
const cap = (label?: string) => (label ? CAPTION : 0);
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const outOf = (what: string, n: number, idx?: number[]) => (idx?.some((i) => i >= n) ? [`highlight index out of range; ${what} has ${n}`] : []);
const missing = (what: string, known: string[], wanted: string[]) => wanted.filter((k) => !known.includes(k)).map((k) => `highlight ${what} '${k}' is not there`);
const rects = (r: Rect[], names = r.map((_, i) => String(i))) => Object.fromEntries(r.map((x, i) => [names[i], x]));

// stack: slabs in an open box, top first; a push lands on top
const SLAB = { w: 2.4, h: 0.5, step: 0.58 };
const stackBody = (n: number) => Math.max(n, 1) * SLAB.step + 0.22;
export const stackY = (i: number, n: number, c: number) => -(stackBody(n) + c) / 2 + 0.39 + i * SLAB.step;

// ring: slot 0 at the top, clockwise
export const RING = 1.35;
export const ringSlot = (n: number) => Math.min(0.7, 2 * RING * Math.sin(Math.PI / n) - 0.1);
export const ringAngle = (k: number, n: number) => -Math.PI / 2 + (2 * Math.PI * k) / n;
export const ringAt = (k: number, n: number): Pt => [RING * Math.cos(ringAngle(k, n)), RING * Math.sin(ringAngle(k, n))];

// table and kv: rows of ROW height in a panel, an optional header row
export const ROW = 0.5;
const colW = (texts: string[]) => Math.max(1, chars(texts) * MONO + 0.35);
export const sheetH = (n: number, header: boolean) => (header ? ROW : 0) + ROW * Math.max(n, 1) + 0.1;
export const sheetRowY = (i: number, n: number, header: boolean, c: number) => -(sheetH(n, header) + c) / 2 + 0.05 + (header ? ROW : 0) + ROW * (i + 0.5);
type TableEl = { columns: string[]; rows: { key: string; cells: string[] }[] };
export const tableCols = (el: TableEl) => el.columns.map((col, j) => colW([col, ...el.rows.map((r) => (j ? r.cells[j - 1] ?? "" : r.key))]));
export const kvCols = (el: { entries: { key: string; value: string }[] }) => [colW(el.entries.map((e) => e.key)), colW(el.entries.map((e) => e.value))];
const sheetParts = (keys: string[], cols: number[], header: boolean, c: number) =>
  rects(keys.map((_, i) => ({ x: 0, y: sheetRowY(i, keys.length, header, c), w: sum(cols), h: ROW })), keys);

// log: a row of entries with offsets above and consumer cursors below; one spare slot marks where the next append lands
type LogEl = { entries: string[]; start?: number; cursors?: Record<string, number>; label?: string };
export const logCell = (entries: string[]) => Math.max(0.74, chars(entries) * MONO + 0.2);
export const logX = (k: number, entries: string[]) => (k - entries.length / 2) * (logCell(entries) + 0.06);
export const logStack = (cursors: Record<string, number> = {}) => {
  const at = Object.values(cursors);
  return Math.max(0, ...at.map((o) => at.filter((x) => x === o).length));
};
export const logH = (el: LogEl) => 1.1 + (logStack(el.cursors) ? 0.22 + 0.28 * logStack(el.cursors) : 0) + cap(el.label);

// grid: square cells GRID_STEP apart
export const GRID_STEP = 0.55;
export const gridAt = (r: number, c: number, rows: number, cols: number, cp: number): Pt =>
  [(c - (cols - 1) / 2) * GRID_STEP, (r - (rows - 1) / 2) * GRID_STEP - cp / 2];

// bytes: index row, byte cells, then a bracket and name per field
type BytesEl = { values: string[]; fields?: { name: string; from: number; to: number }[]; label?: string };
export const byteCell = (values: string[]) => Math.max(0.62, chars(values) * MONO + 0.22);
export const byteX = (i: number, values: string[]) => (i - (values.length - 1) / 2) * (byteCell(values) + 0.06);
export const bytesH = (el: BytesEl) => 0.9 + (el.fields?.length ? 0.55 : 0) + cap(el.label);

export const collections = [
  defineComponent({
    type: "stack", family: "collections", summary: "a stack, last in first out: a call stack, undo history",
    fields: {
      items: z.array(Short).max(8).describe("entries, top first; push = add at the front, pop = drop the first"),
      highlight: Slots,
      label: Caption,
    },
    state: ["items", "highlight"],
    size: (el) => [2.8, stackBody(el.items.length) + cap(el.label)],
    parts: (el) => rects(el.items.map((_, i) => ({ x: 0, y: stackY(i, el.items.length, cap(el.label)), w: SLAB.w, h: SLAB.h }))),
    check: (el) => outOf("stack", el.items.length, el.highlight),
    lint: (el) => (el.items.length > 6 ? [`stack of ${el.items.length} items; show the top 5 or so, the viewer only tracks the top`] : []),
    example: { add: { items: ["bold title", "type heading"], label: "Undo history" }, set: { items: ["paste image", "bold title", "type heading"], highlight: [0] } },
  }),
  defineComponent({
    type: "ring", family: "collections", summary: "slots around a circle with named pointers: ring buffer, hash ring",
    fields: {
      slots: z.array(z.string().max(5)).min(2).max(12).describe("slot contents clockwise from the top, \"\" for an empty one"),
      pointers: z.array(z.strictObject({ label: z.string().max(8), at: Index.describe("slot it points at") })).max(3).optional()
        .describe("named heads such as read and write; changing `at` moves them forward around the ring"),
      label: z.string().max(16).optional().describe("name shown in the middle of the ring"),
    },
    state: ["slots", "pointers"],
    size: (el) => {
      const r = RING + ringSlot(el.slots.length) / 2 + 0.4;
      return [Math.max(4.6, 2 * (r + 0.12 * chars((el.pointers ?? []).map((q) => q.label)) + 0.1)), 2 * (r + 0.2)];
    },
    parts: (el) => rects(el.slots.map((_, i) => {
      const [x, y] = ringAt(i, el.slots.length);
      const s = ringSlot(el.slots.length);
      return { x, y, w: s, h: s };
    })),
    edges: (el) => ({ loop: Array.from({ length: 49 }, (_, k) => ringAt((k / 48) * el.slots.length, el.slots.length)) }),
    check: (el) => [
      ...(el.pointers ?? []).filter((q) => q.at >= el.slots.length).map((q) => `pointer '${q.label}' at slot ${q.at}; the ring has ${el.slots.length} slots`),
      ...uniqueIds("pointer", (el.pointers ?? []).map((q) => q.label)),
    ],
    lint: (el) => (el.slots.length > 8 ? [`ring of ${el.slots.length} slots; 8 or fewer read at a glance`] : []),
    example: {
      add: { slots: ["", "", "1040", "1041", "1042", "", "", ""], pointers: [{ label: "read", at: 2 }, { label: "write", at: 5 }], label: "orders" },
      set: { slots: ["", "", "", "1041", "1042", "1043", "", ""], pointers: [{ label: "read", at: 3 }, { label: "write", at: 6 }] },
    },
  }),
  defineComponent({
    type: "table", family: "collections", summary: "database rows under column names: a table, an index lookup",
    fields: {
      columns: z.array(Short).min(2).max(5).describe("column names; the first is the key column"),
      rows: z.array(z.strictObject({ key: Key.describe("the row's key, also its part name"), cells: z.array(Short).max(4).describe("the other columns, in order") }))
        .max(6).describe("rows in display order"),
      highlight: z.array(z.union([Key, z.tuple([Key, Short])])).max(8).optional().describe("row keys, or [key, column] for one cell, that glow"),
      label: Caption,
    },
    state: ["rows", "highlight"],
    size: (el) => [sum(tableCols(el)) + 0.1, sheetH(el.rows.length, true) + cap(el.label)],
    parts: (el) => sheetParts(el.rows.map((r) => r.key), tableCols(el), true, cap(el.label)),
    check: (el) => [
      ...el.rows.filter((r) => r.cells.length !== el.columns.length - 1).map((r) => `row '${r.key}' has ${r.cells.length} cells; it needs ${el.columns.length - 1}, one per column after the key`),
      ...uniqueIds("row", el.rows.map((r) => r.key)),
      ...missing("row", el.rows.map((r) => r.key), (el.highlight ?? []).map((h) => (typeof h === "string" ? h : h[0]))),
      ...missing("column", el.columns, (el.highlight ?? []).flatMap((h) => (typeof h === "string" ? [] : [h[1]]))),
    ],
    lint: (el) => (el.rows.length > 4 ? [`table of ${el.rows.length} rows; show the 3 or 4 that matter`] : []),
    example: {
      add: { columns: ["order", "customer", "status"], rows: [{ key: "1041", cells: ["Ben", "paid"] }, { key: "1042", cells: ["Ana", "pending"] }], label: "orders" },
      set: { rows: [{ key: "1041", cells: ["Ben", "paid"] }, { key: "1042", cells: ["Ana", "shipped"] }, { key: "1043", cells: ["Sam", "pending"] }], highlight: [["1042", "status"], "1043"] },
    },
  }),
  defineComponent({
    type: "kv", family: "collections", summary: "keys mapped to values: a cache, hash map, session store",
    fields: {
      entries: z.array(z.strictObject({ key: Key.describe("also its part name, e.g. cache.sess-ana"), value: Short })).max(8),
      highlight: z.array(Key).max(8).optional().describe("keys whose entry glows, e.g. the one just written"),
      label: Caption,
    },
    state: ["entries", "highlight"],
    size: (el) => [sum(kvCols(el)) + 0.1, sheetH(el.entries.length, false) + cap(el.label)],
    parts: (el) => sheetParts(el.entries.map((e) => e.key), kvCols(el), false, cap(el.label)),
    check: (el) => [...uniqueIds("key", el.entries.map((e) => e.key)), ...missing("key", el.entries.map((e) => e.key), el.highlight ?? [])],
    lint: (el) => (el.entries.length > 6 ? [`${el.entries.length} entries; show the few the story needs`] : []),
    example: {
      add: { entries: [{ key: "sess-ana", value: "cart: 2 mugs" }, { key: "sess-ben", value: "cart: empty" }], label: "Session cache" },
      set: { entries: [{ key: "sess-ana", value: "cart: 3 mugs" }, { key: "sess-ben", value: "cart: empty" }, { key: "sess-sam", value: "cart: 1 lamp" }], highlight: ["sess-ana", "sess-sam"] },
    },
  }),
  defineComponent({
    type: "log", family: "collections", summary: "an append-only log with offsets and consumer cursors: WAL, Kafka topic",
    fields: {
      entries: z.array(z.string().max(10)).max(10).describe("records, oldest first; append = add at the end"),
      start: Index.optional().describe("offset of the first entry shown, default 0; raise it when old entries are deleted"),
      cursors: z.record(Key, Index).refine((c) => Object.keys(c).length <= 4, "at most 4 cursors").optional()
        .describe("consumer name to the offset it reads next; start + entries.length means caught up"),
      label: Caption,
    },
    state: ["entries", "start", "cursors"],
    size: (el) => [(el.entries.length + 1) * (logCell(el.entries) + 0.06), logH(el)],
    parts: (el) => rects(el.entries.map((_, i) => ({ x: logX(i, el.entries), y: -logH(el) / 2 + 0.7, w: logCell(el.entries), h: 0.74 })),
      el.entries.map((_, i) => String((el.start ?? 0) + i))),
    check: (el) => {
      const [from, to] = [el.start ?? 0, (el.start ?? 0) + el.entries.length];
      return Object.entries(el.cursors ?? {}).filter(([, o]) => o < from || o > to).map(([name, o]) => `cursor '${name}' at ${o} is outside the log: ${from} to ${to}`);
    },
    lint: (el) => (el.entries.length > 8 ? [`log of ${el.entries.length} entries; show the last 6 or so and raise start`] : []),
    example: {
      add: { entries: ["1038", "1039", "1040", "1041", "1042"], start: 40, cursors: { billing: 42, email: 45 }, label: "orders topic" },
      set: { entries: ["1038", "1039", "1040", "1041", "1042", "1043"], cursors: { billing: 44, email: 45 } },
    },
  }),
  defineComponent({
    type: "grid", family: "collections", summary: "a 2D grid of cells: memory pages, a bitmap, a heatmap",
    fields: {
      rows: z.array(z.array(z.string().max(3)).min(1).max(12)).min(1).max(8).describe("rows of short cell values, all the same length; \"\" for an empty cell"),
      shade: z.boolean().optional().describe("numeric cells get darker the larger they are: a heatmap"),
      highlight: z.array(z.tuple([Index, Index])).max(16).optional().describe("[row, column] cells that glow"),
      label: Caption,
    },
    state: ["rows", "highlight"],
    size: (el) => [el.rows[0].length * GRID_STEP + 0.05, el.rows.length * GRID_STEP + 0.05 + cap(el.label)],
    parts: (el) => Object.fromEntries(el.rows.flatMap((row, r) => row.map((_, c) => {
      const [x, y] = gridAt(r, c, el.rows.length, row.length, cap(el.label));
      return [`${r}-${c}`, { x, y, w: 0.5, h: 0.5 }];
    }))),
    check: (el) => [
      ...el.rows.flatMap((row, r) => (row.length === el.rows[0].length ? [] : [`row ${r} has ${row.length} cells; every row needs ${el.rows[0].length}`])),
      ...(el.highlight ?? []).filter(([r, c]) => r >= el.rows.length || c >= el.rows[0].length)
        .map(([r, c]) => `highlight [${r}, ${c}] is outside the ${el.rows.length} x ${el.rows[0].length} grid`),
    ],
    lint: (el) => (el.rows.length * el.rows[0].length > 48 ? [`${el.rows.length * el.rows[0].length} cells; 48 or fewer keep the pattern readable`] : []),
    example: {
      add: { rows: [["1", "2", "1", "0", "1", "2"], ["2", "3", "4", "3", "2", "1"], ["0", "1", "1", "2", "1", "0"]], shade: true, label: "requests per shard" },
      set: { rows: [["1", "2", "1", "0", "1", "2"], ["2", "3", "9", "9", "2", "1"], ["0", "1", "1", "2", "1", "0"]], highlight: [[1, 2], [1, 3]] },
    },
  }),
  defineComponent({
    type: "bytes", family: "collections", summary: "bytes in a row with named fields: a binary layout, packet header",
    fields: {
      values: z.array(z.string().regex(/^([0-9A-Fa-f]{1,2}|[01]{3,8})$/, "a byte as hex (\"C3\") or bits (\"0101\")")).min(1).max(16),
      fields: z.array(z.strictObject({ name: Key.describe("field name, also its part name"), from: Index, to: Index.describe("last byte, inclusive") })).max(6).optional()
        .describe("brackets under the bytes naming each field"),
      highlight: Slots,
      label: Caption,
    },
    state: ["values", "highlight"],
    size: (el) => [el.values.length * (byteCell(el.values) + 0.06), bytesH(el)],
    parts: (el) => {
      const [cw, y] = [byteCell(el.values), -bytesH(el) / 2 + 0.59];
      const field = (f: { from: number; to: number }): Rect => ({ x: (byteX(f.from, el.values) + byteX(f.to, el.values)) / 2, y, w: byteX(f.to, el.values) - byteX(f.from, el.values) + cw, h: 0.62 });
      return { ...rects(el.values.map((_, i) => field({ from: i, to: i }))), ...Object.fromEntries((el.fields ?? []).map((f) => [f.name, field(f)])) };
    },
    check: (el) => {
      const fs = el.fields ?? [];
      const n = el.values.length;
      return [
        ...fs.filter((f) => f.from > f.to || f.to >= n).map((f) => `field '${f.name}' covers bytes ${f.from} to ${f.to}; there are ${n} bytes, 0 to ${n - 1}`),
        ...fs.flatMap((f, i) => fs.slice(i + 1).filter((g) => g.from <= f.to && f.from <= g.to).map((g) => `fields '${f.name}' and '${g.name}' overlap`)),
        ...uniqueIds("field", fs.map((f) => f.name)),
        ...fs.filter((f) => /^\d+$/.test(f.name)).map((f) => `field '${f.name}' clashes with a byte index; give it a name`),
        ...outOf("bytes", n, el.highlight),
      ];
    },
    lint: (el) => [
      ...(el.values.length > 12 ? [`${el.values.length} bytes; show the 12 or fewer that matter`] : []),
      ...(el.fields ?? []).filter((f) => f.name.length * 0.12 > byteX(f.to, el.values) - byteX(f.from, el.values) + byteCell(el.values) + 0.06)
        .map((f) => `field name '${f.name}' is wider than its bytes; shorten it`),
    ],
    example: {
      add: { values: ["01", "03", "00", "2A", "00", "00", "04", "12"], fields: [{ name: "ver", from: 0, to: 0 }, { name: "type", from: 1, to: 1 }, { name: "length", from: 2, to: 3 }, { name: "order_id", from: 4, to: 7 }], label: "order message" },
      set: { values: ["01", "03", "00", "2A", "00", "00", "04", "13"], highlight: [7] },
    },
  }),
] as const;
