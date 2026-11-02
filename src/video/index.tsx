import { AbsoluteFill, Composition, Freeze, registerRoot } from "remotion";
import type { Timeline } from "../timeline.ts";
import { sans } from "./theme.ts";
import { Video } from "./Video.tsx";

// Contact sheet: the whole video frozen at one frame per beat, in a labelled grid.
type SheetProps = { t: Timeline; frames: number[]; labels?: string[] }; // labels default to beat indexes
const sheetCols = (n: number) => (n <= 4 ? 2 : n <= 9 ? 3 : 4);

function Sheet({ t, frames, labels }: SheetProps) {
  const scale = 1 / sheetCols(frames.length);
  return (
    <AbsoluteFill style={{ background: "#000", flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
      {frames.map((f, i) => (
        <div key={i} style={{ width: t.width * scale, height: t.height * scale, position: "relative", overflow: "hidden", boxShadow: "inset 0 0 0 1px #444" }}>
          <div style={{ width: t.width, height: t.height, transform: `scale(${scale})`, transformOrigin: "0 0", position: "relative" }}>
            <Freeze frame={f}>
              <Video {...t} />
            </Freeze>
          </div>
          <div style={{ position: "absolute", left: 6, top: 4, padding: "2px 8px", background: "#000c", color: "#fff", fontFamily: sans, fontSize: 20 }}>{labels?.[i] ?? i}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
}

const empty: Timeline = { fps: 30, width: 1920, height: 1080, totalFrames: 1, beats: [], tracks: [], focus: [], camera: [], traces: [] };

registerRoot(() => (
  <>
    <Composition
      id="main"
      component={Video}
      defaultProps={empty}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={({ props }) => ({ durationInFrames: props.totalFrames, fps: props.fps, width: props.width, height: props.height })}
    />
    <Composition
      id="sheet"
      component={Sheet}
      defaultProps={{ t: empty, frames: [0] } as SheetProps}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      calculateMetadata={({ props }) => {
        const cols = sheetCols(props.frames.length);
        const rows = Math.ceil(props.frames.length / cols);
        // Remotion clamps every frame to the composition length, so Freeze needs the full video length.
        return { width: props.t.width, height: Math.ceil((rows * props.t.height) / cols / 2) * 2, durationInFrames: props.t.totalFrames };
      }}
    />
  </>
));
