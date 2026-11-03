---
name: unblackbox
description: Make short narrated explainer videos that show how a system works (its parts, key components and the flows between them) with the unblackbox CLI (JSON spec to MP4 with icons, system boundaries, animated data packets, occasional code, TTS voice), following research-backed rules so humans actually understand them, and on request an interactive playground app of the same system. Use this whenever someone wants a codebase, architecture, subsystem, protocol, design pattern or technical concept explained as a video, animation, visual walkthrough or onboarding clip, mentions unblackbox, or wants an explainer for a human audience, even if they never say "unblackbox".
---

# unblackbox explainer videos

You map the system, write one JSON spec, verify it, and render it. Nothing else. A 2 to 3 minute video should take about 10 minutes. If the user wants it, a playground follows (step 5).

Run `unblackbox <command>`. If the command is not found or fails with a missing module, run the `setup` skill first (`/unblackbox:setup` in Claude Code); it installs the tool and prints the exact command to use. First run `unblackbox guide` once. It prints the spec reference and the rules the finished video must meet. Both are short, and the rules are what make the video worth watching: system level, visual and calm.

## 1. Map the system

Work at the level of systems and components, not functions. That is what the video shows, and it is also faster to research. Read the README, docs and folder structure, and find:
- the main parts (services, modules, key classes) and what each one is for;
- how they talk to each other;
- one concrete, real-world case (a real request type, a test fixture, seed data) and its path through them, from trigger to result. The video follows that case end to end;
- the abstract ideas the viewer must grasp (a cache, a lock, a retry, a state machine, a quorum, a race) and the component that shows each one directly. Run `unblackbox components` for the list and use the concept map in the rules; draw an idea as a plain box only when no component fits.

Open source files only to confirm how parts connect and to check claims; you do not need function-level detail. Find why it is built this way from docs, ADRs, CHANGELOG, comments or `git log -S <term>`. Every claim must be true in the code.

## 2. Write the spec

Write `<topic>.json` following the rules from `unblackbox guide`. Copy the structure of `examples/queue-decoupling.json`: systems as groups, components as boxes with icons, actors as icons, one real case ("order 1042") traced end to end as a labelled packet and kept through the trap and the fix, little text. Show each idea with its component (`unblackbox components <type>` prints its fields, what `set` can change, and an example) and change it with `set` as the story moves. Lay things out with `place` instead of guessing coordinates. Put the files and commits you used in `sources`.

## 3. Verify

```bash
unblackbox validate topic.json
unblackbox still topic.json --tts silent
```

`validate` (under 1 s) must report no errors. Fix its warnings too; they flag videos that are too dense, too low-level or too wordy. `still` (about 5 s) writes one contact sheet of every beat. Look at it once and fix: overlaps, text off screen, crossing arrows, crowded beats, and any beat that is mostly words instead of a picture. Then run both again. Use `--beat 3,7` for a full-size look at specific beats.

## 4. Render

```bash
unblackbox render topic.json
```

Rendering takes about as long as the video plays, so start it in the background. Reply with the video path, its length, the sources, and anything you could not verify or find a reason for. Then ask the user whether they want an interactive playground of the system (use your question tool if you have one).

## 5. Playground (only if the user says yes)

A sandbox app over the same board: buttons trigger events, clicking a component explains it. It should take about 5 minutes.

1. Write `<topic>.game.json` following the playground part of `unblackbox guide`. Copy the board (the big-picture `add` ops) from the video spec into `scene`. Add 3 to 6 events, at least one of which changes state with a `color` op so that others react to it through `if`, plus an inspect line for each key component.
2. Run `unblackbox game <topic>.game.json` (about 20 s). Fix the errors and the warnings, and look at `sheet.png` once.
3. Run `unblackbox play <out folder>` and reply with the folder path: open the player app in it to play (an .exe on Windows), or share the folder with someone on the same OS.
