---
id: 18
slug: record-the-keiro-dsl-bare-container-mapping-shape-mapped-structural-value-and-cover-it-in-the-corpus
title: "Record the keiro-dsl bare container mapping shape (mapped structural value) and cover it in the corpus"
kind: exec-plan
created_at: 2026-09-20T01:23:44Z
provenance:
  created_by:
    model: "claude-opus-5"
    harness: "claude-code"
    at: 2026-09-20T01:23:44Z
  revisions:
    - model: "claude-opus-5"
      harness: "claude-code"
      at: 2026-09-20T01:30:17Z
      mode: "implement"
      note: "Implemented all four milestones; both suites green (Shiki 97/0, Vim 606/0)"
---

# Record the keiro-dsl bare container mapping shape (mapped structural value) and cover it in the corpus

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.
If durable project context changes, update or create ADRs in docs/adr/ in the same change.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter at
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file of
regular expressions that assigns each matched piece of text a dotted *scope name* such as
`keyword.control.keiro`; editors and Shiki colour text by scope name.) Both are driven by one
written contract, `spec/keiro-dsl-language-model.md`, which this repository keeps in step with the
upstream parser for the language, keiro-dsl, in the separate `keiro` repository (canonical project
URI `mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb` (short form `a6110a94`, subject
*feat(dsl): add checked bare container mappings*), the head of the eleven-commit range
`9fb54d56db4f2aedb2dd1cf9aa2016b93ff7c822..a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb`. Only the
head commit touches the parser at all, and it touches it in four added lines.

The range gives `mapped structural` a **fourth shape**. Until now a `mapped structural`
declaration described a *record* (a JSON object), an *enum* (a JSON string), or a *union* (a
tagged JSON object), and every one of them wrote its encoding as a braced `wire … { … }` block.
The new shape says the declared Haskell type *is* a container — an `Optional`, a `List`, a `Map`,
or a nesting of those — and writes its encoding as a single unbraced line:

```text
mapped structural value MaybeText {
  haskell package=keiro-dsl module=Conformance.BareContainers.Domain type=MaybeText
  binding = "Conformance.BareContainers.Bindings.maybeTextBinding"
  binding-version = "1"
  canonical-type = "conformance.bare-containers.MaybeText.v1"
  fixtures = "Conformance.BareContainers.Bindings.maybeTextFixtures"
  initial = "Conformance.BareContainers.Bindings.initialMaybeText"
  wire Optional Text
}
```

**The change adds no word to the language.** The shape selector is `value`, which this
repository's `spec/keiro-dsl-language-model.md` Section 4 has carried as a curated contextual
keyword since `docs/plans/4-reconcile-highlighters-with-keiro-dsl-lexical-surface-20-new-reserved-words-string-escapes-signed-decimal-numbers.md`
(it is the last clause word of a workflow signal operation, `signal … via … value <Type>`). The
bare encoding line is headed by `wire`, which is a reserved word (Section 3) and has been coloured
since the first corpus. `Optional`, `List`, `Map`, and `Text` are already Primitive types; the
parentheses in `wire List (Optional ItemId)` are uncoloured punctuation, as they already are in
`Optional(Text)`. So both packages already colour every keyword on every line of the new shape,
and `reservedWords` is byte-identical across the range.

What is *not* already right is the **name the new shape declares**. Section 6's optional
*Declaration-site type name* refinement colours the CamelCase identifier that follows a `mapped`
declaration's family or shape word — `record X`, `union X`, `opaque X`, `nominal X` — and `value X`
is a fifth such position that neither package knows about. Before this plan,
`mapped structural record ArtifactInfo` shows `ArtifactInfo` in the type colour while
`mapped structural value MaybeText` leaves `MaybeText` plain.

After this plan:

- `spec/keiro-dsl-language-model.md` describes the fourth shape, the bare `wire <Type>` encoding
  line, and why `value` keeps the Control / section keyword class it already has instead of
  joining `record` and `union` as a Modifier.
- The Shiki grammar colours `MaybeText` in `mapped structural value MaybeText` as
  `entity.name.type.keiro`, and the Vim syntax file lists `value` in its
  Declaration-site-type-name rule for parity.
- `corpus/consumer-mapped-bare-containers.keiro` is upstream's own checked fixture for the
  feature, and both suites tokenize it by name.


## Progress

- [x] (2026-09-20 01:05Z) Read the parser diff for the whole range; confirmed the only parser
  change is four lines in `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` and that
  `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` — which owns `reservedWords` — is untouched.
- [x] (2026-09-20 01:10Z) Confirmed `value` is already in Section 4's bare grid and `wire` is
  already in Section 3, so the range adds **no new word**; Section 3 stays at 72 and Section 4
  stays at 139 bare / 56 dashed.
- [x] (2026-09-20 01:30Z) Milestone 1: `spec/keiro-dsl-language-model.md` Sections 1, 4, and 6
  updated. Section 4's mapped-type subsection went from "three shapes" to four, gained a worked
  example of the bare form and two fact bullets, and both Section 6 rows now name `value`. No word
  grid was touched, so both suites' count guards stayed green throughout.
- [x] (2026-09-20 01:35Z) Milestone 2: `#bare-mapped-decl-with-name` added to
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` and `value` added to `keiroTypeName` in
  `packages/keiro-vim/syntax/keiro.vim`.
- [x] (2026-09-20 01:40Z) Milestone 3: `corpus/consumer-mapped-bare-containers.keiro` copied
  verbatim from upstream (`diff` clean) and recorded in `corpus/README.md`.
- [x] (2026-09-20 01:50Z) Milestone 4: assertion blocks added to both suites over the new sample
  *and* over `corpus/workflow-signal-mismatch.keiro`, which neither suite had touched before.
  Shiki `97 pass / 0 fail`; Vim `606 checks, 0 failures`.


## Surprises & Discoveries

- Observation: the range's only parser edit is four lines, and `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`
  — the module that owns `reservedWords` — is not in the diff at all.
  Evidence: `git diff --name-only 9fb54d56..a6110a94 -- keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`
  prints nothing; the diffstat for the whole parser tree is
  `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs | 6 +-`.

- Observation: a whole new grammar shape arrived without a single new word. Every token on every
  line of `mapped structural value X { … wire Optional Text }` was already matched by both
  packages before this plan. This is the strongest instance yet of the warning Section 3 already
  carries — "a stable Section 3 does not mean a stable language" — extended one step further: a
  stable *Section 4* does not either.
  Evidence: adding the corpus file and running both suites before any grammar edit produced no
  failure; the only observable gap was `MaybeText` rendering plain under Shiki.

- Observation: `value` is a heavily used *identifier* upstream, not just a keyword. Twenty-one
  fixtures under `keiro-dsl/test/fixtures/` open a wire field with `value as "…" : …`. A
  declaration-with-name rule that accepted any identifier after `value` would have claimed the
  alias marker `as` in every one of them as a type name.
  Evidence: `grep -rl 'value as "' keiro-dsl/test/fixtures/ | wc -l` prints `21`. Fixed by
  requiring an uppercase initial in the new rule, which is what Section 6 specified all along.

- Observation: neither suite had ever asserted anything about
  `corpus/workflow-signal-mismatch.keiro`, one of the five original corpus files. It is loaded by
  neither `scopes.test.ts` nor `highlight_spec.lua` before this plan.
  Evidence: `grep -n workflow-signal-mismatch packages/*/test/*` returned nothing. This plan adds
  the first assertions over it, which is also where the `value`-classification non-regression
  lives.

- Observation: `expectScope` in the Shiki suite and `locate` in the Vim suite both anchor on the
  *first* occurrence of a literal, and `ReservationConfirmation` appears on line 10 of
  `corpus/workflow-signal-mismatch.keiro` as the target of an `await … ->` arrow — where it is
  plain and must stay plain — before its line-28 appearance after `value`. The first draft of the
  Shiki assertion failed for exactly that reason.
  Evidence: `expect(received).toContain("entity.name.type.keiro") / Received: [ "source.keiro" ]`.
  Fixed by switching to the anchored `expectWholeToken(…, 'value ReservationConfirmation')`.

- Observation: Shiki merges `(Optional ItemId)`'s trailing plain text into one explanation entry,
  so `ItemId` is not a token of its own. The "stays plain" check has to search for a part
  *containing* the identifier rather than equal to it.
  Evidence: `expect(reference, 'ItemId should be its own plain token').toBeDefined() / Received:
  undefined`.


## Decision Log

- Decision: Classify the shape selector `value` as a **Control / section keyword**, not as a
  Modifier beside `record` / `union` / `structural` / `opaque` / `nominal`.
  Rationale: highlighting here is purely lexical (Section 1 of the spec), so a word gets exactly
  one class everywhere it appears. `value` already has an older and more frequently written role —
  the final clause word of a workflow signal operation, `signal … via … value <Type>`, which
  `corpus/workflow-signal-mismatch.keiro` has exercised since the first corpus — and that role is a
  clause label, which is what the Control class is for. Promoting the word would recolour that
  older site to win consistency on the newer one. The spec already records exactly this trade-off
  for `enum`: `mapped structural enum X` shows its shape word in the *introducer* colour because
  `enum` is a reserved introducer everywhere, and the spec calls that asymmetry "inherent to
  lexical highlighting and not worth working around". `value` is the same situation with the
  Control class in place of the introducer class.
  Date: 2026-09-20

- Decision: Implement the `value X` type-name refinement with a **separate** Shiki rule rather
  than by adding `value` to the existing `#mapped-decl-with-name` rule.
  Rationale: `#mapped-decl-with-name` gives its first capture the `storage.modifier.keiro` scope,
  which is correct for `record` / `union` / `opaque` / `nominal` and wrong for `value` under the
  decision above. A separate rule can keep capture 1 on `keyword.control.keiro` so `value` reads
  identically in both of its homes.
  Date: 2026-09-20

- Decision: Require an **uppercase-initial** name in the new Shiki rule
  (`[A-Z][A-Za-z0-9_]*`), where the two older declaration-with-name rules accept any identifier.
  Rationale: `value` is a common *field* name in upstream's own mapped fixtures — twenty-one of
  them open a wire field with `value as "…" : …`. A rule accepting any identifier after
  `value` would claim the alias marker `as` in that line as a type name. Section 6 already
  specifies this class as "a CamelCase plain identifier", so the narrower pattern is the one the
  spec asks for; the older rules are simply looser than their own contract, and tightening them is
  out of scope here.
  Date: 2026-09-20

- Decision: Copy upstream's `keiro-dsl/test/fixtures/bare-containers.keiro` **verbatim** into the
  corpus rather than hand-writing a sample.
  Rationale: the corpus README's provenance rules prefer verbatim upstream fixtures, and this one
  is upstream's authoritative fixture for the feature — `keiro-dsl/test/Main.hs` parses it with
  `checkedServiceFromText`, round-trips it through the pretty-printer, scaffolds from it, and
  asserts a language-5 source is refused — so a verbatim copy proves both packages tokenize text
  that really is valid keiro-dsl. It also happens to carry all four bare wire forms
  (`Optional Text`, `List Text`, `Map Text`, and the nested, parenthesised `List (Optional ItemId)`)
  in one file, which no hand-written sample would obviously get right.
  Date: 2026-09-20

- Decision: Accept that adding `value` to the type-name refinement also colours
  `ReservationConfirmation` in `corpus/workflow-signal-mismatch.keiro`'s
  `value ReservationConfirmation` line.
  Rationale: that slot genuinely names a type — upstream's `Keiro/Dsl/Validate.hs` binds it as
  `valueType` and resolves it against the declared types — so the colour is accurate even though
  the site is a *use* rather than a *declaration*. No existing assertion in either suite pins that
  identifier, so nothing regresses. The class name stays "Declaration-site type name"; the spec
  records the one use site it now also claims.
  Date: 2026-09-20


## Outcomes & Retrospective

All four milestones are complete and both suites are green: Shiki `97 pass / 0 fail / 624 expect()
calls` (up from 92/0 before), Vim `606 checks, 0 failures` (up from 585).

Against the original purpose:

- **The spec describes the fourth shape.** `spec/keiro-dsl-language-model.md` Section 1 records
  `BareStructuralMappingSyntax` as version 6's newest feature and states it costs no word;
  Section 4's mapped-type subsection covers four shapes with a worked example of the bare form and
  two new fact bullets; Section 6 names `value X` in the Declaration-site-type-name row and gives
  the Control row the reason `value` stays put. Section 3 is still 72 words and Section 4 is still
  139 bare / 56 dashed — the mechanical guards in both suites confirm it.
- **Both highlighters agree with it.** Shiki colours `MaybeText` as `entity.name.type.keiro` while
  `value` keeps `keyword.control.keiro`; Vim carries the parity edit on its (still inert, still
  compliant) `keiroTypeName` rule.
- **The corpus exercises it.** `corpus/consumer-mapped-bare-containers.keiro` is byte-identical to
  upstream's checked fixture and both suites tokenize it by name.

What went differently than planned: nothing in scope, but two assertion drafts had to be anchored
or loosened for reasons the corpus text — not the grammar — forced (see Surprises & Discoveries).
The plan also picked up unplanned coverage: `corpus/workflow-signal-mismatch.keiro` now has
assertions in both suites for the first time, which is where the classification decision for
`value` is pinned against regression.

Durable context worth keeping: the classification rule this plan applied twice — *a word gets
exactly one class, and when a new grammar position conflicts with an older one, the older and more
frequently written site wins* — now has two recorded instances (`enum` in plan 8, `value` here)
and is stated in Section 4 of the spec, which is this repository's durable contract. There is no
`docs/adr/` directory here and this plan does not create one; the spec is where that rule belongs,
and it is recorded there rather than only in this plan.


## Context and Orientation

**There are no ADRs in this repository.** `docs/` contains only `docs/plans/` and
`docs/masterplans/`; there is no `docs/adr/` directory, so no ADR is cited here and none is
created by this plan. Durable context for this repository lives in
`spec/keiro-dsl-language-model.md` and in the numbered plans under `docs/plans/`.

### The four artifacts this repository keeps in agreement

1. `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 3 is a **verbatim
   copy** of the parser's `reservedWords` list (currently 72 words); Section 4 is a *curated* list
   of words the parser recognises in context but does not reserve (currently 139 bare and 56
   dashed); Section 6 is the token-class taxonomy that says which bucket each word lands in and
   which TextMate scope / Vim highlight group each bucket maps to.
2. `packages/keiro-vim/syntax/keiro.vim` — a Vim syntax file. It declares `syntax keyword` and
   `syntax match` rules and links each `keiro*` group to a standard Vim highlight group at the
   bottom of the file.
3. `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar. Its top-level
   `patterns` array fixes rule precedence: at a given position, the first listed rule that matches
   wins.
4. `corpus/*.keiro` — read-only `.keiro` sample files both test suites load and assert against.
   `corpus/README.md` records where each file came from and what it is for.

### What the upstream range changes

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  9fb54d56db4f2aedb2dd1cf9aa2016b93ff7c822..a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Four files, 131 insertions:

- `keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs` (+4/-2) — the only parser change in the range. A
  fourth constructor `MappedBare` joins `MappedRecord | MappedEnum | MappedUnion`; the `choice`
  that reads a structural declaration's shape word gains
  `MappedBare <$ languageFeatureKeyword context BareStructuralMappingSyntax "value"`; and
  `pMappedShape` gains `MappedBare -> ShapeBare <$> pMappedTypeExpr context`.
  `languageFeatureKeyword` is the same helper the Language 5 and 6 words use: it matches the
  literal and then fails with a `LanguageFeatureRequiresVersion` diagnostic if the source's
  declared version does not own the feature. Section 1 of the spec's standing rule applies — a
  version gate is a parser concern and a highlighter models none of it.
- `keiro-dsl/src/Keiro/Dsl/Grammar.hs` (+1) — `ShapeBare !TypeExpr` joins the `MappedShape` sum.
- `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (+2) — renders the shape word as `value` and the
  encoding as `"wire" <+> docTypeExpr expression`. This is the only place the *bare* form of
  `wire` is spelled out, and it confirms the encoding line is `wire` followed by a type expression
  with no braces.
- `keiro-dsl/test/fixtures/bare-containers.keiro` (+124) — upstream's new fixture, copied into
  this repository by Milestone 3.

`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` (outside the paths above, but worth naming) adds the
`LanguageFeature` value `BareStructuralMappingSyntax` to syntax profile
`keiro-dsl/syntax-profile/5` — which is language version **6**, the candidate contract — and the
`RuntimeCapability` value `BareStructuralMappings` to `keiro-dsl/runtime-semantics/5`. The
released-version registry still holds six versions; no version is added.

Everything else in the range is documentation (a 90-file terminology catalog, improvement
requests, plans) or replay-compatibility test support in `keiro-test-support/` and `keiro/`.
None of it is lexical.

### Why the lexical surface is nearly unchanged

- `value` — already Section 4 bare grid, row 2 (`key value run signal query project`). Both
  packages match it unconditionally: `syntax keyword keiroStatement … value …` in
  `packages/keiro-vim/syntax/keiro.vim`, and the `value` alternative of `#control-keywords` in
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`.
- `wire` — Section 3 reserved word #16. Both packages match it unconditionally.
- `Optional`, `List`, `Map`, `Text`, and the reference `ItemId` — the bare encoding line's type
  slot is `pMappedTypeExpr`, unchanged by this range, and Section 6's Primitive-type row already
  matches its literal spellings everywhere. A reference to another mapped type (`ItemId`) is a
  plain identifier and stays uncoloured, exactly as it does in a `: MaybeText` wire field today.
- Parentheses in `wire List (Optional ItemId)` — uncoloured punctuation. Section 5 does not claim
  brackets or parentheses, and `corpus/aggregate-scalar-types.keiro` already carries
  `Optional(Text)` with the same treatment.

### The one gap: the declaration-site type name

Section 6's *Declaration-site type name* row currently reads, in part: "…or immediately after a
`mapped` declaration's family or shape word (`record X`, `union X`, `opaque X`, `nominal X`;
`mapped structural enum X` is already covered by the `enum X` case)". `value X` is a fifth such
position.

The two packages implement that row very differently, and the difference matters here:

- **Shiki implements it.** `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` has a
  `mapped-decl-with-name` rule listed *before* `#modifiers` in the top-level `patterns` array, so
  it wins the tie at the shape word's position and claims two tokens: capture 1 keeps
  `storage.modifier.keiro`, capture 2 gets `entity.name.type.keiro`.
- **Vim does not.** `packages/keiro-vim/syntax/keiro.vim` has a `keiroTypeName` match, but the
  file's own comment records that it "is currently inert, and has been since it was written":
  Vim tries syntax items only at the current scan column and a `syntax keyword` outranks a
  `syntax match` there, so the shape word is consumed by its keyword rule and the scan resumes
  past the point where this pattern would have to start. `\zs` moves the highlighted region, not
  the required start. Section 6 marks the class an *optional refinement*, so Vim is compliant
  without it; the rule is still kept in step with Section 6 so a future plan that makes it fire
  gets the right behaviour for free. This plan does not make it fire.

### The test suites

- `packages/shiki-keiro/test/scopes.test.ts` (Bun). Loads each corpus file with `readFileSync`
  and asserts with two helpers: `expectScope(code, content, scope)` finds the first sub-token
  whose trimmed text equals `content` and asserts the scope is present;
  `expectWholeToken(code, content, scope, anchor?)` additionally proves no shorter rule split the
  literal, and its optional `anchor` restricts the search to lines containing a phrase. There are
  also mechanical guards at the end of the file that read Section 3's and Section 4's fenced word
  lists straight out of the spec and assert both counts and that every listed word is classified
  as *some* kind of keyword.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` under
  headless Neovim. `open(relpath)` loads a corpus file, `expect(phrase, group)` asserts the
  highlight group at the phrase's *first character* on the first line containing the phrase, and
  `expect_uniform(word, group, anchor?)` asserts the group on every character. It carries the same
  spec word-list guards.

Neither suite pins `value`'s class or `ReservationConfirmation`'s scope today, which is why the
grammar change in Milestone 2 does not break anything before Milestone 4 adds assertions.


## Plan of Work

Four milestones, in the order the sync instructions require: spec first, then the two
highlighters, then the corpus, then the tests.

### Milestone 1 — correct the spec

Scope: `spec/keiro-dsl-language-model.md` only. At the end of this milestone the spec describes
the fourth structural shape, the bare `wire <Type>` encoding line, and the classification of
`value`, and Section 6's Declaration-site-type-name row names `value X`.

Three edits:

1. **Section 1**, in the paragraph beginning "**Versions 5 and 6 are the first to add real
   vocabulary since the mapped type declaration.**", append a sentence recording that keiro-dsl
   `a6110a94` added one more feature to version 6's syntax profile,
   `BareStructuralMappingSyntax`, and that it adds no word.
2. **Section 4**, in the subsection "The mapped type declaration": change "comes in three
   **shapes**" to four and describe `value`; add a fact bullet for the bare encoding line; and
   state explicitly that the declaration's word count (28: 23 bare, 5 dashed) is *unchanged*,
   because `value` is borrowed from elsewhere in Section 4 rather than supplied by this
   declaration.
3. **Section 6**: extend the Declaration-site-type-name row with `value X`, and extend the
   Control / section keyword row with the note that `value` selects the bare shape and stays a
   control keyword.

Acceptance: `rg -n 'mapped structural value' spec/keiro-dsl-language-model.md` returns matches in
Sections 4 and 6; both suites still pass their Section 3 / Section 4 count guards (72, 139, 56 —
unchanged), which they will, because no word list is edited.

### Milestone 2 — teach both highlighters the `value X` type name

Scope: `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` and
`packages/keiro-vim/syntax/keiro.vim`.

Shiki gains a new repository entry, `bare-mapped-decl-with-name`, included in the top-level
`patterns` array immediately after `#mapped-decl-with-name` (so it is ahead of
`#control-keywords`, which would otherwise claim `value` alone and stop the scan before the name).
Its capture 1 carries `keyword.control.keiro` — `value`'s existing class — and its capture 2
carries `entity.name.type.keiro`, restricted to an uppercase-initial identifier for the reason in
the Decision Log.

Vim adds `value` to the `keiroTypeName` alternation and extends the comment above it. The rule is
inert, so this is a parity edit that costs nothing and keeps the file honest against Section 6.

Acceptance: both suites are still green (nothing asserts the new behaviour yet), and a one-off
probe shows `MaybeText` carrying `entity.name.type.keiro` under Shiki.

### Milestone 3 — add the corpus sample

Scope: `corpus/consumer-mapped-bare-containers.keiro` (new, verbatim from upstream) and
`corpus/README.md` (a provenance entry appended to the "Copied later" list).

Acceptance: the new file is byte-identical to upstream's
`keiro-dsl/test/fixtures/bare-containers.keiro` at `a6110a94`, provable with `diff`.

### Milestone 4 — assert the sample in both suites and run them green

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`.

Each suite gains one block over the new corpus file asserting: the `mapped` introducer and
`structural` modifier are undisturbed; `value` is a control keyword in the shape position; the
bare `wire` line is a control keyword followed by primitive types, including the nested
parenthesised form; the clause labels inside the block keep the classes they have in the older
mapped families; and the aggregate, workqueue, projection-catalog and readmodel nodes beneath the
declarations still tokenize. Shiki additionally asserts `MaybeText` is
`entity.name.type.keiro`; Vim deliberately does not, for the inert-rule reason recorded in
Context and Orientation and already recorded against the other mapped families.

Acceptance: `cd packages/shiki-keiro && bun install && bun test` reports `97 pass / 0 fail`, and
`./packages/keiro-vim/test/run.sh` reports `606 checks, 0 failures`.


## Concrete Steps

All commands run from `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless stated otherwise.

### Step 0 — re-derive the parser facts

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --stat \
  9fb54d56db4f2aedb2dd1cf9aa2016b93ff7c822..a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb -- \
  keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
  keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
  keiro-dsl/test/fixtures
```

Expected:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs            |   1 +
 keiro-dsl/src/Keiro/Dsl/Parser/Mapped.hs      |   6 +-
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs        |   2 +
 keiro-dsl/test/fixtures/bare-containers.keiro | 124 ++++++++++++++++++++++++++
 4 files changed, 131 insertions(+), 2 deletions(-)
```

Prove `reservedWords` did not move — `Parser/Core.hs` owns it, and the file is absent from the
diffstat above:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff --name-only \
  9fb54d56db4f2aedb2dd1cf9aa2016b93ff7c822..a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb -- \
  keiro-dsl/src/Keiro/Dsl/Parser/Core.hs
```

Expected: no output.

### Step 1 — Milestone 1, spec edits

Edit `spec/keiro-dsl-language-model.md` as described in Plan of Work. Then confirm the word lists
were not disturbed:

```bash
rg -n 'contains exactly \*\*72\*\* words' spec/keiro-dsl-language-model.md
rg -c '^value ' spec/keiro-dsl-language-model.md || true
```

### Step 2 — Milestone 2, grammar edits

Add to `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`:

```json
{ "include": "#bare-mapped-decl-with-name" }
```

immediately after the `#mapped-decl-with-name` include, and this repository entry beside
`mapped-decl-with-name`:

```json
"bare-mapped-decl-with-name": {
  "match": "(?<![A-Za-z0-9_-])(value)(?![A-Za-z0-9_-])\\s+([A-Z][A-Za-z0-9_]*)",
  "captures": {
    "1": { "name": "keyword.control.keiro" },
    "2": { "name": "entity.name.type.keiro" }
  }
}
```

In `packages/keiro-vim/syntax/keiro.vim`, add `value` to the `keiroTypeName` alternation.

### Step 3 — Milestone 3, corpus

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb:keiro-dsl/test/fixtures/bare-containers.keiro \
  > corpus/consumer-mapped-bare-containers.keiro
```

Verify it is verbatim:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro show \
  a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb:keiro-dsl/test/fixtures/bare-containers.keiro \
  | diff - corpus/consumer-mapped-bare-containers.keiro && echo VERBATIM
```

Expected: `VERBATIM`.

Then append the provenance entry to `corpus/README.md`.

### Step 4 — Milestone 4, tests and suites

```bash
cd packages/shiki-keiro && bun install && bun test
```

```bash
./packages/keiro-vim/test/run.sh
```


## Validation and Acceptance

**Both suites green.** From the repository root:

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

Expected tail: `97 pass`, `0 fail`, `624 expect() calls`.

```bash
./packages/keiro-vim/test/run.sh
```

Expected tail: `606 checks, 0 failures`.

**The behaviour the plan exists for.** With `packages/keiro-vim` on the Neovim runtime path,
`nvim corpus/consumer-mapped-bare-containers.keiro` shows, on line 6
(`mapped structural value MaybeText {`): `mapped` as `Keyword`, `structural` as `StorageClass`,
`value` as `Statement`, and `MaybeText` plain (the Vim refinement is inert — this is the
documented, compliant behaviour). On line 13 (`  wire Optional Text`): `wire` as `Statement`,
`Optional` and `Text` as `Type`. On line 40 (`  wire List (Optional ItemId)`): `wire` as
`Statement`, `List` and `Optional` as `Type`, the parentheses and `ItemId` plain.

Under Shiki the same file gives `MaybeText` the scope `entity.name.type.keiro` while `value`
keeps `keyword.control.keiro`, which is the difference this plan introduces. A one-line probe:

```bash
cd packages/shiki-keiro && bun test --test-name-pattern 'bare container'
```

**The non-regression that matters.** `corpus/workflow-signal-mismatch.keiro` line 28 reads
`value ReservationConfirmation`. After this plan `value` there still carries
`keyword.control.keiro` (Shiki) / `keiroStatement` (Vim) — its class did not change — while
`ReservationConfirmation` gains `entity.name.type.keiro` under Shiki. Both suites assert the
first half explicitly.


## Idempotence and Recovery

Every step is safe to repeat. The spec, grammar, and test edits are ordinary text edits; re-running
them on an already-edited file is a no-op if done with exact-match replacement, and any accidental
double-application is visible as duplicated prose or a duplicated JSON key (which would make
`bun test` fail at grammar load, not silently).

Step 3 rewrites `corpus/consumer-mapped-bare-containers.keiro` wholesale from upstream, so it is
idempotent by construction; the `diff` check immediately after proves it.

Rollback for any milestone is `git checkout -- <path>` on the files it touched. Nothing in this
plan runs a migration, writes outside this repository, or touches the upstream `keiro` checkout —
every upstream command above is a read (`git diff`, `git show`).


## Interfaces and Dependencies

- **`spec/keiro-dsl-language-model.md`** — the contract both packages implement. After Milestone 1
  its Section 3 still holds exactly 72 words and its Section 4 still holds exactly 139 bare and 56
  dashed words; the mechanical guards in both suites read these fenced blocks directly, so any
  accidental edit to a word grid fails a named test.
- **`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`** — after Milestone 2 its `repository`
  object contains the key `bare-mapped-decl-with-name` with a two-capture `match`, and its
  top-level `patterns` array includes `{ "include": "#bare-mapped-decl-with-name" }` between
  `#mapped-decl-with-name` and `#introducers`. Order is the interface: a rule listed after
  `#control-keywords` would never fire.
- **`packages/keiro-vim/syntax/keiro.vim`** — after Milestone 2 its `keiroTypeName` match lists
  `value` among the introducer and shape words. The rule remains inert by design.
- **`corpus/consumer-mapped-bare-containers.keiro`** — a read-only input for both suites, byte-identical to
  `keiro-dsl/test/fixtures/bare-containers.keiro` at keiro-dsl `a6110a94`.
- **Toolchain** — Bun for the Shiki suite (`bun install`, `bun test`; the grammar is loaded through
  `packages/shiki-keiro/src/index.ts`, which reads the JSON), and headless Neovim for the Vim
  suite via `packages/keiro-vim/test/run.sh`. Both are already required by plans 3 and 2
  respectively; this plan adds no dependency.
- **Upstream** — `mori://shinzui/keiro`, working copy at `/Users/shinzui/Keikaku/bokuno/keiro`,
  read-only for the purposes of this plan.
