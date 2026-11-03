# unblackbox playground v2: Live Board

## 1. Problem

The playground today is a remote control for clips the author recorded in advance. Each button runs the first outcome whose `if` matches the current element colors. That outcome plays a canned animation and a line voiced ahead of time. There are no entities, no clock, no parameters and no emergent behaviour, so the system cannot answer a viewer's "what if". It can only confirm the author's script. Each scripted branch can be explored once, and then there is nothing left to try.

The current example also shows what hidden state does. Its line says that orders "wait in the queue", but the queue cells never fill. The claim cannot be seen or checked. With colors as the only state, each element holds one bit, so "3 orders waiting" or "the worker holds order 1043" cannot be expressed.

A viewer learns a system by changing a cause and seeing a true consequence. The design below replaces scripted outcomes with a small simulation that runs from data.

## 2. What the research says

| Pattern | Source |
|---|---|
| A calm opening with one obvious first move, cued by layout and not by text | Podolefsky, Moore, Perkins 2013 (PhET implicit scaffolding) |
| Consequences computed from a model, so every input has a true answer | Bret Victor, Explorable Explanations |
| Bounded knobs: the extremes are chosen to straddle the tipping point, and context variables are locked | PhET Energy Skate Park |
| Progressive disclosure: one new part per stage, full sandbox last | Nicky Case, Parable of the Polygons, Evolution of Trust |
| Guided discovery beats pure discovery: say where to look, not what the rule is | Mayer 2004; Kirschner, Sweller, Clark 2006 |
| No hidden state: every quantity is drawn | Victor, Learnable Programming |
| Time is a control: pause, step, slow motion | Victor, Ladder of Abstraction; RaftScope |
| Same trial with one change, and a ghost of the previous run to compare against | PhET Return Skater; de Jong and van Joolingen 1998 |
| Predict, observe, explain: commit before the reveal | White and Gunstone 1992 |
| Goals checked against the real sim, including goals that ask the viewer to break something | Learn Git Branching; The Incredible Machine; Case, "Puzzle it out" |
| A visible buffer exposes the bottleneck; failure comes from load meeting capacity | Factorio and shapez belts; Mini Metro |
| Fault injection by clicking the part you suspect | RaftScope; Jepsen nemesis |
| A post-mortem that replays from the first cause, slowly | Server Survival game-over analysis; Kerbal criticism |

The pitfalls that shaped the design:

- A raw sandbox shown first overwhelms novices.
- When the author writes the answer key by hand, it drifts away from the sim.
- An expression language lets an LLM write plausible nonsense.
- A sim that is not deterministic breaks replay and build-time checks.
- A flood of packets is unreadable at the calm 1.2 s easing.

## 3. The design

### Core loop

The board from the end of the video is already running when the playground opens. Numbered entities (order 1041, 1042) ride the arrows, sit in the cells and wait at workers. The loop is:

1. The viewer changes one cause: a slider, a choice, a fault, or taking a part out.
2. The engine computes what follows, tick by tick.
3. The effects appear as the same component states the video used. Cells fill with real order numbers. A worker turns accent when busy and bad (drawn dashed) when down. A dropped order fades out with a badge that gives the reason.
4. Probes turn hidden quantities into counters and a chart.
5. The first time an emergent event happens, a line voiced ahead of time names the mechanism.

Stages and challenges wrap this loop with predict, run, explain, fix, and also "break it".

### Player tools

| Tool | What it does |
|---|---|
| Sliders and choices | Change params within the author's ranges (rate, workers, overflow block/drop, ack take/done, retry on/off, dedupe on/off). |
| Faults | Arm a fault chip or right-click a part. Only the parts whose kind accepts that fault glow. Clicking again restores. |
| Remove | Take out the part the video argued for (queue, cache, lock). Its arrows fade out and a bridge arrow fades in. |
| Burst | Make a source emit N entities at once. |
| Inspect | Click a part to hear its voiced sentence. A silent callout shows live numbers ("3 waiting, 0 lost"). |
| Packet click | Drop a packet in flight, on arrows that allow it (phase 4). |

When the playground opens, `start.primary` makes exactly one control glow.

### Time controls

