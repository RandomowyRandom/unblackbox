import { z } from "zod";
import { Label } from "./components/registry.ts";
import { createWorld, EVENTS, metric, metricsOf, modelOf, Sim, step, TICK, view, type Input, type Model, type SimEvent } from "./sim.ts";
import { Action, Add, checkSemantics, Id, resolvePlaces, Spec, type Beat, type Issue } from "./spec.ts";

// A playground is a live board: the sim in `sim` moves entities across the scene, the player pulls levers
// (params, faults, removing a part) and watches what follows; stages and challenges guide that play.
// Lines only change how things look (focus, pulse, camera); the board itself is built once in `scene`.
const STATE_OPS = ["trace", "color", "fill", "set", "pulse", "focus", "unfocus", "camera", "move"];
const StateAction = Action.refine((a) => STATE_OPS.includes(a.op), "only trace, color, fill, set, pulse, focus, unfocus, camera and move run in a playground; build the board in scene");
const Say = z.string().regex(/\S/, "write the line, or leave the field out").describe("spoken and captioned; one or two short sentences");

const Line = z.strictObject({ say: Say.optional(), do: z.array(StateAction).default([]) });
const Control = z.string().describe("a param id, node.down / node.slow, link.cut, node.remove or source.burst");
const Pred = z.strictObject({
  metric: z.string().describe("e.g. lost, done, queue.length, worker.busy, wait.p90 (span), mail.duplicates"),
  atMost: z.number().optional(),
  moreThan: z.number().optional(),
  at: z.enum(["peak", "end"]).default("end").describe("peak = the highest value during the run, end = the value when it ends"),
}).refine((p) => (p.atMost === undefined) !== (p.moreThan === undefined), "use exactly one of atMost or moreThan");
const When = z.union([Pred, z.strictObject({ all: z.array(Pred).min(2).max(3) })]);
const Note = z.union([
  z.strictObject({ on: z.enum(EVENTS), at: Id.optional().describe("only at this node or arrow"), say: Say, once: z.boolean().default(true) }),
  z.strictObject({ when: When, say: Say }),
]).describe("said the first time something happens in the sim");
const Probe = z.strictObject({
  metric: z.string(),
  show: Id.describe("a counter, gauge or progress for a number, or a chart that plots it over time"),
  series: z.string().optional().describe("the chart series it feeds"),
});
const Move = z.union([
  z.strictObject({ at: z.number().min(0), param: Id, value: z.union([z.number(), z.string()]) }),
  z.strictObject({ at: z.number().min(0), fault: z.string(), for: z.number().positive().optional(), when: z.literal("busy").optional().describe("waits until the node is working on an entity, so a crash always catches one") }),
  z.strictObject({ at: z.number().min(0), remove: Id }),
  z.strictObject({ at: z.number().min(0), burst: Id }),
]);
const Stage = z.strictObject({
  id: Id,
  title: Label,
  say: Say.optional(),
  controls: z.union([z.array(Control), z.literal("all")]).describe("what the player can use in this stage"),
  reveal: z.array(Id).default([]).describe("probe elements that appear in this stage (none are shown before)"),
  challenge: Id.optional(),
});
const Challenge = z.strictObject({
  id: Id,
  ask: Say,
  setup: z.strictObject({
    params: z.record(Id, z.union([z.number(), z.string()])).default({}),
    removed: z.array(Id).default([]),
    script: z.array(Move).default([]).describe("what happens on its own: a crash at 5 s, a slow server for 10 s"),
  }).prefault({}),
  controls: z.array(Control).describe("what the player may change during it"),
  by: z.number().min(5).max(120).describe("seconds the run lasts; the goal is checked then"),
  predict: z.strictObject({ ask: Say, options: z.array(z.strictObject({ say: Label, when: When })).min(2).max(4) }).optional(),
  goal: z.array(Pred).min(1).max(3).optional(),
  hints: z.array(z.strictObject({ pulse: Id.optional(), say: Say })).max(3).default([]),
  success: Say.optional(),
  fail: Say.optional(),
  solution: z.array(Move).optional().describe("moves that meet the goal; the build proves it on every seed"),
});

