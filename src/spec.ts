import { z } from "zod";
import { CAPTION, Highlight, ICON_SIZE, Items, MAX_CODE_LINES } from "./components/core.ts";
import { DEFS, defOf, type Add as AddT } from "./components/index.ts";
import { Color, GRID, Icon, iconFor, Id, Pos, Ref, SIZE, Wait, type Pt, type Rect } from "./components/registry.ts";

export { CAPTION, Color, GRID, Icon, ICON_SIZE, iconFor, Id, Pos, Ref };

// Pacing and lint limits per viewer level. `pad` is the quiet after each line so the picture can
// sink in; novices need more of it and fewer new names at once (working memory holds ~4 chunks).
export const AUDIENCE = {
  novice: { pad: 1.2, maxOnScreen: 4, wordsPerBeat: 16 },
  intermediate: { pad: 1.0, maxOnScreen: 5, wordsPerBeat: 18 },
  expert: { pad: 0.7, maxOnScreen: 6, wordsPerBeat: 22 },
} as const;
export const TRACE_STEP = 1.0; // default seconds the trace packet spends on each arrow
const MAX_LABEL_WORDS = 5; // labels name things; narration explains them
const MAX_CHAPTER_WORDS = 4;
const LineRange = z.tuple([z.number().int().min(1), z.number().int().min(1)]).describe("[from, to] 1-based, inclusive");
const Source = z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v.join("\n") : v));

// Built from the component registry; the precise per-type types come from components/index.ts.
const AddSchema = z.discriminatedUnion("type", DEFS.map((d) => d.schema) as unknown as [z.ZodObject, ...z.ZodObject[]]);
export const Add = AddSchema as unknown as z.ZodType<AddT>;
export type Add = AddT;

const OPS = [
  z.strictObject({ op: z.literal("remove"), id: Id, wait: Wait }),
  z.strictObject({ op: z.literal("move"), id: Id, to: Pos, wait: Wait }),
  z.strictObject({ op: z.literal("morph"), id: Id, code: Source, wait: Wait }).describe("animate code element to new source, tokens glide"),
  z.strictObject({ op: z.literal("focus"), id: z.union([Id, z.array(Id).min(1)]), lines: z.array(LineRange).optional(), wait: Wait })
    .describe("one code id with lines: dim its other lines; one or more ids without lines: dim every other element"),
  z.strictObject({ op: z.literal("unfocus"), wait: Wait }),
  z.strictObject({
    op: z.literal("trace"), ids: z.array(Ref).min(1), wait: Wait,
    label: z.string().max(40).optional().describe("what travels; for the example case name the instance, e.g. 'order 1042'; turns the dot into a labelled packet"),
    icon: Icon.optional().describe("icon on the packet"),
    speed: z.number().min(0.4).max(3).optional().describe(`seconds per arrow or edge, default ${TRACE_STEP}`),
    color: Color.optional().describe("packet color, default accent; bad = a failing request"),
  }).describe("a dot or packet travels along these arrows (or component edges, id.edge) in order; use it to run one request through the system"),
  z.strictObject({ op: z.literal("camera"), to: Pos.optional(), on: Ref.optional(), zoom: z.number().min(0.5).max(4).optional(), wait: Wait })
    .describe("pan/zoom the view; to = new view center, or on = an element to center; zoom 1 = whole canvas. Empty resets"),
  z.strictObject({ op: z.literal("fill"), id: Id, items: Items, highlight: Highlight, wait: Wait })
    .describe("cells get new contents, same slot count: an order lands in the queue, a slot empties; highlight the slots that changed"),
  z.strictObject({ op: z.literal("set"), id: Id, state: z.record(z.string(), z.unknown()), wait: Wait })
    .describe("change a component's state (its settable fields, see `unblackbox components <type>`); it animates there"),
  z.strictObject({ op: z.literal("pulse"), id: Id, wait: Wait }).describe("one attention ring around an element: look here"),
  z.strictObject({ op: z.literal("color"), id: Id, color: Color, wait: Wait })
    .describe("change an element's color over time: a component failing (bad), recovering (good), becoming the subject (accent)"),
  z.strictObject({ op: z.literal("clear"), wait: Wait }).describe("remove all elements, reset focus and camera"),
] as const;
type Op = z.output<(typeof OPS)[number]>;
export type Action = Add | Op;
export const Action = z.discriminatedUnion("op", [AddSchema, ...OPS]) as unknown as z.ZodType<Action, z.input<typeof AddSchema> | z.input<(typeof OPS)[number]>>;

