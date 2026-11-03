import { z } from "zod";
import { defineComponent, Label, Pos, Ref } from "./registry.ts";

// Annotations draw on top of what they attach to and follow it; they cost no working-memory slot.
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const cap = (what: string, s: string, n: number) => (words(s) > n ? [`${what} is ${words(s)} words; keep it to ${n}`] : []);
const Side = z.enum(["left", "right", "above", "below"]);
const End = z.union([Ref, Pos]).describe("element id, id.part, or [x, y]");
// on-screen words must say something: blank text draws an empty frame
const Text = Label.refine((s) => s.trim().length > 0, "write some text; it cannot be blank");
// two fixed points must spread along the brace (vertically for side left/right), or there is no span to brace
const across = (side?: string) => (side === "left" || side === "right" ? 1 : 0);
const flat = (a: unknown, b: unknown, side?: string) =>
  Array.isArray(a) && Array.isArray(b) && Math.abs(a[across(side)] - b[across(side)]) < 0.3;
const FREE = { placed: false, family: "annotations", size: () => [0, 0] as [number, number], chunks: 0 } as const;

// Example hosts get their own ids: the gallery runs every example in one video, where ids are unique
// (the core arrow's host already takes "host").
export const annotations = [
  defineComponent({
    ...FREE, type: "callout", summary: "a note with a short leader line pointing at one detail",
    fields: {
      on: Ref.describe("element or id.part to point at"),
      text: Text.describe("the note, at most 6 words"),
      side: Side.optional().describe("where the note sits, default right"),
    },
    refs: (el) => [el.on],
    check: (el) => cap("callout text", el.text, 6),
    example: {
      host: { op: "add", type: "cells", id: "cache", items: ["1041", "1042", "1043"], label: "Cache", at: [8, 5] },
      add: { on: "cache.1", text: "expires in 60 s", side: "above" },
    },
  }),
  defineComponent({
    ...FREE, type: "brace", summary: "a curly brace grouping a span of elements: one transaction, a batch",
    fields: {
      from: End.describe("first element (or part, or point) of the span"),
      to: End.describe("last element (or part, or point) of the span"),
      label: Text.describe("what the span is, e.g. 'one transaction'"),
      side: Side.optional().describe("which side of the span the brace sits on, default below"),
    },
    refs: (el) => [el.from, el.to].filter((e): e is string => typeof e === "string"),
    check: (el) => JSON.stringify(el.from) === JSON.stringify(el.to) ? ["brace needs two different ends"]
      : flat(el.from, el.to, el.side) ? [`brace ends ${JSON.stringify(el.from)} and ${JSON.stringify(el.to)} line up across side '${el.side ?? "below"}'; `
        + `spread them along it or use side ${across(el.side) ? "above or below" : "left or right"}`] : [],
    example: {
      host: { op: "add", type: "cells", id: "batch", items: ["1041", "1042", "1043", ""], at: [8, 4] },
      add: { from: "batch.0", to: "batch.2", label: "batch of 3" },
    },
  }),
  defineComponent({
    ...FREE, type: "badge", summary: "a small tag on a corner: v2, stale, cached",
    fields: {
      on: Ref.describe("element or id.part to tag"),
      text: Text.describe("the tag, at most 3 words"),
      corner: z.enum(["top-right", "top-left", "bottom-right", "bottom-left"]).optional().describe("default top-right"),
    },
    state: ["text"],
    refs: (el) => [el.on],
    check: (el) => cap("badge text", el.text, 3),
    example: {
      host: { op: "add", type: "box", id: "page", label: "Product page", icon: "file", at: [8, 4.5] },
      add: { on: "page", text: "cached" },
      set: { text: "stale" },
    },
  }),
  defineComponent({
    ...FREE, type: "bubble", summary: "a speech or thought bubble: what an actor says, wants or believes",
    fields: {
      on: Ref.describe("who speaks or thinks, usually an icon"),
      text: Text.describe("what they say or think, at most 8 words"),
      kind: z.enum(["say", "think"]).optional().describe("say (default) has a pointed tail; think a dotted outline and a trail of dots"),
    },
    refs: (el) => [el.on],
    check: (el) => cap("bubble text", el.text, 8),
    example: {
      host: { op: "add", type: "icon", id: "ana", icon: "user", label: "Ana", at: [8, 5.5] },
      add: { on: "ana", text: "Where is order 1042?", kind: "think" },
    },
  }),
] as const;
