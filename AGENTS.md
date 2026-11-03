# unblackbox tool reference

You write a JSON spec. unblackbox turns it into a narrated explainer video of a system: dark canvas, components with icons inside system boundaries, labelled arrows with packets moving along them, an occasional glimpse of code, calm pacing. The rules the finished video must meet are printed after this reference by `unblackbox guide` (file `skills/unblackbox/references/rules.md`).

## Commands

All commands print JSON to stdout, progress to stderr, and exit 1 on failure.

| command | what it does |
|---|---|
| `unblackbox guide` | this reference + the video rules |
| `unblackbox schema` | exact JSON Schema of the spec |
| `unblackbox validate spec.json` | under 1 s. `errors` block rendering; `warnings` say where the video gets too dense, too low-level or too wordy; both carry a `path` like `beats.3.do.1`. Also `estimatedSec` (from word count) |
| `unblackbox still spec.json` | about 5 s. One contact sheet, `out/<name>-sheet.png`: every beat at its settled frame in a grid labelled with beat indexes. Review the whole video in one image |
| `unblackbox still spec.json --beat 3,7` | full-size PNG per listed beat (`--beat all` for every beat). `--at 1.5` grabs 1.5 s into each beat instead of the settled frame (to see a packet mid-trace); works with the sheet too. `--out <folder>` |
| `unblackbox render spec.json` | `out/<name>.mp4` + `out/<name>.srt` (`--out <file>`). Takes about as long as the video plays, so run it in the background. Output repeats warnings and `sources`. `--beat 5,6` renders only that clip (no SRT); `--out x.gif` makes a silent half-size GIF, e.g. a README preview |
| `unblackbox voices` | Kokoro voice ids |

Beat numbers are 0-based everywhere: `--beat 3` is `beats.3` in a warning and cell 3 on the sheet. `still` and `render` print `timing` per beat (`start`, `length`, `speech` seconds).

`--tts silent` skips speech (timing from word count, within about 8% of Kokoro either way) and is all a sheet needs. Speech is cached per sentence next to the tool, so after an edit only changed sentences are re-synthesized; frames are always fully re-rendered. Without `npm link`, run `node <unblackbox>/src/cli.ts` instead of `unblackbox`.

## Spec shape

```json
{
  "title": "Cache-aside in one request",
  "audience": "intermediate",
  "sources": ["docs/adr/0007-cache-aside.md", "commit 3f2a91c"],
  "beats": [
    { "say": "Every product page waits on the database.",
      "do": [{ "op": "add", "type": "box", "id": "db", "label": "Postgres", "icon": "database" }] },
    { "say": "What happens when a second user asks for the same page?", "think": 3, "do": [] }
  ]
}
```

- `audience`: `novice` | `intermediate` (default) | `expert`. Sets the quiet after each line, so the picture can sink in (1.2 / 1.0 / 0.7 s), and lint limits (elements on screen at once 4 / 5 / 6, groups not counted; words per beat 16 / 18 / 22).
- `voice` is optional: Kokoro `am_michael` at speed 0.95 by default (`{ "provider", "voice", "speed" }`).
- `sources`: where the facts and the "why" came from (ADR, commit, PR, `file:line`). Not drawn; echoed by `render` so the hand-off can cite them.
- A beat lasts as long as its narration plus the quiet, at least `hold` seconds (default 2), and long enough for its actions to settle. `think: N` then adds N seconds in which the `say` text (the question) is shown on a panel at the bottom with a countdown; it uses no on-screen slot, but keep the bottom ~1.5 units clear on that beat.
- Actions start at beat start, or `wait` seconds later. Every transition takes 1.2 s, so the pace is calm by default; stagger adds with `wait` instead of dropping everything at once.
- The on-screen element count follows the order of `do`, not `wait` times: list a `remove` before the `add` that replaces it.

## Canvas

