import { neededOf, notesFiring, probeOps, SAMPLE, walkthrough, type Game, type Line } from "./game.ts";
import { createWorld, metric, restructure, step, TICK, view, type Hop, type Input, type Model, type SimEvent, type World } from "./sim.ts";
import type { Action, Add } from "./spec.ts";
import { applyAction, buildTimeline, newTrack, TIMING, type Board, type Timeline, type Track } from "./timeline.ts";

// A playground's board while it plays: the sim runs one tick every TICK seconds of board time, and what it does
// lands in an ever-growing Timeline the video renderers draw (fills, colors, packets on arrows, probes).
// Old history is folded into each element every second, so the cost per frame stays flat however long it runs.
const LABELLED = { novice: 3, intermediate: 4, expert: 5 } as const; // packets in flight with a number; the rest are dots
const MAX_PACKETS = 12; // ponytail: more in flight are not drawn; add a "+N" badge on the arrow if it ever matters
const WARN = new Set<SimEvent["type"]>(["lost", "dropped", "refused"]); // a ring where it happened
const STEP_LIMIT = 5; // seconds `stepToNext` runs at most when nothing moves
const PROBE_SEC = 0.5; // seconds between counter updates

export type Said = { key: string; say: string };
export type LiveOptions = {
  seed?: number;
  script?: (w: World) => Input[]; // what happens on its own: a challenge's setup and script (see scheduler)
  hide?: string[]; // probe elements not revealed yet
  ghost?: Record<string, number[]>; // chart id -> the last run's points, drawn muted beside the live series
};
const GHOST = "last run";

// In-place filter: the timeline's arrays are shared with the board and the renderer.
const keep = <T>(xs: T[], ok: (x: T) => boolean) => {
  let j = 0;
  for (const x of xs) if (ok(x)) xs[j++] = x;
  xs.length = j;
};
const byFrame = (a: { frame: number }, b: { frame: number }) => a.frame - b.frame;

export class Live {
  readonly t: Timeline;
  readonly w: World;
  frame = 0;
  moved = 0; // packets sent so far, so stepToNext knows when something happened
  private board: Board;
  private pending: Input[] = [];
  private shown = new Map<string, string>(); // last state drawn per element, so only changes become sets
  private colored = new Map<string, number>(); // frame of each element's last color change
  private truth: boolean[];
  private said = new Map<number, number>(); // note -> frame it was last said
  private series: Map<Game["probes"][number], number[]>;
  private removed: string[] = [];
  private faults: string[] = [];
  private names: string[];
  readonly perTick: number; // frames per sim tick
  private anim: number;

  readonly game: Game;
  readonly m: Model;
  readonly log: { tick: number; input: Input }[] = []; // the player's inputs, to replay a run exactly
  readonly peak: Record<string, number> = {};
  now: Record<string, number> = {};
  private opts: LiveOptions;

  constructor(game: Game, m: Model, opts: LiveOptions = {}) {
    this.game = game;
    this.m = m;
    this.opts = opts;
    const scene = game.scene.filter((a) => !opts.hide?.includes(a.id));
    this.t = buildTimeline({ ...walkthrough(game), beats: [{ do: scene }] }, [{ file: null, sec: 0 }]);
    this.t.beats = []; // the board has no narration track; lines are played by the player
    this.board = { tracks: new Map(this.t.tracks.map((tr) => [tr.el.id, tr])), focus: this.t.focus, camera: this.t.camera, traces: this.t.traces };
    this.w = createWorld(m, opts.seed ?? game.sim.seed);
    this.truth = game.notes.map(() => false);
    this.series = new Map(game.probes.map((p) => [p, []]));
    this.names = neededOf(game, m);
    this.perTick = Math.round(TICK * this.t.fps);
    this.anim = Math.round(TIMING.anim * this.t.fps);
    for (const tr of this.t.tracks) tr.start = -2 * this.anim; // already drawn at frame 0: a run can wait for the player
  }

  input(i: Input) {
    this.pending.push(i);
  }

