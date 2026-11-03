import type { collections as defs } from "../../components/collections.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/collections.ts (see ./core.tsx for the pattern).
export const collections: Renderers<TypesOf<typeof defs>> = {};
