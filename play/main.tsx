import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { controlsOf, holds, holdsWhen, scheduler, type Bundle, type ChallengeT, type MoveT } from "../src/game.ts";
import { Live, type LiveOptions, type Said } from "../src/live.ts";
import { modelOf, type Input, type Model } from "../src/sim.ts";
import { iconFor, type Add } from "../src/spec.ts";
import { themeOf, type Palette } from "../src/themes.ts";
import { sans } from "../src/video/theme.ts";
import { Board } from "../src/video/Video.tsx";

// The playground: the live board on the left, the stage, its challenge and its levers on the right, time
// controls under the board. Stages add one lever at a time and end in the full sandbox. Our own clock drives
// the board, so it can pause, step and change speed; the sim keeps time with it.
const SPEEDS = [0.5, 1, 2];
// a higher line cuts a lower one off; a lower one only shows as a caption
const PRIORITY = { inspect: 1, note: 2, stage: 3, challenge: 4 } as const;
const CAPTION_SEC = 8; // a caption fades once it no longer describes what is on the board
const LEAD_SEC = 3; // the post-mortem replays from this long before things went wrong
const SHOW_ME_AFTER = 2; // failed tries before "Show me" plays the solution
const AFTER_SEC = 5; // the post-mortem stops this long after the breach

type Game = Bundle["game"];
type Stage = { id: string; title: string; say?: string; controls: string[] | "all"; reveal: string[]; challenge?: string };
// What the side panel is doing. `run` plays a challenge for `by` seconds; `replay` is a run that started late to show the breach.
type Mode =
  | { kind: "sandbox" }
  | { kind: "predict"; c: ChallengeT }
  | { kind: "run"; c: ChallengeT; guess?: number; ready?: boolean; replay?: { frame: number; probe?: string; pulsed: boolean }; solution?: boolean }
  | { kind: "result"; c: ChallengeT; ok: boolean; guess?: number; actual?: number; breach?: { frame: number; probe?: string } };

// Where the playground's files are: next to the exe (Tauri) or next to this page (browser).
async function locate(): Promise<(file: string) => string> {
  if (!isTauri()) return (file) => `./${file}`;
  const dir = await invoke<string>("game_dir");
  return (file) => convertFileSrc(`${dir}/${file}`);
}

const labelOf = (el: Add | undefined) => (el && "label" in el && typeof el.label === "string" ? el.label : el?.id ?? "");

// What a control is called on its button, off and on, and its icon.
function describe(control: string, game: Game): { off: string; on: string; icon: string } {
  const [id, kind] = control.split(".");
  const name = labelOf(game.scene.find((a) => a.id === id));
  if (kind === "down") return { off: `Crash ${name}`, on: `Restart ${name}`, icon: "flame" };
  if (kind === "slow") return { off: `Slow down ${name}`, on: `Speed up ${name}`, icon: "hourglass" };
  if (kind === "cut") return { off: `Cut ${name}`, on: `Reconnect ${name}`, icon: "scissors" };
  if (kind === "remove") return { off: `Take out ${name}`, on: `Put back ${name}`, icon: "unplug" };
  const node = game.sim.nodes[id];
  return { off: `Send ${node?.kind === "source" ? node.burst : ""} at once`, on: "", icon: "zap" };
}
// A scripted move, in words: what happens on its own during a challenge.
function moveText(mv: MoveT, game: Game): string {
  if ("param" in mv) return `${game.sim.params[mv.param].label}: ${mv.value}`;
  if ("remove" in mv) return describe(`${mv.remove}.remove`, game).off;
  if ("burst" in mv) return describe(`${mv.burst}.burst`, game).off;
  return `${describe(mv.fault, game).off}${mv.when ? " while it works" : ""}${mv.for ? ` for ${mv.for} s` : ""}`;
}

