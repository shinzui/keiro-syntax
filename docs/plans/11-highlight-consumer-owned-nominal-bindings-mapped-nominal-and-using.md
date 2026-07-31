---
id: 11
slug: highlight-consumer-owned-nominal-bindings-mapped-nominal-and-using
title: "Highlight consumer-owned nominal bindings: mapped nominal and using"
kind: exec-plan
created_at: 2026-07-31T18:22:01Z
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Highlight consumer-owned nominal bindings: mapped nominal and using

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for **keiro-dsl**, a small domain-specific
language for describing event-sourced workflows whose source files end in `.keiro`. One is a
Vim/Neovim syntax file (`packages/keiro-vim/`), the other a TextMate grammar consumed by the
Shiki JavaScript highlighter (`packages/shiki-keiro/`). Both must agree, token for token,
with the language's parser, which lives in a *different* repository at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`.

The keiro-dsl commit range
`8ebad94469a94cb70106c8b2b9177c5284eb5bd9..fcd67482d33712b1a07675039049eb00322583bb` —
whose range-ending (triggering) commit is
**`fcd67482d33712b1a07675039049eb00322583bb`, `feat(dsl): add checked nominal consumer
bindings`** — gives the language a third **mapped-type family** and a brand new clause that
can hang off two existing declarations. A `.keiro` source may now say that a plain scalar
name is really a Haskell type the *consumer* owns:

```text
mapped nominal AccountNumber : Text {
  haskell package=nominal-conformance module=NominalConformance.Domain type=AccountNumber
  binding = "NominalConformance.Bindings.accountNumberBinding"
  binding-version = "1"
  canonical-type = "nominal.AccountNumber.v1"
  fixtures = "NominalConformance.Bindings.accountNumberFixtures"
  initial = "NominalConformance.Bindings.initialAccountNumber"
}
```

and it may attach the *same* block of facts to an `id` or an `enum` declaration it already
had, with a new `using` clause:

```text
id OrderId prefix=ord using {
  haskell package=nominal-conformance module=NominalConformance.Domain type=OrderId
  binding = "NominalConformance.Bindings.orderIdBinding"
  ...
}

enum OrderStatus { Draft=draft Submitted=submitted } using {
  ...
}
```

Two literal words enter the language: **`nominal`** and **`using`**. Neither highlighter has
ever heard of either one, so today both render as **plain grey text**, and the type name a
`mapped nominal` declaration introduces (`AccountNumber` above) is left grey too — because
the rule that colours a declaration-site type name only knows the older family words
`record`, `union`, and `opaque`. After this plan both packages colour the two new words, and
Shiki also colours the type name (the Vim rule for that class is inert for every introducer
and Section 6 marks the class optional — see acceptance A below). A spec using nominal
bindings then reads like the rest of the language instead of like grey words dropped into a
coloured block.

You can see the gap and then the fix with your own eyes. From the repository root, before
the change:

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/consumer-nominal-bindings.keiro' \
  -c 'call search("^mapped nominal")' \
  -c 'echo synIDattr(synID(line("."), col(".")+7, 1), "name")' \
  -c 'call search("using {")' \
  -c 'echo synIDattr(synID(line("."), col("."), 1), "name")' \
  -c 'quitall!'
```

Before the change this prints two **empty lines** (no highlight group at either the `n` of
`nominal` or the `u` of `using`). After the change it prints `keiroModifier` and then
`keiroStatement`. The type name `AccountNumber` stays uncoloured in Vim even after the
change, and that is correct: the Vim rule for the declaration-site type name has never fired
for *any* introducer, for the reason recorded in
`docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`, and Section 6
of the spec marks that class an optional refinement. The Shiki package does colour it. The
equivalent tour of the new corpus sample, interactively:

```bash
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/consumer-nominal-bindings.keiro
```

And for Shiki:

```bash
(cd packages/shiki-keiro && bun run demo && open examples/keiro-demo.html)
```


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] Read the keiro-dsl range diff and isolate the parser changes that touch the lexical
      surface — the `mapped nominal <Name> : <Representation> { … }` declaration and the
      `using { … }` binding clause on `id` and `enum` (2026-07-31).
- [x] Confirm mechanically that `reservedWords` is byte-identical across the range — 72 words
      before and after, so Section 3 of the spec needs no edit (2026-07-31).
- [x] Confirm the nominal binding block reuses the *existing* mapped-type clause vocabulary
      (`haskell`, `package`, `module`, `type`, `binding`, `binding-version`, `canonical-type`,
      `fixtures`, `initial`) and adds no clause label of its own (2026-07-31).
- [x] Confirm the representation slot accepts only spellings both packages already colour
      (`Text`, `Int`, `Natural`, `Bool`, `Time`, `UTCTime`) (2026-07-31).
- [x] Measure both highlighters against the new surface *before* editing anything: both leave
      `nominal`, `using`, and the declared type name entirely uncoloured (2026-07-31).
- [x] Capture the green baseline of both suites (44 pass / 195 expect() calls; 299 checks, 0
      failures) (2026-07-31).
- [x] Milestone 1 — reconcile `spec/keiro-dsl-language-model.md` (Sections 1, 4, 6)
      (2026-07-31).
- [x] Milestone 2 — add `corpus/consumer-nominal-bindings.keiro` and register it in
      `corpus/README.md` (2026-07-31).
- [x] Milestone 3 — teach `packages/keiro-vim/syntax/keiro.vim` the two words and widen its
      declaration-site type-name match (2026-07-31).
- [x] Milestone 4 — teach `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` the two words
      and widen `#mapped-decl-with-name` (2026-07-31).
- [x] Milestone 5 — extend both suites, including the raised Section 4 bare-word count
      (2026-07-31).
