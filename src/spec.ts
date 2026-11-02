import { icons } from "lucide-react";
import { z } from "zod";

// Grid is 16 x 9 units, origin top-left. Elements are centered on their position.
export const GRID = { w: 16, h: 9 } as const;

// Pacing and lint limits per viewer level. `pad` is the quiet after each line so the picture can
// sink in; novices need more of it and fewer new names at once (working memory holds ~4 chunks).
export const AUDIENCE = {
  novice: { pad: 1.2, maxOnScreen: 4, wordsPerBeat: 16 },
  intermediate: { pad: 1.0, maxOnScreen: 5, wordsPerBeat: 18 },
  expert: { pad: 0.7, maxOnScreen: 6, wordsPerBeat: 22 },
} as const;
export const TRACE_STEP = 1.0; // seconds the trace packet spends on each arrow
const MAX_CODE_LINES = 8; // a glimpse of a key type or interface, not an implementation
const MAX_LABEL_WORDS = 5; // labels name things; narration explains them

// Lucide icon by kebab-case name ("database", "gamepad-2"), see lucide.dev/icons.
export const iconFor = (name: string) =>
  icons[name.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("") as keyof typeof icons];

export const Id = z.string().regex(/^[a-zA-Z][\w-]*$/, "id must start with a letter, then letters, digits, _ or -");
const Pos = z.tuple([z.number().min(0).max(GRID.w), z.number().min(0).max(GRID.h)]).describe("[x, y] in grid units (16 x 9)");
export const Color = z.enum(["accent", "muted", "good", "bad"]).describe("semantic color; hex is not allowed so the style stays consistent");
const Wait = z.number().min(0).optional().describe("seconds after beat start before this action runs");
const LineRange = z.tuple([z.number().int().min(1), z.number().int().min(1)]).describe("[from, to] 1-based, inclusive");
export const Icon = z.string().refine((n) => Boolean(iconFor(n)), "unknown icon; use a lucide.dev name such as database, server, user, bot, cloud, file-code")
  .describe("lucide.dev icon name in kebab-case, e.g. database, server, user, bot, cloud, gamepad-2, hard-drive, file-code");
const Source = z.union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v.join("\n") : v))
  .describe("source code: one string with \\n, or an array of lines (easier to write in JSON)");

const base = { op: z.literal("add"), id: Id, wait: Wait, at: Pos.optional() };
const AddCode = z.object({
  ...base, type: z.literal("code"),
  lang: z.string().describe("highlight language, e.g. ts, py, go, rust"),
  code: Source.describe(`a key type or interface, at most ${MAX_CODE_LINES} lines; string or array of lines`),
  title: z.string().optional().describe("small file name label above the code"),
});
const AddText = z.object({
  ...base, type: z.literal("text"),
  text: z.string().describe("a short label or title, not a sentence"),
  size: z.enum(["h1", "h2", "body"]).optional(),
  color: Color.optional(),
});
const AddBox = z.object({
  ...base, type: z.literal("box"),
  label: z.string().describe("component name, a few words"),
  icon: Icon.optional().describe("lucide icon shown above the label; give key components one"),
  w: z.number().positive().max(GRID.w).optional().describe("width in grid units, default 3"),
  h: z.number().positive().max(GRID.h).optional().describe("height in grid units, default 1.4, 2 with an icon"),
  color: Color.optional(),
});
const AddIcon = z.object({
  ...base, type: z.literal("icon"),
  icon: Icon,
  label: z.string().optional().describe("caption under the icon"),
  size: z.enum(["s", "m", "l"]).optional().describe("0.6 / 1 / 1.6 grid units, default m"),
  color: Color.optional(),
});
const AddGroup = z.object({
  ...base, type: z.literal("group"),
  label: z.string().describe("system name shown in the top-left corner"),
  w: z.number().positive().max(GRID.w).optional().describe("width in grid units, default 6"),
  h: z.number().positive().max(GRID.h).optional().describe("height in grid units, default 4"),
  color: Color.optional(),
});
const Items = z.array(z.string()).min(1).max(16).describe("one short entry per slot, \"\" for an empty one: a queue, buckets, a cache");
const Highlight = z.array(z.number().int().min(0)).optional().describe("0-based slots to make glow, e.g. the bucket that changed");
const AddCells = z.object({
  ...base, type: z.literal("cells"),
  items: Items,
  highlight: Highlight,
  label: z.string().optional().describe("caption under the row"),
  color: Color.optional(),
});
const AddArrow = z.object({
  op: z.literal("add"), type: z.literal("arrow"), id: Id, wait: Wait,
  from: z.union([Id, Pos]).describe("box, icon, group or cells id, or [x, y]"),
  to: z.union([Id, Pos]).describe("box, icon, group or cells id, or [x, y]"),
  label: z.string().optional().describe("what flows along it, e.g. 'GET /user', 'cache miss'"),
  color: Color.optional(),
  offset: z.number().min(-2).max(2).optional()
    .describe("slide the arrow sideways in grid units, + = left of its direction; ±0.25 keeps a request/reply pair apart; label follows the side"),
});
export const Add = z.discriminatedUnion("type", [AddCode, AddText, AddBox, AddIcon, AddGroup, AddCells, AddArrow]);

