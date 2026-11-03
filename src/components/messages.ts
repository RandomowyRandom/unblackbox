import { z } from "zod";
import { defineComponent, Icon, Label, PartId, uniqueIds, type Pt, type Rect } from "./registry.ts";

// Shared layout in grid units, used by size, parts and the renderers alike.
export const CH = 0.15; // width of one mono character at 0.25 units
export const ROW = 0.4; // one line of a card
export const HEAD = 0.5; // a card's title row
export const PAD = 0.2;
const cols = (xs: string[]) => Math.max(0, ...xs.map((x) => x.length));
const within = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wide = (w: number) => (w > 10 ? [`${w.toFixed(1)} units wide; shorten the text so it leaves room for its neighbours`] : []);
// A card is a title row and then one ROW per line; parts and rows share this.
const cardH = (n: number) => HEAD + n * ROW + PAD;
const rowY = (h: number, i: number) => -h / 2 + HEAD + (i + 0.5) * ROW;

// message: an envelope, a title row and up to 5 key/value fields
export const KIND_ICON = { event: "zap", email: "mail", command: "send" } as const;
const Field = z.strictObject({ key: PartId.max(24), value: z.string().max(40) });
type Msg = { title: string; fields: z.infer<typeof Field>[] };
export const messageSize = (el: Msg): [number, number] => {
  const body = 2 * PAD + 0.2 + cols(el.fields.map((f) => f.key)) * CH + 0.3 + cols(el.fields.map((f) => f.value)) * CH;
  return [within(Math.max(body, el.title.length * 0.15 + 1.8), 3, 6.5), cardH(el.fields.length)];
};

// request: method and path above, the status chip and latency below
const REASON: Record<number, string> = {
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 301: "Moved", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized",
  403: "Forbidden", 404: "Not Found", 409: "Conflict", 429: "Too Many Requests", 500: "Server Error", 502: "Bad Gateway", 503: "Unavailable", 504: "Timeout",
};
export const statusText = (s?: number) => (s === undefined ? "pending" : `${s} ${REASON[s] ?? ""}`.trim());
export const REQ_ROW = 0.32; // rows sit this far above and below the center
type Req = { method: string; path: string; status?: number; latency?: number };
export const requestLayout = (el: Req) => {
  const badge = el.method.length * CH + 0.3;
  const chip = statusText(el.status).length * CH + 0.3;
  const latency = el.latency === undefined ? 0 : 0.6 + `${Math.round(el.latency)} ms`.length * CH; // clock icon + "84 ms"
  const w = Math.max(3.2, 2 * PAD + 0.2 + Math.max(badge + 0.2 + el.path.length * CH, chip + latency));
  return { w, h: 1.5, badge, chip };
};

// token: segments in a row joined by dots, a caption under each, a seal at the end when signed
const Segment = z.strictObject({ label: PartId.max(16), value: z.string().max(24) });
type Tok = { segments: z.infer<typeof Segment>[]; signed?: boolean };
export const TOKEN = { chip: 0.6, dot: 0.3, seal: 0.85 } as const;
export const tokenLayout = (el: Tok) => {
  const ws = el.segments.map((s) => Math.max(s.value.length * CH, s.label.length * 0.13) + 0.4);
  const w = ws.reduce((a, b) => a + b, 0) + TOKEN.dot * (ws.length - 1) + (el.signed ? TOKEN.seal : 0);
  let left = -w / 2;
  const xs = ws.map((sw) => { const x = left + sw / 2; left += sw + TOKEN.dot; return x; });
  return { w, h: TOKEN.chip + 0.45, ws, xs, sealX: w / 2 - TOKEN.seal / 2 + 0.05, y: -0.45 / 2 };
};

