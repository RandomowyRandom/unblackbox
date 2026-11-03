import { z } from "zod";
import { Action, Add, checkSemantics, Color, Icon, Id, resolvePlaces, Spec, type Beat, type Issue } from "./spec.ts";
import type { Voiced } from "./timeline.ts";

// A playground is a sandbox over one board: buttons trigger events, clicking a component explains it.
// Lines only change state (trace, color, fill, set, pulse, focus, camera, move); the board itself is built once in `scene`.
const STATE_OPS = ["trace", "color", "fill", "set", "pulse", "focus", "unfocus", "camera", "move"];
const StateAction = Action.refine((a) => STATE_OPS.includes(a.op), "only trace, color, fill, set, pulse, focus, unfocus, camera and move run in a playground; build the board in scene");

const Line = z.strictObject({
  say: z.string().optional().describe("spoken and captioned; one or two short sentences"),
  do: z.array(StateAction).default([]),
});
const Outcome = Line.extend({
  if: z.record(Id, Color).optional().describe("element id -> the color it must have right now; colors are the sandbox's state"),
});
const Event = z.strictObject({
  id: Id,
  label: z.string().describe("button text, two or three words"),
  icon: Icon,
  outcomes: z.array(Outcome).min(1).describe("the first whose `if` matches runs; the last must have no `if`"),
});

export const Game = Spec.omit({ beats: true }).extend({
  scene: z.array(Add.refine((a) => a.type !== "code", "no code in playgrounds; show components")).min(1)
    .describe("add ops that build the board, usually the video's big-picture view"),
  intro: Line.describe("spoken when the player presses Start"),
  events: z.array(Event).min(1).max(8).describe("the buttons; each makes something visibly happen"),
  inspect: z.record(Id, Line).default({}).describe("element id -> what clicking it says and shows"),
});
export type Game = z.infer<typeof Game>;
export type Line = z.infer<typeof Line>;
type GameEvent = z.infer<typeof Event>;

// Every spoken line with a stable key (used to find its voice) and its path in the game file.
export function linesOf(game: Game): { key: string; path: string; line: Line }[] {
  return [
    { key: "intro", path: "intro", line: game.intro },
    ...Object.entries(game.inspect).map(([id, line]) => ({ key: `inspect.${id}`, path: `inspect.${id}`, line })),
    ...game.events.flatMap((e, i) => e.outcomes.map((line, k) => ({ key: `event.${e.id}.${k}`, path: `events.${i}.outcomes.${k}`, line }))),
  ];
}

// The game as one linear video spec: the board, then every line. Reuses spec checks, lint, voice and the sheet.
export function walkthrough(game: Game): Spec {
  const { scene, intro, events, inspect, ...base } = game;
  const beats: Beat[] = [{ do: scene }, ...linesOf(game).map(({ line }) => ({ say: line.say, do: line.do }))];
  return { ...base, beats };
}

// Issue paths from the walkthrough (beats.N...) mapped back to where they are in the game file.
export function toGamePaths(game: Game, issues: Issue[]): Issue[] {
  const lines = linesOf(game);
  return issues.map(({ path, message }) => ({
    message,
    path: path.replace(/^beats\.(\d+)(\.do)?/, (_, n, d) => (n === "0" ? "scene" : `${lines[Number(n) - 1].path}${d ?? ""}`)),
  }));
}

export function parseGame(input: unknown): { game: Game; issues: [] } | { game: null; issues: Issue[] } {
  const r = Game.safeParse(input);
  if (!r.success) return { game: null, issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  const game = r.data;
  const ids = new Set(game.scene.map((a) => a.id));
  const issues: Issue[] = toGamePaths(game, checkSemantics(walkthrough(game)));
  const seen = new Set<string>();
  game.events.forEach((e, i) => {
    if (seen.has(e.id)) issues.push({ path: `events.${i}.id`, message: `event id '${e.id}' used twice` });
    seen.add(e.id);
    if (e.outcomes.at(-1)!.if) issues.push({ path: `events.${i}.outcomes`, message: "the last outcome must have no `if`, so every press does something" });
    e.outcomes.forEach((o, k) => Object.keys(o.if ?? {}).forEach((id) => {
      if (!ids.has(id)) issues.push({ path: `events.${i}.outcomes.${k}.if`, message: `'${id}' is not on the board` });
    }));
  });
  for (const id of Object.keys(game.inspect)) if (!ids.has(id)) issues.push({ path: `inspect.${id}`, message: `'${id}' is not on the board` });
  if (issues.length) return { game: null, issues };
  // `place` and `camera.on` become positions, like in a video
  const resolved = resolvePlaces(walkthrough(game)).beats;
  game.scene = resolved[0].do as Game["scene"];
  linesOf(game).forEach(({ line }, i) => (line.do = resolved[i + 1].do));
  return { game, issues: [] };
}

// Runtime state: the color each element has now. Arrows start muted, everything else accent.
export type Colors = Record<string, Color>;
export const initialColors = (game: Game): Colors =>
  Object.fromEntries(game.scene.map((a) => [a.id, ("color" in a && a.color) || (a.type === "arrow" ? "muted" : "accent")]));

export const applyColors = (colors: Colors, line: Line): Colors =>
  line.do.reduce((c, a) => (a.op === "color" ? { ...c, [a.id]: a.color } : c), colors);

export const pickOutcome = (event: GameEvent, colors: Colors): number =>
  event.outcomes.findIndex((o) => Object.entries(o.if ?? {}).every(([id, color]) => colors[id] === color));

// Grows the live beat list: an idle gap (so the line starts when the player acted), then the line itself.
export function appendLine(live: { beats: Beat[]; voiced: Voiced[] }, line: Line, voice: Voiced, gapSec: number) {
  const gap = gapSec > 0.05 ? [{ beat: { hold: gapSec, do: [] }, voice: { file: null, sec: 0 } }] : [];
  const added = [...gap, { beat: { say: line.say, do: line.do }, voice }];
  return { beats: [...live.beats, ...added.map((a) => a.beat)], voiced: [...live.voiced, ...added.map((a) => a.voice)] };
}

export type Bundle = { game: Game; voices: Record<string, Voiced> };
