---
name: non-ai-writing
description: Write and review prose so it reads as human, not AI-generated. Use when drafting or editing any user-facing copy (marketing and landing text, emails, dialogs, docs, blog posts), or when asked to "de-AI" something, remove AI tells, or "make this sound human". Flags AI-overused words, phrases, and sentence patterns from tracked reference pages, and can refresh that list from the sources on request.
---

# Non-AI writing

Make writing read like a person wrote it. The tells are not just individual
words. They are CLUSTERS of overused vocabulary plus a handful of giveaway
sentence shapes. This skill supplies the list and the method.

The full, dated list lives in `references/red-flag-words.md` (single words,
sentence patterns, corporate filler, and the "sound human instead" guidance).
Read it when you write or review.

## When to use

- Drafting any user-facing copy (landing pages, dialogs, toasts, emails, docs).
- Editing or reviewing text the user (or an AI) already wrote.
- The user says: "de-AI this", "sounds like AI", "make it human", "remove the
  AI tells", "too many em-dashes", and the like.

## How to apply it

1. Read `references/red-flag-words.md` first. It is the source of truth.
2. Hunt clusters, not singles. One flagged word is usually fine and often the
   correct plain choice. A sentence or paragraph stacked with them is the tell.
   Rewrite the stack; do not robotically swap every instance.
3. Kill the sentence patterns. The strongest tells are structural, not lexical:
   "It's not about X, it's about Y"; "The result?"; three one-word sentences in
   a row; em-dashes as the default connector. Rewrite these even when the words
   are fine.
4. Do not over-correct. Replacing a flagged word with a rare thesaurus synonym
   reads MORE like AI, not less. Plain, spoken words win.
5. Use specifics. Swap generic claims for real numbers, names, and concrete
   detail. Statistically-likely phrasing is the enemy.
6. Read it aloud. If you would not say it to a colleague, cut it.

## Quick review checklist

- [ ] No cluster of red-flag words in any one paragraph
- [ ] No "not X, but Y" / "The result?" / triple-one-word-sentence patterns
- [ ] Em-dashes replaced with periods, commas, or colons unless truly needed
- [ ] No corporate filler (strategic alignment, operational excellence, ...)
- [ ] Concrete specifics in place of generic claims
- [ ] Reads naturally aloud

When reviewing, report the flagged spots with a suggested rewrite for each. Do
not just list words.

## Updating (refresh the list from the sources)

The reference list is a snapshot; the source pages change. To refresh it, invoke
this skill with the argument `update` (for example `/non-ai-writing update`), or
when the user asks to "update the AI words list". Then:

1. WebFetch each source URL listed at the top of
   `references/red-flag-words.md`, asking for the COMPLETE current word/phrase
   list and any advice.
2. Merge the results into the existing categories in
   `references/red-flag-words.md`: add new terms, keep the union, dedupe
   case-insensitively, and preserve the "sound human instead" guidance.
3. Update the `Last updated:` date at the top of the reference file.
4. Report what changed: the terms ADDED and any REMOVED, so the user sees the
   diff rather than a silent overwrite.

To add a new source page, append its URL under `Sources:` in the reference file
and include it in the fetch step above.

### Optional: automatic refresh

For hands-off "it updates itself", a scheduled agent can run the update flow on
a cadence (for example weekly) and refresh `references/red-flag-words.md` from
the sources. Ask to "schedule the AI-words update weekly" and set it up via the
`schedule` skill or a cron routine that re-runs the Updating steps above. Left
off by default so it does not run without the user opting in.
