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
const busy = (a: Action) => (a.wait ?? 0) + (a.op === "trace" ? a.ids.length * (a.speed ?? TRACE_STEP) : 0) + TIMING.anim;

// Pure: validated spec + per-beat speech durations -> absolute frames for everything.
export function buildTimeline(spec: Spec, voiced: Voiced[]): Timeline {
  const { fps, width, height } = spec.format;
  const { pad } = AUDIENCE[spec.audience];
  const frames = (sec: number) => Math.round(sec * fps);
  const tracks = new Map<string, Track>();
  const focus: FocusEvent[] = [];
  const camera: CameraEvent[] = [];
  const traces: TraceEvent[] = [];
  const chapters: ChapterEvent[] = [];
  const beats: BeatTiming[] = [];
  let start = 0;
  let chapter: string | null = null;

  spec.beats.forEach((beat, i) => {
    const { file, sec } = voiced[i];
    const style = beat.transition ?? "fade";
    if (beat.chapter) chapters.push({ frame: start, title: (chapter = beat.chapter) });
    const end = (t: Track, frame: number) => {
      if (t.end !== null) return;
      t.end = frame;
      t.exit = style;
    };
    for (const a of beat.do) {
      const frame = start + frames(a.wait ?? 0);
      if (a.op === "add") tracks.set(a.id, { el: a, start: frame, end: null, enter: style, exit: "fade", moves: [], morphs: [], colors: [], sets: [], pulses: [] });
      if (a.op === "remove") end(tracks.get(a.id)!, frame);
      if (a.op === "move") tracks.get(a.id)!.moves.push({ frame, to: a.to });
      if (a.op === "morph") tracks.get(a.id)!.morphs.push({ frame, code: a.code });
      if (a.op === "color") tracks.get(a.id)!.colors.push({ frame, color: a.color });
      if (a.op === "fill") tracks.get(a.id)!.sets.push({ frame, state: { items: a.items, highlight: a.highlight ?? [] } }); // fill names the slots that changed now
      if (a.op === "set") tracks.get(a.id)!.sets.push({ frame, state: a.state });
      if (a.op === "pulse") tracks.get(a.id)!.pulses.push(frame);
      if (a.op === "focus") focus.push({ frame, ids: [a.id].flat(), lines: a.lines ?? null });
      if (a.op === "unfocus") focus.push({ frame, ids: null, lines: null });
      if (a.op === "trace") traces.push({ frame, ids: a.ids, label: a.label, icon: a.icon, step: frames(a.speed ?? TRACE_STEP), color: a.color });
      if (a.op === "camera") camera.push({ frame, to: a.to ?? HOME.to, zoom: a.zoom ?? HOME.zoom });
      if (a.op === "clear") {
        for (const t of tracks.values()) end(t, frame);
        focus.push({ frame, ids: null, lines: null });
        camera.push({ frame, ...HOME });
      }
    }
    const think = beat.think ?? 0;
    const settle = Math.max(0, ...beat.do.map(busy));
    const length = Math.max(sec ? sec + pad : 0, beat.hold ?? TIMING.minBeat, settle) + think;
    beats.push({ start, frames: frames(length), speechFrames: frames(sec), thinkFrames: frames(think), say: beat.say ?? "", audio: file, chapter });
    start += frames(length);
  });

  for (const t of tracks.values()) {
    t.moves.sort(byFrame);
    t.morphs.sort(byFrame);
    t.colors.sort(byFrame);
    t.sets.sort(byFrame);
    t.pulses.sort((a, b) => a - b);
  }
  for (const list of [focus, camera, traces]) list.sort(byFrame);
  return { fps, width, height, totalFrames: start + frames(TIMING.tail), pal: themeOf(spec.theme), beats, tracks: [...tracks.values()], focus, camera, traces, chapters };
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
