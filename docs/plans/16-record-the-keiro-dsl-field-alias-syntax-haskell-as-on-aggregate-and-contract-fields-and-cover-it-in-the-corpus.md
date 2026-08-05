---
id: 16
slug: record-the-keiro-dsl-field-alias-syntax-haskell-as-on-aggregate-and-contract-fields-and-cover-it-in-the-corpus
title: "Record the keiro-dsl field-alias syntax (haskell/as on aggregate and contract fields) and cover it in the corpus"
kind: exec-plan
created_at: 2026-08-05T13:17:52Z
---

# Record the keiro-dsl field-alias syntax (haskell/as on aggregate and contract fields) and cover it in the corpus

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter
at `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file
of regular expressions that assigns each matched piece of text a dotted *scope name* such as
`keyword.control.keiro`; editors and Shiki colour text by scope name.) Both highlighters are
driven by one written contract, `spec/keiro-dsl-language-model.md`, which this repository keeps
in step with the upstream parser for the language, in the separate `keiro` repository
(canonical project URI `mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`fc80cbd011cf3bc2c8e2c882ef677233dbe33529` (short form `fc80cbd`), the head of the
28-commit range `fd5e4275074f39d3fb8b82a9d8bc7c9a539727f1..fc80cbd011cf3bc2c8e2c882ef677233dbe33529`.
One commit in the range changes the surface syntax of `.keiro` files: `b31896cf`
(`feat(dsl)!: decouple wire keys from generated Haskell selectors with field aliases`).

**The headline is that the language gained a new clause made entirely of old words, so neither
highlighter file changes.** Under `language keiro-dsl 4` a field of an aggregate command or
event, and a field of a contract event, may now carry up to two optional *aliases* between its
name and its `:` type — a generated-Haskell record-selector alias introduced by the word
`haskell`, and a serialized wire-key alias introduced by the word `as`:

```text
command Observe {
  family:Text
  type haskell payloadType:Text
  region haskell serviceRegion as "region_code":Text
}
```

Both marker words are already in Section 4 of `spec/keiro-dsl-language-model.md` as curated
contextual keywords — they entered with the mapped type declaration at keiro-dsl `430c3d2` —
and both packages have coloured them unconditionally, everywhere, ever since. The selector
alias is an ordinary identifier and the wire key an ordinary double-quoted string. The parser's
`reservedWords` list is untouched at exactly the 72 words Section 3 copies verbatim; no
operator, literal form, comment rule, or token class moves. So a `.keiro` file written with
field aliases already tokenizes correctly in both packages today.

What is false after this range is the *spec*. Section 1 of `spec/keiro-dsl-language-model.md`
states in so many words that version 4 "adds no spelling either" and "names the same body
grammar and the same syntax profile as versions 2 and 3
(`LanguageDefinition version4 (Just version3) LanguageBodyParserV2 profileV2 …`)". Commit
`b31896cf` changed exactly that registry line: version 4 now binds a **new syntax profile**,
`profileV3` (`keiro-dsl/syntax-profile/3`), which is `profileV2` plus a new `LanguageFeature`
value, `FieldAliasSyntax`. Version 4 is therefore no longer a lexical clone of version 2 — it
is the first released version since 2 to admit spellings its predecessor rejects. Section 4
likewise describes `as` and `haskell` as belonging to the mapped type declaration alone, which
is no longer the whole truth. And the corpus has no sample of the alias syntax at all, so
nothing in this repository proves either package handles it.

What someone gains after this change: a reader of `spec/keiro-dsl-language-model.md` gets an
accurate description of the version-4 registry entry and of the one new grammatical home of
`haskell` and `as`; and both suites gain a corpus sample plus assertions proving the alias
markers colour as keywords in their new positions, the selector stays plain, the wire key stays
a String, and a field literally *named* `as` still reads as Section 1's lexical rule says it
must. You can see the new coverage working by running the two suites named in Validation and
Acceptance against the new corpus file `corpus/field-aliases.keiro`.


## Progress

- [x] Read the upstream diff for the whole 28-commit range and identify `b31896cf` as the one
      surface-changing commit (2026-08-05).
- [x] Confirm mechanically that `Parser.hs`, `Parser/Core.hs`, and `Frontend.hs` are
      byte-identical across the range, that the only parser modules that changed are
      `Parser/Aggregate.hs`, `Parser/Document.hs`, and `Parser/Integration.hs`, and that the
      spec's 72-word reserved list still matches the parser's `reservedWords` exactly
      (2026-08-05).
- [x] Record the pre-change suite baselines: 76 Shiki tests / 387 `expect()` calls, 405 Vim
      checks (2026-08-05).
