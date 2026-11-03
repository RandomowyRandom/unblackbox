import React from "react";
import {
  CH, diffSize, HEAD, JSON_TOP, jsonLines, jsonSize, KIND_ICON, lineText, lit, messageSize, msgKeyW, PAD, REQ_ROW, requestLayout, ROW, statusText,
  terminalSize, TOKEN, tokenLayout, transformLayout, type messages as defs,
} from "../../components/messages.ts";
import type { TypesOf } from "../../components/registry.ts";
import type { Palette } from "../../themes.ts";
import { alpha, iconFor, mono, Panel, sans, stroke, Text, type Renderers } from "../kit.tsx";

const mix = (a: number, b: number, p: number) => a + (b - a) * p;
const unit = (v: number) => Math.min(1, Math.max(0, v));
const FONT = 0.25; // mono text; CH is its character width
const solid = (tone: string, a: number, base: string) => `color-mix(in srgb, ${tone} ${a * 100}%, ${base})`;

// The old version fades out where the new one fades in.
function Swap({ from, to, p, same }: { from: React.ReactNode; to: React.ReactNode; p: number; same: boolean }) {
  if (same || p >= 1) return <>{to}</>;
  const cell = (o: number, n: React.ReactNode) => <div style={{ gridArea: "1 / 1", minWidth: 0, opacity: o }}>{n}</div>;
  return <div style={{ display: "grid", minWidth: 0 }}>{cell(1 - p, from)}{cell(p, to)}</div>;
}

// Lines of a card, ROW tall each. Lines that stay slide to their new place and cross-fade if their text changed;
// new lines fade in (or type in, one after another); gone lines fade out where they were. Lit lines glow softly.
type Row = { key: string; sig: string; lit?: boolean; draw: (reveal: number) => React.ReactNode };
function Rows({ prev, cur, p, u, color, typing }: { prev: Row[]; cur: Row[]; p: number; u: number; color: string; typing?: boolean }) {
  const before = new Map(prev.map((r, i) => [r.key, { r, i }]));
  const now = new Set(cur.map((r) => r.key));
  const fresh = cur.filter((r) => !before.has(r.key)).map((r) => r.key);
  const line = (key: string, y: number, opacity: number, glow: number, child: React.ReactNode, dx = 0) => (
    <div key={key} style={{ position: "absolute", left: 0, right: 0, top: y * ROW * u, height: ROW * u, opacity, display: "flex", alignItems: "center",
      transform: dx ? `translateX(${dx * u}px)` : undefined, borderRadius: 0.06 * u,
      background: glow ? alpha(color, 0.2 * glow) : undefined, boxShadow: glow ? `inset ${0.05 * u}px 0 0 ${alpha(color, glow)}` : undefined }}>{child}</div>
  );
  return (
    <>
      {prev.map((r, i) => (now.has(r.key) || p >= 1 ? null : line(`gone-${r.key}`, i, 1 - p, 0, r.draw(1))))}
      {cur.map((r, i) => {
        const old = before.get(r.key);
        if (old) {
          return line(r.key, mix(old.i, i, p), 1, mix(old.r.lit ? 1 : 0, r.lit ? 1 : 0, p), <Swap from={old.r.draw(1)} to={r.draw(1)} p={p} same={old.r.sig === r.sig} />);
        }
        if (typing) return line(r.key, i, 1, r.lit ? 1 : 0, r.draw(unit(p * fresh.length - fresh.indexOf(r.key))));
        return line(r.key, i, p, r.lit ? p : 0, r.draw(1), (1 - p) * 0.3);
      })}
    </>
  );
}
// Same key for repeated lines: the second "$ ls" is its own line.
const keyed = (sigs: string[]) => sigs.map((s, i) => `${s}#${sigs.slice(0, i).filter((x) => x === s).length}`);