  // Runs the board `frames` frames on; returns the notes that fired.
  advance(frames: number): Said[] {
    const out: Said[] = [];
    for (let k = 0; k < frames; k++) {
      if (this.frame % this.perTick === 0) out.push(...this.tick());
      this.frame++;
      if (this.frame % (this.perTick * 10) === 0) this.compact();
    }
    return out;
  }

  // Runs on until a packet moves or something happens, at most STEP_LIMIT seconds: the step button.
  stepToNext(): Said[] {
    const out: Said[] = [];
    const [moved, frame] = [this.moved, this.frame];
    while (this.moved === moved && !out.length && this.frame - frame < STEP_LIMIT * this.t.fps) out.push(...this.advance(this.perTick));
    return out;
  }

  // An inspect line: its ops start now (plus their wait).
  line(key: string, line: Line): Said | null {
    for (const a of line.do) applyAction(this.board, a as Action, this.frame + Math.round((a.wait ?? 0) * this.t.fps), this.t.fps);
    for (const list of [this.t.focus, this.t.camera, this.t.traces]) list.sort(byFrame);
    for (const tr of this.t.tracks) for (const list of [tr.sets, tr.colors, tr.moves]) list.sort(byFrame);
    return line.say ? { key, say: line.say } : null;
  }

  private tick(): Said[] {
    const { m, w, game, frame: f } = this;
    const mine = this.pending.splice(0);
    for (const input of mine) this.log.push({ tick: w.tick, input });
    const o = step(m, w, [...(this.opts.script?.(w) ?? []), ...mine]);
    this.syncStructure(f);
    this.syncFaults(f);
    for (const op of view(m, w)) this.show(op, f);
    for (const h of o.hops) this.packet(h, f);
    for (const e of o.events) {
      const tr = WARN.has(e.type) ? this.board.tracks.get(e.at) : undefined;
      if (tr && f - (tr.pulses.at(-1) ?? -Infinity) >= 2 * this.anim) tr.pulses.push(f); // one ring at a time, not one per order
    }
    const now = (this.now = Object.fromEntries(this.names.map((k) => [k, metric(m, w, k)])));
    for (const k of this.names) this.peak[k] = Math.max(this.peak[k] ?? 0, now[k]);
    // charts gain a point every SAMPLE seconds; counters follow within half a second, so a loss shows as it happens
    if ((w.tick - 1) % Math.round(SAMPLE / TICK) === 0) for (const [p, pts] of this.series) if (pts.push(now[p.metric]) > 40) pts.shift();
    if ((w.tick - 1) % Math.round(PROBE_SEC / TICK) === 0) for (const op of probeOps(game, this.series, now)) this.show(this.withGhost(op), f);
    return notesFiring(game, o.events, now, this.truth).flatMap((i) => {
      const n = game.notes[i];
      const last = this.said.get(i);
      if (last !== undefined && ("once" in n ? n.once : true)) return [];
      if (last !== undefined && f - last < 10 * this.t.fps) return [];
      this.said.set(i, f);
      return [{ key: `note.${i}`, say: n.say }];
    });
  }

  // The points the chart's first probe drew, for the next run's ghost.
  seriesOf(chart: string): number[] {
    return [...this.series].find(([p]) => p.show === chart)?.[1].slice() ?? [];
  }

  // A chart's series plus the last run's, cut to the same length so both share the x axis.
  private withGhost(op: Action): Action {
    const ghost = op.op === "set" ? this.opts.ghost?.[op.id] : undefined;
    const series = op.op === "set" && (op.state as { series?: { label: string; points: number[] }[] }).series;
    if (!ghost || !series || series.length >= 3) return op;
    const n = Math.max(2, series[0].points.length);
    const points = ghost.length >= 2 ? ghost.slice(0, n) : [0, 0];
    return { ...op, state: { series: [...series, { label: GHOST, points: points.length >= 2 ? points : [...points, ...points], color: "muted" }] } } as Action;
  }

  // A state op, only when it changes what is drawn. Colors hold at least one transition, so a busy worker does not
  // flicker between idle and busy; going down shows at once.
  private show(op: Action, f: number) {
    if (!("id" in op) || typeof op.id !== "string" || !this.board.tracks.has(op.id)) return; // a probe not revealed yet
    const key = `${op.op} ${op.id}`;
    const json = JSON.stringify(op);
    if (this.shown.get(key) === json) return;
    if (op.op === "color" && op.color !== "bad" && f - (this.colored.get(op.id) ?? -Infinity) < this.anim) return;
    if (op.op === "color") this.colored.set(op.id, f);
    this.shown.set(key, json);
    applyAction(this.board, op, f, this.t.fps);
  }

