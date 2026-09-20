---
id: 20
slug: highlight-the-keiro-dsl-set-text-structural-text-set-type-spelling
title: "Highlight the keiro-dsl Set Text structural text-set type spelling"
kind: exec-plan
created_at: 2026-09-20T04:41:41Z
provenance:
  created_by:
    model: "claude-opus-5"
    harness: "claude-code"
    at: 2026-09-20T04:41:41Z
  revisions:
    - model: "claude-opus-5"
      harness: "claude-code"
      at: 2026-09-20T04:50:35Z
      mode: "implement"
      note: "Implemented all four milestones; both suites green (Shiki 105/0, Vim 665/0)"
---

# Highlight the keiro-dsl Set Text structural text-set type spelling

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
`01ba6c58f418010c1e2c0edd415f776079deecc1` (short form `01ba6c58`, subject
*feat(dsl): add checked structural text sets*), the head of the five-commit range
`6b92bd52348a763311bcc5a7ddc847e6ef4e4406..01ba6c58f418010c1e2c0edd415f776079deecc1`. Only the
head commit touches the parser, and it touches it in seven added lines.

The range gives the language a **new primitive type spelling**: `Set Text`, a set of text values —
an unordered collection with no duplicates, which is what distinguishes it from the older
`List Text`, an ordered collection that may repeat a value. The spelling is two words, and the
second word is fixed: the parser accepts `Set` only when `Text` follows it, so `Set Natural` and a
bare `Set` are not types in this language. It is written everywhere every other primitive spelling
is written — in the type slot of a mapped type's wire field, in the bare `wire <Type>` line of a
`mapped structural value` declaration, inside the one-argument constructors `Optional`, `List`,
and `Map`, in an aggregate register, in an aggregate command/event field, and in a workqueue
payload field:

```text
mapped structural value TextLabels {
  haskell package=keiro-dsl module=Conformance.StructuralTextSets.Domain type=TextLabels
  binding = "Conformance.StructuralTextSets.Bindings.textLabelsBinding"
  wire Set Text
}

mapped structural record LabelEnvelope {
  wire object constructor=LabelEnvelope unknown-fields=reject {
    primary        as "primary"        : Set Text            required
    optionalLabels as "optionalLabels" : Optional (Set Text) optional on-missing=null
    sequence       as "sequence"       : List (Set Text)     required
    labelled       as "labelled"       : Map (Set Text)      required
  }
}
```

Before this plan both packages leave every one of those `Set` tokens **plain, uncoloured text**
while colouring the `Text` immediately after it, so a two-word type renders half-coloured —
`Optional`, `List`, `Map`, and `Text` on the very same lines are types and `Set` is not. That is
the single observable defect this plan fixes.

After this plan:

- `spec/keiro-dsl-language-model.md` records `Set Text` in Section 4's mapped-type type-slot fact
  (which goes from twelve accepted spellings to thirteen) and records the word `Set` in Section
  6's Primitive-type row, and Section 1 records that keiro-dsl `01ba6c58` added the
  `TextSetSyntax` feature to language version 6's syntax profile.
- `packages/keiro-vim/syntax/keiro.vim` and
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` both match `Set` as a primitive type
  everywhere it appears, case-sensitively and as a whole word.
- `corpus/mapped-text-sets.keiro` is upstream's own checked fixture for the feature, and both
  packages' test suites tokenize it by name and assert every position `Set Text` occupies in it.
- Both suites also assert the non-regression this particular word needs, which no earlier type
  spelling needed: `Set` is a **prefix** of identifiers that already exist in three older corpus
  files (`Settle`, `Settled`, `SettleEntry`, `TicketSettled`, `EntrySettled`), and none of them
  may change colour.


## Progress

- [x] (2026-09-20 04:35Z) Read the parser diff for the whole range; confirmed the only parser
  change is seven lines in `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` and that
  `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` — which owns `reservedWords` — is untouched, so
  Section 3 of the spec stays at exactly 72 words.
- [x] (2026-09-20 04:37Z) Confirmed the change *is* lexical: `Set` is a spelling neither package
  matches today.
- [x] (2026-09-20 04:38Z) Found the collision this word has and the previous one did not:
  `grep -rnw Set corpus/` returns nothing, but `grep -rn Set corpus/` returns `Settle`,
  `Settled`, `SettleEntry`, `TicketSettled`, and `EntrySettled` across
  `corpus/language-version-3.keiro`, `corpus/language-version-4.keiro`, and
  `corpus/transition-implementation-hole.keiro`. A rule without a trailing word boundary would
  recolour all five.
- [x] (2026-09-20 04:40Z) Recorded the pre-change baselines both suites must beat: Shiki
  `100 pass / 0 fail / 680 expect() calls`, Vim `632 checks, 0 failures`.
- [x] (2026-09-20 04:55Z) Milestone 1: `spec/keiro-dsl-language-model.md` Sections 1, 4, and 6
  updated. The type slot went from twelve spellings to thirteen and from eleven literal spellings
  to twelve; Section 6's Primitive-type row names `Set`; Section 1 gained a paragraph for
  `TextSetSyntax`. No word grid was touched, so both suites' count guards (72 / 139 / 56) stayed
  green throughout.
- [x] (2026-09-20 04:58Z) Milestone 2: `Set` added to the `keiroType` keyword list in
  `packages/keiro-vim/syntax/keiro.vim` and to the `#types` alternation in
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, each with a comment naming
  keiro-dsl `01ba6c58`.
