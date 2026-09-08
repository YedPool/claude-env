#!/usr/bin/env node
//
// test-run-complete-handoff.mjs - the Stop hook's behaviour, including the cases where
// it must stay SILENT.
//
// A hook that never fires and a hook that is wired correctly produce the same output on
// a quiet turn, so most of what is asserted here is silence WITH a control that proves
// the same harness can produce a block. Every "exits 0 saying nothing" case below is
// paired with an input that differs in exactly one field and does block.
//
// Run: node claude/hooks/test-run-complete-handoff.mjs

import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = join(here, "run-complete-handoff.mjs");
const sandbox = mkdtempSync(join(tmpdir(), "handoff-hook-"));

let checks = 0;
let failures = 0;

function ok(cond, msg) {
  checks++;
  if (cond) {
    console.log("  ok   " + msg);
  } else {
    console.log("  FAIL " + msg);
    failures++;
  }
}

function run(input, env = {}) {
  const res = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  let parsed = null;
  if (res.stdout && res.stdout.trim()) {
    try {
      parsed = JSON.parse(res.stdout);
    } catch {
      parsed = { UNPARSEABLE: res.stdout };
    }
  }
  return { code: res.status, out: parsed, stderr: res.stderr };
}

// Build a transcript: n assistant tool calls since the last human turn.
function transcript(name, { tools = 0, mutating = false, humanTurnFirst = true } = {}) {
  const lines = [];
  if (humanTurnFirst) {
    // A real human turn: content is a plain STRING, which is how they are actually
    // recorded (verified against a live transcript: 11 of 134 user entries).
    lines.push(JSON.stringify({ type: "user", message: { role: "user", content: "do the thing" } }));
  }
  for (let i = 0; i < tools; i++) {
    const toolName = mutating && i === 0 ? "Edit" : "Bash";
    lines.push(
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", content: [{ type: "tool_use", id: "t" + i, name: toolName, input: {} }] },
      })
    );
    // Tool results come back as USER entries carrying tool_result blocks - 123 of 134
    // in the same live transcript. This is the shape that makes the naive "stop at the
    // first user entry" reading measure one tool call instead of the whole run.
    lines.push(
      JSON.stringify({
        type: "user",
        message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t" + i, content: "done" }] },
      })
    );
  }
  const p = join(sandbox, name + ".jsonl");
  writeFileSync(p, lines.join("\n"), "utf8");
  return p;
}

const HANDOFF_TEXT = [
  "**I -- What happened**",
  "1. Did a thing.",
  "**II -- Where we are now**",
  "1. Thing is done.",
  "**III -- Questions**",
  "1. None.",
  "**IV -- My next steps**",
  "1. Nothing until you reply.",
  "**V -- What I need from you**",
  "1. Nothing.",
].join("\n");

