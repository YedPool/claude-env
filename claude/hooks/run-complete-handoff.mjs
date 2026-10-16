#!/usr/bin/env node
//
// run-complete-handoff.mjs - Stop hook. Asks for the three-part handoff (1 / 2 / 3) when
// a run of real work ends without one.
//
// WHY A HOOK AND NOT JUST THE SKILL. A skill fires when the model decides it applies,
// and the moment the format matters most - the end of a long run, when context is full
// and the model is trying to wrap up - is exactly when it is most likely to be
// forgotten. The hook is the floor, not the mechanism: it blocks the turn ending ONCE
// and points at the skill, which still owns what the format actually is.
//
// WHICH WAY THIS BREAKS WHEN ITS INPUT IS WRONG, which is the question worth asking of
// any check. Blocking wrongly costs a real turn and interrupts a conversational answer
// with three lettered headings nobody wanted. Failing to block costs a handoff the
// founder can ask for in four words. Those are not symmetric, so EVERY uncertain case
// exits 0. The bar is deliberately high and the misses are deliberate.
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
//
// DECLARED ABOVE THE main() CALL. main() runs at module top, so a `const` further down
// is still in its temporal dead zone when tailLines first touches it; that throws, the
// catch turns it into "unreadable transcript", and the hook goes silent on every run.
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

  // 3. Was this a RUN, or a conversation? Only a run gets asked. This also answers
  //    "is anything still in flight" from the transcript itself - see measureWork.
  const work = measureWork(input.transcript_path);
  if (!work.isRun) process.exit(0);

  // 4. Work is still in flight. A background task that has not reported is not a
  //    finished run, and its result may change every section of the handoff. This
  //    field covers agents; shell jobs are caught inside measureWork.
  if (Array.isArray(input.background_tasks) && input.background_tasks.length > 0) {
    process.exit(0);
  }

  block(work);
}