export const Action = z.discriminatedUnion("op", [
  Add,
  z.object({ op: z.literal("remove"), id: Id, wait: Wait }),
  z.object({ op: z.literal("move"), id: Id, to: Pos, wait: Wait }),
  z.object({ op: z.literal("morph"), id: Id, code: Source, wait: Wait }).describe("animate code element to new source, tokens glide"),
  z.object({ op: z.literal("focus"), id: z.union([Id, z.array(Id).min(1)]), lines: z.array(LineRange).optional(), wait: Wait })
    .describe("one code id with lines: dim its other lines; one or more ids without lines: dim every other element"),
  z.object({ op: z.literal("unfocus"), wait: Wait }),
  z.object({
    op: z.literal("trace"), ids: z.array(Id).min(1), wait: Wait,
    label: z.string().optional().describe("what travels; for the example case name the instance, e.g. 'order 1042'; turns the dot into a labelled packet"),
    icon: Icon.optional().describe("icon on the packet"),
  }).describe("a dot or packet travels along these arrows in order; use it to run one request through the system"),
  z.object({ op: z.literal("camera"), to: Pos.optional(), zoom: z.number().min(0.5).max(4).optional(), wait: Wait })
    .describe("pan/zoom the view; to = new view center, zoom 1 = whole canvas. Empty resets"),
  z.object({ op: z.literal("fill"), id: Id, items: Items, highlight: Highlight, wait: Wait })
    .describe("cells get new contents, same slot count: an order lands in the queue, a slot empties; highlight the slots that changed"),
  z.object({ op: z.literal("color"), id: Id, color: Color, wait: Wait })
    .describe("change an element's color over time: a component failing (bad), recovering (good), becoming the subject (accent)"),
  z.object({ op: z.literal("clear"), wait: Wait }).describe("remove all elements, reset focus and camera"),
]);

export const Beat = z.object({
  say: z.string().optional().describe("narration for this beat; one or two short sentences"),
  hold: z.number().min(0).optional().describe("minimum beat length in seconds"),
  think: z.number().min(1).max(10).optional().describe("seconds of on-screen 'pause and predict' after the narration; say should be the question"),
  do: z.array(Action).default([]),
});

export const Spec = z.object({
  title: z.string(),
  audience: z.enum(["novice", "intermediate", "expert"]).default("intermediate").describe("sets pacing and lint limits"),
  sources: z.array(z.string()).default([])
    .describe("where the facts and the 'why' come from (ADR, commit, PR, file:line); echoed by render for the hand-off"),
  voice: z.object({
    provider: z.string().default("kokoro"),
    voice: z.string().default("am_michael"),
    speed: z.number().min(0.5).max(2).default(0.95),
  }).prefault({}),
  format: z.object({
    width: z.number().int().positive().multipleOf(2).default(1920),
    height: z.number().int().positive().multipleOf(2).default(1080),
    fps: z.number().int().min(1).max(120).default(30),
  }).prefault({}),
  beats: z.array(Beat).min(1),
});

export type Spec = z.infer<typeof Spec>;
export type Action = z.infer<typeof Action>;
export type Add = z.infer<typeof Add>;
export type Pos = z.infer<typeof Pos>;
export type Color = z.infer<typeof Color>;
export type Issue = { path: string; message: string };
export type Beat = z.infer<typeof Beat>;
type Arrow = Extract<Add, { type: "arrow" }>;

