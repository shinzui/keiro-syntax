---
id: 5
slug: highlight-the-replay-only-transition-marker
title: "Highlight the replay-only transition marker"
kind: exec-plan
created_at: 2026-07-23T14:47:59Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Highlight the replay-only transition marker

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for **keiro-dsl**, a small domain-specific
language for describing event-sourced workflows whose source files end in `.keiro`. One
highlighter is a Vim/Neovim syntax file, the other is a TextMate grammar consumed by the
Shiki JavaScript highlighter. Both must agree, token for token, with the language's parser,
which lives in a *different* repository at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`.

The parser grew a new word. In the keiro-dsl commit range
`29bd7952fa5201adf789bbb21427b2cffe228d4b..6c2c8fc623b0c3436a57c828a101fd20fbc3d91e` —
whose relevant change is **`101f549`, `feat(keiro-dsl): replay-only transition marker and
diff-computed twin`**, and whose range-ending (triggering) commit is
**`6c2c8fc623b0c3436a57c828a101fd20fbc3d91e`** — an aggregate transition line may now begin
with the literal marker `replay-only`:

```text
replay-only Unrequested -- RequestTransferReservation -->
  guard (divertStatus != TotalDivert || lifeCriticalOverride) && patientAcuity == RedTag
  write reservationState := Held
  emit  TransferReservationCreated
  goto  Held
