---
id: 7
slug: reconcile-the-reserved-word-list-retiring-is-now-reserved
title: "Reconcile the reserved word list: retiring is now reserved"
kind: exec-plan
created_at: 2026-07-23T17:34:09Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Reconcile the reserved word list: retiring is now reserved

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for **keiro-dsl**, a small domain-specific
language for describing event-sourced workflows whose source files end in `.keiro`. One
highlighter is a Vim/Neovim syntax file, the other is a TextMate grammar consumed by the
Shiki JavaScript highlighter. Both must agree, token for token, with the language's parser,
which lives in a *different* repository at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`.

The parser has a list called `reservedWords` — the words it refuses to accept as an ordinary
identifier. Section 3 of this repository's cross-package contract,
`spec/keiro-dsl-language-model.md`, is a **verbatim copy** of that list, and the spec states
in two places that the copy must match the parser exactly so the two can be diffed
mechanically. In the keiro-dsl commit range
`451acf2188005211c2d2fe81835e6bff0a4c0580..75286d7799b99cb49a03e616d0b07cc6f2526613` —
whose relevant change is the range-ending (triggering) commit
**`75286d7799b99cb49a03e616d0b07cc6f2526613`, `feat(dsl): gate replayability in evolution
diffs`** — that list grew by one word, from 70 to 71:

```diff
     , "true"
     , "false"
+    , "retiring"
     , "deprecated"
     , "upcast"
     , "from"