function Playground({ bundle, url }: { bundle: Bundle; url: (file: string) => string }) {
  const { game, voices } = bundle;
  const pal = themeOf(game.theme);
  const model = useRef<Model>(modelOf(game.sim, game.scene).model!).current;
  const all = controlsOf(model);
  const probes = game.probes.map((p) => p.show);
  const stages: Stage[] = game.stages ?? [{ id: "free", title: "Sandbox", controls: "all", reveal: [] }];
  const charts = [...new Set(game.probes.filter((p) => game.scene.find((a) => a.id === p.show)?.type === "chart").map((p) => p.show))];

  const [stage, setStage] = useState(0);
  const hideFor = (ix: number) => (!game.stages || stages[ix].controls === "all" ? [] : probes.filter((id) => !stages.slice(0, ix + 1).some((s) => s.reveal.includes(id))));
  const live = useRef(new Live(game, model, { hide: hideFor(0) }));
  const mode = useRef<Mode>({ kind: "sandbox" });
  const audio = useRef(new Audio());
  const playing = useRef(0); // priority of the line being spoken
  const running = useRef(false);
  const speed = useRef(1);
  const tries = useRef<Record<string, { fails: number; hints: number }>>({});
  const [, redraw] = useState(0);
  const [started, setStarted] = useState(false);
  const [caption, setCaption] = useState("");
  const [touched, setTouched] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLDivElement>(null);
  const l = live.current;
  const t = l.t;
  const fps = t.fps;
  const m = mode.current;
  const refresh = () => redraw((n) => n + 1);
  const setMode = (next: Mode) => { mode.current = next; refresh(); };

  const timer = useRef(0);
  const say = (s: Said | null | undefined, kind: keyof typeof PRIORITY) => {
    if (!s) return;
    setCaption(s.say);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCaption(""), CAPTION_SEC * 1000);
    const voice = voices[s.key];
    const a = audio.current;
    const busy = !a.paused && !a.ended;
    if (!voice?.file || (busy && PRIORITY[kind] <= playing.current) || (kind === "note" && speed.current > 1)) return;
    playing.current = PRIORITY[kind];
    a.src = url(`audio/${voice.file}`);
    void a.play();
  };
  const line = (key: string, text: string | undefined, kind: keyof typeof PRIORITY) => say(text ? { key, say: text } : null, kind);

  const play = (on: boolean) => {
    running.current = on;
    if (on && !audio.current.ended && audio.current.src) void audio.current.play();
    if (!on) audio.current.pause();
    refresh();
  };
  const fresh = (opts: LiveOptions) => {
    live.current = new Live(game, model, { hide: hideFor(stage), ...opts });
    refresh();
  };

  // A challenge is over: check the goal and the prediction on what this run did.
  const finish = (r: Extract<Mode, { kind: "run" }>) => {
    play(false);
    const cur = live.current;
    const values = { peak: cur.peak, end: cur.now };
    const ok = !r.c.goal || r.c.goal.every((g) => holds(g, values));
    const actual = r.c.predict?.options.findIndex((o) => holdsWhen(o.when, values));
    const stats = (tries.current[r.c.id] ??= { fails: 0, hints: 0 });
    if (!ok && !r.replay && !r.solution) stats.fails++;
    const breach = r.replay ? { frame: r.replay.frame, probe: r.replay.probe } : breachOf.current;
    setMode({ kind: "result", c: r.c, ok, guess: r.guess, actual: actual === -1 ? undefined : actual, breach });
    if (r.c.goal) line(`challenge.${r.c.id}.${ok ? "success" : "fail"}`, ok ? r.c.success : r.c.fail, "challenge");
  };
  // first frame an "at most" goal was broken, and the probe that shows it: where the post-mortem looks
  const breachOf = useRef<{ frame: number; probe?: string } | undefined>(undefined);
  const watch = () => {
    const r = mode.current;
    if (r.kind !== "run") return;
    const cur = live.current;
    const broken = r.c.goal?.find((g) => g.atMost !== undefined && (cur.now[g.metric] ?? 0) > g.atMost);
    if (broken && !breachOf.current) breachOf.current = { frame: cur.frame, probe: game.probes.find((p) => p.metric === broken.metric)?.show };
    if (r.replay && !r.replay.pulsed && cur.frame >= r.replay.frame) {
      r.replay.pulsed = true;
      if (r.replay.probe) cur.line("", { do: [{ op: "pulse", id: r.replay.probe }] });
    }
    if (cur.frame >= (r.replay ? Math.min(r.c.by * fps, r.replay.frame + AFTER_SEC * fps) : r.c.by * fps)) finish(r);
  };

  // the clock: board frames at the board's fps, scaled by speed; the sim ticks inside Live
  useEffect(() => {
    if (!started) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000; // a hidden window does not fast-forward on return
      last = now;
      if (running.current) {
        acc += dt * speed.current * fps;
        const n = Math.floor(acc);
        acc -= n;
        if (n) {
          for (const s of live.current.advance(n)) say(s, "note");
          watch();
          refresh();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / t.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [t.width]);

  const enter = (ix: number) => {
    setStage(ix);
    live.current = new Live(game, model, { hide: hideFor(ix) });
    setMode({ kind: "sandbox" });
    play(true);
    line(`stage.${stages[ix].id}`, stages[ix].say, "stage");
  };
  const challenge = (c: ChallengeT) => {
    if (c.predict) {
      play(false);
      setMode({ kind: "predict", c });
      return line(`challenge.${c.id}.predict`, c.predict.ask, "challenge");
    }
    run(c);
    line(`challenge.${c.id}.ask`, c.ask, "challenge");
  };
  // A challenge run from its setup, waiting for Run so the player sets the levers first. `extra` plays more moves
  // (the solution, which starts at once); `ghost` keeps the last run's chart.
  const run = (c: ChallengeT, more: Partial<Extract<Mode, { kind: "run" }>> = {}, ghost?: LiveOptions["ghost"], extra: MoveT[] = []) => {
    breachOf.current = undefined;
    fresh({ script: scheduler([...c.setup.script, ...extra], c.setup.params, c.setup.removed), ghost });
    const ready = !more.solution && c.controls.length > 0;
    setMode({ kind: "run", c, ready, ...more });
    play(!ready);
  };
  const go = () => {
    const r = mode.current;
    if (r.kind === "run") setMode({ ...r, ready: false });
    play(true);
  };
  const again = (c: ChallengeT) => run(c, {}, Object.fromEntries(charts.map((id) => [id, live.current.seriesOf(id)])));
  // the same run, the same inputs at the same ticks, from a few seconds before it went wrong, at half speed
  const replay = (c: ChallengeT, breach: { frame: number; probe?: string }) => {
    const log = live.current.log;
    const base = scheduler(c.setup.script, c.setup.params, c.setup.removed);
    breachOf.current = undefined;
    const next = new Live(game, model, { hide: hideFor(stage), script: (w) => [...base(w), ...log.filter((x) => x.tick === w.tick).map((x) => x.input)] });
    next.advance(Math.max(0, breach.frame - LEAD_SEC * fps));
    live.current = next;
    speed.current = 0.5;
    setMode({ kind: "run", c, replay: { ...breach, pulsed: false } });
    play(true);
  };
  const hint = (c: ChallengeT) => {
    const stats = (tries.current[c.id] ??= { fails: 0, hints: 0 });
    const h = c.hints[Math.min(stats.hints++, c.hints.length - 1)];
    if (h.pulse) live.current.line("", { do: [{ op: "pulse", id: h.pulse }] });
    line(`challenge.${c.id}.hint.${c.hints.indexOf(h)}`, h.say, "challenge");
    refresh();
  };

  const act = (input: Input) => {
    setTouched(true);
    live.current.input(input);
    if (running.current) return;
    for (const s of live.current.advance(live.current.perTick)) say(s, "note"); // paused: one tick, so the change shows
    refresh();
  };
  // Same levers and faults, from the start again (sandbox only).
  const restart = () => {
    const old = live.current;
    fresh({});
    for (const [param, value] of Object.entries(old.w.params)) live.current.input({ param, value });
    for (const fault of old.w.faults) live.current.input({ fault, on: true });
    for (const id of old.w.removed) live.current.input({ remove: id, on: true });
  };

  const st = stages[stage];
  const controls = m.kind === "run" ? (m.replay || m.solution ? [] : m.c.controls) : m.kind === "sandbox" ? (st.controls === "all" ? all : st.controls) : [];
  const target = (e: MouseEvent) => (e.target as HTMLElement).closest("[data-id]")?.getAttribute("data-id");
  const inspect = (e: MouseEvent) => {
    const id = target(e);
    if (id && game.inspect[id]) say(l.line(`inspect.${id}`, game.inspect[id]), "inspect");
  };
  // right-click a part: its crash or cut, the fault you would reach for first, if this stage offers it
  const breakIt = (e: MouseEvent) => {
    e.preventDefault();
    const id = target(e);
    const fault = controls.find((c) => c === `${id}.down` || c === `${id}.cut`);
    if (fault) act({ fault, on: !l.w.faults.includes(fault) });
  };

  const c = st.challenge ? game.challenges.find((x) => x.id === st.challenge) : undefined;
  const params = controls.filter((x) => x in game.sim.params);
  const faults = controls.filter((x) => !(x in game.sim.params));
  const on = (x: string) => (x.endsWith(".remove") ? l.w.removed.includes(x.slice(0, -7)) : l.w.faults.includes(x));
  const glow = (x: string) => !touched && stage === 0 && x === game.start.primary;
  const clickable = Object.keys(game.inspect).map((id) => `[data-id="${id}"] > *`).join(", ");
  const sec = Math.floor(l.frame / fps);
  const stats = c ? tries.current[c.id] : undefined;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", height: "100vh", background: pal.bg, color: pal.text, fontFamily: sans }}>
      <style>{`
        ${clickable || "x"} { cursor: pointer; transition: filter .2s }
        ${Object.keys(game.inspect).map((id) => `[data-id="${id}"]:hover > *`).join(", ") || "x"} { filter: brightness(1.25) drop-shadow(0 0 10px ${pal.accent}) }
        ${hover ? `[data-id="${hover}"] > * { filter: drop-shadow(0 0 12px ${pal.bad}) }` : ""}
        @keyframes primary { 50% { box-shadow: 0 0 0 4px color-mix(in srgb, ${pal.accent} 45%, transparent) } }
        input[type=range] { accent-color: ${pal.accent}; width: 100% }
      `}</style>
      <main style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16, padding: 24, minWidth: 0 }}>
        <div ref={frame} onClick={inspect} onContextMenu={breakIt} style={{ position: "relative", width: "100%", aspectRatio: `${t.width} / ${t.height}`, overflow: "hidden", borderRadius: 8 }}>
          <div style={{ width: t.width, height: t.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
            <Board t={t} frame={l.frame} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Chip pal={pal} icon={running.current ? "pause" : "play"} onClick={() => play(!running.current)}>{running.current ? "Pause" : "Play"}</Chip>
          <Chip pal={pal} icon="step-forward" onClick={() => { play(false); for (const s of l.stepToNext()) say(s, "note"); watch(); refresh(); }}>Step</Chip>
          {SPEEDS.map((s) => <Chip key={s} pal={pal} on={speed.current === s} onClick={() => { speed.current = s; refresh(); }}>{s}x</Chip>)}
          {m.kind === "sandbox" && <Chip pal={pal} icon="rotate-ccw" onClick={restart}>Restart</Chip>}
          <div style={{ marginLeft: "auto", color: pal.muted, fontVariantNumeric: "tabular-nums" }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</div>
        </div>
        <div style={{ minHeight: 64, fontSize: 22, lineHeight: 1.4, textAlign: "center" }}>{caption}</div>
      </main>
      <aside style={{ display: "flex", flexDirection: "column", gap: 10, padding: "24px 22px", overflowY: "auto", background: pal.panel }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{game.title}</div>
        {stages.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {stages.map((s, i) => <Chip key={s.id} pal={pal} on={i === stage} onClick={() => enter(i)}>{i + 1}. {s.title}</Chip>)}
          </div>
        )}
        {st.say && <div style={{ fontSize: 15, color: pal.muted }}>{st.say}</div>}

        {c && <Card pal={pal} c={c} m={m} game={game} frame={l.frame} fps={fps} stats={stats}
          onStart={() => challenge(c)}
          onGuess={(k) => { run(c, { guess: k }); line(`challenge.${c.id}.ask`, c.ask, "challenge"); }}
          onAgain={() => again(c)} onHint={() => hint(c)}
          onReplay={(b) => replay(c, b)} onShow={() => run(c, { solution: true }, undefined, c.solution)} onGo={go}
          onBack={() => enter(stage)} />}

        {params.length > 0 && <Heading pal={pal}>Levers</Heading>}
        {params.map((id) => {
          const p = game.sim.params[id];
          const value = l.w.params[id];
          return (
            <div key={id} style={{ padding: "8px 10px", borderRadius: 10, animation: glow(id) ? "primary 1.6s infinite" : undefined }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 6 }}>
                <span>{p.label}</span>
                {"min" in p && <span style={{ color: pal.accent, fontVariantNumeric: "tabular-nums" }}>{value}{p.unit ?? ""}</span>}
              </div>
              {"min" in p ? (
                <input type="range" min={p.min} max={p.max} step={p.step} value={Number(value)} onChange={(e) => act({ param: id, value: Number(e.target.value) })} />
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  {p.options.map((o) => <Chip key={o} pal={pal} on={value === o} onClick={() => act({ param: id, value: o })}>{o}</Chip>)}
                </div>
              )}
            </div>
          );
        })}
        {faults.length > 0 && <Heading pal={pal}>Break it</Heading>}
        {faults.map((x) => {
          const d = describe(x, game);
          const burst = x.endsWith(".burst");
          return (
            <div key={x} onMouseEnter={() => setHover(x.split(".")[0])} onMouseLeave={() => setHover(null)}
              style={{ borderRadius: 10, animation: glow(x) ? "primary 1.6s infinite" : undefined }}>
              <Chip pal={pal} icon={d.icon} on={!burst && on(x)} danger wide
                onClick={() => act(burst ? { burst: x.slice(0, -6) } : x.endsWith(".remove") ? { remove: x.slice(0, -7), on: !on(x) } : { fault: x, on: !on(x) })}>
                {!burst && on(x) ? d.on : d.off}
              </Chip>
            </div>
          );
        })}
        {m.kind === "sandbox" && stage < stages.length - 1 && (
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <Chip pal={pal} icon="arrow-right" wide onClick={() => enter(stage + 1)}>Next: {stages[stage + 1].title}</Chip>
          </div>
        )}
      </aside>
      {!started && (
        <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
          background: `color-mix(in srgb, ${pal.bg} 92%, transparent)` }}>
          <div style={{ fontSize: 44, fontWeight: 600 }}>{game.title}</div>
          <Chip pal={pal} icon="play" onClick={() => { setStarted(true); enter(0); }}>Start</Chip>
        </div>
      )}
    </div>
  );
}