The time controls are pause, step to the next event, speed 0.5x, 1x and 2x, and Replay. Replay reruns from t=0 with the same seed and the current knobs. The previous run stays on the chart as a muted dashed series, under a label that lists only what changed ("workers 1 → 2").

Scrub, fork and follow-entity are deferred until playtests ask for them (phase 5).

### What is simulated

Four node kinds move entities, and three link policies control how they travel.

| Kind | Draws on | Rules |
|---|---|---|
| `source` | icon, box | Emits on an even clock by default; Poisson is opt-in. Names come from a template. |
| `queue` | cells, log | FIFO. Capacity is the slot count. `overflow`: block or drop. `ack`: take (removes the entity when a worker takes it) or done (keeps a copy until the worker finishes). |
| `worker` | box, icon | Takes `time` per entity and has `concurrency` slots. A worker always holds a finished entity until downstream accepts it, which is where backpressure comes from. `full`: wait or refuse, for arrivals at a busy worker. `awaits: true` keeps a slot busy until downstream finishes. |
| `sink` | icon, box, store | Terminal. Optional `time` and `dedupe`. |

Links have `latency`, `retry {timeout, max, backoff, enabled}` and an optional fault `cut`.

The engine emits reason-typed events that notes can key on: `blocked`, `dropped`, `refused`, `lost`, `redelivered`, `retried`, `duplicate`, `down`, `drained`, `removed`. A `blocked` event at X means a sender other than a queue holds an entity because X will not take it.

### Goals and scenarios

Stages are optional. Without them the file is one sandbox stage. Each stage reveals one or two controls or readouts and may attach one challenge. A challenge has:

- a setup: params, removed parts, a fault script;
- the controls it allows;
- an optional predict: 2 to 4 options, each a predicate;
- an optional goal, which can be a fix goal or a break goal;
- hints;
- a solution.

The challenge's fault script is shown in the side panel as a timeline with a cursor moving along it, so the viewer can plan before it arrives. On failure, the post-mortem re-simulates headless to 3 s before the first breach of the goal. It replays from there at 0.5x and pulses the element the breached metric reads from, or the goal's own `pulse` target if it names one. Hints escalate: first a pulse, then which variable to look at. For novices, a worked example autoplays after two failures.

### What the viewer sees and hears

The board keeps the video's visual language: 16x9 grid, semantic colors, 1.2 s easing. Speech is always voiced ahead of time with Kokoro. Fixed setup numbers may be spoken. Live metric values never are; they appear on probes.

All lines share one audio channel, with priorities in this order: challenge and predict, stage, note, inspect. A line that is dropped appears as a caption. Above 1x, notes appear as captions only.

## 4. Spec format

The file is `*.game.json` with `"version": 2`. Every object is a zod strictObject.

| Type | Shape |
|---|---|
| `Num` | number, or `{ "param": id }` |
| `Param` | `{ label, min, max, step, value, unit?, from? }` or `{ label, options: enum values, value, from? }`. The options must be values of the field they feed. |
| `Pred` | `{ metric, atMost? or moreThan? (exactly one), at?: "peak" or "end" }` |
| `When` | a `Pred`, or `{ all: Pred[] }` (one level only) |
| `ControlId` | one of: `param`, `node.fault`, `link.cut`, `node.remove`, `source.burst` |
| `Metric` | `node.length`, `dropped`, `refused`, `busy`, `utilization`, `done` or `duplicates` (only those the kind has); `span.p50`, `p90` or `max`; `lost`; `done` |
| `Span` | `{ from, to }`. It ends when `to` hands the entity on. |
| `Note` | `{ on: event, at?: id, say, once? }` or `{ when: When, say }` |

Top level:

```
version, title, audience, sources, start{primary}, scene,
sim{seed, entity, params, nodes, links, spans},
probes[≤4], notes[≤8], inspect, stages?, challenges[≤4]
```

The minimal valid game is `scene` + `sim` + `probes`.

### Complete example: the queue