Grid of 16 x 9 units, origin top-left. `at: [x, y]` is an element's center; default `[8, 4.5]`. One unit is 120px at 1080p. A row of 4 components fits at x = 2, 6, 10, 14 with `w: 3`; two systems side by side fit as groups at `[4, 4.5]` and `[12, 4.5]` with `w: 7`. Code: about 0.18 units per character wide and 0.45 units per line tall, plus 0.7 units of padding.

## Elements (`op: "add"`)

| type | what it is and its fields |
|---|---|
| `box` | a component: `label` (a few words), `icon?` (shown above the label; give key components one), `w?` (default 3), `h?` (default 1.4, 2 with an icon), `color?`, `at?` |
| `icon` | an actor or a thing without a frame (user, agent, database): `icon`, `label?` (caption under it), `size?` s / m / l (0.6 / 1 / 1.6 units), `color?`, `at?` |
| `group` | a system boundary drawn behind its components, name in the corner: `label`, `w?` (default 6), `h?` (default 4), `color?`, `at?`. Place its components inside it |
| `cells` | a row of slots for a queue, buckets, a cache or a batch: `items` (short strings, `""` for an empty slot, up to 16), `highlight?` (0-based slots that glow, e.g. the one that changed), `label?` (caption), `color?`, `at?`. Slots sit 0.8 units apart |
| `arrow` | `from`, `to` (box, icon, group or cells id, or `[x, y]`), `label?` (what flows), `color?`, `offset?` (slide sideways in grid units, + = left of its direction; give a request and its reply between the same two elements `0.25` each and they separate, labels on the outer sides) |
| `text` | a title or a short label, never a sentence: `text` (`\n` breaks lines), `size?` h1 / h2 / body, `color?`, `at?` |
| `code` | a glimpse of a key type or interface, at most 8 lines: `lang`, `code` (string or array of lines), `title?`, `at?` |

