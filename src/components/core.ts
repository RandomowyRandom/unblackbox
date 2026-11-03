import { z } from "zod";
import { defineComponent, GRID, Icon, Label, Pos, Ref, rowRects } from "./registry.ts";

export const MAX_CODE_LINES = 8; // a glimpse of a key type or interface, not an implementation
export const ICON_SIZE = { s: 0.6, m: 1, l: 1.6 } as const;
export const CAPTION = 0.45; // grid units a caption adds under an icon or a row of cells
const TEXT_SIZE = { h1: 0.62, h2: 0.42, body: 0.3 } as const;

const Source = z.union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v.join("\n") : v))
  .describe("source code: one string with \\n, or an array of lines (easier to write in JSON)");
export const Items = z.array(z.string().max(12)).min(1).max(16).describe("one short entry per slot, \"\" for an empty one: a queue, buckets, a cache");
export const Highlight = z.array(z.number().int().min(0)).optional().describe("0-based slots to make glow, e.g. the bucket that changed");
const lines = (s: string) => s.split("\n");
const inRange = (what: string, n: number, idx?: number[]) =>
  idx?.some((i) => i >= n) ? [`highlight index out of range; ${what} has ${n} slots`] : [];

export const core = [
  defineComponent({
    type: "box", family: "core", summary: "a component: a service, class or module, with an icon",
    fields: {
      label: Label.describe("component name, a few words"),
      icon: Icon.optional().describe("lucide icon shown above the label; give key components one"),
      w: z.number().positive().max(GRID.w).optional().describe("width in grid units, default 3"),
      h: z.number().positive().max(GRID.h).optional().describe("height in grid units, default 1.4, 2 with an icon"),
    },
    size: (el) => [el.w ?? 3, el.h ?? (el.icon ? 2 : 1.4)],
    example: { add: { label: "Checkout", icon: "shopping-cart" } },
  }),
  defineComponent({
    type: "icon", family: "core", summary: "an actor or a thing without a frame: user, agent, database",
    fields: {
      icon: Icon,
      label: Label.optional().describe("caption under the icon"),
      size: z.enum(["s", "m", "l"]).optional().describe("0.6 / 1 / 1.6 grid units, default m"),
    },
    size: (el) => [ICON_SIZE[el.size ?? "m"], ICON_SIZE[el.size ?? "m"] + (el.label ? CAPTION : 0)],
    example: { add: { icon: "user", label: "Ana" } },
  }),
  defineComponent({
    type: "group", family: "core", summary: "a system boundary drawn behind its components, name in the corner",
    fields: {
      label: Label.describe("system name shown in the top-left corner"),
      w: z.number().positive().max(GRID.w).optional().describe("width in grid units, default 6"),
      h: z.number().positive().max(GRID.h).optional().describe("height in grid units, default 4"),
    },
    size: (el) => [el.w ?? 6, el.h ?? 4],
    chunks: 0, // structure, not something the viewer has to hold
    example: { add: { label: "Shop backend" } },
  }),
  defineComponent({
    type: "cells", family: "core", summary: "a row of slots: a queue, buckets, a batch",
    fields: {
      items: Items,
      highlight: Highlight,
      label: Label.optional().describe("caption under the row"),
    },
    state: ["items", "highlight"],
    size: (el) => [el.items.length * 0.8, 0.8 + (el.label ? CAPTION : 0)],
    parts: (el) => Object.fromEntries(rowRects(el.items.length, 0.8, 0.74, 0.74, -(el.label ? CAPTION : 0) / 2).map((r, i) => [String(i), r])),
    check: (el) => inRange("cells", el.items.length, el.highlight),
    example: { add: { items: ["1041", "1042", "", ""], label: "Queue" }, set: { items: ["1042", "", "", ""], highlight: [0] } },
  }),
  defineComponent({
    type: "arrow", family: "core", summary: "what flows from one element (or part) to another",
    placed: false,
    fields: {
      from: z.union([Ref, Pos]).describe("element id, id.part, or [x, y]"),
      to: z.union([Ref, Pos]).describe("element id, id.part, or [x, y]"),
      label: Label.optional().describe("what flows along it, e.g. 'GET /user', 'cache miss'"),
      offset: z.number().min(-2).max(2).optional()
        .describe("slide the arrow sideways in grid units, + = left of its direction; ±0.25 keeps a request/reply pair apart; label follows the side"),
      line: z.enum(["solid", "dashed", "dotted"]).optional().describe("dashed = optional or async, dotted = weak or later; bad arrows are dashed anyway"),
      curve: z.number().min(-1).max(1).optional().describe("bend: 0 straight, ±0.3 a gentle arc (+ bends left of its direction); packets follow it"),
      heads: z.enum(["end", "both", "none"]).optional().describe("arrowheads, default end"),
      weight: z.enum(["thin", "normal", "thick"]).optional().describe("line weight: thick = the main path"),
    },
    size: () => [0, 0],
    refs: (el) => [el.from, el.to].filter((e): e is string => typeof e === "string"),
    chunks: 0,
    example: { host: { op: "add", type: "box", id: "host", label: "API", icon: "server", at: [5, 4.5] }, add: { from: "host", to: [12, 4.5], label: "GET /user", curve: 0.3 } },
  }),
  defineComponent({
    type: "text", family: "core", summary: "a title or a short label, never a sentence",
    fields: {
      text: z.string().max(80).describe("a short label or title, not a sentence; \\n breaks lines"),
      size: z.enum(["h1", "h2", "body"]).optional(),
    },
    // estimate: about 0.55 em per character
    size: (el) => {
      const s = TEXT_SIZE[el.size ?? "body"];
      return [Math.max(...lines(el.text).map((l) => l.length)) * s * 0.55, lines(el.text).length * s * 1.3];
    },
    chunks: 1,
    example: { add: { text: "Slow becomes later", size: "h2" } },
  }),
  defineComponent({
    type: "code", family: "core", summary: "a glimpse of a key type or interface, at most 8 lines",
    fields: {
      lang: z.string().describe("highlight language, e.g. ts, py, go, rust"),
      code: Source.describe(`a key type or interface, at most ${MAX_CODE_LINES} lines; string or array of lines`),
      title: Label.optional().describe("small file name label above the code"),
    },
    // 0.18 units per character, 0.45 per line, 0.7 padding (plus the title row)
    size: (el) => [Math.max(...lines(el.code).map((l) => l.length)) * 0.18 + 0.8, lines(el.code).length * 0.45 + 0.7 + (el.title ? 0.35 : 0)],
    example: { add: { lang: "ts", title: "order.ts", code: ["type Order = {", "  id: number", "  items: Item[]", "}"] } },
  }),
] as const;