// The three headings, matched loosely: capital letter, any separator, the section word.
// Loose on purpose - a handoff that used an em dash instead of a double hyphen, or
// bolded the letters, is still a handoff, and re-asking for one that is already there
// is the most annoying way this hook can fail.
//
// THE SHAPE CHANGED 2026-09-08 (founder): A/B/C replaced I-V, and the last three roman
// sections folded into C "What's next". The old five-heading form is still accepted so a
// session that loaded the skill before the change is not nagged twice for a handoff it
// already wrote; the skill, not the hook, owns which form is current.
function hasHandoff(text) {
  if (!text) return false;
  // Current form (founder, 2026-09-08, third revision): "1. What happened",
  // "2. Where we are now", "3. What's next", inside a fenced text block.
  // The separator after the digit may be a dot, a bracket, a dash of any width or just
  // space, but no WORD may sit between them: "1. The what happened" is prose.
  const numbered = [
    /(^|\n)\s*1[^\n\w]{1,4}what happened/i,
    /(^|\n)\s*2[^\n\w]{1,4}where we are/i,
    /(^|\n)\s*3[^\n\w]{1,4}what'?s next/i,
  ];
  if (numbered.filter((re) => re.test(text)).length >= 2) return true;

  // The lettered form that lived for part of one day. Accepted so nobody is nagged twice.
  const lettered = [
    /\bA\b[^\n]{0,12}what happened/i,
    /\bB\b[^\n]{0,12}where we are/i,
    /\bC\b[^\n]{0,12}what'?s next/i,
  ];
  // Two of three: A and B alone still say "this was a handoff", and the hook does not
  // re-litigate a near miss.
  if (lettered.filter((re) => re.test(text)).length >= 2) return true;

  const roman = [
    /\bI\b[^\n]{0,12}what happened/i,
    /\bII\b[^\n]{0,12}where we are/i,
    /\bIII\b[^\n]{0,12}questions?/i,
    /\bIV\b[^\n]{0,12}(my |your )?next steps/i,
    /\bV\b[^\n]{0,12}what (i|you) need/i,
  ];
  return roman.filter((re) => re.test(text)).length >= 4;
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
  const SHELLS = new Set(["Bash", "PowerShell"]);
  let tools = 0;
  let mutated = false;
  let foundHumanTurn = false;
  // Background work launched since the last human turn, minus the notifications that
  // closed it. Counted rather than matched by id, because a count that is wrong can
  // only be wrong in one direction here and that direction is "stay silent".
  let launches = 0;
  let completions = 0;

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
    //     (and, measured 2026-09-08, a string content starting "<task-notification>")
    //   - SKILL INJECTIONS, Stop-hook feedback and local-command output, isMeta:true
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
      if (isTaskNotification(entry)) {
        // One notification closes one launch; a notification that names several
        // task ids closes several.
        const ids = (String(entry?.message?.content ?? "").match(/<task-id>/g) || []).length;
        completions += Math.max(1, ids);
        continue;
      }
      if (entry.isMeta === true || entry.promptSource === "system") continue;
      foundHumanTurn = true;
      break;
    }

    if (entry.type === "user") {
      // A foreground command that hit its timeout is moved to the background by the
      // harness, and the tool result says so. That is a launch too.
      for (const block of contentBlocks(entry)) {
        if (block?.type !== "tool_result") continue;
        const text = typeof block.content === "string"
          ? block.content
          : JSON.stringify(block.content ?? "");
        if (text.includes("moved to the background (ID:")) launches++;
      }
      continue;
    }

    if (entry.type !== "assistant") continue;
    for (const block of contentBlocks(entry)) {
      if (block?.type !== "tool_use") continue;
      tools++;
      if (MUTATING.has(block.name)) mutated = true;
      if (block.name === "Agent") launches++;
      // Resuming a finished subagent with SendMessage puts it back in flight and ends
      // in a task notification just like a fresh launch. A SendMessage to a peer
      // session may never notify, so this over-counts toward silence -- the direction
      // this hook is allowed to be wrong in.
      if (block.name === "SendMessage") launches++;
      if (SHELLS.has(block.name) && block.input?.run_in_background) launches++;
    }
  }

  // No human turn inside the tail window means we cannot attribute this work to THIS
  // turn - the counted calls may span several. Staying silent is the side of the
  // asymmetry this file already chose, and the miss it costs (a single turn generating
  // more than TAIL_BYTES) is rare and deliberate rather than accidental.
  if (!foundHumanTurn) return none;

  // SOMETHING IS STILL IN FLIGHT, so this is a WAIT, not a finished run. The founder's
  // operating model is that a session ends its turn to wait for a background job and
  // the harness re-invokes it on completion; a hook that demands a handoff at that
  // moment costs a full billed turn and gets a handoff the pending result will make
  // stale. The hook input's `background_tasks` covers agents; shell jobs started with
  // run_in_background, and foreground commands the harness moved to the background on
  // timeout, do not appear there. Measured 2026-09-08 across every transcript on this
  // box: 12 firings since install, 4 of them on a session that was waiting.
  if (launches > completions) return none;

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

// A task notification is recorded as a user entry whose content is a string starting
// with the notification tag (promptSource is "system" on the same entries).
function isTaskNotification(entry) {
  const c = entry?.message?.content;
  return typeof c === "string" && c.trimStart().startsWith("<task-notification>");
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
    "Invoke the run-complete-handoff skill and close with its three sections inside",
    "ONE fenced text block, items as N.M. one-liners indented four spaces, never",
    "wrapped, no blank line between a heading and its items:",
    "",
    "    1. What happened     -- lead with any correction to what you said earlier",
    "    2. Where we are now  -- state, present tense, gaps named as gaps",
    "    3. What's next       -- questions, your next steps and what you need from",
    "                            the founder, in ONE list; only lines that exist,",
    "                            never \"none\" or \"nothing until you reply\"",
    "",
    "All three headings appear. If this was not a run -- a lookup, a conversational",
    "reply, a pause before more work -- say so in one line and stop; you will not be",
    "asked again this turn.",
  ].join("\n");

  process.stdout.write(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}
