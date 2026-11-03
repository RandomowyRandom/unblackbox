import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { GRID } from "../spec.ts";
import type { Timeline } from "../timeline.ts";
import { cameraTransform, Chapter, Element, Think, Traces } from "./elements.tsx";

// The whole picture at one frame, as a pure function of the timeline: videos drive it with Remotion's clock,
// playgrounds with their own.
export function Board({ t, frame }: { t: Timeline; frame: number }) {
  const ctx = { t, frame, unit: t.width / GRID.w, pal: t.pal };
  return (
    <AbsoluteFill style={{ background: t.pal.bg }}>
      <AbsoluteFill style={{ transform: cameraTransform(ctx), transformOrigin: "0 0" }}>
        {/* groups first so system boundaries sit behind their components; free-drawn annotations last, on top */}
        {[...t.tracks].sort((a, b) => layer(a.el.type) - layer(b.el.type)).map((tr) => <Element key={`${tr.el.id}@${tr.start}`} tr={tr} ctx={ctx} />)}
        <Traces ctx={ctx} />
      </AbsoluteFill>
      <Chapter ctx={ctx} />
      <Think ctx={ctx} />
    </AbsoluteFill>
  );
}

// A video: the board at Remotion's frame, plus each beat's narration.
export function Video(t: Timeline) {
  const frame = useCurrentFrame();
  return (
    <>
      {t.beats.map((b, i) => b.audio && (
        <Sequence key={i} from={b.start} durationInFrames={b.frames} layout="none">
          <Audio src={staticFile(b.audio)} />
        </Sequence>
      ))}
      <Board t={t} frame={frame} />
    </>
  );
}

const ON_TOP = new Set(["callout", "brace", "badge", "bubble"]);
const layer = (type: string) => (type === "group" ? 0 : ON_TOP.has(type) ? 2 : 1);