- [x] (2026-09-20 05:02Z) Milestone 3: `corpus/mapped-text-sets.keiro` copied verbatim from
  upstream (`diff` clean) and recorded in `corpus/README.md`.
- [x] (2026-09-20 05:20Z) Milestone 4: assertion blocks added to both suites over the new sample
  and over the three older files that carry `Settle`-family identifiers. Shiki
  `105 pass / 0 fail / 769 expect() calls`; Vim `665 checks, 0 failures`.
- [x] (2026-09-20 05:26Z) Proved the positive assertions bite by removing `Set` from each
  package's type list and re-running: Shiki `104 pass / 1 fail`, Vim `665 checks, 6 failures`.
  Both files restored immediately afterwards.
- [x] (2026-09-20 05:30Z) Proved the *negative* assertions bite too, which is the half that is
  easy to write without meaning anything. Dropping the trailing `(?![A-Za-z0-9_])` from the Shiki
  `#types` rule gives `102 pass / 3 fail`; appending a guardless `syntax match keiroType /Set/` to
  the Vim syntax file gives `665 checks, 7 failures`, one per protected identifier. Both files
  restored immediately afterwards.
- [x] (2026-09-20 05:32Z) Wrote the Conventional Commits subject to `.keiro-dsl-sync-subject`.


## Surprises & Discoveries

- Observation: this is the first new type spelling that is **two words**, and only the first of
  them is new. `Set` is accepted only when `Text` follows it — the parser's helper is
  `pTextSet = languageFeatureKeyword context TextSetSyntax "Set" >> keyword "Text"` — so the
  language has no `Set Natural`, no `Set ItemId`, and no bare `Set`. Both packages nevertheless
  match `Set` on its own, because they are lexical: a one-word rule colours the two-word phrase
  correctly wherever it is legal, and colouring an illegal `Set Natural` as a type is the same
  harmless over-acceptance both packages already show for every version-gated word.
  Evidence: `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` lines 303-305 at `01ba6c58`.

- Observation: `Set` is the first new type spelling that collides with text **already in the
  corpus**, and it collides as a *prefix* rather than as a suffix. `Day` (plan 19) was a substring
  of three identifiers, but all three lived in the one new fixture that plan added. `Set` is the
  head of `Settle`, `Settled`, `SettleEntry`, `TicketSettled`, and `EntrySettled`, which have been
  in `corpus/language-version-3.keiro`, `corpus/language-version-4.keiro`, and
  `corpus/transition-implementation-hole.keiro` since plans 14, 15, and 12. A trailing word
  boundary is therefore load-bearing in a way it has not been before, and the assertions that
  prove it must be made against those older files, not against the new one.
  Evidence: `grep -rn 'Set' corpus/` before this plan returns twelve lines, every one of them a
  `Settle`-family identifier, and not one of them a type.

- Observation: the new upstream fixture writes the container forms **parenthesised** —
  `Optional (Set Text)`, `List (Set Text)`, `Map (Set Text)` — where the calendar-day fixture wrote
  `Optional Day` bare. Both forms parse (`pTypeArgument` is `parens (pMappedTypeExpr context) <|>
  pTypeAtom`, and `pTypeAtom` itself admits `Set Text`), and the pretty-printer emits the *bare*
  form, because `docTypeArgument` has no `TTextSet` case and so falls through to `docTypeExpr`,
  which renders `"Set Text"` without parentheses. None of this matters to a highlighter:
  parentheses are uncoloured punctuation in both packages, so `Optional (Set Text)` and
  `Optional Set Text` tokenize into the same three coloured words.
  Evidence: `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` line 269 (`docTypeExpr TTextSet = "Set Text"`)
  and lines 277-282 (`docTypeArgument`).

- Observation: `Set` is **not** in the parser's `reservedWords`, like every other type spelling —
  and yet, once a file declares `language keiro-dsl 6`, a mapped type *named* `Set` can no longer
  be referred to in a type slot. `keyword "Set"` succeeds and consumes the word, and the following
  `keyword "Text"` then fails without backtracking, so the `TRef <$> ident` alternative below it
  is never reached. That is a parser subtlety with no lexical consequence, and it is recorded here
  only so a future contributor does not go looking for `Set` in Section 3 of the spec.
  Evidence: `pTextSet` is not wrapped in `try`, and `keyword` is
  `(lexeme . try) (chunk w *> notFollowedBy …)` — the `try` is inside the single word, not around
  the pair.

- Observation: the guards both packages use to make a type spelling a whole word —
  `(?<![A-Za-z0-9_])` / `(?![A-Za-z0-9_])` in the TextMate grammar and Vim's `syntax keyword`
  word matching — do **not** treat `.` as a word character, so a dotted Haskell module path whose
  component is spelled exactly like a type would be coloured. The new fixture writes
  `module=Conformance.StructuralTextSets.Domain` in an unquoted slot, which is safe (`Set` there is
  in the interior of `StructuralTextSets`), but a consumer who wrote `module=Data.Set` would see
  `Set` coloured. This is pre-existing behaviour shared by `Text`, `Map`, and every other type
  word, not something this plan introduces, and it is left alone: narrowing the rule to exclude a
  preceding `.` would uncolour nothing that is wrong today and would add a guard no other rule has.