```

A *transition* is the `Source -- Command --> …` line inside an `aggregate` block that says
which command moves the aggregate from one state to another. The new `replay-only` prefix
marks a transition that is never taken by a new command; it exists only so that events
already written under a retired rule still have an edge when the event log is replayed.
Meaning aside, for a highlighter the change is one fact: **a new keyword spelled with a
hyphen appears at the start of a transition line.**

Today, opening such a file in either editor leaves `replay-only` uncolored — it reads as
two unrelated identifier fragments, and the reader cannot tell at a glance that the
transition is inert. After this change, `replay-only` renders as a modifier keyword (the
same color as `deprecated`) in both Vim/Neovim and Shiki.

The observable proof is the two package test suites, extended with assertions for the new
token, running green:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] M0 (2026-07-23) — Read the keiro-dsl diff for the range and established the lexical
      delta: exactly one new keyword, `replay-only`; `reservedWords` byte-identical between
      the two commits; no new operator, literal, comment, string, or number rule.
- [x] M1 (2026-07-23) — `spec/keiro-dsl-language-model.md`: Section 3 note that a keyword may
      exist outside `reservedWords` when it cannot collide with an identifier; Section 4
      dashed list gains `replay-only`; Section 6 Modifier row gains `replay-only` and the
      Control row explicitly defers to the Modifier row.
- [x] M2 (2026-07-23) — `packages/keiro-vim/syntax/keiro.vim`: `syntax match keiroModifier`
      for the dashed `replay-only`.
- [x] M3 (2026-07-23) — `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`: new
      `dashed-modifiers` repository rule scoped `storage.modifier.keiro`, included ahead of
      the bare-word rules; tracked `dist/` bundle rebuilt with `bun run build`.
- [x] M4 (2026-07-23) — `corpus/reservation-guard-tightened-twin.keiro` copied verbatim from
      the upstream fixture and documented in `corpus/README.md`.
- [x] M5 (2026-07-23) — Both test suites extended to assert the new token.
- [x] M6 (2026-07-23) — Both suites green: Shiki `17 pass / 0 fail`; Vim `21 checks,
      0 failures`.
- [x] M7 (2026-07-23) — `.keiro-dsl-sync-subject` written.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **`replay-only` is a keyword but is *not* a reserved word, and the spec's "Section 3 is
  verbatim `reservedWords`" invariant therefore stays untouched.** The parser recognises the
  marker with `keyword "replay-only"` in `pTransition`, yet the `reservedWords` list is
  byte-identical across the range — still exactly the 70 words Section 3 already records.
  Evidence:

  ```bash
  diff <(git -C /Users/shinzui/Keikaku/bokuno/keiro show 29bd7952:keiro-dsl/src/Keiro/Dsl/Parser.hs) \
       <(git -C /Users/shinzui/Keikaku/bokuno/keiro show 6c2c8fc:keiro-dsl/src/Keiro/Dsl/Parser.hs)
  ```

  ```text
  430a431,434
  >         notFollowedBy (keyword "replay-only")
  1460a1465,1467
  >     mode <- option TmLive (TmReplayOnly <$ keyword "replay-only")
  1484a1492
  >             , tMode = mode
  ```

  The reason it need not be reserved is lexical: `reservedWords` exists to stop the bare
  identifier parser `ident` from swallowing a structural word, and `ident` accepts only
  `[A-Za-z_][A-Za-z0-9_]*` — no hyphens. `replay-only` can never be produced by `ident`, so
  there is nothing to reserve against. Every other hyphenated keyword the spec already lists
  in Section 4 (`on-terminal`, `state-codec`, `fifo-throughput`, …) is unreserved for exactly
  the same reason. Only `status-map`, `dispatch-each`, and `read-model` are both hyphenated
  *and* reserved, which is a historical belt-and-braces choice, not a requirement.

- **The parser needed a guard against its own new keyword, which confirms the highlighting
  hazard is real.** `pStatesLine`'s inner `pStateDecl` gained
  `notFollowedBy (keyword "replay-only")` with the comment "`ident` would take `replay`
  (hyphens are not identifier characters) and strand `-only`". That is precisely the
  match-before-bare-words hazard Section 4 of the spec warns highlighter authors about: a
  naive matcher sees `replay` and `only` as two words. Both highlighters must therefore match
  the full hyphenated spelling as one token.

- **`on` inside `replay-only` does not mis-match in either highlighter, and no reordering was
  needed to prevent it.** `on` is a curated contextual keyword in both packages. In
  `replay-only` the substring `on` at offset 7 is preceded by `-` (so a word-start check
  passes) but followed by `l` (so the word-end check fails), which is what actually blocks it.
  Verified by the Shiki assertion that the whole `replay-only` token carries
  `storage.modifier.keiro`, and by the Vim assertion that column 1 of the marker reports
  `keiroModifier`.

- **Vim's `synIDtrans` reports `Type` for a modifier, not `StorageClass`.** Checking the
  marker headlessly gives `group=keiroModifier trans=Type`. This is not a mis-classification:
  `synIDtrans` resolves the *entire* `highlight link` chain to the group that carries actual
  colours, and Vim's own defaults contain `hi def link StorageClass Type`. The existing
  modifier `prefix` in `corpus/reservation.keiro` reports identically
  (`group=keiroModifier trans=Type`). The test suite asserts the untranslated `synID` name,
  which is the level at which this repository's taxonomy is meaningful. Before the change the
  same probe returned an empty group name for `replay-only`, confirming nothing matched it at
  all.


## Decision Log

Record every decision made while working on the plan.

- Decision: Reuse the `intention` and `master_plan` frontmatter values from the sibling plan
  `docs/plans/4-reconcile-highlighters-with-keiro-dsl-lexical-surface-20-new-reserved-words-string-escapes-signed-decimal-numbers.md`
  rather than prompting for new ones.
  Rationale: This plan runs unattended as the `sync-keiro-dsl` mori automation; there is no
  interactive user to supply an Intention ID, and the work continues the same master plan
  (`docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md`) that produced the
  spec and both packages. Plan 4 set this precedent for the same reason.
  Date: 2026-07-23

- Decision: Classify `replay-only` as a **Modifier** (`storage.modifier.keiro` / Vim
  `StorageClass`), not as a control/section keyword.
  Rationale: Section 6 of `spec/keiro-dsl-language-model.md` reserves the Modifier class for
  words that qualify a declaration without introducing one — `deprecated`, `upcast`,
  `required`, `stable`. `replay-only` is exactly that shape: an optional prefix that changes
  how an otherwise ordinary transition line is treated (`option TmLive (TmReplayOnly <$
  keyword "replay-only")` in `pTransition`), and it is the direct analogue of `deprecated` on
  an event. Colouring it like `guard`/`write`/`goto` would wrongly suggest it is one of the
  transition's clauses rather than a qualifier on the whole line.
  Date: 2026-07-23

- Decision: Do **not** add `replay-only` to Section 3 of the spec; add it to Section 4's
  dashed contextual list instead, and add an explanatory note to Section 3.
  Rationale: Section 3 states that it is copied verbatim from the parser's `reservedWords`
  and must match exactly. `replay-only` is not in `reservedWords` (see Surprises), so adding
  it would break the invariant that makes Section 3 mechanically checkable. Section 4 is
  explicitly the home for words the parser recognises in context but does not reserve, and
  its dashed sub-list already holds every other hyphenated keyword. A note in Section 3
  explains *why* a keyword can legitimately live outside `reservedWords`, so the next
  reconciliation does not "fix" it by moving the word.
  Date: 2026-07-23

- Decision: In the TextMate grammar, add a dedicated `dashed-modifiers` repository rule
  rather than extending the existing `modifiers` rule.
  Rationale: The existing `modifiers` rule uses `(?<![A-Za-z0-9_])…(?![A-Za-z0-9_])`
  lookarounds, which are correct for bare words but let a hyphen sit flush against the match
  (`foo-replay-only` would match). The dashed rules in this grammar use the stricter
  `(?<![A-Za-z0-9_-])…(?![A-Za-z0-9_-])` form. Keeping dashed and bare patterns in separate
  rules preserves that distinction and mirrors the existing `dashed-keywords` /
  `control-keywords` split, so the file stays legible for the next contributor.
  Date: 2026-07-23

- Decision: Add the new corpus sample by copying the upstream fixture
  `keiro-dsl/test/fixtures/reservation-guard-tightened-twin.keiro` verbatim, under the same
  filename, rather than hand-writing a new sample.
  Rationale: `corpus/README.md` already documents five verbatim upstream copies as the
  preferred provenance for corpus files, and this fixture is the one upstream uses to
  exercise `replay-only` (`keiro-dsl/test/Main.hs` lines 229, 906, 1364). A verbatim copy is
  guaranteed to be valid keiro-dsl and needs no independent validation, whereas a
  hand-written sample could silently drift from what the parser accepts. Keeping the upstream
  filename makes the provenance obvious.
  Date: 2026-07-23


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-07-23): complete and meeting the original purpose.** The single lexical
addition in keiro-dsl `6c2c8fc623b0c3436a57c828a101fd20fbc3d91e` — the `replay-only`
transition marker — is now carried by all four artifacts. `spec/keiro-dsl-language-model.md`
lists it in Section 4's dashed contextual set and classifies it as a Modifier in Section 6,
while Section 3's verbatim 70-word `reservedWords` list is untouched (and now carries a note
explaining why a keyword may live outside it). `packages/keiro-vim/syntax/keiro.vim` matches
it as `keiroModifier` (→ `StorageClass`); `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`
matches it via a new `dashed-modifiers` rule (→ `storage.modifier.keiro`), and the tracked
`dist/` bundle was rebuilt so the published package carries the new grammar.
`corpus/reservation-guard-tightened-twin.keiro` is the shared sample both suites tokenize.
Shiki reports `17 pass / 0 fail` (two new cases), Vim reports `21 checks, 0 failures` (three
new checks).

**Lesson — "new keyword" and "new reserved word" are different events, and this repository's
spec depends on keeping them apart.** The natural reflex on seeing a new `keyword "…"` call
in the parser is to append it to Section 3, which would have quietly falsified the one
invariant that makes Section 3 auditable against the parser by a mechanical diff. The
discriminator is simple and worth remembering: a word needs to be in `reservedWords` only if
`ident` could otherwise produce it, and `ident` produces no hyphens. Every hyphenated keyword
belongs in Section 4 unless the parser author also chose to reserve it.

**Against scope.** The reconciliation is complete for this commit range. No operator,
literal, comment, string, number, or identifier rule changed, so Section 2 and Section 5 of
the spec were left alone; the rest of the range (the `diff`-computed replay-only twin,
`complementExpr`, the new validator rules, `renderTransition`) is semantics and tooling with
no lexical surface of its own — `complementExpr`'s `x == false` output uses only `==` and
`false`, both long since highlighted.


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master`. Commit directly to
`master`; do not create a branch. This repository ships two syntax highlighters for
**keiro-dsl**, a domain-specific language for event-sourced workflows whose files end in
`.keiro`.

