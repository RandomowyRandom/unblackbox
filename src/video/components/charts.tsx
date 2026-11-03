import type { charts as defs } from "../../components/charts.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/charts.ts (see ./core.tsx for the pattern).
export const charts: Renderers<TypesOf<typeof defs>> = {};
