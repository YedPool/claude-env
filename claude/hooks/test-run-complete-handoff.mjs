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

import { writeFileSync, mkdtempSync, rmSync, statSync } from "node:fs";
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
  "```text",
  "1. What happened",
  "    1.1. Did a thing.",
  "",
  "2. Where we are now",
  "    2.1. Thing is done.",
  "",
  "3. What's next",
  "    3.1. Tell me if you want it committed.",
  "```",
].join("\n");

// The lettered form that lived for part of 2026-09-08. Still accepted.
const LETTERED_HANDOFF_TEXT = [
  "**A -- What happened**",
  "1. Did a thing.",
  "",
  "**B -- Where we are now**",
  "1. Thing is done.",
  "",
  "**C -- What's next**",
  "1. Tell me if you want it committed.",
].join("\n");

// The form the skill used until 2026-09-08. Still accepted, so a session that loaded
// the old skill is not nagged twice for a handoff it already wrote.
const OLD_HANDOFF_TEXT = [
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

// One JSONL entry per shape the in-flight tests need.
const E = {
  human: JSON.stringify({ type: "user", message: { role: "user", content: "do the thing" } }),
  edit: JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "e", name: "Edit", input: {} }] } }),
  bgShell: JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "s", name: "Bash", input: { command: "x", run_in_background: true } }] } }),
  fgShell: JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "s", name: "Bash", input: { command: "x" } }] } }),
  agent: JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "a", name: "Agent", input: {} }] } }),
  resume: JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "r", name: "SendMessage", input: { to: "a1b2c3", message: "carry on" } }] } }),
  movedToBg: JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "s", content: "Command did not complete within its 120s timeout and was moved to the background (ID: abc)." }] } }),
  plainResult: JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "s", content: "ok" }] } }),
  notif: JSON.stringify({ type: "user", promptSource: "system", message: { role: "user", content: "<task-notification>\n<task-id>abc</task-id>\n<status>completed</status>\n</task-notification>" } }),
  meta: JSON.stringify({ type: "user", isMeta: true, message: { role: "user", content: "Stop hook feedback:\nThis run changed files" } }),
};

function fixture(name, entries) {
  const p = join(sandbox, name + ".jsonl");
  writeFileSync(p, entries.join("\n"), "utf8");
  return p;
}

