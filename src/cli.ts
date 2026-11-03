#!/usr/bin/env node
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { access, copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { highlight } from "codehike/code";
import { z } from "zod";
import { DEFS, defOf } from "./components/index.ts";
import { gallery } from "./gallery.ts";
import { Game, linesOf, parseGame, snapshots, toGamePaths, verify, walkthrough, type Bundle } from "./game.ts";
import { lint, parseSpec, Spec, Theme, type Issue } from "./spec.ts";
import { CODE_THEME } from "./themes.ts";
import { buildTimeline, settledFrame, timing, toSrt, type Timeline } from "./timeline.ts";
import { providers, silentVoices, unknownProvider, voiceBeats } from "./tts.ts";

const USAGE = `unblackbox <command> [spec.json] [options]

  guide                     print the tool reference + the rules the video must meet (read this first)
  schema                    print the spec JSON Schema
  validate <spec>           check a spec: errors block, warnings advise (both with paths), estimated length
  still <spec>              one contact sheet PNG: every beat once it settles, labelled with its index
        [--beat B]          full-size PNG per beat instead; B = 0-based index like beats.B, "1,4,7" or all
        [--at S]            S seconds after each beat starts instead of the settled frame
  render <spec>             render MP4 + SRT captions
        [--beat B]          only beats B, as one clip from the first to the last (no SRT)
        [--out x.gif]       a silent half-size 15 fps GIF instead, e.g. a README preview of --beat 5,6
  game <topic.game.json>    build a playground folder (voice, player exe, web build, sheet.png)
        [--check]           only check it: plays every lever, fault and challenge headless on 4 seeds and prints a run table
  play <folder>             open a built playground
  voices [--tts name]       list voices of a TTS provider
  schema game               print the playground JSON Schema
  components                list every element type with the concept it shows
  components <type>         its fields, what \`set\` can change, and an example
  components --sheet        contact sheet of every example (added, then set); [--family F]

  --out <path>              render: video file; still and game: folder (default out/)
  --tts <name>              override spec.voice.provider (silent, ${Object.keys(providers).join(", ")})
  --theme <preset[/accent]> override spec.theme, e.g. light or contrast/teal

stdout is JSON, progress goes to stderr, exit 1 on failure.`;

const root = path.dirname(fileURLToPath(import.meta.url));
const GUIDE = [path.join(root, "..", "AGENTS.md"), path.join(root, "..", "skills", "unblackbox", "references", "rules.md")];
const cacheDir = path.join(root, "..", ".unblackbox", "cache"); // next to the tool, not the cwd, so the cache is always found
const print = (o: unknown) => console.log(JSON.stringify(o, null, 2));
const log = (m: string) => console.error(m);

class SpecError extends Error {
  issues: Issue[];
  constructor(issues: Issue[]) {
    super("invalid spec");
    this.issues = issues;
  }
}

async function readJson(file: string | undefined): Promise<unknown> {
  if (!file) throw new Error("missing file argument");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    throw new SpecError([{ path: "", message: `cannot read JSON: ${(e as Error).message}` }]);
  }
}

// --tts and --theme overrides, then fail early on a provider nobody implements.
function pickVoice<T extends { voice: { provider: string }; theme: Theme }>(doc: T, tts: string | undefined, theme?: string): T {
  if (tts) doc.voice.provider = tts;
  if (theme) {
    const [preset, accent] = theme.split("/");
    const r = Theme.safeParse({ preset, accent: accent ?? doc.theme.accent });
    if (!r.success) throw new Error(`--theme takes dim, light or contrast, optionally /blue, /violet, /teal or /amber`);
    doc.theme = r.data;
  }
  const bad = unknownProvider(doc.voice.provider);
  if (bad) throw new SpecError([{ path: "voice.provider", message: bad }]);
  return doc;
}