```

That single line is the *entire* change this range makes to the lexical surface of `.keiro`
files. Nothing else about the language's text changed: no new operator, no new literal form,
no change to how comments, strings, numbers, or identifiers are lexed. The rest of the
commit is evolution-diff semantics in `keiro-dsl/src/Keiro/Dsl/Diff.hs`, which has no
lexical surface of its own.

**The word `retiring` is already highlighted here, and it keeps exactly the colour it has
today.** The immediately preceding reconciliation in this repository
(`docs/plans/6-highlight-the-retiring-event-marker.md`, keiro-dsl commit
`451acf2188005211c2d2fe81835e6bff0a4c0580`) added `retiring` as a **Modifier** — the token
class for a word that qualifies a declaration without introducing one, rendered
`storage.modifier.keiro` in Shiki and linked to the Vim highlight group `StorageClass`. At
that time the parser recognised `retiring` only *in context* (inside the parser function
`pEvent`, in the optional slot immediately before the word `event`) and did **not** reserve
it, so plan 6 recorded it in the spec's Section 4, the curated list of *contextual* keywords
— words the parser recognises in a specific position but would still let you use as an
ordinary name elsewhere. Upstream has now reserved it. The word therefore moves from Section
4 to Section 3, and both highlighters keep matching it byte-for-byte as they already do.

So what does a user actually gain? Two things, and neither of them is a colour change.

First, **the spec stops lying.** Section 3 today claims to be a verbatim 70-word copy of
`reservedWords`, and it is not — it is missing `retiring`. Worse, the paragraph directly
beneath the list uses `retiring` as its worked example of "a bare word that *could* be
reserved and simply is not", which is now the opposite of the truth. Anyone implementing a
third highlighter from this document, or diffing Section 3 against the parser during the
next reconciliation, would be reading a false statement and would be told to *leave it
false*. After this plan, `spec/keiro-dsl-language-model.md` Section 3 lists exactly the 71
words the parser lists, in the parser's order, and its explanatory prose describes a real
asymmetry instead of a stale one.

Second, **the invariant becomes testable.** The reason this reconciliation is dull is that
plan 6 happened to guess right about `retiring` a commit early. The next time a word joins
`reservedWords`, nobody will be so lucky: the word will simply not be in either highlighter,
and neither test suite will notice, because every existing assertion names a specific token
by hand. This plan closes that gap by adding one new test to each suite that reads the 71
words out of Section 3 of the spec and asserts that **both packages classify every one of
them as some kind of keyword**. Run it against a spec that has gained a word the
highlighters do not know, and it fails by name. That is the durable value of this
reconciliation, and it is directly motivated by the change: a word joining Section 3 is
precisely the event the guard watches for.

The observable proof is the two package test suites running green with the new guard in
place:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

You can also see the guard doing its job by hand. Temporarily add a nonsense word such as
`frobnicate` to the Section 3 code block in `spec/keiro-dsl-language-model.md`, re-run either
suite, and watch it fail with that word named in the failure message; remove the word and it
goes green again. That before/after is spelled out step by step under Validation and
Acceptance.


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] M0 (2026-07-23) — Read the keiro-dsl diff for the range and established the lexical
      delta: exactly one line, `"retiring"` added to `reservedWords` (70 → 71). No new
      keyword spelling, operator, literal, comment, string, number, or identifier rule; the
      rest of the range is `Diff.hs` evolution semantics.
- [x] M1 (2026-07-23) — `spec/keiro-dsl-language-model.md` reconciled: Section 3's list
      regrown to the verbatim 71 words with `retiring` in parser position (between `false`
      and `deprecated`), its count updated, its stale bare-word example replaced with the
      router `resolve` clause, and the event-prefix explanation moved in from Section 4;
      Section 4's grid and prose lost `retiring`; Section 6's Modifier row re-pointed at
      Section 3.
- [x] M2 (2026-07-23) — Confirmed both packages already match `retiring` and need no
      grammar edit; recorded the evidence rather than making a no-op change.
- [x] M3 (2026-07-23) — Reserved-word coverage guard added to both suites
      (`packages/shiki-keiro/test/scopes.test.ts`,
      `packages/keiro-vim/test/highlight_spec.lua`): each reads Section 3 of the spec and
      asserts all 71 words are classified as keywords.
- [x] M4 (2026-07-23) — Both suites green: Shiki `22 pass / 0 fail`; Vim `99 checks,
      0 failures`. Guard proven to fail on drift by injecting a bogus word into Section 3
      (see Validation and Acceptance for the transcripts).
- [x] M5 (2026-07-23) — `.keiro-dsl-sync-subject` written.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **The whole lexical delta for the range is one line, and it lands in a commit about
  something else entirely.** `75286d7` is titled `feat(dsl): gate replayability in evolution
  diffs`; its substance is 64 changed lines in `keiro-dsl/src/Keiro/Dsl/Diff.hs` adding
  `EventRetirementInProgress` / `DeprecatedEventReplayHazard` advisories and an
  `UpcasterChainGap` breaking change. The `reservedWords` addition rides along. Evidence:

  ```bash
  git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
    451acf2188005211c2d2fe81835e6bff0a4c0580..75286d7799b99cb49a03e616d0b07cc6f2526613 \
    -- keiro-dsl/src/Keiro/Dsl/Parser.hs
  ```

  ```text
   keiro-dsl/src/Keiro/Dsl/Parser.hs | 1 +
   1 file changed, 1 insertion(+)
  ```

  The lesson for the automation is that a commit subject is not a filter: the sync must
  always diff `Parser.hs` itself, because a lexical change can arrive as a drive-by fix
  inside a semantics commit.

- **This reverses a decision plan 6 made deliberately, one commit early.** Plan 6's Decision
  Log contains "Do **not** add `retiring` to Section 3 of the spec; add it to Section 4's
  curated contextual list", with the rationale that `reservedWords` had not changed in that
  range and adding the word would break Section 3's mechanical-diffability invariant. That
  was correct at `451acf2` and is wrong at `75286d7`. The invariant did its job exactly as
  designed — it kept the spec honest for one commit, then forced the correction the moment
  upstream moved. Nothing in plan 6 needs retracting; plan 6's classification of `retiring`
  as a Modifier is unaffected, and only its *placement* changes.

- **The upstream inconsistency plan 6 flagged as "not this repository's to fix" is now
  fixed.** Plan 6's second Surprise observed that because `pBodyItem` composes aggregate body
  items with `choice [… BIEvent <$> pEvent …]` and megaparsec's `<|>` does not backtrack once
  an alternative has consumed input, a line such as `retiring -- ConfirmReservation -->` (a
  transition out of a state *named* `retiring`) could not parse — even though `ident` would
  have accepted `retiring` as a state name. Reserving the word removes the trap at the
  source: `ident` now rejects `retiring` outright, so the word can no longer be a state,
  register, field, or type name anywhere, and the failure is a clear "unexpected reserved
  word" instead of a confusing parse error. Evidence — `ident` in `Parser.hs` tests
  membership directly:

  ```haskell
  ident = (lexeme . try) $ do
      c <- asciiLetter <|> char '_'
      cs <- many identChar
      let w = T.pack (c : cs)
      if w `elem` reservedWords
          then fail ("unexpected reserved word " <> T.unpack w)
          else pure w
  ```

- **Reservation does not stop `retiring` appearing as a *wire* word, so the highlighters'
  unconditional matching is unchanged in both directions.** `reservedWords` is consulted only
  by `ident`. The two other identifier shapes, `wireWord` and `patchIdWord`, do no such check,
  so a context name, id prefix, enum wire spelling, status-map value, or patch id may still be
  spelled `retiring` (or `event`, or `guard`) and both highlighters will still colour it as a
  keyword. That is a pre-existing and accepted property of purely lexical highlighting — the
  spec's Section 1 states highlighting is lexical and Section 3 states reserved words are
  highlighted "regardless of context" — and it is recorded here only so a future
  reconciliation does not mistake it for a regression introduced by this change.

- **Every one of the 71 reserved words was already classified by both packages before this
  plan, so the new coverage guard passes on its first run.** That was not obvious in advance —
  it is what made the guard worth adding rather than risky. Evidence, from probing the built
  grammar and the live Vim syntax rather than from reading the regexes:

  ```text
  shiki: all 71 covered
  vim:   context -> keiroKeyword, status-map -> keiroStatement, dispatch -> keiroKeyword,
         read-model -> keiroStatement, true -> keiroBoolean, HOLE -> keiroConstant,
         retiring -> keiroModifier, deprecated -> keiroModifier, map -> keiroStatement, ...
  ```

- **Vim's `syntax keyword` rules are invisible to a buffer whose syntax was never loaded, so
  the Vim guard must set `filetype` *after* filling the scratch buffer, not before.** The
  guard writes the 71 words one per line into a fresh `enew!` buffer and probes column 1 of
  each line. Setting `vim.bo.filetype = 'keiro'` fires Vim's `FileType` autocommand, which
  sources `packages/keiro-vim/syntax/keiro.vim`; doing it after `nvim_buf_set_lines` (and
  following it with `syntax sync fromstart`) makes every line highlight on the first probe.
  This is why the guard does not reuse the existing `open()` helper, which edits a corpus file
  from disk and asserts `filetype == 'keiro'` was detected by extension.

- **The scratch buffer broke the suite's clean exit until it was marked `buftype=nofile`.**
  The first working version of the Vim guard printed `99 checks, 0 failures` and then died on
  the script's closing `vim.cmd('quitall')`, because the scratch buffer held unsaved changes:

  ```text
  99 checks, 0 failures
  E5113: Lua chunk: [string "vim/_core/editor"]:355: nvim_exec2(), line 1:
  Vim(quitall):E37: No write since last change
  ```

  This mattered more than it looks: `packages/keiro-vim/test/run.sh` runs with `set -euo
  pipefail`, so a suite that reports zero failures and *then* aborts still exits non-zero and
  reads as a red run. The fix is to set `buftype=nofile`, `bufhidden=wipe`, and `swapfile=false`
  on the scratch buffer immediately after `enew!`, and to clear `modified` after the probes.
  Changing the final `quitall` to `quitall!` would also have silenced it, but that would have
  weakened the existing script's guarantee that a normal run leaves nothing unsaved behind.


## Decision Log

Record every decision made while working on the plan.

- Decision: Reuse the `intention` and `master_plan` frontmatter values from the sibling plan
  `docs/plans/6-highlight-the-retiring-event-marker.md` rather than prompting for new ones.
  Rationale: This plan runs unattended as the `sync-keiro-dsl` mori automation; there is no
  interactive user to supply an Intention ID, and the work continues the same master plan
  (`docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md`) that produced the
  spec and both packages. Plans 4, 5, and 6 set this precedent for the same reason.
  Date: 2026-07-23

- Decision: Move `retiring` from the spec's Section 4 to Section 3 and update the count from
  70 to 71, inserting it between `false` and `deprecated` to match the parser's own ordering.
  Rationale: Section 3 opens with "The list is copied verbatim from the parser (order
  preserved)" and closes with "this list must stay a verbatim copy of `reservedWords` so it
  can be diffed against the parser mechanically". Any placement other than the parser's own
  is a silent divergence that would defeat a line-by-line diff, which is the one thing the
  list exists to support.
  Date: 2026-07-23

- Decision: Replace Section 3's worked example of "a bare word that could be reserved and is
  not" with the router `resolve` clause, rather than deleting the paragraph.
  Rationale: The paragraph exists to stop a future reconciliation from "fixing" Section 4 by
  hoisting its words into Section 3. That hazard is unchanged — Section 4 still holds dozens
  of bare unreserved keywords. Only the example went stale. `pResolveDecl` parses five literal
  words in a fixed order (`resolve stable via read-model X row`) of which exactly two are
  reserved, so it demonstrates the asymmetry inside a single clause and is checkable by
  reading one seven-line function. The replacement also names `retiring` and commit `75286d7`
  as the case where the parser reserved a bare word *later*, which is the more useful warning.
  Date: 2026-07-23

- Decision: Keep the prose that explains the `retiring` / `deprecated` event-prefix slot, but
  move it from Section 4 into Section 3, and re-point Section 6's Modifier row at Section 3.
  Rationale: Section 4 is defined as "words the parser recognizes in context that are *not* in
  `reservedWords`", so leaving an explanation of two now-reserved words inside it would
  contradict the section's own definition — the same reasoning that put the existing
  "(`process` and `dispatch` used to be listed here …)" note in place. The explanation itself
  is still needed: Section 6 classifies both words as Modifiers rather than control keywords,
  and that classification is only defensible if the reader can see they occupy one shared
  optional slot.
  Date: 2026-07-23

- Decision: Make **no** change to `packages/keiro-vim/syntax/keiro.vim` or
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, and do not rebuild
  `packages/shiki-keiro/dist/index.js`.
  Rationale: Reservation changes which words the *parser* rejects as identifiers; it does not
  change which words *appear* in valid `.keiro` text or what they should look like. Both files
  already match `retiring` and already assign it the Modifier class this range leaves
  untouched, so any edit here would be churn. Section 6's classification is what the packages
  implement, and Section 6's Modifier row keeps `retiring` verbatim.
  Date: 2026-07-23

- Decision: Add **no** new corpus file, and leave `corpus/README.md` unchanged.
  Rationale: The instruction driving this sync is to add a corpus sample "exercising any new
  surface". There is no new surface: reservation removes a spelling from the space of legal
  programs rather than adding one, so no `.keiro` text is valid now that was not valid before.
  `corpus/reservation-retiring.keiro` and `corpus/reservation-deprecated-replay-only.keiro`
  already give both suites a sample of each event prefix, and their README provenance entries
  (copied at `451acf2`) remain accurate statements about where those bytes came from.
  Date: 2026-07-23

- Decision: Spend this plan's test budget on a **reserved-word coverage guard** in both
  suites, rather than adding another hand-named assertion about `retiring`.
  Rationale: Both suites already assert `retiring` is a Modifier (plan 6, M5), and this range
  does not change that, so a further hand-written assertion would restate a passing test. The
  real gap this range exposes is structural: nothing mechanically checks Section 3 against the
  highlighters, so the *next* word to join `reservedWords` would go unhighlighted in silence.
  A guard that reads the spec and asserts all 71 words are classified turns that class of
  drift into a named failure in both packages, and it is the smallest change that makes the
  invariant Section 3 asserts actually enforceable.
  Date: 2026-07-23

- Decision: Have the guard assert only that each word lands in *some* keyword-ish class
  (introducer, control, modifier, or language constant), not that it lands in a specific one.
  Rationale: Section 6 deliberately splits the reserved words across four classes and lets the
  two packages differ in one known place (`event` and `command` are `keyword.declaration` in
  Shiki and `keiroStatement` in Vim — a pre-existing divergence recorded in plan 6's
  Surprises). A per-word class assertion would either re-litigate that divergence or freeze
  the current split, turning every deliberate reclassification into a test edit. "Is it a
  keyword at all?" is the question that catches the failure mode worth catching — a reserved
  word rendering as plain identifier text — and nothing else.
  Date: 2026-07-23


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-07-23): complete and meeting the original purpose.** The one-line lexical
change in keiro-dsl `75286d7799b99cb49a03e616d0b07cc6f2526613` is reconciled.
`spec/keiro-dsl-language-model.md` Section 3 now holds exactly the parser's 71 reserved
words in parser order, `retiring` among them between `false` and `deprecated`; its stale
"bare words are sometimes not reserved" example has been replaced by the router `resolve`
clause, which is true and stays true; the event-prefix explanation and the Modifier
cross-reference now sit in Section 3 alongside the words they describe; and Section 4 no
longer claims a reserved word as contextual. Neither highlighter needed a grammar edit —
both already matched `retiring` as a Modifier from plan 6 — so
`packages/keiro-vim/syntax/keiro.vim`, `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`,
and the tracked `dist/` bundle are byte-identical to before, which the Interfaces and
Dependencies contracts assert explicitly.

**The lasting artifact is the coverage guard, not the word.** Both suites now read the 71
words out of Section 3 of the spec and assert every one of them is classified as a keyword by
the package under test. Shiki reports `22 pass / 0 fail` (up from 20); Vim reports
`99 checks, 0 failures` (up from 27 — the jump is the existing 27 plus a count check plus 71
per-word checks). Both guards passed on their first run, confirming that the highlighters had
in fact kept pace with all 70 previously-reserved words. Both were then proven to *fail* on
drift by injecting a bogus word into Section 3 and watching each suite name it.

**Lesson — an invariant is only worth stating if something can check it.** Section 3 has
asserted "this list is a verbatim copy of `reservedWords`" since plan 1, and the copy had
already drifted by one word before anyone noticed, in the narrow window between two upstream
commits. The prose invariant did eventually work, because a human-written reconciliation read
it. The guard added here makes the weaker but automatic version of the same claim — every
word the spec lists is a word the highlighters know — hold on every test run. A future plan
could go further and diff Section 3 against `Parser.hs` directly, but that would make this
repository's test suite depend on a sibling checkout being present at a fixed path, which is
a real cost for a check the `sync-keiro-dsl` automation already performs by construction.

**Against scope.** Sections 1, 2, and 5 of the spec were left alone: the range changed no
comment, string, number, or identifier rule and added no operator. `Diff.hs` — the bulk of
the commit — computes evolution advisories (`EventRetirementInProgress`,
`DeprecatedEventReplayHazard`, `UpcasterChainGap`) from the parsed AST and has no lexical
surface. The new golden payload
`keiro-dsl/test/golden-payloads/hospital-capacity/Reservation/TransferReservationCreated.v1.json`
is JSON, not `.keiro`, and the conformance-suite changes are Haskell.


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master`. Commit directly to
`master`; do not create a branch. This repository ships two syntax highlighters for
**keiro-dsl**, a domain-specific language for event-sourced workflows whose files end in
`.keiro`.