- [x] Write this ExecPlan (2026-08-05).
- [x] Milestone 1 — correct the version-4 paragraph in Section 1 of
      `spec/keiro-dsl-language-model.md`, add the field-alias subsection to Section 4, and
      annotate the Section 6 control-keyword row (2026-08-05).
- [x] Milestone 2 — add `corpus/field-aliases.keiro` and document it in `corpus/README.md`
      (2026-08-05).
- [x] Milestone 3 — extend both suites with assertions over the new corpus file (2026-08-05).
- [x] Milestone 4 — run both suites to green and record the transcripts (2026-08-05).
- [x] Write the Conventional Commits subject to `.keiro-dsl-sync-subject` (2026-08-05).


## Surprises & Discoveries

**A stable Section 3 hid a real grammar change, exactly as Section 3's own warning predicts.**
The spec says in Section 3: "A stable Section 3 therefore does not mean a stable language: a
sync that finds `reservedWords` unchanged must still read the rest of `Parser.hs`." This range
is the first since that sentence was written to prove it the hard way. `Parser/Core.hs` — the
lexer, with `reservedWords` — is byte-identical across the range, and so are `Parser.hs` and
`Frontend.hs`; the change hides in `Parser/Aggregate.hs` and `Parser/Integration.hs`:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
git diff --stat fd5e4275074f39d3fb8b82a9d8bc7c9a539727f1..fc80cbd011cf3bc2c8e2c882ef677233dbe33529 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
     keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
     keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs keiro-dsl/src/Keiro/Dsl/Frontend.hs
```

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs            | 16 ++++++++++++----
 keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs    | 12 +++++++++++-
 keiro-dsl/src/Keiro/Dsl/Parser/Aggregate.hs   | 11 ++++++++++-
 keiro-dsl/src/Keiro/Dsl/Parser/Document.hs    |  2 +-
 keiro-dsl/src/Keiro/Dsl/Parser/Integration.hs | 11 ++++++++++-
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs        | 19 +++++++++++++++----
 6 files changed, 57 insertions(+), 14 deletions(-)
```

**Upstream's own fixtures use the vocabulary collision deliberately.** The new upstream
fixture `keiro-dsl/test/fixtures/aggregate-field-alias.keiro` aliases a command field *named*
`type` (`type haskell payloadType:Text`), and the reworked
`keiro-dsl/test/fixtures/aggregate-scalars.keiro` declares a field literally named `as`
(`as:Text`). Both are ordinary identifiers to the parser — neither word is reserved — and both
packages colour them as keywords anyway, which is Section 1's lexical-highlighting rule working
as designed. The corpus sample reproduces both collisions so the suites pin them.

