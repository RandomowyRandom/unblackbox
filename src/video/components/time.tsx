import type { time as defs } from "../../components/time.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/time.ts (see ./core.tsx for the pattern).
export const time: Renderers<TypesOf<typeof defs>> = {};