**Highlighting here is purely lexical.** Tokens are coloured one at a time by pattern
matching. There is no parse of the grammar, no nesting, and no type inference. A word is a
keyword because it appears in a fixed list, not because of where it sits on the line. A
consequence worth internalizing, because this plan turns on it: whether the parser *reserves*
a word or merely recognises it in context makes no difference at all to how this repository
colours it. Both kinds are matched unconditionally, everywhere they appear. Reservation
matters here only because the spec's Section 3 promises to mirror the parser's list exactly.

**The authoritative parser is outside this repository.** It is a Haskell file using the
`megaparsec` parser-combinator library at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`. Read it; never edit
it. Three of its definitions matter for this plan:

- `reservedWords :: [Text]` (around line 111) — a flat list of the words the parser refuses to
  accept as a plain identifier. This is the list Section 3 of the spec copies. It now holds 71
  words; before commit `75286d7` it held 70.
- `ident :: P Name` (immediately after `reservedWords`) — the parser for a plain identifier.
  It reads a letter or `_` followed by letters, digits, or `_`, then fails with "unexpected
  reserved word" if the result is in `reservedWords`. This is the *only* place `reservedWords`
  is consulted, which is why reserving a word restricts identifiers and nothing else.
- `pEvent :: P Event` (around line 483) — the parser for an event declaration inside an
  aggregate body. It begins with an optional prefix that is either `retiring` or `deprecated`,
  then the word `event`:

  ```haskell
  (retiring, deprecated) <-
      option
          (False, False)
          ( choice
              [ (True, False) <$ keyword "retiring"
              , (False, True) <$ keyword "deprecated"
              ]
          )
  keyword "event"
  ```

  This function is **unchanged** in this range. It is quoted here because the spec text this
  plan moves describes it, and because it explains why the two prefixes share one token class.

To see the change this plan reconciles, read-only:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  451acf2188005211c2d2fe81835e6bff0a4c0580..75286d7799b99cb49a03e616d0b07cc6f2526613 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs
```

