import { DEFS, FAMILIES } from "./components/index.ts";

// A spec with one beat per component: its example added (after its host, for annotations), then its example `set`.
// Raw JSON, so it goes through parseSpec like any spec: the sheet proves every example is valid.
export function gallery(family?: string) {
  const defs = DEFS.filter((d) => !family || d.family === family);
  if (!defs.length) throw new Error(`--family takes one of ${FAMILIES.join(", ")}`);
  const beats = defs.map((d) => {
    const { add, set, host } = d.example;
    const id = `x_${d.type}`;
    const at = d.placed && !("place" in add) && !("at" in add) ? { at: host ? [11, 4.5] : [8, 4.5] } : {};
    const el = { op: "add", type: d.type, id, ...at, ...add };
    return {
      chapter: `${d.family}: ${d.type}`,
      hold: set ? 3.2 : 2,
      do: [{ op: "clear" }, ...(host ? [host] : []), el, ...(set ? [{ op: "set", id, state: set, wait: 1.4 }] : [])],
    };
  });
  return { title: "components", audience: "expert", beats };
}
