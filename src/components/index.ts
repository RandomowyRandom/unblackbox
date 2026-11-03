import { annotations } from "./annotations.ts";
import { charts } from "./charts.ts";
import { collections } from "./collections.ts";
import { control } from "./control.ts";
import { core } from "./core.ts";
import { graphs } from "./graphs.ts";
import { infra } from "./infra.ts";
import { messages } from "./messages.ts";
import type { AnyDef, ElOf } from "./registry.ts";
import { time } from "./time.ts";

// Every element type. Order is the order of `components` and the gallery sheet.
export const DEFS = [...core, ...collections, ...graphs, ...time, ...control, ...infra, ...messages, ...charts, ...annotations] as const;
export const FAMILIES = ["core", "collections", "graphs", "time", "control", "infra", "messages", "charts", "annotations"] as const;
export type Add = ElOf<(typeof DEFS)[number]>;
export type AddType = Add["type"];

const byType = new Map<string, AnyDef>(DEFS.map((d) => [d.type, d as AnyDef]));
export const defOf = (type: string): AnyDef => {
  const d = byType.get(type);
  if (!d) throw new Error(`unknown element type '${type}'`);
  return d;
};
