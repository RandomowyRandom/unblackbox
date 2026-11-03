import type { AddType } from "../../components/index.ts";
import type { Renderer } from "../kit.tsx";
import { annotations } from "./annotations.tsx";
import { charts } from "./charts.tsx";
import { collections } from "./collections.tsx";
import { control } from "./control.tsx";
import { core } from "./core.tsx";
import { graphs } from "./graphs.tsx";
import { infra } from "./infra.tsx";
import { messages } from "./messages.tsx";
import { time } from "./time.tsx";

// A type without a renderer, or a renderer without a type, is a compile error here.
export const RENDERERS = { ...core, ...collections, ...graphs, ...time, ...control, ...infra, ...messages, ...charts, ...annotations } satisfies { [K in AddType]: Renderer<K> };
