import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import type { Color } from "../spec.ts";

export const mono = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const sans = loadSans("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily;

// Matches the github-dark-dimmed code theme the CLI highlights with.
// Every text color clears WCAG 4.5:1 on both bg and panel.
export const palette: Record<Color | "bg" | "panel" | "text", string> = {
  bg: "#1c2128",
  panel: "#22272e",
  text: "#cdd9e5",
  muted: "#8b98a5",
  accent: "#539bf5",
  good: "#57ab5a",
  bad: "#f47067",
};

export const SPRING = { damping: 200 }; // no bounce, calm settle
export const DIM = 0.25;
export const FADE_OUT = 12; // frames