// json: one line per scalar, object brace or inline array, laid out like pretty-printed JSON
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
const JsonValue: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string().max(40), z.number(), z.boolean(), z.null(), z.array(JsonValue).max(6), z.record(PartId.max(24), JsonValue)]));
// `id` matches a line across states; `path` is the dot path it belongs to ("" for the root braces).
export type JsonLine = { id: string; path: string; depth: number; name?: string; rest: string };
const scalar = (v: Json) => v === null || typeof v !== "object";
// scalars, arrays of scalars and empty objects print on one line
const flat = (v: Json) => scalar(v) || (Array.isArray(v) ? v.every(scalar) : !Object.keys(v as object).length);
const inline = (v: Json): string => (Array.isArray(v) ? `[${v.map(inline).join(", ")}]` : JSON.stringify(v));
export function jsonLines(value: Record<string, Json>): JsonLine[] {
  const out: JsonLine[] = [];
  const walk = (v: Json, path: string, depth: number, name: string | undefined, comma: string) => {
    if (flat(v)) return void out.push({ id: path, path, depth, name, rest: inline(v) + comma });
    const list = Array.isArray(v);
    const entries = list ? (v as Json[]).map((x, i) => [String(i), x] as const) : Object.entries(v as Record<string, Json>);
    out.push({ id: `${path}{`, path, depth, name, rest: list ? "[" : "{" });
    entries.forEach(([k, x], i) => walk(x, path ? `${path}.${k}` : k, depth + 1, list ? undefined : k, i < entries.length - 1 ? "," : ""));
    out.push({ id: `${path}}`, path, depth, rest: (list ? "]" : "}") + comma });
  };
  walk(value, "", 0, undefined, "");
  return out;
}
export const lineText = (l: JsonLine) => `${"  ".repeat(l.depth)}${l.name === undefined ? "" : `"${l.name}": `}${l.rest}`;
const depthOf = (v: Json): number => (v === null || typeof v !== "object" ? 0 : 1 + Math.max(0, ...Object.values(v).map(depthOf)));
export const lit = (path: string, highlight: string[] = []) => highlight.some((h) => path === h || path.startsWith(`${h}.`));
export const JSON_TOP = 0.25; // padding above the first line
export const jsonSize = (value: Record<string, Json>): [number, number] => {
  const lines = jsonLines(value);
  return [Math.max(2.5, cols(lines.map(lineText)) * CH + 0.8), lines.length * ROW + 2 * JSON_TOP];
};

// diff: a file name and up to 8 lines, each kept (" "), added ("+") or removed ("-")
const DiffLine = z.strictObject({ op: z.enum(["+", "-", " "]), text: z.string().max(48) });
export const diffSize = (lines: { text: string }[]): [number, number] => [Math.max(3, cols(lines.map((l) => l.text)) * CH + 1), cardH(lines.length)];
// terminal: a title and up to 8 lines; "$ " starts a command
export const terminalSize = (lines: string[]): [number, number] => [Math.max(3, cols(lines) * CH + 0.6), cardH(lines.length)];

// transform: input chip > function box > output chip, in one row
const MAX_CHIP = 3.6;
type Tf = { input: string; output: string; fn: { label: string } };
export const transformLayout = (el: Tf) => {
  const chip = (s: string) => within(s.length * CH + 0.4, 1.2, MAX_CHIP);
  const [a, b, f, gap] = [chip(el.input), chip(el.output), Math.max(1.6, el.fn.label.length * 0.15 + 0.4), 0.7];
  const w = a + gap + f + gap + b;
  return { w, h: 1.7, a, b, f, chipH: 0.6, x: { input: -w / 2 + a / 2, fn: -w / 2 + a + gap + f / 2, output: w / 2 - b / 2 } };
};