**`expectWholeToken` cannot be pointed at the word `as`, because `as` is a substring of
`haskell`.** The Shiki helper finds the first explanation entry whose content *includes* the
target, and on a line like `region haskell serviceRegion as "region_code":Text` the first
entry containing the characters `as` is the `haskell` keyword token itself, so the helper
reports a bogus split. The suite therefore asserts `as` with `expectScope` (which requires the
entry's trimmed content to *equal* `as`) plus corpus ordering that puts the alias marker first,
and reserves `expectWholeToken` for `haskell`, whose spelling contains no other token on its
lines. The same trap does not exist in the Vim suite, whose `expect_uniform` anchors by line
and matches the exact word.

**The version-4 comment block in both suites was already stale the day after it was written.**
Plan 15 added a comment to each suite saying version 4 "binds the SAME body grammar and syntax
profile as versions 2 and 3, so it adds no spelling". True when written; false after
`b31896cf`. Both comments now carry a correction pointing at this plan, and the assertions
beneath them are unchanged — they assert version-2 surface under a `4` preamble, which is
still exactly what that corpus file contains.

**Test transcripts.** Both suites pass with the new file and assertions: 81 Shiki tests (76
before, plus five) / 415 `expect()` calls (387 before), and 425 Vim checks (405 before, plus
twenty), zero failures in either. The three spec word-grid counts the suites guard — 72
reserved, 100 bare contextual, 32 dashed — are unchanged, confirming Milestone 1's prose edits
stayed out of the grids. Full transcripts are in Validation and Acceptance.


## Decision Log

- Decision: Treat this range as a real (if small) surface reconciliation — spec, corpus, and
  tests — while changing **neither** highlighter file.
  Rationale: The lexical *rules* are untouched: no reserved word, no new curated word, no
  operator, no literal form, no token class. `haskell` and `as` have been unconditional
  keywords in both packages since plan 8, and Section 1's rule ("a word is a keyword because it
  is in a fixed list, not because of where it appears") means their new grammatical home is
  already coloured correctly. But the *grammar* genuinely changed — a new `SyntaxProfile` with
  a new `FieldAliasSyntax` feature, new clauses in two parser productions — and Section 1 of
  the spec makes a now-false claim about the registry line this commit edited. The precedent is
  `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`:
  existing spellings became legal in new positions, no highlighter rule moved, and the work was
  spec accuracy plus corpus/test coverage so nothing in this repository would tolerate a future
  regression in those positions.
  Date: 2026-08-05

- Decision: Add no word to Section 3, Section 4's grids, or Section 6's class assignments.
  Rationale: There is nothing to add. `reservedWords` is unchanged at 72 (verified by a
  mechanical diff against the spec grid); `haskell` and `as` are already in Section 4's bare
  grid (100 words) and already Control / section keywords in Section 6. The alias selector is
  an ordinary identifier and the wire key an ordinary String. Both suites assert the three grid
  counts (72 / 100 / 32) by name, so this decision is machine-checked.
  Date: 2026-08-05

- Decision: Hand-author one corpus file, `corpus/field-aliases.keiro`, rather than copying an
  upstream fixture verbatim.
  Rationale: No single upstream fixture spans the new surface. `aggregate-field-alias.keiro`
  has the aggregate side only; the alias-carrying contract fields live in `contract.keiro`
  (and its `contract-*` siblings), which have no aggregate. The corpus convention for exactly
  this situation is a hand-authored file (`mapped-type-spellings.keiro`,
  `transition-implementation-hole.keiro`, `aggregate-scalar-types.keiro` are the precedents).
  The file reproduces upstream's own alias spellings — a selector-only alias on a field named
  `type`, a selector-plus-wire-key alias, and a field literally named `as` — so the sample
  stays honest to what upstream actually writes.
  Date: 2026-08-05

- Decision: Order the corpus file so the first occurrence of the bare word `as` is the alias
  marker, and the field named `as` comes later.
  Rationale: The Shiki helper `expectScope` finds the *first* token whose trimmed content
  equals the literal, and has no anchor parameter. Both occurrences are the same scope
  (`keyword.control.keiro`), so ordering does not change what passes — it changes what the
  assertion *means*. With the marker first, the hand-named marker assertion really reads the
  marker; the field-named-`as` case gets its own anchored whole-token assertion in the Vim
  suite and an anchored `expectWholeToken` cannot be used in Shiki (see Surprises), so there it
  is covered by the corpus ordering note plus the uniform Vim check.
  Date: 2026-08-05

- Decision: Keep the corpus file valid under `keiro check`, not merely parseable.
  Rationale: Same as plans 14 and 15: a corpus file that names version 4 in its preamble and
  would then be rejected by the validator is a trap for the next reader. Concretely: the `id`
  prefix is a legal TypeID prefix (`parcel`), state names do not collide with enum constructor
  names (this file declares no enum), the aggregate carries a `wire` footer, and the alias
  spellings are copied from fixtures upstream's own suite parses and round-trips.
  Date: 2026-08-05

- Decision: Correct Section 1 by rewriting the version-4 paragraph around the registry line as
  it now reads, rather than deleting the paragraph.
  Rationale: The paragraph carries facts that are still true and still load-bearing — the
  stable/compatibility-only split, `keiro new` writing the stable version, the rule that a
  highlighter models neither. Only the "adds no spelling" claim and the quoted registry entry
  are stale. The rewrite names `b31896cf` and `profileV3`/`FieldAliasSyntax`, states the new
  invariant (the *feature gate* is a parser concern; the *words* are old), and keeps the rest.
  Date: 2026-08-05

- Decision: Proceed without an Intention ID.
  Rationale: This plan is written by the unattended `sync-keiro-dsl` automation, which has no
  interactive channel on which to ask for one. The plan is linked from the commit the calling
  script makes via the `ExecPlan:` trailer.
  Date: 2026-08-05


## Outcomes & Retrospective

The reconciliation is complete and both suites are green.

Achieved: Section 1 of `spec/keiro-dsl-language-model.md` now describes the version-4 registry
entry as it actually reads — `LanguageBodyParserV2` plus the new `profileV3` syntax profile
carrying `FieldAliasSyntax` — and names keiro-dsl commit `b31896cf` as the change that made
version 4 the first version since 2 to admit new spellings. Section 4 gained a subsection
defining the field-alias clause, its two parser sites, and its version gate; Section 6's
control-keyword row now names the field-alias role of `haskell` and `as`. The corpus gained
`corpus/field-aliases.keiro`, documented in `corpus/README.md`, and both suites gained
assertions that the alias markers colour as control keywords in both new positions, that the
selector identifier stays plain, that the wire key stays a String, and that a field literally
named `as` keeps its keyword colour.

Not done, deliberately: neither `packages/keiro-vim/syntax/keiro.vim` nor
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` changed, and no word grid moved. That is
the correct outcome for this range — see the first two Decision Log entries.

Lesson for the next sync: the spec's Section 3 warning ("a stable Section 3 does not mean a
stable language") is now demonstrated by a concrete range, and the fast way to catch this class
of change is to diff the whole `Parser/` *directory* plus `LanguageVersion.hs`, never just
`Parser.hs` and `Parser/Core.hs`. A new `LanguageFeature` constructor upstream is a reliable
tell that some production gained a gated spelling; grep the range's diff for
`data LanguageFeature` first.


## Context and Orientation

Everything below refers to two repositories.

The first is this one, `keiro-syntax`, rooted at `/Users/shinzui/Keikaku/bokuno/keiro-syntax`.
It contains four artifacts that must always agree with one another:

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Prose plus tables describing
  every token a `.keiro` file can contain and which token class it belongs to. Its Section 3
  holds the authoritative reserved-keyword list, copied verbatim from the upstream parser;
  Section 4 holds the curated contextual keywords (words the parser matches by context without
  reserving); Section 6 holds the token-class taxonomy both packages implement.
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim highlighter: `syntax keyword` and
  `syntax match` commands assigning groups such as `keiroKeyword`, `keiroStatement`,
  `keiroString`, and `keiroType`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar, assigning
  dotted scope names such as `keyword.control.keiro` and `string.quoted.double.keiro`.
- `corpus/` — `.keiro` sample files, each documented in `corpus/README.md`. Both test suites
  read files straight out of `corpus/` and assert what colour or scope specific pieces of text
  receive, so a spelling that is not in `corpus/` is surface neither package proves it handles.

The two test suites are:

- `packages/shiki-keiro/test/scopes.test.ts` — a `bun test` file. It loads each corpus file
  with `readFileSync` into a top-level constant, then asserts with two helpers:
  `expectScope(source, text, scope)` finds the first token whose trimmed content equals `text`
  and asserts it carries `scope`; `expectWholeToken(source, text, scope, anchor)` additionally
  asserts the grammar claimed `text` as one token, searching only lines containing `anchor`.
  Note the helper's find step matches by *substring inclusion*, which matters for the word
  `as` (see Surprises & Discoveries). At the end of the file the suite re-reads the word grids
  out of Sections 3 and 4 of the spec and asserts their sizes (72 / 100 / 32) and that every
  grid word is classified as a keyword.
- `packages/keiro-vim/test/highlight_spec.lua` — a headless Neovim script run by
  `packages/keiro-vim/test/run.sh`. `open('corpus/x.keiro')` loads a corpus file;
  `expect(anchor, group)` finds the first line containing the literal `anchor` and asserts the
  group under its first character; `expect_uniform(word, group, anchor)` asserts every
  character of `word` carries `group`, optionally locating `word` within the first line
  containing `anchor` (the word must start at or after the anchor's start column);
  `expect_no_group(anchor, offset)` asserts the character at `offset` within the anchor's line
  carries no group. It ends with the same three word-grid count checks.

The second repository is `keiro`, rooted at `/Users/shinzui/Keikaku/bokuno/keiro` (canonical
project URI `mori://shinzui/keiro`). It holds the upstream parser package `keiro-dsl`. The
files that matter here:

- `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` — the lexer: `reservedWords` (72 words, unchanged),
  `ident`, `stringLit`, the `keyword` combinator, and the helper `optionalLanguageFeature`,
  which parses an optional gated clause and — when the source's language version lacks the
  feature — rejects the clause's marker word with a `LanguageFeatureRequiresVersion`
  diagnostic located at the marker.
- `keiro-dsl/src/Keiro/Dsl/Parser/Aggregate.hs` — `pAggregateField`, the field of an aggregate
  `command` or `event` declaration.
- `keiro-dsl/src/Keiro/Dsl/Parser/Integration.hs` — `pContract` and its `pContractField`, the
  field of a contract event.
- `keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` — the registry of released language contracts
  and the `LanguageFeature` type.

**What the upstream range did.** Twenty-eight commits, mostly conformance-package generation,
generated-Haskell naming, docs, and a Keiki dependency upgrade — none of which touches `.keiro`
notation. The one surface commit is `b31896cf`. It made three coupled changes:

First, `LanguageVersion.hs` gained a feature and a profile, and rebound version 4:

```haskell
data LanguageFeature
  = ...
  | ExplicitTransitionImplementationSyntax
  | FieldAliasSyntax

profileV3 :: SyntaxProfile
profileV3 =
  SyntaxProfile
    "keiro-dsl/syntax-profile/3"
    (Set.insert FieldAliasSyntax (profileFeatures profileV2))

languageRegistry =
  LanguageDefinition version1 Nothing LanguageBodyParserV1 profileV1 runtimeProfileV1 CompatibilityOnly
    :| [ LanguageDefinition version2 (Just version1) LanguageBodyParserV2 profileV2 runtimeProfileV1 CompatibilityOnly,
         LanguageDefinition version3 (Just version2) LanguageBodyParserV2 profileV2 runtimeProfileV2 CompatibilityOnly,
         LanguageDefinition version4 (Just version3) LanguageBodyParserV2 profileV3 runtimeProfileV3 Stable
       ]
```

Second, `pAggregateField` in `Parser/Aggregate.hs` gained the two optional alias slots between
the field name and its optional `:` type:

```haskell
pAggregateField context = do
  loc <- getLoc
  n <- ident
  selector <- optionalLanguageFeature context FieldAliasSyntax "haskell" (try (keyword "haskell" *> ident))
  wireKey <- optionalLanguageFeature context FieldAliasSyntax "as" (try (keyword "as" *> stringLit))
  mty <- optional (symbol ":" *> pMappedTypeExpr context)
  ...
```

Third, `pContractField` in `Parser/Integration.hs` gained the identical two slots before its
mandatory `:` contract type (`typeid "…"`, `text`, or `int`), and `pContract` started taking
the `FrontendContext` so the gate can see the source's version (`Parser/Document.hs` passes it
through — that is the whole two-character diff there).

