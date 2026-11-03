import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { controlsOf, type Bundle } from "../src/game.ts";
import { Live, type Said } from "../src/live.ts";
import { modelOf, type Model } from "../src/sim.ts";
import { iconFor, type Add } from "../src/spec.ts";
import { themeOf, type Palette } from "../src/themes.ts";
import { sans } from "../src/video/theme.ts";
import { Board } from "../src/video/Video.tsx";

// The playground: the live board on the left, levers and faults on the right, time controls under the board.
// Our own clock drives the board, so it can pause, step and change speed; the sim keeps time with it.
const SPEEDS = [0.5, 1, 2];
const PRIORITY = { inspect: 1, note: 2 } as const; // a higher line cuts a lower one off; a lower one waits as a caption only
const CAPTION_SEC = 8; // a caption fades once it no longer describes what is on the board

// Where the playground's files are: next to the exe (Tauri) or next to this page (browser).
async function locate(): Promise<(file: string) => string> {
  if (!isTauri()) return (file) => `./${file}`;
  const dir = await invoke<string>("game_dir");
  return (file) => convertFileSrc(`${dir}/${file}`);
}

const labelOf = (el: Add | undefined) => (el && "label" in el && typeof el.label === "string" ? el.label : el?.id ?? "");

// What a control is called on its button, off and on, and its icon.
function describe(control: string, game: Bundle["game"]): { off: string; on: string; icon: string } {
  const [id, kind] = control.split(".");
  const name = labelOf(game.scene.find((a) => a.id === id));
  if (kind === "down") return { off: `Crash ${name}`, on: `Restart ${name}`, icon: "flame" };
  if (kind === "slow") return { off: `Slow down ${name}`, on: `Speed up ${name}`, icon: "hourglass" };
  if (kind === "cut") return { off: `Cut ${name}`, on: `Reconnect ${name}`, icon: "scissors" };
  if (kind === "remove") return { off: `Take out ${name}`, on: `Put back ${name}`, icon: "unplug" };
  const node = game.sim.nodes[id];
  return { off: `Send ${node.kind === "source" ? node.burst : ""} at once`, on: "", icon: "zap" };
}