export const Transition = z.enum(["fade", "cut", "slide"]);
export const Beat = z.strictObject({
  say: z.string().optional().describe("narration for this beat; one or two short sentences"),
  hold: z.number().min(0).optional().describe("minimum beat length in seconds"),
  think: z.number().min(1).max(10).optional().describe("seconds of on-screen 'pause and predict' after the narration; say should be the question"),
  chapter: z.string().min(1).max(40).optional().describe("starts a section: a small corner label (a few words) shown until the next chapter"),
  transition: Transition.optional().describe("how this beat's elements come in and what its clear removes goes out: fade (default), cut or slide"),
  do: z.array(Action).default([]),
});

export const Theme = z.strictObject({
  preset: z.enum(["dim", "light", "contrast"]).default("dim").describe("dim: dark blue-gray (default); light: white; contrast: near-black, brighter colors"),
  accent: z.enum(["blue", "violet", "teal", "amber"]).default("blue").describe("hue of the accent color"),
}).prefault({});

export const Spec = z.strictObject({
  title: z.string(),
  audience: z.enum(["novice", "intermediate", "expert"]).default("intermediate").describe("sets pacing and lint limits"),
  sources: z.array(z.string()).default([])
    .describe("where the facts and the 'why' come from (ADR, commit, PR, file:line); echoed by render for the hand-off"),
  voice: z.strictObject({
    provider: z.string().default("kokoro"),
    voice: z.string().default("am_michael"),
    speed: z.number().min(0.5).max(2).default(0.95),
  }).prefault({}),
  format: z.strictObject({
    width: z.number().int().positive().multipleOf(2).default(1920),
    height: z.number().int().positive().multipleOf(2).default(1080),
    fps: z.number().int().min(1).max(120).default(30),
  }).prefault({}),
  theme: Theme,
  beats: z.array(Beat).min(1),
});

export type Spec = z.infer<typeof Spec>;
export type Theme = z.infer<typeof Theme>;
export type Transition = z.infer<typeof Transition>;
export type Issue = { path: string; message: string };
export type Beat = z.infer<typeof Beat>;
type Arrow = Extract<Add, { type: "arrow" }>;

// Footprint, parts and edges with the element's size knob applied. Icons and text use `size` for their own scale.
export const scaleOf = (el: Add) => (el.type === "icon" || el.type === "text" || !("size" in el) || !el.size ? 1 : SIZE[el.size as keyof typeof SIZE] ?? 1);
export function sizeOf(el: Add): [number, number] {
  const [w, h] = defOf(el.type).size(el);
  return [w * scaleOf(el), h * scaleOf(el)];
}
export function partsOf(el: Add): Record<string, Rect> {
  const k = scaleOf(el);
  return Object.fromEntries(Object.entries(defOf(el.type).parts?.(el) ?? {}).map(([p, r]) => [p, { x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k }]));
}
export function edgesOf(el: Add): Record<string, Pt[]> {
  const k = scaleOf(el);
  return Object.fromEntries(Object.entries(defOf(el.type).edges?.(el) ?? {}).map(([e, pts]) => [e, pts.map(([x, y]) => [x * k, y * k] as Pt)]));
}
export const refsOf = (el: Add) => defOf(el.type).refs?.(el) ?? [];
export const chunksOf = (el: Add) => defOf(el.type).chunks ?? 1;
const lineCount = (code: string) => code.split("\n").length;
const an = (type: string) => `${/^[aeiou]/.test(type) ? "an" : "a"} ${type}`;
const some = (keys: string[]) => (keys.length ? `: ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? ", ..." : ""}` : "; it has none");

