---
id: 19
slug: highlight-the-keiro-dsl-day-calendar-type-spelling-in-the-mapped-type-expression
title: "Highlight the keiro-dsl Day calendar type spelling in the mapped type expression"
kind: exec-plan
created_at: 2026-09-20T03:05:25Z
provenance:
  created_by:
    model: "claude-opus-5"
    harness: "claude-code"
    at: 2026-09-20T03:05:25Z
  revisions:
    - model: "claude-opus-5"
      harness: "claude-code"
      at: 2026-09-20T03:13:32Z
      mode: "implement"
      note: "Implemented all four milestones; both suites green (Shiki 100/0, Vim 632/0)"
---

# Highlight the keiro-dsl Day calendar type spelling in the mapped type expression

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.
If durable project context changes, update or create ADRs in docs/adr/ in the same change.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter at
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file of
regular expressions that assigns each matched piece of text a dotted *scope name* such as
`support.type.keiro`; editors and Shiki colour text by scope name.) Both are driven by one written
contract, `spec/keiro-dsl-language-model.md`, which this repository keeps in step with the upstream
parser for the language, keiro-dsl, in the separate `keiro` repository (canonical project URI
`mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`6b92bd52348a763311bcc5a7ddc847e6ef4e4406` (short form `6b92bd52`, subject
*feat(dsl): lower checked calendar day mappings*), the head of the six-commit range
`a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb..6b92bd52348a763311bcc5a7ddc847e6ef4e4406`. Only the
head commit touches the parser, and it touches it in two added lines.

The range gives the language a **new primitive type spelling**: `Day`, a calendar date with no
time-of-day part and no time zone, distinct from the existing `Time` (an instant) that `.keiro`
files have carried since the mapped type declaration arrived. It is written exactly where every
other primitive spelling is written — in the type slot of a mapped type's wire field, in the bare
`wire <Type>` line of a `mapped structural value` declaration, inside the one-argument
constructors `Optional`, `List`, and `Map`, in an aggregate register, in an aggregate
command/event field, and in a workqueue payload field:

```text
mapped structural value LocalDay {
  haskell package=keiro-dsl module=Conformance.CalendarDays.Domain type=LocalDay
  binding = "Conformance.CalendarDays.Bindings.localDayBinding"
  wire Day
}

mapped structural record CalendarEnvelope {
  wire object constructor=CalendarEnvelope unknown-fields=reject {
    primary     as "primary"     : Day               required
    optionalDay as "optionalDay" : Optional Day      optional on-missing=null
    sequence    as "sequence"    : List Day          required
    labelled    as "labelled"    : Map Day           required
  }
}
```

Before this plan both packages leave every one of those `Day` tokens **plain, uncoloured text**,
while `Optional`, `List`, `Map`, and the rest of the type vocabulary on the very same lines are
coloured as types. That is the single observable defect this plan fixes.

After this plan:

- `spec/keiro-dsl-language-model.md` records `Day` in Section 4's mapped-type type-slot fact
  (which goes from eleven accepted spellings to twelve) and in Section 6's Primitive-type row, and
  Section 1 records that keiro-dsl `6b92bd52` added the `CalendarDaySyntax` feature to language
  version 6's syntax profile.
- `packages/keiro-vim/syntax/keiro.vim` and
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` both match `Day` as a primitive type
  everywhere it appears, case-sensitively and as a whole word.
- `corpus/mapped-calendar-days.keiro` is upstream's own checked fixture for the feature, and both
  packages' test suites tokenize it by name and assert every position `Day` occupies in it.


## Progress

- [x] (2026-09-20 02:55Z) Read the parser diff for the whole range; confirmed the only parser
  change is two lines in `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` and that
  `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` — which owns `reservedWords` — is untouched, so
  Section 3 of the spec stays at exactly 72 words.
- [x] (2026-09-20 02:58Z) Confirmed the change *is* lexical: `Day` is a spelling neither package
  matches today, and `grep -rnw Day corpus/ spec/ packages/*/test/` returns nothing, so adding it
  can recolour no existing corpus token.
- [x] (2026-09-20 03:00Z) Recorded the pre-change baselines both suites must beat: Shiki
  `97 pass / 0 fail / 624 expect() calls`, Vim `606 checks, 0 failures`.
- [x] (2026-09-20 03:12Z) Milestone 1: `spec/keiro-dsl-language-model.md` Sections 1, 4, and 6
  updated. The type slot went from eleven spellings to twelve and from ten literal spellings to
  eleven; Section 6's Primitive-type row names `Day`; Section 1 gained a paragraph for
  `CalendarDaySyntax`. No word grid was touched, so both suites' count guards (72 / 139 / 56)
  stayed green throughout.
- [x] (2026-09-20 03:15Z) Milestone 2: `Day` added to the `keiroType` keyword list in
  `packages/keiro-vim/syntax/keiro.vim` and to the `#types` alternation in
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, each with a comment naming
  keiro-dsl `6b92bd52`.
- [x] (2026-09-20 03:18Z) Milestone 3: `corpus/mapped-calendar-days.keiro` copied verbatim from
  upstream (`diff` clean) and recorded in `corpus/README.md`.
- [x] (2026-09-20 03:30Z) Milestone 4: assertion blocks added to both suites over the new sample.
  Shiki `100 pass / 0 fail / 680 expect() calls`; Vim `632 checks, 0 failures`.
- [x] (2026-09-20 03:34Z) Proved both new blocks actually exercise the new rule by removing `Day`
  from each package's type list and re-running: Shiki `99 pass / 1 fail`, Vim
  `632 checks, 6 failures`. Both files restored immediately afterwards.
- [x] (2026-09-20 03:36Z) Wrote the Conventional Commits subject to `.keiro-dsl-sync-subject`.


## Surprises & Discoveries

- Observation: the whole six-commit range changes exactly **two** lines of parser source, and
  both are the same line written twice — once in `pMappedTypeExpr`'s top-level `choice` and once
  in its nested `pTypeAtom` `choice`, which is how every other primitive spelling in that function
  is declared.
  Evidence: the parser diffstat for the range is
  `Grammar.hs | 1 +`, `Parser/Mapped.hs | 2 +`, `PrettyPrint.hs | 1 +`,
  `test/fixtures/calendar-days.keiro | 108 +`.

- Observation: `Day` is **not** in the parser's `reservedWords`, and neither is any other
  primitive type spelling — not `Text`, not `Int`, not `Time`. The type vocabulary of this
  language has always lived entirely outside Section 3 of the spec, and outside Section 4's
  curated grids as well; it lives only in Section 6's Primitive-type row. That is why a plan that
  adds a whole new type spelling touches none of the three mechanical word-count guards.
  Evidence: `rg -n '"Day"' keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` returns nothing, and the
  Section 3 / Section 4 guards in both suites reported 72 / 139 / 56 unchanged after Milestone 1.

- Observation: the new type shares its spelling with a *substring* of three identifiers in
  upstream's own fixture — `LocalDay`, `MaybeLocalDay`, and the field name `optionalDay`. Both
  packages survive this for free and for two different reasons: Vim's `syntax keyword` matches
  whole words only, and the Shiki rule is wrapped in `(?<![A-Za-z0-9_])` / `(?![A-Za-z0-9_])`
  guards that the `l` before `Day` in `LocalDay` trips. No new rule ordering was needed.
  Evidence: the Milestone 4 assertions `expect_no_group('current LocalDay = initial', 13)` (Vim,
  offset 13 being the `D`) and the Shiki check that no token on that line has content exactly
  `Day` both pass.

- Observation: the fixture's very first `Day` token is the one on the bare `wire Day` line, which
  means both suites' first-match helpers (`expectScope` in Shiki, `expect` in Vim) land there by
  default. Every assertion about `Day` in any *other* position therefore has to be anchored to a
  phrase, exactly as plan 18 discovered for `value`.
  Evidence: an unanchored `expect_uniform('Day', 'keiroType')` and an anchored
  `expect_uniform('Day', 'keiroType', 'wire Day')` are the same assertion; the anchored forms for
  `Optional Day`, `List Day`, and `Map Day` are the ones that carry information.

- Observation: anchoring by itself is not enough on two of the fixture's lines, and the two suites
  fail differently there. Both helpers search for the literal *starting at the anchor's own
  position*, so an anchor of `optionalDay as "optionalDay" : Optional Day optional` finds the
  `Day` inside the field name `optionalDay` first. In Vim that is a plain-text offset and the
  assertion fails; in Shiki `expectWholeToken` reports the misleading "token was split". Both are
  fixed by anchoring on the `:` instead — `': Optional Day optional'` — which no field name
  precedes.
  Evidence: Shiki's first draft reported
  `token "Day" was split — line tokenized as ["    optionalDay ","as",...]`.

- Observation: `expectWholeToken` in the Shiki suite cannot express the several-positions check
  this plan needs, for the reason above, so the suite gained a small local helper `partsOfLine`
  that returns a line's explanation entries and an `expectDayIsType` built on it. It asserts that
  *every* token on the line whose content is exactly `Day` is a type, which is strictly stronger
  than finding one.

- Observation: `packages/keiro-vim/test/run.sh` is executable and has a valid
  `#!/usr/bin/env bash` shebang, but invoking it as `./packages/keiro-vim/test/run.sh` in this
  environment fails with `No such file or directory` — the sandboxed shell cannot resolve `bash`
  through `env`. Invoking it as `bash ./packages/keiro-vim/test/run.sh` works. This is an
  environment quirk, not a repository defect, and no file was changed for it.
  Evidence: `ls -l` reports mode `-rwxr-xr-x`, and `head -2` shows the shebang.


## Decision Log

- Decision: Classify `Day` as a **Primitive type** in Section 6 (`support.type.keiro` under
  Shiki, `Type` under Vim), matched unconditionally and case-sensitively as a whole word
  everywhere it appears.
  Rationale: this is the class every other spelling of `pMappedTypeExpr` already has, and Section
  1 of the spec fixes the rule that a word is a keyword because it is in a fixed list, not because
  of where it appears. `Day` has no second role anywhere in the language — it is not a clause
  label, not a modifier, and not reserved — so the usual one-word-one-class tension that plans 8
  and 18 had to adjudicate does not arise here.
  Date: 2026-09-20

- Decision: Do **not** gate the `Day` rule on the declared language version, even though the
  parser does (`languageFeatureKeyword context CalendarDaySyntax "Day"` raises a
  `LanguageFeatureRequiresVersion` diagnostic in a source that declares `language keiro-dsl 5` or
  earlier).
  Rationale: Section 1 of `spec/keiro-dsl-language-model.md` has carried this standing rule since
  the version preamble arrived — highlighting is purely lexical, a version gate is a parser
  concern, and a file opening `language keiro-dsl 1` that uses a Language 6 word colours exactly
  as it would under a `6`. Every gated word added by plans 17 and 18 was handled the same way.
  Date: 2026-09-20

- Decision: Copy upstream's `keiro-dsl/test/fixtures/calendar-days.keiro` **verbatim** into the
  corpus as `corpus/mapped-calendar-days.keiro` rather than hand-writing a sample.
  Rationale: `corpus/README.md`'s provenance rules prefer verbatim upstream fixtures, and this one
  is upstream's authoritative fixture for the feature — `keiro-dsl/test/Main.hs` reads it with
  `readTestText`, parses it with `checkedServiceFromText`, registers it in the conformance fixture
  list, and asserts that the same text under a `language keiro-dsl 5` preamble is refused — so a
  verbatim copy proves both packages tokenize text that really is valid keiro-dsl. It also happens
  to place `Day` in seven distinct positions in one file (bare `wire`, `wire Optional`, a required
  wire field, an `Optional` wire field, a `List` wire field, a `Map` wire field, and a
  nested-reference `MaybeLocalDay`), which no hand-written sample would obviously get right.
  Date: 2026-09-20

- Decision: Name the corpus file `mapped-calendar-days.keiro` rather than repeating upstream's
  bare `calendar-days.keiro`.
  Rationale: the corpus names files after the *surface* they exercise, not after upstream's
  fixture name — `consumer-types.keiro` became `consumer-mapped-types.keiro`, `nominal-scalars.keiro`
  became `consumer-nominal-bindings.keiro`, and `bare-containers.keiro` became
  `consumer-mapped-bare-containers.keiro`. The `mapped-` prefix groups it with
  `mapped-type-spellings.keiro`, which is the other file whose reason for existing is the type
  slot's vocabulary.
  Date: 2026-09-20

- Decision: Leave `corpus/mapped-type-spellings.keiro` alone rather than adding `Day` to it.
  Rationale: that file is hand-written and its stated job in `corpus/README.md` is to cover the
  two spellings *no single upstream fixture exercises together*. `Day` is not in that situation —
  upstream's own fixture covers it thoroughly — and editing a corpus file that both suites already
  assert against would risk moving the first-match anchors those assertions depend on. Corpus files
  are read-only inputs by the rule at the bottom of `corpus/README.md`; adding a file is the
  cheaper and safer move.
  Date: 2026-09-20


## Outcomes & Retrospective

All four milestones are complete and both suites are green: Shiki `100 pass / 0 fail / 680
expect() calls` (up from 97 / 0 / 624 before), Vim `632 checks, 0 failures` (up from 606).

Both new blocks were proved to bite. Removing `Day` from the Shiki `#types` alternation and
re-running gives `99 pass / 1 fail` with the message
`no whole \`Day\` token on the line containing "wire Day"; it tokenized as ["  ","wire"," Day"]`;
removing it from the Vim `keiroType` keyword list gives `632 checks, 6 failures`, one per
position. Both files were restored immediately.

Against the original purpose:

- **The spec records the new spelling.** `spec/keiro-dsl-language-model.md` Section 1 records
  `CalendarDaySyntax` as version 6's newest feature and states it costs one word — the first
  version-6 feature that does; Section 4's mapped-type subsection accepts twelve spellings
  (eleven literal) where it accepted eleven (ten literal), with `Day` described beside `Time` and
  the difference between the two spelled out; Section 6's Primitive-type row names `Day` and
  carries the commit. Section 3 is still 72 words and Section 4 is still 139 bare / 56 dashed —
  the mechanical guards in both suites confirm it, because type spellings have never lived in
  either grid.
- **Both highlighters agree with it.** `Day` is `support.type.keiro` under Shiki and `Type` under
  Vim, in every position upstream's fixture puts it, while `LocalDay` and `MaybeLocalDay` stay
  plain.
- **The corpus exercises it.** `corpus/mapped-calendar-days.keiro` is byte-identical to
  upstream's checked fixture and both suites tokenize it by name.

What went differently than planned: nothing in scope. The only friction was anchoring. Most of the
new assertions name a phrase rather than a bare literal, because the fixture repeats `Day` eleven
times and both suites' helpers take the first match — and on two lines the anchor had to start at
the `:` rather than at the field name, because two field names themselves end in `Day`. The Shiki
suite also gained a small local helper, `partsOfLine`, because `expectWholeToken`'s
"first part containing the literal" search cannot express that check. The predicted test counts
in an earlier draft of this plan (102 / 657) were guesses; the real figures are 100 / 680.

Durable context worth keeping: this plan is the cleanest instance so far of a category the earlier
plans only discovered incrementally — **a new type spelling costs exactly one entry in one rule per
package and zero changes to any word grid**, because `pMappedTypeExpr`'s vocabulary is not in the
parser's `reservedWords` and so is not in Section 3, and it is not a contextual clause word and so
is not in Section 4 either. It lives only in Section 6's Primitive-type row. A contributor who
looks for a new type in the word-count guards will not find it, and the guards passing is not
evidence that a type spelling arrived safely. That statement now lives in Section 6 of the spec,
which is this repository's durable contract. There is no `docs/adr/` directory here and this plan
does not create one.


## Context and Orientation

**There are no ADRs in this repository.** `docs/` contains only `docs/plans/` and
`docs/masterplans/`; there is no `docs/adr/` directory, so no ADR is cited here and none is
created by this plan. Durable context for this repository lives in
`spec/keiro-dsl-language-model.md` and in the numbered plans under `docs/plans/`.

### The four artifacts this repository keeps in agreement

1. `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 3 is a **verbatim
   copy** of the upstream parser's `reservedWords` list (currently 72 words); Section 4 is a
   *curated* list of words the parser recognises in context but does not reserve (currently 139
   bare and 56 dashed); Section 6 is the token-class taxonomy that says which bucket each word
   lands in and which TextMate scope / Vim highlight group each bucket maps to. **The primitive
   type spellings appear in Section 6 only** — they are in neither Section 3 nor Section 4,
   because the parser neither reserves them nor treats them as clause words.
2. `packages/keiro-vim/syntax/keiro.vim` — a Vim syntax file. It declares `syntax keyword` and
   `syntax match` rules and links each `keiro*` group to a standard Vim highlight group at the
   bottom of the file. Primitive types live on three `syntax keyword keiroType …` lines around
   line 41.
3. `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar. Its top-level
   `patterns` array fixes rule precedence: at a given position, the first listed rule that matches
   wins. Primitive types are the `types` entry of the `repository` object, included between
   `#constants` and `#scalar-roots`.
4. `corpus/*.keiro` — read-only `.keiro` sample files both test suites load and assert against.
   `corpus/README.md` records where each file came from and what it is for.

### What the upstream range changes

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb..6b92bd52348a763311bcc5a7ddc847e6ef4e4406 -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Four files, 112 insertions:

- `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` (+2) — the only parser change in the range. The
  function `pMappedTypeExpr` is a `choice` over the spellings the type slot accepts, and it
  repeats that `choice` in a nested helper `pTypeAtom` for the argument of a one-argument
  constructor. Both gain the same line:

  ```haskell
  TDay <$ languageFeatureKeyword context CalendarDaySyntax "Day",
  ```

  `languageFeatureKeyword` is the same helper the Language 5 and 6 words use and the same one
  `Integer` uses two lines above: it matches the literal and then fails with a
  `LanguageFeatureRequiresVersion` diagnostic if the source's declared version does not own the
  feature.
- `keiro-dsl/src/Keiro/Dsl/Grammar.hs` (+1) — `TDay` joins the `TypeExpr` sum beside `TTime`.
- `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (+1) — `docTypeExpr TDay = "Day"`, which confirms the
  surface spelling is exactly `Day` with no alias. (`Time` has one: `UTCTime`. `Day` has none.)
- `keiro-dsl/test/fixtures/calendar-days.keiro` (+108) — upstream's new fixture, copied into this
  repository by Milestone 3.

`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` (outside the paths above, but worth naming) adds the
`LanguageFeature` value `CalendarDaySyntax` to syntax profile `keiro-dsl/syntax-profile/5` — which
is language version **6**, the candidate contract — and the `RuntimeCapability` value
`CalendarDayMappings` to `keiro-dsl/runtime-semantics/5`. The released-version registry still holds
six versions; no version is added.

The other five commits in the range (`3797db0a`, `d7706e68`, `eab7ce10`, `2b7b658c`, `b171f8cc`)
are a codec policy in `keiro-codec`, documentation, an ADR, and conformance-test registration for
the *previous* plan's bare container feature. None of them is lexical.

Prove that the reserved word list did not move — `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` owns it,
and the file is absent from the diffstat above:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --name-only \
  a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb..6b92bd52348a763311bcc5a7ddc847e6ef4e4406 -- \
  keiro-dsl/src/Keiro/Dsl/Parser/Core.hs
```

Expected: no output.

### Why this one *is* lexical, when most keiro-dsl commits are not

A new *word* in the language is exactly the kind of change these highlighters exist to track.
`Day` is a literal spelling the parser matches with `keyword "Day"`; before this plan neither
package has it in any rule, so the parser accepts a source in which both packages leave a type
name uncoloured next to a coloured one. That is the defect, and it is visible in one screenshot.

Contrast this with plan 18's range, which introduced a whole new grammar *shape* and added no
word at all. The two situations are the two halves of the warning Section 3 of the spec already
carries: a stable Section 3 does not mean a stable language, and — as this plan adds — a stable
Section 4 and a stable set of word counts do not either.

### Where `Day` can appear

Everywhere `pMappedTypeExpr` is the type slot, which since keiro-dsl `da09736` is a larger set
than the name suggests. Section 4 of the spec already states this and the new fixture demonstrates
all of it:

- a wire field of a `mapped structural record` — `primary as "primary" : Day required`;
- the argument of a one-argument constructor — `Optional Day`, `List Day`, `Map Day`, either bare
  or parenthesised;
- the whole encoding of a `mapped structural value` declaration — the unbraced line `wire Day`,
  the fourth structural shape that plan 18 added;
- an aggregate register's type slot and an aggregate command/event field's type slot;
- a workqueue payload field's type slot.

`Day` does **not** appear in the `mapped nominal X : R` representation slot: that slot is parsed
as a bare identifier and narrowed later by `Keiro/Dsl/NominalType.hs`'s `scalarRepresentation`,
whose accepted set (`Text`, `Int`, `Natural`, `Bool`, `Time`, `UTCTime`) this range does not
change. The distinction is invisible to a lexical highlighter, which colours the word wherever it
finds it.

### The test suites

- `packages/shiki-keiro/test/scopes.test.ts` (Bun). Loads each corpus file with `readFileSync` and
  asserts with two helpers: `expectScope(code, content, scope)` finds the first sub-token whose
  trimmed text equals `content` and asserts the scope is present;
  `expectWholeToken(code, content, scope, anchor?)` additionally proves no shorter rule split the
  literal, and its optional `anchor` restricts the search to lines containing a phrase. A
  module-level set `KEYWORDISH_SCOPES` lists the scopes that count as "coloured as a keyword", used
  by the checks that prove a token stays plain. At the end of the file are mechanical guards that
  read Section 3's and Section 4's fenced word lists straight out of the spec and assert both the
  counts and that every listed word is classified as *some* kind of keyword.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` under
  headless Neovim. `open(relpath)` loads a corpus file, `expect(phrase, group)` asserts the
  highlight group at the phrase's *first character* on the first line containing the phrase,
  `expect_uniform(word, group, anchor?)` asserts the group on every character of the word, and
  `expect_no_group(phrase, offset)` asserts that the character at `offset` within the phrase has no
  highlight group at all. It carries the same spec word-list guards.

Run them with:

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

```bash
bash packages/keiro-vim/test/run.sh
```

Note the `bash` prefix on the second. `packages/keiro-vim/test/run.sh` is marked executable and
carries a `#!/usr/bin/env bash` shebang, but in a sandboxed shell that cannot resolve `bash`
through `env`, invoking it as `./packages/keiro-vim/test/run.sh` fails with the confusing message
`No such file or directory`. Running it through `bash` explicitly always works.

Before this plan they report:

```text
 97 pass
 0 fail
 624 expect() calls
```

```text
606 checks, 0 failures
```


## Plan of Work

Four milestones, in the order the sync workflow requires: the spec first, because it is the
contract the two packages implement; then the two highlighters; then the corpus sample; then the
tests that pin the new behaviour.

### Milestone 1 — correct the spec

Scope: `spec/keiro-dsl-language-model.md` only. At the end of this milestone the spec names `Day`
as an accepted spelling of the mapped type expression and classifies it as a Primitive type, and
no word grid has been touched.

Three edits:

1. **Section 1**, immediately after the paragraph beginning "**Version 6 has since gained one more
   feature, and it costs no word at all.**", add a paragraph recording that keiro-dsl `6b92bd52`
   added a *second* late feature to version 6's syntax profile, `CalendarDaySyntax`, and that this
   one does cost a word — `Day` — but costs it in Section 6 rather than in Section 3 or Section 4,
   so all three word counts are unchanged. Name `corpus/mapped-calendar-days.keiro` as the sample.
2. **Section 4**, in the subsection "The mapped type declaration", in the fact bullet that begins
   "**The type slot accepts exactly eleven spellings**": change eleven to twelve and "All ten
   literal spellings" to "All eleven literal spellings", insert `Day` beside `Time`, and explain
   the difference between the two in one sentence (a `Day` is a calendar date with no time-of-day
   part and no time zone; a `Time` is an instant). In the bullet immediately below it that begins
   "**That same type slot is no longer confined to a `mapped` declaration.**", change "all eleven
   spellings" to "all twelve spellings".
3. **Section 6**: add `Day` to the Primitive-type row's list of mapped-type spellings, with the
   commit `6b92bd52` beside it, and append to the same row a sentence stating that the primitive
   type vocabulary lives in this row alone — in neither Section 3 nor Section 4 — so the word-count
   guards in the two suites cannot notice a type spelling arriving or going missing.

Acceptance: `rg -nw 'Day' spec/keiro-dsl-language-model.md` returns matches in Sections 1, 4, and
6, and both suites still pass their Section 3 / Section 4 count guards (72, 139, 56 — unchanged),
which they will, because no fenced word list is edited.

### Milestone 2 — teach both highlighters the spelling

Scope: `packages/keiro-vim/syntax/keiro.vim` and
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`.

In the Vim file, add `Day` to the first `syntax keyword keiroType …` line (line 41 before this
plan), which already carries `Time` and `UTCTime`, and extend the comment above it. `syntax
keyword` is case-sensitive and whole-word by default, which is exactly what is wanted: `Day` must
not claim the tail of `LocalDay`, and a lowercase `day` — a perfectly ordinary field name, and one
upstream's fixture uses — must stay plain.

In the TextMate grammar, add `Day` to the `types` alternation, after `UTCTime`, and extend that
rule's `comment`. The rule's existing `(?<![A-Za-z0-9_])` and `(?![A-Za-z0-9_])` guards give it the
same whole-word behaviour; ordering within the alternation does not matter here because `Day` is
neither a prefix nor a suffix of any other alternative.

Neither package needs a new rule, a new scope, or a new precedence position. This is a
one-word-per-file edit.

Acceptance: both suites are still green (nothing asserts the new behaviour yet), and a one-off
probe shows `Day` carrying `support.type.keiro` under Shiki.

### Milestone 3 — add the corpus sample

Scope: `corpus/mapped-calendar-days.keiro` (new, verbatim from upstream) and `corpus/README.md`
(a provenance entry appended to the "Copied later" list, after the
`consumer-mapped-bare-containers.keiro` entry).

Acceptance: the new file is byte-identical to upstream's
`keiro-dsl/test/fixtures/calendar-days.keiro` at `6b92bd52`, provable with `diff`.

### Milestone 4 — assert the sample in both suites and run them green

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`.

Each suite gains a block over the new corpus file asserting that `Day` is a primitive type in
every position the fixture puts it — the bare `wire Day` line, `wire Optional Day`, a required
wire field (`: Day required`), an `Optional Day` wire field, a `List Day` wire field, and a
`Map Day` wire field — that `LocalDay` and `MaybeLocalDay` are *not* claimed by the new rule, that
`Day` is uncoloured inside them, that the lowercase field name `day` stays plain (the rules are
case-sensitive), and that the aggregate, workqueue, projection-catalog and
readmodel nodes beneath the declarations still tokenize. Shiki additionally asserts that `LocalDay`
in the declaration position `mapped structural value LocalDay` gets `entity.name.type.keiro` from
plan 18's `#bare-mapped-decl-with-name` rule; Vim deliberately does not, for the inert-rule reason
recorded in Context and Orientation of `docs/plans/18-record-the-keiro-dsl-bare-container-mapping-shape-mapped-structural-value-and-cover-it-in-the-corpus.md`.

Because the fixture repeats `Day` eleven times and both suites' helpers match the *first*
occurrence of a literal, every assertion about a position other than the bare `wire Day` line must
pass an anchor phrase — and on the `optionalDay` and `namedOptional` lines the anchor must start
at the `:`, because those field names themselves end in `Day` and would be found first.

Acceptance: `(cd packages/shiki-keiro && bun install && bun test)` reports `100 pass / 0 fail`, and
`bash packages/keiro-vim/test/run.sh` reports `632 checks, 0 failures`. Then prove the new blocks
bite by deleting `Day` from each package's type list, re-running, and restoring: Shiki must report
`1 fail` and Vim `6 failures`.


## Concrete Steps

All commands run from `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless stated otherwise.

### Step 0 — re-derive the parser facts

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
  a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb..6b92bd52348a763311bcc5a7ddc847e6ef4e4406 -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Expected:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs          |   1 +
 keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs    |   2 +
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs      |   1 +
 keiro-dsl/test/fixtures/calendar-days.keiro | 108 ++++++++++++++++++++++++++++
 4 files changed, 112 insertions(+)
```

### Step 1 — Milestone 1, spec edits

Edit `spec/keiro-dsl-language-model.md` as described in Plan of Work. Then confirm the word lists
were not disturbed:

```bash
rg -n 'contains exactly \*\*72\*\* words' spec/keiro-dsl-language-model.md
rg -nw 'Day' spec/keiro-dsl-language-model.md
```

### Step 2 — Milestone 2, grammar edits

In `packages/keiro-vim/syntax/keiro.vim`, the `keiroType` line becomes:

```vim
syntax keyword keiroType Bool Int Integer Text Time UTCTime Day Id Maybe Natural Json Optional List Map
```

In `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, the `types` rule's `match` becomes:

```json
"match": "(?<![A-Za-z0-9_])(?:Bool|Integer|Int|Text|Time|UTCTime|Day|Id|Maybe|Natural|Json|Optional|List|Map|typeid|text|int|bool)(?![A-Za-z0-9_])"
```

### Step 3 — Milestone 3, corpus

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  6b92bd52348a763311bcc5a7ddc847e6ef4e4406:keiro-dsl/test/fixtures/calendar-days.keiro \
  > corpus/mapped-calendar-days.keiro
```

Verify it is verbatim:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  6b92bd52348a763311bcc5a7ddc847e6ef4e4406:keiro-dsl/test/fixtures/calendar-days.keiro \
  | diff - corpus/mapped-calendar-days.keiro && echo VERBATIM
```

Expected: `VERBATIM`.

Then append the provenance entry to `corpus/README.md`.

### Step 4 — Milestone 4, tests and suites

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

```bash
bash packages/keiro-vim/test/run.sh
```

### Step 5 — the sync subject line

The calling automation owns the commit; this plan only writes the subject it should use.

```bash
printf '%s\n' 'feat(syntax): highlight the Day calendar type spelling' > .keiro-dsl-sync-subject
```


## Validation and Acceptance

**Both suites green.** From the repository root:

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

Expected tail: `100 pass`, `0 fail`, `680 expect() calls`.

```bash
bash packages/keiro-vim/test/run.sh
```

Expected tail: `632 checks, 0 failures`.

**The behaviour the plan exists for.** With `packages/keiro-vim` on the Neovim runtime path,
`nvim corpus/mapped-calendar-days.keiro` shows, on line 11 (`  wire Day`): `wire` as `Statement`
and `Day` as `Type`. Before this plan `Day` there was plain text. On line 20
(`  wire Optional Day`): `Optional` and `Day` both as `Type`. On lines 30 through 34 — the wire
fields of `CalendarEnvelope` — `Day`, `Optional Day`, `List Day`, and `Map Day` all render in the
type colour, and the reference `MaybeLocalDay` on line 32 stays plain, as every reference to a
declared type does. On line 4 (`mapped structural value LocalDay {`) `LocalDay` stays plain under
Vim, which is the documented, compliant behaviour of the inert declaration-site-type-name rule.

Under Shiki the same file gives every one of those `Day` tokens the scope `support.type.keiro`,
and gives `LocalDay` on line 4 the scope `entity.name.type.keiro` from plan 18's rule. A focused
probe, which runs the two `Day` tests and filters the other 98 out:

```bash
(cd packages/shiki-keiro && bun test --test-name-pattern 'Day')
```

```text
 2 pass
 98 filtered out
 0 fail
 30 expect() calls
```

**The non-regression that matters.** `Day` is a substring of `LocalDay`, `MaybeLocalDay`, and
`optionalDay`, all of which appear in the same file, and none of them may be touched. Both suites
assert this explicitly. Vim uses `expect_no_group` with an offset that lands on the `D` inside
each identifier — `expect_no_group('current LocalDay = initial', 13)`,
`expect_no_group(': MaybeLocalDay required', 12)`, and
`expect_no_group('optionalDay as "optionalDay"', 8)` — plus `expect_no_group('{ day:LocalDay', 2)`
for the lowercase field name `day`, which proves the match is case-sensitive. Shiki asserts that
no token on those lines has content exactly `Day` and that the plain token containing `LocalDay`
carries neither `support.type.keiro` nor any of the `KEYWORDISH_SCOPES`.

**The guards that will not help you.** Section 3 is still 72 words, Section 4 is still 139 bare and
56 dashed, and every one of those guards passed before this plan as well as after it. A type
spelling is invisible to them by construction. The named assertions added in Milestone 4 are the
only thing standing between a future edit and a silently uncoloured `Day`.


## Idempotence and Recovery

Every step is safe to repeat. The spec, grammar, and test edits are ordinary text edits;
re-running them on an already-edited file is a no-op if done with exact-match replacement, and any
accidental double-application is visible as duplicated prose, a duplicated alternative in a regex
(harmless but ugly), or a duplicated `Day` in the Vim keyword list (also harmless — `syntax
keyword` tolerates repeats). A duplicated JSON key would make `bun test` fail at grammar load
rather than silently.

Step 3 rewrites `corpus/mapped-calendar-days.keiro` wholesale from upstream, so it is idempotent by
construction; the `diff` check immediately after proves it.

Step 5 uses `>` rather than `>>`, so re-running it replaces the subject line rather than appending
a second one.

Rollback for any milestone is `git checkout -- <path>` on the files it touched, and `rm
corpus/mapped-calendar-days.keiro` for the added file. Nothing in this plan runs a migration,
writes outside this repository, or touches the upstream `keiro` checkout — every upstream command
above is a read (`git diff`, `git show`).


## Interfaces and Dependencies

- **`spec/keiro-dsl-language-model.md`** — the contract both packages implement. After Milestone 1
  its Section 3 still holds exactly 72 words and its Section 4 still holds exactly 139 bare and 56
  dashed; the mechanical guards in both suites read these fenced blocks directly, so any accidental
  edit to a word grid fails a named test. Section 6's Primitive-type row is the only place the
  spelling `Day` is normative.
- **`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`** — after Milestone 2 the `types` entry
  of its `repository` object lists `Day` among its alternatives. Its position in the top-level
  `patterns` array is unchanged (between `#constants` and `#scalar-roots`), and no new repository
  key is added.
- **`packages/keiro-vim/syntax/keiro.vim`** — after Milestone 2 its first `syntax keyword
  keiroType` line lists `Day`. The group `keiroType` already links to the standard Vim highlight
  group `Type` at the bottom of the file; no new group and no new link is added.
- **`corpus/mapped-calendar-days.keiro`** — a read-only input for both suites, byte-identical to
  `keiro-dsl/test/fixtures/calendar-days.keiro` at keiro-dsl `6b92bd52`.
- **`.keiro-dsl-sync-subject`** — a one-line file at the repository root holding the Conventional
  Commits subject the calling automation will use. This plan writes it; it does not commit.
- **Toolchain** — Bun for the Shiki suite (`bun install`, `bun test`; the grammar is loaded through
  `packages/shiki-keiro/src/index.ts`, which reads the JSON), and headless Neovim for the Vim suite
  via `packages/keiro-vim/test/run.sh`. Both are already required by plans 3 and 2 respectively;
  this plan adds no dependency.
- **Upstream** — `mori://shinzui/keiro`, working copy at `/Users/shinzui/Keikaku/bokuno/keiro`,
  read-only for the purposes of this plan.