- Observation: the new fixture's own context name, `context structural-text-sets`, is a **dashed
  wire word whose segments are spelled like keywords**, and Vim colours two of them: `-` is not a
  keyword character, so `structural` is matched as a modifier and `text` as the lowercase legacy
  payload type, while the final `sets` stays plain. This is long-standing, deliberate behaviour
  (the same thing happens to every dashed wire word in the corpus), not something `Set` caused —
  but it cost a first draft of the Vim block, which asserted the `text` segment was plain.
  Evidence: the draft assertion `expect_no_group('context structural-text-sets', 19)` — offset 19
  being the `t` of `text` — failed with `got keiroType`. The shipped assertion moved to offset 24,
  the `s` of `sets`, which pins the two properties this plan actually depends on: the rule is
  case-sensitive, and it does not match a word that merely starts with the spelling.

- Observation: the negative assertions are the ones that needed proving, and they do bite.
  Removing `Set` from either package makes exactly the positive block fail; loosening the
  whole-word guard instead makes exactly the negative block fail, and it fails on the *old* corpus
  files as well as on the module path in the new one.
  Evidence: with the Shiki `#types` rule's trailing `(?![A-Za-z0-9_])` deleted, the suite reports
  ``a type spelling was split out of `StructuralTextSets` `` and
  ``\`Set\` was split out of an identifier in corpus/language-version-3.keiro``; with a guardless
  `syntax match keiroType /Set/` appended to the Vim file, all seven `expect_no_group` assertions
  report `got keiroType — a rule is claiming text that must stay plain`.

- Observation: `packages/keiro-vim/test/run.sh` is executable and has a valid
  `#!/usr/bin/env bash` shebang, but invoking it as `./packages/keiro-vim/test/run.sh` in this
  environment fails with `No such file or directory` — the sandboxed shell cannot resolve `bash`
  through `env`. Invoking it as `bash packages/keiro-vim/test/run.sh` works, and an absolute path
  is more reliable still when the shell's working directory has drifted. This matches what plan 19
  recorded; it is an environment quirk, not a repository defect, and no file was changed for it.


## Decision Log

- Decision: Classify `Set` as a **Primitive type** in Section 6 (`support.type.keiro` under Shiki,
  `Type` under Vim), matched unconditionally and case-sensitively as a whole word everywhere it
  appears — one one-word rule, not a two-word `Set\s+Text` rule.
  Rationale: this is the class every other spelling of `pMappedTypeExpr` already has, and Section 1
  of the spec fixes the rule that a word is a keyword because it is in a fixed list, not because of
  where it appears. A two-word rule would be the first context-sensitive type rule in either
  package; it would buy nothing a reader can see (the only difference is an illegal `Set Foo`,
  which both packages would colour and the parser would reject — exactly what already happens for
  every version-gated word in a version-1 file) and it would cost a new repository entry in the
  TextMate grammar and a `syntax match` with `nextgroup` plumbing in Vim. `Set` has no second role
  anywhere in the language: it is not a clause label, not a modifier, and not reserved.
  Date: 2026-09-20

- Decision: Do **not** gate the `Set` rule on the declared language version, even though the parser
  does (`languageFeatureKeyword context TextSetSyntax "Set"` raises a
  `LanguageFeatureRequiresVersion` diagnostic in a source that declares `language keiro-dsl 5` or
  earlier).
  Rationale: Section 1 of `spec/keiro-dsl-language-model.md` has carried this standing rule since
  the version preamble arrived — highlighting is purely lexical, a version gate is a parser
  concern, and a file opening `language keiro-dsl 1` that uses a Language 6 word colours exactly as
  it would under a `6`. Every gated word added by plans 17, 18, and 19 was handled the same way.
  Date: 2026-09-20

- Decision: Copy upstream's `keiro-dsl/test/fixtures/structural-text-sets.keiro` **verbatim** into
  the corpus as `corpus/mapped-text-sets.keiro` rather than hand-writing a sample.
  Rationale: `corpus/README.md`'s provenance rules prefer verbatim upstream fixtures, and this one
  is upstream's authoritative fixture for the feature — `keiro-dsl/test/Main.hs` reads it with
  `readTestText`, parses it with `checkedServiceFromText`, registers it in the conformance fixture
  manifest, scaffolds generated modules from it, and asserts that the same text under a
  `language keiro-dsl 5` preamble is refused with `LanguageFeatureRequiresVersion` — so a verbatim
  copy proves both packages tokenize text that really is valid keiro-dsl. It also places `Set Text`
  in six distinct positions in one file, which no hand-written sample would obviously get right.
  Date: 2026-09-20

- Decision: Name the corpus file `mapped-text-sets.keiro` rather than repeating upstream's
  `structural-text-sets.keiro`.
  Rationale: the corpus names files after the *surface* they exercise, not after upstream's fixture
  name — `consumer-types.keiro` became `consumer-mapped-types.keiro`, `bare-containers.keiro`
  became `consumer-mapped-bare-containers.keiro`, and `calendar-days.keiro` became
  `mapped-calendar-days.keiro`. The `mapped-` prefix groups it with `mapped-type-spellings.keiro`
  and `mapped-calendar-days.keiro`, the other two files whose reason for existing is the type
  slot's vocabulary. Upstream's `structural-` prefix names the *declaration family*
  (`mapped structural`), which is not what this file is about.
  Date: 2026-09-20

- Decision: Assert the prefix non-regression against the three **pre-existing** corpus files that
  contain `Settle`-family identifiers rather than adding a new identifier to the new fixture.
  Rationale: corpus files are read-only inputs by the rule at the bottom of `corpus/README.md`, and
  the new fixture is a verbatim upstream copy that must stay byte-identical. The collision is real
  and already in the tree, so the honest test is the one that reads the files where it lives. It
  also means a future edit that loosens either type rule fails against files nobody was thinking
  about, which is where a silent recolouring would otherwise hide.
  Date: 2026-09-20