// Checks zod cannot express: ids live in order, types match ops, refs and parts exist, state changes stay valid.
export function checkSemantics(spec: Spec): Issue[] {
  const issues: Issue[] = [];
  const used = new Set<string>();
  const live = new Map<string, Add>();
  // null when the ref points at something on screen that can be attached to, else why not
  const attach = (ref: string): string | null => {
    const [id, part] = ref.split(".");
    const el = live.get(id);
    if (!el) return `'${id}' is not on screen at this point`;
    if (part !== undefined) return part in partsOf(el) ? null : `'${id}' has no part '${part}'${some(Object.keys(partsOf(el)))}`;
    return sizeOf(el)[0] ? null : `'${id}' is ${an(el.type)}, which nothing can attach to`;
  };
  const holderOf = (id: string) => [...live.values()].find((e) => e.id !== id && refsOf(e).some((r) => r.split(".")[0] === id));
  // after a state change, refs into this element must still find their part
  const brokenRefs = (el: Add) => [...live.values()].flatMap((e) => refsOf(e).filter((r) => {
    const [id, part] = r.split(".");
    return id === el.id && part !== undefined && !(part in partsOf(el));
  }).map((r) => `'${e.id}' still points at '${r}', which this change removes`));

  spec.beats.forEach((beat, b) => beat.do.forEach((a, i) => {
    const path = `beats.${b}.do.${i}`;
    const fail = (message: string, sub = "") => issues.push({ path: path + sub, message });
    if (a.op === "clear") return live.clear();
    if (a.op === "unfocus") return;
    if (a.op === "camera") {
      if (a.on && a.to) return fail("camera takes `to` or `on`, not both");
      const why = a.on && attach(a.on);
      if (why) fail(why, ".on");
      return;
    }
    if (a.op === "trace") {
      a.ids.forEach((ref, k) => {
        const [id, edge] = ref.split(".");
        const el = live.get(id);
        if (edge === undefined) {
          if (el?.type !== "arrow") fail(`trace step '${ref}' is not a live arrow`, `.ids.${k}`);
        } else if (!el) fail(`'${id}' is not on screen at this point`, `.ids.${k}`);
        else if (!(edge in edgesOf(el))) fail(`'${id}' has no edge '${edge}'${some(Object.keys(edgesOf(el)))}`, `.ids.${k}`);
      });
      return;
    }
    if (a.op === "focus") {
      const ids = [a.id].flat();
      for (const id of ids) if (!live.has(id)) fail(`'${id}' is not on screen at this point`);
      const el = live.get(ids[0]);
      if (!a.lines || !el) return;
      if (ids.length > 1 || el.type !== "code") return fail("focus lines needs exactly one code element");
      const max = lineCount(el.code);
      for (const [from, to] of a.lines) {
        if (from > to || to > max) fail(`line range [${from}, ${to}] invalid; code has ${max} lines`);
      }
      return;
    }
    if (a.op === "add") {
      if (used.has(a.id)) return fail(`id '${a.id}' already used; ids are unique for the whole video`);
      const def = defOf(a.type);
      refsOf(a).forEach((ref) => { const why = attach(ref); if (why) fail(why); });
      if ("place" in a && a.place) { const why = attach(a.place.of); if (why) fail(why, ".place.of"); }
      for (const message of def.check?.(a) ?? []) fail(message);
      used.add(a.id);
      live.set(a.id, a);
      return;
    }
    const el = live.get(a.id);
    if (!el) return fail(`'${a.id}' is not on screen at this point`);
    const def = defOf(el.type);
    if (a.op === "remove") {
      const holder = holderOf(a.id);
      if (holder) return fail(`'${a.id}' is still used by ${holder.type} '${holder.id}'; remove that first`);
      return live.delete(a.id);
    }
    if (a.op === "move" && !def.placed) return fail(refsOf(el).length ? `${an(el.type)} follows what it attaches to; move that instead` : `${an(el.type)} is drawn from its own points; remove it and add a new one`);
    if (a.op === "color" && el.type === "code") return fail("code takes its colors from syntax highlighting; focus lines instead");
    if (a.op === "pulse" && !sizeOf(el)[0]) return fail(`${an(el.type)} has no outline to pulse; pulse what it attaches to`);
    if (a.op === "morph") {
      if (el.type !== "code") return fail(`morph needs a code element, '${a.id}' is ${el.type}`);
      live.set(a.id, { ...el, code: a.code });
    }
    if (a.op === "fill" || a.op === "set") {
      if (a.op === "fill" && el.type !== "cells") return fail(`fill needs a cells element, '${a.id}' is ${el.type}`);
      if (a.op === "fill" && el.type === "cells" && a.items.length !== el.items.length) return fail(`fill has ${a.items.length} slots; '${a.id}' has ${el.items.length}`);
      if (a.op === "set" && !def.state?.length) return fail(`${an(el.type)} has no state to set; use color, move or a new element`);
      const raw = a.op === "fill" ? { items: a.items, highlight: a.highlight } : a.state;
      const patch = def.setSchema.safeParse(raw);
      if (!patch.success) {
        const keys = `; settable: ${def.state!.join(", ")}`;
        for (const is of patch.error.issues) fail(is.code === "unrecognized_keys" ? `${is.message}${keys}` : is.message, a.op === "set" ? `.state${is.path.map((p) => `.${String(p)}`).join("")}` : "");
        return;
      }
      const merged = { ...el, ...patch.data } as Add;
      for (const message of def.check?.(merged) ?? []) fail(message);
      for (const message of brokenRefs(merged)) fail(message);
      live.set(a.id, merged);
    }
  }));
  return issues;
}