The four artifacts this repository keeps in agreement:

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 1 is an overview,
  Section 2 covers comments, strings, numbers, and identifier shapes, Section 3 is the
  verbatim `reservedWords` list, Section 4 is a *curated* set of words the parser recognises
  in context but does not reserve (with a sub-list for the ones written with hyphens), Section
  5 lists operators, and Section 6 is the token-class taxonomy: a table mapping each
  conceptual class to a TextMate scope (used by Shiki) and a standard Vim highlight group
  (used by Vim).
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file. It uses `syntax keyword`
  for bare words, `syntax match` for hyphenated words and operators, `syntax region` for
  strings, and `highlight default link` to map its own `keiro*` groups onto standard Vim
  groups such as `Statement`, `Keyword`, and `StorageClass`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar, scope name
  `source.keiro`. It has a top-level `patterns` array of `{ "include": "#name" }` entries and
  a `repository` object defining each named rule.
- `corpus/*.keiro` — shared `.keiro` sample files that *both* test suites tokenize.
  `corpus/README.md` records where each file came from.

Terms used below:

- **Reserved word** — a word the parser forbids as a bare identifier, i.e. a member of
  `reservedWords`. Always a keyword here.
- **Contextual keyword** — a word the parser recognises in a specific position but does not
  reserve, so it could still be used as a name elsewhere. A curated subset is coloured as
  keywords (spec Section 4). `retiring` is leaving this set.