function Playground({ bundle, url }: { bundle: Bundle; url: (file: string) => string }) {
  const { game, voices } = bundle;
  const pal = themeOf(game.theme);
  const model = useRef<Model>(modelOf(game.sim, game.scene).model!).current;
  const live = useRef(new Live(game, model));
  const audio = useRef(new Audio());
  const playing = useRef(0); // priority of the line being spoken
  const running = useRef(false);
  const speed = useRef(1);
  const [, setFrame] = useState(0);
  const [started, setStarted] = useState(false);
  const [caption, setCaption] = useState("");
  const [touched, setTouched] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLDivElement>(null);
  const l = live.current;
  const t = l.t;

  const said = useRef(0);
  const say = (s: Said | null, kind: keyof typeof PRIORITY) => {
    if (!s) return;
    setCaption(s.say);
    clearTimeout(said.current);
    said.current = window.setTimeout(() => setCaption(""), CAPTION_SEC * 1000);
    const voice = voices[s.key];
    const a = audio.current;
    const busy = !a.paused && !a.ended;
    if (!voice?.file || (busy && PRIORITY[kind] <= playing.current) || (kind === "note" && speed.current > 1)) return;
    playing.current = PRIORITY[kind];
    a.src = url(`audio/${voice.file}`);
    void a.play();
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
        acc += dt * speed.current * t.fps;
        const n = Math.floor(acc);
        acc -= n;
        if (n) {
          for (const s of live.current.advance(n)) say(s, "note");
          setFrame(live.current.frame);
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

  const act = (input: Parameters<Live["input"]>[0]) => {
    setTouched(true);
    live.current.input(input);
    if (running.current) return;
    for (const s of live.current.advance(live.current.perTick)) say(s, "note"); // paused: one tick, so the change shows
    setFrame(live.current.frame);
  };
  const play = (on: boolean) => {
    running.current = on;
    if (on && !audio.current.ended && audio.current.src) void audio.current.play();
    if (!on) audio.current.pause();
    setFrame(l.frame);
  };
  // Same levers and faults, from the start again.
  const restart = () => {
    const old = live.current;
    const next = new Live(game, model);
    for (const [param, value] of Object.entries(old.w.params)) next.input({ param, value });
    for (const fault of old.w.faults) next.input({ fault, on: true });
    for (const id of old.w.removed) next.input({ remove: id, on: true });
    live.current = next;
    setFrame(0);
  };

  const target = (e: MouseEvent) => (e.target as HTMLElement).closest("[data-id]")?.getAttribute("data-id");
  const inspect = (e: MouseEvent) => {
    const id = target(e);
    if (id && game.inspect[id]) say(l.line(`inspect.${id}`, game.inspect[id]), "inspect");
  };
  // right-click a part: its crash or cut, the fault you would reach for first
  const breakIt = (e: MouseEvent) => {
    e.preventDefault();
    const id = target(e);
    const fault = controls.find((c) => c === `${id}.down` || c === `${id}.cut`);
    if (fault) act({ fault, on: !l.w.faults.includes(fault) });
  };

  const controls = controlsOf(model);
  const params = controls.filter((c) => c in game.sim.params);
  const faults = controls.filter((c) => !(c in game.sim.params));
  const on = (c: string) => (c.endsWith(".remove") ? l.w.removed.includes(c.slice(0, -7)) : l.w.faults.includes(c));
  const glow = (c: string) => !touched && c === game.start.primary;
  const clickable = Object.keys(game.inspect).map((id) => `[data-id="${id}"] > *`).join(", ");
  const sec = Math.floor(l.frame / t.fps);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", height: "100vh", background: pal.bg, color: pal.text, fontFamily: sans }}>
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
          <Chip pal={pal} icon="step-forward" onClick={() => { play(false); for (const s of l.stepToNext()) say(s, "note"); setFrame(l.frame); }}>Step</Chip>
          {SPEEDS.map((s) => <Chip key={s} pal={pal} on={speed.current === s} onClick={() => { speed.current = s; setFrame(l.frame); }}>{s}x</Chip>)}
          <Chip pal={pal} icon="rotate-ccw" onClick={restart}>Restart</Chip>
          <div style={{ marginLeft: "auto", color: pal.muted, fontVariantNumeric: "tabular-nums" }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</div>
        </div>
        <div style={{ minHeight: 64, fontSize: 22, lineHeight: 1.4, textAlign: "center" }}>{caption}</div>
      </main>
      <aside style={{ display: "flex", flexDirection: "column", gap: 10, padding: "28px 22px", overflowY: "auto", background: pal.panel }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>{game.title}</div>
        <div style={{ fontSize: 15, color: pal.muted }}>Pull a lever or break something and watch what the system does. Click a part to hear what it does; right-click to break it.</div>
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
        {faults.map((c) => {
          const d = describe(c, game);
          const burst = c.endsWith(".burst");
          return (
            <div key={c} onMouseEnter={() => setHover(c.split(".")[0])} onMouseLeave={() => setHover(null)}
              style={{ borderRadius: 10, animation: glow(c) ? "primary 1.6s infinite" : undefined }}>
              <Chip pal={pal} icon={d.icon} on={!burst && on(c)} danger wide
                onClick={() => act(burst ? { burst: c.slice(0, -6) } : c.endsWith(".remove") ? { remove: c.slice(0, -7), on: !on(c) } : { fault: c, on: !on(c) })}>
                {!burst && on(c) ? d.on : d.off}
              </Chip>
            </div>
          );
        })}
      </aside>
      {!started && (
        <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
          background: `color-mix(in srgb, ${pal.bg} 92%, transparent)` }}>
          <div style={{ fontSize: 44, fontWeight: 600 }}>{game.title}</div>
          <Chip pal={pal} icon="play" onClick={() => { setStarted(true); play(true); }}>Start</Chip>
        </div>
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