// Rect of an element or one of its parts on the canvas, from the element's center.
export function rectOf(el: Add, at: Pos, part?: string): Rect {
  if (part !== undefined) {
    const r = partsOf(el)[part];
    return { x: at[0] + r.x, y: at[1] + r.y, w: r.w, h: r.h };
  }
  const [w, h] = sizeOf(el);
  return { x: at[0], y: at[1], w, h };
}
const clampTo = (v: number, max: number) => Math.round(Math.min(max, Math.max(0, v)) * 100) / 100;

// `place` and `camera.on` become plain positions, using where things are when the action runs (moves included).
// Pure; runs after checkSemantics, so every ref resolves.
export function resolvePlaces(spec: Spec): Spec {
  const pos = new Map<string, { el: Add; at: Pos }>();
  const target = (ref: string) => {
    const [id, part] = ref.split(".");
    const p = pos.get(id)!;
    return rectOf(p.el, p.at, part);
  };
  const beats = spec.beats.map((beat) => ({
    ...beat,
    do: beat.do.map((a): Action => {
      if (a.op === "clear") pos.clear();
      if (a.op === "remove") pos.delete(a.id);
      if (a.op === "move") pos.set(a.id, { ...pos.get(a.id)!, at: a.to });
      if (a.op === "camera" && a.on) {
        const { on, ...rest } = a;
        const r = target(on);
        return { ...rest, to: [clampTo(r.x, GRID.w), clampTo(r.y, GRID.h)] };
      }
      if (a.op === "set" && pos.has(a.id)) pos.set(a.id, { ...pos.get(a.id)!, el: { ...pos.get(a.id)!.el, ...a.state } as Add });
      if (a.op !== "add") return a;
      if (!("place" in a) || !a.place) {
        if ("at" in a || defOf(a.type).placed) pos.set(a.id, { el: a, at: ("at" in a && a.at) || [8, 4.5] });
        return a;
      }
      const { place, ...rest } = a;
      const r = target(place.of);
      const [w, h] = sizeOf(a);
      const gap = place.gap ?? 0.6;
      const dx = { left: -(r.w / 2 + gap + w / 2), right: r.w / 2 + gap + w / 2, above: 0, below: 0, center: 0 }[place.side];
      const dy = { above: -(r.h / 2 + gap + h / 2), below: r.h / 2 + gap + h / 2, left: 0, right: 0, center: 0 }[place.side];
      const at: Pos = [clampTo(r.x + dx, GRID.w), clampTo(r.y + dy, GRID.h)];
      const placed = { ...rest, at } as Add;
      pos.set(a.id, { el: placed, at });
      return placed;
    }),
  }));
  return { ...spec, beats };
}