// A card: icon and title on top, then lines; its size eases to each new state.
function Card({ u, w, h, tw, th, color, bad, pal, icon, title, tag, bg, children }: {
  u: number; w: number; h: number; tw: number; th: number; color: string; bad: boolean; pal: Palette; icon: string; title: string; tag?: React.ReactNode; bg?: string; children: React.ReactNode;
}) {
  const Icon = iconFor(icon);
  return (
    <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Panel u={u} color={color} bad={bad} style={{ width: tw * u, height: th * u, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: bg ?? alpha(color, 0.08) }}>
        <div style={{ height: HEAD * u, flexShrink: 0, display: "flex", alignItems: "center", gap: 0.14 * u, padding: `0 ${PAD * u}px`, borderBottom: `${0.02 * u}px solid ${alpha(color, 0.3)}` }}>
          <Icon size={0.3 * u} color={color} strokeWidth={2} style={{ flexShrink: 0 }} />
          <Text u={u} color={pal.text} bold style={{ flex: 1 }}>{title}</Text>
          {tag}
        </div>
        <div style={{ position: "relative", flex: 1, margin: `0 ${0.1 * u}px` }}>{children}</div>
      </Panel>
    </div>
  );
}
const Tag = ({ u, pal, children }: { u: number; pal: Palette; children: React.ReactNode }) => (
  <div style={{ fontFamily: sans, fontSize: 0.2 * u, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: pal.muted, whiteSpace: "nowrap" }}>{children}</div>
);
// A rounded chip of mono text, the unit of a token, a status code or a transform's input and output.
// `on` makes it opaque over that color, for chips that move across other things.
const Chip = ({ u, tone, bad, fill, h = 0.46, on, children, style }:
  { u: number; tone: string; bad: boolean; fill: number; h?: number; on?: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ boxSizing: "border-box", height: h * u, display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${0.15 * u}px`,
    border: stroke(bad, u, alpha(tone, 0.8)), borderRadius: 0.1 * u, background: on ? solid(tone, fill, on) : alpha(tone, fill), overflow: "hidden", ...style }}>{children}</div>
);
const mtext = (u: number, color: string, children: React.ReactNode, style?: React.CSSProperties) => <Text u={u} size={FONT} mono color={color} style={style}>{children}</Text>;

export const messages: Renderers<TypesOf<typeof defs>> = {
  message: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const keyW = tween(msgKeyW);
    const rows = (m: typeof el): Row[] => m.fields.map((f) => ({
      key: f.key, sig: f.value, lit: m.highlight?.includes(f.key),
      draw: () => (
        <div style={{ display: "flex", gap: 0.3 * u, padding: `0 ${0.1 * u}px`, minWidth: 0 }}>
          {mtext(u, pal.muted, f.key, { width: keyW * u, flexShrink: 0 })}
          {mtext(u, pal.text, f.value)}
        </div>
      ),
    }));
    return (
      <Card u={u} w={w} h={h} tw={tween((e) => messageSize(e)[0])} th={tween((e) => messageSize(e)[1])} color={color} bad={bad} pal={pal}
        icon={KIND_ICON[el.kind]} title={el.title} tag={<Tag u={u} pal={pal}>{el.kind}</Tag>}>
        <Rows prev={rows(change.prev)} cur={rows(el)} p={change.p} u={u} color={color} />
      </Card>
    );
  },

  request: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const l = requestLayout(el);
    const ms = Math.round(tween((e) => e.latency ?? 0));
    const chip = (s?: number) => {
      const tone = s === undefined ? pal.muted : s < 400 ? pal.good : pal.bad;
      return <Chip u={u} tone={tone} bad={s !== undefined && s >= 400} fill={0.15}>{mtext(u, pal.text, statusText(s))}</Chip>;
    };
    const Clock = iconFor("clock");
    const row: React.CSSProperties = { height: 0.46 * u, display: "flex", alignItems: "center", gap: 0.2 * u, minWidth: 0 };
    return (
      <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Panel u={u} color={color} bad={bad} style={{ width: tween((e) => requestLayout(e).w) * u, height: h, flexShrink: 0, display: "flex", flexDirection: "column",
          justifyContent: "center", gap: (2 * REQ_ROW - 0.46) * u, padding: `0 ${PAD * u}px` }}>
          <div style={row}>
            <Chip u={u} tone={color} bad={false} fill={0.25} h={0.42} style={{ width: l.badge * u, flexShrink: 0, padding: 0 }}>
              <Text u={u} size={FONT} mono bold color={pal.text}>{el.method}</Text>
            </Chip>
            {mtext(u, pal.text, el.path)}
          </div>
          <div style={{ ...row, justifyContent: "space-between" }}>
            <Swap from={chip(change.prev.status)} to={chip(el.status)} p={change.p} same={change.prev.status === el.status} />
            {el.latency !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: 0.08 * u }}>
                <Clock size={0.26 * u} color={pal.muted} strokeWidth={2} />
                {mtext(u, pal.muted, `${ms} ms`)}
              </div>
            )}
          </div>
        </Panel>
      </div>
    );
  },

  token: ({ el, u, w, h, color, ctx, tween, change }) => {
    const { pal } = ctx;
    const l = tokenLayout(el);
    const { prev, p } = change;
    // each segment eases to its new place and width when a value grows or shrinks, instead of jumping
    const eased = (label: string, k: "xs" | "ws", now: number) =>
      tween((e) => { const j = e.segments.findIndex((s) => s.label === label); return j < 0 ? now : tokenLayout(e)[k][j]; });
    const segs = el.segments.map((s, i) => ({ s, x: eased(s.label, "xs", l.xs[i]), sw: eased(s.label, "ws", l.ws[i]) }));
    const sealX = tween((e) => tokenLayout(e).sealX);
    const left = (x: number, width: number) => w / 2 + (x - width / 2) * u; // w is the eased footprint in px
    const chip = (value: string, i: number, broken: boolean) => (
      <Chip u={u} tone={broken ? pal.bad : color} bad={broken} fill={broken ? 0.15 : 0.1 + 0.1 * i} h={TOKEN.chip} style={{ width: segs[i].sw * u }}>
        {mtext(u, pal.text, value)}
      </Chip>
    );
    const Ok = iconFor("shield-check");
    const Broken = iconFor("shield-x");
    const seal = (broken: boolean) => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: TOKEN.seal * u }}>
        <div style={{ height: TOKEN.chip * u, display: "flex", alignItems: "center" }}>
          {broken ? <Broken size={0.5 * u} color={pal.bad} strokeWidth={1.8} /> : <Ok size={0.5 * u} color={pal.good} strokeWidth={1.8} />}
        </div>
        <Text u={u} size={0.2} color={broken ? pal.bad : pal.muted} style={{ marginTop: 0.08 * u }}>{broken ? "invalid" : "valid"}</Text>
      </div>
    );
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {segs.map(({ s, x, sw }, i) => {
          const was = prev.segments.find((v) => v.label === s.label);
          const broken = el.tampered === s.label;
          const same = !!was && was.value === s.value && (prev.tampered === s.label) === broken;
          return (
            <div key={s.label} style={{ position: "absolute", top: 0, left: left(x, sw), width: sw * u, display: "flex", flexDirection: "column", alignItems: "center",
              opacity: was ? 1 : p }}>
              <Swap from={chip(was?.value ?? s.value, i, prev.tampered === s.label)} to={chip(s.value, i, broken)} p={p} same={same} />
              <Text u={u} size={0.2} color={pal.muted} style={{ marginTop: 0.08 * u }}>{s.label}</Text>
            </div>
          );
        })}
        {segs.slice(1).map(({ x, sw }, i) => (
          <div key={i} style={{ position: "absolute", top: 0, height: TOKEN.chip * u, left: left(x - sw / 2 - TOKEN.dot / 2, TOKEN.dot), width: TOKEN.dot * u,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 0.09 * u, height: 0.09 * u, borderRadius: "50%", background: pal.muted }} />
          </div>
        ))}
        {el.signed && (
          <div style={{ position: "absolute", top: 0, left: left(sealX, TOKEN.seal) }}>
            <Swap from={seal(!!prev.tampered)} to={seal(!!el.tampered)} p={p} same={!!prev.tampered === !!el.tampered} />
          </div>
        )}
      </div>
    );
  },

  json: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const rows = (m: typeof el): Row[] => jsonLines(m.value).map((l) => ({
      key: l.id, sig: lineText(l), lit: !!l.path && lit(l.path, m.highlight),
      draw: () => (
        <div style={{ fontFamily: mono, fontSize: FONT * u, whiteSpace: "pre", paddingLeft: (0.3 + l.depth * 2 * CH) * u }}>
          {l.name !== undefined && <span style={{ color }}>"{l.name}"</span>}
          {l.name !== undefined && <span style={{ color: pal.muted }}>: </span>}
          <span style={{ color: /^[[\]{}],?$/.test(l.rest) ? pal.muted : pal.text }}>{l.rest}</span>
        </div>
      ),
    }));
    return (
      <div style={{ width: w, height: h, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Panel u={u} color={color} bad={bad} style={{ width: tween((e) => jsonSize(e.value)[0]) * u, height: tween((e) => jsonSize(e.value)[1]) * u, flexShrink: 0,
          position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0.1 * u, right: 0.1 * u, top: (JSON_TOP - 0.02) * u, bottom: 0 }}>
            <Rows prev={rows(change.prev)} cur={rows(el)} p={change.p} u={u} color={color} />
          </div>
        </Panel>
      </div>
    );
  },

  diff: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const sign = { "+": "+", "-": "−", " ": " " } as const;
    const rows = (m: typeof el): Row[] => {
      const keys = keyed(m.lines.map((l) => l.op + l.text));
      return m.lines.map((l, i) => {
        const tone = l.op === "+" ? pal.good : l.op === "-" ? pal.bad : undefined;
        return {
          key: keys[i], sig: keys[i],
          draw: () => (
            <div style={{ alignSelf: "stretch", flex: 1, display: "flex", alignItems: "center", minWidth: 0, borderRadius: 0.05 * u,
              background: tone ? alpha(tone, 0.14) : undefined, borderLeft: tone ? stroke(l.op === "-", u, tone, 0.04) : `${0.04 * u}px solid transparent` }}>
              {mtext(u, tone ?? pal.muted, sign[l.op], { width: 0.4 * u, textAlign: "center", flexShrink: 0, fontWeight: 700 })}
              {mtext(u, l.op === "-" ? pal.muted : pal.text, l.text, { whiteSpace: "pre", textDecoration: l.op === "-" ? "line-through" : undefined })}
            </div>
          ),
        };
      });
    };
    const count = (op: string) => el.lines.filter((l) => l.op === op).length;
    const tag = <Tag u={u} pal={pal}><span style={{ color: pal.good }}>+{count("+")}</span> <span style={{ color: pal.bad }}>−{count("-")}</span></Tag>;
    return (
      <Card u={u} w={w} h={h} tw={tween((e) => diffSize(e)[0])} th={tween((e) => diffSize(e)[1])} color={color} bad={bad} pal={pal}
        icon="file-diff" title={el.title} tag={tag}>
        <Rows prev={rows(change.prev)} cur={rows(el)} p={change.p} u={u} color={color} />
      </Card>
    );
  },

  terminal: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    const rows = (m: typeof el): Row[] => {
      const keys = keyed(m.lines);
      return m.lines.map((text, i) => ({
        key: keys[i], sig: keys[i],
        draw: (reveal: number) => {
          const cmd = text.startsWith("$ ");
          const shown = text.slice(cmd ? 2 : 0, Math.round(text.length * reveal));
          const cursor = (reveal > 0 && reveal < 1) || (i === m.lines.length - 1 && reveal >= 1);
          return (
            <div style={{ display: "flex", alignItems: "center", paddingLeft: 0.1 * u, fontFamily: mono, fontSize: FONT * u, whiteSpace: "pre" }}>
              {cmd && reveal > 0 && <span style={{ color }}>$ </span>}
              <span style={{ color: cmd ? pal.text : pal.muted }}>{shown}</span>
              {cursor && <span style={{ display: "inline-block", width: 0.13 * u, height: 0.28 * u, marginLeft: 0.04 * u, background: alpha(color, 0.7) }} />}
            </div>
          );
        },
      }));
    };
    return (
      <Card u={u} w={w} h={h} tw={tween((e) => terminalSize(e)[0])} th={tween((e) => terminalSize(e)[1])} color={color} bad={bad} pal={pal}
        icon="terminal" title={el.title} bg={pal.panel}>
        <Rows prev={rows(change.prev)} cur={rows(el)} p={change.p} u={u} color={color} typing />
      </Card>
    );
  },

  transform: ({ el, u, w, h, color, bad, ctx, tween, change }) => {
    const { pal } = ctx;
    // chips and the function box ease to their new widths and places when a value's length changes
    const eased = (pick: (l: ReturnType<typeof transformLayout>) => number) => tween((e) => pick(transformLayout(e)));
    const l = { ...transformLayout(el), w: eased((x) => x.w), a: eased((x) => x.a), b: eased((x) => x.b), f: eased((x) => x.f),
      x: { input: eased((x) => x.x.input), fn: eased((x) => x.x.fn), output: eased((x) => x.x.output) } };
    const { prev, p } = change;
    const [p1, p2] = [unit(p * 2), unit(p * 2 - 1)]; // the input goes in, then the output comes out
    const inChanged = prev.input !== el.input;
    const outChanged = prev.output !== el.output;
    const at = (x: number, width: number, height: number, child: React.ReactNode, opacity = 1, key?: string) => (
      <div key={key} style={{ position: "absolute", left: (l.w / 2 + x - width / 2) * u, top: (l.h / 2 - height / 2) * u, width: width * u, height: height * u, opacity,
        display: "flex", alignItems: "center", justifyContent: "center" }}>{child}</div>
    );
    const chip = (text: string, width: number) => (
      <Chip u={u} tone={color} bad={bad} fill={0.12} h={l.chipH} on={pal.bg} style={{ width: width * u }}>{mtext(u, pal.text, text)}</Chip>
    );
    const Fn = iconFor(el.fn.icon);
    const Chevron = iconFor("chevron-right");
    const busy = inChanged || outChanged ? Math.sin(Math.PI * p) : 0; // the function lights up while it works
    const gapX = (a: number, b: number) => (a + b) / 2;
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {[gapX(l.x.input + l.a / 2, l.x.fn - l.f / 2), gapX(l.x.fn + l.f / 2, l.x.output - l.b / 2)].map((x, i) =>
          at(x, 0.5, 0.5, <Chevron size={0.4 * u} color={pal.muted} strokeWidth={2} />, 1, `chev${i}`))}
        {at(l.x.input, l.a, l.chipH, <Swap from={chip(prev.input, l.a)} to={chip(el.input, l.a)} p={p1} same={!inChanged} />)}
        {inChanged && p1 < 1 && at(mix(l.x.input, l.x.fn, p1), l.a, l.chipH, chip(el.input, l.a), Math.sin(Math.PI * p1) * (1 - p1 * 0.5), "ghost")}
        {outChanged
          ? <>
              {p1 < 1 && at(l.x.output, l.b, l.chipH, chip(prev.output, l.b), 1 - p1, "old")}
              {at(mix(l.x.fn, l.x.output, inChanged ? p2 : p), l.b, l.chipH, chip(el.output, l.b), inChanged ? p2 : p, "new")}
            </>
          : at(l.x.output, l.b, l.chipH, chip(el.output, l.b))}
        {/* over the moving chips, so they go in and come out of it */}
        {at(l.x.fn, l.f, l.h, (
          <div style={{ boxSizing: "border-box", width: "100%", height: "100%", border: stroke(bad, u, color), borderRadius: 0.15 * u,
            background: solid(color, 0.1 + 0.2 * busy, pal.bg), boxShadow: busy ? `0 0 ${0.3 * busy * u}px ${alpha(color, 0.6)}` : undefined,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.12 * u }}>
            <Fn size={0.55 * u} color={color} strokeWidth={1.6} />
            <Text u={u} color={pal.text}>{el.fn.label}</Text>
          </div>
        ))}
      </div>
    );
  },
};