- **Introducer** — a keyword that begins a top-level item or node (`aggregate`, `router`, …);
  scope `keyword.declaration.keiro`, Vim group `Keyword`.
- **Modifier** — a keyword that qualifies a declaration without introducing one
  (`deprecated`, `retiring`, `upcast`, `required`, `replay-only`, …); scope
  `storage.modifier.keiro`, Vim group `StorageClass`. `retiring` is already in this class and
  stays in it.

The two test suites:

- **Vim** — `packages/keiro-vim/test/highlight_spec.lua`, run headless by
  `packages/keiro-vim/test/run.sh` (requires `nvim` on `PATH`). Its existing assertions are
  `expect(<literal text>, <expected keiro group>)`: the helper finds the first line in the
  current buffer containing that literal text, then asserts that
  `synIDattr(synID(line, col_of_first_char, 1), 'name')` equals the expected group. Buffers
  are opened from the corpus with `open('corpus/<file>.keiro')`. The script counts checks and
  failures in the locals `checks` and `failures`, prints a summary, and calls `cquit 1` if
  anything failed.
- **Shiki** — `packages/shiki-keiro/test/scopes.test.ts`, run with `bun test` from
  `packages/shiki-keiro/`. It tokenizes a string with
  `codeToTokensBase(code, { lang: 'keiro', theme: 'github-light', includeExplanation: true })`
  and asserts that the token whose trimmed content equals a given string carries an expected
  scope name. Shiki merges adjacent same-coloured tokens for display but preserves per-match
  boundaries in `explanation[]`, which is the level its helper searches.


## Plan of Work

### Milestone 1 — Reconcile the cross-package contract (`spec/keiro-dsl-language-model.md`)

This is the substance of the plan. Four edits, all in one file. At the end of this milestone
the spec is a true description of the parser at `75286d7`; nothing is runnable yet.

**Edit 1 — Section 3's count and list.** The sentence introducing the code block reads "The
list is copied verbatim from the parser (order preserved) and contains exactly **70** words".
Change `70` to `71`. Then insert `retiring` into the code block between `false` and
`deprecated`, matching the parser's order, and re-flow the six-column grid so the columns stay
aligned. The finished block is 12 rows: eleven rows of six words and a final row of five. The
exact text to use is given in Concrete Steps; verify afterwards that the block contains 71
whitespace-separated words and that reading it left-to-right, top-to-bottom reproduces the
parser's list.

**Edit 2 — Section 3's stale worked example.** Beneath the list, the paragraph beginning
"**Not every keyword is a reserved word.**" gives two bullets explaining why a keyword might
sit outside `reservedWords`. The first bullet (dashed keywords cannot need reserving, because
`ident` produces no hyphens) is still exactly right and must not be touched. The second bullet
currently reads:

> A keyword written as a **bare word** *could* be reserved, and sometimes simply is not. The
> parser matches `retiring` with `keyword "retiring"` in `pEvent`, in the same optional slot
> as `deprecated` — yet `deprecated` is reserved and `retiring` is not. Do not read anything
> into the asymmetry; the parser reserves a word when its author chose to.

Every factual clause in it is now false. Replace it with the router `resolve` clause, which
demonstrates the same point and is stable: `pResolveDecl` in `Parser.hs` parses five literal
words in a fixed order — `resolve`, `stable`, `via`, `read-model`, `row` — of which only
`resolve` and `read-model` are reserved. Close the bullet by noting that the parser sometimes
reserves a bare word *later*, naming `retiring` and keiro-dsl commit `75286d7` as the case in
point, so the next reader understands why the example changed. Exact replacement text is in
Concrete Steps.

**Edit 3 — Section 3 gains the event-prefix note; Section 4 loses `retiring`.** Section 4 is
introduced as the set of words "the parser also recognizes **in context** that are *not* in
`reservedWords`", so a now-reserved word cannot stay in it. Three changes follow from that:

1. Section 4's parenthetical currently reads "(`process` and `dispatch` used to be listed
   here; they are now **reserved** — see Section 3.)". Extend it to name `retiring` too. This
   is the established convention in this file for a word that graduates from Section 4 to
   Section 3.
2. Remove `retiring` from the last row of Section 4's bare-word grid (the row reading
   `partitioned unordered off strict lenient retiring`), leaving five words in that row.