- Decision: Leave `corpus/mapped-type-spellings.keiro` alone rather than adding `Set Text` to it.
  Rationale: that file is hand-written and its stated job in `corpus/README.md` is to cover the
  spellings no single upstream fixture exercises together. `Set Text` is not in that situation, and
  editing a corpus file that both suites already assert against would risk moving the first-match
  anchors those assertions depend on. Adding a file is the cheaper and safer move, exactly as plan
  19 decided for `Day`.
  Date: 2026-09-20


## Outcomes & Retrospective

All four milestones are complete and both suites are green: Shiki `105 pass / 0 fail / 769
expect() calls` (up from 100 / 0 / 680 before), Vim `665 checks, 0 failures` (up from 632).

Both halves of the new coverage were proved to bite. Removing `Set` from the Shiki `#types`
alternation and re-running gives `104 pass / 1 fail` with the message
``no whole `Set` token on the line containing "wire Set Text"; it tokenized as ["  ","wire"," Set ","Text"]``
— which is the half-coloured phrase this plan exists to fix, printed as a test failure; removing it
from the Vim `keiroType` keyword list gives `665 checks, 6 failures`, one per position. Loosening
the whole-word guard instead of deleting the word gives the opposite pair: `102 pass / 3 fail`
under Shiki and `665 checks, 7 failures` under Vim, naming `StructuralTextSets` and the five
`Settle`-family identifiers. Every probe file was restored immediately.

Against the original purpose:

- **The spec records the new spelling.** `spec/keiro-dsl-language-model.md` Section 1 records
  `TextSetSyntax` as version 6's third late feature; Section 4's mapped-type subsection accepts
  thirteen spellings (twelve literal) where it accepted twelve (eleven literal), with `Set Text`
  described beside `List Text` and the difference between the two spelled out; Section 6's
  Primitive-type row names `Set` and carries the commit. Section 3 is still 72 words and Section 4
  is still 139 bare / 56 dashed — the mechanical guards in both suites confirm it, because type
  spellings have never lived in either grid.
- **Both highlighters agree with it.** `Set` is `support.type.keiro` under Shiki and `Type` under
  Vim, in every position upstream's fixture puts it, while `Settled`, `Settle`, `SettleEntry`,
  `TicketSettled`, `EntrySettled`, and the module-path component `StructuralTextSets` stay as they
  were.
- **The corpus exercises it.** `corpus/mapped-text-sets.keiro` is byte-identical to upstream's
  checked fixture and both suites tokenize it by name.

What went differently than planned: the prefix collision turned out to be the interesting half of
the work. Plan 19 could keep its whole non-regression story inside the file it added; this plan
could not, because `Set` is the head of five identifiers that have been in the corpus since plans
12, 14, and 15. The assertions that matter most here are therefore in three files this range never
touched. The second difference is smaller: because the two-word spelling is `Set Text` and `Text`
was already a type, the "before" screenshot is not an uncoloured word but a *half*-coloured phrase,
which is easier to miss in review than a plain one.

Durable context worth keeping, and now recorded in Section 6 of the spec: **a new type spelling can
recolour text in corpus files the upstream range never touched.** The word-count guards cannot see
type spellings at all (plan 19 established that), and hand-named assertions over the *new* sample
cannot see a prefix collision in an *old* one. When a type spelling arrives, grep the whole corpus
for it as a substring before adding it, and pin whatever that grep finds. There is no `docs/adr/`
directory in this repository and this plan does not create one.


## Context and Orientation

**There are no ADRs in this repository.** `docs/` contains only `docs/plans/` and
`docs/masterplans/`; there is no `docs/adr/` directory, so no ADR is cited here and none is created
by this plan. Durable context for this repository lives in `spec/keiro-dsl-language-model.md` and
in the numbered plans under `docs/plans/`. (The upstream `keiro` repository does have ADRs, and
`01ba6c58` touches `docs/adr/log.md` there; none of them is about lexical surface, and this plan
does not depend on them.)

### The four artifacts this repository keeps in agreement

1. `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 3 is a **verbatim
   copy** of the upstream parser's `reservedWords` list (currently 72 words); Section 4 is a
   *curated* list of words the parser recognises in context but does not reserve (currently 139
   bare and 56 dashed); Section 6 is the token-class taxonomy that says which bucket each word
   lands in and which TextMate scope / Vim highlight group each bucket maps to. **The primitive
   type spellings appear in Section 6 only** — they are in neither Section 3 nor Section 4, because
   the parser neither reserves them nor treats them as clause words.
2. `packages/keiro-vim/syntax/keiro.vim` — a Vim syntax file. It declares `syntax keyword` and
   `syntax match` rules and links each `keiro*` group to a standard Vim highlight group at the
   bottom of the file. Primitive types live on three `syntax keyword keiroType …` lines around
   line 45.
3. `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar. Its top-level
   `patterns` array fixes rule precedence: at a given position, the first listed rule that matches
   wins. Primitive types are the `types` entry of the `repository` object, included between
   `#constants` and `#scalar-roots`.
4. `corpus/*.keiro` — read-only `.keiro` sample files both test suites load and assert against.
   `corpus/README.md` records where each file came from and what it is for.

### What the upstream range changes

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
  6b92bd52348a763311bcc5a7ddc847e6ef4e4406..01ba6c58f418010c1e2c0edd415f776079deecc1 -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Four files, 122 insertions:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs                 |   1 +
 keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs           |   5 +
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs             |   1 +
 keiro-dsl/test/fixtures/structural-text-sets.keiro | 115 +++++++++++++++++++++
 4 files changed, 122 insertions(+)
