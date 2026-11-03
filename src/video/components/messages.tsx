import type { messages as defs } from "../../components/messages.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Renderers } from "../kit.tsx";

// One renderer per type in src/components/messages.ts (see ./core.tsx for the pattern).
export const messages: Renderers<TypesOf<typeof defs>> = {};
