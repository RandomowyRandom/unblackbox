import type { HighlightedCode } from "codehike/code";
import { AUDIENCE, TRACE_STEP, type Action, type Add, type Color, type Pos, type Spec, type Transition } from "./spec.ts";
import { themeOf, type Palette } from "./themes.ts";

// Seconds. anim = how long every transition takes (calm, not snappy). Breath after speech comes from AUDIENCE.
export const TIMING = { minBeat: 3, anim: 1.2, tail: 2 };
export const HOME: { to: Pos; zoom: number } = { to: [8, 4.5], zoom: 1 };

export type Voiced = { file: string | null; sec: number };
export type Track = {
  el: Add;
  start: number;
  end: number | null;
  enter: Transition; // how it comes in (its beat's transition)
  exit: Transition; // how it goes out (the transition of the beat that removes it)
  moves: { frame: number; to: Pos }[];
  morphs: { frame: number; code: string }[];
  colors: { frame: number; color: Color }[];
  sets: { frame: number; state: Record<string, unknown> }[]; // `set` and `fill` patches, in order
  pulses: number[];
  highlighted?: HighlightedCode[]; // [initial, ...morphs], filled by the CLI before render
};
export type FocusEvent = { frame: number; ids: string[] | null; lines: [number, number][] | null };
export type CameraEvent = { frame: number; to: Pos; zoom: number };
export type TraceEvent = { frame: number; ids: string[]; label?: string; icon?: string; step: number; color?: Color }; // step = frames per hop
export type ChapterEvent = { frame: number; title: string };
export type BeatTiming = { start: number; frames: number; speechFrames: number; thinkFrames: number; say: string; audio: string | null; chapter: string | null };
export type Timeline = {
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  pal: Palette;
  beats: BeatTiming[];
  tracks: Track[];
  focus: FocusEvent[];
  camera: CameraEvent[];
  traces: TraceEvent[];
  chapters: ChapterEvent[];
};

const byFrame = (a: { frame: number }, b: { frame: number }) => a.frame - b.frame;
export const newTrack = (el: Add, frame: number, enter: Transition = "fade"): Track =>
  ({ el, start: frame, end: null, enter, exit: "fade", moves: [], morphs: [], colors: [], sets: [], pulses: [] });

// Where actions land: the current track per id, and the board-wide event lists.
export type Board = Pick<Timeline, "focus" | "camera" | "traces"> & { tracks: Map<string, Track> };

// One action at `frame` (its wait already added). `style` is the transition of the beat it belongs to.
// Shared by videos (buildTimeline) and live playgrounds, which apply lines as the player acts.
export function applyAction(b: Board, a: Action, frame: number, fps: number, style: Transition = "fade") {
  const end = (t: Track) => {
    if (t.end !== null) return;
    t.end = frame;
    t.exit = style;
  };
  const tr = "id" in a && typeof a.id === "string" ? b.tracks.get(a.id) : undefined;
  if (a.op === "add") b.tracks.set(a.id, newTrack(a, frame, style));
  if (a.op === "remove") end(tr!);
  if (a.op === "move") tr!.moves.push({ frame, to: a.to });
  if (a.op === "morph") tr!.morphs.push({ frame, code: a.code });
  if (a.op === "color") tr!.colors.push({ frame, color: a.color });
  if (a.op === "fill") tr!.sets.push({ frame, state: { items: a.items, highlight: a.highlight ?? [] } }); // fill names the slots that changed now
  if (a.op === "set") tr!.sets.push({ frame, state: a.state });
  if (a.op === "pulse") tr!.pulses.push(frame);
  if (a.op === "focus") b.focus.push({ frame, ids: [a.id].flat(), lines: a.lines ?? null });
  if (a.op === "unfocus") b.focus.push({ frame, ids: null, lines: null });
  if (a.op === "trace") b.traces.push({ frame, ids: a.ids, label: a.label, icon: a.icon, step: Math.round((a.speed ?? TRACE_STEP) * fps), color: a.color });
  if (a.op === "camera") b.camera.push({ frame, to: a.to ?? HOME.to, zoom: a.zoom ?? HOME.zoom });
  if (a.op === "clear") {
    for (const t of b.tracks.values()) end(t);
    b.focus.push({ frame, ids: null, lines: null });
    b.camera.push({ frame, ...HOME });
  }
}
const busy = (a: Action) => (a.wait ?? 0) + (a.op === "trace" ? a.ids.length * (a.speed ?? TRACE_STEP) : 0) + TIMING.anim;

// Pure: validated spec + per-beat speech durations -> absolute frames for everything.
export function buildTimeline(spec: Spec, voiced: Voiced[]): Timeline {
  const { fps, width, height } = spec.format;
  const { pad } = AUDIENCE[spec.audience];
  const frames = (sec: number) => Math.round(sec * fps);
  const board: Board = { tracks: new Map(), focus: [], camera: [], traces: [] };
  const { tracks, focus, camera, traces } = board;
  const all: Track[] = [];
  const chapters: ChapterEvent[] = [];
  const beats: BeatTiming[] = [];
  let start = 0;
  let chapter: string | null = null;

  spec.beats.forEach((beat, i) => {
    const { file, sec } = voiced[i];
    const style = beat.transition ?? "fade";
    if (beat.chapter) chapters.push({ frame: start, title: (chapter = beat.chapter) });
    for (const a of beat.do) {
      applyAction(board, a, start + frames(a.wait ?? 0), fps, style);
      if (a.op === "add") all.push(tracks.get(a.id)!); // an id added again (a playground's sheet) keeps its earlier track
    }
    const think = beat.think ?? 0;
    const settle = Math.max(0, ...beat.do.map(busy));
    const length = Math.max(sec ? sec + pad : 0, beat.hold ?? TIMING.minBeat, settle) + think;
    beats.push({ start, frames: frames(length), speechFrames: frames(sec), thinkFrames: frames(think), say: beat.say ?? "", audio: file, chapter });
    start += frames(length);
  });

  for (const t of all) {
    t.moves.sort(byFrame);
    t.morphs.sort(byFrame);
    t.colors.sort(byFrame);
    t.sets.sort(byFrame);
    t.pulses.sort((a, b) => a - b);
  }
  for (const list of [focus, camera, traces]) list.sort(byFrame);
  return { fps, width, height, totalFrames: start + frames(TIMING.tail), pal: themeOf(spec.theme), beats, tracks: all, focus, camera, traces, chapters };
}

// Frame where beat i (0-based, like spec paths) has settled: its last frame, or mid-think so the
// "pause and predict" overlay is fully visible.
export const settledFrame = (t: Timeline, i: number) => t.beats[i].start + t.beats[i].frames - 1 - Math.floor(t.beats[i].thinkFrames / 2);

// Per-beat timing in seconds, so agents can tune `wait` against real speech.
export const timing = (t: Timeline) =>
  t.beats.map((b, beat) => ({ beat, start: b.start / t.fps, length: b.frames / t.fps, speech: b.speechFrames / t.fps }))
    .map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round(v * 100) / 100])));

export function toSrt(t: Timeline): string {
  // ponytail: ISO slice breaks past 24h of video
  const ts = (f: number) => new Date(Math.round((f / t.fps) * 1000)).toISOString().slice(11, 23).replace(".", ",");
  return t.beats
    .filter((b) => b.say)
    .map((b, i) => `${i + 1}\n${ts(b.start)} --> ${ts(b.start + Math.max(b.speechFrames, 1))}\n${b.say}\n`)
    .join("\n");
}