```

- `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` (+5) — the only parser change in the range. The
  function `pMappedTypeExpr` is a `choice` over the spellings the type slot accepts, and it repeats
  that `choice` in a nested helper `pTypeAtom` for the argument of a one-argument constructor. Both
  gain the same alternative, and a shared three-line helper is added in the `where` clause:

  ```haskell
  TTextSet <$ pTextSet,
  ```

  ```haskell
  pTextSet = do
    languageFeatureKeyword context TextSetSyntax "Set"
    keyword "Text"
  ```

  `languageFeatureKeyword` is the same helper the Language 5 and 6 words use and the same one
  `Day` and `Integer` use nearby: it matches the literal and then fails with a
  `LanguageFeatureRequiresVersion` diagnostic if the source's declared version does not own the
  feature. `keyword` is defined in `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` as
  `(lexeme . try) (chunk w *> notFollowedBy (identChar <|> (char '-' *> identChar)))` — a literal
  match that must not be followed by an identifier character, which is exactly the whole-word,
  case-sensitive behaviour both packages must reproduce.
- `keiro-dsl/src/Keiro/Dsl/Grammar.hs` (+1) — `TTextSet` joins the `TypeExpr` sum beside `TDay`.
- `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (+1) — `docTypeExpr TTextSet = "Set Text"`, which
  confirms the surface spelling is exactly those two words with no alias and no other element type.
- `keiro-dsl/test/fixtures/structural-text-sets.keiro` (+115) — upstream's new fixture, copied into
  this repository by Milestone 3.

`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` (outside the paths above, but worth naming) adds the
`LanguageFeature` value `TextSetSyntax` to syntax profile `keiro-dsl/syntax-profile/5` — which is
language version **6**, the candidate contract — and the `RuntimeCapability` value `TextSetMappings`
to `keiro-dsl/runtime-semantics/5`. The released-version registry still holds six versions; no
version is added.

Prove that the reserved word list did not move — `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` owns it,
and the file is absent from the diffstat above:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --name-only \
  6b92bd52348a763311bcc5a7ddc847e6ef4e4406..01ba6c58f418010c1e2c0edd415f776079deecc1 -- \
  keiro-dsl/src/Keiro/Dsl/Parser/Core.hs
```

Expected: no output.

The other four commits in the range (`ec901331`, `eb1064fc`, `082382ab`, `5c214b70`) are
documentation, an ADR update, a profile test, and generated conformance modules for the *previous*
plan's calendar-day feature. None of them is lexical.

### Why this one *is* lexical, when most keiro-dsl commits are not

A new *word* in the language is exactly the kind of change these highlighters exist to track. `Set`
is a literal spelling the parser matches with `keyword "Set"`; before this plan neither package has
it in any rule, so the parser accepts a source in which the two halves of one type render in two
different colours — `Set` plain and `Text` coloured, on the same line, inside the same type
expression. That is the defect, and it is visible in one screenshot.

### Where `Set Text` can appear

Everywhere `pMappedTypeExpr` is the type slot, which since keiro-dsl `da09736` is a larger set than
the name suggests. Section 4 of the spec already states this and the new fixture demonstrates it:

- a wire field of a `mapped structural record` — `primary as "primary" : Set Text required`;
- the argument of a one-argument constructor — `Optional (Set Text)`, `List (Set Text)`,
  `Map (Set Text)`, parenthesised as upstream's fixture writes them or bare, which the grammar also
  accepts;
- the whole encoding of a `mapped structural value` declaration — the unbraced line `wire Set Text`
  and its wrapped sibling `wire Optional (Set Text)`, the fourth structural shape plan 18 added;
- an aggregate register's type slot and an aggregate command/event field's type slot;
- a workqueue payload field's type slot.

`Set` does **not** appear in the `mapped nominal X : R` representation slot: that slot is parsed as
a bare identifier and narrowed later by `keiro-dsl`'s `Keiro/Dsl/NominalType.hs`
`scalarRepresentation`, whose accepted set (`Text`, `Int`, `Natural`, `Bool`, `Time`, `UTCTime`)
this range does not change. The distinction is invisible to a lexical highlighter, which colours
the word wherever it finds it.

### The word this one collides with

`Set` is the first type spelling to be a **prefix** of text that is already in the corpus. Run this
before touching either grammar, and keep the output in mind for Milestone 4:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && grep -rn 'Set' corpus/
```

Expected (twelve lines, none of them a type):

```text
corpus/language-version-3.keiro:40:  states Open Settled!
corpus/language-version-3.keiro:51:    goto Settled
corpus/transition-implementation-hole.keiro:20:  command Settle { ticketId:TicketId amount:Integer }
corpus/transition-implementation-hole.keiro:21:  event   TicketSettled = fields(Settle)
corpus/transition-implementation-hole.keiro:33:  Holding -- Settle -->
corpus/transition-implementation-hole.keiro:40:    emit TicketSettled
corpus/language-version-4.keiro:37:  states Recording Settled!
corpus/language-version-4.keiro:39:  command SettleEntry { entryId amount:Integer status:EntryStatus }
corpus/language-version-4.keiro:40:  event EntrySettled = fields(SettleEntry)
corpus/language-version-4.keiro:42:  Recording -- SettleEntry -->
corpus/language-version-4.keiro:46:    emit EntrySettled
corpus/language-version-4.keiro:47:    goto Settled
```

