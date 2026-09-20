---
id: 21
slug: highlight-the-keiro-dsl-mapped-refined-declaration-family-and-its-base16-bytes-wire-policy
title: "Highlight the keiro-dsl mapped refined declaration family and its base16-bytes wire policy"
kind: exec-plan
created_at: 2026-09-20T05:42:51Z
provenance:
  created_by:
    model: "claude-opus-5"
    harness: "claude-code"
    at: 2026-09-20T05:42:51Z
  revisions:
    - model: "claude-opus-5"
      harness: "claude-code"
      at: 2026-09-20T05:54:33Z
      mode: "implement"
      note: "Implemented all four milestones; both suites green (Shiki 111/0, Vim 693/0)"
---

# Highlight the keiro-dsl mapped refined declaration family and its base16-bytes wire policy

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.
If durable project context changes, update or create ADRs in docs/adr/ in the same change.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter at
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file of
regular expressions that assigns each matched piece of text a dotted *scope name* such as
`storage.modifier.keiro`; editors and Shiki colour text by scope name.) Both are driven by one
written contract, `spec/keiro-dsl-language-model.md`, which this repository keeps in step with the
upstream parser for the language, keiro-dsl, in the separate `keiro` repository (canonical project
URI `mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`e548fffd21f385321c7d5e42c1cbb020243c1e2b` (short form `e548fffd`, subject
*feat(dsl): add checked base16 byte refinements*), the head of the two-commit range
`01ba6c58f418010c1e2c0edd415f776079deecc1..e548fffd21f385321c7d5e42c1cbb020243c1e2b`. The other
commit in the range, `1a16e386` (*docs(plan): complete structural text set rollout*), touches only
upstream documentation. Only the head commit touches the parser.

The range gives the language a **fourth `mapped` declaration family**. Until now a `.keiro` file
could declare a consumer-owned type in three ways — `mapped structural …` (describe the wire
encoding field by field), `mapped opaque …` (name an existing codec by id and version), and
`mapped nominal …` (give a scalar its own identity). The new fourth way is
`mapped refined <Name> { … }`, which hands admission and canonicalization of the value to a
**keiro-owned policy**: keiro itself decides which byte strings are accepted and how they are
written back out, and the consumer supplies only the Haskell binding. Exactly one policy exists
today and it is named by a two-segment word after `wire`:

```text
mapped refined ContentHash {
  haskell package=keiro-dsl module=Conformance.RefinedBase16.Domain type=ContentHash
  binding = "Conformance.RefinedBase16.Bindings.contentHashBinding"
  binding-version = "1"
  canonical-type = "conformance.refined-base16.ContentHash.v1"
  fixtures = "Conformance.RefinedBase16.Bindings.contentHashFixtures"
  initial = "Conformance.RefinedBase16.Bindings.initialContentHash"
  wire base16-bytes
}
```

So the range costs **two new words**: the bare family word `refined`, and the dashed clause value
`base16-bytes`. Neither is in the parser's reserved-word list, so both belong in Section 4 of the
spec, which is the curated list of words the parser recognises in context without reserving.

Before this plan both packages leave both words **plain, uncoloured text**, while colouring every
word around them. The declaration head renders as a coloured `mapped`, a plain `refined`, and a
plain `ContentHash` — where the three sibling families all render as a coloured `mapped`, a
coloured family word, and a coloured type name. The `wire base16-bytes` line renders as a coloured
`wire` followed by plain text, where the sibling `wire tagged-object …` line renders both words
coloured. Those two defects are what this plan fixes.

After this plan:

- `spec/keiro-dsl-language-model.md` lists `refined` in Section 4's bare word grid (139 words to
  140) and `base16-bytes` in its dashed grid (56 to 57), describes the fourth family in the
  mapped-type subsection, and classifies `refined` as a **Modifier** and `base16-bytes` as a
  **Control / section keyword** in Section 6's taxonomy. Section 3 — the verbatim copy of the
  parser's `reservedWords` — is unchanged at 72 words, because the parser's
  `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` is untouched by the range.
- `packages/keiro-vim/syntax/keiro.vim` and
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` both colour `refined` as a modifier
  everywhere it appears and `base16-bytes` as a control keyword in one whole token, and both treat
  `refined X` as a declaration-site type name the way they already treat `nominal X` and
  `opaque X`.
- `corpus/mapped-refined-base16.keiro` is upstream's own checked fixture for the feature, and both
  packages' test suites tokenize it by name and assert every position the two new words occupy.
- Both suites also assert the non-regressions these two particular words need: the capitalised
  module-path component `RefinedBase16` in an *unquoted* slot must stay plain (the rules are
  case-sensitive), the `refined` inside the quoted `"refined-base16-v1"` must stay String (the
  string rule wins), and `base16-bytes` must be claimed as **one** token rather than as a bare
  head plus an uncoloured tail.


## Progress

- [x] (2026-09-20 05:35Z) Read the parser diff for the whole range. Four files under the watched
  paths, 188 insertions: `Grammar.hs` (+19), `Parser/Mapped.hs` (+39), `PrettyPrint.hs` (+15), and
  the new fixture `test/fixtures/refined-base16.keiro` (+115).
- [x] (2026-09-20 05:36Z) Confirmed `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`, which owns
  `reservedWords`, is absent from the range's file list, so Section 3 of the spec stays at exactly
  72 words.
- [x] (2026-09-20 05:37Z) Confirmed the change *is* lexical: `refined` and `base16-bytes` are two
  spellings neither package matches today.
- [x] (2026-09-20 05:38Z) Grepped the whole corpus for both spellings as substrings —
  `grep -rni 'refine' corpus/`, `grep -rn 'base16' corpus/`, `grep -rn 'bytes' corpus/` — and found
  nothing. Unlike `Set` in plan 20, neither word collides with text already in the tree.
- [x] (2026-09-20 05:40Z) Recorded the pre-change baselines both suites must beat: Shiki
  `105 pass / 0 fail / 769 expect() calls`, Vim `665 checks, 0 failures`.
- [x] (2026-09-20 05:55Z) Milestone 1: `spec/keiro-dsl-language-model.md` Sections 1, 4, and 6
  updated. Bare grid 139 → 140 (`refined`), dashed grid 56 → 57 (`base16-bytes`), Section 3
  untouched at 72.
- [x] (2026-09-20 06:05Z) Milestone 2: both grammars teach the two words, and the count guards in
  both suites moved to 140 / 57. Both suites green again: Shiki `105 pass / 0 fail / 769 expect()
  calls` (unchanged, as expected — no new named assertion yet), Vim `667 checks, 0 failures`, two
  checks up because `expect_all_keywordish` probes each grid word and the grids gained two.
- [x] (2026-09-20 06:10Z) Milestone 3: `corpus/mapped-refined-base16.keiro` copied verbatim from
  upstream (`diff` clean) and recorded in `corpus/README.md`.
- [x] (2026-09-20 06:30Z) Milestone 4: assertion blocks added to both suites over the new sample.
  Shiki `111 pass / 0 fail / 830 expect() calls`; Vim `693 checks, 0 failures`.
- [x] (2026-09-20 06:40Z) Proved the new assertions bite by removing each word from each package in
  turn and re-running; every probe file restored immediately afterwards. Shiki without `refined`:
  `108 pass / 3 fail`. Shiki without `base16-bytes`: `109 pass / 2 fail`. Vim without `refined`:
  `693 checks, 3 failures`. Vim without `base16-bytes`: `693 checks, 2 failures`.
- [x] (2026-09-20 06:45Z) Wrote the Conventional Commits subject to `.keiro-dsl-sync-subject`.


## Surprises & Discoveries

- Observation: this is the **first range since plan 17 to move Section 4's word counts**, and
  therefore the first since then in which the spec edit alone makes both suites red. Plans 18, 19,
  and 20 all added spellings that live only in Section 6 (a shape word already in the grid, then
  two type spellings, which the grids never carry), so the mechanical guards never noticed them.
  Here the guards are the *first* thing to notice: editing the grids without touching the grammars
  fails four named tests — two count guards and two classification guards. That is the guards
  working as designed, and it is why Milestone 2 bundles the two-constant bump in the test files
  with the grammar edits rather than deferring it to Milestone 4.
  Evidence: with Milestone 1 applied and Milestone 2 not, Shiki reports
  `expect(received).toBe(expected) // 140 != 139` from
  *the spec Section 4 lists 139 bare and 56 dashed contextual keywords* and
  `[ "refined: [...]", "base16-bytes: split into [...]" ]` from
  *every curated contextual keyword is classified as a keyword by the grammar*.

- Observation: deleting `base16-bytes` from either package does **not** produce the "split token"
  failure a dashed word normally produces; it produces a wholly uncoloured word. The dashed rules
  exist because a bare keyword that is a *prefix* of a dashed one claims the head and leaves the
  tail plain — `on-ok` degrading to a coloured `on` plus a grey `-ok`. `base16` is not a keyword, so
  there is no head to claim. Evidence: with the entry removed from `#dashed-keywords`, the Shiki
  classification guard reports `base16-bytes: ["source.keiro"]` rather than a split, and with the
  `syntax match` removed, the Vim suite reports
  `want keiroStatement on every character, got (none) at offset 0`. This is the same fact as the
  observation below, seen from the failure side.

- Observation: `base16-bytes` is only the **second** dashed word in the language whose leading
  segment is not itself a keyword — `keiro-dsl` was the first. That matters because Section 4's
  implementer note says a dashed word generally needs its bare head declared as a guarded
  `syntax match … /\<word\>-\@!/` in Vim, and neither `base16` nor `bytes` is a word either package
  knows, so `base16-bytes` needs no guard and no reordering. It needs only to *be* in the dashed
  rule, so the whole spelling is claimed as one token instead of falling through as plain text.
  Section 4's sentence naming `keiro-dsl` as "the one entry" had to be reworded to name both.

- Observation: the digits inside `base16-bytes` are harmless to every number rule in both packages,
  and the reason is worth writing down because it is not obvious. Both packages require a word
  boundary before a numeric literal — Vim's `\<\d\+\>` and the TextMate `\b[0-9]+\b` — and in
  `base16` the `1` is preceded by `e`, which is a word character, so no boundary exists there.
  A number rule written without that boundary would split the dashed word into `base`, `16`, and
  `-bytes`, and the `expect_all_keywordish` / `classifyFailures` guards in the two suites would
  both report it as a split. This is the first keyword in the language to contain a digit at all.
  Evidence: `packages/keiro-vim/syntax/keiro.vim` declares `syntax match keiroNumber /\<\d\+\>/`
  and `/\<\d\+\a\+\>/`; `#numbers` in the TextMate grammar declares `\b[0-9]+\b` and
  `\b[0-9]+[a-zA-Z]+\b`.

- Observation: the new fixture exercises **case sensitivity in an unquoted slot** more sharply than
  any earlier sample. Its Haskell source line reads
  `haskell package=keiro-dsl module=Conformance.RefinedBase16.Domain type=ContentHash`, which is
  not a string literal, so no string rule protects it — and it contains both new spellings in
  capitalised form, `Refined` and `Base16`, inside one identifier. Both packages match
  case-sensitively (Vim's `syntax keyword` is case-sensitive by default; Oniguruma is
  case-sensitive), so nothing there is claimed. The same line is also where the dashed keyword
  `keiro-dsl` is coloured as a control keyword inside `package=keiro-dsl`, which is long-standing
  behaviour shared by every mapped fixture in the corpus.

- Observation: the fixture's own context name is `context refined-base16` — a user-chosen wire word
  whose first segment is spelled exactly like the new family word — and **both packages colour that
  segment**. `-` is not a word character in either engine, so `refined` there is a whole word and
  the modifier rule claims it while `-base16` stays plain. This is not a regression and not
  something `refined` introduced: plan 20 recorded exactly the same behaviour for `structural` and
  `text` inside `context structural-text-sets`, and the same thing happens to every dashed wire word
  in the corpus. It is recorded here because a first draft of either test block is likely to assert
  the segment is plain and fail for the wrong reason.

- Observation: `refined` is a *family* word, so it needed the same two-part treatment `nominal` and
  `opaque` have and that a pure keyword list does not provide: in the TextMate grammar it goes into
  the `#mapped-decl-with-name` rule (which claims the word **and** the CamelCase name after it) as
  well as into `#modifiers`. Adding it only to `#modifiers` leaves `ContentHash` plain, because the
  modifier rule ends the match at the word and the scan resumes after it with no rule that claims a
  bare identifier. In the Vim package the corresponding `keiroTypeName` rule has been inert since it
  was written — Vim's `syntax keyword` outranks a `syntax match` beginning at the same column, so
  the pattern can never start where it has to — and Section 6 marks that class an optional
  refinement, so `refined` is added to the rule for parity and the Vim suite asserts the name stays
  plain, exactly as it does for `nominal X` today.

- Observation: `packages/keiro-vim/test/run.sh` is executable and carries a valid
  `#!/usr/bin/env bash` shebang, but invoking it as `./packages/keiro-vim/test/run.sh` in this
  environment fails with `No such file or directory` — the sandboxed shell cannot resolve `bash`
  through `env`. Invoking it as `bash /absolute/path/to/run.sh` works. This matches what plans 19
  and 20 recorded; it is an environment quirk, not a repository defect, and no file was changed for
  it.


## Decision Log

- Decision: Classify `refined` as a **Modifier** (`storage.modifier.keiro` under Shiki,
  `StorageClass` under Vim), joining `structural`, `opaque`, and `nominal`.
  Rationale: Section 6 classifies by role, and this word's role is identical to theirs —
  `pMappedTopItem` in `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` reads `keyword "mapped"` and then
  chooses between four alternatives, of which `refined` is the third. It qualifies the declaration
  `mapped` introduces rather than introducing one. Unlike `value` (plan 18), `refined` has no second
  role anywhere in the language, so there is no competing older site to preserve and no reason to
  break the family's consistency.
  Date: 2026-09-20

- Decision: Classify `base16-bytes` as a **Control / section keyword**
  (`keyword.control.keiro` under Shiki, `Statement` under Vim), matched with the dashed rules.
  Rationale: it is a fixed enumerated clause value read by `keyword "base16-bytes"` immediately
  after `keyword "wire"`, which is exactly the position and exactly the parser shape of
  `tagged-object` in `wire tagged-object tag=… contents=…`. `tagged-object` is a Control keyword and
  has been since plan 8. Section 4's dashed grid is the home for such values, and Section 6's
  Control row already collects the mapped-type vocabulary they belong to.
  Date: 2026-09-20

- Decision: Do **not** give `base16-bytes` a bare-head guard in either package, and do not add
  `base16` or `bytes` to any word list.
  Rationale: the `-\@!` guard Section 4 describes exists to stop a bare *keyword* from claiming the
  head of a dashed keyword and leaving the tail plain. Neither `base16` nor `bytes` is a keyword in
  this language, so there is nothing to guard against — the same situation `keiro-dsl` has been in
  since the version preamble arrived. Adding the guard anyway would be a rule with no behaviour.
  Date: 2026-09-20

- Decision: Do **not** gate either word on the declared language version, even though the parser
  does (`languageFeatureKeyword context RefinedBase16Syntax "refined"` raises a
  `LanguageFeatureRequiresVersion` diagnostic in a source declaring `language keiro-dsl 5` or
  earlier).
  Rationale: Section 1 of `spec/keiro-dsl-language-model.md` has carried this standing rule since
  the version preamble arrived — highlighting is purely lexical, a version gate is a parser concern,
  and a file opening `language keiro-dsl 1` that uses a Language 6 word colours exactly as it would
  under a `6`. Every gated word added by plans 17 through 20 was handled the same way.
  Date: 2026-09-20

- Decision: Bump the two Section 4 count constants in both test suites (139 → 140, 56 → 57) as part
  of **Milestone 2**, not Milestone 4.
  Rationale: this is the first range since plan 17 that moves those counts, so unlike the three
  preceding plans the spec edit alone leaves both suites red. Pairing the constant bump with the
  grammar edits means every milestone ends with both suites green, which is what makes a milestone
  independently verifiable. The new *named* assertions still belong in Milestone 4, after the corpus
  sample they read exists.
  Date: 2026-09-20

- Decision: Copy upstream's `keiro-dsl/test/fixtures/refined-base16.keiro` **verbatim** into the
  corpus rather than hand-writing a sample.
  Rationale: `corpus/README.md`'s provenance rules prefer verbatim upstream fixtures, and this one
  is upstream's authoritative fixture for the feature — `keiro-dsl/test/Main.hs` reads it with
  `readTestText`, parses it with `checkedServiceFromText`, round-trips it through the pretty-printer
  (`parseSource … (renderSource parsed) shouldBe Right parsed`), scaffolds generated modules from
  it, asserts the runtime profile carries `RefinedBase16Mappings`, and asserts that the same text
  under a `language keiro-dsl 5` preamble is refused. A verbatim copy therefore proves both packages
  tokenize text that really is valid keiro-dsl, and it places the new declaration beside a
  `mapped structural value`, a `mapped structural record`, an aggregate, a workqueue, a projection
  catalog, and a readmodel in one file.
  Date: 2026-09-20

- Decision: Name the corpus file `mapped-refined-base16.keiro` rather than repeating upstream's
  `refined-base16.keiro`.
  Rationale: the corpus names files after the surface they exercise and groups the mapped-type
  samples under a `mapped-` prefix — `mapped-type-spellings.keiro`, `mapped-calendar-days.keiro`,
  `mapped-text-sets.keiro`. Upstream's bare name would sort away from its three siblings and would
  not say that the file is about a `mapped` declaration.
  Date: 2026-09-20


## Outcomes & Retrospective

All four milestones are complete and both suites are green: Shiki
`111 pass / 0 fail / 830 expect() calls` (up from 105 / 0 / 769 before), Vim
`693 checks, 0 failures` (up from 665).

Every new assertion was proved to bite. Removing `refined` from the Shiki `#modifiers` alternation
and from `#mapped-decl-with-name` gives `108 pass / 3 fail`, naming the declaration-head block, the
context-wire-word block, and the classification guard over Section 4's grid; removing it from the
Vim `keiroModifier` keyword list gives `693 checks, 3 failures`, two of them reporting
`want keiroModifier on every character, got (none)`. Removing `base16-bytes` from the Shiki
`#dashed-keywords` alternation gives `109 pass / 2 fail` with the classification guard reporting
`base16-bytes: ["source.keiro"]` — the clause value falling through as plain text, printed as a test
failure — and removing it from the Vim dashed matches gives `693 checks, 2 failures`. Every probe
file was restored immediately afterwards.

One expectation written into this plan before implementation turned out to be wrong, and the
correction is worth keeping. The plan predicted that deleting `base16-bytes` would make the suites
report a *split* token (`["base16","-","bytes"]`), by analogy with `on-ok` degrading to `on` plus a
plain `-ok`. It does not: `base16` and `bytes` are not keywords in either package, so with the
dashed entry gone nothing matches any part of the word and it falls through entirely plain. That is
the same fact Section 4 now records — this is one of only two dashed words whose leading segment is
not itself a keyword — seen from the failure side.

Against the original purpose:

- **The spec records both new words.** Section 1 records `RefinedBase16Syntax` as version 6's fourth
  late feature; Section 4's bare grid holds 140 words and its dashed grid 57; the mapped-type
  subsection describes a fourth family and says which of its clause labels are borrowed rather than
  new; Section 6's Modifier row names `refined`, its Control row names `base16-bytes`, and its
  Declaration-site-type-name row names `refined X`. Section 3 is still exactly 72 words, which the
  mechanical guard in both suites confirms.
- **Both highlighters agree with it.** `refined` is `storage.modifier.keiro` under Shiki and
  `keiroModifier` under Vim; `base16-bytes` is `keyword.control.keiro` and `keiroStatement`, in one
  whole token under both; `ContentHash` after `refined` is `entity.name.type.keiro` under Shiki and
  plain under Vim, exactly as `nominal X` already is.
- **The corpus exercises it.** `corpus/mapped-refined-base16.keiro` is byte-identical to upstream's
  checked fixture and both suites tokenize it by name.

What went differently than planned: the count guards, not the hand-written assertions, were the
first thing to notice this range. Three plans in a row had added spellings the grids cannot see, and
the reflex those built — "edit the spec, then the grammars, then the tests" — leaves the tree red in
the middle here. Bundling the constant bump with the grammar edits fixed that, and the Decision Log
records why. The second difference is smaller: `base16-bytes` is the first keyword in the language
to contain a digit, which made the number rules worth re-reading before trusting them; they turned
out to be safe for the reason recorded under Surprises.

Durable context worth keeping, and now recorded in Section 4 of the spec: **`base16-bytes` joins
`keiro-dsl` as a dashed keyword whose leading segment is not itself a keyword**, so the `-\@!`
guard discipline that governs `on-ok`, `binding-version`, and their kin does not apply to it. There
is no `docs/adr/` directory in this repository and this plan does not create one.


## Context and Orientation

**There are no ADRs in this repository.** `docs/` contains only `docs/plans/` and
`docs/masterplans/`; there is no `docs/adr/` directory, so no ADR is cited here and none is created
by this plan. Durable context for this repository lives in `spec/keiro-dsl-language-model.md` and in
the numbered plans under `docs/plans/`. (The upstream `keiro` repository does have ADRs, and
`e548fffd` touches `docs/adr/log.md` and several ADR files there; none of them is about lexical
surface, and this plan does not depend on them.)

### The four artifacts this repository keeps in agreement

1. `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 3 is a **verbatim copy**
   of the upstream parser's `reservedWords` list (72 words, unchanged by this range); Section 4 is a
   *curated* list of words the parser recognises in context but does not reserve (139 bare and 56
   dashed before this plan, 140 and 57 after); Section 6 is the token-class taxonomy that says which
   bucket each word lands in and which TextMate scope / Vim highlight group each bucket maps to.
2. `packages/keiro-vim/syntax/keiro.vim` — a Vim syntax file. It declares `syntax keyword` and
   `syntax match` rules and links each `keiro*` group to a standard Vim highlight group at the
   bottom of the file. The `mapped` family words live on a `syntax keyword keiroModifier …` line
   around line 78; the dashed control words live on a block of `syntax match keiroStatement …` lines
   around lines 135-150.
3. `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar. Its top-level
   `patterns` array fixes rule precedence: at a given position, the first listed rule that matches
   wins. The `mapped` family words are in the `modifiers` entry of the `repository` object and — for
   the three that are followed by a type name — also in `mapped-decl-with-name`, which is listed
   *before* `modifiers` so it wins the same-position tie and can claim both tokens. The dashed
   control words are the `dashed-keywords` entry, listed fourth overall, before every bare-word
   rule and before `numbers`.
4. `corpus/*.keiro` — read-only `.keiro` sample files both test suites load and assert against.
   `corpus/README.md` records where each file came from and what it is for. The rule at the bottom
   of that file says corpus files are read-only inputs; a file added here must be added whole, not
   grafted onto an existing sample.

### What the upstream range changes

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
  01ba6c58f418010c1e2c0edd415f776079deecc1..e548fffd21f385321c7d5e42c1cbb020243c1e2b -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Four files, 188 insertions:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs           |  19 +++++
 keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs     |  39 +++++++++
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs       |  15 ++++
 keiro-dsl/test/fixtures/refined-base16.keiro | 115 +++++++++++++++++++++++++++
 4 files changed, 188 insertions(+)
```

- `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` (+39) — the only parser change in the range. Two new
  productions and one new clause constructor. `pMappedTopItem` — which reads `keyword "mapped"` and
  then picks a family — gains a third alternative, `SurfaceMapped <$> pMappedRefined context loc`,
  between the `structural` and `opaque` branches. The new production reads:

  ```haskell
  pMappedRefined :: FrontendContext -> Loc -> P MappedDecl
  pMappedRefined context loc = do
    languageFeatureKeyword context RefinedBase16Syntax "refined"
    name <- ident
    clauses <- braces (many pRefinedClause)
    …
    policy <- requiredClause "wire" (\case MCRefinedPolicy value -> Just value; _ -> Nothing) clauses
  ```

  and its clause parser is a `choice` over rules the older families already used —
  `pHaskellSource` for the `haskell package=… module=… type=…` line and `pQuotedFact` for
  `binding`, `binding-version`, `canonical-type`, `fixtures`, and `initial` — plus one new
  alternative:

  ```haskell
  MCRefinedPolicy Base16BytesV1 <$ (keyword "wire" *> keyword "base16-bytes")
  ```

  So the whole feature costs exactly two spellings. `languageFeatureKeyword` is the same helper the
  Language 5 and 6 words use: it matches the literal and then fails with a
  `LanguageFeatureRequiresVersion` diagnostic if the source's declared version does not own the
  feature. `keyword` is defined in `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` as
  `(lexeme . try) (chunk w *> notFollowedBy (identChar <|> (char '-' *> identChar)))` — a literal
  match that must not be followed by an identifier character, which is exactly the whole-word,
  case-sensitive behaviour both packages must reproduce.
- `keiro-dsl/src/Keiro/Dsl/Grammar.hs` (+19) — a new sum `RefinedWirePolicy` with the single
  constructor `Base16BytesV1`, a new `MappedShape` constructor `ShapeRefined`, and a new
  `MappedDecl` constructor `MappedRefined` carrying the same six optional facts the other families
  carry plus the policy. None of this is a spelling.
- `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (+15) — `docMapped MappedRefined{…}` renders the
  declaration back out as `mapped refined <Name> { … wire base16-bytes }`, and
  `docRefinedWirePolicy Base16BytesV1 = "base16-bytes"`. This is the authority for the surface
  spelling: those two words, with no alias and no second policy.
- `keiro-dsl/test/fixtures/refined-base16.keiro` (+115) — upstream's new fixture, copied into this
  repository by Milestone 3.

`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` (outside the paths above, but worth naming) adds the
`LanguageFeature` value `RefinedBase16Syntax` to syntax profile `keiro-dsl/syntax-profile/5` — which
is language version **6**, the candidate contract — and the `RuntimeCapability` value
`RefinedBase16Mappings` to `keiro-dsl/runtime-semantics/5`. The released-version registry still
holds six versions; no version is added.

Prove that the reserved word list did not move — `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` owns it,
and the file is absent from the diffstat above:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --name-only \
  01ba6c58f418010c1e2c0edd415f776079deecc1..e548fffd21f385321c7d5e42c1cbb020243c1e2b -- \
  keiro-dsl/src/Keiro/Dsl/Parser/Core.hs
```

Expected: no output.

The other commit in the range, `1a16e386` (*docs(plan): complete structural text set rollout*), is
upstream plan documentation for the *previous* range's text-set feature. It is not lexical.

### Why this one is lexical, when most keiro-dsl commits are not

A new *word* in the language is exactly the kind of change these highlighters exist to track. Both
new words are literals the parser matches with `keyword "…"`; before this plan neither package has
either of them in any rule, so a valid `.keiro` source renders with a coloured `mapped` beside a
plain `refined`, and a coloured `wire` beside a plain `base16-bytes`. Both defects are visible in
one screenshot of one file.

### Where the two words can appear

`refined` appears in exactly one position: immediately after the reserved word `mapped`, as the
third of four family alternatives in `pMappedTopItem`. `base16-bytes` appears in exactly one
position: immediately after `wire`, inside a `mapped refined` block. Neither package models either
constraint, for the reason Section 1 of the spec gives — a word is a keyword because it is in a
fixed list, not because of where it appears — so both are matched unconditionally and both would be
coloured in a source where the parser rejects them. That is the same harmless over-acceptance both
packages already show for every version-gated word in a version-1 file.

### The collisions these two words have, and do not have

Unlike `Set` in plan 20, neither word collides with anything already in the corpus. Run this before
touching either grammar and expect empty output from all three:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
grep -rni 'refine' corpus/
grep -rn 'base16' corpus/
grep -rn 'bytes' corpus/
```

The collisions arrive *with the new fixture*, and all three are inside it:

- `context refined-base16` on line 2 — a user-chosen wire word whose first segment is spelled
  exactly like the family word. Both packages colour that segment and leave `-base16` plain,
  because `-` is not a word character in either engine. This is the same long-standing behaviour
  plan 20 recorded for `structural` inside `context structural-text-sets`; it is not a defect and
  neither suite should assert the segment is plain.
- `module=Conformance.RefinedBase16.Domain` — an **unquoted** slot containing both spellings in
  capitalised form. Nothing may claim them, and what keeps them safe is case sensitivity, which both
  packages already have (Vim's `syntax keyword` is case-sensitive by default; Oniguruma is
  case-sensitive).
- `shape-hash="refined-base16-v1"` — the lowercase family word inside a **string literal**. The
  string rule wins in both packages (Vim's `keiroString` region admits only `keiroStringEscape`;
  the TextMate `#strings` rule is listed second, before every word rule), so the whole literal is
  String. Worth asserting, because it is the only place in the corpus where a keyword spelling sits
  inside a string that is not a comment.

### The test suites

- `packages/shiki-keiro/test/scopes.test.ts` (Bun). Loads each corpus file with `readFileSync` and
  asserts with two helpers: `expectScope(code, content, scope)` finds the first sub-token whose
  trimmed text equals `content` and asserts the scope is present;
  `expectWholeToken(code, content, scope, anchor?)` additionally proves no shorter rule split the
  literal, and its optional `anchor` restricts the search to lines containing a phrase. A file-local
  helper `partsOfLine(code, anchor)` returns every explanation entry of the first line containing a
  phrase, and `allParts(code)` returns every entry in the file. A module-level set
  `KEYWORDISH_SCOPES` lists the scopes that count as "coloured as a keyword", used by the checks that
  prove a token stays plain. At the end of the file are mechanical guards that read Section 3's and
  Section 4's fenced word lists straight out of the spec and assert both the counts and that every
  listed word is classified as *some* kind of keyword, in one whole token.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` under
  headless Neovim. `open(relpath)` loads a corpus file, `expect(phrase, group)` asserts the highlight
  group at the phrase's *first character* on the first line containing the phrase,
  `expect_uniform(word, group, anchor?)` asserts the group on every character of the word, and
  `expect_no_group(phrase, offset)` asserts that the character at `offset` within the phrase has no
  highlight group at all. It carries the same spec word-list guards, via `expect_count` and
  `expect_all_keywordish`.

Run them with:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

```bash
bash /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/keiro-vim/test/run.sh
```

Note the `bash` prefix and absolute path on the second. `packages/keiro-vim/test/run.sh` is marked
executable and carries a `#!/usr/bin/env bash` shebang, but in a sandboxed shell that cannot resolve
`bash` through `env`, invoking it as `./packages/keiro-vim/test/run.sh` fails with the confusing
message `No such file or directory`.

Before this plan they report:

```text
 105 pass
 0 fail
 769 expect() calls
```

```text
665 checks, 0 failures
```


## Plan of Work

Four milestones, in the order the sync workflow requires: the spec first, because it is the contract
the two packages implement; then the two highlighters, together with the two count constants the
spec edit moved; then the corpus sample; then the tests that pin the new behaviour.

### Milestone 1 — correct the spec

Scope: `spec/keiro-dsl-language-model.md` only. At the end of this milestone the spec names both new
words, puts them in the right grids, describes the fourth `mapped` family, and classifies both words
in Section 6. Section 3 is untouched.

Six edits:

1. **Section 1**, immediately after the paragraph beginning "**Version 6 has since gained a third
   late feature, and it costs one word in the same place.**", add a paragraph recording that
   keiro-dsl `e548fffd` added a *fourth* late feature to version 6's syntax profile,
   `RefinedBase16Syntax`, together with the runtime capability `RefinedBase16Mappings`; that it is
   the **checked base16 byte refinement**, a fourth `mapped` family written
   `mapped refined X { … wire base16-bytes }`; that unlike the three features before it this one
   costs two words and *both* are clause vocabulary rather than type vocabulary, so Section 4 moves
   from 139 bare and 56 dashed to 140 and 57 while Section 3 stays at 72; and that
   `corpus/mapped-refined-base16.keiro` is the sample both packages tokenize.
2. **Section 4's bare grid**: add `refined` as a new final row of its own. Keeping it on its own row
   rather than appending it to the `ack idempotence delegated` row preserves the truth of the
   sentence below the grid that reads "The seven rows after `using` — `reset` through `delegated`,
   39 words — are the **Language 5 and 6 surface**". Add a sentence after that one naming `refined`
   as the newest arrival and pointing at the mapped-type subsection.
3. **Section 4's dashed grid**: add `base16-bytes` as a new final row of its own, for the same
   reason. Then reword the two sentences below the grid that currently begin "The last five rows —
   `rebuild-group` through `max-recipients`" and "The last five — `binding-version` through
   `unknown-fields`" so they identify their words by name rather than by row position, and add a
   sentence naming `base16-bytes` as the newest arrival. Finally, reword the paragraph that begins
   "`keiro-dsl` is the one entry in the dashed list whose leading segment is **not** a keyword at
   all" so it names both `keiro-dsl` and `base16-bytes`, and says the same conclusion follows for
   both: neither needs the `-\@!` treatment, only membership in the dashed rule.
4. **Section 4, the mapped type declaration subsection**: change the opening sentence's count from
   "28 of this section's curated words — 23 bare and 5 dashed" to "30 … — 24 bare and 6 dashed";
   change "There are three families" to four and add the new one to the sentence that follows;
   describe the family and show the worked example from the Purpose section above; and add a fact
   bullet recording that the block's six other clause labels are all **borrowed** from the older
   families (`haskell`, `binding`, `binding-version`, `canonical-type`, `fixtures`, `initial`), that
   `wire` is reserved and already headed the braced form, and that `base16-bytes` is therefore the
   only new word inside the braces.
5. **Section 4**, in the bullet that begins "**`structural`, `opaque`, `nominal`, `record`, `union`,
   and the field-level `optional` are Modifiers**": add `refined` to the list and to the parenthetical
   that explains why, naming keiro-dsl `e548fffd`.
6. **Section 6**: add `refined` to the Modifier row beside `structural`, `opaque`, and `nominal`;
   add `base16-bytes` to the Control row's mapped-type vocabulary beside `tagged-object`, noting it
   is the second dashed word whose leading segment is not a keyword; and add `refined X` to the
   Declaration-site-type-name row's list of `mapped` family and shape words.

Acceptance: `grep -nw 'refined' spec/keiro-dsl-language-model.md` returns matches in Sections 1, 4,
and 6, and `grep -n 'base16-bytes' spec/keiro-dsl-language-model.md` likewise. Both suites now fail,
by name, on four tests — the two Section 4 count guards and the two classification guards — and on
nothing else. That failure is expected and is fixed by Milestone 2.

### Milestone 2 — teach both highlighters the two words, and move the count constants

Scope: `packages/keiro-vim/syntax/keiro.vim`,
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, and the two count constants in
`packages/shiki-keiro/test/scopes.test.ts` and `packages/keiro-vim/test/highlight_spec.lua`.

In the Vim file, add `refined` to the `syntax keyword keiroModifier structural opaque nominal record
union optional` line and extend its comment to name the fourth family and keiro-dsl `e548fffd`; add
`refined` to the `keiroTypeName` match's alternation, beside `nominal` and `value`, noting in the
comment already there that the rule is inert; and add a
`syntax match keiroStatement /\<\%(base16-bytes\)\>/` line to the dashed block with a comment saying
it is the second dashed word whose leading segment is not a keyword, so it needs no `-\@!` partner.

In the TextMate grammar, add `refined` to the `modifiers` alternation and to the
`mapped-decl-with-name` alternation `(record|union|opaque|nominal)`, extending both `comment`
strings; and add `base16-bytes` to the `dashed-keywords` alternation, extending that rule's
`comment` the same way. Position within each alternation is free: `refined` is neither a prefix nor
a suffix of any other alternative in its two rules, and neither is `base16-bytes` in its one.

Then change `139` to `140` and `56` to `57` in both suites' count guards — the test named
*the spec Section 4 lists 139 bare and 56 dashed contextual keywords* in the Shiki suite, and the
two `expect_count('bare contextual-keyword', …)` / `expect_count('dashed contextual-keyword', …)`
calls in the Vim suite — renaming the Shiki test and extending both files' explanatory comments to
record that keiro-dsl `e548fffd` moved 139 → 140 and 56 → 57 by adding `refined` and `base16-bytes`.

Acceptance: both suites are green again — Shiki at the baseline `105 pass / 769 expects`, Vim at
`667 checks`, two above the baseline because `expect_all_keywordish` probes every grid word and the
grids gained two. Nothing asserts the new behaviour by name yet, but the mechanical guards now cover
both words: each is probed in a one-word document and must come back as one whole token carrying a
keyword class.

### Milestone 3 — add the corpus sample

Scope: `corpus/mapped-refined-base16.keiro` (new, verbatim from upstream) and `corpus/README.md` (a
provenance entry appended to the "Copied later" list, after the `mapped-text-sets.keiro` entry).

Acceptance: the new file is byte-identical to upstream's
`keiro-dsl/test/fixtures/refined-base16.keiro` at `e548fffd`, provable with `diff`, and both suites
are still green.

### Milestone 4 — assert the sample in both suites and run them green

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`.

Each suite gains three blocks.

The first asserts the **declaration head**: in `mapped refined ContentHash {`, `mapped` is a
declaration introducer, `refined` is a modifier on every one of its seven characters, and the name
after it is a declaration-site type name under Shiki (`entity.name.type.keiro`) and plain under Vim
— the same asymmetry `nominal X` already shows, because the Vim `keiroTypeName` rule is inert.

The second asserts the **wire policy line**: on `wire base16-bytes`, `wire` keeps its control class
and `base16-bytes` is claimed as one whole token with the control class on every one of its twelve
characters. The whole-token form is the assertion that matters: a rule that matched only the head
would leave `-bytes` plain and a first-character check would pass anyway.

The third is the **non-regression block**, and it reads three lines of the new file: the unquoted
`module=Conformance.RefinedBase16.Domain`, where neither capitalised spelling may be claimed and the
whole path component must stay plain; the quoted `shape-hash="refined-base16-v1"`, where the
lowercase family word must be String and not a modifier; and `context refined-base16`, where the
suites assert the *second* segment (`base16`) is plain — deliberately not the first, which both
packages colour for the long-standing reason recorded under Surprises.

Each suite also gains a short "the rest of the file still tokenizes" block over the sibling
declarations and nodes in the same file — the `mapped structural value MaybeContentHash` head, the
`mapped structural record HashEnvelope` head, the borrowed clause labels `haskell`,
`binding-version`, `canonical-type`, `unknown-fields`, and the `aggregate`, `workqueue`,
`rebuild-group`, `projection-owner`, and `readmodel` beneath them.

Because the new fixture repeats `refined` three times (the context name, the declaration head, and
the string literal) and both suites' helpers match the *first* occurrence of a literal, every
assertion about a position other than the context name must pass an anchor phrase.

Acceptance: `bun test` in `packages/shiki-keiro` and `bash packages/keiro-vim/test/run.sh` both
report zero failures with strictly more checks than the baseline (105 pass / 769 expects; 665
checks) — in the event, `111 pass / 830 expects` and `693 checks`. Then prove the new blocks bite by
deleting each word from each package's rules in turn, re-running, and restoring: both suites must
report failures naming the new assertions.

Restore a probe with a copy taken beforehand (`cp <file> /tmp/<file>.bak`), **not** with
`git checkout -- <file>`. Nothing in this plan is committed while it is being implemented, so a
`git checkout` restores the file to the pre-plan HEAD and silently discards the Milestone 2 edits
along with the probe.


## Concrete Steps

All commands run from `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless stated otherwise.

### Step 0 — re-derive the parser facts

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
  01ba6c58f418010c1e2c0edd415f776079deecc1..e548fffd21f385321c7d5e42c1cbb020243c1e2b -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Expected:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs           |  19 +++++
 keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs     |  39 +++++++++
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs       |  15 ++++
 keiro-dsl/test/fixtures/refined-base16.keiro | 115 +++++++++++++++++++++++++++
 4 files changed, 188 insertions(+)
```

### Step 1 — Milestone 1, spec edits

Edit `spec/keiro-dsl-language-model.md` as described in Plan of Work, then confirm the grids moved
and Section 3 did not:

```bash
grep -n 'contains exactly \*\*72\*\* words' spec/keiro-dsl-language-model.md
grep -nw 'refined' spec/keiro-dsl-language-model.md
grep -n 'base16-bytes' spec/keiro-dsl-language-model.md
```

### Step 2 — Milestone 2, grammar edits and count constants

In `packages/keiro-vim/syntax/keiro.vim`, the family-word line becomes:

```vim
syntax keyword keiroModifier structural opaque nominal refined record union optional
```

and a new dashed match joins the block above the `-\@!` guards:

```vim
syntax match keiroStatement /\<\%(base16-bytes\)\>/
```

In `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, the `mapped-decl-with-name` match becomes:

```json
"match": "(?<![A-Za-z0-9_-])(record|union|opaque|nominal|refined)(?![A-Za-z0-9_-])\\s+([A-Za-z_][A-Za-z0-9_]*)"
```

`refined` joins the `modifiers` alternation after `nominal`, and `base16-bytes` joins the
`dashed-keywords` alternation after `tagged-object`.

Then move the count constants in both suites from `139` / `56` to `140` / `57`.

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

```bash
bash /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/keiro-vim/test/run.sh
```

Expected: the same totals as the baseline, with zero failures.

### Step 3 — Milestone 3, corpus

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  e548fffd21f385321c7d5e42c1cbb020243c1e2b:keiro-dsl/test/fixtures/refined-base16.keiro \
  > corpus/mapped-refined-base16.keiro
```

Verify it is verbatim:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  e548fffd21f385321c7d5e42c1cbb020243c1e2b:keiro-dsl/test/fixtures/refined-base16.keiro \
  | diff - corpus/mapped-refined-base16.keiro && echo VERBATIM
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
printf '%s\n' 'feat(syntax): highlight the mapped refined family and its base16-bytes wire policy' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

**Both suites green.** From the repository root:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

Expected tail: `111 pass`, `0 fail`, `830 expect() calls`.

```bash
bash /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/keiro-vim/test/run.sh
```

Expected tail: `693 checks, 0 failures`.

**The behaviour the plan exists for.** With `packages/keiro-vim` on the Neovim runtime path,
`nvim corpus/mapped-refined-base16.keiro` shows, on line 4 (`mapped refined ContentHash {`):
`mapped` as `Keyword` and `refined` as `StorageClass`, so the head reads the way
`mapped nominal AccountNumber` and `mapped opaque X` already do instead of trailing off into plain
text. On line 11 (`  wire base16-bytes`): `wire` as `Statement` and all twelve characters of
`base16-bytes` as `Statement`, instead of a coloured `wire` beside a plain phrase. On line 5
(`  haskell package=keiro-dsl module=Conformance.RefinedBase16.Domain type=ContentHash`):
`Conformance.RefinedBase16.Domain` entirely plain, proving the new rules are case-sensitive.

Under Shiki the same file gives `refined` the scope `storage.modifier.keiro`, `ContentHash` the
scope `entity.name.type.keiro` from `#mapped-decl-with-name`, and `base16-bytes` the scope
`keyword.control.keiro` in one explanation entry. A focused probe, which runs the new tests and
filters the rest out:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test --test-name-pattern 'refined'
```

**The non-regressions that matter.** The lowercase `refined` inside the string literal
`shape-hash="refined-base16-v1"` must carry the String class, not the Modifier class — this is the
only place in the corpus where a keyword spelling sits inside a string that is not a comment. The
capitalised `RefinedBase16` inside the unquoted module path must stay plain. And `base16-bytes` must
be one token: the guard that catches the opposite is `expectWholeToken` under Shiki and
`expect_uniform` under Vim, both of which fail with a message naming the split.

**The guards that will help you, for once.** Unlike the three plans before it, this range moves
Section 4's word counts, so the mechanical guards in both suites do see it. After Milestone 1 and
before Milestone 2 they fail by name — `140 != 139`, `57 != 56`, and a classification failure naming
`refined` and `base16-bytes` — and after Milestone 2 they pass, having probed each new word in a
one-word document and confirmed it comes back as one whole token in a keyword class. The named
assertions of Milestone 4 are still needed for everything the guards cannot see: which class each
word lands in, whether the type name after `refined` is claimed, and the three collisions inside the
new fixture.


## Idempotence and Recovery

Every step is safe to repeat. The spec, grammar, and test edits are ordinary text edits; re-running
them on an already-edited file is a no-op if done with exact-match replacement, and any accidental
double-application is visible as duplicated prose, a duplicated alternative in a regex (harmless but
ugly), or a duplicated `refined` in the Vim keyword list (also harmless — `syntax keyword` tolerates
repeats). A duplicated word in a spec grid is *not* harmless: it would move the count guards and
fail them by name, which is the intended outcome.

Step 3 rewrites `corpus/mapped-refined-base16.keiro` wholesale from upstream, so it is idempotent by
construction; the `diff` check immediately after proves it.

Step 5 uses `>` rather than `>>`, so re-running it replaces the subject line rather than appending a
second one.

Rollback for any milestone is `git checkout -- <path>` on the files it touched — which discards
*every* uncommitted edit to that file, including earlier milestones' work, so it is a rollback of
the whole plan's changes to that file rather than of one step. To back out a single probe, copy the
file aside first and copy it back. Rollback of the added sample is
`rm corpus/mapped-refined-base16.keiro`. Nothing in this plan runs a migration,
writes outside this repository, or touches the upstream `keiro` checkout — every upstream command
above is a read (`git diff`, `git show`).


## Interfaces and Dependencies

- **`spec/keiro-dsl-language-model.md`** — the contract both packages implement. After Milestone 1
  its Section 3 still holds exactly 72 words and its Section 4 holds 140 bare and 57 dashed; the
  mechanical guards in both suites read these fenced blocks directly, so any accidental edit to a
  word grid fails a named test. Section 6's Modifier row is where `refined` is normative and its
  Control row is where `base16-bytes` is.
- **`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`** — after Milestone 2 the `modifiers` and
  `mapped-decl-with-name` entries of its `repository` object list `refined`, and the
  `dashed-keywords` entry lists `base16-bytes`. No entry changes position in the top-level
  `patterns` array and no new repository key is added.
- **`packages/keiro-vim/syntax/keiro.vim`** — after Milestone 2 its family-word
  `syntax keyword keiroModifier` line lists `refined`, its `keiroTypeName` match's alternation lists
  `refined`, and a new `syntax match keiroStatement` line carries `base16-bytes`. The groups
  `keiroModifier`, `keiroStatement`, and `keiroTypeName` already link to `StorageClass`, `Statement`,
  and `Type` at the bottom of the file; no new group and no new link is added.
- **`corpus/mapped-refined-base16.keiro`** — a read-only input for both suites, byte-identical to
  `keiro-dsl/test/fixtures/refined-base16.keiro` at keiro-dsl `e548fffd`.
- **`.keiro-dsl-sync-subject`** — a one-line file at the repository root holding the Conventional
  Commits subject the calling automation will use. This plan writes it; it does not commit.
- **Toolchain** — Bun for the Shiki suite (`bun install`, `bun test`; the grammar is loaded through
  `packages/shiki-keiro/src/index.ts`, which reads the JSON), and headless Neovim for the Vim suite
  via `packages/keiro-vim/test/run.sh`. Both are already required by plans 3 and 2 respectively;
  this plan adds no dependency.
- **Upstream** — `mori://shinzui/keiro`, working copy at `/Users/shinzui/Keikaku/bokuno/keiro`,
  read-only for the purposes of this plan.