- [x] Milestone 6 — run both suites green (2026-07-31).
- [x] Milestone 7 — write `.keiro-dsl-sync-subject` (2026-07-31).


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **`reservedWords` did not move, for the third sync running — and Section 3 of the spec
  predicted exactly this.** Both ends of the range hold the identical 72 words:

  ```bash
  cd /Users/shinzui/Keikaku/bokuno/keiro
  for c in 8ebad94469a94cb70106c8b2b9177c5284eb5bd9 \
           fcd67482d33712b1a07675039049eb00322583bb; do
    git show $c:keiro-dsl/src/Keiro/Dsl/Parser.hs \
      | sed -n '/^reservedWords =/,/^    ]/p' | grep -o '"[^"]*"' | tr -d '"' > /tmp/rw-$c.txt
    echo "$c: $(wc -l < /tmp/rw-$c.txt) words"
  done
  diff /tmp/rw-8ebad94*.txt /tmp/rw-fcd6748*.txt && echo IDENTICAL
  ```

  ```text
  8ebad94469a94cb70106c8b2b9177c5284eb5bd9: 72 words
  fcd67482d33712b1a07675039049eb00322583bb: 72 words
  IDENTICAL
  ```

  Section 3 already spelled out why this happens and warned against reading anything into it:
  "**A stable Section 3 therefore does not mean a stable language:** a sync that finds
  `reservedWords` unchanged must still read the rest of `Parser.hs`." This range is the second
  worked example of that sentence — `mapped structural` added 33 words and reserved one;
  `mapped nominal` adds two and reserves none.

- **The nominal binding block introduces no clause label of its own.** `pNominalClause` in
  `Parser.hs` is a `choice` over rules the mapped-type declaration already used:

  ```haskell
  pNominalClause :: P MappedClause
  pNominalClause =
      choice
          [ MCHaskell <$> pHaskellSource
          , MCBindingVersion <$> pQuotedFact "binding-version"
          , MCBinding <$> pQuotedFact "binding"
          , MCCanonical <$> pQuotedFact "canonical-type"
          , MCFixtures <$> pQuotedFact "fixtures"
          , MCInitial <$> pQuotedFact "initial"
          ]
  ```

  So `haskell`, `package`, `module`, `type`, `binding`, `binding-version`, `canonical-type`,
  `fixtures`, and `initial` are all words both packages have coloured since the
  reconciliation recorded in
  `docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`. That is why
  this range costs two words rather than eleven: the *block* is not new, only the two places
  it can now hang from.

