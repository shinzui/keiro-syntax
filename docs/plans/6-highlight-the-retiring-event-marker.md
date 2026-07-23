---
id: 6
slug: highlight-the-retiring-event-marker
title: "Highlight the retiring event marker"
kind: exec-plan
created_at: 2026-07-23T17:19:40Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Highlight the retiring event marker

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
`fc7591b65118aafcf038483ca7189d262704b55b..451acf2188005211c2d2fe81835e6bff0a4c0580` —
whose relevant change is the range-ending (triggering) commit
**`451acf2188005211c2d2fe81835e6bff0a4c0580`, `feat(dsl): validate event retirement and
upcaster chains`** — an `event` declaration inside an `aggregate` may now be prefixed with
the literal marker `retiring`:

```text
event TransferReservationCreated   = fields(RequestTransferReservation)
retiring event TransferReservationConfirmed { reservationId hospitalId commandId }
```

An *event* declaration names one of the facts an aggregate writes to its log. Before this
change the only prefix an event could carry was `deprecated`, which means "retired from the
write path: no live transition may emit it, but the log still contains it, so it must stay
decodable". `retiring` is the new intermediate step: the event is on its way out, but it
must keep at least one live emitting transition while operators terminalize or truncate the
affected streams; only afterwards does the author cut over to `deprecated` plus a
`replay-only` emitting transition. Meaning aside, for a highlighter the change is one fact:
**a new bare (undashed) keyword may appear immediately before `event`, in exactly the
position `deprecated` already occupies.**

Today, opening such a file in either editor leaves `retiring` uncolored — it reads as an
ordinary identifier, and nothing distinguishes a retiring event from a live one. After this
change, `retiring` renders as a modifier keyword (the same color as `deprecated`) in both
Vim/Neovim and Shiki.

A second, smaller gain comes with it. The shared corpus in `corpus/` currently contains no
sample at all of an event prefix — neither `deprecated` nor `retiring` — so the Modifier
token class has never been exercised on an event declaration by either test suite. This plan
adds both halves of the retirement lifecycle to the corpus, so the two suites tokenize the
"before" (`retiring event …` with a live emitting transition) and the "after"
(`deprecated event …` with a `replay-only` emitting transition).

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
      delta: exactly one new keyword, `retiring`; `reservedWords` byte-identical between the
      two commits; no new operator, literal, comment, string, number, or identifier rule.
- [x] M1 (2026-07-23) — `spec/keiro-dsl-language-model.md`: Section 3's note generalized from
      "dashed keywords may be unreserved" to "a keyword may be unreserved", naming `retiring`
      as the bare-word case; Section 4's curated list gains `retiring` with a paragraph
      describing the event-prefix position; Section 6's Modifier row gains `retiring`.
- [x] M2 (2026-07-23) — `packages/keiro-vim/syntax/keiro.vim`: `retiring` added to the
      `syntax keyword keiroModifier` list next to `deprecated`.
- [x] M3 (2026-07-23) — `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`: `retiring`
      added to the `modifiers` repository rule next to `deprecated`; tracked `dist/` bundle
      rebuilt with `bun run build`.
- [x] M4 (2026-07-23) — `corpus/reservation-retiring.keiro` and
      `corpus/reservation-deprecated-replay-only.keiro` copied verbatim from the upstream
      fixtures and documented in `corpus/README.md`.
- [x] M5 (2026-07-23) — Both test suites extended to assert the new token and its
      `deprecated` sibling. Two assertions drafted in the Plan of Work were corrected against
      observed behavior before landing (see Surprises: `emit`/`event` scope classes, and the
      dead `keiroTypeName` rule).
- [x] M6 (2026-07-23) — Both suites green: Shiki `20 pass / 0 fail`; Vim `27 checks,
      0 failures`.