The grammar records the aliases on `AggregateField` (new fields `aggregateFieldSelector`,
`aggregateFieldWireKey`) and `ContractField` (new `cfSelector`, `cfWireKey`, `cfLoc`), and the
pretty-printer prints them back in the same shape. The *meaning* — the selector names the
generated Haskell record selector, the wire key names the serialized JSON key, and the logical
DSL name stays the identity used by expressions and evolution pairing — is semantics, invisible
to a highlighter.

**What this means lexically.** The complete shape of a field is now

```text
<name> [haskell <selector-identifier>] [as "<wire-key-string>"] [: <Type>]
```

in an aggregate command/event field list (where the `: <Type>` was already optional), and

```text
<name> [haskell <selector-identifier>] [as "<wire-key-string>"] : (typeid "…" | text | int) [;]
```

in a contract event. Every token in those shapes is a token class this repository already
models: `haskell` and `as` are curated Control / section keywords (Section 4 bare grid, plan
8), the selector is a plain identifier, the wire key an ordinary String, and the types were
already covered. A source below version 4 that writes an alias fails with
`LanguageFeatureRequiresVersion` — a parser diagnostic, and an editor must still tokenize the
file while its author fixes the version line, which is Section 1's standing rule.


## Plan of Work

The work is four milestones. Milestone 1 fixes the spec, which is the only strictly necessary
edit. Milestones 2 and 3 add the corpus sample and the assertions that make the claim "both
packages already handle this" true by demonstration. Milestone 4 proves nothing regressed.


