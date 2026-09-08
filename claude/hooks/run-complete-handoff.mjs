#!/usr/bin/env node
//
// run-complete-handoff.mjs - Stop hook. Asks for the five-part handoff when a run of
// real work ends without one.
//
// WHY A HOOK AND NOT JUST THE SKILL. A skill fires when the model decides it applies,
// and the moment the format matters most - the end of a long run, when context is full
// and the model is trying to wrap up - is exactly when it is most likely to be
// forgotten. The hook is the floor, not the mechanism: it blocks the turn ending ONCE
// and points at the skill, which still owns what the format actually is.
//
// WHICH WAY THIS BREAKS WHEN ITS INPUT IS WRONG, which is the question worth asking of
// any check. Blocking wrongly costs a real turn and interrupts a conversational answer
// with five roman numerals nobody wanted. Failing to block costs a handoff the founder
// can ask for in four words. Those are not symmetric, so EVERY uncertain case exits 0.
// The bar is deliberately high and the misses are deliberate.
//
// THE LOOP GUARD IS NOT OPTIONAL. Claude Code passes stop_hook_active=true once this
// hook has already blocked; returning block again from that state is how a session
// wedges. It is the first thing checked and it exits 0 unconditionally.
//
// Turn it off entirely with HANDOFF_HOOK=off.

import { readFileSync, openSync, fstatSync, readSync, closeSync } from "node:fs";

// How much of the transcript tail to read. A single turn is a few KB; 2 MB is three
// orders of magnitude of headroom.
//
// WHY A CAP AT ALL, measured on this box 2026-09-07: transcripts here reach 264 MB, and
// two exceed 50 MB. Reading one whole file to look at its last few KB costs a ~264
// M-char string (~528 MB as UTF-16) plus a split array, on EVERY turn end, in EVERY
// session - on a machine whose documented failure mode is starving itself with parallel
// sessions. Worse, past V8's ~536 M-char string limit readFileSync throws
// ERR_STRING_TOO_LONG, the catch-all swallows it, and the hook silently never fires
// again - on exactly the longest runs that most need a handoff.
//
// Do not raise this to "be safe". If a turn genuinely does not fit, the correct outcome
// is the one below: no human turn found, treat it as not-a-run, stay silent.
const TAIL_BYTES = 2 * 1024 * 1024;

// A hook that throws is a hook that breaks every session on the machine. One try/catch
// around everything, and every exit is 0 except the single deliberate block.
try {
  main();
} catch {
  process.exit(0);
}