```json
{
  "version": 2, "title": "Queue playground", "audience": "intermediate",
  "sources": ["illustrative example, not a real codebase"],
  "start": { "primary": "rate" },
  "scene": [
    { "op": "add", "type": "icon", "id": "customer", "icon": "user", "label": "Customer", "at": [1.3, 3.4] },
    { "op": "add", "type": "box", "id": "checkout", "label": "Checkout", "icon": "shopping-cart", "w": 2.6, "at": [4.4, 3.4] },
    { "op": "add", "type": "cells", "id": "queue", "items": ["", "", "", ""], "label": "Queue", "at": [8, 3.4] },
    { "op": "add", "type": "box", "id": "worker", "label": "Email worker", "icon": "cog", "w": 2.6, "at": [11.6, 3.4] },
    { "op": "add", "type": "icon", "id": "mail", "icon": "mail", "label": "Mail", "at": [14.8, 3.4] },
    { "op": "add", "type": "arrow", "id": "pay", "from": "customer", "to": "checkout", "label": "pay" },
    { "op": "add", "type": "arrow", "id": "enqueue", "from": "checkout", "to": "queue", "label": "order" },
    { "op": "add", "type": "arrow", "id": "deliver", "from": "queue", "to": "worker", "label": "next" },
    { "op": "add", "type": "arrow", "id": "send", "from": "worker", "to": "mail", "label": "send" },
    { "op": "add", "type": "badge", "id": "workerCount", "on": "worker", "text": "x1" },
    { "op": "add", "type": "chart", "id": "depth", "xLabel": "last minute", "yLabel": "waiting", "series": [{ "label": "queue", "points": [0, 0] }], "at": [4.4, 6.9] },
    { "op": "add", "type": "counter", "id": "wait", "label": "customer wait", "value": 0, "unit": "s", "at": [10, 6.9] },
    { "op": "add", "type": "counter", "id": "lost", "label": "orders lost", "value": 0, "at": [13.4, 6.9] }
  ],
  "sim": {
    "seed": 7,
    "entity": { "kind": "order", "icon": "receipt", "first": 1041 },
    "params": {
      "rate": { "label": "Orders per second", "min": 0.2, "max": 2, "step": 0.1, "value": 0.5, "unit": "/s" },
      "workers": { "label": "Workers", "min": 1, "max": 3, "step": 1, "value": 1 },
      "overflow": { "label": "Queue full", "options": ["block", "drop"], "value": "block" },
      "ack": { "label": "Remove from queue on", "options": ["take", "done"], "value": "take" },
      "retry": { "label": "Retry sending", "options": ["off", "on"], "value": "off" },
      "dedupe": { "label": "Idempotency key", "options": ["off", "on"], "value": "off" }
    },
    "nodes": {
      "customer": { "kind": "source", "rate": { "param": "rate" }, "burst": 5 },
      "checkout": { "kind": "worker", "time": 0.3, "concurrency": 4, "full": "refuse" },
      "queue": { "kind": "queue", "overflow": { "param": "overflow" }, "ack": { "param": "ack" }, "removable": { "bridge": "order" } },
      "worker": { "kind": "worker", "time": [1.2, 1.8], "concurrency": { "param": "workers" }, "awaits": true, "faults": ["down", "slow"], "show": { "concurrency": "workerCount" } },
      "mail": { "kind": "sink", "time": 0.5, "faults": ["slow"], "dedupe": { "param": "dedupe" } }
    },
    "links": {
      "pay": { "latency": 0.8 },
      "send": { "latency": 0.8, "retry": { "enabled": { "param": "retry" }, "timeout": 1.5, "max": 2 } }
    },
    "spans": { "customerWait": { "from": "customer", "to": "checkout" } }
  },
  "probes": [
    { "metric": "queue.length", "show": "depth", "series": "queue" },
    { "metric": "customerWait.p90", "show": "wait" },
    { "metric": "lost", "show": "lost" }
  ],
  "notes": [
    { "when": { "metric": "queue.length", "moreThan": 1 }, "say": "Orders are piling up in the queue." },
    { "on": "blocked", "at": "queue", "say": "The queue is full. Checkout holds the next order and waits." },
    { "on": "dropped", "at": "queue", "say": "The queue was full, so this order was thrown away." },
    { "on": "lost", "at": "worker", "say": "The worker crashed holding this order. Nobody else had it." },
    { "on": "redelivered", "at": "queue", "say": "The queue kept a copy, so the order goes out again." },
    { "on": "blocked", "at": "worker", "say": "Without the queue, checkout waits for the worker. So do customers." },
    { "on": "duplicate", "at": "mail", "say": "Mail got the same order twice. The retry could not know the first send worked." }
  ],
  "inspect": {
    "queue": { "say": "The queue holds orders until a worker is ready." },
    "worker": { "say": "The worker takes one order per slot and waits for mail." }
  },
  "stages": [
    { "id": "run", "title": "Watch it run", "say": "Orders flow on their own. Drag the rate and watch the queue.", "controls": ["rate"], "reveal": ["depth"] },
    { "id": "crash", "title": "Crash it", "controls": ["worker.down", "overflow"], "reveal": ["lost"], "challenge": "keepIt" },
    { "id": "unplug", "title": "Take it out", "controls": ["queue.remove", "worker.slow", "rate"], "reveal": ["wait"], "challenge": "unplug" },
    { "id": "twice", "title": "Send twice", "controls": ["retry", "mail.slow", "dedupe"], "challenge": "twice" },
    { "id": "free", "title": "Sandbox", "controls": "all" }
  ],
  "challenges": [
    {
      "id": "keepIt", "ask": "The worker will crash while holding an order. Lose nothing.",
      "setup": { "params": { "ack": "take" }, "script": [{ "at": 5, "fault": "worker.down", "when": "busy", "for": 8 }] },
      "controls": ["ack", "workers"], "by": 30,
      "predict": {
        "ask": "What happens to the order the worker was holding?",
        "options": [
          { "say": "It is sent later", "when": { "metric": "lost", "atMost": 0 } },
          { "say": "It is lost", "when": { "metric": "lost", "moreThan": 0 } }
        ]
      },
      "goal": [{ "metric": "lost", "atMost": 0 }],
      "hints": [{ "pulse": "queue", "say": "When does the queue let go of an order?" }],
      "success": "The queue kept the order until its email was sent. The crash only delayed it.",
      "fail": "An order was lost in the crash. Where was it when the worker went down?",
      "solution": [{ "at": 0, "param": "ack", "value": "done" }]
    },
    {
      "id": "unplug", "ask": "Without the queue, the worker turns slow for ten seconds. What do customers feel?",
      "setup": { "removed": ["queue"], "script": [{ "at": 5, "fault": "worker.slow", "for": 10 }] },
      "controls": [], "by": 25,
      "predict": {
        "ask": "What do customers feel?",
        "options": [
          { "say": "Nothing changes", "when": { "metric": "customerWait.p90", "at": "peak", "atMost": 2 } },
          { "say": "They wait at checkout", "when": { "metric": "customerWait.p90", "at": "peak", "moreThan": 2 } }
        ]
      }
    },
    {
      "id": "twice", "ask": "Make mail send one receipt twice.",
      "controls": ["retry", "mail.slow"], "by": 30,
      "goal": [{ "metric": "mail.duplicates", "moreThan": 0 }],
      "success": "A slow send looked like a failed one, so the worker sent it again.",
      "solution": [{ "at": 0, "param": "retry", "value": "on" }, { "at": 2, "fault": "mail.slow" }]
    }
  ]
}
```

