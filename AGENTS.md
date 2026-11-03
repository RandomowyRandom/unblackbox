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
| `unblackbox components` | every element type: the concept it shows and what `set` can change |
| `unblackbox components <type>` | its exact fields, settable state and a worked example |
| `unblackbox components --sheet` | contact sheet of every component's example, added and then set (`--family F` for one family) |

Beat numbers are 0-based everywhere: `--beat 3` is `beats.3` in a warning and cell 3 on the sheet. `still` and `render` print `timing` per beat (`start`, `length`, `speech` seconds).

`--theme light` (or `contrast`, `dim/teal`, ...) overrides the spec's theme for `validate`, `still` and `render`. `--tts silent` skips speech (timing from word count, within about 8% of Kokoro either way) and is all a sheet needs. Speech is cached per sentence next to the tool, so after an edit only changed sentences are re-synthesized; frames are always fully re-rendered. Without `npm link`, run `node <unblackbox>/src/cli.ts` instead of `unblackbox`.

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
- `theme` is optional: `{ "preset": "dim" | "light" | "contrast", "accent": "blue" | "violet" | "teal" | "amber" }`, default dim and blue. Colors stay semantic in every theme.
- A beat may start a section with `chapter` ("The fix", at most 4 words): a small label in the top-left corner until the next chapter. `transition` sets how the beat's new elements come in and how what its `clear` or `remove` takes out goes away: `fade` (default), `cut` or `slide`.
- Every object is strict: an unknown or misspelled key (`lable`) is an error with its path, never silently ignored.
- A beat lasts as long as its narration plus the quiet, at least `hold` seconds (default 2), and long enough for its actions to settle. `think: N` then adds N seconds in which the `say` text (the question) is shown on a panel at the bottom with a countdown; it uses no on-screen slot, but keep the bottom ~1.5 units clear on that beat.
- Actions start at beat start, or `wait` seconds later. Every transition takes 1.2 s, so the pace is calm by default; stagger adds with `wait` instead of dropping everything at once.
- The on-screen element count follows the order of `do`, not `wait` times: list a `remove` before the `add` that replaces it.

## Canvas

Grid of 16 x 9 units, origin top-left. `at: [x, y]` is an element's center; default `[8, 4.5]`. Instead of `at`, `place: { "of": "checkout", "side": "right", "gap": 1 }` puts an element `left`, `right`, `above`, `below` or `center` of another element (or one of its parts) as it is at that moment, edge to edge with `gap` units between (default 0.6). Prefer `place`: footprints never overlap by construction. One unit is 120px at 1080p. A row of 4 components fits at x = 2, 6, 10, 14 with `w: 3`; two systems side by side fit as groups at `[4, 4.5]` and `[12, 4.5]` with `w: 7`. Code: about 0.18 units per character wide and 0.45 units per line tall, plus 0.7 units of padding.

## Elements (`op: "add"`)

Every element takes `id`, `wait`, `color?` and `emphasis?` (`quiet` fades it into context, `strong` makes it glow as the subject). Every placed element also takes `at` or `place`, and `size?` `s` / `m` / `l` (0.8 / 1 / 1.25 of its default size; icons and text keep their own `size` scale). Parts of a component are refs like `cache.1042` or `tree.root`: arrows, `place`, `camera` and annotations can point at them, and `trace` can ride a component's edges (`states.paid`).

### Core

| type | what it is and its fields |
|---|---|
| `box` | a component: `label` (a few words), `icon?` (shown above the label; give key components one), `w?` (default 3), `h?` (default 1.4, 2 with an icon), `color?`, `at?` |
| `icon` | an actor or a thing without a frame (user, agent, database): `icon`, `label?` (caption under it), `size?` s / m / l (0.6 / 1 / 1.6 units), `color?`, `at?` |
| `group` | a system boundary drawn behind its components, name in the corner: `label`, `w?` (default 6), `h?` (default 4), `color?`, `at?`. Place its components inside it |
| `cells` | a row of slots for a queue, buckets, a cache or a batch: `items` (short strings, `""` for an empty slot, up to 16), `highlight?` (0-based slots that glow, e.g. the one that changed), `label?` (caption), `color?`, `at?`. Slots sit 0.8 units apart |
| `arrow` | `from`, `to` (an element id, a part like `queue.0`, or `[x, y]`), `label?` (what flows), `color?`, `offset?` (slide sideways in grid units, + = left of its direction; give a request and its reply between the same two elements `0.25` each and they separate, labels on the outer sides), `curve?` (-1 to 1, a bend packets follow), `line?` `solid` / `dashed` (async, optional) / `dotted` (weak, later), `heads?` `end` / `both` / `none`, `weight?` `thin` / `normal` / `thick` (the main path) |
| `text` | a title or a short label, never a sentence: `text` (`\n` breaks lines), `size?` h1 / h2 / body, `color?`, `at?` |
| `code` | a glimpse of a key type or interface, at most 8 lines: `lang`, `code` (string or array of lines), `title?`, `at?` |