3. Move the paragraph that follows Section 4's grid — the one beginning "`retiring` is an
   optional prefix on an **event declaration**…", including its two-line `.keiro` example —
   into Section 3, placed after the `readmodel`/`read-model` note and before the "**Not every
   keyword is a reserved word.**" paragraph. Adjust its wording so it no longer implies the
   word is contextual: both prefixes are reserved now, and the note's job is to justify why
   Section 6 classifies them as Modifiers rather than control keywords.

**Edit 4 — Section 6's cross-reference.** The Modifier row of the Section 6 table says
"`deprecated`, `retiring` (the two mutually exclusive event prefixes — see Section 4)".
Change "Section 4" to "Section 3", since the explanation now lives there. The member list
itself does not change: both words stay Modifiers. No other row changes — the Control row
already reads "all other reserved keywords (Section 3) … *except the words the Modifier row
below claims*", which correctly excludes both prefixes now that they are reserved.

One more line in Section 3 deserves attention. Its closing paragraph tells the reader that if
`reservedWords` ever changes, they should "record the difference in this repository's plan
`docs/plans/4-…`". Plan 4 was the last plan to change the list before this one, but hard-coding
a single plan path guarantees the pointer goes stale on exactly the occasion it is read.
Rewrite it to point at whichever ExecPlan performs the reconciliation, and note the two
changes on record so far: 50 → 70 words (plan 4) and 70 → 71 (this plan).

### Milestone 2 — Confirm the highlighters need no change

No edits are expected in this milestone; its purpose is to *prove* that, so that "we changed
nothing" is a finding rather than an omission. Reservation restricts which words `ident` will
accept as a name. It does not introduce a spelling, so no `.keiro` file can contain text today
that it could not contain at `451acf2`, and the correct rendering of `retiring` — Modifier —
is unchanged.

Check both packages already match the word:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
grep -n 'retiring' packages/keiro-vim/syntax/keiro.vim
grep -n 'retiring' packages/shiki-keiro/syntaxes/keiro.tmLanguage.json
```

Expect `retiring` in a `syntax keyword keiroModifier` line in the first, and inside the
`repository.modifiers` alternation in the second. Because no grammar file changes, the tracked
Shiki bundle `packages/shiki-keiro/dist/index.js` does **not** need rebuilding — leave it
alone so the diff for this plan stays honest about what changed.

### Milestone 3 — Add the reserved-word coverage guard to both suites

This milestone adds the only new behaviour in the plan. Each suite gains one test that reads
the 71 words out of Section 3 of `spec/keiro-dsl-language-model.md` and asserts the package
under test classifies each as a keyword of some kind. Both tests must parse the spec the same
way, so define the extraction once in prose and implement it twice: scan the file for the line
starting `## Section 3`, then take the first fenced block after it (a line that is exactly
```` ```text ````, up to the next line that is exactly ```` ``` ````), and split its contents
on whitespace. Assert the result has exactly 71 entries before checking any of them — a
count mismatch means either the spec drifted or the extraction broke, and either way the
per-word results would be misleading.

**Shiki.** In `packages/shiki-keiro/test/scopes.test.ts`, add a helper that reads the spec via
the existing `repoRoot` constant and returns the word list, then a test that tokenizes each
word on its own (a one-word document is enough — the grammar is stateless between tokens
apart from strings and comments, neither of which a bare word starts) and asserts at least one
of its scopes is in the allowed set:

```typescript
const KEYWORDISH_SCOPES = new Set([
  'keyword.declaration.keiro',
  'keyword.control.keiro',
  'storage.modifier.keiro',
  'constant.language.keiro',
  'constant.language.boolean.keiro',
])
```

Collect every failing word and assert on the collected array rather than failing at the first
one, so a run that has drifted by several words reports all of them at once.

**Vim.** In `packages/keiro-vim/test/highlight_spec.lua`, the existing `open()` helper cannot
serve here — it edits a corpus file from disk. Instead open a fresh scratch buffer with
`vim.cmd('enew!')`, mark it `buftype=nofile` / `bufhidden=wipe` / `swapfile=false`, write the
words one per line with `vim.api.nvim_buf_set_lines(0, 0, -1, false, words)`, *then* set
`vim.bo.filetype = 'keiro'` (which fires the `FileType` autocommand that sources the syntax
file) and `vim.cmd('syntax sync fromstart')`. Probe each line with the file's existing
`group_at(lnum, 1)` helper and accept any of `keiroKeyword`, `keiroStatement`, `keiroModifier`,
`keiroBoolean`, `keiroConstant`. Route the per-word results through the file's existing
`checks` / `failures` counters and `print` conventions so the summary line at the end stays
accurate and a failure still triggers `cquit 1`. Clear `vim.bo.modified` after the probes.

Two details are load-bearing, both learned the hard way and recorded under Surprises &
Discoveries. Filling the buffer *before* setting `filetype` avoids a buffer whose syntax was
never applied to its contents. And the `buftype=nofile` / cleared-`modified` pair is what lets
the script's closing `vim.cmd('quitall')` succeed — without it the run reports zero failures
and then aborts with `E37: No write since last change`, which under `run.sh`'s `set -euo
pipefail` still exits non-zero. Run the guard **last** in the Vim script, after all corpus-file
assertions, because it leaves the scratch buffer as the current buffer.

At the end of this milestone, both suites fail loudly and by name if a word in Section 3 is
unknown to the package under test, and pass otherwise.

### Milestone 4 — Run both suites green

See Concrete Steps.

### Milestone 5 — Write the sync subject

Write a single Conventional Commits subject line to `.keiro-dsl-sync-subject` at the
repository root. The calling `sync-keiro-dsl` automation reads this file and owns the commit.
Because the user-visible outcome of this range is a corrected contract plus a new guard — not
a new colour — the subject is a `docs(spec)` change rather than a `feat(syntax)` one.


## Concrete Steps

All commands assume the working directory `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless
stated otherwise.