A few numbers in this example are worth checking by hand:

- The baseline customer wait is 0.8 s on the pay link plus 0.3 s at checkout, so 1.1 s.
- Slow mail takes 0.8 + 0.5 × 4 = 2.8 s, which is past the 1.5 s timeout. That is why the retry produces a duplicate.
- When the queue is removed, the bridge sends checkout's orders straight to the worker, so `blocked at worker` can fire.

The sandbox stage may use the expert on-screen limit.

### Sketches for other systems

- **Cache.** A new kind, `cache`, on a kv element: `{ "kind": "cache", "ttl": {"param": "ttl"}, "routes": { "hit": "hitBack", "miss": "toDb" } }`. The source gains `keys: { pool: [...6], skew: "hot" }`. The new events are `expired` and `miss`. Probes: hit ratio on a donut, db utilization on a gauge. Challenge: keep the database under 80% busy. The lever is TTL; the decoy is cache size. Removing the cache shows the full load landing on the database.
- **Rate limiter.** A new kind, `bucket`, on a tokens element: `{ "kind": "bucket", "refill": {"param": "refill"}, "empty": "refuse" }`. Capacity is `tokens.capacity`. A burst on the source empties the bucket. Challenge: "serve a burst of eight with at most two refused". With retry and no backoff, a retry storm emerges.
- **Raft leader election.** A kind called `replicas` on a cluster element, with a barrier for partitions: `{ "kind": "replicas", "heartbeat": 0.5, "electionTimeout": [{"param": "tmin"}, {"param": "tmax"}] }`. Faults: `db.n1.down` and `split.cut`. Events: `elected`, `splitVote`, `noLeader`. This is a hand-written protocol behaviour, not something that emerges from the four kinds. Its stated assumptions are that terms are simplified and log matching is left out.

