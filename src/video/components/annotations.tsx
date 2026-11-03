import type { annotations as defs } from "../../components/annotations.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/annotations.ts (see ./core.tsx for the pattern).
export const annotations: Renderers<TypesOf<typeof defs>> = {};