try {
  console.log("\nfires on a real run");
  {
    const t = transcript("run", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "All done!" });
    ok(r.code === 0, "exits 0 even when blocking (block is data, not an exit code)");
    ok(r.out?.decision === "block", "CONTROL: a 6-tool run with no handoff DOES block");
    ok(/What I need from you/.test(r.out?.reason || ""), "and the reason carries the format");
  }
  {
    // One Edit, nothing else. A change to the founder's tree must never go unreported.
    const t = transcript("oneedit", { tools: 1, mutating: true });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "Fixed." });
    ok(r.out?.decision === "block", "a single file edit is enough on its own");
    ok(/changed files/.test(r.out?.reason || ""), "and the reason says so");
  }

  console.log("\nstays silent when it should");
  {
    const t = transcript("run2", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, stop_hook_active: true, last_assistant_message: "All done!" });
    ok(r.out === null, "LOOP GUARD: stop_hook_active silences it on the identical input that just blocked");
  }
  {
    const t = transcript("done", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: HANDOFF_TEXT });
    ok(r.out === null, "a message that already has the five sections is left alone");
  }
  {
    const t = transcript("chat", { tools: 2 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "It is in src/app.ts." });
    ok(r.out === null, "two read-only tool calls is a lookup, not a run");
  }
  {
    const t = transcript("bg", { tools: 6 });
    const r = run({
      hook_event_name: "Stop",
      transcript_path: t,
      last_assistant_message: "Running.",
      background_tasks: [{ id: "b1", status: "running" }],
    });
    ok(r.out === null, "work still in flight is not a finished run");
  }
  {
    const t = transcript("off", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "Done." }, { HANDOFF_HOOK: "off" });
    ok(r.out === null, "HANDOFF_HOOK=off disables it");
  }

  console.log("\nthe tool-result trap");
  {
    // THE ONE THAT MATTERS. If the hook stopped at the first `type:"user"` entry it
    // would count ONE tool call here and never fire, on a transcript that is 20 calls
    // deep. Measured on a live transcript: 123 of 134 user entries are tool results.
    const t = transcript("deep", { tools: 20 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "Done." });
    ok(r.out?.decision === "block", "counts across tool_result user entries, not just the last call");
    ok(/20 tool calls/.test(r.out?.reason || ""), "and reports the true count");
  }
  {
    // The mirror image: work from a PREVIOUS turn must not be counted into this one.
    const p = join(sandbox, "prevturn.jsonl");
    const lines = [];
    for (let i = 0; i < 10; i++) {
      lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "x" + i, name: "Bash", input: {} }] } }));
    }
    lines.push(JSON.stringify({ type: "user", message: { role: "user", content: "and now a quick question" } }));
    lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "Answer." }] } }));
    writeFileSync(p, lines.join("\n"), "utf8");
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Answer." });
    ok(r.out === null, "a previous turn's 10 tool calls do not leak into this turn");
  }

  console.log("\nnever breaks a session");
  {
    const r = run({ hook_event_name: "Stop", transcript_path: join(sandbox, "does-not-exist.jsonl"), last_assistant_message: "x" });
    ok(r.code === 0 && r.out === null, "a missing transcript is silent, not an error");
  }
  {
    const p = join(sandbox, "garbage.jsonl");
    writeFileSync(p, "not json\n{broken\n", "utf8");
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "x" });
    ok(r.code === 0 && r.out === null, "an unparseable transcript is silent");
  }
  {
    const res = spawnSync(process.execPath, [HOOK], { input: "not json at all", encoding: "utf8" });
    ok(res.status === 0, "a malformed hook payload exits 0");
  }
  {
    // A BOM-prefixed payload must still WORK, not merely fail quietly. Anything that
    // pipes through PowerShell prepends EF BB BF, and the catch-all would otherwise
    // turn that into a hook that looks installed and does nothing forever.
    const t = transcript("bom", { tools: 6 });
    const BOM = String.fromCharCode(0xfeff); // built, not typed - this file stays ASCII
    const payload =
      BOM + JSON.stringify({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "done" });
    const res = spawnSync(process.execPath, [HOOK], { input: payload, encoding: "utf8" });
    ok(res.status === 0, "a BOM-prefixed payload exits 0");
    ok(/"decision":"block"/.test(res.stdout || ""), "and still blocks - the BOM is stripped, not swallowed");
  }
  {
    const res = spawnSync(process.execPath, [HOOK], { input: "", encoding: "utf8" });
    ok(res.status === 0, "empty stdin exits 0");
  }

  console.log("\nheading detection");
  {
    const t = transcript("loose", { tools: 6 });
    // Em dashes instead of the double hyphen - still a handoff, must not re-ask. The
    // dash is BUILT from its code point so this file stays ASCII; typing it would put a
    // U+2014 in the source of a test whose subject is exactly that character.
    const EM = String.fromCharCode(0x2014);
    const loose = [
      `I ${EM} What happened`,
      `II ${EM} Where we are now`,
      `III ${EM} Questions`,
      `IV ${EM} My next steps`,
      `V ${EM} What I need from you`,
    ].join("\n");
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: loose });
    ok(r.out === null, "recognises the format with em dashes instead of hyphens");

    const partial = "I -- What happened\nII -- Where we are now";
    const r2 = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: partial });
    ok(r2.out?.decision === "block", "CONTROL: two sections is not a handoff and still blocks");
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log("");
if (failures > 0) {
  console.log(`FAILED: ${failures} of ${checks} checks`);
  process.exit(1);
}
console.log(`PASSED: all ${checks} checks`);
process.exit(0);