## 5. Validation and lint

`unblackbox game x.game.json --check` takes under 1 s and does not synthesize voice. Every finding carries a game-file path.

**Shape (zod)**

```
sim.nodes.worker.lable: unrecognized key 'lable' (did you mean 'label'?)
sim.params.workers.value: 4 is outside 1..3
sim.nodes.queue.ack: param 'retry' has options off, on; ack needs take, done
challenges.0.goal.0: use exactly one of atMost or moreThan
```

**Static semantics.** These run on top of the existing `checkSemantics` for the scene.

```
sim.nodes.queue.kind: a queue needs a cells or log element; 'queue' is a box
sim.nodes.mail: no flow arrow reaches 'mail'
sim.nodes.queue.removable: a bridge needs one arrow in and one out; 'queue' has 2 out
stages.1.controls.0: 'worker.crash' is not a control; worker faults are down, slow
stages.1.controls: 'worker.down' is driven by challenge keepIt's script; it cannot also be a control
probes.1.show: 'lost' is a box; a number needs a counter, gauge, progress or chart
probes: chart 'depth' has 3 series plus 1 ghost; the limit is 3
challenges.0.goal.0.metric: 'lost' is not revealed in stage crash (no hidden state)
notes.2.say: live numbers go stale in speech; show them with a probe
stages.2: 8 things in view; intermediate allows 7
```

**Headless runs.** For each of 4 seeds, the build runs:

- the defaults;
- each numeric param at its min and at its max;
- each choice option;
- each fault, switched on at t=10 for 20 s;
- each removal;
- each challenge's setup alone, setup plus solution, and setup plus each single allowed control.

Every patch the engine emits goes through `def.setSchema` and `def.check`. The findings look like this:

```
challenges.0.solution: lost = 1 at t=30 (seed 3); goal needs lost ≤ 0
challenges.0: setup already meets the goal on all seeds; it teaches nothing
challenges.0.predict.options: no option holds on seed 2; use even arrivals or a 'when: busy' fault
challenges.2.controls (warning): every control passes alone; add a decoy or a reason
challenges.0.controls (warning): 9 of 9 settings pass; barely a puzzle
notes.4: never fired in 44 runs
sim.params.rate (warning): min and max change no probe by more than 10%; widen past the tipping point
probes.1: counter 'wait' reached 12.35; shown as 12.4 (fixed width), footprint checked at that width
```

## 6. Engine architecture

| Module | Role |
|---|---|
| `src/sim.ts` (new, about 450 lines) | A pure `step(world, inputs)` with a fixed 0.1 s tick. Holds the kinds table: per kind, its allowed component types, metrics, faults, `tick`, and `view(state) → set/fill patch`. Emits events. |
| `src/game.ts` | The v2 schema, static checks, `verify()` headless runs and path mapping. The v1 events/outcomes code is deleted. |
| `src/live.ts` (new, about 80 lines) | LiveTimeline and projector. It builds the Timeline once from the scene and pushes effects at the current frame. Every second it compacts: `tr.el = stateAt(tr, frame - anim)` and drops finished traces. |
| `src/video/Video.tsx` | Split into a pure `Board({t, frame})` and `Video` (Board plus the audio Sequences). Videos do not change. |
| `play/main.tsx` | Drops the Remotion Player. Runs its own requestAnimationFrame clock with an accumulator, the panel, and the audio queue. |

**Rendering path.** The sim effects become the existing Timeline shapes: fill and set patches, color changes, one TraceEvent per hop, pulses and engine badges. The projector lifts the set/fill branch of `checkSemantics` into `applyPatch()`, so the build and the runtime share one validator. Every component renderer, the Traces renderer, `arrowPath` and `edgePoints` are reused unchanged.

**Readability.**