- [x] M7 (2026-07-23) — `.keiro-dsl-sync-subject` written.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **`retiring` is a keyword the parser does *not* reserve, even though its sibling
  `deprecated` is reserved — so Section 3 of the spec is again untouched.** The whole
  Parser.hs delta for the range is confined to `pEvent`; `reservedWords` is byte-identical
  and still holds exactly the 70 words Section 3 already records. Evidence:

  ```bash
  diff <(git -C /Users/shinzui/Keikaku/bokuno/keiro show fc7591b:keiro-dsl/src/Keiro/Dsl/Parser.hs) \
       <(git -C /Users/shinzui/Keikaku/bokuno/keiro show 451acf2:keiro-dsl/src/Keiro/Dsl/Parser.hs)
  ```

  ```text
  484c484,491
  <     dep <- option False (True <$ keyword "deprecated")
  ---
  >     (retiring, deprecated) <-
  >         option
  >             (False, False)
  >             ( choice
  >                 [ (True, False) <$ keyword "retiring"
  >                 , (False, True) <$ keyword "deprecated"
  >                 ]
  >             )
  500c507,508
  <             , evDeprecated = dep
  ---
  >             , evRetiring = retiring
  >             , evDeprecated = deprecated
  ```

  This is a *different* case from the one plan 5 recorded for `replay-only`. There, the word
  is spelled with a hyphen, and the plain-identifier parser `ident` accepts only
  `[A-Za-z_][A-Za-z0-9_]*`, so `replay-only` could never collide with an identifier and had
  nothing to reserve against. `retiring` is bare: `ident` *can* produce it, so its absence
  from `reservedWords` is a real asymmetry with `deprecated` rather than a lexical necessity.

- **The asymmetry is observable upstream, which is worth knowing but is not this repository's
  to fix.** `pBodyItem` (Parser.hs line 440) composes an aggregate body item as
  `choice [BICommand <$> pCommand, BIEvent <$> pEvent, …, BITransition <$> pTransition]`,
  with no `try` around `pEvent`. In megaparsec, `<|>` does not backtrack once an alternative
  has consumed input, so as soon as `keyword "retiring"` succeeds the item is committed to
  being an event declaration. A line such as `retiring -- ConfirmReservation -->` (a
  transition out of a state named `retiring`) therefore cannot parse, even though `ident`
  would happily accept `retiring` as a state name elsewhere. Whether that is an upstream
  oversight or a deliberate choice is not this plan's call: highlighting here is purely
  lexical, and `retiring` gets the same unconditional treatment as every other Section 4
  word (many of which — `name`, `key`, `value`, `source` — are likewise legal identifiers).

- **The pretty printer can emit a spelling the parser rejects, and it changes nothing for
  highlighting.** `PrettyPrint.hs` gained a `(True, True) -> "retiring deprecated event"`
  branch, but the parser's `choice` accepts *one* of the two markers, and upstream's own test
  suite asserts the combination is rejected (`keiro-dsl/test/Main.hs`: `it "rejects an event
  marked both retiring and deprecated"`). Either way both highlighters color each word
  independently as a Modifier, so the unreachable spelling needs no special handling.

- **The corpus had no event-prefix sample at all before this plan.** `grep -rn
  'deprecated\|upcast\|retiring' corpus/` returned nothing across all eight files, meaning
  the Modifier class was only ever asserted through `prefix` (in `prefix=rsv`) and
  `replay-only`. Adding the two retirement fixtures closes that gap as a side effect of the
  reconciliation.

- **Vim's `keiroTypeName` rule is dead — it can never fire — which is why this plan's Vim
  test asserts the declaration keyword rather than the type name.** The rule is

  ```vim
  syntax match keiroTypeName /\<\%(aggregate\|enum\|contract\|command\|event\|…\)\s\+\zs\u\w*/
  ```

  A Vim syntax item must *begin* matching at the position the syntax engine is currently at,
  and `\zs` only moves the highlighted region — not the position the match starts from. So
  this item can only be attempted at the `a` of `aggregate` (the `e` of `event`, …), and at
  exactly that position `syntax keyword keiroKeyword aggregate` also matches. Vim gives
  keyword items priority over match items, so the keyword always wins and `keiroTypeName` is
  discarded. Evidence — probing the long-standing `aggregate Reservation` line in
  `corpus/reservation.keiro`, which predates this plan:

  ```bash
  nvim --headless -u NONE -N --cmd 'set runtimepath^=packages/keiro-vim' \
    --cmd 'filetype on | syntax on' -c 'edit corpus/reservation.keiro' \
    -c 'syntax sync fromstart' \
    -c 'echo "[" . synIDattr(synID(14, 11, 1), "name") . "]"' \
    -c 'echo "[" . synIDattr(synID(14, 1, 1), "name") . "]"' -c 'quitall!'
  ```

  ```text
  group at Reservation: []
  group at aggregate: [keiroKeyword]
  ```

  This is **not** a spec violation and not this plan's to fix. Section 6 marks
  Declaration-site type name as an *optional refinement*: "A package that does not implement
  them is still correct; it simply colors those identifiers as plain text." Vim is therefore
  conformant — it merely carries a rule with no effect, which a future plan should either
  repair (a `\@<=` lookbehind starts the match at the type name itself) or delete. Fixing it
  here would newly color type names in every `.keiro` file in Vim, a visible behavior change
  well outside a keyword reconciliation. The Shiki package does implement the refinement
  correctly, which the test asserts.