  private packet(h: Hop, f: number) {
    this.moved++;
    const flying = this.t.traces.filter((ev) => f < ev.frame + ev.ids.length * ev.step);
    if (flying.length >= MAX_PACKETS) return;
    const labelled = flying.filter((ev) => ev.label).length < LABELLED[this.game.audience];
    this.t.traces.push({ frame: f, ids: [h.link], step: Math.max(1, Math.round(h.sec * this.t.fps)), ...(labelled ? { label: h.entity, icon: this.game.sim.entity.icon } : {}) });
  }

  private add(el: Add, f: number) {
    const tr = newTrack(el, f);
    this.t.tracks.push(tr);
    this.board.tracks.set(el.id, tr);
    for (const key of [...this.shown.keys()]) if (key.endsWith(` ${el.id}`)) this.shown.delete(key); // draw its live state again
  }
  private end(id: string, f: number) {
    const tr = this.board.tracks.get(id);
    if (tr && tr.end === null) tr.end = f;
  }

  // Parts taken out fade away with their arrows, and a bridge arrow comes in; putting a part back reverses it.
  private syncStructure(f: number) {
    if (this.w.removed.join() === this.removed.join()) return;
    for (const op of restructure(this.m, this.game.scene, this.removed, this.w.removed)) {
      if (op.op === "remove") this.end(op.id, f);
      else this.add(op, f);
    }
    this.removed = [...this.w.removed];
  }

  // A slow part wears a "slow" tag; a cut arrow turns bad (dashed). Going down is drawn by view().
  private syncFaults(f: number) {
    if (this.w.faults.join() === this.faults.join()) return;
    const scene = new Map(this.game.scene.map((a) => [a.id, a]));
    for (const fault of new Set([...this.faults, ...this.w.faults])) {
      const on = this.w.faults.includes(fault);
      if (on === this.faults.includes(fault)) continue;
      const id = fault.slice(0, fault.lastIndexOf("."));
      if (fault.endsWith(".slow") && on) this.add({ op: "add", type: "badge", id: `${id}-slow`, on: id, text: "slow", corner: "top-left" } as Add, f);
      if (fault.endsWith(".slow") && !on) this.end(`${id}-slow`, f);
      if (fault.endsWith(".cut")) this.show({ op: "color", id, color: on ? "bad" : scene.get(id)?.color ?? "muted" }, f);
    }
    this.faults = [...this.w.faults];
  }

  // Folds history older than one transition into each element and drops what has faded: flat cost per frame.
  private compact() {
    const f = this.frame;
    const settled = f - this.anim - 2;
    const t = this.t;
    const flying = (ev: Timeline["traces"][number]) => ev.frame + ev.ids.length * ev.step + this.anim >= f;
    keep(t.traces, flying);
    const used = new Set(t.traces.flatMap((ev) => ev.ids.map((r) => r.split(".")[0])));
    for (const tr of t.tracks) fold(tr, settled);
    keep(t.tracks, (tr) => tr.end === null || tr.end > settled || used.has(tr.el.id));
    for (const list of [t.focus, t.camera] as { frame: number }[][]) {
      const last = list.findLast((ev) => ev.frame <= settled);
      keep(list, (ev) => ev.frame > settled || ev === last);
    }
  }
}

function fold(tr: Track, settled: number) {
  const sets = tr.sets.filter((s) => s.frame <= settled);
  if (sets.length) tr.el = sets.reduce((el, s) => ({ ...el, ...s.state }) as Add, tr.el);
  const colors = tr.colors.filter((c) => c.frame <= settled);
  if (colors.length) tr.el = { ...tr.el, color: colors.at(-1)!.color } as Add;
  keep(tr.sets, (s) => s.frame > settled);
  keep(tr.colors, (c) => c.frame > settled);
  keep(tr.pulses, (p) => p > settled);
}