export const Game = Spec.omit({ beats: true }).extend({
  version: z.literal(2),
  start: z.strictObject({ primary: Control.describe("the one control that glows when the playground opens") }),
  scene: z.array(Add.refine((a) => a.type !== "code", "no code in playgrounds; show components")).min(1)
    .describe("add ops that build the board, usually the video's big-picture view plus its probes"),
  sim: Sim,
  probes: z.array(Probe).max(4).default([]),
  notes: z.array(Note).max(8).default([]),
  inspect: z.record(Id, Line).default({}).describe("element id -> what clicking it says and shows"),
  stages: z.array(Stage).min(1).max(6).optional().describe("guided play, one new lever per stage, the full sandbox last; without stages it is one sandbox"),
  challenges: z.array(Challenge).max(4).default([]),
});
export type Game = z.infer<typeof Game>;
export type Line = z.infer<typeof Line>;
type Pred = z.infer<typeof Pred>;
type WhenT = z.infer<typeof When>;
type MoveT = z.infer<typeof Move>;
type ChallengeT = z.infer<typeof Challenge>;

// Every spoken line with a stable key (used to find its voice) and its path in the game file.
// `said` lines are one text field (path points at it); inspect lines are a whole {say, do}.
export function linesOf(game: Game): { key: string; path: string; line: Line; said?: true }[] {
  const said = (key: string, path: string, say: string | undefined) => (say ? [{ key, path, line: { say, do: [] }, said: true as const }] : []);
  return [
    ...(game.stages ?? []).flatMap((s, i) => said(`stage.${s.id}`, `stages.${i}.say`, s.say)),
    ...game.challenges.flatMap((c, i) => [
      ...said(`challenge.${c.id}.ask`, `challenges.${i}.ask`, c.ask),
      ...said(`challenge.${c.id}.predict`, `challenges.${i}.predict.ask`, c.predict?.ask),
      ...c.hints.flatMap((h, k) => said(`challenge.${c.id}.hint.${k}`, `challenges.${i}.hints.${k}.say`, h.say)),
      ...said(`challenge.${c.id}.success`, `challenges.${i}.success`, c.success),
      ...said(`challenge.${c.id}.fail`, `challenges.${i}.fail`, c.fail),
    ]),
    ...game.notes.flatMap((n, i) => said(`note.${i}`, `notes.${i}.say`, n.say)),
    ...Object.entries(game.inspect).map(([id, line]) => ({ key: `inspect.${id}`, path: `inspect.${id}`, line })),
  ];
}

// The game as one linear video spec: the board, then every line. Reuses spec checks, lint, voice and the sheet.
export function walkthrough(game: Game): Spec {
  const { scene, sim, probes, notes, inspect, stages, challenges, version, start, ...base } = game;
  const beats: Beat[] = [{ do: scene }, ...linesOf(game).map(({ line }) => ({ say: line.say, do: line.do }))];
  return { ...base, beats };
}

// Issue paths from the walkthrough (beats.N...) mapped back to where they are in the game file.
export function toGamePaths(game: Game, issues: Issue[]): Issue[] {
  const lines = linesOf(game);
  return issues.map(({ path, message }) => ({
    message,
    path: path.replace(/^beats\.(\d+)(\.do|\.say)?/, (_, n, d) => {
      if (n === "0") return d === ".do" ? "scene" : "";
      const line = lines[Number(n) - 1];
      return line.said && d === ".say" ? line.path : `${line.path}${d ?? ""}`;
    }),
  }));
}

// What the player can touch: every param, every declared fault, every removable part, every burst.
export function controlsOf(m: Model): string[] {
  return [
    ...Object.keys(m.sim.params),
    ...Object.entries(m.sim.nodes).flatMap(([id, n]) => [
      ...("faults" in n ? (n.faults ?? []).map((f) => `${id}.${f}`) : []),
      ...("removable" in n && n.removable ? [`${id}.remove`] : []),
      ...(n.kind === "source" && n.burst ? [`${id}.burst`] : []),
    ]),
    ...Object.entries(m.sim.links).flatMap(([id, l]) => (l.faults ?? []).map((f) => `${id}.${f}`)),
  ];
}
const some = (keys: string[]) => (keys.length ? `: ${keys.slice(0, 10).join(", ")}${keys.length > 10 ? ", ..." : ""}` : "; there are none");
const predsOf = (w: WhenT): Pred[] => ("all" in w ? w.all : [w]);
const controlOf = (mv: MoveT) => ("param" in mv ? mv.param : "fault" in mv ? mv.fault : "remove" in mv ? `${mv.remove}.remove` : `${mv.burst}.burst`);