// --beat for still and render: 0-based indexes like beats.N in warnings, a comma list, or all (the default).
function beatList(spec: Spec, arg: string | undefined): number[] {
  const n = spec.beats.length;
  const beats = !arg || arg === "all" ? [...spec.beats.keys()] : arg.split(",").map(Number);
  if (beats.some((b) => !Number.isInteger(b) || b < 0 || b >= n)) throw new Error(`--beat takes 0..${n - 1} (same index as beats.N in warnings), a comma list, or all`);
  return beats;
}

async function load(file: string | undefined, tts: string | undefined, theme?: string): Promise<Spec> {
  const { spec, issues } = parseSpec(await readJson(file));
  if (!spec) throw new SpecError(issues);
  return pickVoice(spec, tts, theme);
}


const exists = (p: string) => access(p).then(() => true, () => false);
const PLAY = path.join(root, "..", "play");
const BOARD_MAX = 9; // named elements on a playground board: the sandbox stage shows everything, like an expert scene
const EXE = process.platform === "win32" ? ".exe" : ""; // the player is a plain binary on macOS and Linux
const PLAYER_EXE = path.join(PLAY, "src-tauri", "target", "release", `unblackbox-play${EXE}`);

// A playground folder: game.bundle.json + voice + the web build + the player exe. Double-click the exe to play.
async function checkGame(file: string | undefined) {
  const { game, model, issues } = parseGame(await readJson(file));
  if (!game) throw new SpecError(issues);
  const { errors, warnings, runs } = verify(game, model);
  if (errors.length) throw Object.assign(new SpecError(errors), { runs });
  return { game, model, warnings: [...toGamePaths(game, lint(walkthrough(game), 0, BOARD_MAX)), ...warnings], runs };
}

async function buildGame(file: string | undefined, out: string | undefined, tts: string | undefined) {
  const { game, model, warnings } = await checkGame(file);
  pickVoice(game, tts);
  const spec = walkthrough(game);
  const voiced = await voiceBeats(spec, cacheDir, log);
  const name = path.parse(file!).name.replace(/\.game$/, "");
  const dir = path.resolve(out ?? path.join("out", `${name}-play`));
  await mkdir(path.join(dir, "audio"), { recursive: true });

  const voices: Bundle["voices"] = {};
  for (const [i, { key }] of linesOf(game).entries()) {
    const v = voiced[i + 1]; // beat 0 is the board
    if (v.file) await copyFile(path.join(cacheDir, v.file), path.join(dir, "audio", v.file));
    voices[key] = v;
  }
  await writeFile(path.join(dir, "game.bundle.json"), JSON.stringify({ game, voices } satisfies Bundle));

  const missing: string[] = [];
  if (await exists(path.join(PLAY, "dist"))) {
    await rm(path.join(dir, "assets"), { recursive: true, force: true }); // a rebuild leaves the old bundle behind otherwise
    await cp(path.join(PLAY, "dist"), dir, { recursive: true });
  }
  else missing.push("web build");
  const exe = path.join(dir, `${name}${EXE}`);
  if (await exists(PLAYER_EXE)) await copyFile(PLAYER_EXE, exe);
  else missing.push("player exe");

  // the board at rest, then as the sim leaves it after the defaults run and each challenge
  const shots = snapshots(game, model);
  const board = { ...spec, beats: [spec.beats[0], ...shots.map((s) => ({ do: s.ops }))] };
  const t = buildTimeline(board, board.beats.map(() => ({ file: null, sec: 0 })));
  const sheet = path.join(dir, "sheet.png");
  await renderStill({ ...(await select(await serve(), "sheet", { t, frames: t.beats.map((_, b) => settledFrame(t, b)), labels: ["board", ...shots.map((s) => s.label)] })), output: sheet, frame: 0 });
  if (missing.length) warnings.push({ path: "", message: `${missing.join(" and ")} not built yet: run the unblackbox setup once with playgrounds (\`node scripts/setup.mjs --playground\`, needs Rust)` });
  // ponytail: remove once play/main.tsx runs the sim (playground phase 2)
  warnings.push({ path: "", message: "this player build shows the board and inspect lines only; levers, stages and challenges play once the live board lands. `--check` and sheet.png already run the sim" });
  return { ok: true, out: dir, exe: missing.length ? null : exe, sheet, warnings };
}

