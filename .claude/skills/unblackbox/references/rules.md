# What the finished video must be

The viewer should come away with a picture of **how the system works**: which parts it has, what each part is for, and how they work together. They should not come away with the details of a function. These rules come from research on how people learn complex systems (`reports/Understanding code architecture quickly.md`) and from viewer feedback: earlier videos were too fast, too dense, too wordy and too low-level. `validate` checks the mechanical rules; the rest are on you.

## Level: systems and components, not functions

1. **Show parts, not code.** The cast is systems (`group`), key components and classes (`box` with an icon), actors (`icon`) and the data that moves between them (`trace` packets, `cells`). Name a class only if it is a key component. Never narrate function names, variables or line-level logic.
2. **Code is rare.** At most 2 or 3 beats, each a glimpse of a key type or interface (8 lines or fewer) that makes an idea concrete. Most system videos need none.
3. **One question.** The first beat states it ("what happens between pressing Pay and the receipt arriving?"). 2 to 3 minutes, about 14 to 18 beats.

## Structure

4. **The big picture first.** Open with the systems as groups, with their main components inside, before anything moves. At most about 4 named things per view (5 to 6 for experts); for more, `camera` zoom into one system or `clear` to a new view.
5. **One real example, end to end.** Pick one concrete, real-world case and follow it from the trigger to the visible result through every component: a named actor, a specific thing, real-looking data ("Ana buys two mugs, order 1042"; "rider 88 books a trip downtown"; "Sam resets a forgotten password"). Take it from the code: a real request type, a test fixture, seed data, a log line. Name it in the first beats, put it on the packet (`trace` with `label: "order 1042"` and an `icon`) and in the data it lands in (`fill` a queue slot with `"1042"`), and narrate what each part does with *that* case. Keep the same case for the trap and the fix ("the worker crashes while sending Ana's receipt"), so the viewer follows one story instead of abstractions.
6. **The why, from a real source.** Say why it is built this way, using a reason from docs, an ADR, a commit, a PR or a comment, and list it in `sources`. If no source gives a reason, say it is unknown. Never invent one.
7. **Problem before solution.** Show the pain, then the fix, then name the idea.
8. **Where it breaks.** One real trap (crash, retry, stale data): turn the affected parts `bad` with a `color` op, then `good` once the fix is shown.
9. **One prediction.** One `think` beat (3 to 5 s) at a section boundary, phrased as a question and answered in the next beat, ideally with a trace.
10. **A way out.** End with a one-line takeaway and the component or folder to look at next.

## Visual, not textual

- The picture carries the meaning: icons for every key component and actor, packets for what flows, cells for queues and collections (`highlight` the slot that matters), groups for systems, `color` changes for state. A viewer with the sound off should still see what moves where and what goes wrong.
- On-screen text is labels only: component names, what flows on an arrow, a short caption. Never a sentence; the voice explains.
- Every arrow says what flows along it. Lay components out along the flow so arrows do not cross; give a request/reply pair `offset: 0.25` each.
- Colors carry meaning only: `accent` for the subject, `muted` for context, `good`/`bad` for outcomes. No decoration.

## Calm pacing

- One idea per beat: one or two short sentences, under ~18 words. Fewer, slower beats beat many quick ones.
- Change one thing at a time. Stagger additions with `wait` and let each settle before the next.
- Put each visual change in the beat whose sentence names it, and `focus` what you are talking about.
- Talk like a colleague: "you", "we", plain words. Make it speakable: numbers as words, no code names, symbols as their meaning.

## Playground

- The board is the video's big picture, so the viewer recognizes it at once.
- 3 to 6 events. Each makes something visibly happen (a packet moves, a part changes color) and says what happened in one sentence.
- State matters: at least one event changes a part (crash it, slow it down), and other events behave differently because of it (`if`). That is how the player discovers how the system copes.
- Every key component has an inspect line: what it does, in one sentence.
- Same voice rules as the video: under ~18 words per line, labels only on screen.