### Milestone 1 — correct the spec

Scope: three regions of `spec/keiro-dsl-language-model.md`. No word grid changes; the Section 3
grid stays at exactly 72 words and Section 4's grids at 100 and 32, because both suites assert
those counts by name.

First, in Section 1, the paragraph beginning "**Version 4 adds no spelling either, and it is
the one version marked stable.**" is rewritten. It must now say: version 4 still names the
version-2 body grammar (`LanguageBodyParserV2`) but since keiro-dsl commit `b31896cf` binds a
new syntax profile, `profileV3` (`keiro-dsl/syntax-profile/3`), which is version 2's profile
plus the `FieldAliasSyntax` feature; that this makes version 4 the first released version since
2 to admit spellings its predecessors reject — the field aliases described in Section 4 — while
adding no new *word* to the language; and it must keep the still-true facts it already carries
(the `Stable`/`CompatibilityOnly` split from `b49b11f`, that exactly one entry may be stable,
and that a highlighter models none of it).

Second, in Section 4, the paragraph after the bare grid that reads "The last three-and-a-bit
rows — `as` through `using` — are the **mapped type declaration** vocabulary" gains a sentence:
since keiro-dsl `b31896cf`, `haskell` and `as` also serve as the field-alias markers on
aggregate and contract fields, described in a new subsection. Then a new subsection
`### Field aliases on aggregate and contract fields` is added at the end of Section 4, after
"The scalar expression sublanguage" and before Section 5. It defines the clause shape shown in
Context and Orientation, names the two parser sites (`pAggregateField`,
`pContractField`), states the version gate (`FieldAliasSyntax`, syntax profile 3, version 4)
and that a highlighter models none of it, and records the two facts an implementer needs: no
new word exists (so no rule changes), and the vocabulary collisions upstream itself writes
(a field named `type` carrying an alias; a field named `as`) colour as keywords by Section 1's
rule. Adding fenced blocks here is safe for the suites' grid readers, which take only the
first one (Section 3) / first two (Section 4) ```text blocks under each heading.

Third, in Section 6's Control / section keyword row, the parenthetical listing the mapped-type
vocabulary is extended so `haskell` and `as` are also identified as the field-alias markers,
with a pointer to the new Section 4 subsection.

Acceptance: `grep -n 'Version 4 adds no spelling' spec/keiro-dsl-language-model.md` finds
nothing; `grep -cn 'b31896cf' spec/keiro-dsl-language-model.md` finds at least three matches
(Sections 1, 4, and 6); the three grid counts still pass in Milestone 4.


### Milestone 2 — add the field-alias corpus sample

Scope: a new file `corpus/field-aliases.keiro` plus one entry in `corpus/README.md`. The file
opens `language keiro-dsl 4` on line 1 (the version gate requires it, and both suites anchor on
first occurrences, so the banner sits below the preamble). Its body is one aggregate and one
contract, reproducing upstream's own alias spellings:

- an aggregate command with a plain field (`family:Text`), a selector-only alias on a field
  named `type` (`type haskell payloadType:Text`), a full alias
  (`region haskell serviceRegion as "region_code":Text`), and a field literally named `as`
  (`as:Text`) — the last two ordered so the alias marker `as` is the file's first bare `as`;
- an event derived with `fields(...)`, one transition, and a `wire` footer, so the aggregate
  is complete and valid;
- a contract whose event carries the same two alias shapes on `typeid`/`text`/`int` fields.

Constraints, each of which otherwise costs a debugging cycle: the comment banner must not
contain the literal phrases the tests anchor on (in particular not `haskell payloadType`, not
`as "region_code"`, and no stray `int` or lowercase `text` before the code); the `id` prefix
must be a legal TypeID prefix; the preamble must be line 1.

Acceptance: the file exists, its first line is exactly `language keiro-dsl 4`, and
`corpus/README.md` describes it in the same voice as its neighbours.


### Milestone 3 — assert the new sample in both suites

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`. Both suites load `corpus/field-aliases.keiro`
and assert: the alias markers `haskell` and `as` are control keywords in an aggregate field
list and in a contract field; the selector identifier carries no group/scope at all; the wire
key is a String; the field named `as` still colours as a keyword; and the declarations around
the aliases are undisturbed. Also update the stale version-4 comment block in each suite (see
Surprises & Discoveries).