try {
  console.log("\nfires on a real run");
  {
    const t = transcript("run", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: "All done!" });
    ok(r.code === 0, "exits 0 even when blocking (block is data, not an exit code)");
    ok(r.out?.decision === "block", "CONTROL: a 6-tool run with no handoff DOES block");
    ok(/3\. What's next/.test(r.out?.reason || ""), "and the reason carries the 1 / 2 / 3 format");
    ok(!/What I need from you/.test(r.out?.reason || ""), "and no longer asks for the retired five-section form");
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
    ok(r.out === null, "a message that already has the three sections is left alone");
  }
  {
    const t = transcript("lettereddone", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: LETTERED_HANDOFF_TEXT });
    ok(r.out === null, "the retired A/B/C form is still accepted");
  }
  {
    const t = transcript("olddone", { tools: 6 });
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: OLD_HANDOFF_TEXT });
    ok(r.out === null, "the retired five-section form is still accepted, so nobody is asked twice");
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
    ok(r.out === null, "work still in flight (background_tasks) is not a finished run");
  }

  console.log("\nin-flight work the hook input does not list");
  {
    // THE CASE MEASURED 2026-09-08. background_tasks covers agents; a shell job started
    // with run_in_background is invisible to it, and the session ended its turn to WAIT
    // for it - the founder's whole operating model. 4 of the 12 firings since install
    // were this. The transcript itself says a launch is pending: count them.
    const p = fixture("bgshell", [E.human, E.edit, E.bgShell]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Waiting." });
    ok(r.out === null, "a backgrounded shell job with no notification yet is a wait, not a run");
  }
  {
    // A foreground command that hit its timeout: the harness moves it to the background
    // and says so in the tool result. Same wait, different spelling.
    const p = fixture("movedbg", [E.human, E.edit, E.fgShell, E.movedToBg]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Waiting." });
    ok(r.out === null, "a command the harness moved to the background is a wait too");
  }
  {
    const p = fixture("agentpending", [E.human, E.edit, E.agent]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Waiting." });
    ok(r.out === null, "an Agent launch with no notification yet is a wait");
  }
  {
    // A finished agent resumed with SendMessage is back in flight and will notify
    // again; observed 2026-09-08 when the hook would have nagged exactly that wait.
    const p = fixture("resumed", [E.human, E.edit, E.resume]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Waiting." });
    ok(r.out === null, "an agent resumed with SendMessage is a wait too");
  }
  {
    // CONTROL: the same launch, now closed by its notification, IS a finished run.
    // Without this the three silences above would also pass on a hook that had simply
    // stopped firing.
    const p = fixture("bgdone", [E.human, E.edit, E.bgShell, E.notif]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Done." });
    ok(r.out?.decision === "block", "CONTROL: the same launch closed by a task notification does block");
  }
  {
    // CONTROL: a foreground shell with an ordinary result is not a launch.
    const p = fixture("fgshell", [E.human, E.edit, E.fgShell, E.plainResult]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Done." });
    ok(r.out?.decision === "block", "CONTROL: a foreground shell call is not a pending launch");
  }
  {
    // Two launches, one notification, then hook feedback and more edits. The pending
    // launch sits BEFORE the notification and the isMeta entry; a walk that stopped at
    // either would not see it.
    const p = fixture("oneofttwo", [E.human, E.agent, E.edit, E.agent, E.notif, E.meta, E.edit]);
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Waiting." });
    ok(r.out === null, "a launch behind a notification and hook feedback is still counted as pending");
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

  console.log("\nboundaries that are not a human turn");
  {
    // A TASK NOTIFICATION from finished background work. It is type:"user" with no
    // tool_result, so a naive walk stops there and reports a 20-call run as 0 calls.
    // Measured across 286 real sessions: this pattern flipped the verdict on 13.3% of
    // them, and it is constant on a box whose rule is that everything runs in background.
    const p = join(sandbox, "notif.jsonl");
    const lines = [JSON.stringify({ type: "user", message: { role: "user", content: "go" } })];
    for (let i = 0; i < 8; i++) {
      lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "n" + i, name: "Bash", input: {} }] } }));
      lines.push(JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "n" + i }] } }));
    }
    lines.push(JSON.stringify({ type: "user", promptSource: "system", message: { role: "user", content: "<task-notification>done</task-notification>" } }));
    lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "Finished." }] } }));
    writeFileSync(p, lines.join("\n"), "utf8");
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Finished." });
    ok(r.out?.decision === "block", "a task notification is not a human turn - the run behind it still counts");
    ok(/8 tool calls/.test(r.out?.reason || ""), "and the full count is reported, not the post-notification zero");
  }
  {
    // A SKILL INJECTION (isMeta) has the same shape and the same problem.
    const p = join(sandbox, "meta.jsonl");
    const lines = [JSON.stringify({ type: "user", message: { role: "user", content: "go" } })];
    for (let i = 0; i < 6; i++) {
      lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "m" + i, name: "Bash", input: {} }] } }));
      lines.push(JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "m" + i }] } }));
    }
    lines.push(JSON.stringify({ type: "user", isMeta: true, message: { role: "user", content: "Base directory for this skill: ..." } }));
    writeFileSync(p, lines.join("\n"), "utf8");
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Done." });
    ok(r.out?.decision === "block", "a skill injection is not a human turn either");
  }
  {
    // CONTROL: a genuinely typed turn MUST still stop the walk, or the two tests above
    // would pass on a hook that had simply stopped honouring boundaries at all.
    const p = join(sandbox, "typed.jsonl");
    const lines = [];
    for (let i = 0; i < 10; i++) {
      lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", id: "q" + i, name: "Bash", input: {} }] } }));
    }
    lines.push(JSON.stringify({ type: "user", promptSource: "typed", message: { role: "user", content: "quick question" } }));
    lines.push(JSON.stringify({ type: "assistant", message: { content: [{ type: "text", text: "Answer." }] } }));
    writeFileSync(p, lines.join("\n"), "utf8");
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Answer." });
    ok(r.out === null, "CONTROL: a typed prompt still stops the walk, so prior work does not leak in");
  }

  console.log("\nbounded tail read");
  {
    // The read is capped at 2 MB. Build a transcript with the human turn buried behind
    // more than that, and the hook must stay silent rather than attribute unattributable
    // work to this turn.
    const p = join(sandbox, "huge.jsonl");
    const filler = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", id: "f", name: "Bash", input: { pad: "x".repeat(2000) } }] },
    });
    const lines = [JSON.stringify({ type: "user", message: { role: "user", content: "go" } })];
    for (let i = 0; i < 1200; i++) lines.push(filler); // ~2.4 MB, past the cap
    writeFileSync(p, lines.join("\n"), "utf8");
    const r = run({ hook_event_name: "Stop", transcript_path: p, last_assistant_message: "Done." });
    ok(r.out === null, "no human turn inside the tail window means stay silent, not guess");

    const stat = statSync(p);
    ok(stat.size > 2 * 1024 * 1024, `and the fixture really is past the cap (${Math.round(stat.size / 1048576)} MB)`);
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
      `1 ${EM} What happened`,
      `2 ${EM} Where we are now`,
      `3 ${EM} What's next`,
    ].join("\n");
    const r = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: loose });
    ok(r.out === null, "recognises the format with em dashes instead of dots");

    const partial = "1. What happened\n    1.1. x";
    const r2 = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: partial });
    ok(r2.out?.decision === "block", "CONTROL: one numbered section is not a handoff and still blocks");

    // A numbered list in ordinary prose must not read as a handoff: "1. what happened"
    // needs its sibling "2. where we are" before it counts.
    const prose = "Here is the plan:\n1. What happened first was X.\n2. Then Y.\n3. Then Z.";
    const r4 = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: prose });
    ok(r4.out?.decision === "block", "CONTROL: an ordinary numbered list is not a handoff");

    const oldPartial = "I -- What happened\nII -- Where we are now";
    const r3 = run({ hook_event_name: "Stop", transcript_path: t, last_assistant_message: oldPartial });
    ok(r3.out?.decision === "block", "CONTROL: two of the old five sections is not a handoff either");
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