function checkGame(game: Game, m: Model): Issue[] {
  const issues: Issue[] = [];
  const fail = (path: string, message: string) => issues.push({ path, message });
  const els = new Map(game.scene.map((a) => [a.id, a]));
  const controls = controlsOf(m);
  const metrics = metricsOf(m);
  const where = [...Object.keys(m.sim.nodes), ...Object.keys(m.links), ...Object.keys(m.sim.nodes).map((id) => `${id}-bridge`)];
  const control = (path: string, c: string) => {
    if (controls.includes(c)) return;
    const own = controls.filter((x) => x.startsWith(`${c.split(".")[0]}.`));
    fail(path, own.length && c.includes(".") ? `'${c}' is not a control; '${c.split(".")[0]}' has ${own.join(", ")}` : `'${c}' is not a control${some(controls)}`);
  };
  const pred = (path: string, p: Pred) => { if (!metrics.includes(p.metric)) fail(`${path}.metric`, `'${p.metric}' is not a metric${some(metrics)}`); };
  const value = (path: string, id: string, v: number | string) => {
    const p = m.sim.params[id];
    if (!p) return fail(path, `'${id}' is not a param${some(Object.keys(m.sim.params))}`);
    if ("min" in p ? typeof v !== "number" || v < p.min || v > p.max : !p.options.includes(String(v))) {
      fail(path, `${JSON.stringify(v)} is not a value of '${id}': ${"min" in p ? `${p.min}..${p.max}` : p.options.join(", ")}`);
    }
  };
  const move = (path: string, mv: MoveT, allowed?: string[]) => {
    const c = controlOf(mv);
    if ("param" in mv) value(`${path}.value`, mv.param, mv.value);
    else if ("fault" in mv && !/\.(down|slow|cut)$/.test(c)) fail(`${path}.fault`, `'${c}' is not a fault; take a part out with { "remove": id }, burst with { "burst": id }, move a lever with { "param", "value" }`);
    else control(path, c);
    if (allowed && !allowed.includes(c)) fail(path, `'${c}' is not one of this challenge's controls${some(allowed)}`);
    if ("when" in mv && mv.when && !/\.(down|slow)$/.test(c)) fail(`${path}.when`, "when: busy needs a node fault");
  };

  const shown = new Set<string>();
  const probes: Game["probes"] = []; // the ones that can be drawn; reveal and goals only count these
  game.probes.forEach((p, i) => {
    const el = els.get(p.show);
    if (!metrics.includes(p.metric)) fail(`probes.${i}.metric`, `'${p.metric}' is not a metric${some(metrics)}`);
    if (!el) return fail(`probes.${i}.show`, `'${p.show}' is not on the board`);
    if (!["counter", "gauge", "progress", "chart"].includes(el.type)) return fail(`probes.${i}.show`, `'${p.show}' is ${el.type}; a number needs a counter, gauge, progress or chart`);
    if (el.type === "chart" && !el.series.some((s) => s.label === p.series)) fail(`probes.${i}.series`, `chart '${p.show}' has series ${el.series.map((s) => s.label).join(", ")}; name one`);
    if (el.type !== "chart" && p.series) fail(`probes.${i}.series`, `only a chart has series; '${p.show}' is ${el.type}`);
    const key = `${p.show}/${p.series ?? ""}`;
    if (shown.has(key)) fail(`probes.${i}.show`, `'${p.show}' already shows another metric`);
    shown.add(key);
    probes.push(p);
  });
  const probesOf = (metricName: string) => probes.filter((p) => p.metric === metricName).map((p) => p.show);

  game.notes.forEach((n, i) => {
    if ("on" in n && n.at && !where.includes(n.at)) fail(`notes.${i}.at`, `'${n.at}' is not a sim node or flow arrow${some(where)}`);
    if ("when" in n) predsOf(n.when).forEach((p, k) => pred("all" in n.when ? `notes.${i}.when.all.${k}` : `notes.${i}.when`, p));
  });

  const ids = new Set<string>();
  game.challenges.forEach((c, i) => {
    const path = `challenges.${i}`;
    if (ids.has(c.id)) fail(`${path}.id`, `challenge id '${c.id}' used twice`);
    ids.add(c.id);
    c.controls.forEach((ctl, k) => control(`${path}.controls.${k}`, ctl));
    Object.entries(c.setup.params).forEach(([id, v]) => value(`${path}.setup.params.${id}`, id, v));
    c.setup.removed.forEach((id, k) => control(`${path}.setup.removed.${k}`, `${id}.remove`));
    c.setup.script.forEach((mv, k) => {
      move(`${path}.setup.script.${k}`, mv);
      if (mv.at >= c.by) fail(`${path}.setup.script.${k}.at`, `${mv.at} s is after the run ends at ${c.by} s`);
      if (c.controls.includes(controlOf(mv))) fail(`${path}.controls`, `'${controlOf(mv)}' is driven by the script; it cannot also be a control`);
    });
    c.solution?.forEach((mv, k) => {
      move(`${path}.solution.${k}`, mv, c.controls);
      if (mv.at >= c.by) fail(`${path}.solution.${k}.at`, `${mv.at} s is after the run ends at ${c.by} s`);
    });
    // no hidden state: what the goal checks is on screen
    c.goal?.forEach((p, k) => { if (metrics.includes(p.metric) && !probesOf(p.metric).length) fail(`${path}.goal.${k}.metric`, `'${p.metric}' is not shown by any probe; the player must see what the goal checks`); });
    c.goal?.forEach((p, k) => pred(`${path}.goal.${k}`, p));
    c.predict?.options.forEach((o, k) => predsOf(o.when).forEach((p, j) => pred("all" in o.when ? `${path}.predict.options.${k}.when.all.${j}` : `${path}.predict.options.${k}.when`, p)));
    c.hints.forEach((h, k) => { if (h.pulse && !els.has(h.pulse)) fail(`${path}.hints.${k}.pulse`, `'${h.pulse}' is not on the board`); });
    if (c.goal && !c.solution) fail(`${path}.solution`, "a goal needs a solution, so the build can prove it can be met");
    if (!c.goal && !c.predict) fail(path, "give it a goal (fix or break something) or a predict question");
  });

  const stages = game.stages ?? [];
  const sids = new Set<string>();
  const used = new Set<string>();
  const revealed = new Set<string>();
  stages.forEach((s, i) => {
    const path = `stages.${i}`;
    if (sids.has(s.id)) fail(`${path}.id`, `stage id '${s.id}' used twice`);
    sids.add(s.id);
    if (s.controls !== "all") s.controls.forEach((ctl, k) => control(`${path}.controls.${k}`, ctl));
    s.reveal.forEach((id, k) => {
      if (!probes.some((p) => p.show === id)) fail(`${path}.reveal.${k}`, `'${id}' is not a probe's element${some(probes.map((p) => p.show))}`);
      revealed.add(id);
    });
    if (!s.challenge) return;
    const c = game.challenges.find((x) => x.id === s.challenge);
    if (!c) return fail(`${path}.challenge`, `'${s.challenge}' is not a challenge${some(game.challenges.map((x) => x.id))}`);
    if (used.has(c.id)) fail(`${path}.challenge`, `challenge '${c.id}' is already in another stage`);
    used.add(c.id);
    // ... and on screen by this stage
    const k = game.challenges.indexOf(c);
    c.goal?.forEach((p, j) => {
      const els = probesOf(p.metric);
      if (els.length && !els.some((el) => revealed.has(el))) fail(`challenges.${k}.goal.${j}.metric`, `'${els[0]}' (${p.metric}) is not revealed by stage '${s.id}' or before it`);
    });
  });
  if (stages.length && stages.at(-1)!.controls !== "all") fail(`stages.${stages.length - 1}.controls`, `the last stage is the sandbox; give it "controls": "all"`);
  game.challenges.forEach((c, i) => { if (stages.length && !used.has(c.id)) fail(`challenges.${i}.id`, `challenge '${c.id}' is in no stage`); });
  const first = stages[0]?.controls ?? "all";
  if (first === "all") control("start.primary", game.start.primary);
  else if (!first.includes(game.start.primary)) fail("start.primary", `'${game.start.primary}' is not a control of the first stage${some(first)}`);
  for (const id of Object.keys(game.inspect)) if (!els.has(id)) fail(`inspect.${id}`, `'${id}' is not on the board`);
  return issues;
}