In the Shiki suite the negative assertion on the selector uses `scopesOf` plus the
`KEYWORDISH_SCOPES` filter, the same shape as the qualified-enum-member test; `as` is asserted
with `expectScope` (not `expectWholeToken` — see Surprises & Discoveries). In the Vim suite the
selector uses `expect_no_group` and the field named `as` uses `expect_uniform` anchored on
`as:Text`.

Acceptance: both suites report the new checks passing in Milestone 4.


### Milestone 4 — run both suites

Scope: no edits. Run both suites, confirm zero failures, and record the transcripts in
Validation and Acceptance, including the before/after counts.


## Concrete Steps

All commands run from the repository root `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless
stated otherwise.

First, re-confirm the upstream facts this plan rests on. The surface diff (expect exactly the
six-file diffstat shown in Surprises & Discoveries — `Parser.hs`, `Parser/Core.hs`, and
`Frontend.hs` must be absent from it):

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
git diff --stat fd5e4275074f39d3fb8b82a9d8bc7c9a539727f1..fc80cbd011cf3bc2c8e2c882ef677233dbe33529 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
     keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
     keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs keiro-dsl/src/Keiro/Dsl/Frontend.hs
```

And the reserved-word check (expect an empty diff and `72`):

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
awk '/^reservedWords/,/\]/' keiro-dsl/src/Keiro/Dsl/Parser/Core.hs \
  | grep -o '"[a-zA-Z-]*"' | tr -d '"' | sort -u > /tmp/upstream_rw.txt
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
grep -n 'Section 3 — Reserved keywords' spec/keiro-dsl-language-model.md
sed -n '<grid-start>,<grid-end>p' spec/keiro-dsl-language-model.md \
  | tr -s ' ' '\n' | grep -v '^$' | sort -u > /tmp/spec_rw.txt
