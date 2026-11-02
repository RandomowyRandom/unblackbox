import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { GRID } from "../spec.ts";
import type { Timeline } from "../timeline.ts";
import { cameraTransform, Element, Think, Traces } from "./elements.tsx";
import { palette } from "./theme.ts";

// The whole picture at the current frame. Rendered by Remotion for videos and by the Player in playgrounds.
export function Video(t: Timeline) {
  const frame = useCurrentFrame();
  const ctx = { t, frame, unit: t.width / GRID.w };
  return (
    <AbsoluteFill style={{ background: palette.bg }}>
      {t.beats.map((b, i) => b.audio && (
        <Sequence key={i} from={b.start} durationInFrames={b.frames} layout="none">
          {/* a bare file name lives in the render's public dir; the playground passes full URLs */}
          <Audio src={b.audio.includes("/") ? b.audio : staticFile(b.audio)} />
        </Sequence>
      ))}
      <AbsoluteFill style={{ transform: cameraTransform(ctx), transformOrigin: "0 0" }}>
        {/* groups first so system boundaries sit behind their components */}
        {[...t.tracks].sort((a, b) => Number(b.el.type === "group") - Number(a.el.type === "group")).map((tr) => <Element key={tr.el.id} tr={tr} ctx={ctx} />)}
        <Traces ctx={ctx} />
      </AbsoluteFill>
      <Think ctx={ctx} />
    </AbsoluteFill>
  );
}
