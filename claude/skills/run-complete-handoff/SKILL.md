---
name: run-complete-handoff
description: Emit the three-part end-of-run handoff (A what happened / B where we are now / C what's next) as numbered one-liners. Invoke when a run of substantive work is FINISHED and you are about to hand control back and wait -- after shipping a change, opening or merging a PR, finishing an investigation, completing a wave, or stopping because you are blocked. Do NOT invoke for a conversational answer, a lookup, or a pause in the middle of work you are about to continue.
---

# Run-complete handoff

The last message of a run is the only part of it the founder is guaranteed to
read. This is its shape.

    A  What happened
    B  Where we are now
    C  What's next

Capital letters, not roman numerals (founder, 2026-09-08). The earlier
five-section form (I-V, with separate Questions / My next steps / What I need
from you) is retired; the last three folded into C.

## The rules

**Numbered one-liners under every heading.** One fact per line, one line per
fact. Not paragraphs with numbers in front of them: if a line needs a comma
splice and a subordinate clause to stay one sentence, it is two lines.

**Tight spacing.** The heading line is immediately followed by its first
item, with no blank line between them and none between items. Exactly one
blank line separates a section's last item from the next heading. Nothing
else.

**Sub-numbered items are indented, and the indent must SURVIVE RENDERING.**
When a line genuinely has children, number them under the parent (1.1, 1.2)
and write each as a NESTED BULLET: three spaces, a hyphen, the number, the
text -- `   - 1.1. text`. The message is rendered as markdown, and a line
that is merely indented three spaces under item 1 is a continuation of item
1: the renderer folds it flush and the indent vanishes (observed 2026-09-08,
first handoff after the rule was written). Only a nested list line renders
indented. Never a sub-item flush left with its parent, and never deeper than
one level - a 1.1.1 is a sign the section is carrying a narrative and should
be cut.

**All three headings appear, every time.** A missing section reads as
forgotten, and the founder cannot tell the difference between a section you
skipped and a section that was genuinely empty.

**Lead section A with the correction if you made one.** If something you
said earlier in the run turned out to be wrong, its first line says so.
Burying a correction under four lines of what went well is how a wrong belief
survives a handoff.

**Section B is state, not narrative.** Where the branch is, what is
committed, what is deployed, what is running, what is broken. Present tense.
A reader who skipped A should be able to act on B alone.

**Section C is everything forward-looking, in one list.** Questions only you
cannot answer yourself, what you will do next without being asked, and what
you need from the founder (commands, decisions, credentials), all as numbered
lines in one section. Write only the lines that exist: never "No questions",
never "Nothing until you reply", never a placeholder. Order the lines by what
the founder must act on first. A question with an obvious default is not a
question, it is a decision you should have made; if you have a
recommendation, say which option you would pick. If there is genuinely
nothing forward-looking, C is the single line `1. Done.`

**Unproven stays unproven.** A test that did not run, a tier that stalled, a
claim you could not verify -- it belongs in B as a gap, named. Never let a
green number stand for work that did not happen.

**No preamble and no sign-off.** The headings start the message. Nothing
after section C.

## Length

Aim for 10-18 lines total. A run that genuinely produced more gets more, but
a handoff that needs scrolling has usually smuggled a narrative into section
A -- cut it there first, because A is the part the founder can reconstruct
from the diff and C is the part only you know.

## Worked example

    **A -- What happened**
    1. You asked why there was no persistent todo panel; I first blamed the
       child-session marker and that was wrong.
    2. A two-arm probe settled it: marker set vs stripped gave identical
       29-tool lists.
    3. The real gate is CLAUDE_CODE_ENABLE_TODO_TOOLS, and TodoWrite no longer
       exists as a tool.

    **B -- Where we are now**
    1. This box has the panel on and the clobbered pane record restored.
    2. The branch holds seven files, tested, uncommitted.
       - 2.1. Five are the hook and its tests; two are the README and the skill.
       - 2.2. The hook is also installed locally and passing the same checks.
    3. Nothing is on GitHub yet, so no other machine has any of it.

    **C -- What's next**
    1. Run the one-liner in the open notepad and tell me it looks right.
    2. Swap the hand-rolled hook for the shipped one here, or leave it? I
       would swap it.
    3. I commit and open the PR once you have tested.

## When NOT to use this

A conversational reply, a single lookup, a mid-run status update, or a pause
where you are about to keep working. Wrapping a one-line answer in three
lettered headings is worse than not having the format at all -- it buries the
answer and trains the reader to skim the headings.
