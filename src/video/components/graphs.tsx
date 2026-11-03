import type { graphs as defs } from "../../components/graphs.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/graphs.ts (see ./core.tsx for the pattern).
export const graphs: Renderers<TypesOf<typeof defs>> = {};
