#!/usr/bin/env node
// One-time setup: dependencies, the `unblackbox` command, the Kokoro voice model and a headless browser
// (the last two download during a first test still), and with --playground the playground player.
// Progress goes to stderr; stdout gets one JSON summary, like every unblackbox command. Safe to run again.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const log = (s) => process.stderr.write(`setup: ${s}\n`);
const run = (cmd) => spawnSync(cmd, { cwd: root, shell: true, stdio: ["ignore", 2, 2] }).status === 0;
const done = (summary) => {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = summary.ok ? 0 : 1;
};

function main() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 24) return done({ ok: false, error: `Node ${process.versions.node} found; unblackbox needs Node 24 or newer (it runs its TypeScript sources directly). Install it from https://nodejs.org` });

  log("installing dependencies (npm ci)");
  if (!run("npm ci --no-audit --no-fund")) return done({ ok: false, error: "npm ci failed; see the output above" });

  log("putting the unblackbox command on PATH (npm link)");
  const linked = !args.has("--no-link") && run("npm link --no-audit --no-fund") && run("unblackbox --help");
  const command = linked ? "unblackbox" : `node "${path.join(root, "src", "cli.ts")}"`;

  log("test still: the first one downloads the voice model and a headless browser");
  const still = mkdtempSync(path.join(tmpdir(), "unblackbox-setup-"));
  if (!run(`node src/cli.ts still examples/magic-numbers.json --beat 0 --out "${still}"`)) return done({ ok: false, command, error: "the test still failed; see the output above" });

  let playground = "skipped; run setup again with --playground to build it";
  if (args.has("--playground")) {
    log("building the playground player (Rust; a few minutes the first time)");
    if (!run("cargo --version")) {
      playground = "not built: needs Rust from https://rustup.rs (Windows also needs the MSVC build tools, Linux the WebKitGTK packages Tauri lists); then run setup again with --playground";
    } else if (!run("npm run play:build")) {
      return done({ ok: false, command, error: "the playground build failed; see the output above" });
    } else playground = "built";
  }
  done({ ok: true, root, command, still, playground });
}

main();
