import type { infra as defs } from "../../components/infra.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/infra.ts (see ./core.tsx for the pattern).
export const infra: Renderers<TypesOf<typeof defs>> = {};