Icons are [Lucide](https://lucide.dev/icons) names in kebab-case; an unknown name is an error. Useful ones for systems: `user`, `users`, `bot`, `brain`, `monitor`, `smartphone`, `gamepad-2`, `server`, `database`, `hard-drive`, `cloud`, `globe`, `network`, `plug`, `cpu`, `cog`, `layers`, `box`, `boxes`, `package`, `folder`, `file`, `file-code`, `file-diff`, `git-branch`, `git-commit`, `hash`, `key`, `lock`, `shield`, `zap`, `clock`, `hourglass`, `timer`, `refresh-cw`, `repeat`, `send`, `inbox`, `mail`, `message-square`, `bell`, `search`, `filter`, `list`, `list-checks`, `check`, `x`, `triangle-alert`, `flame`, `bug`, `copy`, `receipt`, `shopping-cart`.

Colors are semantic: `accent`, `muted`, `good`, `bad`. Hex is rejected. `bad` boxes, cells and arrows are dashed so the meaning survives color blindness.

## Actions

| op | effect |
|---|---|
| `add` | element fades in |
| `remove` `{id}` | fades out; remove arrows before the elements they connect |
| `move` `{id, to}` | glides to a new position; arrows follow their ends |
| `trace` `{ids, label?, icon?}` | a packet travels along these arrows in order, 1 s each; with `label`/`icon` it shows what travels; for the example case name the instance ("order 1042", "Ana's edit"). Each arrow should start where the previous ended |
| `focus` `{id, lines?}` | one id or a list of ids dims everything else already on screen; elements added at the same moment or later stay bright. One code id + `lines: [[from, to], ...]` (1-based) dims its other lines and leaves other elements as they were |
| `unfocus` | clears focus |
| `camera` `{to?, zoom?}` | pans so `to` is screen center and zooms (1 = whole canvas, 2 = half the canvas fills the screen); use it to dive from a system into its components; `{}` resets |
| `fill` `{id, items, highlight?}` | a `cells` row gets new contents, same slot count: the example's order lands in the queue, a slot empties. `highlight` the slots that changed |
| `color` `{id, color}` | an element changes color over 1.2 s to show a change of state: a component failing (`bad`, which also turns it dashed), recovering (`good`), becoming the subject (`accent`). Not for code |
| `morph` `{id, code}` | code animates to new source; unchanged tokens glide to their new spot |
| `clear` | removes everything, resets focus and camera |

Ids are unique for the whole video; use a new id when re-adding something.

## Warnings `validate` gives

Too dense: more elements on screen than the audience limit; a beat longer than the word limit; a video over about 6 minutes. Too low-level: a function, variable or constant name (`isExpired`, `ONE_DAY_MS`) in narration; code over 8 lines; code in more than a quarter of the beats; narration that reads a code line aloud. Too wordy, not visual: a label over 5 words (8 for titles); many text elements; boxes without any icons. No real example: the traces with one concrete label (a number, name or file: "order 1042", "Ana", "queue.json"; not a lowercase kind like "order") do not pass through at least 3 arrows between them (1 when the video has fewer than 3 arrows). Also: an unlabeled arrow; a component name (`OrderService`) spoken before it is on screen; a trace whose arrows do not connect; a think beat that is not a question; more than two think beats. Fix them unless you have a reason not to.

Examples: `examples/queue-decoupling.json` (system: one real order traced end to end, icons, cells, packets, focus, think) and `examples/magic-numbers.json` (a small code change, the rare case where code is the subject).

## Playground (interactive sandbox)

A playground is a small Tauri app where the viewer plays with the system the video explained: buttons trigger events (send an order, crash a worker) and clicking a component explains it, with the same board, icons, colors and voice as the video.

| command | what it does |
|---|---|
| `unblackbox game topic.game.json` | about 20 s. Validates, voices every line, and writes `out/<topic>-play/`: the player exe, the game data, a web build, and `sheet.png` (the board plus the end state of every line). Prints `{ok, out, exe, sheet, warnings}` with the same kind of paths as `validate` |
| `unblackbox play out/<topic>-play` | opens it. The folder is the deliverable: double-click the exe, or share the folder |
| `unblackbox schema game` | exact JSON Schema of the playground spec |

```json
{
  "title": "Queue playground",
  "scene": [ "add ops: the board, usually the video's big-picture view" ],
  "intro": { "say": "Press a button to make something happen, or click any part." },
  "events": [
    { "id": "crash", "label": "Crash worker", "icon": "flame",
      "outcomes": [ { "say": "The worker crashed.", "do": [{ "op": "color", "id": "worker", "color": "bad" }] } ] },
    { "id": "order", "label": "Place order", "icon": "receipt",
      "outcomes": [
        { "if": { "worker": "bad" }, "say": "The order waits in the queue.", "do": [{ "op": "trace", "ids": ["enqueue"], "label": "order" }] },
        { "say": "The worker sends the receipt.", "do": [{ "op": "trace", "ids": ["enqueue", "deliver"], "label": "order" }] } ] }
  ],
  "inspect": { "worker": { "say": "The worker sends receipts on its own time.", "do": [{ "op": "focus", "id": "worker" }, { "op": "unfocus", "wait": 2.5 }] } }
}
```

- `scene`: add ops only; no code elements. Everything else refers to these elements.
- `intro`, `inspect.<id>` and every outcome are lines `{ say, do }`. Their `do` may only use `trace`, `color`, `fill`, `focus`, `unfocus`, `camera` and `move`.
- `events`: up to 8 buttons `{ id, label, icon, outcomes }`. A press runs the first outcome whose `if` matches; `if` maps element ids to the color they have right now (arrows start `muted`, everything else `accent`). Colors are the sandbox's state, so a `color` op changes what later presses do. The last outcome has no `if`.
- One-time setup: the `setup` skill with playgrounds, or `node scripts/setup.mjs --playground` (needs Rust). Without it `game` still writes the data and the web build and warns that the exe is missing.

Example: `examples/queue-decoupling.game.json`.