- **Shiki and Vim disagree on the class of `event` (and `command`), from before this plan.**
  Probing the new corpus file shows Shiki scoping `event` as `keyword.declaration.keiro`,
  because `#decl-with-name` claims the introducer word as capture 1 whenever a name follows
  it; Vim reports `keiroStatement`, matching Section 6's Control row, which lists `event`
  among the control keywords. Evidence, from the probe used to write these tests:

  ```text
  "event"    -> source.keiro | keyword.declaration.keiro
  "retiring" -> source.keiro | storage.modifier.keiro
  "emit"     -> source.keiro | keyword.declaration.keiro
  ```

  Of the eleven words in `#decl-with-name`'s alternation, nine are Section 6 introducers and
  only `command` and `event` are Control words, so the divergence is narrow. It predates this
  range (`decl-with-name` is unchanged since plan 3) and has nothing to do with `retiring`, so
  it is recorded here and left alone. Its only effect on this plan was on test authoring: the
  drafted Shiki assertion `expectScope(retiring, 'event', 'keyword.control.keiro')` was
  replaced by the type-name assertion, and the drafted Vim assertion
  `expect('emit', 'keiroStatement')` was replaced by `expect('goto', 'keiroStatement')` — in
  Vim `emit` is an introducer (`keiroKeyword`), since `emit` also introduces a top-level emit
  node.


## Decision Log

Record every decision made while working on the plan.

- Decision: Reuse the `intention` and `master_plan` frontmatter values from the sibling plan
  `docs/plans/5-highlight-the-replay-only-transition-marker.md` rather than prompting for new
  ones.
  Rationale: This plan runs unattended as the `sync-keiro-dsl` mori automation; there is no
  interactive user to supply an Intention ID, and the work continues the same master plan
  (`docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md`) that produced the
  spec and both packages. Plans 4 and 5 set this precedent for the same reason.
  Date: 2026-07-23

- Decision: Classify `retiring` as a **Modifier** (`storage.modifier.keiro` / Vim
  `StorageClass`), not as a control/section keyword or a declaration introducer.
  Rationale: Section 6 of `spec/keiro-dsl-language-model.md` reserves the Modifier class for
  words that qualify a declaration without introducing one. `retiring` sits in exactly the
  slot `deprecated` already occupies — `option (False, False) (choice [(True, False) <$
  keyword "retiring", (False, True) <$ keyword "deprecated"])`, immediately before
  `keyword "event"` — so classifying it any other way would put two interchangeable prefixes
  in two different colors. `event` remains the control keyword that introduces the
  declaration; `retiring` only qualifies it.
  Date: 2026-07-23

- Decision: Do **not** add `retiring` to Section 3 of the spec; add it to Section 4's curated
  contextual list, and generalize Section 3's existing "a keyword need not be reserved" note
  so it covers bare words as well as dashed ones.
  Rationale: Section 3 states that it is copied verbatim from the parser's `reservedWords` and
  must match exactly; `reservedWords` did not change in this range (see Surprises), so adding
  `retiring` would break the invariant that makes Section 3 mechanically diffable against the
  parser. The existing note explains the omission only for *dashed* words, which would leave
  the next reconciliation reading `retiring` as a spec bug and "fixing" it. Widening the note
  and naming `retiring` as the bare-word example prevents that.
  Date: 2026-07-23