**Highlighting here is purely lexical.** Tokens are coloured one at a time by pattern
matching. There is no parse of the grammar, no nesting, and no type inference. A word is a
keyword because it appears in a fixed list, not because of where it sits on the line.

**The authoritative parser is outside this repository.** It is a Haskell file using the
`megaparsec` parser-combinator library at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`. Read it; never edit
it. Two of its definitions matter for this plan:

- `reservedWords :: [Text]` (around line 111) — the words the parser refuses to accept as a
  plain identifier. Section 3 of this repository's spec is a verbatim copy of this list.
- `pTransition :: P Transition` (around line 1461) — the parser for an aggregate transition
  line. It now begins with
  `mode <- option TmLive (TmReplayOnly <$ keyword "replay-only")`, which is the entire
  lexical change this plan reconciles.

The four artifacts this plan keeps in agreement:

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 2 covers comments,
  strings, numbers, and identifier shapes. Section 3 is the verbatim `reservedWords` list.
  Section 4 is a *curated* set of words the parser recognises in context but does not
  reserve, with a sub-list for the ones written with hyphens. Section 5 lists operators.
  Section 6 is the token-class taxonomy: a table mapping each conceptual class to a TextMate
  scope (used by Shiki) and a standard Vim highlight group (used by Vim).
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file. It uses
  `syntax keyword` for bare words, `syntax match` for hyphenated words and operators,
  `syntax region` for strings, and `highlight default link` to map its own `keiro*` groups
  onto standard Vim groups such as `Statement`, `Keyword`, and `StorageClass`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar, scope name
  `source.keiro`. It has a top-level `patterns` array of `{ "include": "#name" }` entries and
  a `repository` object defining each named rule. Earlier entries in `patterns` win, so
  hyphenated and multi-token rules are listed before bare-word rules.
- `corpus/*.keiro` — shared `.keiro` sample files that *both* test suites tokenize.
  `corpus/README.md` records where each file came from.

Terms used below:

- **Reserved word** — a word the parser forbids as a bare identifier. Always a keyword.
- **Contextual keyword** — a word the parser recognises in a specific position but does not
  reserve. A curated subset is coloured as keywords (spec Section 4).
- **Dashed keyword** — a keyword containing `-`, e.g. `read-model`. Because `-` is not a word
  character in either highlighter, these must be matched *before* bare words, or the leading
  segment is coloured on its own and the remainder is left plain.
- **Introducer** — a keyword that begins a top-level item or node (`aggregate`, `router`, …);
  scope `keyword.declaration.keiro`, Vim group `Keyword`.
- **Modifier** — a keyword that qualifies a declaration without introducing one
  (`deprecated`, `upcast`, `required`, …); scope `storage.modifier.keiro`, Vim group
  `StorageClass`. This is the class `replay-only` joins.

The two test suites:

- **Vim** — `packages/keiro-vim/test/highlight_spec.lua`, run headless by
  `packages/keiro-vim/test/run.sh` (requires `nvim` on `PATH`). Each assertion is
  `expect(<literal text>, <expected keiro group>)`: the helper finds the first line
  containing that literal text, then asserts that
  `synIDattr(synID(line, col_of_first_char, 1), 'name')` equals the expected group. Because
  it reads the group at the phrase's **first character**, an assertion may use a multi-word
  anchor such as `'router incidentRouter'` to disambiguate a word that also occurs in a
  comment — the group returned is the one for `r` of `router`.
- **Shiki** — `packages/shiki-keiro/test/scopes.test.ts`, run with `bun test` from
  `packages/shiki-keiro/`. It tokenizes a corpus file with
  `codeToTokensBase(code, { lang: 'keiro', theme: 'github-light', includeExplanation: true })`
  and asserts that the token whose trimmed content equals a given string carries an expected
  scope name. Shiki merges adjacent same-coloured tokens for display but preserves per-match
  boundaries in `explanation[]`, which is the level the helper searches.


## Plan of Work

### Milestone 1 — Update the cross-package contract (`spec/keiro-dsl-language-model.md`)

The spec is the contract both packages implement, so it changes first. Three edits, all
small.

Section 3 keeps its 70-word list exactly as it is — `reservedWords` did not change. Add a
short paragraph after the existing `readmodel`/`read-model` note explaining that a keyword
does not *have* to appear in `reservedWords`: reservation exists only to stop the plain
identifier parser `ident` from swallowing a structural word, and `ident` accepts no hyphens,
so a hyphenated keyword such as `replay-only` cannot collide and is left unreserved. Point
the reader at Section 4 for those words. This paragraph exists to stop a future
reconciliation from "correcting" the omission and breaking the verbatim-copy invariant.

Section 4 gains `replay-only` in the **Dashed contextual keywords** code block, and a
sentence after that block noting that `replay-only` is the one dashed word classified as a
Modifier rather than a control keyword, with a one-line example of the transition prefix.

Section 6 gains `replay-only` in the Modifier row's member list. Because the Control row is
worded as "all other reserved keywords … **and** all curated contextual keywords (Section
4)", add the parenthetical "(except the words the Modifier row below claims)" so the two rows
cannot be read as both owning it.

At the end of this milestone, a reader of the spec alone can implement `replay-only`
correctly in a third highlighter. Nothing is runnable yet.

### Milestone 2 — Vim (`packages/keiro-vim/syntax/keiro.vim`)

In the `--- Modifiers ---` section, after the two existing `syntax keyword keiroModifier`
lines, add a comment and a match:

```vim
" Dashed modifier: '-' is not a keyword character, so this needs 'match', and it must
" match the whole spelling or 'replay' and 'only' are coloured (or left plain) separately.
syntax match keiroModifier /\<replay-only\>/
```

`keiroModifier` is already linked to `StorageClass` at the bottom of the file, so no new
`highlight default link` is required. No existing item competes for this text: neither
`replay` nor `only` is in any `syntax keyword` list, and the substring `on` cannot match
because it is followed by the word character `l`.

At the end of this milestone, opening a `.keiro` file containing a `replay-only` transition
in Neovim shows the marker in the `StorageClass` colour.

### Milestone 3 — Shiki (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

Add a `dashed-modifiers` entry to `repository`, directly after `dashed-keywords`:

```json
"dashed-modifiers": {
  "match": "(?<![A-Za-z0-9_-])(?:replay-only)(?![A-Za-z0-9_-])",
  "name": "storage.modifier.keiro"
}
```

and reference it from the top-level `patterns` array immediately after
`{ "include": "#dashed-keywords" }`, so it is tried before `#decl-with-name`,
`#introducers`, and `#control-keywords`.

The grammar is inlined into the tracked build output `packages/shiki-keiro/dist/index.js` by
`packages/shiki-keiro/src/index.ts`, so the bundle must be regenerated:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro
bun run build
```

At the end of this milestone, `dist/index.js` contains `dashed-modifiers` and a consumer
importing `shiki-keiro` gets the new rule.

### Milestone 4 — Corpus

Copy the upstream fixture that exercises the marker into the shared corpus, verbatim and
under its upstream name:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/reservation-guard-tightened-twin.keiro \
   corpus/reservation-guard-tightened-twin.keiro
```

The file is a `hospital-capacity` context whose `Reservation` aggregate has a live
`Unrequested -- RequestTransferReservation -->` transition guarded by
`patientAcuity != RedTag`, followed by a `replay-only` twin of the same transition guarded by
`patientAcuity == RedTag` — the region the tightened guard removed.

Then extend `corpus/README.md`: add a sixth bullet to the verbatim-provenance list naming
this file and the construct it contributes (`replay-only`), and note that it was copied on
2026-07-23 (the five earlier files were copied on 2026-06-10, so the list needs a per-file
date rather than a single shared one).

### Milestone 5 — Tests

Vim, in `packages/keiro-vim/test/highlight_spec.lua`, append a new block:

```lua
open('corpus/reservation-guard-tightened-twin.keiro')
expect('replay-only', 'keiroModifier')
expect('guard', 'keiroStatement')
expect('==', 'keiroOperator')
```

The `guard` and `==` assertions are there so a regression that broke the surrounding
transition line — not just the marker — is also caught.

Shiki, in `packages/shiki-keiro/test/scopes.test.ts`, read the new corpus file into a
`replayOnly` constant next to the existing `surface` constant and add:

```typescript
test('the replay-only transition marker gets storage.modifier', () => {
  expectScope(replayOnly, 'replay-only', 'storage.modifier.keiro')
})

test('a replay-only transition still highlights its clauses', () => {
  expectScope(replayOnly, 'guard', 'keyword.control.keiro')
  expectScope(replayOnly, '==', 'keyword.operator.keiro')
})
```

The `expectScope(replayOnly, 'replay-only', …)` assertion is what proves the token was
matched as **one** unit: the helper compares against the trimmed content of a single
explanation entry, so it can only succeed if a single rule matched the full nine-character
spelling.

### Milestone 6 — Run both suites green

See Concrete Steps.

### Milestone 7 — Write the sync subject

Write a single Conventional Commits subject line to `.keiro-dsl-sync-subject` at the
repository root. The calling automation reads this file and owns the commit.


## Concrete Steps

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax

# Inspect the upstream change this plan reconciles (read-only).
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  29bd7952fa5201adf789bbb21427b2cffe228d4b..6c2c8fc623b0c3436a57c828a101fd20fbc3d91e \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs

# Rebuild the tracked Shiki bundle after editing the grammar.
(cd packages/shiki-keiro && bun run build)

# Shiki suite.
(cd packages/shiki-keiro && bun install && bun test)

# Vim suite.
./packages/keiro-vim/test/run.sh
```

Observed Shiki transcript tail:

```text
bun test v1.3.13 (bf2e2cec)

 17 pass
 0 fail
 50 expect() calls
```

(`bun test` prints only the failing test names by default; the two new cases are visible in
the `17 pass` total, up from the 15 that plan 4 left behind.)

Observed Vim transcript tail:

```text
ok   "replay-only" -> keiroModifier
ok   "guard" -> keiroStatement
ok   "==" -> keiroOperator

21 checks, 0 failures
```


## Validation and Acceptance

Both suites must exit 0. `bun test` must print `0 fail`; `packages/keiro-vim/test/run.sh`
must print `0 failures` (it calls `cquit 1` on any failure, so a non-zero exit is itself the
signal).

Beyond the suites, the change is directly observable. Open the new corpus file in Neovim
with the plugin on the runtime path and put the cursor on the `r` of `replay-only`:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/reservation-guard-tightened-twin.keiro
```

Then `:echo synIDattr(synID(line('.'), col('.'), 1), 'name')` prints `keiroModifier` — the
same syntax group the existing modifier `prefix` gets. Before this change it echoes an empty
string, because nothing matched the text at all.

Note that `:echo synIDattr(synIDtrans(synID(line('.'), col('.'), 1)), 'name')` prints
**`Type`**, not `StorageClass`. That is expected and not a bug: `synIDtrans` follows the
whole `highlight link` chain to the group that actually carries colours, and Vim's own
defaults link `StorageClass` to `Type`. The chain here is
`keiroModifier` → `StorageClass` (this repository's link) → `Type` (Vim's default). Use the
untranslated `synID` form above when asserting this repository's classification; that is what
`packages/keiro-vim/test/highlight_spec.lua` does.

For Shiki, `bun run demo` from `packages/shiki-keiro/` regenerates
`packages/shiki-keiro/examples/keiro-demo.html`; a `replay-only` marker rendered there
carries the `storage.modifier.keiro` scope rather than falling through to plain text.

Finally, `spec/keiro-dsl-language-model.md` Section 3 must still list exactly the 70 words of
the parser's `reservedWords`, in order — this plan must not have changed it.


## Idempotence and Recovery

Every edit is to a tracked file and is safe to repeat. `bun install`, `bun run build`,
`bun test`, and the Vim `run.sh` are all repeatable and write only to `node_modules/`,
`dist/`, and test scratch. The `cp` in Milestone 4 overwrites the corpus file with identical
bytes on a second run.

If `nvim` is not installed the Vim suite cannot run locally. That is not a blocker: the
calling `sync-keiro-dsl` automation re-runs both suites itself and owns the commit, so
leaving the tree edited is the correct end state. Record the skip in Progress if it happens.

If `bun run build` is skipped, `dist/index.js` silently keeps the old grammar while the tests
still pass — the tests import `../src/index`, which reads `syntaxes/keiro.tmLanguage.json`
directly. Guard against this by grepping the bundle:

```bash
grep -c 'dashed-modifiers' packages/shiki-keiro/dist/index.js   # expect 2
```

Do **not** run `git commit`, `git add`, or `git push`, and do **not** write
`spec/.keiro-dsl-sync`. The calling script owns all of those.


## Interfaces and Dependencies

No new runtime dependencies. `packages/shiki-keiro/package.json` already declares the dev
dependencies this plan uses (`shiki` ^4.0.0, `tsup` ^8.0.0, `typescript` ^5.5.0) and its
`build` script (`tsup src/index.ts --format esm --dts --clean`); tests run under `bun test`.
The Vim suite needs `nvim` on `PATH` and uses no plugins (`-u NONE`).

The keiro-dsl parser at `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`
is a read-only input, not a build dependency.

Contracts that must hold at the end of the work:

- `spec/keiro-dsl-language-model.md` Section 6 assigns `replay-only` the TextMate scope
  `storage.modifier.keiro` and the Vim highlight group `StorageClass`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` exports a `repository.dashed-modifiers`
  rule with `"name": "storage.modifier.keiro"`, referenced from the top-level `patterns`
  array ahead of `#introducers` and `#control-keywords`.
- `packages/keiro-vim/syntax/keiro.vim` defines a `keiroModifier` item matching
  `replay-only`, and `keiroModifier` remains linked to `StorageClass`.
- `corpus/reservation-guard-tightened-twin.keiro` exists and is byte-identical to
  `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/reservation-guard-tightened-twin.keiro`
  at keiro-dsl commit `6c2c8fc623b0c3436a57c828a101fd20fbc3d91e`.
