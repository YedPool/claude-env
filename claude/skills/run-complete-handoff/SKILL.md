---
name: run-complete-handoff
description: "Emit the five-part end-of-run handoff (I what happened / II where we are now / III questions / IV my next steps / V what I need from you) as numbered one-liners. Invoke when a run of substantive work is FINISHED and you are about to hand control back and wait -- after shipping a change, opening or merging a PR, finishing an investigation, completing a wave, or stopping because you are blocked. Do NOT invoke for a conversational answer, a lookup, or a pause in the middle of work you are about to continue."
---

# Run-complete handoff

The last message of a run is the only part of it the founder is guaranteed to
read. This is its shape.

    I    What happened
    II   Where we are now
    III  Questions
    IV   My next steps
    V    What I need from you

## The rules

**Numbered one-liners under every heading.** One fact per line, one line per
fact. Not paragraphs with numbers in front of them: if a line needs a comma
splice and a subordinate clause to stay one sentence, it is two lines.

**Every heading appears, every time**, even when the answer is "nothing" --
`1. Nothing; the branch is green and unblocked.` A missing section reads as
forgotten, and the founder cannot tell the difference between a section you
skipped and a section that was genuinely empty.

**Lead section I with the correction if you made one.** If something you said
earlier in the run turned out to be wrong, its first line says so. Burying a
correction under four lines of what went well is how a wrong belief survives a
handoff.

**Section II is state, not narrative.** Where the branch is, what is committed,
what is deployed, what is running, what is broken. Present tense. A reader who
skipped section I should be able to act on II alone.

**Section III is only for questions you cannot answer yourself.** A question
with an obvious default is not a question, it is a decision you should have
made. If you have a recommendation, say which option you would pick.

**Section IV is what you will do next without being asked.** If the answer is
"nothing until you reply", say that -- it is a real state and a common one.

**Section V is the ask, and it is the section that gets read first.** Commands
to run, decisions to make, credentials to supply. Be specific enough to act on:
a path, a command, a yes/no. If you need nothing, `1. Nothing.`

**Unproven stays unproven.** A test that did not run, a tier that stalled, a
claim you could not verify -- it belongs in II as a gap, named. Never let a
green number stand for work that did not happen.

**No preamble and no sign-off.** The headings start the message. Nothing after
section V.

## Length

Aim for 15-25 lines total. A run that genuinely produced more gets more, but a
handoff that needs scrolling has usually smuggled a narrative into section I --
cut it there first, because section I is the part the founder can reconstruct
from the diff and section V is the part only you know.

## Worked example

    **I -- What happened**

    1. You asked why there was no persistent todo panel; I first blamed the
       child-session marker and that was wrong.
    2. A two-arm probe settled it: marker set vs stripped gave identical
       29-tool lists.
    3. The real gate is CLAUDE_CODE_ENABLE_TODO_TOOLS, and TodoWrite no longer
       exists as a tool.

    **II -- Where we are now**

    1. This box has the panel on and the clobbered pane record restored.
    2. The branch holds seven files, tested, uncommitted.
    3. Nothing is on GitHub yet, so no other machine has any of it.

    **III -- Questions**

    1. Swap the hand-rolled hook for the shipped one here, or leave it?

    **IV -- My next steps**

    1. Commit and open the PR once you have tested.
    2. Do the hook swap if you want it.

    **V -- What I need from you**

    1. Run the one-liner in the open notepad and tell me it looks right.
    2. Answer the question in III.

## When NOT to use this

A conversational reply, a single lookup, a mid-run status update, or a pause
where you are about to keep working. Wrapping a one-line answer in five roman
numerals is worse than not having the format at all -- it buries the answer and
trains the reader to skim the headings.