Every one of these is protected by a trailing word boundary that both packages already have — Vim's
`syntax keyword` matches whole words, and the TextMate `#types` rule is wrapped in
`(?<![A-Za-z0-9_])` / `(?![A-Za-z0-9_])`. Nothing new is needed to make them safe; what is needed
is an assertion that says so, because nothing else in either suite would notice if a future edit
replaced the guard with a plain `\b` on one side only or dropped it entirely.

### The test suites

- `packages/shiki-keiro/test/scopes.test.ts` (Bun). Loads each corpus file with `readFileSync` and
  asserts with two helpers: `expectScope(code, content, scope)` finds the first sub-token whose
  trimmed text equals `content` and asserts the scope is present;
  `expectWholeToken(code, content, scope, anchor?)` additionally proves no shorter rule split the
  literal, and its optional `anchor` restricts the search to lines containing a phrase. A
  file-local helper `partsOfLine(code, anchor)`, added by plan 19, returns every explanation entry
  of the first line containing a phrase, which is what a "this word in this position" assertion
  needs. A module-level set `KEYWORDISH_SCOPES` lists the scopes that count as "coloured as a
  keyword", used by the checks that prove a token stays plain. At the end of the file are
  mechanical guards that read Section 3's and Section 4's fenced word lists straight out of the
  spec and assert both the counts and that every listed word is classified as *some* kind of
  keyword.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` under
  headless Neovim. `open(relpath)` loads a corpus file, `expect(phrase, group)` asserts the
  highlight group at the phrase's *first character* on the first line containing the phrase,
  `expect_uniform(word, group, anchor?)` asserts the group on every character of the word, and
  `expect_no_group(phrase, offset)` asserts that the character at `offset` within the phrase has no
  highlight group at all. It carries the same spec word-list guards.

Run them with:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

```bash
bash /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/keiro-vim/test/run.sh
```

Note the `bash` prefix on the second. `packages/keiro-vim/test/run.sh` is marked executable and
carries a `#!/usr/bin/env bash` shebang, but in a sandboxed shell that cannot resolve `bash`
through `env`, invoking it as `./packages/keiro-vim/test/run.sh` fails with the confusing message
`No such file or directory`. Running it through `bash`, with an absolute path, always works.

Before this plan they report:

```text
 100 pass
 0 fail
 680 expect() calls
```

```text
632 checks, 0 failures
```


## Plan of Work

Four milestones, in the order the sync workflow requires: the spec first, because it is the
contract the two packages implement; then the two highlighters; then the corpus sample; then the
tests that pin the new behaviour.

### Milestone 1 — correct the spec

Scope: `spec/keiro-dsl-language-model.md` only. At the end of this milestone the spec names
`Set Text` as an accepted spelling of the mapped type expression and classifies its new word `Set`
as a Primitive type, and no word grid has been touched.

Four edits:

1. **Section 1**, immediately after the paragraph beginning "**Version 6 has since gained a second
   late feature, and this one does cost a word.**", add a paragraph recording that keiro-dsl
   `01ba6c58` added a *third* late feature to version 6's syntax profile, `TextSetSyntax`, together
   with the runtime capability `TextSetMappings`; that it is the **structural text set** type,
   written `Set Text`; that the only new word is `Set` and it lands in Section 6 rather than in
   Section 3 or Section 4, so all three word counts are unchanged; and that
   `corpus/mapped-text-sets.keiro` is the sample both packages tokenize.
2. **Section 4**, in the subsection "The mapped type declaration", in the fact bullet that begins
   "**The type slot accepts exactly twelve spellings**": change twelve to thirteen and "All eleven
   literal spellings" to "All twelve literal spellings", insert `Set Text` in the list, and explain
   in one or two sentences that it is a set of text values — unordered, no duplicates, unlike
   `List Text` — that `Text` is the only element type the grammar admits after `Set`, and that both
   packages nevertheless match `Set` as an ordinary one-word type rule. In the bullet immediately
   below it that begins "**That same type slot is no longer confined to a `mapped` declaration.**",
   change "all twelve spellings" to "all thirteen spellings".
3. **Section 4**, in the nominal-binding subsection, in the bullet that begins "**The
   representation after the `:` is parsed as a bare identifier**": change
   "twelve-spelling `pMappedTypeExpr` grammar" to "thirteen-spelling", and extend the sentence that
   already says `Day` was added to `pMappedTypeExpr` but not to `scalarRepresentation` so it says
   the same of `Set Text`.
4. **Section 6**: add `Set` to the Primitive-type row's list of mapped-type spellings, noting that
   it is only ever written as the two-word `Set Text` and citing keiro-dsl `01ba6c58`, and append
   to the same row the durable lesson this plan adds to plan 19's: a new type spelling can also
   collide with identifiers in corpus files the upstream range never touched, so a substring grep
   over the whole corpus is part of adding one.

Acceptance: `grep -nw 'Set' spec/keiro-dsl-language-model.md` returns matches in Sections 1, 4, and
6, and both suites still pass their Section 3 / Section 4 count guards (72, 139, 56 — unchanged),
which they will, because no fenced word list is edited.

### Milestone 2 — teach both highlighters the spelling