- **The representation slot after the colon is not the ten-spelling `pMappedTypeExpr`
  grammar; it is a bare `ident`, closed later by a semantic pass.** `pNominalScalarAfterMapped`
  reads `keyword "nominal"`, an `ident`, `symbol ":"`, and a second `ident` — nothing more —
  and the comment on `NominalScalarDecl` in `Grammar.hs` says why: "The raw representation
  name is retained so `keiro-dsl check` owns the stable unsupported-representation diagnostic
  instead of the low-level parser." The closed set lives in
  `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/NominalType.hs`:

  ```haskell
  scalarRepresentation :: Name -> Maybe NominalScalarRepresentation
  scalarRepresentation = \case
      "Text" -> Just NominalText
      "Int" -> Just NominalInt
      "Natural" -> Just NominalNatural
      "Bool" -> Just NominalBool
      "Time" -> Just NominalTime
      "UTCTime" -> Just NominalTime
      _ -> Nothing
  ```

  All six spellings are already **Primitive types** in Section 6 of
  `spec/keiro-dsl-language-model.md`, so the slot needed no grammar work in either package.
  And because the parser accepts *any* identifier there, a file with an unsupported
  representation (upstream's `nominal-unsupported-representation.keiro` fixture) still
  tokenizes — which is exactly the situation
  `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`
  settled: an editor must colour a file while its author is fixing a `check` diagnostic.

- **Both packages left all three new tokens uncoloured before this plan.** Measured with
  throwaway probes on the exact two-line source `mapped nominal AccountNumber : Text {` /
  `id OrderId prefix=ord using {`. Shiki, via `codeToTokensBase(..., { includeExplanation:
  true })`:

  ```text
  "mapped"                    keyword.declaration.keiro
  " nominal AccountNumber : " (none)
  "Text"                      support.type.keiro
  " {"                        (none)
  "id"                        keyword.declaration.keiro
  " "                         (none)
  "OrderId"                   entity.name.type.keiro
  " "                         (none)
  "prefix"                    storage.modifier.keiro
  "="                         keyword.operator.keiro
  "ord using {"               (none)
  ```

  Neovim, reading `synID` at every character of the same two lines, agreed exactly: every
  character of `nominal`, `AccountNumber`, and `using` reported no group. Note the asymmetry
  the probe exposes — `OrderId` after `id` *is* claimed as a type name, because `id` is in
  the Shiki `#decl-with-name` rule, while `AccountNumber` after `nominal` is not. That is the
  gap Milestone 4 closes.

- **The language contract registry grew a second entry, and the new syntax is gated on it.**
  `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` now reads:

  ```haskell
  languageRegistry :: NonEmpty LanguageDefinition
  languageRegistry =
      LanguageDefinition version1 Nothing LanguageBodyParserV1
          :| [LanguageDefinition version2 (Just version1) LanguageBodyParserV2]
  ```

  and `Parser.hs` gained a pre-grammar gate, `ensureBodyFeatures`, which scans the raw
  significant lines for `mapped nominal …` or for any line containing the word `using` and
  rejects them with a `LanguageFeatureRequiresVersion` diagnostic when the selected version is
  below 2. So a file using nominal bindings must open `language keiro-dsl 2`. **Neither
  package models any of that**, for the same reason plan 10 gave for the preamble's placement
  rule: Section 1 of the spec says highlighting is purely lexical. The only consequence for
  this repository is that the version number in the corpus sample is a `2` rather than a `1`,
  and it is an ordinary **Number** either way.

- **A pretty-printed `enum … using { … }` puts a `{` on the same line as a `}`, and it
  tokenizes fine.** `docEnum` in `PrettyPrint.hs` renders the header (which already ends in
  the constructor list's `}`) and then appends `using {`:

  ```text
  enum OrderStatus { Draft=draft Submitted=submitted } using {
  ```

  Braces are uncoloured punctuation in both packages (Section 5 has never claimed them), so
  this line needs no special handling — but it is worth recording, because it is the first
  place in the language where a declaration's body continues *after* a closing brace, and a
  future contributor tempted to add brace matching to either grammar should know it exists.

- **The corpus sample's own context name starts with `nominal`, so the word is coloured on
  line 2 as well — and that is pre-existing behaviour, not a regression.** The upstream
  fixture opens `context nominal-scalars`. A wire word may contain dashes (Section 2 of the
  spec), and a bare keyword rule ends at the `-` in both engines, so after this plan the head
  `nominal` is coloured and `-scalars` is left grey. Plan 10 hit the identical artefact with
  `context language-preamble` and dodged it by renaming its hand-written sample; that option
  is not available here, because this sample's value is being a *verbatim* copy of the
  upstream fixture. The practical consequence is only for the tests: both suites locate tokens
  by first occurrence, so every `nominal` assertion is anchored on a declaration line
  (`mapped nominal AccountNumber`) rather than written as a bare word, or it would silently be
  reading line 2.

- **Removing `nominal` from Shiki's `#modifiers` does not, on its own, uncolour it — because
  `#mapped-decl-with-name` assigns the same scope through a capture.** The failing-direction
  run for acceptance check E was expected to break the hand-named modifier test and did not:

  ```text
  (fail) every curated contextual keyword is classified as a keyword by the grammar
   50 pass
   1 fail
  ```

  The one failure is the spec-driven guard, which probes each word in a **one-word document**
  where `#mapped-decl-with-name` cannot match (it requires a following name). That is a useful
  demonstration of why that guard exists: the hand-named assertions test the word *in context*,
  where a second rule can mask a missing one, while the word-list guard tests it in isolation
  where nothing can. Removing `nominal` from `#mapped-decl-with-name` instead fails the
  type-name test, and removing `using` from `#control-keywords` fails two tests — so all three
  edits are individually guarded, just not all by the same test.

- **`using` is the first bare contextual keyword whose absence from `reservedWords` has a
  user-visible parser consequence.** `ensureBodyFeatures` tests `"using" \`elem\` wordsFound`
  over *every* significant line, so a version-1 file that merely mentions `using` anywhere —
  as a register name, a field name, a state name — is rejected with
  `LanguageFeatureRequiresVersion` even though `ident` would happily produce it. This is a
  parser trap of exactly the shape plan 10 recorded for `language` (which is rejected only
  when it is a line's *first* word; `using` is rejected anywhere on the line, which is
  stricter). It changes nothing for a highlighter — both packages colour `using`
  unconditionally — but it is the reason the corpus sample does not try to demonstrate `using`
  as an ordinary identifier the way `corpus/language-preamble.keiro` demonstrates `language`.


## Decision Log

Record every decision made while working on the plan.

- Decision: Treat this range as a real lexical-surface change requiring spec, grammar,
  corpus, and test work, rather than closing it with a `chore(sync)` "no lexical change"
  subject.
  Rationale: the range adds two literal words to the language and a new declaration family,
  and both packages demonstrably render every character of both words — and of the type name
  a `mapped nominal` declaration introduces — as plain text today (see the measurement in
  Surprises & Discoveries).
  Date: 2026-07-31

- Decision: Classify `nominal` as a **Modifier** (`storage.modifier.keiro` / `keiroModifier`),
  alongside `structural` and `opaque`.
  Rationale: Section 6 defines the Modifier class as words that "qualify the declaration
  `mapped` introduces rather than introducing one themselves", and names `structural` and
  `opaque` — the other two family words — explicitly. `nominal` is the third member of the
  same parser `choice`: `pMappedTopItem` reads `keyword "mapped"` and then picks between
  `pNominalScalarAfterMapped`, `pMappedStructural`, and `pMappedOpaque`. Classifying it
  anywhere else would make `mapped nominal X` and `mapped opaque X` different colours for no
  reason a reader could explain.
  Date: 2026-07-31

- Decision: Classify `using` as a **Control / section keyword** (`keyword.control.keiro` /
  `keiroStatement`), not as a Modifier and not as a Declaration introducer.
  Rationale: `using` introduces a *clause* — a braced block of facts — attached to a
  declaration that some other word already introduced. That is precisely what `wire` does
  inside a `mapped structural` declaration, and `wire` is a control keyword. It is not a
  Modifier, because it does not qualify or select a variant of anything: `id X prefix=p` and
  `id X prefix=p using { … }` declare the same kind of thing, one with an extra clause. And
  it is not an introducer, because `pUsingNominalBinding` is invoked from inside `pIdDecl` and
  `pEnumDecl`, after the declaration it belongs to has already begun.
  Date: 2026-07-31

- Decision: Add `nominal` to the declaration-site type-name rules in both packages
  (`#mapped-decl-with-name` in Shiki, the `keiroTypeName` match in Vim) so that the `X` in
  `mapped nominal X` is coloured like the `X` in `mapped opaque X`.
  Rationale: Section 6's Declaration-site-type-name row already names `record X`, `union X`,
  and `opaque X` as the mapped shape words that introduce a type name. `mapped nominal X`
  introduces a type name in the identical position, and the type it names is used exactly like
  the others — the upstream fixture's aggregate declares `accountNumber AccountNumber =
  initial`. Leaving it out would be an arbitrary hole in a class the spec already defines.
  (The Vim side of this is inert today for every introducer, for the reason recorded in
  `docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`; the word is
  added anyway so the rule stays in step with Section 6 when a future plan makes it fire.)
  Date: 2026-07-31

- Decision: Add both words to Section 4 (curated contextual keywords) rather than Section 3.
  Rationale: Section 3 is a mechanical verbatim copy of the parser's `reservedWords` list and
  must stay diffable against it. `reservedWords` is unchanged across this range — 72 words at
  both ends — so neither new word may be added there.
  Date: 2026-07-31

- Decision: Copy the corpus sample verbatim from upstream's
  `keiro-dsl/test/fixtures/nominal-scalars.keiro` rather than hand-writing one, and add only
  that one file.
  Rationale: unlike the version preamble (plan 10), this range *does* ship a fixture, and that
  fixture already spans the entire new surface in one file: `id … using`, `enum … using`,
  `mapped nominal` over five of the six accepted representations, the `language keiro-dsl 2`
  preamble the syntax requires, and an aggregate that consumes every declared type. A verbatim
  copy also proves both suites tokenize the real upstream text rather than a paraphrase of it.
  The one representation spelling the fixture omits, `UTCTime`, is lexically identical to the
  `UTCTime` already asserted in `corpus/mapped-type-spellings.keiro` and
  `corpus/aggregate-scalar-types.keiro`, so a second hand-written file would add a third copy
  of an existing check and nothing else.
  Date: 2026-07-31

- Decision: Do not model the `LanguageFeatureRequiresVersion` gate (nominal syntax requires
  `language keiro-dsl 2`) in either grammar.
  Rationale: the same reasoning plan 10 applied to the preamble's placement rule. Section 1 of
  the spec states highlighting is purely lexical; a version-1 file that uses `using` is a
  parser diagnostic, and an editor must still tokenize it while its author fixes the version
  line.
  Date: 2026-07-31


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

The range reconciled cleanly. Final state:

- `spec/keiro-dsl-language-model.md` — Section 1's preamble paragraph now says the registry
  holds versions 1 and 2 and that version 2 is what nominal binding syntax requires; Section
  4's bare grid gains `nominal` and `using`, and its mapped-type subsection gains a "nominal
  bindings" part describing both new forms; Section 6's Modifier row gains `nominal`, its
  Control row names `using`, and its Declaration-site-type-name row names `nominal X`.
  Section 3 is untouched — still the same verbatim 72 words.
- `packages/keiro-vim/syntax/keiro.vim` — `nominal` joins the modifier keyword list, `using`
  joins the control keyword list, and `nominal` joins the `keiroTypeName` alternation.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — `nominal` joins `#modifiers` and
  `#mapped-decl-with-name`, `using` joins `#control-keywords`.
- `corpus/consumer-nominal-bindings.keiro` — new, copied verbatim from upstream, plus its
  entry in `corpus/README.md`.
- Both suites — a block of nominal-binding assertions each, and the Section 4 bare count
  raised from 97 to 99. The dashed count stays 32 and the reserved count stays 72.

Suites at completion: `bun test` 51 pass / 0 fail / 249 expect() calls (from 44 / 195);
`run.sh` 324 checks, 0 failures (from 299). All three grammar edits were verified in the
failing direction as well (acceptance check E), each one individually: removing `using` from
either grammar fails two Shiki tests and three Vim checks; removing `nominal` from the Vim
modifier list fails three Vim checks; removing it from Shiki's `#mapped-decl-with-name` fails
the type-name test and removing it from Shiki's `#modifiers` fails the spec word-list guard.
That last split was itself a discovery — see Surprises & Discoveries.

The lesson worth carrying forward is about where the *cost* of a sync actually lives. This
range is 2,589 changed lines upstream — a new module (`NominalType.hs`, 344 lines), a new
codec, a language-version bump, a pre-grammar feature gate, and eight new fixtures — and it
reduced to two words in two word lists plus one word in a type-name alternation. What made it
cheap is that the new clause **reuses an existing vocabulary**: `pNominalClause` is a
`choice` over rules the mapped-type declaration already had. A sync's cost tracks the number
of new *spellings*, not the size of the upstream diff, and the only reliable way to learn
which is which is to read the parser's combinators rather than the diff stat.


## Context and Orientation

A reader who has never seen this repository needs the following.

**What keiro-dsl is.** A domain-specific language for describing event-sourced workflows in
the keiro framework. A `.keiro` file declares things like aggregates, processes, routers,
contracts, and read models. You do not need to understand event sourcing to work on this
plan — everything here is about how the *text* looks.

**What this repository is.** Two syntax-highlighting packages plus the shared contract and
corpus that keep them honest:

- `spec/keiro-dsl-language-model.md` — the **cross-package contract**. Section 1 is an
  overview; Section 2 describes comments, strings, numbers, and identifiers; Section 3 is a
  verbatim copy of the parser's `reservedWords` list; Section 4 is a curated list of words the
  parser recognises in context but does not reserve; Section 5 lists operators; Section 6 is
  the token-class taxonomy that maps every word to a TextMate scope (for Shiki) and a Vim
  highlight group.
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar.
- `corpus/*.keiro` — the shared sample files both suites tokenize. `corpus/README.md`
  records, per file, whether it was copied verbatim from upstream (and at which keiro-dsl
  commit) or hand-written here, and why.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` —
  headless Neovim assertions.
- `packages/shiki-keiro/test/scopes.test.ts`, run by `bun test` — Shiki assertions.

**The upstream source of truth.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, a Haskell file
using the `megaparsec` parser-combinator library. Read it directly; do not infer the language
from the highlighters.

**What a `sync-keiro-dsl` run is.** When keiro-dsl changes, an automation opens this
repository with a commit range and asks for the four artifacts above to be brought back into
agreement, with an ExecPlan as the durable record. Plans 4 through 10 in `docs/plans/` are the
previous runs. This is run 11, for the range
`8ebad94469a94cb70106c8b2b9177c5284eb5bd9..fcd67482d33712b1a07675039049eb00322583bb`.

**Terms this plan uses.**

- A **mapped type** is a Haskell data type that lives in a package the keiro service merely
  *consumes*, declared in a `.keiro` file together with a description of how it is encoded.
  The declaration begins with the reserved word `mapped`. Before this range there were two
  families, `mapped structural …` and `mapped opaque …`; this range adds a third.
- A **nominal type**, in this range's vocabulary, is a type whose *identity* is what matters
  rather than its shape: `AccountNumber` and `OrderId` are both really `Text` on the wire, but
  they are distinct types in the consumer's Haskell code. The new declarations say "this name
  is a consumer-owned Haskell type over this representation".
- A **binding** is the bundle of facts that tie a keiro type to the consumer's Haskell code:
  which package and module and type it is, which value implements the codec, what the
  canonical wire identifier is, where the conformance fixtures live, and what its initial
  value is. Those facts already had a spelling — the six clause labels inside a
  `mapped structural` or `mapped opaque` block — and this range reuses it unchanged.

### The parser change, in full

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  8ebad94469a94cb70106c8b2b9177c5284eb5bd9..fcd67482d33712b1a07675039049eb00322583bb \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

Two commits sit in the range. `1c3a070`, `docs(plans): split scalar and collection expression
work`, touches only upstream planning documents. `fcd6748`, `feat(dsl): add checked nominal
consumer bindings`, is the one that matters.

Three things in it touch the lexical surface, and one deliberately does not.

**One — a third `mapped` family.** `pMappedDecl` was split into `pMappedTopItem`, which reads
the reserved word `mapped` and then chooses:

```haskell
pMappedTopItem :: Bool -> P TopItem
pMappedTopItem nominalSyntax = do
    loc <- getLoc
    keyword "mapped"
    choice
        ( [TINominalScalar <$> pNominalScalarAfterMapped loc | nominalSyntax]
            ++ [ TIMapped <$> pMappedStructural loc
               , TIMapped <$> pMappedOpaque loc
               ]
        )

pNominalScalarAfterMapped :: Loc -> P NominalScalarDecl
pNominalScalarAfterMapped loc = do
    keyword "nominal"
    name <- ident
    _ <- symbol ":"
    representation <- ident
    binding <- pNominalBindingBlock loc
    ...
```

So the new form is the word `nominal`, a type name, a `:`, a representation name, and a braced
block. The `:` is already an operator in Section 5 of the spec, and both `ident`s are ordinary
identifiers.

**Two — a `using` clause on `id` and `enum`.** Both declarations gained an optional trailing
binding block:

```haskell
pIdDecl :: Bool -> P IdDecl
pIdDecl nominalSyntax = do
    loc <- getLoc
    keyword "id"
    name <- ident
    _ <- symbol "prefix"
    _ <- symbol "="
    pfx <- wireWord
    binding <- if nominalSyntax then optional pUsingNominalBinding else pure Nothing
    ...

pUsingNominalBinding :: P NominalBindingDecl
pUsingNominalBinding = do
    keyword "using"
    loc <- getLoc
    pNominalBindingBlock loc
```

`pEnumDecl` is the same shape, with the clause following the constructor list's closing brace.

**Three — the braced block itself, which is not new.** `pNominalBindingBlock` reads
`braces (many pNominalClause)`, and `pNominalClause` is a `choice` over rules that already
existed for the mapped-type declaration: `pHaskellSource` (which reads `haskell
package=… module=… type=…`) and `pQuotedFact` for `binding`, `binding-version`,
`canonical-type`, `fixtures`, and `initial`. Every one of those words is already in Section 4
of `spec/keiro-dsl-language-model.md` and matched by both packages.

**What deliberately is not a lexical change.** The representation after the `:` is parsed as a
bare `ident`, *not* with the ten-spelling `pMappedTypeExpr` grammar, so the parser accepts any
identifier there and a later pass in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/NominalType.hs` narrows it to
`Text`, `Int`, `Natural`, `Bool`, `Time`, and the `UTCTime` alias. All six are already
**Primitive types** in Section 6, so nothing is needed for that slot. Likewise `parseSource`
gained a pre-grammar gate, `ensureBodyFeatures`, that rejects nominal syntax in a source
declaring `language keiro-dsl 1`; that is a version rule, not a token rule, and neither
package models version rules.

### What is *not* in this change

`reservedWords` — the list Section 3 of the spec copies verbatim — is untouched. Both ends of
the range hold the identical 72 words. Neither `nominal` nor `using` was reserved, which
Section 3 already explains at length: reservation exists only to stop the plain-identifier
parser `ident` from swallowing a structural word, and inside these constructs there is nothing
to swallow. Nothing about the comment, string, number, identifier, or operator rules changed.


## Plan of Work

Seven milestones, in dependency order. Each is independently verifiable.

### Milestone 1 — Reconcile the cross-package contract (`spec/keiro-dsl-language-model.md`)

Three edits, none of them to Section 3.

**Section 1, the version-preamble paragraph.** It currently shows `language keiro-dsl 1` and
describes a registry with one released contract. Note that the registry now holds versions 1
and 2 (keiro-dsl commit `fcd6748`), that version 2 is the contract under which nominal binding
syntax is legal, and that a highlighter still treats the number as an ordinary Number and does
not model which features a version admits.

**Section 4.** Add `nominal` and `using` to the bare grid, taking it from 97 words to 99. The
dashed grid is unchanged at 32 — neither new word contains a dash.

Then extend the "The mapped type declaration" subsection with a part on nominal bindings: show
`mapped nominal AccountNumber : Text { … }` and `id OrderId prefix=ord using { … }` and
`enum OrderStatus { … } using { … }`; state that the braced block's six clause labels are the
same ones the subsection already documents; state that the representation slot accepts `Text`,
`Int`, `Natural`, `Bool`, `Time`, and `UTCTime`, all of which are already Primitive types, and
that the parser accepts any identifier there so an unsupported spelling still tokenizes; and
state the two words' Section 6 classes.

**Section 6.** Add `nominal` to the Modifier row's member list, name `using` in the Control
row's examples, and add `nominal X` to the Declaration-site-type-name row's list of mapped
shape words.

Acceptance: the spec describes what `Parser.hs` does at `fcd6748`, and the word counts the
suites assert become 72 reserved (unchanged), **99** bare contextual, and 32 dashed
contextual (unchanged).

### Milestone 2 — Grow the shared corpus

Copy `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/nominal-scalars.keiro`
verbatim to `corpus/consumer-nominal-bindings.keiro`:

```bash
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/nominal-scalars.keiro \
   corpus/consumer-nominal-bindings.keiro
```

That fixture opens `language keiro-dsl 2`, declares `id OrderId prefix=ord using { … }`,
`enum OrderStatus { Draft=draft Submitted=submitted } using { … }`, five `mapped nominal`
declarations covering `Text`, `Int`, `Natural`, `Bool`, and `Time`, and an aggregate
`NominalLedger` that consumes all seven types in its `regs`, its `command`, its `event`, and
its transition. That is the whole new surface in one file.

Then add the file to `corpus/README.md` under the "copied verbatim" section, with its date,
the keiro-dsl commit it was copied at, what it covers, and a pointer back to this plan —
matching the entries already there.

Acceptance: the file exists and both suites can open it. (It is not run through the keiro-dsl
parser here; this repository has no Haskell toolchain. Being a verbatim copy of a fixture
upstream's own test suite parses, its shape needs no independent check.)

### Milestone 3 — Teach the Vim syntax file (`packages/keiro-vim/syntax/keiro.vim`)

Three additions. Add `nominal` to the `syntax keyword keiroModifier` line that already carries
`structural opaque record union optional`, with a comment recording that it is the third
`mapped` family word. Add `using` to a `syntax keyword keiroStatement` line among the
mapped-type clause labels, with a comment recording that it introduces the binding block on an
`id` or `enum`. Add `nominal` to the `keiroTypeName` match's alternation, next to `record`,
`union`, and `opaque`.

Neither word contains a dash and neither is a prefix of a dashed keyword, so neither needs the
`-\@!` treatment the file gives `on`, `binding`, `dedupe`, `shape`, and `dispatch`.

Acceptance: the character sweep in Validation reports `keiroModifier` on all seven characters
of `nominal` and `keiroStatement` on all five of `using`.

### Milestone 4 — Teach the TextMate grammar (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

Three additions, mirroring Milestone 3. Add `nominal` to the `#modifiers` alternation and to
the `#mapped-decl-with-name` alternation (which is listed before `#modifiers` in the top-level
`patterns` array, so it wins the same-position tie and can claim the type name that follows
while its first capture keeps the Modifier scope). Add `using` to the `#control-keywords`
alternation.

Acceptance: `scopesOf` reports `storage.modifier.keiro` for `nominal`, `keyword.control.keiro`
for `using`, and `entity.name.type.keiro` for `AccountNumber`.

### Milestone 5 — Extend both test suites

`packages/shiki-keiro/test/scopes.test.ts` and `packages/keiro-vim/test/highlight_spec.lua`
each gain a block for this range, asserting against
`corpus/consumer-nominal-bindings.keiro`:

- `nominal` gets the Modifier class;
- `using` gets the Control class — asserted on both the `id … using` line and the
  `enum … using` line, since those are two different parser call sites;
- the name after `nominal` gets the declaration-site type-name class (Shiki only; the Vim
  rule for that optional refinement has never fired for any introducer — see
  `docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`);
- the representation after the `:` gets the Primitive-type class, for at least `Text` and
  `Bool`;
- the reused binding clause labels still get the Control class inside the new blocks;
- the `language keiro-dsl 2` preamble still tokenizes, with `2` as a Number;
- the aggregate below the declarations still tokenizes normally.

Then raise the Section 4 bare count in both suites: 97 → **99**. The dashed count stays 32 and
the reserved count stays 72.

### Milestone 6 — Run both suites green

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

### Milestone 7 — Write the sync subject

Write one Conventional Commits subject line to `.keiro-dsl-sync-subject` at the repository
root. The calling script owns the commit; this plan does not run `git add`, `git commit`, or
`git push`, and does not write `spec/.keiro-dsl-sync`.


## Concrete Steps

All commands are run from the repository root,
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, unless stated otherwise.

**1. Read the range.**

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  8ebad94469a94cb70106c8b2b9177c5284eb5bd9..fcd67482d33712b1a07675039049eb00322583bb \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

**2. Prove `reservedWords` did not move.**

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
for c in 8ebad94469a94cb70106c8b2b9177c5284eb5bd9 \
         fcd67482d33712b1a07675039049eb00322583bb; do
  git show $c:keiro-dsl/src/Keiro/Dsl/Parser.hs \
    | sed -n '/^reservedWords =/,/^    ]/p' | grep -o '"[^"]*"' | tr -d '"' > /tmp/rw-$c.txt
  echo "$c: $(wc -l < /tmp/rw-$c.txt) words"
done
diff /tmp/rw-8ebad94*.txt /tmp/rw-fcd6748*.txt && echo IDENTICAL
```

Expected:

```text
8ebad94469a94cb70106c8b2b9177c5284eb5bd9: 72 words
fcd67482d33712b1a07675039049eb00322583bb: 72 words
IDENTICAL
```

**3. Capture the baseline.** Both suites must be green before any edit, so a later failure is
unambiguously this plan's.

```bash
(cd packages/shiki-keiro && bun install && bun test) 2>&1 | tail -4
./packages/keiro-vim/test/run.sh 2>&1 | tail -2
```

Expected: `44 pass / 0 fail`, and `299 checks, 0 failures`.

**4. Measure the new surface against both highlighters before editing either grammar.** For
Shiki, a scratch `packages/shiki-keiro/probe.ts`:

```typescript
import { createHighlighter } from 'shiki'
import { keiro } from './src/index'
const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
const code = 'mapped nominal AccountNumber : Text {\nid OrderId prefix=ord using {\n'
for (const line of hl.codeToTokensBase(code, {
  lang: 'keiro', theme: 'github-light', includeExplanation: true,
})) {
  for (const t of line) for (const e of t.explanation ?? [])
    console.log(JSON.stringify(e.content),
      e.scopes.map((s) => s.scopeName).filter((s) => s !== 'source.keiro').join(',') || '(none)')
}
```

Run with `(cd packages/shiki-keiro && bun probe.ts)`, then delete it. For Vim, a scratch
`/tmp/probe.lua` that prints the highlight group of every character of the two lines:

```lua
vim.opt.runtimepath:prepend(vim.fn.getcwd() .. '/packages/keiro-vim')
vim.cmd('filetype on'); vim.cmd('syntax on')
vim.cmd('enew!'); vim.bo.buftype = 'nofile'
vim.api.nvim_buf_set_lines(0, 0, -1, false,
  {'mapped nominal AccountNumber : Text {', 'id OrderId prefix=ord using {'})
vim.bo.filetype = 'keiro'
vim.cmd('syntax sync fromstart')
for lnum = 1, 2 do
  local line, out = vim.fn.getline(lnum), {}
  for c = 1, #line do
    local g = vim.fn.synIDattr(vim.fn.synID(lnum, c, 1), 'name')
    out[#out + 1] = line:sub(c, c) .. '=' .. (g == '' and '.' or g)
  end
  print(table.concat(out, ' '))
end
vim.cmd('quitall!')
```

Run with `nvim --headless -n -u NONE -i NONE -l /tmp/probe.lua` **from the repository root** —
running it from anywhere else silently measures a different, installed copy of the plugin, a
trap recorded in
`docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`.
Delete both scratch files afterwards; the findings belong in Surprises & Discoveries, not in
the tree.

**5. Apply Milestone 1** to `spec/keiro-dsl-language-model.md`.

**6. Apply Milestone 2**: copy the upstream fixture, then add its entry to
`corpus/README.md`.

**7. Apply Milestones 3 and 4** to the two grammar files, then re-run the step-4 probes and
confirm `nominal`, `using`, and `AccountNumber` now carry a group on every character.

**8. Apply Milestone 5** to both suites.

**9. Run both suites.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

**10. Write the sync subject.**

```bash
printf '%s\n' 'feat(syntax): highlight consumer-owned nominal bindings' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Acceptance is behavioural, not "it compiles".

**A — the nominal declaration is coloured in Vim.** Before Milestone 3 neither `nominal` nor
the name it introduces has a highlight group; after, `nominal` is `keiroModifier` on all seven
characters.

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/consumer-nominal-bindings.keiro' \
  -c 'call search("^mapped nominal")' \
  -c 'echo synIDattr(synID(line("."), col(".")+7, 1), "name")' \
  -c 'call search("using {")' \
  -c 'echo synIDattr(synID(line("."), col("."), 1), "name")' \
  -c 'quitall!'
```

Expected after the change:

```text
keiroModifier
keiroStatement
```

**B — the nominal declaration is coloured in Shiki.** The scratch probe from Concrete Steps
step 4, re-run after Milestone 4, must report:

```text
"mapped"        keyword.declaration.keiro
"nominal"       storage.modifier.keiro
"AccountNumber" entity.name.type.keiro
"Text"          support.type.keiro
"using"         keyword.control.keiro
```

The point is `"AccountNumber"` carrying `entity.name.type.keiro`: that proves
`#mapped-decl-with-name` won the same-position tie against `#modifiers`, exactly as it already
does for `record ArtifactInfo`.

**C — `using` is coloured at both call sites.** The corpus sample uses it once after an `id`
declaration's `prefix=ord` and once after an `enum` declaration's closing `}`. Both suites
assert both, because they are two different parser call sites (`pIdDecl` and `pEnumDecl`) and
the second is the language's first case of a declaration body continuing after a `}`.

**D — both suites green.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

```text
 51 pass
 0 fail
 249 expect() calls
```

```bash
./packages/keiro-vim/test/run.sh
```

```text
324 checks, 0 failures
```

**E — the new guards actually guard.** Run each of the three grammar edits in its failing
direction, one at a time, then restore. A guard that passes in both directions is not a guard,
and doing them one at a time is what showed that Shiki's two `nominal` edits are guarded by
*different* tests.

Shiki, edit 1 — temporarily delete `nominal|` from the `#modifiers` alternation in
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` and re-run `bun test`. Observed:

```text
(fail) every curated contextual keyword is classified as a keyword by the grammar
 50 pass
 1 fail
```

The hand-named modifier test still passes, because `#mapped-decl-with-name` assigns
`storage.modifier.keiro` to `nominal` through its first capture whenever a name follows. The
one failure is the spec-driven guard, which probes each word in a one-word document where that
rule cannot match; it reads `nominal` out of Section 4 of `spec/keiro-dsl-language-model.md`
and reports it by name.

Shiki, edit 2 — temporarily delete `|nominal` from the `#mapped-decl-with-name` alternation.
Observed:

```text
(fail) the name a mapped nominal declaration introduces gets entity.name.type
 50 pass
 1 fail
```

Shiki, edit 3 — temporarily delete `using|` from the `#control-keywords` alternation.
Observed:

```text
(fail) the using binding clause gets keyword.control at both call sites
(fail) every curated contextual keyword is classified as a keyword by the grammar
 49 pass
 2 fail
```

Vim, edit 1 — temporarily delete the `syntax keyword keiroStatement using` line from
`packages/keiro-vim/syntax/keiro.vim` and re-run `run.sh`. Observed:

```text
FAIL "using {": want keiroStatement, got
FAIL "using": want keiroStatement on every character, got (none) at offset 0 ("u") — a
shorter rule is claiming part of the literal; see the number matches in syntax/keiro.vim
FAIL contextual "using": want a keyword group, got
324 checks, 3 failures
```

Vim, edit 2 — temporarily delete `nominal` from the `syntax keyword keiroModifier` family
line. Observed:

```text
FAIL "nominal AccountNumber": want keiroModifier, got
FAIL "nominal RiskScore": want keiroModifier, got
FAIL contextual "nominal": want a keyword group, got
324 checks, 3 failures
```

The third Vim edit — adding `nominal` to the `keiroTypeName` alternation — is deliberately
*not* guarded, because that rule is inert in Vim for every introducer (see acceptance A and
`docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`). The word is
added so the rule stays in step with Section 6 when a future plan makes it fire.

**F — the spec's word-list guards move together.** Both suites assert Section 3 has 72 words
and Section 4 has 99 bare plus 32 dashed. Section 3 and the dashed list must be unchanged by
this range; the bare count must have risen by exactly two. A failure here means Milestone 1's
edits and Milestone 5's counts disagree.


## Idempotence and Recovery

Every step here is safe to repeat.

- The measurement steps (2, 3, 4) are read-only apart from files under `/tmp` and the scratch
  `packages/shiki-keiro/probe.ts`, which is deleted before the suites are run. Re-running them
  costs only time.
- The edits (Milestones 1 through 5) are ordinary file edits under version control. `git diff`
  shows the whole change; `git checkout -- <path>` reverts any single file. Nothing in this
  plan runs `git add`, `git commit`, or `git push` — the calling automation owns the commit —
  so recovery never involves rewriting history.
- Milestones 3 and 4 are the only behavioural changes to a shipped grammar, and each is a
  purely **additive** word in an existing list. Adding a word cannot uncolour anything that
  was coloured before; the worst case is that a `.keiro` file using `nominal` or `using` as an
  ordinary identifier now shows it as a keyword, which is Section 1's documented lexical rule
  and the same behaviour `initial`, `key`, and `value` already have. (For `using` even that
  case is hypothetical: the parser's `ensureBodyFeatures` gate rejects any version-1 source
  whose lines contain the word at all.) Reverting either file alone restores the previous
  behaviour.
- `corpus/consumer-nominal-bindings.keiro` is a new file, so nothing depends on it until
  Milestone 5 adds assertions. Deleting it and its `corpus/README.md` entry cleanly undoes
  Milestone 2. Re-running the `cp` is idempotent.
- The count assertions in Milestone 5 are the one place where two files must agree. If the
  suites fail with "want 99, got 97", the spec edit in Milestone 1 did not land in the fenced
  word block; fix the spec rather than lowering the count.
- `bun install` in `packages/shiki-keiro` is idempotent; the lockfile is committed.
- Both suites locate tokens by *first occurrence* in a file, so if the corpus file is ever
  edited after the assertions are written, re-run both suites: inserting a line that repeats an
  anchor earlier in the file can move an assertion onto the wrong token. That failure mode is
  loud — the reported group is wrong, not missing.


## Interfaces and Dependencies

**Upstream, read-only.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` at
`fcd67482d33712b1a07675039049eb00322583bb` — the authority for every claim in the spec. Its
companions read for context: `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Grammar.hs`
(the new `NominalBindingDecl` and `NominalScalarDecl` records, and the new `specNominalScalars`
field on `Spec`), `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/NominalType.hs`
(the closed set of accepted representations), `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`
(the two-entry released-version registry and the `LanguageFeatureRequiresVersion` diagnostic),
and `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (`docNominalScalar`
and `docNominalBindingFacts`, which confirm the canonical spelling of both new forms).
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/nominal-scalars.keiro` is the
fixture copied into the corpus.

**In this repository.**

- `spec/keiro-dsl-language-model.md` — the contract. Section 3 must remain a verbatim copy of
  `reservedWords`; the fenced word blocks in Sections 3 and 4 are parsed by both suites, so
  their shape (```` ```text ```` fences, whitespace-separated words) must be preserved. After
  this plan Section 4's bare block holds 99 words and its dashed block still holds 32.
- `packages/keiro-vim/syntax/keiro.vim` — Vim syntax. `nominal` joins the
  `syntax keyword keiroModifier` mapped-family line and the `keiroTypeName` alternation;
  `using` joins a `syntax keyword keiroStatement` line.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — TextMate grammar. `nominal` joins
  the `#modifiers` and `#mapped-decl-with-name` alternations; `using` joins
  `#control-keywords`. `#mapped-decl-with-name` stays ahead of `#modifiers` in the top-level
  `patterns` array.
- `corpus/consumer-nominal-bindings.keiro` — new shared sample, copied verbatim from upstream.
  Read-only to both packages per `corpus/README.md`; each package asserts against it from its
  own suite.
- `packages/keiro-vim/test/highlight_spec.lua` — reuses `expect`, `expect_uniform`, and the
  spec word-list guards already there. New assertions and one raised count; no helper change
  is needed. The anchors matter, though: the corpus sample's `context nominal-scalars` puts
  the word `nominal` on line 2, so every assertion anchors on a declaration line rather than
  probing the bare word.
- `packages/shiki-keiro/test/scopes.test.ts` — reuses `expectScope`, `expectWholeToken`, and
  the spec word-list guards already there. New assertions and one raised count.

**Toolchain.** Neovim (headless, `-l` script mode) for the Vim suite; Bun and `shiki` for the
Shiki suite, both already pinned in `packages/shiki-keiro/package.json` and `bun.lock`. No new
dependency is added by this plan. This repository has no Haskell toolchain, so the upstream
parser is read, never run.