Icons are [Lucide](https://lucide.dev/icons) names in kebab-case; an unknown name is an error. Useful ones for systems: `user`, `users`, `bot`, `brain`, `monitor`, `smartphone`, `gamepad-2`, `server`, `database`, `hard-drive`, `cloud`, `globe`, `network`, `plug`, `cpu`, `cog`, `layers`, `box`, `boxes`, `package`, `folder`, `file`, `file-code`, `file-diff`, `git-branch`, `git-commit-horizontal`, `hash`, `key`, `lock`, `shield`, `zap`, `clock`, `hourglass`, `timer`, `refresh-cw`, `repeat`, `send`, `inbox`, `mail`, `message-square`, `bell`, `search`, `filter`, `list`, `list-checks`, `check`, `x`, `triangle-alert`, `flame`, `bug`, `copy`, `receipt`, `shopping-cart`.

Colors are semantic: `accent`, `muted`, `good`, `bad`. Hex is rejected. `bad` boxes, cells and arrows are dashed so the meaning survives color blindness.

### Components

Each one shows an idea directly; pick by the concept map in the rules. `unblackbox components <type>` prints its exact fields (with what its parts and edges are called), what `set` can change and a worked example; `unblackbox components --sheet --family <f>` shows them. Annotations (`callout`, `brace`, `badge`, `bubble`) attach with `on` or `from`/`to`, follow their target, cost no on-screen slot, and must be removed before it.

| type | shows | `set` changes |
|---|---|---|
| **collections** | | |
| `stack` | a stack, last in first out: a call stack, undo history | items, highlight |
| `ring` | slots around a circle with named pointers: ring buffer, hash ring | slots, pointers |
| `table` | database rows under column names: a table, an index lookup | rows, highlight |
| `kv` | keys mapped to values: a cache, hash map, session store | entries, highlight |
| `log` | an append-only log with offsets and consumer cursors: WAL, Kafka topic | entries, start, cursors |
| `grid` | a 2D grid of cells: memory pages, a bitmap, a heatmap | rows, highlight |
| `bytes` | bytes in a row with named fields: a binary layout, packet header | values, highlight |
| **graphs** | | |
| `tree` | a hierarchy: DOM, B-tree, org chart, call tree | nodes, highlight |
| `graph` | nodes and links: service dependencies, a DAG, a network | highlight, edges |
| `states` | a state machine or lifecycle; the current state glows | current |
| `flow` | a flowchart: decision logic or an algorithm, the active step lit | active |
| `layers` | a stack of layers: OSI, middleware, abstraction levels | highlight |
| `files` | where code lives: a file tree with folder and file icons | entries, highlight |
| `commits` | git history: branches, commits, merges and HEAD | commits, head |
| **time** | | |
| `timeline` | events on a time axis: a TTL window, ordering, history, with a gliding 'now' | cursor, events |
| `sequence` | a sequence diagram: who sends what to whom, in order (handshake, request/reply) | shown |
| `lanes` | work on parallel time lanes: threads, serial vs parallel, race conditions | bars, cursor |
| `timer` | a countdown ring that drains: a timeout, lease, backoff or TTL | remaining |
| `cycle` | steps that repeat around a loop: event loop, retry loop, reconcile loop | active |
| `pipeline` | stages in a row, each with a status: CI, ETL, a middleware chain | stages |
| **control** | | |
| `toggle` | a switch with two states: feature flag, circuit breaker, config switch | on |
| `lock` | a lock and who holds it: mutex, row lock, lease, leader lock | locked, owner |
| `tokens` | tokens taken and refilled: rate limit, semaphore, connection pool | filled |
| `gauge` | a dial with a needle and zones: load, CPU, saturation | value |
| `progress` | a bar filling up: migration, replication catch-up, upload | value |
| `counter` | a number that changes: retries, version, p99 latency, a count | value |
| `checklist` | items ticked off: health checks, acceptance criteria, steps done | items |
| **infra** | | |
| `store` | where data rests: a database, a disk or an object bucket, with how full it is | fill |
| `cluster` | replicas of one service: who leads, who is down or behind (replication, failover) | nodes |
| `shards` | a keyspace split into ranges, each owned by a node (partitioning, sharding) | ranges, highlight |
| `memory` | an address space: stack, heap, buffers as regions, and what points into them | regions, pointers |
| `barrier` | a line systems cannot cross freely: network partition, firewall, trust boundary | broken |
| `device` | what the user sees right now: a phone, laptop or browser screen | lines, button |
| **messages** | | |
| `message` | an event, command or email: a card with its kind's icon, a title and key/value fields | fields, highlight |
| `request` | an HTTP call: method and path, then the status code and latency | status, latency |
| `token` | a signed token (JWT): colored segments and a seal that breaks when tampered | segments, tampered |
| `json` | a data shape, payload or config file as pretty-printed JSON | value, highlight |
| `diff` | a change to a file: kept, removed and added lines | lines |
| `terminal` | a shell session: commands and their output, new lines type in | lines |
| `transform` | a function that turns input into output: hash, encrypt, compress, compile | input, output |
| **charts** | | |
| `bars` | quantities side by side: latency per region, jobs per worker | bars |
| `chart` | a value over time: latency, queue depth, a spike past a limit | series |
| `donut` | shares of a whole: cache hit ratio, traffic split | slices |
| `compare` | two or three options side by side: before/after, A vs B, a trade-off | columns |
| `venn` | overlapping sets: shared permissions, common dependencies | items, highlight |
| `funnel` | stages that filter: requests through auth, rate limit and cache | stages |
| **annotations** | | |
| `callout` | a note with a short leader line pointing at one detail | - |
| `brace` | a curly brace grouping a span of elements: one transaction, a batch | - |
| `badge` | a small tag on a corner: v2, stale, cached | text |
| `bubble` | a speech or thought bubble: what an actor says, wants or believes | - |

## Actions

| op | effect |
|---|---|
| `add` | element fades in |
| `remove` `{id}` | fades out; remove arrows before the elements they connect |
| `move` `{id, to}` | glides to a new position; arrows follow their ends |
| `trace` `{ids, label?, icon?, speed?, color?}` | a packet travels along these arrows (or component edges like `flow.retry`) in order, `speed` seconds each (default 1); with `label`/`icon` it shows what travels; for the example case name the instance ("order 1042", "Ana's edit"); `color: "bad"` for a failing request. Each arrow should start where the previous ended |
| `focus` `{id, lines?}` | one id or a list of ids dims everything else already on screen; elements added at the same moment or later stay bright. One code id + `lines: [[from, to], ...]` (1-based) dims its other lines and leaves other elements as they were |
| `unfocus` | clears focus |
| `camera` `{to? or on?, zoom?}` | pans so `to` (or the element `on`) is screen center and zooms (1 = whole canvas, 2 = half the canvas fills the screen); use it to dive from a system into its components; `{}` resets |
| `set` `{id, state}` | a component's state changes and animates there: a gauge needle moves, a lock closes, a state machine changes state, a node goes down. `state` holds only the fields the type lets `set` change (`unblackbox components <type>`); the result is checked like a new element |
| `fill` `{id, items, highlight?}` | short for `set` on `cells`, same slot count: the example's order lands in the queue, a slot empties. `highlight` the slots that changed |
| `pulse` `{id}` | one attention ring around an element: "look here", without changing anything |
| `color` `{id, color}` | an element changes color over 1.2 s to show a change of state: a component failing (`bad`, which also turns it dashed), recovering (`good`), becoming the subject (`accent`). Not for code |
| `morph` `{id, code}` | code animates to new source; unchanged tokens glide to their new spot |
| `clear` | removes everything, resets focus and camera |

Ids are unique for the whole video; use a new id when re-adding something.

## Warnings `validate` gives

Too dense: more elements on screen than the audience limit; a beat longer than the word limit; a video over about 6 minutes. Too low-level: a function, variable or constant name (`isExpired`, `ONE_DAY_MS`) in narration; code over 8 lines; code in more than a quarter of the beats; narration that reads a code line aloud. Layout: footprints that overlap; an element past the canvas edge. Too wordy, not visual: a label over 5 words (8 for titles); many text elements; boxes without any icons. No real example: the traces with one concrete label (a number, name or file: "order 1042", "Ana", "queue.json"; not a lowercase kind like "order") do not pass through at least 3 arrows between them (1 when the video has fewer than 3 arrows). Also: a chapter label over 4 words; an unlabeled arrow; a component name (`OrderService`) spoken before it is on screen; a trace whose arrows do not connect; a think beat that is not a question; more than two think beats. Fix them unless you have a reason not to.

Examples: `examples/queue-decoupling.json` (system: one real order traced end to end, icons, cells, packets, focus, think) and `examples/magic-numbers.json` (a small code change, the rare case where code is the subject).

## Playground (interactive sandbox)

A playground is a small Tauri app where the viewer plays with the system the video explained: buttons trigger events (send an order, crash a worker) and clicking a component explains it, with the same board, icons, colors and voice as the video.

| command | what it does |
|---|---|
| `unblackbox game topic.game.json` | about 20 s. Validates, voices every line, and writes `out/<topic>-play/`: the player exe, the game data, a web build, and `sheet.png` (the board plus the end state of every line). Prints `{ok, out, exe, sheet, warnings}` with the same kind of paths as `validate` |
| `unblackbox play out/<topic>-play` | opens it. The folder is the deliverable: open the player app in it (an .exe on Windows), or share the folder. A player runs only on the OS it was built on |
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
- `intro`, `inspect.<id>` and every outcome are lines `{ say, do }`. Their `do` may only use `trace`, `color`, `set`, `fill`, `pulse`, `focus`, `unfocus`, `camera` and `move`.
- `events`: up to 8 buttons `{ id, label, icon, outcomes }`. A press runs the first outcome whose `if` matches; `if` maps element ids to the color they have right now (arrows start `muted`, everything else `accent`). Colors are the sandbox's state, so a `color` op changes what later presses do. The last outcome has no `if`.
- One-time setup: the `setup` skill with playgrounds, or `node scripts/setup.mjs --playground` (needs Rust). Without it `game` still writes the data and the web build and warns that the exe is missing.

Example: `examples/queue-decoupling.game.json`.
