# What the finished video must be

The viewer should come away with a picture of **how the system works**: which parts it has, what each part is for, and how they work together. They should not come away with the details of a function. These rules come from research on how people learn complex systems (`reports/Understanding code architecture quickly.md`) and from viewer feedback: earlier videos were too fast, too dense, too wordy and too low-level, and they jumped between too many scenes. `validate` checks the mechanical rules; the rest are on you.

## Level: systems and components, not functions

1. **Show parts, not code.** The cast is systems (`group`), key components and classes (`box` with an icon), actors (`icon`), the data that moves between them (`trace` packets) and the ideas that make the design work, each drawn with the component that shows it (see "Show the idea" below). Name a class only if it is a key component. Never narrate function names, variables or line-level logic.
2. **Code is rare.** At most 2 or 3 beats, each a glimpse of a key type or interface (8 lines or fewer) that makes an idea concrete. Most system videos need none.
3. **One question.** The first beat states it ("what happens between pressing Pay and the receipt arriving?"). 2 to 3 minutes, about 12 to 15 beats, and about 6 to 10 things on the board by the end. Leave out what the question does not need; a second question is a second video.

## Structure

4. **One scene that grows.** The whole video is one board. It starts nearly empty (the actor and the first part) and grows as the story reaches each part, so the last frame is the whole system and every frame before it is part of it. Change the board, never swap it: add the next part, draw an arrow when something first flows, `set` a component's state, `color` what fails or recovers, `move` things to make room, `camera` zoom into one part for detail and back out, `emphasis: "quiet"` what is now background. Do not `clear` (at most once, for a genuinely new act) and do not remove something just to show a similar thing elsewhere. A viewer should be able to say what changed between any two beats in a few words.
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
- Chapters mark the sections (problem, trap, fix); one `transition: "slide"` at a section change is enough, the rest fade.
- Colors carry meaning only: `accent` for the subject, `muted` for context, `good`/`bad` for outcomes. No decoration.

## Calm pacing

- One idea per beat: one short sentence or two, under ~16 words. Fewer, slower beats beat many quick ones; leave quiet between lines (about 90 spoken words a minute, under 4 new things a minute).
- Change one or two things per beat, never more than three. Stagger them with `wait` (a second or more apart) and let each settle before the next.
- Put each visual change in the beat whose sentence names it, and `focus` what you are talking about.
- Talk like a colleague: "you", "we", plain words. Make it speakable: numbers as words, no code names, symbols as their meaning.

## Playground

- The board is the video's big picture, so the viewer recognizes it at once.
- 3 to 6 events. Each makes something visibly happen (a packet moves, a part changes color) and says what happened in one sentence.
- State matters: at least one event changes a part (crash it, slow it down), and other events behave differently because of it (`if`). That is how the player discovers how the system copes.
- Every key component has an inspect line: what it does, in one sentence.
- Same voice rules as the video: under ~18 words per line, labels only on screen.