function main() {
  if (process.env.HANDOFF_HOOK === "off") process.exit(0);

  // Strip a leading BOM before parsing. Claude Code writes clean JSON to stdin, but
  // anything that pipes through PowerShell picks one up - `$json | & node hook.mjs`
  // prepends EF BB BF - and JSON.parse throws on it. Without this the catch-all below
  // turns that into a silent exit 0, which is indistinguishable from "nothing to do".
  // Cost: one character. Failure it removes: a hook that looks installed and does
  // nothing, forever, for a reason nobody can see.
  // Compared by CODE POINT rather than matching a literal BOM character, so this file
  // stays pure ASCII - an invisible U+FEFF sitting in the source is the last thing you
  // want in the routine whose whole job is coping with an invisible U+FEFF.
  let raw = readFileSync(0, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  if (!raw.trim()) process.exit(0);

  const input = JSON.parse(raw);

  // 1. THE LOOP GUARD. We already asked once this turn. Never ask twice.
  if (input.stop_hook_active) process.exit(0);

  // 2. Already done. The model emitted the handoff on its own - which is the goal, and
  //    the common case once the skill is loaded. Checking last_assistant_message rather
  //    than re-reading the transcript keeps this cheap.
  if (hasHandoff(input.last_assistant_message || "")) process.exit(0);

  // 3. Was this a RUN, or a conversation? Only a run gets asked.
  const work = measureWork(input.transcript_path);
  if (!work.isRun) process.exit(0);

  // 4. Work is still in flight. A background task that has not reported is not a
  //    finished run, and its result may change every section of the handoff.
  if (Array.isArray(input.background_tasks) && input.background_tasks.length > 0) {
    process.exit(0);
  }

  block(work);
}

// The five headings, matched loosely: roman numeral, any separator, the section word.
// Loose on purpose - a handoff that used an em dash instead of a double hyphen, or
// bolded the numerals, is still a handoff, and re-asking for one that is already there
// is the most annoying way this hook can fail.
function hasHandoff(text) {
  if (!text) return false;
  const marks = [
    /\bI\b[^\n]{0,12}what happened/i,
    /\bII\b[^\n]{0,12}where we are/i,
    /\bIII\b[^\n]{0,12}questions?/i,
    /\bIV\b[^\n]{0,12}(my |your )?next steps/i,
    /\bV\b[^\n]{0,12}what (i|you) need/i,
  ];
  // Four of five, so a run with genuinely no questions that dropped the heading still
  // counts. The skill asks for all five; the hook does not re-litigate a near miss.
  return marks.filter((re) => re.test(text)).length >= 4;
}

// Read the transcript backwards to the last human turn and describe what happened since.
// A "run" is work the founder would want summarised: several tool calls, or any edit to
// a file, or a commit. A question answered from context is not.
function measureWork(transcriptPath) {
  const none = { isRun: false, tools: 0, mutated: false };
  if (!transcriptPath) return none;

  let lines;
  try {
    lines = tailLines(transcriptPath);
  } catch {
    return none; // unreadable transcript -> say nothing
  }

  const MUTATING = new Set(["Edit", "Write", "NotebookEdit"]);
  let tools = 0;
  let mutated = false;
  let foundHumanTurn = false;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;

    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    // Stop at the last REAL HUMAN turn, and note how much work "real" is doing there.
    //
    // Three different things wear the shape `type:"user"` with no tool_result block, and
    // only one of them is a person typing:
    //   - tool RESULTS (excluded by isToolResult - 123 of 134 user entries in a live
    //     transcript, so a walk that ignores this measures one tool call, not a run)
    //   - TASK NOTIFICATIONS from finished background work, promptSource:"system"
    //   - SKILL INJECTIONS and local-command output, isMeta:true
    //
    // Measured across 286 real sessions: 51% of walks stopped at something the founder
    // never typed, and 13.3% of sessions flipped verdict because of it. One case scanned
    // 3 entries and concluded "not a run" where the true span was 3,961 entries and 663
    // tool calls - a huge run that ended with no handoff asked for, because the last thing
    // before it was a background-task notification.
    //
    // That failure is concentrated exactly here: this box's operating rule is that
    // everything runs in the background, so task notifications are constant.
    if (entry.type === "user" && !isToolResult(entry)) {
      if (entry.isMeta === true || entry.promptSource === "system") continue;
      foundHumanTurn = true;
      break;
    }

    if (entry.type !== "assistant") continue;
    for (const block of contentBlocks(entry)) {
      if (block?.type !== "tool_use") continue;
      tools++;
      if (MUTATING.has(block.name)) mutated = true;
    }
  }

  // No human turn inside the tail window means we cannot attribute this work to THIS
  // turn - the counted calls may span several. Staying silent is the side of the
  // asymmetry this file already chose, and the miss it costs (a single turn generating
  // more than TAIL_BYTES) is rare and deliberate rather than accidental.
  if (!foundHumanTurn) return none;

  // The threshold. Four tool calls is roughly "looked something up and answered"; a real
  // run clears it easily. A single file edit counts on its own, because a change to the
  // founder's tree is exactly the thing that must never end without being reported.
  const isRun = mutated || tools >= 4;
  return { isRun, tools, mutated };
}

// Read only the last TAIL_BYTES of the file, not the file.
//
// The first line of a mid-file read is almost always a fragment of a longer line, so it is
// dropped: JSON.parse would reject it anyway, but dropping it says why.
function tailLines(path) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - TAIL_BYTES);
    const buf = Buffer.allocUnsafe(size - start);
    if (buf.length > 0) readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString("utf8").split("\n");
    if (start > 0) lines.shift();
    return lines;
  } finally {
    closeSync(fd);
  }
}

function isToolResult(entry) {
  return contentBlocks(entry).some((b) => b?.type === "tool_result");
}

function contentBlocks(entry) {
  const content = entry?.message?.content;
  return Array.isArray(content) ? content : [];
}

function block(work) {
  const did = work.mutated
    ? "changed files in the working tree"
    : `made ${work.tools} tool calls`;

  const reason = [
    `This run ${did}, and it is ending without a handoff.`,
    "",
    "Invoke the run-complete-handoff skill and close with its five sections, as",
    "numbered one-liners:",
    "",
    "    I    What happened      -- lead with any correction to what you said earlier",
    "    II   Where we are now   -- state, present tense, gaps named as gaps",
    "    III  Questions          -- only ones you cannot answer yourself",
    "    IV   My next steps      -- \"nothing until you reply\" is a real answer",
    "    V    What I need from you -- commands, decisions, credentials; be specific",
    "",
    "Every heading appears even when the answer is \"nothing\". If this was not a run",
    "-- a lookup, a conversational reply, a pause before more work -- say so in one",
    "line and stop; you will not be asked again this turn.",
  ].join("\n");

  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}