export const ICON_SIZE = { s: 0.6, m: 1, l: 1.6 } as const;
export const CAPTION = 0.45; // grid units a caption adds under an icon or a row of cells
// Footprint in grid units of anything an arrow can attach to, caption included; [0, 0] for the rest.
export function sizeOf(el: Add): [number, number] {
  const caption = "label" in el && el.label && (el.type === "icon" || el.type === "cells") ? CAPTION : 0;
  if (el.type === "box") return [el.w ?? 3, el.h ?? (el.icon ? 2 : 1.4)];
  if (el.type === "group") return [el.w ?? 6, el.h ?? 4];
  if (el.type === "icon") return [ICON_SIZE[el.size ?? "m"], ICON_SIZE[el.size ?? "m"] + caption];
  if (el.type === "cells") return [el.items.length * 0.8, 0.8 + caption];
  return [0, 0];
}
const attachable = (el: Add | undefined) => Boolean(el && sizeOf(el)[0]);
const lineCount = (code: string) => code.split("\n").length;

// Checks zod cannot express: ids live in order, types match ops, line ranges fit the code.
export function checkSemantics(spec: Spec): Issue[] {
  const issues: Issue[] = [];
  const used = new Set<string>();
  const live = new Map<string, Add>();

  spec.beats.forEach((beat, b) => beat.do.forEach((a, i) => {
    const path = `beats.${b}.do.${i}`;
    const fail = (message: string) => issues.push({ path, message });
    if (a.op === "clear") return live.clear();
    if (a.op === "unfocus" || a.op === "camera") return;
    if (a.op === "trace") {
      for (const id of a.ids) if (live.get(id)?.type !== "arrow") fail(`trace step '${id}' is not a live arrow`);
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
      if (a.type === "cells" && a.highlight?.some((i) => i >= a.items.length)) fail(`highlight index out of range; cells has ${a.items.length} slots`);
      if (a.type === "arrow") {
        for (const end of [a.from, a.to]) {
          if (typeof end === "string" && !attachable(live.get(end))) fail(`arrow end '${end}' is not a live box, icon, group or cells`);
        }
      }
      used.add(a.id);
      live.set(a.id, a);
      return;
    }
    const el = live.get(a.id);
    if (!el) return fail(`'${a.id}' is not on screen at this point`);
    if (a.op === "remove") {
      const holder = [...live.values()].find((e) => e.type === "arrow" && (e.from === a.id || e.to === a.id));
      if (holder) return fail(`'${a.id}' is still used by arrow '${holder.id}'; remove the arrow first`);
      return live.delete(a.id);
    }
    if (a.op === "move" && el.type === "arrow") return fail("arrows follow their ends; move those instead");
    if (a.op === "color" && el.type === "code") return fail("code takes its colors from syntax highlighting; focus lines instead");
    if (a.op === "morph") {
      if (el.type !== "code") return fail(`morph needs a code element, '${a.id}' is ${el.type}`);
      live.set(a.id, { ...el, code: a.code });
    }
    if (a.op === "fill") {
      if (el.type !== "cells") return fail(`fill needs a cells element, '${a.id}' is ${el.type}`);
      if (a.items.length !== el.items.length) return fail(`fill has ${a.items.length} slots; '${a.id}' has ${el.items.length}`);
      if (a.highlight?.some((i) => i >= a.items.length)) fail(`highlight index out of range; cells has ${a.items.length} slots`);
    }
  }));
  return issues;
}