// Names a viewer must have seen: PascalCase with 2+ humps (classes, components).
const COMPONENT = /\b[A-Z][a-z0-9]+[A-Z]\w*\b/g;
// Function, variable and constant names: implementation detail, not system-level narration.
const LOW_LEVEL = /\b(?:[a-z]+[A-Z]\w*|[a-z]+_\w+|[A-Z][A-Z0-9]*_[A-Z0-9_]+)\b/g;
export const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const tokens = (s: string) => [...new Set(s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().match(/[a-z0-9]+/g))];
const sameEnd = (a: Arrow["to"], b: Arrow["from"]) => JSON.stringify(a) === JSON.stringify(b);
const isComment = (line: string) => /^\s*(\/\/|#|\/\*|\*|--)/.test(line);
// A packet label that names one real case ("order 1042", "Ana", "queue.json"), not a lowercase kind of thing ("order").
const concrete = (label?: string) => !!label && (/[\dA-Z._]/.test(label) || words(label) >= 2);
const labelOf = (el: Add) => ("label" in el && typeof el.label === "string" ? el.label : undefined) ?? (el.type === "text" ? el.text : "");
// Every string an element puts on screen, for "spoken before it is on screen".
const textsOf = (v: unknown): string[] => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(textsOf) : v && typeof v === "object" ? Object.values(v).flatMap(textsOf) : []);
const overlaps = (a: Rect, b: Rect) =>
  Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2) > 0.15 &&
  Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) > 0.15;
const offCanvas = (r: Rect) => r.x - r.w / 2 < -0.05 || r.y - r.h / 2 < -0.05 || r.x + r.w / 2 > GRID.w + 0.05 || r.y + r.h / 2 > GRID.h + 0.05;

// A code line of 4+ words whose words are nearly all spoken: narration duplicates the screen.
const readsCode = (say: string, codes: Iterable<string>) => {
  const spoken = new Set(tokens(say));
  const lines = [...codes].flatMap((src) => src.split("\n").filter((l) => !isComment(l)));
  return lines.map(tokens).some((w) => w.length >= 4 && w.filter((x) => spoken.has(x)).length / w.length >= 0.8);
};