- Decision: Extend the existing bare-word `modifiers` rule in the TextMate grammar and the
  existing `syntax keyword keiroModifier` list in the Vim file, rather than adding new rules.
  Rationale: `retiring` contains no hyphen, so it needs none of the match-before-bare-words
  machinery that `replay-only` required in plan 5. Both files already hold `deprecated` in a
  plain word list with the correct word-boundary lookarounds; adding a sibling to that list is
  the smallest change that is also the most obviously correct one.
  Date: 2026-07-23

- Decision: Add **two** corpus files — `reservation-retiring.keiro` and
  `reservation-deprecated-replay-only.keiro` — copied verbatim from the upstream fixtures,
  rather than only the one that carries the new keyword.
  Rationale: The new keyword strictly needs only the first file. But the corpus had no sample
  of `deprecated` on an event at all (see Surprises), so the sibling modifier that `retiring`
  is being classified *next to* was never tokenized by either suite. The two upstream fixtures
  are the before/after of the same retirement lifecycle and differ by three lines, so taking
  both makes the classification decision above directly testable and costs almost nothing.
  Both are verbatim copies under their upstream filenames, matching the provenance convention
  `corpus/README.md` already documents.
  Date: 2026-07-23


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-07-23): complete and meeting the original purpose.** The single lexical
addition in keiro-dsl `451acf2188005211c2d2fe81835e6bff0a4c0580` — the `retiring` event
prefix — is now carried by all four artifacts. `spec/keiro-dsl-language-model.md` lists it in
Section 4's curated contextual set and classifies it as a Modifier in Section 6, while
Section 3's verbatim 70-word `reservedWords` list is untouched (its note now explains that a
*bare* word can legitimately live outside the list too, not just a dashed one).
`packages/keiro-vim/syntax/keiro.vim` matches it as `keiroModifier` (→ `StorageClass`);
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` matches it via the existing `modifiers`
rule (→ `storage.modifier.keiro`), and the tracked `dist/` bundle was rebuilt so the published
package carries the new grammar. `corpus/reservation-retiring.keiro` and
`corpus/reservation-deprecated-replay-only.keiro` are the shared samples both suites tokenize.
Shiki reports `20 pass / 0 fail` (three new cases, up from 17); Vim reports `27 checks,
0 failures` (six new checks, up from 21).

**Two pre-existing defects were found and deliberately left in place**, both recorded with
evidence under Surprises & Discoveries: Vim's `keiroTypeName` rule can never fire (a `\zs`
that cannot move where the match *starts*, so the competing `syntax keyword` always wins),
and Shiki scopes `event` and `command` as `keyword.declaration.keiro` where Section 6 puts
them in the Control class. Neither is caused by this range, neither blocks it, and repairing
either would change highlighting across every existing `.keiro` file — beyond what a keyword
reconciliation should do unattended. They are the obvious candidates for the next plan.

**Lesson — "not in `reservedWords`" has two distinct causes, and only one of them is a
lexical fact.** Plan 5 established that a hyphenated keyword *cannot* be reserved-against
because `ident` produces no hyphens. It is tempting to generalize that into "unreserved means
harmless", but `retiring` shows the other case: a bare word that the parser treats as
structural while still letting `ident` produce it. The consequence for this repository is the
same either way — Section 4, Modifier class, unconditional highlighting — but the reasoning
must not be conflated, or a future reconciliation will draw the wrong conclusion from a
correct-looking rule. The spec note now states both causes.

**Against scope.** The reconciliation is complete for this commit range. No operator, literal,
comment, string, number, or identifier rule changed, so Sections 2 and 5 of the spec were left
alone. The rest of the range is semantics with no lexical surface of its own: `5dca682`
(`fix(codec): validate event codecs at stream boundary`) touches
`keiro-core/src/Keiro/EventStream/Validate.hs`, and `451acf2`'s bulk is new validator rules in
`keiro-dsl/src/Keiro/Dsl/Validate.hs` plus the `evRetiring` field on `Grammar.hs`'s `Event`
record. The three other new upstream fixtures (`reservation-chain-gap.keiro`,
`reservation-dup-upcast-source.keiro`, and the untouched-surface halves of the others) exercise
only `event … vN` / `upcast from vN = HOLE`, all of which Sections 2, 3 and 6 already cover and
both highlighters already match.


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master`. Commit directly to
`master`; do not create a branch. This repository ships two syntax highlighters for
**keiro-dsl**, a domain-specific language for event-sourced workflows whose files end in
`.keiro`.