Scope: `packages/keiro-vim/syntax/keiro.vim` and
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`.

In the Vim file, add `Set` to the first `syntax keyword keiroType …` line (line 45 before this
plan), which already carries `Text`, `Time`, `UTCTime`, and `Day`, and extend the comment above it
to name the two-word spelling and the `Settle` prefix collision. `syntax keyword` is case-sensitive
and whole-word by default, which is exactly what is wanted: `Set` must not claim the head of
`Settled`, and a lowercase `set` must stay plain.

In the TextMate grammar, add `Set` to the `types` alternation, after `Day`, and extend that rule's
`comment` the same way. The rule's existing `(?<![A-Za-z0-9_])` and `(?![A-Za-z0-9_])` guards give
it the same whole-word behaviour. Ordering within the alternation does not matter here: `Set` is
neither a prefix nor a suffix of any other alternative in the rule, and the alternation is only
consulted at a position the guards already admit.

Neither package needs a new rule, a new scope, or a new precedence position. This is a
one-word-per-file edit.

Acceptance: both suites are still green (nothing asserts the new behaviour yet, and nothing may
break — in particular the older corpus files that carry `Settle` must still pass every assertion
they already have).

### Milestone 3 — add the corpus sample

Scope: `corpus/mapped-text-sets.keiro` (new, verbatim from upstream) and `corpus/README.md` (a
provenance entry appended to the "Copied later" list, after the `mapped-calendar-days.keiro`
entry).

Acceptance: the new file is byte-identical to upstream's
`keiro-dsl/test/fixtures/structural-text-sets.keiro` at `01ba6c58`, provable with `diff`.

### Milestone 4 — assert the sample in both suites and run them green

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`.

Each suite gains two blocks. The first asserts that `Set` is a primitive type in every position the
new fixture puts it — the bare `wire Set Text` line, `wire Optional (Set Text)`, a required wire
field (`: Set Text required`), an `Optional` wire field, a `List` wire field, and a `Map` wire field
— that the `Text` beside it is a type too (so the phrase renders as one type, which is the whole
point), that the surrounding parentheses stay uncoloured punctuation, that the module-path component
`StructuralTextSets` is not clipped by the new rule, and that the aggregate, workqueue,
projection-catalog, and readmodel nodes beneath the declarations still tokenize.

The second block is the prefix non-regression, and it reads the three older corpus files:
`corpus/language-version-4.keiro` (`SettleEntry`, `EntrySettled`, `Settled`),
`corpus/language-version-3.keiro` (`Settled`), and `corpus/transition-implementation-hole.keiro`
(`Settle`, `TicketSettled`). It asserts that no token spelled exactly `Set` exists in those files
and that the `Settle`-family identifiers carry no type scope — under Shiki, that the plain token
containing them has neither `support.type.keiro` nor any `KEYWORDISH_SCOPES` entry, except where an
existing rule legitimately claims the *whole* name (`command Settle` gives `Settle`
`entity.name.type.keiro` from `#decl-with-name`, and that is correct and must stay); under Vim,
`expect_no_group` at the offset of the `S`.

Because the new fixture repeats `Set` six times and both suites' helpers match the *first*
occurrence of a literal, every assertion about a position other than the bare `wire Set Text` line
must pass an anchor phrase.

Acceptance: `bun test` in `packages/shiki-keiro` and `bash packages/keiro-vim/test/run.sh` both
report zero failures with strictly more checks than the baseline (100 pass / 680 expects; 632
checks). Then prove the new blocks bite by deleting `Set` from each package's type list, re-running,
and restoring: both suites must report failures naming the new assertions.


## Concrete Steps

All commands run from `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless stated otherwise.

### Step 0 — re-derive the parser facts

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
  6b92bd52348a763311bcc5a7ddc847e6ef4e4406..01ba6c58f418010c1e2c0edd415f776079deecc1 -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Expected:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs                 |   1 +
 keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs           |   5 +
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs             |   1 +
 keiro-dsl/test/fixtures/structural-text-sets.keiro | 115 +++++++++++++++++++++
 4 files changed, 122 insertions(+)
```

### Step 1 — Milestone 1, spec edits

Edit `spec/keiro-dsl-language-model.md` as described in Plan of Work. Then confirm the word lists
were not disturbed:

```bash
grep -n 'contains exactly \*\*72\*\* words' spec/keiro-dsl-language-model.md
grep -nw 'Set' spec/keiro-dsl-language-model.md
```

### Step 2 — Milestone 2, grammar edits

In `packages/keiro-vim/syntax/keiro.vim`, the `keiroType` line becomes:

```vim
syntax keyword keiroType Bool Int Integer Text Time UTCTime Day Set Id Maybe Natural Json Optional List Map
```

In `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, the `types` rule's `match` becomes:

```json
"match": "(?<![A-Za-z0-9_])(?:Bool|Integer|Int|Text|Time|UTCTime|Day|Set|Id|Maybe|Natural|Json|Optional|List|Map|typeid|text|int|bool)(?![A-Za-z0-9_])"
```

### Step 3 — Milestone 3, corpus

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  01ba6c58f418010c1e2c0edd415f776079deecc1:keiro-dsl/test/fixtures/structural-text-sets.keiro \
  > corpus/mapped-text-sets.keiro
```

Verify it is verbatim:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  01ba6c58f418010c1e2c0edd415f776079deecc1:keiro-dsl/test/fixtures/structural-text-sets.keiro \
  | diff - corpus/mapped-text-sets.keiro && echo VERBATIM
