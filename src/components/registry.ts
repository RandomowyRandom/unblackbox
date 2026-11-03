import { icons } from "lucide-react";
import { z } from "zod";

// Grid is 16 x 9 units, origin top-left. Elements are centered on their position.
export const GRID = { w: 16, h: 9 } as const;

// Lucide icon by kebab-case name ("database", "gamepad-2"), see lucide.dev/icons.
export const iconFor = (name: string) =>
  icons[name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("") as keyof typeof icons];

export const Id = z.string().regex(/^[a-zA-Z][\w-]*$/, "id must start with a letter, then letters, digits, _ or -");
// An element, or one named part of it: "cache.1042", "tree.root". Parts and edges come from the component.
export const Ref = z.string().regex(/^[a-zA-Z][\w-]*(\.[\w:-]+)?$/, "use an element id, or id.part for a part of a component (e.g. cache.1042)");
// Ids of things inside one component (nodes, keys, stages): they become "element.part" refs.
export const PartId = z.string().regex(/^[\w:-]+$/, "use letters, digits, _, - or : so it works as a ref like 'cache.1042' or 'cache.user:42'");
export const Pos = z.tuple([z.number().min(0).max(GRID.w), z.number().min(0).max(GRID.h)]).describe("[x, y] in grid units (16 x 9)");
export const Color = z.enum(["accent", "muted", "good", "bad"]).describe("semantic color; hex is not allowed so the style stays consistent");
export const Wait = z.number().min(0).optional().describe("seconds after beat start before this action runs");
export const Icon = z.string().refine((n) => Boolean(iconFor(n)), "unknown icon; use a lucide.dev name such as database, server, user, bot, cloud, file-code")
  .describe("lucide.dev icon name in kebab-case, e.g. database, server, user, bot, cloud, gamepad-2, hard-drive, file-code");
// Short on-screen text; components cap their own counts, lint caps the words.
export const Label = z.string().max(60).regex(/\S/, "empty text draws nothing; write a few words or leave the field out");

export const SIZE = { s: 0.8, m: 1, l: 1.25 } as const;
export const Size = z.enum(["s", "m", "l"]).describe("scales the element and its footprint: 0.8 / 1 / 1.25");
export const Emphasis = z.enum(["quiet", "normal", "strong"]).describe("quiet = faded context, strong = glows as the subject");
export const Place = z.strictObject({
  of: Ref.describe("element (or part) to sit next to, as it is when this element is added"),
  side: z.enum(["left", "right", "above", "below", "center"]),
  gap: z.number().min(0).max(4).optional().describe("grid units between the two footprints, default 0.6"),
}).describe("position relative to another element instead of `at`");

export type Pos = z.infer<typeof Pos>;
export type Color = z.infer<typeof Color>;
export type Rect = { x: number; y: number; w: number; h: number }; // center offset from the element center + size, grid units
export type Pt = [number, number]; // offset from the element center, grid units

const BASE = {
  op: z.literal("add"), id: Id, wait: Wait,
  color: Color.optional(),
  emphasis: Emphasis.optional(),
};
const PLACED = {
  at: Pos.optional().describe("center in grid units; default [8, 4.5]. Use this or `place`"),
  place: Place.optional(),
  size: Size.optional(),
};
type Shape<T extends string, F extends z.ZodRawShape, P extends boolean> =
  typeof BASE & (P extends false ? {} : typeof PLACED) & { type: z.ZodLiteral<T> } & F;
export type ElementOf<T extends string, F extends z.ZodRawShape, P extends boolean> = z.output<z.ZodObject<Shape<T, F, P>, z.core.$strict>>;

type Spec<T extends string, F extends z.ZodRawShape, K extends keyof F & string, P extends boolean, El = ElementOf<T, F, P>> = {
  type: T;
  family: string;
  summary: string; // one line: the concept it shows, for `components` and AGENTS.md
  placed?: P; // false: drawn in canvas coordinates from its own fields (arrows, annotations), no at/place/size
  fields: F;
  state?: readonly K[]; // fields a `set` op may change; the element itself is the initial state
  size: (el: El) => [number, number]; // footprint in grid units at size m, captions included; [0, 0] = not attachable
  parts?: (el: El) => Record<string, Rect>; // addressable as "id.part" by arrows, place, camera, annotations
  edges?: (el: El) => Record<string, Pt[]>; // internal paths, traceable as "id.edge"
  refs?: (el: El) => string[]; // other elements this one attaches to; they must be live and outlive it
  check?: (el: El) => string[]; // errors zod cannot express (ids that must exist, ranges); runs on add and after each set
  lint?: (el: El) => string[]; // advice: too many items, too many words
  chunks?: number; // working-memory slots it costs on screen, default 1
  // `add` is the element without op/type/id/at; `host` (an add op, id "host") is what an annotation attaches to.
  example: { add: Record<string, unknown>; set?: Record<string, unknown>; host?: Record<string, unknown> };
};

export function defineComponent<const T extends string, F extends z.ZodRawShape, const K extends keyof F & string = never, const P extends boolean = true>(d: Spec<T, F, K, P>) {
  const shape = { ...BASE, ...(d.placed === false ? {} : PLACED), type: z.literal(d.type), ...d.fields };
  const schema = z.strictObject(shape).superRefine((el, ctx) => {
    if ("at" in el && "place" in el && el.at && el.place) ctx.addIssue({ code: "custom", path: ["place"], message: "use `at` or `place`, not both" });
  }) as unknown as z.ZodObject<Shape<T, F, P>, z.core.$strict>;
  const keys = (d.state ?? []) as readonly string[];
  const settable = Object.fromEntries(Object.entries(d.fields).filter(([k]) => keys.includes(k)));
  const setSchema = z.strictObject(settable).partial();
  return { ...d, placed: d.placed !== false, schema, setSchema };
}

// Any component, for code that handles them all; per-type code gets precise types from Add.
export type AnyDef = {
  type: string; family: string; summary: string; placed: boolean;
  fields: z.ZodRawShape; state?: readonly string[];
  schema: z.ZodType; setSchema: z.ZodObject;
  size: (el: any) => [number, number];
  parts?: (el: any) => Record<string, Rect>;
  edges?: (el: any) => Record<string, Pt[]>;
  refs?: (el: any) => string[];
  check?: (el: any) => string[];
  lint?: (el: any) => string[];
  chunks?: number;
  example: { add: Record<string, unknown>; set?: Record<string, unknown>; host?: Record<string, unknown> };
};
export type ElOf<D> = D extends { schema: infer S extends z.ZodType } ? z.output<S> : never;
export type TypesOf<D extends readonly { type: string }[]> = D[number]["type"];

// Layout helpers for parts and edges: a row of n slots `step` apart, centered on the element.
export const rowRects = (n: number, step: number, w = step, h = step, y = 0): Rect[] =>
  Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * step, y, w, h }));
export const colRects = (n: number, step: number, w = step, h = step, x = 0): Rect[] =>
  Array.from({ length: n }, (_, i) => ({ x, y: (i - (n - 1) / 2) * step, w, h }));
// Ids inside one component must be unique; returns the errors.
export const uniqueIds = (what: string, ids: string[]) =>
  [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].map((id) => `${what} id '${id}' used twice`);
