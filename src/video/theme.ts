import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;

// Colors come from the spec's theme (src/themes.ts) through ctx.pal.
export const SPRING = { damping: 200 }; // no bounce, calm settle
export const DIM = 0.25;
export const FADE_OUT = 12; // frames