export function parseGame(input: unknown): { game: Game; model: Model; issues: [] } | { game: null; model: null; issues: Issue[] } {
  const r = Game.safeParse(input);
  if (!r.success) return { game: null, model: null, issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  const game = r.data;
  const issues: Issue[] = toGamePaths(game, checkSemantics(walkthrough(game)));
  const { model, issues: simIssues } = modelOf(game.sim, game.scene);
  issues.push(...simIssues);
  if (model) issues.push(...checkGame(game, model));
  if (issues.length || !model) return { game: null, model: null, issues };
  // `place` and `camera.on` become positions, like in a video
  const resolved = resolvePlaces(walkthrough(game)).beats;
  game.scene = resolved[0].do as Game["scene"];
  linesOf(game).forEach(({ line }, i) => (line.do = resolved[i + 1].do));
  return { game, model, issues: [] };
}

// ---- headless runs: the build plays the game so the author does not have to ----

const SANDBOX_SEC = 60;
const SEEDS = 4;
const CHART_POINTS = 30;
const SAMPLE = 2; // seconds between chart points

type Plan = { name: string; sec: number; params?: Record<string, number | string>; removed?: string[]; moves?: MoveT[] };
type Run = { seed: number; peak: Record<string, number>; end: Record<string, number>; events: SimEvent[]; fired: number[]; ops: Beat["do"] };

const holds = (p: Pred, r: Run) => {
  const v = (p.at === "peak" ? r.peak : r.end)[p.metric];
  return p.atMost !== undefined ? v <= p.atMost : v > p.moreThan!;
};
const holdsWhen = (w: WhenT, r: Run) => predsOf(w).every((p) => holds(p, r));
const fmt = (p: Pred) => `${p.metric} ${p.atMost !== undefined ? `≤ ${p.atMost}` : `> ${p.moreThan}`}`;

// The metrics anything reads: probes, notes, goals, predicts, the run table. Only these are computed each tick.
const neededOf = (game: Game, m: Model) => [...new Set([
  "lost", ...Object.keys(m.capacity).map((q) => `${q}.length`), ...game.probes.map((p) => p.metric),
  ...game.notes.flatMap((n) => ("when" in n ? predsOf(n.when).map((p) => p.metric) : [])),
  ...game.challenges.flatMap((c) => [...(c.goal ?? []), ...(c.predict?.options.flatMap((o) => predsOf(o.when)) ?? [])].map((p) => p.metric)),
])];

// One seeded run of a plan: metric peaks and end values, the sim events, which notes fired, and the board as ops.
export function simulate(game: Game, m: Model, plan: Plan, seed: number): Run {
  const w = createWorld(m, seed);
  const names = neededOf(game, m);
  const peak: Record<string, number> = Object.fromEntries(names.map((k) => [k, 0]));
  const events: SimEvent[] = [];
  const fired = new Set<number>();
  const truth = game.notes.map(() => false);
  const series = new Map(game.probes.map((p) => [p, [] as number[]]));
  const due = new Map<number, Input[]>();
  const at = (sec: number, input: Input) => { const t = Math.round(sec / TICK); due.set(t, [...(due.get(t) ?? []), input]); };
  for (const [id, v] of Object.entries(plan.params ?? {})) at(0, { param: id, value: v });
  for (const id of plan.removed ?? []) at(0, { remove: id, on: true });
  const busyAt: MoveT[] = [];
  for (const mv of plan.moves ?? []) {
    if ("param" in mv) at(mv.at, { param: mv.param, value: mv.value });
    else if ("remove" in mv) at(mv.at, { remove: mv.remove, on: true });
    else if ("burst" in mv) at(mv.at, { burst: mv.burst });
    else if (mv.when) busyAt.push(mv);
    else { at(mv.at, { fault: mv.fault, on: true }); if (mv.for) at(mv.at + mv.for, { fault: mv.fault, on: false }); }
  }
  const ticks = Math.round(plan.sec / TICK);
  for (let t = 0; t < ticks; t++) {
    for (const mv of [...busyAt]) {
      if (!("fault" in mv) || t * TICK < mv.at || !w.nodes[mv.fault.split(".")[0]].slots.some((sl) => sl.phase === "work")) continue;
      busyAt.splice(busyAt.indexOf(mv), 1);
      at(t * TICK, { fault: mv.fault, on: true });
      if (mv.for) at(t * TICK + mv.for, { fault: mv.fault, on: false });
    }
    const out = step(m, w, due.get(t));
    events.push(...out.events);
    const now: Record<string, number> = Object.fromEntries(names.map((k) => [k, metric(m, w, k)]));
    for (const k of names) peak[k] = Math.max(peak[k], now[k]);
    game.notes.forEach((n, i) => {
      if ("on" in n) { if (out.events.some((e) => e.type === n.on && (!n.at || e.at === n.at))) fired.add(i); return; }
      const ok = predsOf(n.when).every((p) => (p.atMost !== undefined ? now[p.metric] <= p.atMost : now[p.metric] > p.moreThan!));
      if (ok && !truth[i]) fired.add(i);
      truth[i] = ok;
    });
    if (t % Math.round(SAMPLE / TICK) === 0) for (const [p, pts] of series) pts.push(now[p.metric]);
  }
  const end = Object.fromEntries(names.map((k) => [k, metric(m, w, k)]));
  return { seed, peak, end, events, fired: [...fired].sort((a, b) => a - b), ops: [...view(m, w), ...probeOps(game, series, end)] };
}

// Probe readouts as set ops on their elements: counters show the value now, charts the last points.
function probeOps(game: Game, series: Map<Game["probes"][number], number[]>, end: Record<string, number>): Beat["do"] {
  return game.probes.flatMap((p): Beat["do"] => {
    const el = game.scene.find((a) => a.id === p.show)!;
    if (el.type !== "chart") return [{ op: "set", id: p.show, state: { value: end[p.metric] } }];
    if (game.probes.findIndex((q) => q.show === p.show) !== game.probes.indexOf(p)) return [];
    const mine = game.probes.filter((q) => q.show === p.show);
    const pts = (label: string) => {
      const q = mine.find((x) => x.series === label);
      const xs = q ? series.get(q)!.slice(-CHART_POINTS) : [];
      return xs.length >= 2 ? xs : [0, 0];
    };
    return [{ op: "set", id: p.show, state: { series: el.series.map((s) => ({ ...s, points: mine.some((q) => q.series === s.label) ? pts(s.label) : s.points })) } }];
  });
}

const seedsOf = (game: Game) => Array.from({ length: SEEDS }, (_, i) => game.sim.seed + i);
const runAll = (game: Game, m: Model, plan: Plan) => seedsOf(game).map((s) => simulate(game, m, plan, s));

// The sandbox plans: defaults, each lever at its ends, each fault for a while, each part taken out, each burst.
function sandboxPlans(m: Model): Plan[] {
  const plans: Plan[] = [{ name: "defaults", sec: SANDBOX_SEC }];
  for (const [id, p] of Object.entries(m.sim.params)) {
    const values = "min" in p ? [p.min, p.max] : p.options.filter((o) => o !== p.value);
    for (const v of values) plans.push({ name: `${id}=${v}`, sec: SANDBOX_SEC, params: { [id]: v } });
  }
  for (const c of controlsOf(m)) {
    if (/\.(down|slow|cut)$/.test(c)) plans.push({ name: c, sec: SANDBOX_SEC, moves: [{ at: 10, fault: c, for: 20 }] });
    if (c.endsWith(".remove")) plans.push({ name: c, sec: SANDBOX_SEC, removed: [c.slice(0, -7)] });
    if (c.endsWith(".burst")) plans.push({ name: c, sec: SANDBOX_SEC, moves: [{ at: 10, burst: c.slice(0, -6) }] });
  }
  return plans;
}

// Each number lever at both ends while one other lever is at one of its values: a lever often matters only
// under load (workers once the rate is high, drop once the queue fills). Kept out of the run table.
function pairPlans(m: Model): { lever: string; end: "min" | "max"; plan: Plan }[] {
  const values = (p: z.infer<typeof Sim>["params"][string]) => ("min" in p ? [p.min, p.max] : p.options);
  return Object.entries(m.sim.params).flatMap(([a, pa]) => !("min" in pa) ? [] : Object.entries(m.sim.params).filter(([b]) => b !== a)
    .flatMap(([b, pb]) => values(pb).flatMap((v) => (["min", "max"] as const).map((end) =>
      ({ lever: a, end, plan: { name: `${a}=${pa[end]}, ${b}=${v}`, sec: SANDBOX_SEC, params: { [a]: pa[end], [b]: v } } })))));
}

const challengePlan = (c: ChallengeT, name: string, extra: MoveT[] = []): Plan =>
  ({ name, sec: c.by, params: c.setup.params, removed: c.setup.removed, moves: [...c.setup.script, ...extra] });

// One way to use each of a challenge's controls on its own, to see whether the puzzle is a puzzle.
function settingsOf(m: Model, c: ChallengeT): MoveT[] {
  return c.controls.flatMap((ctl): MoveT[] => {
    const p = m.sim.params[ctl];
    if (p) return ("min" in p ? [p.min, p.max] : p.options).map((value) => ({ at: 0, param: ctl, value }));
    if (ctl.endsWith(".remove")) return [{ at: 0, remove: ctl.slice(0, -7) }];
    if (ctl.endsWith(".burst")) return [{ at: 0, burst: ctl.slice(0, -6) }];
    return [{ at: 0, fault: ctl }];
  });
}

export type RunRow = { run: string; peak: Record<string, number>; notes: number[] };

// Plays every plan on SEEDS seeds. Errors: a solution that fails, a predict without exactly one true option,
// a goal already met, a board op a component rejects. Warnings: notes that never fire, levers that change nothing,
// puzzles any control solves.
export function verify(game: Game, m: Model): { errors: Issue[]; warnings: Issue[]; runs: RunRow[] } {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const rows: RunRow[] = [];
  const allRuns: Run[] = [];
  const shown = [...new Set(["lost", ...game.probes.map((p) => p.metric), ...Object.keys(m.capacity).map((q) => `${q}.length`)])];
  const record = (plan: Plan) => {
    const runs = runAll(game, m, plan);
    allRuns.push(...runs);
    rows.push({ run: plan.name, peak: Object.fromEntries(shown.map((k) => [k, Math.max(...runs.map((r) => r.peak[k]))])), notes: [...new Set(runs.flatMap((r) => r.fired))].sort((a, b) => a - b) });
    return runs;
  };

  const sandbox = new Map(sandboxPlans(m).map((p) => [p.name, record(p)]));
  const pairs = pairPlans(m).map((x) => ({ ...x, runs: runAll(game, m, x.plan) }));
  allRuns.push(...pairs.flatMap((x) => x.runs));
  const differ = (lo: Run[], hi: Run[]) => game.probes.some(({ metric: k }) => {
    const a = Math.max(...lo.map((r) => r.peak[k]));
    const b = Math.max(...hi.map((r) => r.peak[k]));
    return Math.abs(a - b) > Math.max(0.1 * Math.max(Math.abs(a), Math.abs(b)), 1e-9);
  });
  for (const [id, p] of Object.entries(m.sim.params)) {
    if (!("min" in p) || !game.probes.length) continue;
    const mine = pairs.filter((x) => x.lever === id);
    const contexts = [[sandbox.get(`${id}=${p.min}`)!, sandbox.get(`${id}=${p.max}`)!], ...mine.filter((x) => x.end === "min").map((lo, k) => [lo.runs, mine.filter((x) => x.end === "max")[k].runs])];
    if (!contexts.some(([lo, hi]) => differ(lo, hi))) warnings.push({ path: `sim.params.${id}`, message: `${p.min} and ${p.max} change no probe by more than 10%, alone or with another lever moved; widen the range past the tipping point` });
  }

  game.challenges.forEach((c, i) => {
    const path = `challenges.${i}`;
    const setup = record(challengePlan(c, `${c.id}: setup`));
    // the first seed that goes wrong is enough to fix it
    const options = (r: Run) => c.predict!.options.map((o, k) => (holdsWhen(o.when, r) ? k : -1)).filter((k) => k >= 0);
    const undecided = c.predict && setup.find((r) => options(r).length !== 1);
    if (undecided) {
      const ok = options(undecided);
      errors.push({ path: `${path}.predict.options`, message: ok.length ? `options ${ok.join(", ")} all hold on seed ${undecided.seed}; exactly one must` : `no option holds on seed ${undecided.seed}; use even arrivals or a 'when: busy' fault, or change the thresholds` });
    }
    if (!c.goal) return;
    if (setup.every((r) => c.goal!.every((g) => holds(g, r)))) errors.push({ path, message: "the setup already meets the goal on every seed; it teaches nothing" });
    const solved = record(challengePlan(c, `${c.id}: solution`, c.solution));
    const r = solved.find((x) => !c.goal!.every((g) => holds(g, x)));
    const g = r && c.goal.find((x) => !holds(x, r));
    if (r && g) errors.push({ path: `${path}.solution`, message: `${g.metric} = ${(g.at === "peak" ? r.peak : r.end)[g.metric]} ${g.at === "peak" ? "at its peak" : `at ${c.by} s`} (seed ${r.seed}); goal needs ${fmt(g)}` });
    const settings = settingsOf(m, c);
    const passing = settings.filter((mv) => runAll(game, m, challengePlan(c, "", [mv])).every((r) => c.goal!.every((g) => holds(g, r))));
    if (settings.length > 1 && passing.length === settings.length) warnings.push({ path: `${path}.controls`, message: `all ${settings.length} settings of the controls pass on their own; add a decoy or a reason to choose` });
  });

  game.notes.forEach((_, i) => { if (!allRuns.some((r) => r.fired.includes(i))) warnings.push({ path: `notes.${i}`, message: `never fired in ${allRuns.length} runs` }); });
  game.notes.forEach((n, i) => { if (/\d/.test(n.say)) warnings.push({ path: `notes.${i}.say`, message: "live numbers go stale in speech; show them with a probe" }); });

  // every board state the sim produced must be one the components accept
  const ops = [...new Map(allRuns.flatMap((r) => r.ops).map((op) => [JSON.stringify(op), op])).values()];
  for (const is of checkSemantics({ ...walkthrough(game), beats: [{ do: game.scene }, { do: ops }] })) {
    const op = ops[Number(is.path.split(".")[3])];
    const id = op && "id" in op ? String(op.id) : "";
    const probe = game.probes.findIndex((p) => p.show === id);
    errors.push({ path: probe >= 0 ? `probes.${probe}.show` : id in m.sim.nodes ? `sim.nodes.${id}` : "sim", message: `the sim drew a state its element rejects: ${is.message}` });
  }
  return { errors: dedupe(errors), warnings: dedupe(warnings), runs: rows };
}
// one message per path: the first seed or value that goes wrong is enough to fix it
const dedupe = (xs: Issue[]) => [...new Map(xs.map((x) => [x.path, x])).values()];

// Board snapshots for the sheet: the end of the defaults run and of every challenge with and without its solution.
export function snapshots(game: Game, m: Model): { label: string; ops: Beat["do"] }[] {
  const seed = game.sim.seed;
  const plans: Plan[] = [{ name: "defaults", sec: SANDBOX_SEC }, ...game.challenges.flatMap((c) => [challengePlan(c, `${c.id}: setup`), ...(c.solution ? [challengePlan(c, `${c.id}: solution`, c.solution)] : [])])];
  return plans.map((p) => ({ label: p.name, ops: simulate(game, m, p, seed).ops }));
}

export type Bundle = { game: Game; voices: Record<string, { file: string | null; sec: number }> };
