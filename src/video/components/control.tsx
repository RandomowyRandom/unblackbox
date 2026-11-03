import type { control as defs } from "../../components/control.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/control.ts (see ./core.tsx for the pattern).
export const control: Renderers<TypesOf<typeof defs>> = {};