```

Expected: `VERBATIM`.

Then append the provenance entry to `corpus/README.md`.

### Step 4 — Milestone 4, tests and suites

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

```bash
bash /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/keiro-vim/test/run.sh
```

### Step 5 — the sync subject line

The calling automation owns the commit; this plan only writes the subject it should use.

```bash
printf '%s\n' 'feat(syntax): highlight the Set Text structural text-set type' > .keiro-dsl-sync-subject
```


## Validation and Acceptance

**Both suites green.** From the repository root:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

Expected tail: `105 pass`, `0 fail`, `769 expect() calls`.

```bash
bash /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/keiro-vim/test/run.sh
```

Expected tail: `665 checks, 0 failures`.

**The behaviour the plan exists for.** With `packages/keiro-vim` on the Neovim runtime path,
`nvim corpus/mapped-text-sets.keiro` shows, on line 11 (`  wire Set Text`): `wire` as `Statement`
and both `Set` and `Text` as `Type`, reading as one two-word type instead of a plain word followed
by a coloured one. On line 20 (`  wire Optional (Set Text)`): `Optional`, `Set`, and `Text` all as
`Type`, with the parentheses uncoloured. On lines 30 through 34 — the wire fields of
`LabelEnvelope` — `Set Text`, `Optional (Set Text)`, `List (Set Text)`, and `Map (Set Text)` all
render in the type colour, and the reference `MaybeTextLabels` on line 32 stays plain, as every
reference to a declared type does under Vim.

Under Shiki the same file gives every one of those `Set` tokens the scope `support.type.keiro`, and
gives `TextLabels` on line 4 the scope `entity.name.type.keiro` from plan 18's
`#bare-mapped-decl-with-name` rule. A focused probe, which runs the new tests and filters the rest
out:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test --test-name-pattern 'Set'
```

**The non-regression that matters.** `Set` is the head of `Settle`, `Settled`, `SettleEntry`,
`TicketSettled`, and `EntrySettled`, which live in `corpus/language-version-3.keiro`,
`corpus/language-version-4.keiro`, and `corpus/transition-implementation-hole.keiro` — three files
this upstream range never touched. Both suites assert this explicitly, against those files. Vim uses
`expect_no_group` with an offset that lands on the `S` inside each identifier — for example
`expect_no_group('goto Settled', 5)` and `expect_no_group('command SettleEntry', 8)`. Shiki asserts
that no explanation token anywhere in those files has content exactly `Set`, and that the plain
token containing `Settled` carries neither `support.type.keiro` nor any of the `KEYWORDISH_SCOPES`.
The one place a `Settle`-family name *is* coloured stays coloured and is asserted as such: `Settle`
in `command Settle { … }` is `entity.name.type.keiro`, which `#decl-with-name` has given it since
plan 3 and which has nothing to do with the new rule.

**The guards that will not help you.** Section 3 is still 72 words, Section 4 is still 139 bare and
56 dashed, and every one of those guards passed before this plan as well as after it. A type
spelling is invisible to them by construction, and a prefix collision in an *older* corpus file is
invisible even to hand-named assertions over the *new* one. The two blocks added in Milestone 4 are
the only thing standing between a future edit and either a silently uncoloured `Set` or a silently
recoloured `Settled`.


## Idempotence and Recovery

Every step is safe to repeat. The spec, grammar, and test edits are ordinary text edits; re-running
them on an already-edited file is a no-op if done with exact-match replacement, and any accidental
double-application is visible as duplicated prose, a duplicated alternative in a regex (harmless but
ugly), or a duplicated `Set` in the Vim keyword list (also harmless — `syntax keyword` tolerates
repeats). A duplicated JSON key would make `bun test` fail at grammar load rather than silently.

Step 3 rewrites `corpus/mapped-text-sets.keiro` wholesale from upstream, so it is idempotent by
construction; the `diff` check immediately after proves it.

Step 5 uses `>` rather than `>>`, so re-running it replaces the subject line rather than appending a
second one.

Rollback for any milestone is `git checkout -- <path>` on the files it touched, and
`rm corpus/mapped-text-sets.keiro` for the added file. Nothing in this plan runs a migration, writes
outside this repository, or touches the upstream `keiro` checkout — every upstream command above is
a read (`git diff`, `git show`).


## Interfaces and Dependencies

- **`spec/keiro-dsl-language-model.md`** — the contract both packages implement. After Milestone 1
  its Section 3 still holds exactly 72 words and its Section 4 still holds exactly 139 bare and 56
  dashed; the mechanical guards in both suites read these fenced blocks directly, so any accidental
  edit to a word grid fails a named test. Section 6's Primitive-type row is the only place the
  spelling `Set` is normative.
- **`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`** — after Milestone 2 the `types` entry of
  its `repository` object lists `Set` among its alternatives. Its position in the top-level
  `patterns` array is unchanged (between `#constants` and `#scalar-roots`), and no new repository key
  is added.
- **`packages/keiro-vim/syntax/keiro.vim`** — after Milestone 2 its first `syntax keyword keiroType`
  line lists `Set`. The group `keiroType` already links to the standard Vim highlight group `Type` at
  the bottom of the file; no new group and no new link is added.
- **`corpus/mapped-text-sets.keiro`** — a read-only input for both suites, byte-identical to
  `keiro-dsl/test/fixtures/structural-text-sets.keiro` at keiro-dsl `01ba6c58`.
- **`.keiro-dsl-sync-subject`** — a one-line file at the repository root holding the Conventional
  Commits subject the calling automation will use. This plan writes it; it does not commit.
- **Toolchain** — Bun for the Shiki suite (`bun install`, `bun test`; the grammar is loaded through
  `packages/shiki-keiro/src/index.ts`, which reads the JSON), and headless Neovim for the Vim suite
  via `packages/keiro-vim/test/run.sh`. Both are already required by plans 3 and 2 respectively;
  this plan adds no dependency.
- **Upstream** — `mori://shinzui/keiro`, working copy at `/Users/shinzui/Keikaku/bokuno/keiro`,
  read-only for the purposes of this plan.
