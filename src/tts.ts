import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KokoroTTS } from "kokoro-js";
import type { Spec } from "./spec.ts";
import type { Voiced } from "./timeline.ts";

export type TtsProvider = {
  voices(): Promise<string[]>;
  /** Writes a WAV to outPath, returns its duration in seconds. */
  synthesize(text: string, voice: string, speed: number, outPath: string): Promise<number>;
};

let kokoro: Promise<KokoroTTS> | undefined;
// Lazy: loading pulls onnxruntime and downloads the model (~330MB) on first use.
// fp32, not q8: on CPU it synthesized 70s of speech in 10s vs 50s for q8.
const getKokoro = () =>
  (kokoro ??= import("kokoro-js").then(({ KokoroTTS }) =>
    KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" })));

// Paid providers (ElevenLabs, OpenAI, ...) go here, keyed by name, API key from env.
export const providers: Record<string, TtsProvider> = {
  kokoro: {
    voices: async () => Object.keys((await getKokoro()).voices),
    async synthesize(text, voice, speed, outPath) {
      const audio = await (await getKokoro()).generate(text, { voice: voice as never, speed });
      await audio.save(outPath);
      return audio.audio.length / audio.sampling_rate;
    },
  },
};

// Error message for a provider name nobody implements, or null if it exists.
export const unknownProvider = (name: string) =>
  name === "silent" || providers[name] ? null : `unknown tts provider '${name}'; known: silent, ${Object.keys(providers).join(", ")}`;

// silent: no audio, duration from ~144 words per minute, the middle of Kokoro's measured pace on
// four real videos (it varies about ±8% with the text). For drafts, stills, estimates and tests.
export const silentVoices = (spec: Spec): Voiced[] =>
  spec.beats.map((b) => ({ file: null, sec: (b.say ?? "").split(/\s+/).filter(Boolean).length / 2.4 / spec.voice.speed }));

export async function voiceBeats(spec: Spec, cacheDir: string, log: (m: string) => void): Promise<Voiced[]> {
  const { provider: name, voice, speed } = spec.voice;
  if (name === "silent") return silentVoices(spec);
  const provider = providers[name];
  if (!provider) throw new Error(unknownProvider(name)!);

  await mkdir(cacheDir, { recursive: true });
  const out: Voiced[] = [];
  for (const [i, { say }] of spec.beats.entries()) {
    if (!say) {
      out.push({ file: null, sec: 0 });
      continue;
    }
    const key = createHash("sha256").update(JSON.stringify([name, voice, speed, say])).digest("hex").slice(0, 32);
    const meta = path.join(cacheDir, `${key}.json`);
    const wav = path.join(cacheDir, `${key}.wav`);
    // A hit needs both files: a deleted wav with its json left behind must be re-synthesized.
    let sec = await access(wav).then(() => readFile(meta, "utf8")).then((s) => JSON.parse(s).sec as number, () => null);
    if (sec === null) {
      log(`tts ${name}: beat ${i + 1}/${spec.beats.length}`);
      sec = await provider.synthesize(say, voice, speed, wav);
      await writeFile(meta, JSON.stringify({ sec })); // written after the wav, so a crash never leaves a bad cache hit
    }
    out.push({ file: `${key}.wav`, sec });
  }
  return out;
}
