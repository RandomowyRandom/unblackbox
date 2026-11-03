import { Player, type CallbackListener, type PlayerRef } from "@remotion/player";
import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createRoot } from "react-dom/client";
import { walkthrough, type Bundle, type Line } from "../src/game.ts";
import type { Beat } from "../src/spec.ts";
import { buildTimeline, type Voiced } from "../src/timeline.ts";
import { themeOf, type Palette } from "../src/themes.ts";
import { sans } from "../src/video/theme.ts";
import { Video } from "../src/video/Video.tsx";

const HOUR = 30 * 60 * 60; // the board keeps running; lines are appended as the player acts

// ponytail: interim player for the v2 format: the board plus inspect lines; the live sim board replaces this.
// Grows the live beat list: an idle gap (so the line starts when the player acted), then the line itself.
function appendLine(live: { beats: Beat[]; voiced: Voiced[] }, line: Line, voice: Voiced, gapSec: number) {
  const gap = gapSec > 0.05 ? [{ beat: { hold: gapSec, do: [] }, voice: { file: null, sec: 0 } }] : [];
  const added = [...gap, { beat: { say: line.say, do: line.do }, voice }];
  return { beats: [...live.beats, ...added.map((a) => a.beat)], voiced: [...live.voiced, ...added.map((a) => a.voice)] };
}

// Where the playground's files are: next to the exe (Tauri) or next to this page (browser).
async function locate(): Promise<(file: string) => string> {
  if (!isTauri()) return (file) => `./${file}`;
  const dir = await invoke<string>("game_dir");
  return (file) => convertFileSrc(`${dir}/${file}`);
}

const button = (enabled: boolean, palette: Palette): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 10, border: `2px solid ${palette.accent}`,
  background: `color-mix(in srgb, ${palette.accent} 12%, transparent)`, color: palette.text, fontFamily: sans, fontSize: 17,
  cursor: enabled ? "pointer" : "default", opacity: enabled ? 1 : 0.45, transition: "opacity .2s", textAlign: "left",
});

function Playground({ bundle, url }: { bundle: Bundle; url: (file: string) => string }) {
  const { game, voices } = bundle;
  const palette = themeOf(game.theme);
  const player = useRef<PlayerRef>(null);
  const spec = useMemo(() => walkthrough(game), [game]);
  const [live, setLive] = useState(() => ({ beats: [spec.beats[0]], voiced: [{ file: null, sec: 0 }] as Voiced[] }));
  const [caption, setCaption] = useState("");
  const [frame, setFrame] = useState(0);
  const [started, setStarted] = useState(false);

  const t = useMemo(
    () => buildTimeline({ ...spec, beats: live.beats }, live.voiced.map((v) => (v.file ? { ...v, file: url(`audio/${v.file}`) } : v))),
    [spec, live, url],
  );
  const last = t.beats[t.beats.length - 1];
  const end = last.start + last.frames;
  const busy = frame < end;

  useEffect(() => {
    const p = player.current;
    const onFrame: CallbackListener<"frameupdate"> = (e) => setFrame(e.detail.frame);
    p?.addEventListener("frameupdate", onFrame);
    return () => p?.removeEventListener("frameupdate", onFrame);
  }, [started]);

  // Queue a line where the player is now: the gap since the last line becomes an idle hold.
  const run = (key: string, line: Line) => {
    const now = player.current?.getCurrentFrame() ?? 0;
    setLive((l) => appendLine(l, line, voices[key], Math.max(0, now - end) / t.fps));
    setCaption(line.say ?? "");
  };

  const start = () => {
    setStarted(true);
    player.current?.play();
    const first = game.stages?.[0];
    if (first?.say) run(`stage.${first.id}`, { say: first.say, do: [] });
  };

  const inspect = (e: MouseEvent) => {
    const id = (e.target as HTMLElement).closest("[data-id]")?.getAttribute("data-id");
    if (!busy && id && game.inspect[id]) run(`inspect.${id}`, game.inspect[id]);
  };

  const clickable = Object.keys(game.inspect).map((id) => `[data-id="${id}"] > *`).join(", ");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", height: "100vh", background: palette.bg, color: palette.text, fontFamily: sans }}>
      <style>{`${clickable} { cursor: pointer; transition: filter .2s } ${Object.keys(game.inspect).map((id) => `[data-id="${id}"]:hover > *`).join(", ")} { filter: brightness(1.3) drop-shadow(0 0 10px ${palette.accent}) }`}</style>
      <main style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, padding: 24, minWidth: 0 }}>
        <div onClick={inspect}>
          <Player ref={player} component={Video} inputProps={t} durationInFrames={HOUR} fps={t.fps} compositionWidth={t.width} compositionHeight={t.height}
            style={{ width: "100%" }} controls={false} clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false}
            numberOfSharedAudioTags={4} acknowledgeRemotionLicense />
        </div>
        <div style={{ minHeight: 64, fontSize: 22, lineHeight: 1.4, textAlign: "center", color: busy ? palette.text : palette.muted, transition: "color .4s" }}>{caption}</div>
      </main>
      <aside style={{ display: "flex", flexDirection: "column", gap: 12, padding: "32px 24px", borderLeft: `1px solid ${palette.panel}`, background: palette.panel }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>{game.title}</div>
        <div style={{ fontSize: 15, color: palette.muted, marginBottom: 12 }}>Click any part of the system.</div>
      </aside>
      {!started && (
        <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28,
          background: `color-mix(in srgb, ${palette.bg} 92%, transparent)` }}>
          <div style={{ fontSize: 44, fontWeight: 600 }}>{game.title}</div>
          <button style={{ ...button(true, palette), fontSize: 22, padding: "16px 40px" }} onClick={start}>Start</button>
        </div>
      )}
    </div>
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