async function prepare(spec: Spec): Promise<Timeline> {
  const t = buildTimeline(spec, await voiceBeats(spec, cacheDir, log));
  for (const tr of t.tracks) {
    if (tr.el.type !== "code") continue;
    const lang = tr.el.lang;
    const theme = CODE_THEME[spec.theme.preset];
    tr.highlighted = await Promise.all([tr.el.code, ...tr.morphs.map((m) => m.code)].map((value) => highlight({ value, lang, meta: "" }, theme)));
  }
  return t;
}

async function serve() {
  await mkdir(cacheDir, { recursive: true });
  log("bundling...");
  const dir = await bundle({ entryPoint: path.join(root, "video", "index.tsx"), publicDir: cacheDir });
  // every bundle copies the whole voice cache into the OS temp folder; without this, gigabytes pile up
  process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Everything renderStill/renderMedia need for one composition of the bundle.
const select = async (serveUrl: string, id: "main" | "sheet", inputProps: Record<string, unknown>) =>
  ({ serveUrl, inputProps, composition: await selectComposition({ serveUrl, id, inputProps }) });

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string" }, beat: { type: "string" }, at: { type: "string" }, tts: { type: "string" }, theme: { type: "string" },
      sheet: { type: "boolean" }, check: { type: "boolean" }, family: { type: "string" }, help: { type: "boolean", short: "h" },
    },
  });
  const [cmd, file] = positionals;

  if (cmd === "guide") return console.log((await Promise.all(GUIDE.map((f) => readFile(f, "utf8")))).join("\n\n"));
  if (cmd === "schema") return print(z.toJSONSchema(file === "game" ? Game : Spec, { io: "input" }));
  if (cmd === "game" && values.check) {
    const { warnings, runs } = await checkGame(file);
    return print({ ok: true, warnings, runs });
  }
  if (cmd === "game") return print(await buildGame(file, values.out, values.tts));
  if (cmd === "components" && values.sheet) {
    // through parseSpec like any spec, so the gallery also proves every example is valid
    const raw = gallery(values.family);
    const { spec, issues } = parseSpec(raw);
    if (!spec) throw new SpecError(issues);
    pickVoice(spec, "silent", values.theme);
    const t = await prepare(spec);
    const dir = path.resolve(values.out ?? "out");
    await mkdir(dir, { recursive: true });
    const name = `components${values.family ? `-${values.family}` : ""}${values.theme ? `-${values.theme.replace("/", "-")}` : ""}`;
    const json = path.join(dir, `${name}.json`); // a normal spec: \`still\` it with --beat N or --at S for a closer look
    await writeFile(json, JSON.stringify({ ...raw, theme: spec.theme }, null, 2));
    const output = path.join(dir, `${name}-sheet.png`);
    await renderStill({ ...(await select(await serve(), "sheet", { t, frames: t.beats.map((_, b) => settledFrame(t, b)), labels: spec.beats.map((b, i) => `${i} ${b.chapter}`) })), output, frame: 0 });
    return print({ ok: true, out: [output], spec: json, warnings: lint(spec, 0, 99) });
  }
  if (cmd === "components") {
    if (!file) return print(DEFS.map((d) => ({ type: d.type, family: d.family, summary: d.summary, set: d.state ?? [] })));
    const d = defOf(file);
    return print({ type: d.type, family: d.family, summary: d.summary, fields: z.toJSONSchema(d.schema, { io: "input" }), set: z.toJSONSchema(d.setSchema, { io: "input" }), example: d.example });
  }
  if (cmd === "play") {
    const dir = path.resolve(file ?? ".");
    const exe = (await readdir(dir, { withFileTypes: true })).find((e) => e.isFile() && path.extname(e.name) === EXE)?.name;
    if (!exe) throw new Error(`no player exe in ${dir}; run \`unblackbox game <topic>.game.json\` first`);
    spawn(path.join(dir, exe), [], { detached: true, stdio: "ignore" }).unref();
    return print({ ok: true, exe: path.join(dir, exe) });
  }
  if (cmd === "voices") {
    const name = values.tts ?? "kokoro";
    if (name === "silent") return print({ provider: name, voices: [] });
    if (unknownProvider(name)) throw new Error(unknownProvider(name)!);
    return print({ provider: name, voices: await providers[name].voices() });
  }
  if (cmd === "validate") {
    const spec = await load(file, values.tts, values.theme);
    const t = buildTimeline(spec, silentVoices(spec));
    const estimatedSec = Math.round(t.totalFrames / t.fps);
    return print({ ok: true, beats: spec.beats.length, estimatedSec, warnings: lint(spec, estimatedSec) });
  }
  if (cmd === "still") {
    const spec = await load(file, values.tts, values.theme);
    const beats = beatList(spec, values.beat);
    const at = values.at === undefined ? null : Number(values.at);
    if (at !== null && !(at >= 0)) throw new Error("--at must be seconds >= 0 from the beat start");
    const t = await prepare(spec);
    const dir = path.resolve(values.out ?? "out");
    await mkdir(dir, { recursive: true });
    const serveUrl = await serve();
    const frameOf = (b: number) => (at === null ? settledFrame(t, b) : Math.min(t.beats[b].start + Math.round(at * t.fps), t.beats[b].start + t.beats[b].frames - 1));
    const name = `${path.parse(file).name}${at === null ? "" : `-at${at}`}`;
    if (!values.beat) {
      // One labelled grid of every beat: a single image to review instead of one per beat.
      const output = path.join(dir, `${name}-sheet.png`);
      await renderStill({ ...(await select(serveUrl, "sheet", { t, frames: beats.map(frameOf) })), output, frame: 0 });
      return print({ ok: true, out: [output], timing: timing(t) });
    }
    const main = await select(serveUrl, "main", t);
    const browser = await openBrowser("chrome");
    const out: string[] = [];
    try {
      for (const b of beats) {
        const output = path.join(dir, `${name}-beat${b}.png`);
        await renderStill({ ...main, output, frame: frameOf(b), puppeteerInstance: browser });
        out.push(output);
      }
    } finally {
      await browser.close({ silent: true });
    }
    return print({ ok: true, out, timing: timing(t) });
  }
  if (cmd === "render") {
    const spec = await load(file, values.tts, values.theme);
    const t = await prepare(spec);
    let out = path.resolve(values.out ?? path.join("out", `${path.parse(file).name}.mp4`));
    if (!path.extname(out)) out += ".mp4"; // the h264 encoder refuses a path without a container extension
    const gif = path.extname(out) === ".gif";
    const beats = beatList(spec, values.beat);
    const [first, last] = [t.beats[Math.min(...beats)], t.beats[Math.max(...beats)]];
    const srt = values.beat || gif ? null : out.replace(/\.[^.]+$/, ".srt");
    await mkdir(path.dirname(out), { recursive: true });
    let shown = -1;
    await renderMedia({
      ...(await select(await serve(), "main", t)),
      codec: gif ? "gif" : "h264",
      ...(gif && { scale: 0.5, everyNthFrame: 2 }),
      frameRange: [first.start, last.start + last.frames - 1],
      outputLocation: out,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 10) * 10;
        if (pct > shown) log(`render ${(shown = pct)}%`);
      },
    });
    if (srt) await writeFile(srt, toSrt(t));
    const durationSec = (last.start + last.frames - first.start) / t.fps;
    return print({ ok: true, out, srt, durationSec, sources: spec.sources, timing: timing(t), warnings: lint(spec, durationSec) });
  }
  log(USAGE);
  process.exitCode = values.help ? 0 : 1;
}

main().catch((e: unknown) => {
  print(e instanceof SpecError ? { ok: false, errors: e.issues, ...("runs" in e ? { runs: e.runs } : {}) } : { ok: false, error: (e as Error).message });
  process.exitCode = 1;
});