// The stage's challenge: the ask and what will happen on its own, then predict, the run with its clock, the verdict.
function Card({ pal, c, m, game, frame, fps, stats, onStart, onGuess, onAgain, onHint, onReplay, onShow, onBack, onGo }: {
  pal: Palette; c: ChallengeT; m: Mode; game: Game; frame: number; fps: number; stats?: { fails: number; hints: number };
  onStart: () => void; onGuess: (k: number) => void; onAgain: () => void; onHint: () => void;
  onReplay: (b: { frame: number; probe?: string }) => void; onShow: () => void; onBack: () => void; onGo: () => void;
}) {
  const mine = m.kind !== "sandbox" && m.c.id === c.id ? m : null;
  const at = mine?.kind === "run" ? frame / fps / c.by : mine?.kind === "result" ? 1 : 0;
  const options = c.predict?.options ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 12, border: `2px solid ${pal.accent}`, background: `color-mix(in srgb, ${pal.accent} 6%, transparent)` }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: pal.accent }}>Challenge</div>
      <div style={{ fontSize: 17 }}>{c.ask}</div>
      {/* what happens on its own, on the run's clock */}
      <div style={{ position: "relative", height: 6, borderRadius: 3, background: pal.bg, margin: "6px 0" }}>
        <div style={{ width: `${Math.min(1, at) * 100}%`, height: "100%", borderRadius: 3, background: pal.accent }} />
        {c.setup.script.map((mv, k) => <div key={k} title={moveText(mv, game)} style={{ position: "absolute", top: -4, left: `${(mv.at / c.by) * 100}%`, width: 3, height: 14, background: pal.bad }} />)}
      </div>
      {c.setup.script.map((mv, k) => <div key={k} style={{ fontSize: 13, color: pal.muted }}>{mv.at} s: {moveText(mv, game)}</div>)}
      <div style={{ fontSize: 13, color: pal.muted }}>The run lasts {c.by} s.</div>

      {!mine && <Chip pal={pal} icon="play" wide onClick={onStart}>Start challenge</Chip>}
      {mine?.kind === "predict" && (
        <>
          <div style={{ fontSize: 15 }}>{c.predict!.ask}</div>
          {options.map((o, k) => <Chip key={k} pal={pal} wide onClick={() => onGuess(k)}>{o.say}</Chip>)}
        </>
      )}
      {mine?.kind === "run" && mine.ready && (
        <>
          <div style={{ fontSize: 14, color: pal.muted }}>{mine.guess !== undefined ? `You said: ${options[mine.guess].say}. ` : ""}Set the levers below, then run it.</div>
          <Chip pal={pal} icon="play" wide onClick={onGo}>Run</Chip>
        </>
      )}
      {mine?.kind === "run" && !mine.ready && <div style={{ fontSize: 14, color: pal.muted }}>{mine.replay ? "Replaying the moment it went wrong, at half speed." : mine.solution ? "Watch one way to do it." : mine.guess !== undefined ? `You said: ${options[mine.guess].say}. Watch.` : "Running."}</div>}
      {mine?.kind === "result" && (
        <>
          {mine.guess !== undefined && mine.actual !== undefined && (
            <div style={{ fontSize: 15 }}>
              You said <b>{options[mine.guess].say}</b>. {mine.guess === mine.actual ? "Right." : <>It was <b>{options[mine.actual].say}</b>.</>}
            </div>
          )}
          {c.goal && <div style={{ fontSize: 16, fontWeight: 600, color: mine.ok ? pal.good : pal.bad }}>{mine.ok ? (c.success ?? "Done.") : (c.fail ?? "Not yet.")}</div>}
          <Chip pal={pal} icon="rotate-ccw" wide onClick={onAgain}>Run again{game.probes.some((p) => game.scene.find((a) => a.id === p.show)?.type === "chart") ? " (last run stays on the chart)" : ""}</Chip>
          {!mine.ok && mine.breach && <Chip pal={pal} icon="rewind" wide onClick={() => onReplay(mine.breach!)}>Replay the moment it went wrong</Chip>}
          {!mine.ok && c.hints.length > 0 && <Chip pal={pal} icon="lightbulb" wide onClick={onHint}>Hint{(stats?.hints ?? 0) > 0 ? " again" : ""}</Chip>}
          {!mine.ok && c.solution && (stats?.fails ?? 0) >= SHOW_ME_AFTER && <Chip pal={pal} icon="eye" wide onClick={onShow}>Show me</Chip>}
          <Chip pal={pal} icon="arrow-left" wide onClick={onBack}>Back to the stage</Chip>
        </>
      )}
    </div>
  );
}