Inspect the upstream change this plan reconciles (read-only):

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  451acf2188005211c2d2fe81835e6bff0a4c0580..75286d7799b99cb49a03e616d0b07cc6f2526613 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs
```

```diff
@@ -136,6 +136,7 @@ reservedWords =
     , "status-map"
     , "true"
     , "false"
+    , "retiring"
     , "deprecated"
     , "upcast"
     , "from"
```

The exact replacement for Section 3's code block in `spec/keiro-dsl-language-model.md` —
71 words, parser order, six aligned columns:

```text
context   module    layout    prefixed      collocated  id
enum      rule      ex        aggregate     regs        states
command   event     wire      projection    snapshot    category
guard     write     emit      goto          fields      status-map
true      false     retiring  deprecated    upcast      from
HOLE      process   router    dispatch-each resolve     read-model
dispatch  intake    contract  topic         accept      bind
dedupe    persist   decode    disposition   publisher   map
workqueue queue     payload   retry         fanout      dedup
enqueue   seenIn    workflow  operation     consistency body
step      await     sleep     child         patch       continueAsNew
readmodel columns   feed      scope         shape
```

The exact replacement for Section 3's second bullet:

```text
- A keyword written as a **bare word** *could* be reserved, and sometimes simply is not. A
  router's resolve clause is five literal words in a fixed order — `pResolveDecl` parses
  `resolve`, `stable`, `via`, `read-model`, then an identifier, then `row` — and yet only
  `resolve` and `read-model` are reserved. `stable`, `via`, and `row` sit in Section 4, and
  `ident` would happily produce any of them. Do not read anything into the asymmetry; the
  parser reserves a word when its author chose to, and it may reserve one *later*: `retiring`
  was a bare unreserved keyword until keiro-dsl commit `75286d7`, which added it to this list
  without changing a single thing about how the word is spelled or where it may appear.
```

Verify the list after editing — the count and the round-trip against the parser:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
awk '/^## Section 3/{f=1} f&&/^```text/{g=1;next} g&&/^```/{exit} g' \
  spec/keiro-dsl-language-model.md | tr -s '[:space:]' '\n' | grep -c .
```

```text
71
```

```bash
diff <(awk '/^## Section 3/{f=1} f&&/^```text/{g=1;next} g&&/^```/{exit} g' \
        spec/keiro-dsl-language-model.md | tr -s '[:space:]' '\n' | grep .) \
     <(sed -n '/^reservedWords ::/,/^    \]$/p' \
        /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs \
        | grep -oE '"[A-Za-z0-9_-]+"' | tr -d '"') && echo 'spec matches parser'
```

```text
spec matches parser
```

That second command is the mechanical diff Section 3 exists to enable; it is worth running
once by hand even though it is not part of either suite (it needs the sibling keiro checkout,
which the suites deliberately do not depend on).

Run both suites:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

Observed Shiki transcript tail:

```text
bun test v1.3.13 (bf2e2cec)

 22 pass
 0 fail
 60 expect() calls
Ran 22 tests across 1 file. [253.00ms]
```

Observed Vim transcript tail:

```text
ok   "readmodel" -> keiroKeyword
ok   "columns" -> keiroStatement
ok   "feed" -> keiroStatement
ok   "scope" -> keiroStatement
ok   "shape" -> keiroStatement

99 checks, 0 failures
```

Write the sync subject:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
printf '%s\n' \
  'docs(spec): record retiring as a reserved word and guard the Section 3 list' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Both suites must exit 0. `bun test` must print `0 fail`; `packages/keiro-vim/test/run.sh`
must print `0 failures` (it calls `cquit 1` on any failure, so a non-zero exit is itself the
signal).

The headline acceptance for this plan is that **the guard actually guards**. Prove it by
breaking the spec on purpose and watching both suites name the offending word. Append a word
the highlighters do not know to Section 3's code block:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
cp spec/keiro-dsl-language-model.md /tmp/spec-backup.md
```

Edit `spec/keiro-dsl-language-model.md` and change the final line of Section 3's block from

```text
readmodel columns   feed      scope         shape
```

to

```text
readmodel columns   feed      scope         shape       frobnicate
```

Then:

```bash
(cd packages/shiki-keiro && bun test) ; ./packages/keiro-vim/test/run.sh
```

Both Shiki guard tests fail, and the second one names the word:

```text
error: expect(received).toBe(expected)

Expected: 71
Received: 72

(fail) the spec Section 3 list holds the parser 71 reserved words [5.42ms]

error: expect(received).toEqual(expected)

- []
+ [
+   "frobnicate: ["source.keiro"]",
+ ]

(fail) every reserved word is classified as a keyword by the grammar [5.41ms]

 20 pass
 2 fail
```

The `["source.keiro"]` in that message is the whole point: `frobnicate` carried only the
grammar's root scope, meaning no rule claimed it and it would render as plain identifier text.
Vim reports the same drift in its own idiom, and `run.sh` exits 1:

```text
FAIL reserved-word count: want 71, got 72
FAIL "frobnicate": want a keyword group, got

