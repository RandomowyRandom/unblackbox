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

First design the scenes: one per part of the idea that needs its own picture (often the system with the example running through it, then a closer look at one mechanism or at the failure), 1 to 3 in all. For each, sketch its final picture: at most about 7 things (actors, components, the ideas' components) laid out along the flow so arrows do not cross. Every beat is a step towards that picture or a change on it: a part appears, an arrow is drawn, a state changes, something turns `bad` and later `good`, the camera zooms in and back out. Give each scene at least 4 beats. Plan the beats as that sequence of small changes before writing any JSON.

Write `<topic>.json` following the rules from `unblackbox guide`. Copy the structure of `examples/queue-decoupling.json`: a board that starts with the actor and the first part and gains about one part per beat, components as boxes with icons, actors as icons, one real case ("order 1042") traced end to end as a labelled packet and kept through the trap and the fix, little text. Show each idea with its component (`unblackbox components <type>` prints its fields, what `set` can change, and an example) and change it with `set` as the story moves. Lay things out with `place` instead of guessing coordinates. Put the files and commits you used in `sources`.

## 3. Verify

```bash
unblackbox validate topic.json
unblackbox still topic.json --tts silent
```

`validate` (under 1 s) must report no errors. Fix its warnings too; they flag videos that are too dense, too low-level or too wordy. `still` (about 5 s) writes one contact sheet of every beat. Look at it once and fix: overlaps, text off screen, crossing arrows, crowded beats, and any beat that is mostly words instead of a picture. Read it like a flip book: each cell should be the previous one with one to three small differences (a closing beat that only points is fine), except the first cell of a new scene, and each scene's last cell should be its whole picture. Then run both again. Use `--beat 3,7` for a full-size look at specific beats.

## 4. Render

```bash
unblackbox render topic.json
```

Rendering takes about as long as the video plays, so start it in the background. Reply with the video path, its length, the sources, and anything you could not verify or find a reason for. Then ask the user whether they want an interactive playground of the system (use your question tool if you have one).

## 5. Playground (only if the user says yes)

A live sandbox over the same board: the system runs, the viewer pulls levers and breaks things, guided by stages and challenges. It should take about 10 minutes.

1. Write `<topic>.game.json` following the playground part of `unblackbox guide`. Copy the main scene's final picture into `scene` and add probe elements. In `sim`, give each runtime part its kind and its numbers from the code (`ack` from how the code acknowledges messages, `awaits` from where it waits on a downstream call, `retry` from its config). Then levers, notes, stages and one challenge per key idea.
2. Run `unblackbox game <topic>.game.json --check` (a few seconds) and read the run table: does each lever move what it should, does each note fire? Fix every error and warning.
3. Run `unblackbox game <topic>.game.json` (about 20 s) and look at `sheet.png` once.
4. Run `unblackbox play <out folder>` and reply with the folder path: open the player app in it to play (an .exe on Windows), or share the folder with someone on the same OS.