const Heading = ({ pal, children }: { pal: Palette; children: ReactNode }) => (
  <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: pal.muted }}>{children}</div>
);

// A button; `on` fills it, in bad for a fault that is on.
function Chip({ pal, icon, on, danger, wide, onClick, children }:
  { pal: Palette; icon?: string; on?: boolean; danger?: boolean; wide?: boolean; onClick: () => void; children: ReactNode }) {
  const Icon = icon ? iconFor(icon) : null;
  const tone = on && danger ? pal.bad : pal.accent;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: wide ? "100%" : undefined, padding: "10px 14px", borderRadius: 10, cursor: "pointer",
      border: `2px solid ${tone}`, background: `color-mix(in srgb, ${tone} ${on ? 30 : 8}%, transparent)`,
      color: pal.text, fontFamily: sans, fontSize: 15, textAlign: "left",
    }}>
      {Icon && <Icon size={18} color={tone} />}
      {children}
    </button>
  );
}

async function boot() {
  const url = await locate();
  const bundle: Bundle = await (await fetch(url("game.bundle.json"))).json();
  document.title = bundle.game.title;
  if (isTauri()) await getCurrentWindow().setTitle(bundle.game.title);
  createRoot(document.getElementById("root")!).render(<Playground bundle={bundle} url={url} />);
}

boot().catch((e: unknown) => {
  document.body.innerHTML = `<pre style="color:#f47067;padding:24px;font:16px monospace">Could not load the playground: ${(e as Error).message}</pre>`;
});