- At most 3, 4 or 5 labelled packets are in flight (by audience). Other entities are drawn as plain dots up to 12; above that cap, the arrow shows a "+N" badge.
- A color holds for at least 1.2 s before it can change again.
- Probes sample every 2 s or slower.
- Counter values are formatted to a fixed width.

**Determinism.** The RNG is mulberry32 seeded from `sim.seed`. Ticks are integers and inputs are stamped with tick numbers. Rules are evaluated in spec order, and the engine never iterates a map over keys added at runtime. Snapshots are taken every 1 s, for Replay and the post-mortem. A golden-run test in CI catches drift.

**Voice.** Every `say` is voiced at build through `voiceBeats` and the sha256 cache, keyed by path. The player plays them through one HTML audio element with priorities and a rule that drops stale lines. Audio pauses and changes speed with the sim clock.

**Performance.** Thanks to compaction, the cost per frame stays flat. Phase 2 must pass a 10-minute soak test. The clock lives in the Board subtree and the panel is memoized.

## 7. Agent workflow

The skill gets a playground chapter:

1. Start from the video's final scene. Add at most 3 probe elements, placed with `place`.
2. Map each runtime part to a kind: what makes work (source), what stores it (queue), what processes it (worker), where it ends (sink). Never invent a kind. If the lesson is not about flow, load or failure, ship the video without a playground.
3. Take numbers from the code and cite them as `file:line` in `from` or in `sources`. A number with no source is marked "illustrative". Take `ack` from how the code acknowledges messages, `awaits` from where the code awaits a downstream call, and `retry` from config.
4. Choose ranges where the min is comfortable and the max is past the tipping point.
5. Write one note for each emergent moment the video promised. Prefer event-keyed notes, because the engine knows the reason.
6. Write one challenge for each key idea of the video. Use a single metric with complementary thresholds for the predict options, include one decoy control, and add one "break it" goal.
7. Loop: `unblackbox schema game`, write the file, then `game --check`. The check prints a run table: for each run, peak queue length, lost, span p90, and the notes that fired. Fix everything it reports. Then run the full `unblackbox game` and review `sheet.png`, which shows the board at t=0, at each note's first firing, and at each challenge's end with and without its solution.

`unblackbox components <type>` gains a `kinds:` line that lists the kinds a type can carry.

## 8. Delivery plan

| Phase | Scope | Done when |
|---|---|---|
| 1. Headless engine | `sim.ts` with the four kinds, faults, removal, retry and dedupe, the v2 schema, static checks, `--check` with the run table, and the queue example ported | The example verifies on 4 seeds. One assert self-check covers drop, block, ack take vs done on crash, and retry duplicates. |
| 2. Live board | Board/Video split, own clock, `live.ts` compaction, packet level of detail, sliders and choices, fault glow and click, remove, pause, step and speed, notes with the audio queue, `start.primary` | The queue example plays as one sandbox stage and the 10-minute soak shows flat frame time. |
| 3. Guided play | Stages, challenges, predict, post-mortem, hint ladder, Replay with ghost, the fault-script timeline in the panel, `sheet.png` from snapshots | Its 3 challenges pass the build checks, and in a playtest a viewer explains ack and decoupling unprompted. |
| 4. Catalog and kits | Cache on kv, bucket on tokens, packet click to drop, add-part kits with fixed slots | Each new kind ships with an example that verifies. |
| 5. Deferred | Scrub with fork, follow entity, the replicas and history protocol kinds | Only when playtests or two real videos need them. |

## 9. Decisions (2026-11-03)

1. v1 events/outcomes format is dropped; the queue example is rewritten in v2.
2. The playground gets its own clock and stops using the Remotion Player; videos keep using it.
3. The playground opens in the guided stages; the full sandbox is the last stage.
4. Structural edits include add-part kits (a second worker, a cache, a retry) as well as remove-with-bridge. Kits move from phase 5 into phase 4 and bring their own layout slots and fuzz checks.
5. Topics that are not about flow (git, auth tokens, raft) ship the video only until a protocol kind exists.
6. A challenge waits for Run after the predict step, so the player sets the levers first: a lever changed a second into the run would act on orders that already moved, and the build's solution moves start at 0 s.
7. The post-mortem replays from 3 s before the first breach of an "at most" goal to 5 s after it, at half speed, with the same inputs at the same ticks.