export const messages = [
  defineComponent({
    type: "message", family: "messages", summary: "an event, queue message or email: an envelope with a title and key/value fields",
    fields: {
      kind: z.enum(["event", "email", "command"]).describe("event = something happened, command = do this, email = to a person; sets the icon"),
      title: Label.describe("the message name, e.g. OrderPlaced"),
      fields: z.array(Field).max(5).describe("headers or body fields, e.g. {key: 'orderId', value: '1042'}; each key is a part (msg.orderId)"),
      highlight: z.array(PartId).max(5).optional().describe("field keys that glow: the one that changed or matters"),
    },
    state: ["fields", "highlight"],
    size: messageSize,
    parts: (el) => {
      const [w, h] = messageSize(el);
      return Object.fromEntries(el.fields.map((f, i) => [f.key, { x: 0, y: rowY(h, i), w: w - 0.2, h: ROW }]));
    },
    check: (el) => {
      const keys = el.fields.map((f) => f.key);
      return [...uniqueIds("field", keys), ...(el.highlight ?? []).filter((k) => !keys.includes(k)).map((k) => `highlight key '${k}' is not a field: ${keys.join(", ")}`)];
    },
    lint: (el) => el.fields.filter((f) => f.value.split(/\s+/).length > 5).map((f) => `field '${f.key}' holds a sentence; keep values to a few words`),
    example: {
      add: { kind: "event", title: "OrderPlaced", fields: [{ key: "orderId", value: "1042" }, { key: "customer", value: "Ana" }, { key: "total", value: "EUR 42.50" }] },
      set: { fields: [{ key: "orderId", value: "1042" }, { key: "customer", value: "Ana" }, { key: "total", value: "EUR 42.50" }, { key: "status", value: "paid" }], highlight: ["status"] },
    },
  }),
  defineComponent({
    type: "request", family: "messages", summary: "an HTTP call: method and path, then the status code and latency",
    fields: {
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      path: z.string().max(40).describe("e.g. /orders/1042/pay"),
      status: z.number().int().min(100).max(599).optional().describe("response code; under 400 is good, 400 and up bad; leave out while pending"),
      latency: z.number().min(0).max(600000).optional().describe("milliseconds the call took; counts up when set"),
    },
    state: ["status", "latency"],
    size: (el) => { const l = requestLayout(el); return [l.w, l.h]; },
    parts: (el) => { const l = requestLayout(el); return { status: { x: -l.w / 2 + PAD + l.chip / 2, y: REQ_ROW, w: l.chip, h: 0.46 } }; },
    check: (el) => (el.latency !== undefined && el.status === undefined ? ["latency needs a status; set both when the response arrives"] : []),
    lint: (el) => wide(requestLayout(el).w),
    example: { add: { method: "POST", path: "/orders/1042/pay", status: 201, latency: 84 }, set: { status: 503, latency: 3000 } },
  }),
  defineComponent({
    type: "token", family: "messages", summary: "a signed token (JWT): colored segments and a seal that breaks when tampered",
    fields: {
      segments: z.array(Segment).min(1).max(4).describe("e.g. header, payload, signature; each label is a part (jwt.payload)"),
      signed: z.boolean().optional().describe("draw the seal that shows the signature checks out"),
      tampered: PartId.optional().describe("label of a segment someone changed: it turns bad and the seal breaks"),
    },
    state: ["segments", "tampered"],
    size: (el) => { const l = tokenLayout(el); return [l.w, l.h]; },
    parts: (el) => {
      const l = tokenLayout(el);
      const parts: Record<string, Rect> = Object.fromEntries(el.segments.map((s, i) => [s.label, { x: l.xs[i], y: l.y, w: l.ws[i], h: TOKEN.chip }]));
      if (el.signed) parts.seal = { x: l.sealX, y: l.y, w: TOKEN.seal - 0.1, h: TOKEN.chip };
      return parts;
    },
    check: (el) => {
      const labels = el.segments.map((s) => s.label);
      const t = el.tampered;
      return [
        ...uniqueIds("segment", labels),
        ...(t !== undefined && !labels.includes(t) ? [`tampered segment '${t}' is not one of: ${labels.join(", ")}`] : []),
        ...(t !== undefined && !el.signed ? ["tampered needs signed: true; only a signed token shows the change"] : []),
      ];
    },
    lint: (el) => wide(tokenLayout(el).w),
    example: {
      add: { segments: [{ label: "header", value: "alg: HS256" }, { label: "payload", value: "sub: ana, role: user" }, { label: "signature", value: "9f2c…41e1" }], signed: true },
      set: { segments: [{ label: "header", value: "alg: HS256" }, { label: "payload", value: "sub: ana, role: admin" }, { label: "signature", value: "9f2c…41e1" }], tampered: "payload" },
    },
  }),
  defineComponent({
    type: "json", family: "messages", summary: "a data shape, payload or config file as pretty-printed JSON",
    fields: {
      value: z.record(PartId.max(24), JsonValue).describe("a JSON object, at most 3 levels deep and 10 printed lines; top-level keys are parts"),
      highlight: z.array(z.string().max(60).regex(/^[\w-]+(\.[\w-]+)*$/, "use a dot path like user.id")).max(4).optional()
        .describe("dot paths whose lines glow, e.g. user.id"),
    },
    state: ["value", "highlight"],
    size: (el) => jsonSize(el.value),
    parts: (el) => {
      const lines = jsonLines(el.value);
      const [w, h] = jsonSize(el.value);
      const top = -h / 2 + JSON_TOP;
      return Object.fromEntries(Object.keys(el.value).map((k) => {
        const [i, j] = [lines.findIndex((l) => l.path === k), lines.findLastIndex((l) => l.path === k)];
        return [k, { x: 0, y: top + ((i + j + 1) / 2) * ROW, w: w - 0.2, h: (j - i + 1) * ROW }];
      }));
    },
    check: (el) => {
      const lines = jsonLines(el.value);
      const paths = new Set(lines.map((l) => l.path));
      const depth = depthOf(el.value);
      return [
        ...(depth > 3 ? [`value is ${depth} levels deep; keep it to 3`] : []),
        ...(lines.length > 10 ? [`value renders ${lines.length} lines; keep it to 10`] : []),
        ...(el.highlight ?? []).filter((h) => !paths.has(h)).map((h) => `highlight '${h}' is not a path in value`),
      ];
    },
    lint: (el) => wide(jsonSize(el.value)[0]),
    example: {
      add: { value: { user: { id: 1042, name: "Ana" }, items: ["mug", "tea"], total: 42.5 } },
      set: { value: { user: { id: 1042, name: "Ana" }, items: ["mug", "tea"], total: 37.5, coupon: "SPRING10" }, highlight: ["total", "coupon"] },
    },
  }),
  defineComponent({
    type: "diff", family: "messages", summary: "a change to a file: kept, removed and added lines",
    fields: {
      title: Label.describe("the file name, e.g. retry.ts"),
      lines: z.array(DiffLine).min(1).max(8).describe("op '+' added, '-' removed, ' ' kept for context"),
    },
    state: ["lines"],
    size: (el) => diffSize(el.lines),
    check: (el) => (el.lines.some((l) => l.op !== " ") ? [] : ["a diff needs at least one + or - line"]),
    example: {
      add: { title: "retry.ts", lines: [
        { op: " ", text: "export const retry = {" }, { op: " ", text: "  timeout: 30_000," },
        { op: "-", text: "  attempts: 1," }, { op: "+", text: "  attempts: 3," }, { op: " ", text: "}" },
      ] },
      set: { lines: [
        { op: " ", text: "export const retry = {" }, { op: " ", text: "  timeout: 30_000," },
        { op: "-", text: "  attempts: 1," }, { op: "+", text: "  attempts: 3," }, { op: "+", text: "  backoff: 2," }, { op: " ", text: "}" },
      ] },
    },
  }),
  defineComponent({
    type: "terminal", family: "messages", summary: "a shell session: commands and their output, new lines type in",
    fields: {
      title: Label.describe("the shell or host, e.g. api-server"),
      lines: z.array(z.string().max(56)).max(8).describe("lines starting with '$ ' are commands, the rest is output"),
    },
    state: ["lines"],
    size: (el) => terminalSize(el.lines),
    check: (el) => el.lines.flatMap((l, i) => (l.trim() === "$" ? [`line ${i + 1} is a bare prompt; write the command after '$ '`] : [])),
    example: {
      add: { title: "api-server", lines: ["$ curl -s localhost:8080/health", "{\"status\":\"ok\"}"] },
      set: { lines: ["$ curl -s localhost:8080/health", "{\"status\":\"ok\"}", "$ kill 4211", "$ curl -s localhost:8080/health", "curl: (7) connection refused"] },
    },
  }),
  defineComponent({
    type: "transform", family: "messages", summary: "a function that turns input into output: hash, encrypt, compress, compile",
    fields: {
      input: z.string().max(32).describe("what goes in, e.g. hunter2"),
      fn: z.strictObject({ label: Label.describe("e.g. SHA-256, gzip, JSON.stringify"), icon: Icon }),
      output: z.string().max(32).describe("what comes out; shorten long values like f52f…a3c1"),
    },
    state: ["input", "output"],
    size: (el) => { const l = transformLayout(el); return [l.w, l.h]; },
    parts: (el) => {
      const l = transformLayout(el);
      return { input: { x: l.x.input, y: 0, w: l.a, h: l.chipH }, fn: { x: l.x.fn, y: 0, w: l.f, h: l.h }, output: { x: l.x.output, y: 0, w: l.b, h: l.chipH } };
    },
    edges: (el) => {
      const l = transformLayout(el);
      const into: Pt[] = [[l.x.input + l.a / 2, 0], [l.x.fn - l.f / 2, 0]];
      const out: Pt[] = [[l.x.fn + l.f / 2, 0], [l.x.output - l.b / 2, 0]];
      return { in: into, out, through: [...into, ...out] };
    },
    check: (el) => (el.input === el.output ? ["output equals input; a transform changes it"] : []),
    lint: (el) => [el.input, el.output].filter((s) => s.length * CH + 0.4 > MAX_CHIP).map((s) => `'${s}' is cut off; shorten it like f52f…a3c1`),
    example: {
      add: { input: "hunter2", fn: { label: "SHA-256", icon: "hash" }, output: "f52f…a3c1" },
      set: { input: "hunter3", output: "9b1c…07de" },
    },
  }),
] as const;
