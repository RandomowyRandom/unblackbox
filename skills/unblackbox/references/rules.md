# What the finished video must be

The viewer should come away with a picture of **how the system works**: which parts it has, what each part is for, and how they work together. They should not come away with the details of a function. These rules come from research on how people learn complex systems (`reports/Understanding code architecture quickly.md`) and from viewer feedback: earlier videos were too fast, too dense, too wordy and too low-level, and they jumped between too many scenes. `validate` checks the mechanical rules; the rest are on you.

## Level: systems and components, not functions

1. **Show parts, not code.** The cast is systems (`group`), key components and classes (`box` with an icon), actors (`icon`), the data that moves between them (`trace` packets) and the ideas that make the design work, each drawn with the component that shows it (see "Show the idea" below). Name a class only if it is a key component. Never narrate function names, variables or line-level logic.
2. **Code is rare.** At most 2 or 3 beats, each a glimpse of a key type or interface (8 lines or fewer) that makes an idea concrete. Most system videos need none.
3. **One question.** The first beat states it ("what happens between pressing Pay and the receipt arriving?"). 2 to 3 minutes, about 12 to 15 beats, and 1 to 3 scenes of at most 5 to 7 things each. Leave out what the question does not need; a second question is a second video.

## Structure

4. **Few scenes, each one growing.** A scene is one picture of one part of the idea: the problem, the mechanism inside one component, the failure. Most videos need 1 to 3. Switch scenes (`clear`) only when the story moves to a part that needs its own picture, and give each scene at least 4 beats to grow and change; never switch just to show the next step. Inside a scene, change the picture, do not replace it: it starts nearly empty (the actor and the first part) and grows as the story reaches each part. Add the next part, draw an arrow when something first flows, `set` a component's state, `color` what fails or recovers, `move` a row together to make room (one change), `camera` zoom into one part for a detail and back out a beat or two later, `emphasis: "quiet"` what is now background. Keep a scene to what the viewer can hold (about 5 things for novices, 7 for most, 9 for experts); when it outgrows that, the next part of the idea is a new scene. Carry the same example and actors into the next scene so it reads as a closer look, not a new story. A viewer should be able to say what changed between any two beats in a few words.
5. **One real example, end to end.** Pick one concrete, real-world case and follow it from the trigger to the visible result through every component: a named actor, a specific thing, real-looking data ("Ana buys two mugs, order 1042"; "rider 88 books a trip downtown"; "Sam resets a forgotten password"). Take it from the code: a real request type, a test fixture, seed data, a log line. Name it in the first beats, put it on the packet (`trace` with `label: "order 1042"` and an `icon`) and in the data it lands in (`fill` a queue slot with `"1042"`), and narrate what each part does with *that* case. Keep the same case for the trap and the fix ("the worker crashes while sending Ana's receipt"), so the viewer follows one story instead of abstractions.
6. **The why, from a real source.** Say why it is built this way, using a reason from docs, an ADR, a commit, a PR or a comment, and list it in `sources`. If no source gives a reason, say it is unknown. Never invent one.
7. **Problem before solution.** Show the pain, then the fix, then name the idea.
8. **Where it breaks.** One real trap (crash, retry, stale data): turn the affected parts `bad` with a `color` op, then `good` once the fix is shown.
9. **One prediction.** One `think` beat (3 to 5 s) at a section boundary, phrased as a question and answered in the next beat, ideally with a trace.
10. **A way out.** End with a one-line takeaway and the component or folder to look at next.

## Show the idea, not a box

Every abstract idea in the story gets the component that looks like it. A lock is a padlock that closes, not a box labelled "Lock"; a timeout is a ring that drains; a retry is a loop. Change it with `set` while the narration says what happens (the needle rises, the node goes down), and `pulse` it when you point at it. Use a plain `box` only for a component of the system itself, and when no component fits the idea.