// Names a viewer must have seen: PascalCase with 2+ humps (classes, components).
const COMPONENT = /\b[A-Z][a-z0-9]+[A-Z]\w*\b/g;
// Function, variable and constant names: implementation detail, not system-level narration.
const LOW_LEVEL = /\b(?:[a-z]+[A-Z]\w*|[a-z]+_\w+|[A-Z][A-Z0-9]*_[A-Z0-9_]+)\b/g;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const tokens = (s: string) => [...new Set(s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().match(/[a-z0-9]+/g))];
const sameEnd = (a: Arrow["to"], b: Arrow["from"]) => JSON.stringify(a) === JSON.stringify(b);
const isComment = (line: string) => /^\s*(\/\/|#|\/\*|\*|--)/.test(line);
// A packet label that names one real case ("order 1042", "Ana", "queue.json"), not a lowercase kind of thing ("order").
const concrete = (label?: string) => !!label && (/[\dA-Z._]/.test(label) || words(label) >= 2);
const labelOf = (el: Add) => ("label" in el ? el.label : undefined) ?? (el.type === "text" ? el.text : "");

// A code line of 4+ words whose words are nearly all spoken: narration duplicates the screen.
const readsCode = (say: string, codes: Iterable<string>) => {
  const spoken = new Set(tokens(say));
  const lines = [...codes].flatMap((src) => src.split("\n").filter((l) => !isComment(l)));
  return lines.map(tokens).some((w) => w.length >= 4 && w.filter((x) => spoken.has(x)).length / w.length >= 0.8);
};

// Advisory checks from learning research and viewer feedback (system level, visual, calm).
// Never block a render; tell the agent what to fix. totalSec comes from the timeline; 0 = a playground walkthrough, so video-only checks are skipped.
// maxOnScreen: a playground board is a persistent overview and may hold more than one video view.
export function lint(spec: Spec, totalSec: number, maxOnScreen: number = AUDIENCE[spec.audience].maxOnScreen): Issue[] {
  const lim = AUDIENCE[spec.audience];
  const out: Issue[] = [];
  const shown: string[] = [];
  const code = new Map<string, string>();
  const arrows = new Map<string, Arrow>();
  const onScreen = new Set<string>(); // chunks the viewer holds; groups are structure, not chunks
  const kinds: Record<string, number> = {};
  let thinks = 0;
  let codeBeats = 0;

  spec.beats.forEach((beat, b) => {
    let showsCode = false;
    beat.do.forEach((a, i) => {
      const warn = (message: string) => out.push({ path: `beats.${b}.do.${i}`, message });
      if (a.op === "clear") {
        onScreen.clear();
        code.clear();
      }
      if (a.op === "remove") {
        onScreen.delete(a.id);
        code.delete(a.id);
      }
      if (a.op === "morph" || (a.op === "add" && a.type === "code")) {
        showsCode = true;
        shown.push(a.code);
        code.set(a.id, a.code);
        if (lineCount(a.code) > MAX_CODE_LINES) warn(`${lineCount(a.code)} lines of code; show a key type or interface in ${MAX_CODE_LINES} or fewer, not an implementation`);
      }
      if (a.op === "trace") {
        const gap = a.ids.findIndex((id, k) => k > 0 && !sameEnd(arrows.get(a.ids[k - 1])!.to, arrows.get(id)!.from));
        if (gap > 0) warn(`trace jumps from '${a.ids[gap - 1]}' to '${a.ids[gap]}'; each arrow should start where the last ended`);
      }
      if (a.op !== "add") return;
      kinds[a.type] = (kinds[a.type] ?? 0) + 1;
      if (a.type === "arrow") {
        arrows.set(a.id, a);
        if (a.label) shown.push(a.label);
        else warn("arrow has no label; name what flows along it");
        return;
      }
      const label = labelOf(a);
      shown.push(label);
      const max = a.type === "text" && a.size !== "body" && a.size ? 8 : MAX_LABEL_WORDS;
      if (a.type !== "code" && words(label) > max) warn(`${words(label)} words on screen; keep labels to ${max}, say the rest`);
      if (a.type === "group") return;
      onScreen.add(a.id);
      if (onScreen.size === maxOnScreen + 1) warn(`more than ${maxOnScreen} elements on screen; split the scene or zoom`);
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
    thinks += beat.think ? 1 : 0;
    codeBeats += showsCode ? 1 : 0;
  });

  const all = (message: string) => out.push({ path: "beats", message });
  const maxCode = Math.max(2, Math.round(spec.beats.length / 4));
  if (codeBeats > maxCode) all(`${codeBeats} beats show code; explain the system with components and flows, keep code to ${maxCode} beats`);
  const visuals = (kinds.icon ?? 0) + (kinds.cells ?? 0) + spec.beats.flatMap((b) => b.do).filter((a) => a.op === "add" && a.type === "box" && a.icon).length;
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

// Parse untrusted JSON into a Spec, collecting every problem with its path.
export function parseSpec(input: unknown): { spec: Spec; issues: [] } | { spec: null; issues: Issue[] } {
  const r = Spec.safeParse(input);
  if (!r.success) {
    return { spec: null, issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  }
  const issues = checkSemantics(r.data);
  return issues.length ? { spec: null, issues } : { spec: r.data, issues: [] };
}