**Highlighting here is purely lexical.** Tokens are colored one at a time by pattern
matching. There is no parse of the grammar, no nesting, and no type inference. A word is a
keyword because it appears in a fixed list, not because of where it sits on the line. A
consequence worth internalizing: a word is highlighted as a keyword everywhere it appears,
even in a position where the parser would have accepted it as an ordinary identifier. That is
intended, and it is how every word in Section 4 of the spec is already treated.

**The authoritative parser is outside this repository.** It is a Haskell file using the
`megaparsec` parser-combinator library at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`. Read it; never edit
it. Two of its definitions matter for this plan:

- `reservedWords :: [Text]` (around line 111) — the words the parser refuses to accept as a
  plain identifier. Section 3 of this repository's spec is a verbatim copy of this list. It
  did **not** change in this range and must not change in this plan.
- `pEvent :: P Event` (around line 481) — the parser for an event declaration inside an
  aggregate body. It now begins with

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

  which is the entire lexical change this plan reconciles: one optional bare word, in the
  slot `deprecated` already occupied, immediately before `event`.

The four artifacts this plan keeps in agreement:

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 2 covers comments,
  strings, numbers, and identifier shapes. Section 3 is the verbatim `reservedWords` list.
  Section 4 is a *curated* set of words the parser recognizes in context but does not reserve,
  with a sub-list for the ones written with hyphens. Section 5 lists operators. Section 6 is
  the token-class taxonomy: a table mapping each conceptual class to a TextMate scope (used by
  Shiki) and a standard Vim highlight group (used by Vim).
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file. It uses
  `syntax keyword` for bare words, `syntax match` for hyphenated words and operators,
  `syntax region` for strings, and `highlight default link` to map its own `keiro*` groups
  onto standard Vim groups such as `Statement`, `Keyword`, and `StorageClass`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar, scope name
  `source.keiro`. It has a top-level `patterns` array of `{ "include": "#name" }` entries and
  a `repository` object defining each named rule. Where two rules could match at the same
  position, the earlier entry in `patterns` wins; where they match at *different* positions,
  the leftmost match wins regardless of order.
- `corpus/*.keiro` — shared `.keiro` sample files that *both* test suites tokenize.
  `corpus/README.md` records where each file came from.

Terms used below:

- **Reserved word** — a word the parser forbids as a bare identifier. Always a keyword.
- **Contextual keyword** — a word the parser recognizes in a specific position but does not
  reserve. A curated subset is colored as keywords (spec Section 4). `retiring` joins this
  set.
- **Introducer** — a keyword that begins a top-level item or node (`aggregate`, `router`, …);
  scope `keyword.declaration.keiro`, Vim group `Keyword`.
- **Modifier** — a keyword that qualifies a declaration without introducing one
  (`deprecated`, `upcast`, `required`, `replay-only`, …); scope `storage.modifier.keiro`, Vim
  group `StorageClass`. This is the class `retiring` joins.

The two test suites:

- **Vim** — `packages/keiro-vim/test/highlight_spec.lua`, run headless by
  `packages/keiro-vim/test/run.sh` (requires `nvim` on `PATH`). Each assertion is
  `expect(<literal text>, <expected keiro group>)`: the helper finds the first line
  containing that literal text, then asserts that
  `synIDattr(synID(line, col_of_first_char, 1), 'name')` equals the expected group. Because
  it reads the group at the phrase's **first character**, an assertion may use a multi-word
  anchor such as `'retiring event'` to disambiguate — the group returned is the one for `r` of
  `retiring`.
- **Shiki** — `packages/shiki-keiro/test/scopes.test.ts`, run with `bun test` from
  `packages/shiki-keiro/`. It tokenizes a corpus file with
  `codeToTokensBase(code, { lang: 'keiro', theme: 'github-light', includeExplanation: true })`
  and asserts that the token whose trimmed content equals a given string carries an expected
  scope name. Shiki merges adjacent same-colored tokens for display but preserves per-match
  boundaries in `explanation[]`, which is the level the helper searches.


## Plan of Work

### Milestone 1 — Update the cross-package contract (`spec/keiro-dsl-language-model.md`)

The spec is the contract both packages implement, so it changes first. Three edits, all
small, and one of them is the reason this milestone exists at all.

Section 3 keeps its 70-word list exactly as it is — `reservedWords` did not change. What does
change is the paragraph beginning "**Not every keyword is a reserved word.**". Today it argues
the point only for *dashed* words: reservation exists to stop `ident` swallowing a structural
word, `ident` accepts no hyphens, therefore hyphenated keywords need no reservation. That
reasoning is correct but too narrow, and read literally it implies that any *bare* keyword
must be reserved. `retiring` is bare and unreserved, so the paragraph must be widened to say
that the parser reserves a word when it chooses to, that hyphenated keywords *cannot* need it,
and that a bare keyword may nonetheless be left out — naming `retiring` as the live example
and pointing at Section 4. The closing instruction ("Do not 'fix' their absence by adding them
here") already covers the new case once the wording is general.

Section 4 gains `retiring` in the bare-word code block. Because the block is laid out as an
aligned grid of six columns, add the word so the grid stays readable rather than appending it
anywhere. Follow the block with a short paragraph explaining the position: `retiring` is an
optional prefix on an `event` declaration, the same slot as the reserved `deprecated`, with a
two-line example showing a live event and a retiring one side by side.

Section 6 gains `retiring` in the Modifier row's member list, next to `deprecated`. No other
row changes: the Control row already says "except the words the Modifier row below claims".

At the end of this milestone, a reader of the spec alone can implement `retiring` correctly in
a third highlighter. Nothing is runnable yet.

### Milestone 2 — Vim (`packages/keiro-vim/syntax/keiro.vim`)

In the `--- Modifiers ---` section, the first line reads:

```vim
syntax keyword keiroModifier deprecated upcast from consistency required stable
```

Add `retiring` to it, immediately after `deprecated`, and add a one-line comment above the
block noting that `retiring` and `deprecated` are the two mutually exclusive event prefixes so
a later reader does not wonder why two words mean nearly the same thing. `retiring` contains no
hyphen, so unlike `replay-only` it needs no `syntax match` and no ordering care: `syntax
keyword` already applies Vim's whole-word semantics. `keiroModifier` is already linked to
`StorageClass` at the bottom of the file, so no new `highlight default link` is required.

Nothing competes for this text. `retiring` is in no other `syntax keyword` list; the substring
`in` at offset 5 cannot match because `syntax keyword` matches whole words only.

At the end of this milestone, opening a `.keiro` file containing `retiring event Foo` in
Neovim shows the marker in the `StorageClass` color.

### Milestone 3 — Shiki (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

In `repository.modifiers`, add `retiring` to the alternation, immediately after `deprecated`:

```json
"modifiers": {
  "match": "(?<![A-Za-z0-9_])(?:deprecated|retiring|upcast|from|consistency|required|stable|strategy|via|policy|prefix|kind)(?![A-Za-z0-9_])",
  "name": "storage.modifier.keiro"
}
```

No change to the top-level `patterns` array is needed: `#modifiers` is already included, at a
position after `#decl-with-name`. That ordering is safe here even though `#decl-with-name`
matches `\b(…|event|…)\b\s+([A-Za-z_][A-Za-z0-9_]*)` on the very same line, because ordering
only breaks ties between rules matching at the *same* position. On the line
`retiring event TransferReservationConfirmed { … }`, `#modifiers` matches at the column of
`retiring` and `#decl-with-name` matches at the later column of `event`, so the leftmost match
wins: `retiring` is scoped `storage.modifier.keiro`, the scanner resumes after it, and
`event TransferReservationConfirmed` is then claimed by `#decl-with-name` exactly as it is
today. The Milestone 5 tests assert both halves of this so the reasoning is checked rather
than assumed.

The grammar is inlined into the tracked build output `packages/shiki-keiro/dist/index.js` by
`packages/shiki-keiro/src/index.ts`, so the bundle must be regenerated:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro
bun run build
```

At the end of this milestone, `dist/index.js` contains `retiring` and a consumer importing
`shiki-keiro` gets the new rule.

### Milestone 4 — Corpus

Copy the two upstream fixtures that bracket the retirement lifecycle into the shared corpus,
verbatim and under their upstream names:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/reservation-retiring.keiro \
   corpus/reservation-retiring.keiro
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/reservation-deprecated-replay-only.keiro \
   corpus/reservation-deprecated-replay-only.keiro
```

Both are `hospital-capacity` contexts whose `Reservation` aggregate declares
`TransferReservationConfirmed`. In `reservation-retiring.keiro` that event is written
`retiring event TransferReservationConfirmed { … }` and keeps a **live** emitting transition
(`Held -- ConfirmReservation --> … emit TransferReservationConfirmed …`). In
`reservation-deprecated-replay-only.keiro` the same event is written `deprecated event …` and
its emitting transition is prefixed `replay-only`. Together they give both suites a sample of
each event prefix in its correct surrounding shape.

Then extend `corpus/README.md`: add two bullets to the "Copied later" list naming the new files,
the construct each contributes (`retiring`; `deprecated` plus `replay-only`), the date
(2026-07-23), and the keiro-dsl commit they were taken from
(`451acf2188005211c2d2fe81835e6bff0a4c0580`), pointing at this plan.

### Milestone 5 — Tests

Vim, in `packages/keiro-vim/test/highlight_spec.lua`, append a new block after the existing
`replay-only` block:

```lua
-- The `retiring` event prefix (keiro-dsl 451acf2) and its `deprecated` sibling. The two
-- `event ...` anchors prove the prefix does not disturb the declaration that follows it:
-- the second reads the group at `event` on the *prefixed* line. (`keiroTypeName` is not
-- asserted here — see docs/plans/6-highlight-the-retiring-event-marker.md, Surprises.)
open('corpus/reservation-retiring.keiro')
expect('retiring', 'keiroModifier')
expect('event TransferReservationCreated', 'keiroStatement')
expect('event TransferReservationConfirmed', 'keiroStatement')

open('corpus/reservation-deprecated-replay-only.keiro')
expect('deprecated', 'keiroModifier')
expect('replay-only', 'keiroModifier')
expect('goto', 'keiroStatement')
```

A note on the anchors: the helper locates the *first* line containing the literal text and
reads the syntax group at that phrase's first character. `'event TransferReservationConfirmed'`
resolves to the `retiring event TransferReservationConfirmed { … }` line and reports the group
of `e` in `event` — so a regression in which the new prefix swallowed or shifted the
declaration behind it would fail this check. Do **not** assert `keiroTypeName` on the type
name: that rule never fires in Vim at all, for reasons unrelated to this change and recorded
under Surprises & Discoveries.

Shiki, in `packages/shiki-keiro/test/scopes.test.ts`, read the two new corpus files into
`retiring` and `deprecatedReplayOnly` constants next to the existing `replayOnly` constant, and
add:

```typescript
test('the retiring event prefix gets storage.modifier', () => {
  expectScope(retiring, 'retiring', 'storage.modifier.keiro')
})

test('an event prefix does not disturb the declaration it qualifies', () => {
  // `#modifiers` claims `retiring` at its own column, which is left of `event`, so it wins
  // on position; `#decl-with-name` then still claims the type name on the same line.
  expectScope(retiring, 'TransferReservationConfirmed', 'entity.name.type.keiro')
})

test('the deprecated event prefix is scoped like retiring', () => {
  expectScope(deprecatedReplayOnly, 'deprecated', 'storage.modifier.keiro')
  expectScope(deprecatedReplayOnly, 'replay-only', 'storage.modifier.keiro')
})
```

The `entity.name.type.keiro` assertion is the one that proves the leftmost-match reasoning
from Milestone 3: it can only hold if `#modifiers` took `retiring` on its own and left
`#decl-with-name` free to claim `event TransferReservationConfirmed` behind it. Do **not**
assert a class for `event` itself here — Shiki scopes it `keyword.declaration.keiro` rather
than the Control class the spec assigns, a pre-existing divergence recorded under Surprises &
Discoveries.

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
  fc7591b65118aafcf038483ca7189d262704b55b..451acf2188005211c2d2fe81835e6bff0a4c0580 \
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

 20 pass
 0 fail
 58 expect() calls
Ran 20 tests across 1 file. [242.00ms]
```

(`bun test` prints only the failing test names by default; the three new cases are visible in
the `20 pass` total, up from the 17 that plan 5 left behind.)

Observed Vim transcript tail:

```text
ok   "retiring" -> keiroModifier
ok   "event TransferReservationCreated" -> keiroStatement
ok   "event TransferReservationConfirmed" -> keiroStatement
ok   "deprecated" -> keiroModifier
ok   "replay-only" -> keiroModifier
ok   "goto" -> keiroStatement

27 checks, 0 failures
```


## Validation and Acceptance

Both suites must exit 0. `bun test` must print `0 fail`; `packages/keiro-vim/test/run.sh`
must print `0 failures` (it calls `cquit 1` on any failure, so a non-zero exit is itself the
signal).

Beyond the suites, the change is directly observable. Open the new corpus file in Neovim with
the plugin on the runtime path and put the cursor on the `r` of `retiring`:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/reservation-retiring.keiro
```

Then `:echo synIDattr(synID(line('.'), col('.'), 1), 'name')` prints `keiroModifier` — the
same syntax group `deprecated` gets one file over. Before this change it echoes an empty
string, because nothing matched the text at all.

Note that `:echo synIDattr(synIDtrans(synID(line('.'), col('.'), 1)), 'name')` prints
**`Type`**, not `StorageClass`. That is expected and not a bug: `synIDtrans` follows the whole
`highlight link` chain to the group that actually carries colors, and Vim's own defaults link
`StorageClass` to `Type`. The chain here is `keiroModifier` → `StorageClass` (this
repository's link) → `Type` (Vim's default). Use the untranslated `synID` form above when
asserting this repository's classification; that is what
`packages/keiro-vim/test/highlight_spec.lua` does.

For Shiki, `bun run demo` from `packages/shiki-keiro/` regenerates
`packages/shiki-keiro/examples/keiro-demo.html`; a `retiring` prefix rendered there carries
the `storage.modifier.keiro` scope rather than falling through to plain text.

Finally, `spec/keiro-dsl-language-model.md` Section 3 must still list exactly the 70 words of
the parser's `reservedWords`, in order — this plan must not have changed it.


## Idempotence and Recovery

Every edit is to a tracked file and is safe to repeat. `bun install`, `bun run build`,
`bun test`, and the Vim `run.sh` are all repeatable and write only to `node_modules/`,
`dist/`, and test scratch. The two `cp` commands in Milestone 4 overwrite the corpus files
with identical bytes on a second run.

If `nvim` is not installed the Vim suite cannot run locally. That is not a blocker: the
calling `sync-keiro-dsl` automation re-runs both suites itself and owns the commit, so leaving
the tree edited is the correct end state. Record the skip in Progress if it happens.

If `bun run build` is skipped, `dist/index.js` silently keeps the old grammar while the tests
still pass — the tests import `../src/index`, which reads `syntaxes/keiro.tmLanguage.json`
directly. Guard against this by grepping the bundle:

```bash
grep -c 'deprecated|retiring' packages/shiki-keiro/dist/index.js   # expect 1
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

- `spec/keiro-dsl-language-model.md` Section 4 lists `retiring` among the curated contextual
  keywords, and Section 6 assigns it the TextMate scope `storage.modifier.keiro` and the Vim
  highlight group `StorageClass`.
- `spec/keiro-dsl-language-model.md` Section 3 still contains exactly the parser's 70
  `reservedWords`, in order, unchanged.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`'s `repository.modifiers` rule includes
  `retiring` in its alternation and keeps `"name": "storage.modifier.keiro"`.
- `packages/keiro-vim/syntax/keiro.vim` lists `retiring` in a `syntax keyword keiroModifier`
  line, and `keiroModifier` remains linked to `StorageClass`.
- `corpus/reservation-retiring.keiro` and `corpus/reservation-deprecated-replay-only.keiro`
  exist and are byte-identical to the same-named files under
  `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/` at keiro-dsl commit
  `451acf2188005211c2d2fe81835e6bff0a4c0580`.