100 checks, 2 failures
```

Restore the spec and confirm green again:

```bash
cp /tmp/spec-backup.md spec/keiro-dsl-language-model.md
(cd packages/shiki-keiro && bun test) && ./packages/keiro-vim/test/run.sh
```

Beyond the suites, the reconciliation itself is verifiable by eye. The `diff` command in
Concrete Steps must print `spec matches parser` — that is the whole claim Section 3 makes,
checked against the real parser rather than against this plan's transcription of it. And
opening a `.keiro` file that uses the marker must look exactly as it did before this plan:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/reservation-retiring.keiro
```

With the cursor on the `r` of `retiring`,
`:echo synIDattr(synID(line('.'), col('.'), 1), 'name')` prints `keiroModifier` — the same as
before this plan, which is the point. (Note that `synIDtrans` would print `Type`, not
`StorageClass`: it follows the whole link chain, and Vim's own defaults link `StorageClass` to
`Type`. Use the untranslated form when asserting this repository's classification.)

Finally, `git status --porcelain` at the end of the work must show exactly four entries:

```text
 M packages/keiro-vim/test/highlight_spec.lua
 M packages/shiki-keiro/test/scopes.test.ts
 M spec/keiro-dsl-language-model.md
?? docs/plans/7-reconcile-the-reserved-word-list-retiring-is-now-reserved.md
```

`.keiro-dsl-sync-subject` is deliberately absent: `.gitignore` lists it as "Scratch handoff
from the agent to `scripts/sync-keiro-dsl.sh`", so it never shows up as a change. What matters
is what is *not* in that list — `packages/keiro-vim/syntax/keiro.vim`,
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, `packages/shiki-keiro/dist/` (which is
tracked despite the `dist/` ignore rule), and `corpus/` are all untouched, which is the
concrete form of this plan's claim that reservation changes no rendering.


## Idempotence and Recovery

Every edit is to a tracked file and is safe to repeat. `bun install`, `bun test`, and the Vim
`run.sh` are repeatable and write only to `node_modules/` and test scratch; this plan runs no
build step, so `packages/shiki-keiro/dist/` is never rewritten.

The spec edits are the only ones where a partial application could leave the repository
inconsistent — for example, a list regrown to 71 words while the introducing sentence still
says 70. The two verification commands in Concrete Steps (the word count, and the `diff`
against the parser) detect exactly that, and both are safe to run at any point. If the grid
alignment gets mangled mid-edit, the code block is plain text with no semantic dependence on
column positions: re-paste the block given in Concrete Steps verbatim.

If the deliberate-breakage check under Validation and Acceptance is interrupted, restore the
spec from the backup copy (`cp /tmp/spec-backup.md spec/keiro-dsl-language-model.md`) or, if
that is gone, with `git checkout -- spec/keiro-dsl-language-model.md` followed by re-applying
Milestone 1.

If `nvim` is not installed the Vim suite cannot run locally. That is not a blocker: the
calling `sync-keiro-dsl` automation re-runs both suites itself and owns the commit, so leaving
the tree edited is the correct end state. Record the skip in Progress if it happens.

Do **not** run `git commit`, `git add`, or `git push`, and do **not** write
`spec/.keiro-dsl-sync`. The calling script owns all of those.


## Interfaces and Dependencies

No new runtime or development dependencies. `packages/shiki-keiro/package.json` already
declares everything the Shiki suite uses (`shiki` ^4.0.0, `tsup` ^8.0.0, `typescript` ^5.5.0)
and tests run under `bun test`. The new Shiki guard additionally uses `readFileSync` from
`node:fs` and `resolve` from `node:path`, both of which the test file already imports. The Vim
suite needs `nvim` on `PATH` and uses no plugins (`-u NONE`); the new Vim guard uses only
built-in API (`vim.cmd`, `vim.api.nvim_buf_set_lines`, `vim.bo`, `vim.fn.synID`,
`vim.fn.readfile`).

The keiro-dsl parser at `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`
is a read-only input, not a build dependency. Neither test suite reads it — the guards read
`spec/keiro-dsl-language-model.md` instead — so the suites remain runnable in a checkout that
does not have the sibling keiro repository beside it.

Contracts that must hold at the end of the work:

- `spec/keiro-dsl-language-model.md` Section 3 announces **71** words and its code block
  contains exactly the 71 members of the parser's `reservedWords`, in parser order, with
  `retiring` between `false` and `deprecated`.
- `spec/keiro-dsl-language-model.md` Section 4 does **not** list `retiring` in its bare-word
  grid, and its parenthetical names `retiring` alongside `process` and `dispatch` as words
  that graduated to Section 3.
- `spec/keiro-dsl-language-model.md` Section 6's Modifier row still lists both `deprecated`
  and `retiring`, with its parenthetical pointing at Section 3.
- `packages/keiro-vim/syntax/keiro.vim` and
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` are **byte-identical** to their state
  before this plan, as is `packages/shiki-keiro/dist/`.
- `packages/shiki-keiro/test/scopes.test.ts` exports no new symbols but contains a test that
  reads Section 3 of the spec, asserts the word count is 71, and asserts every word receives
  one of `keyword.declaration.keiro`, `keyword.control.keiro`, `storage.modifier.keiro`,
  `constant.language.keiro`, or `constant.language.boolean.keiro`.
- `packages/keiro-vim/test/highlight_spec.lua` contains the equivalent guard, accepting any of
  `keiroKeyword`, `keiroStatement`, `keiroModifier`, `keiroBoolean`, `keiroConstant`, and
  feeding its results through the existing `checks` / `failures` counters.
- `corpus/` and `corpus/README.md` are unchanged.