diff /tmp/upstream_rw.txt /tmp/spec_rw.txt && wc -l < /tmp/spec_rw.txt
```

(The grid was at lines 244–255 when this plan was written; locate it with the `grep -n` first,
as spec edits shift it. A wrong range fails loudly here and nowhere else.)

Second, record the suite baselines:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test 2>&1 | tail -4
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh 2>&1 | tail -2
```

```text
 76 pass
 0 fail
 387 expect() calls
Ran 76 tests across 1 file.

405 checks, 0 failures
```

Third, perform Milestone 1's three spec edits, then Milestone 2's new file and README entry, as
described in Plan of Work.

Fourth, for Milestone 3, add the new corpus constant and assertions to each suite. If unsure
what scope or group a token actually receives, write one deliberately wrong expectation, run
the suite, and read the received value out of the failure message rather than guessing:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test -t "field alias" 2>&1 | head -20
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh 2>&1 | grep -i 'fail\|got'
```

Fifth, run both suites in full (Milestone 4):

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh
```

Sixth, write the one-line Conventional Commits subject the calling automation will use:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
printf '%s\n' 'docs(spec): record keiro-dsl field aliases (syntax profile 3) and cover haskell/as-aliased fields in the corpus' \
  > .keiro-dsl-sync-subject
```

Do not run `git add`, `git commit`, or `git push`, and do not write to `spec/.keiro-dsl-sync` —
the calling script re-runs both suites itself and owns the commit.


## Validation and Acceptance

The observable outcome is that both highlighter suites tokenize the field-alias clause keiro-dsl
`b31896cf` added — in both of its grammatical homes — and say so in named checks: the markers
`haskell` and `as` colour as control keywords between a field name and its type, the selector
identifier stays plain, the wire key stays a String, and the vocabulary collisions upstream
itself writes (`type` aliased, a field named `as`) colour by Section 1's rule.

Run the Shiki suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

Observed — 81 tests pass, zero fail (76 before this plan, plus five new tests, 415 `expect()`
calls against 387 before):

```text
 81 pass
 0 fail
 415 expect() calls
Ran 81 tests across 1 file. [1041.00ms]
```

The five new tests, three of which are matched by `bun test -t "field alias"` (the other two
are named for what they pin — `the alias selector identifier stays plain` and `the alias wire
key is an ordinary string`):

```text
the field alias markers get keyword.control in an aggregate field list
the field alias markers get keyword.control in a contract field
a field alias leaves its neighbours undisturbed
the alias selector identifier stays plain
the alias wire key is an ordinary string
```

Run the Vim suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh
```

Observed — every line reads `ok`, 425 checks (up from 405), zero failures, and the run still
ends with the three word-grid counts, which this plan must leave unchanged. The twenty new
checks in full:

```text
ok   "# keiro-dsl field aliases" -> keiroComment
ok   "language keiro-dsl 4" -> keiroKeyword
ok   "haskell payloadType" -> keiroStatement
ok   "haskell" -> keiroStatement (all 7 characters)
ok   "as \"region_code\"" -> keiroStatement
ok   "as" -> keiroStatement (all 2 characters)
ok   "\"region_code\"" -> keiroString
ok   "payloadType:Text" at offset 0 -> (no group)
ok   "serviceRegion" at offset 0 -> (no group)
ok   "type" -> keiroStatement (all 4 characters)
ok   "as" -> keiroStatement (all 2 characters)
ok   "haskell" -> keiroStatement (all 7 characters)
ok   "as" -> keiroStatement (all 2 characters)
ok   "typeid \"parcel\"" -> keiroType
ok   "text" -> keiroType (all 4 characters)
ok   "int" -> keiroType (all 3 characters)
ok   "contract parcelSignals" -> keiroKeyword
ok   "emit Observed" -> keiroKeyword
ok   "goto Dispatched" -> keiroStatement
ok   "-->" -> keiroOperator
...
ok   reserved-word count -> 72
ok   bare contextual-keyword count -> 100
ok   dashed contextual-keyword count -> 32

425 checks, 0 failures
```

A failure naming a corpus line is a real defect in the new sample or assertions; a failure
naming one of the three counts means Milestone 1's edits strayed into a word grid, which they
must not.