// Advisory checks from learning research and viewer feedback (system level, visual, calm).
// Never block a render; tell the agent what to fix. totalSec comes from the timeline; 0 = a playground walkthrough, so video-only checks are skipped.
// maxOnScreen: a playground board is a persistent overview and may hold more than one video view.
// Expects a spec from parseSpec (places resolved).
export function lint(spec: Spec, totalSec: number, maxOnScreen: number = AUDIENCE[spec.audience].maxOnScreen): Issue[] {
  const lim = AUDIENCE[spec.audience];
  const out: Issue[] = [];
  const shown: string[] = [];
  const code = new Map<string, string>();
  const arrows = new Map<string, Arrow>();
  const onScreen = new Map<string, number>(); // chunks the viewer holds; groups and annotations are structure, not chunks
  const placed = new Map<string, { el: Add; at: Pos; path: string }>();
  const reported = new Set<string>();
  const kinds: Record<string, number> = {};
  let thinks = 0;
  let codeBeats = 0;
  let crowded = false;

  spec.beats.forEach((beat, b) => {
    let showsCode = false;
    beat.do.forEach((a, i) => {
      const path = `beats.${b}.do.${i}`;
      const warn = (message: string) => out.push({ path, message });
      if (a.op === "clear") {
        onScreen.clear();
        code.clear();
        placed.clear();
      }
      if (a.op === "remove") {
        onScreen.delete(a.id);
        code.delete(a.id);
        placed.delete(a.id);
      }
      if (a.op === "move" && placed.has(a.id)) placed.set(a.id, { ...placed.get(a.id)!, at: a.to, path });
      if (a.op === "set" && placed.has(a.id)) {
        const p = placed.get(a.id)!;
        const el = { ...p.el, ...a.state } as Add;
        placed.set(a.id, { ...p, el });
        shown.push(...textsOf(a.state));
        // only what this change brings; the add already reported the rest
        const before = new Set(defOf(el.type).lint?.(p.el) ?? []);
        for (const message of defOf(el.type).lint?.(el) ?? []) if (!before.has(message)) warn(message);
      }
      if (a.op === "morph" || (a.op === "add" && a.type === "code")) {
        showsCode = true;
        shown.push(a.code);
        code.set(a.id, a.code);
        if (lineCount(a.code) > MAX_CODE_LINES) warn(`${lineCount(a.code)} lines of code; show a key type or interface in ${MAX_CODE_LINES} or fewer, not an implementation`);
      }
      if (a.op === "trace") {
        const gap = a.ids.findIndex((id, k) => k > 0 && arrows.has(id) && arrows.has(a.ids[k - 1]) && !sameEnd(arrows.get(a.ids[k - 1])!.to, arrows.get(id)!.from));
        if (gap > 0) warn(`trace jumps from '${a.ids[gap - 1]}' to '${a.ids[gap]}'; each arrow should start where the last ended`);
      }
      if (a.op !== "add") return;
      kinds[a.type] = (kinds[a.type] ?? 0) + 1;
      for (const message of defOf(a.type).lint?.(a) ?? []) warn(message);
      if (a.type === "arrow") {
        arrows.set(a.id, a);
        if (a.label) shown.push(a.label);
        else warn("arrow has no label; name what flows along it");
        return;
      }
      shown.push(...textsOf(a));
      const label = labelOf(a);
      const max = a.type === "text" && a.size !== "body" && a.size ? 8 : MAX_LABEL_WORDS;
      if (a.type !== "code" && words(label) > max) warn(`${words(label)} words on screen; keep labels to ${max}, say the rest`);
      if ("at" in a && a.at) placed.set(a.id, { el: a, at: a.at, path });
      else if (defOf(a.type).placed) placed.set(a.id, { el: a, at: [8, 4.5], path });
      if (!chunksOf(a)) return;
      onScreen.set(a.id, chunksOf(a));
      const held = [...onScreen.values()].reduce((s, n) => s + n, 0);
      if (held > maxOnScreen && !crowded) warn(`more than ${maxOnScreen} elements on screen; split the scene or zoom`);
      crowded = held > maxOnScreen;
    });

    // Layout, once the beat has run: overlapping footprints and anything past the canvas edge.
    const now = [...placed.entries()].filter(([, p]) => p.el.type !== "group").map(([id, p]) => ({ id, path: p.path, r: rectOf(p.el, p.at) }));
    now.forEach((p, k) => {
      if (offCanvas(p.r) && !reported.has(p.id)) {
        reported.add(p.id);
        out.push({ path: p.path, message: `'${p.id}' goes past the edge of the canvas; move it or make it smaller` });
      }
      for (const q of now.slice(k + 1)) {
        const key = `${p.id}|${q.id}`;
        if (!reported.has(key) && overlaps(p.r, q.r)) {
          reported.add(key);
          out.push({ path: q.path, message: `'${q.id}' overlaps '${p.id}'; give each its own space (place: {of, side} helps)` });
        }
      }
    });

    const say = beat.say ?? "";
    const warn = (message: string) => out.push({ path: `beats.${b}.say`, message });
    const n = words(say);
    if (n > lim.wordsPerBeat) warn(`${n} words; keep beats under ${lim.wordsPerBeat} for ${spec.audience} viewers`);
    for (const name of new Set(say.match(LOW_LEVEL))) warn(`'${name}' is a function or variable name; talk about the component and what it does`);
    const seen = shown.join("\n");
    for (const name of new Set(say.match(COMPONENT))) if (!seen.includes(name)) warn(`'${name}' is spoken before it is on screen`);
    if (readsCode(say, code.values())) warn("narration reads a code line aloud; say what it means instead");
    if (beat.think && !say.trim().endsWith("?")) warn("a think beat should end with the question to predict");
    if (beat.chapter && words(beat.chapter) > MAX_CHAPTER_WORDS) out.push({ path: `beats.${b}.chapter`, message: `chapter label of ${words(beat.chapter)} words; keep it to ${MAX_CHAPTER_WORDS}` });
    thinks += beat.think ? 1 : 0;
    codeBeats += showsCode ? 1 : 0;
  });

  const all = (message: string) => out.push({ path: "beats", message });
  const maxCode = Math.max(2, Math.round(spec.beats.length / 4));
  if (codeBeats > maxCode) all(`${codeBeats} beats show code; explain the system with components and flows, keep code to ${maxCode} beats`);
  const plain = new Set(["box", "text", "group", "arrow", "code"]);
  const visuals = Object.entries(kinds).filter(([k]) => !plain.has(k)).reduce((s, [, n]) => s + n, 0)
    + spec.beats.flatMap((b) => b.do).filter((a) => a.op === "add" && a.type === "box" && a.icon).length;
  if ((kinds.box ?? 0) >= 3 && !visuals) all("only text boxes; give key components icons, and use icons, cells and packets so the picture carries meaning");
  if ((kinds.text ?? 0) > Math.max(3, spec.beats.length / 3)) all(`${kinds.text} text elements; the voice explains, the screen shows things, not words`);
  if (thinks > 2) all(`${thinks} think beats; one or two per video work best`);
  // the example may travel in several traces (pausing at each part); count the arrows its label covers
  const hops = new Map<string, Set<string>>();
  for (const a of spec.beats.flatMap((b) => b.do)) {
    if (a.op === "trace" && concrete(a.label)) hops.set(a.label!, new Set([...(hops.get(a.label!) ?? []), ...a.ids]));
  }
  const e2e = (kinds.arrow ?? 0) >= 3 ? 3 : Math.min(1, kinds.arrow ?? 0); // a small diagram: any concrete trace will do
  const example = [...hops.values()].some((ids) => ids.size >= e2e);
  if (totalSec && e2e && !example) all("no real example end to end: trace one concrete case (label it like 'order 1042') through every component, trigger to result");
  if (totalSec > 360) all(`about ${Math.round(totalSec / 60)} min; split into a series of videos under 6 min`);
  return out;
}

const zodIssues = (e: z.ZodError): Issue[] => e.issues.map((i) => ({ path: i.path.join("."), message: i.message }));

// Parse untrusted JSON into a Spec, collecting every problem with its path. Places come back resolved.
export function parseSpec(input: unknown): { spec: Spec; issues: [] } | { spec: null; issues: Issue[] } {
  const r = Spec.safeParse(input);
  if (!r.success) return { spec: null, issues: zodIssues(r.error) };
  const issues = checkSemantics(r.data);
  return issues.length ? { spec: null, issues } : { spec: resolvePlaces(r.data), issues: [] };
}
