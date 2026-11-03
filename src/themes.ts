import type { Color, Theme } from "./spec.ts";

export type Palette = Record<Color | "bg" | "panel" | "text", string>;
type Preset = Theme["preset"];

// Every text color clears WCAG 4.5:1 on both bg and panel; accents and outcomes clear 3:1 (test/themes.test.ts).
const BASE: Record<Preset, Omit<Palette, "accent">> = {
  dim: { bg: "#1c2128", panel: "#22272e", text: "#cdd9e5", muted: "#8b98a5", good: "#57ab5a", bad: "#f47067" },
  light: { bg: "#ffffff", panel: "#f3f5f8", text: "#1f2328", muted: "#59636e", good: "#1a7f37", bad: "#cf222e" },
  contrast: { bg: "#0a0c10", panel: "#151a21", text: "#f0f3f6", muted: "#a2abb6", good: "#26cd4d", bad: "#ff9492" },
};
const ACCENT: Record<Preset, Record<Theme["accent"], string>> = {
  dim: { blue: "#539bf5", violet: "#b083f0", teal: "#39c5cf", amber: "#daaa3f" },
  light: { blue: "#0969da", violet: "#8250df", teal: "#1b7c83", amber: "#9a6700" },
  contrast: { blue: "#71b7ff", violet: "#cb9eff", teal: "#56d4dd", amber: "#f0b72f" },
};
// Shiki theme for code glimpses that matches each preset.
export const CODE_THEME = { dim: "github-dark-dimmed", light: "github-light", contrast: "github-dark" } as const satisfies Record<Preset, string>;

export const themeOf = (t: Theme): Palette => ({ ...BASE[t.preset], accent: ACCENT[t.preset][t.accent] });
export const DEFAULT_THEME: Theme = { preset: "dim", accent: "blue" };