To see the coverage is effective beyond compilation, break the corpus file and watch the new
assertions fail rather than pass vacuously — replace the aggregate's `haskell` marker with a
misspelling and re-run:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
sed -i.bak 's/type haskell payloadType/type haskel payloadType/' corpus/field-aliases.keiro
(cd packages/shiki-keiro && bun test -t "field alias")
./packages/keiro-vim/test/run.sh 2>&1 | grep -E 'FAIL|MISSING|checks,'
mv corpus/field-aliases.keiro.bak corpus/field-aliases.keiro
```

This was performed and the failures observed. The `sed` pattern carries no colon, so it breaks
the marker in *both* homes — the aggregate line (`…payloadType:Text`) and the contract line
(`…payloadType: text`) — and every assertion anchored on either fails by name, in both suites:

```text
(fail) the field alias markers get keyword.control in an aggregate field list [15.80ms]
(fail) the field alias markers get keyword.control in a contract field [3.84ms]
(fail) a field alias leaves its neighbours undisturbed [2.94ms]
 0 pass
 3 fail
```

```text
MISSING token "haskell payloadType" in current buffer
MISSING token "haskell" in current buffer
MISSING token "type" in current buffer
MISSING token "haskell" in current buffer
425 checks, 4 failures
```

(The third Vim line is the collision check on the field named `type`, whose anchor is the full
aggregate alias line — proof the assertion is anchored on the code, not on any occurrence of
the word.) Restore the file before continuing; if the `.bak` move was missed,
`git checkout -- corpus/field-aliases.keiro` restores it once committed.


## Idempotence and Recovery

Every step is safe to repeat. The spec edits replace prose with prose and are no-ops the second
time. The corpus file is created whole, so re-running rewrites identical content. The test
additions are inserted blocks; if a run is interrupted midway, `git diff` shows exactly what
landed and `git checkout -- <path>` restores any file. Nothing here is destructive: no upstream
file is written and the plan explicitly does not stage or commit anything. If the whole plan
must be abandoned, `git status` lists exactly seven paths — this plan file,
`spec/keiro-dsl-language-model.md`, `corpus/field-aliases.keiro`, `corpus/README.md`,
`packages/shiki-keiro/test/scopes.test.ts`, `packages/keiro-vim/test/highlight_spec.lua`, and
`.keiro-dsl-sync-subject` — and discarding them returns the tree to its prior state.

The one step that is not idempotent by construction is the non-vacuousness check in Validation
and Acceptance, which edits the corpus file in place; it writes a `.bak` alongside and the
transcript restores it on the next line.


## Interfaces and Dependencies

No new library, package, or service is introduced. The Shiki suite continues to run under `bun`
(`bun install && bun test` inside `packages/shiki-keiro`); the Vim suite continues to run under
headless Neovim via `packages/keiro-vim/test/run.sh`.

At the end of Milestone 2 the file `corpus/field-aliases.keiro` must exist with
`language keiro-dsl 4` as its first line, and `corpus/README.md` must carry an entry for it. At
the end of Milestone 3 `packages/shiki-keiro/test/scopes.test.ts` must define a top-level
constant holding that file's text (read with `readFileSync(resolve(repoRoot, …), 'utf8')`, like
its neighbours), and `packages/keiro-vim/test/highlight_spec.lua` must call
`open('corpus/field-aliases.keiro')` before its assertions over it.

The upstream interface this plan depends on is in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`: the
`LanguageFeature` constructor `FieldAliasSyntax`, the value
`profileV3 :: SyntaxProfile` (`"keiro-dsl/syntax-profile/3"`), and the registry entry
`LanguageDefinition version4 (Just version3) LanguageBodyParserV2 profileV3 runtimeProfileV3 Stable`;
together with `pAggregateField` in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser/Aggregate.hs` and
`pContractField` (inside `pContract`) in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser/Integration.hs`. Nothing in
this repository imports any of them; they are read by a human and transcribed into the spec.


## Revision Notes

**2026-08-05 — plan written and implemented in one pass by the `sync-keiro-dsl` automation.**
The Validation and Acceptance transcripts are recordings of actual runs, not predictions. The
Surprises & Discoveries entry about `expectWholeToken` and the substring `as`-in-`haskell` trap
was found while writing Milestone 3 and shaped the Decision Log entry about corpus ordering.

**2026-08-05 — estimated figures replaced with measured ones after the suites ran.** The
first draft of Validation and Acceptance carried estimated totals (403 Shiki `expect()` calls,
424 Vim checks) and a predicted non-vacuousness transcript. The measured values are 415 Shiki
`expect()` calls and 425 Vim checks (387 / 405 before this plan), and the non-vacuousness run
showed something the prediction missed: the `sed` pattern, carrying no colon, breaks the
`haskell` marker in *both* grammatical homes at once, so three Shiki tests and four Vim checks
fail rather than one of each. The transcript now records that run verbatim, and the Vim
transcript lists all twenty new checks. No milestone, decision, or scope changed.