| the idea | component |
|---|---|
| cache, lookup, session store, index | `kv` (a DB table: `table`) |
| queue, batch, buckets | `cells`; an ordered, durable log with consumers: `log` |
| call stack, undo, LIFO | `stack` |
| ring buffer, consistent hashing, round robin | `ring` |
| memory pages, bitmap, heatmap | `grid`; stack vs heap, buffers: `memory` |
| binary format, header, flags | `bytes` |
| hierarchy, DOM, B-tree | `tree`; dependencies, network: `graph` |
| lifecycle, protocol states, circuit breaker | `states` (the switch itself: `toggle`) |
| decision logic, algorithm | `flow` |
| layers, middleware, OSI | `layers`; CI, ETL, request pipeline: `pipeline` |
| where code lives | `files`; history, versions, MVCC: `commits` |
| time, TTL, ordering | `timeline`; timeout, lease, backoff: `timer` |
| handshake, request/reply protocol | `sequence`; threads, races, parallel vs serial: `lanes` |
| event loop, retry loop, reconcile loop | `cycle` |
| mutex, lease, leader lock | `lock` |
| rate limit, semaphore, pool | `tokens` |
| load, saturation | `gauge`; catch-up, migration: `progress`; retries, versions, latency: `counter`; health checks: `checklist` |
| database, disk, bucket | `store`; replication, quorum, failover: `cluster`; partitioning: `shards` |
| network partition, trust boundary | `barrier`; what the user sees: `device` |
| event payload, message | `message`; HTTP call: `request`; auth token: `token`; data shape, config: `json` |
| a change, before/after code or config | `diff`; commands and their output: `terminal` |
| hashing, encryption, serialization, compiling | `transform` |
| amounts compared | `bars`; over time: `chart`; shares: `donut`; trade-offs: `compare`; overlap: `venn`; drop-off: `funnel` |
| point at a detail, group a range, tag a state, an actor's intent | `callout`, `brace`, `badge`, `bubble` |

## Visual, not textual

- The picture carries the meaning: icons for every key component and actor, packets for what flows, the matching component for every idea (`highlight` the slot that matters), groups for systems, `set` and `color` changes for state. A viewer with the sound off should still see what moves where and what goes wrong.
- On-screen text is labels only: component names, what flows on an arrow, a short caption. Never a sentence; the voice explains.
- Every arrow says what flows along it. Lay components out along the flow with `place` so arrows do not cross; give a request/reply pair `offset: 0.25` each, `curve` an arrow around something in its way.
- Chapters mark the sections (problem, trap, fix); a new scene usually starts a new chapter, and `transition: "slide"` on its first beat tells the viewer the picture changed on purpose. Within a scene keep the default fade.
- Colors carry meaning only: `accent` for the subject, `muted` for context, `good`/`bad` for outcomes. No decoration.

## Calm pacing

- One idea per beat: one short sentence or two, under ~16 words. Fewer, slower beats beat many quick ones; leave quiet between lines (about 90 spoken words a minute, under 4 new things a minute).
- Change one or two things per beat, never more than three. Stagger them with `wait` (a second or more apart) and let each settle before the next. A new system (`group`) is a change too: bring its parts in over the next beats, not with it.
- One new term per beat. A word the viewer does not know yet (signature, draining) gets the whole beat; leave out terms the question does not need.
- Put each visual change in the beat whose sentence names it, and `focus` what you are talking about.
- Talk like a colleague: "you", "we", plain words. Make it speakable: numbers as words, no code names, symbols as their meaning.

## Playground

- The board is the video's main scene as it ends, plus up to 4 probes, so the viewer recognizes it at once and sees every number that matters.
- Only systems about flow, load or failure get a playground: queues, workers, retries, overload, crashes, slow dependencies (a rate limit is a worker with `full: refuse`). Caches, git, tokens and consensus cannot be simulated yet; ship the video alone.
- Describe behaviour, not outcomes: map each part to a kind (what makes work, what stores it, what processes it, where it ends) and take every number from the code, cited in `from`. Ranges go from comfortable to past the tipping point.
- Guided first, free last: one new lever per stage, each stage with one challenge for one key idea of the video (predict, then fix, and one "break it"), the full sandbox at the end.
- One note per emergent moment the video promised, keyed to the event (`lost` at the worker), said once. Live numbers stay on probes, never in speech.
- Same voice rules as the video: under ~16 words per line, labels only on screen.
