---
name: run-complete-handoff
description: Emit the three-part end-of-run handoff (1 what happened / 2 where we are now / 3 what's next) as numbered one-liners inside one fenced text block. Invoke when a run of substantive work is FINISHED and you are about to hand control back and wait -- after shipping a change, opening or merging a PR, finishing an investigation, completing a wave, or stopping because you are blocked. Do NOT invoke for a conversational answer, a lookup, or a pause in the middle of work you are about to continue.
---

# Run-complete handoff

The last message of a run is the only part of it the founder is guaranteed to
read. This is its shape.

    1. What happened
    2. Where we are now
    3. What's next

Three numbered sections, items numbered under them as 1.1, 1.2, 2.1 and so on
(founder, 2026-09-08, third revision that day). Earlier forms -- five roman
sections I-V, then lettered A/B/C -- are retired.

## The rules

**THE WHOLE HANDOFF GOES INSIDE ONE FENCED PLAIN-TEXT BLOCK.** Open with a
line of three backticks followed by the word `text`, close with three
backticks, and put nothing outside the fence. The message is rendered as
markdown in the founder's terminal, and outside a fence markdown owns the
whitespace and the first line: a bold heading was cut off, and every kind of
indentation was flattened. Inside a fence nothing is interpreted. Headings
are plain, no bold, no asterisks.

**Section headings are `1. What happened`, `2. Where we are now`,
`3. What's next`**, flush left.

**Items are `N.M.` lines indented four spaces, ONE LINE EACH, NEVER
WRAPPED.** A wrapped item's second line reads as an unindented stray line
(observed 2026-09-08). So every item is a single line, and it is kept short
enough not to soft-wrap in a terminal: aim under 90 characters, split a long
fact into two items rather than run one past that. One fact per line, one
line per fact.

**No third level.** A 1.1.1 is a sign the section is carrying a narrative and
should be cut.

**Tight spacing.** The heading line is immediately followed by its first
item, with no blank line between them and none between items. Exactly one
blank line separates a section's last item from the next heading. Nothing
else.

**All three headings appear, every time.** A missing section reads as
forgotten, and the founder cannot tell the difference between a section you
skipped and a section that was genuinely empty.

**Lead section 1 with the correction if you made one.** If something you
said earlier in the run turned out to be wrong, item 1.1 says so. Burying a
correction under four lines of what went well is how a wrong belief survives
a handoff.

**Section 2 is state, not narrative.** Where the branch is, what is
committed, what is deployed, what is running, what is broken. Present tense.
A reader who skipped 1 should be able to act on 2 alone.

**Section 3 is everything forward-looking, in one list.** Questions only you
cannot answer yourself, what you will do next without being asked, and what
you need from the founder (commands, decisions, credentials), all as numbered
lines in one section. Write only the lines that exist: never "No questions",
never "Nothing until you reply", never a placeholder. Order the lines by what
the founder must act on first. A question with an obvious default is not a
question, it is a decision you should have made; if you have a
recommendation, say which option you would pick. If there is genuinely
nothing forward-looking, section 3 is the single line `    3.1. Done.`

**Unproven stays unproven.** A test that did not run, a tier that stalled, a
claim you could not verify -- it belongs in section 2 as a gap, named. Never
let a green number stand for work that did not happen.

**No preamble and no sign-off.** The fence starts the message. Nothing after
the closing fence.

## Length

Aim for 10-18 lines total. A run that genuinely produced more gets more, but
a handoff that needs scrolling has usually smuggled a narrative into section
1 -- cut it there first, because section 1 is the part the founder can
reconstruct from the diff and section 3 is the part only you know.

## Worked example

The message, verbatim, fence included:

    ```text
    1. What happened
        1.1. You asked why there was no todo panel; I first blamed the child marker.
        1.2. That was wrong: a two-arm probe gave identical tool lists either way.
        1.3. The real gate is CLAUDE_CODE_ENABLE_TODO_TOOLS; TodoWrite no longer exists.

    2. Where we are now
        2.1. This box has the panel on and the clobbered pane record restored.
        2.2. The branch holds seven files, tested, uncommitted.
        2.3. Nothing is on GitHub yet, so no other machine has any of it.

    3. What's next
        3.1. Run the one-liner in the open notepad and tell me it looks right.
        3.2. Swap the hand-rolled hook for the shipped one, or leave it? I would swap.
        3.3. I commit and open the PR once you have tested.
    ```

## When NOT to use this

A conversational reply, a single lookup, a mid-run status update, or a pause
where you are about to keep working. Wrapping a one-line answer in three
numbered headings is worse than not having the format at all -- it buries the
answer and trains the reader to skim the headings.
