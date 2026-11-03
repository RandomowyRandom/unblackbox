---
name: setup
description: Install or repair the unblackbox tool, the CLI behind the unblackbox explainer-video skill. Installs its Node dependencies, puts the `unblackbox` command on PATH, downloads the voice model and a headless browser, and optionally builds the interactive playground player. Use when the user runs /unblackbox:setup or asks to install or set up unblackbox, or when the `unblackbox` command is missing or fails with a missing module.
---

# Set up unblackbox

1. **Find the unblackbox folder.** It holds `scripts/setup.mjs`, two levels above this skill's folder. Some harnesses copy only the skill folders; if `scripts/setup.mjs` is not there, clone the tool once with `git clone https://github.com/RandomowyRandom/unblackbox ~/.unblackbox/app` and use that folder.
2. **Check Node.** `node --version` must be 24 or newer. If it is older or missing, stop and tell the user to install Node 24+ (nodejs.org, nvm or their package manager).
3. **Ask about playgrounds.** Ask the user whether they also want interactive playground apps (use your question tool if you have one). They need Rust and add a one-time build of 3 to 5 minutes.
4. **Run setup.** `node <unblackbox folder>/scripts/setup.mjs`, plus `--playground` if they said yes. The first run takes a few minutes and about 2 GB of disk: dependencies, the voice model, a headless browser. Run it in the background if you can, and tell the user it is working.
5. **Report.** It prints JSON last. With `ok: true`, tell the user the command to use (`command`) and whether the playground was built (`playground`), then offer to make a first video. With `ok: false`, show the `error`, help fix what it names (Node, Rust, build tools), and run setup again.

Run setup again after an update of the unblackbox plugin or folder: an update brings a fresh copy without dependencies. Setup is safe to repeat.
