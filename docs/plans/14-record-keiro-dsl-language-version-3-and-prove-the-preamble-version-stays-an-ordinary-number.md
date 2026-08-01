---
id: 14
slug: record-keiro-dsl-language-version-3-and-prove-the-preamble-version-stays-an-ordinary-number
title: "Record keiro-dsl language version 3 and prove the preamble version stays an ordinary number"
kind: exec-plan
created_at: 2026-08-01T19:06:11Z
---

# Record keiro-dsl language version 3 and prove the preamble version stays an ordinary number

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter
at `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file
of regular expressions that assigns each matched piece of text a dotted *scope name* such as
`constant.numeric.keiro`; editors and Shiki colour text by scope name.) Both highlighters are
driven by one written contract, `spec/keiro-dsl-language-model.md`, which this repository keeps
in step with the upstream parser for the language:
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, in the separate `keiro`
repository (canonical project URI `mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`e41e989a9013624136b7af93557919089a16eb4d` (short form `e41e989`, subject
`feat(dsl): define the enforced TypeID domain`), the head of the range
`1d3356546830a2c26a9c04e119b02c81d810594a..e41e989a9013624136b7af93557919089a16eb4d`.

**The headline is that no highlighting rule changes.** The upstream commit adds no reserved
word, removes none, adds no operator or literal form, and changes no comment, string, number,
or identifier rule. `Parser.hs`, `Grammar.hs`, and `PrettyPrint.hs` are byte-identical across
the range. Both highlighter files are already correct and stay byte-for-byte unchanged, and so
do Section 3 (the reserved-keyword list) and Section 6 (the token-class taxonomy) of the spec.

What *did* change is that upstream released a **third language version**. A `.keiro` source may
open with an optional preamble naming the released language contract it was written against,
spelled `language keiro-dsl <positive-decimal>` — for example `language keiro-dsl 2`. Until this
commit the registry of released contracts held exactly two entries, `1` and `2`. It now holds
three, and `spec/keiro-dsl-language-model.md` says in Section 1, in so many words, that it holds
"**two** versions, `1` and `2`". That sentence is now false about the parser this document
claims to be derived from, which is the one thing this specification exists to get right.

The new version 3 is bound to the *same body grammar* as version 2 (upstream calls it
`LanguageBodyParserV2`). So version 3 introduces no new spelling at all: a version-3 source is
lexically a version-2 source that happens to write `3` in its preamble. What version 3 changes
is a **semantic** rule — it is the first contract under which a generated ID's `prefix=` value
is checked against a TypeID prefix domain — and semantic rules are invisible to a highlighter.

What someone gains after this change: a reader of `spec/keiro-dsl-language-model.md` gets an
accurate count of the released language contracts and an accurate account of what version 3
does and does not add; and both test suites gain a sample proving the claim the spec has always
made but never tested with more than one value — that the preamble's version is an ordinary
Number *whatever its value*. Before this plan the corpus contained preambles reading only `1`
and `2`, so a hypothetical highlighter that special-cased those two digits would have passed
every test. You can see the new coverage working by running the two suites named in Validation
and Acceptance and watching the new assertions pass against the new corpus file
`corpus/language-version-3.keiro`.


## Progress

- [x] Read the upstream diff for the range and establish that the lexical surface is unchanged
      (2026-08-01).
- [x] Confirm mechanically that `Parser.hs`, `Grammar.hs`, and `PrettyPrint.hs` are
      byte-identical across the range, and that the spec's 72-word reserved list still matches
      the parser's `reservedWords` exactly (2026-08-01).
- [x] Write this ExecPlan (2026-08-01).
- [x] Milestone 1 — correct the released-version paragraph in Section 1 of
      `spec/keiro-dsl-language-model.md` (2026-08-01).
- [x] Milestone 2 — add `corpus/language-version-3.keiro` and document it in
      `corpus/README.md` (2026-08-01).
- [x] Milestone 3 — extend both suites with assertions over the new corpus file (2026-08-01).
- [x] Milestone 4 — run both suites to green and record the transcripts (2026-08-01).
- [x] Write the Conventional Commits subject to `.keiro-dsl-sync-subject` (2026-08-01).


## Surprises & Discoveries

**The upstream commit is large but lexically inert.** It touches 425 lines of
`keiro-dsl/src/Keiro/Dsl/Scaffold.hs` and adds a whole new module,
`keiro-dsl/src/Keiro/Dsl/IdDomain.hs`, yet the three files that define what a `.keiro` file
*looks like* are untouched. Verified by asking git for a diff restricted to those three paths
and getting an empty result:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
git diff --stat 1d3356546830a2c26a9c04e119b02c81d810594a..e41e989a9013624136b7af93557919089a16eb4d \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs
```

```text
(no output — the three files are byte-identical across the range)
```

**Version 3 reuses version 2's body grammar verbatim.** The registry in
`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` names a body parser per version, and the new entry
names the *same* one version 2 does:

```haskell
languageRegistry =
  LanguageDefinition version1 Nothing LanguageBodyParserV1
    :| [ LanguageDefinition version2 (Just version1) LanguageBodyParserV2,
         LanguageDefinition version3 (Just version2) LanguageBodyParserV2
       ]
```

This is why the plan adds no highlighter rule: there is no version-3 spelling to add. It is
also why the new corpus file can be a straight version-2 body under a `3` preamble and still be
a source the upstream parser accepts — upstream's own test suite does exactly that, taking its
version-2 scalar-expression fixture and substituting the preamble line:

```haskell
let v3Source = T.replace "language keiro-dsl 2" "language keiro-dsl 3" v2Source
```

**What version 3 actually enforces is a validation rule on `prefix=`, not a spelling.** The new
`Keiro.Dsl.IdDomain` module selects a TypeID-v7 domain contract (published version string
`keiro-dsl/id-domain/typeid-v7/1`) whenever the source's effective runtime semantics are
`keiro-dsl/runtime-semantics/2`, which version 3 is the first version to select. Under it,
`Keiro.Dsl.Validate.validateNominal` rejects an `id Foo prefix=Bar` declaration whose prefix is
not a legal TypeID prefix, with a `NominalInvalidIdPrefix` diagnostic. Versions 1 and 2
deliberately return no contract and keep admitting arbitrary prefix text. None of this is
visible to a highlighter: `prefix=` is coloured the same whether the value passes validation or
not, and Section 1 of the spec already establishes that an editor must keep tokenizing a file
while its author is fixing a diagnostic.

**The upstream "unsupported version" fixture had to move up by one.** Because `3` became real,
upstream's `keiro-dsl/test/fixtures/language-future.keiro` — whose whole job is to name a
version that does *not* exist — was rewritten from `language keiro-dsl 3` to
`language keiro-dsl 4`. This repository has no equivalent fixture and needs none: a highlighter
has no notion of an unsupported version, and the new corpus file deliberately names `3` because
it is now supported, not because supportedness is observable in colour.

**The new assertions bite.** Rewriting the corpus file's first line to `language keiro-dsl x`
turns two of the four new Shiki tests red and leaves the other two green — the body ones, which
depend on version-2 surface rather than on the preamble's value. That is the shape a
non-vacuous test should have. The transcript is in Validation and Acceptance.

**Test transcripts.** Both suites pass with the new file and assertions: 72 Shiki tests (68
before, plus four) and 389 Vim checks (375 before, plus fourteen), zero failures in either. The
three spec word-grid counts the Vim suite guards — 72 reserved, 100 bare contextual, 32 dashed —
are unchanged, confirming Milestone 1's prose edit stayed out of the grids.


## Decision Log

- Decision: Treat this range as a *documentation* reconciliation rather than a no-op sync, even
  though no highlighting rule changes.
  Rationale: The automation that produced this plan says a semantics-only upstream change means
  no work here, and that is right about the two highlighter files, the corpus's token coverage,
  and Sections 3 and 6 of the spec — none of them move. But Section 1 of
  `spec/keiro-dsl-language-model.md` makes a *factual claim about the parser* ("the
  released-contract registry holds **two** versions") that this commit falsifies, and the spec's
  own Authoritative Source paragraph stakes the document's value on every such claim being
  confirmed against `Parser.hs` and its neighbours. Leaving a known-false sentence in the
  cross-package contract costs more than the small edit does. There is direct precedent in this
  repository: `docs/plans/13-reconcile-the-language-version-gating-notes-with-grammar-context-parsing.md`
  handled exactly this shape — an upstream range with no lexical change but stale
  parser-mechanics prose — and was committed as `docs(spec): reconcile …`.
  Date: 2026-08-01

- Decision: Add no rule to `packages/keiro-vim/syntax/keiro.vim` or
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, and no word to Section 3 or Section 6
  of the spec.
  Rationale: There is nothing to add. `reservedWords` is unchanged at 72 words, no operator or
  literal form is new, and version 3 binds the same body grammar as version 2, so it admits
  exactly the spellings the highlighters already colour. The preamble version is matched by the
  existing Number rules, which are value-blind. Adding anything here would be inventing surface
  the parser does not have.
  Date: 2026-08-01

- Decision: Add a new corpus file `corpus/language-version-3.keiro` rather than editing an
  existing one.
  Rationale: The preamble may appear at most once per file, so a version-3 preamble cannot be
  added to `corpus/language-preamble.keiro`, which already opens `language keiro-dsl 1`. A new
  file is also the honest shape: it exists to show a *third distinct version value* tokenizing
  identically, which is a property of a whole file's opening line.
  Date: 2026-08-01

- Decision: Give the new corpus file a real version-2-gated body (a scalar-expression
  transition and a `mapped nominal` binding) instead of a bare preamble plus `context` line.
  Rationale: The interesting claim about version 3 is not just that `3` is a Number; it is that
  a version-3 source admits exactly the version-2 surface and is coloured identically. A file
  containing only a preamble would test the first half and leave the second half — the half a
  future reader is most likely to doubt — untested. The body deliberately reuses spellings the
  suites already assert elsewhere so the new assertions are cheap and unambiguous.
  Date: 2026-08-01

- Decision: Name the file's `id` prefixes so they would satisfy version 3's new TypeID prefix
  rule (lowercase ASCII, underscore-separated, no digits or dashes).
  Rationale: The corpus is read only by the two highlighter suites and is never fed to the
  upstream validator, so nothing forces this. But a corpus file that names version 3 in its
  preamble and would then be rejected by version 3's headline validation rule is a trap for the
  next reader, who may reasonably paste it into `keiro check`. Costs nothing to get right.
  Date: 2026-08-01


## Outcomes & Retrospective

The reconciliation is complete and both suites are green.

Achieved: Section 1 of `spec/keiro-dsl-language-model.md` now states the correct number of
released language contracts, names keiro-dsl commit `e41e989` as the source of version 3,
explains that version 3 binds the same body grammar as version 2 and therefore adds no
spelling, and records that what version 3 *does* add is a semantic prefix-validation rule that a
highlighter must ignore. The corpus gained `corpus/language-version-3.keiro`, documented in
`corpus/README.md` alongside the other hand-authored samples, and both suites gained assertions
proving a `3` in the preamble is an ordinary Number and that the version-2-gated body beneath it
colours exactly as it does under a `2` preamble.

Not done, deliberately: no highlighter file changed, and no word was added to or removed from
Section 3 or Section 6. That is the correct outcome for this range, not an omission — see the
second Decision Log entry.

Lesson for the next sync: an upstream range can be entirely semantic for the *highlighters* and
still be load-bearing for the *spec*. The cheap discriminator is to grep the spec for claims
that count things upstream ("holds **two** versions", "exactly **72** words") and check each
count against the current parser, rather than stopping at "did any rule change".


## Context and Orientation

Everything below refers to two repositories.

The first is this one, `keiro-syntax`, rooted at `/Users/shinzui/Keikaku/bokuno/keiro-syntax`.
It contains four artifacts that must always agree with one another:

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Prose plus tables describing
  every token a `.keiro` file can contain and which of eleven token classes it belongs to. Its
  Section 3 holds the authoritative reserved-keyword list, copied verbatim from the upstream
  parser; Section 6 holds the token-class taxonomy that both packages implement.
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim highlighter. A list of `syntax keyword`
  and `syntax match` commands assigning Vim highlight groups such as `keiroKeyword`,
  `keiroNumber`, and `keiroComment`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar, assigning dotted
  scope names such as `keyword.declaration.keiro` and `constant.numeric.keiro`.
- `corpus/` — hand-authored and upstream-derived `.keiro` sample files, each documented in
  `corpus/README.md`. Both test suites read files straight out of `corpus/` and assert what
  colour or scope specific pieces of text receive, so a sample that is not in `corpus/` is
  surface that neither package proves it handles.

The two test suites are:

- `packages/shiki-keiro/test/scopes.test.ts` — a `bun test` file. It loads each corpus file with
  `readFileSync` into a top-level constant near the top of the file, then uses two helpers:
  `expectScope(source, text, scope)` asserts the first occurrence of `text` carries `scope`, and
  `expectWholeToken(source, text, scope, anchor)` additionally asserts the highlighter claimed
  `text` as *one* token rather than splitting it, optionally restricted to the first line
  containing the literal `anchor`.
- `packages/keiro-vim/test/highlight_spec.lua` — a headless Neovim script. `open('corpus/x.keiro')`
  loads a corpus file into a buffer; `expect(anchor, group)` finds the first line containing the
  literal `anchor` and asserts the highlight group under the anchor's *first character* is
  `group`; `expect_uniform(text, group, anchor)` asserts every character of `text` carries
  `group`, which is how dashed spellings like `keiro-dsl` are checked for not being split. At the
  end of the file the suite re-reads the word grids out of Sections 3 and 4 of the spec and
  asserts their sizes (72 reserved, 100 bare contextual, 32 dashed contextual) — so any edit to
  those grids changes a number in `highlight_spec.lua` too. This plan does not touch them.

The second repository is `keiro`, rooted at `/Users/shinzui/Keikaku/bokuno/keiro` (canonical
project URI `mori://shinzui/keiro`). It holds the upstream parser package `keiro-dsl`. The files
that matter here are `keiro-dsl/src/Keiro/Dsl/Parser.hs` (the lexer and the `reservedWords`
list), `keiro-dsl/src/Keiro/Dsl/Grammar.hs` and `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (the
rest of the surface syntax), and `keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` (the registry of
released language contracts, which is what this range changed).

**The version preamble, defined.** Since keiro-dsl commit `4523b52` a `.keiro` file may begin
with a clause naming the released language contract it was written against. It is exactly three
tokens — the word `language`, the word `keiro-dsl`, and a positive decimal number — it is
optional, it may sit below a leading comment banner, and it may appear at most once. A file
without one is a *legacy unversioned* source and parses under version 1. Neither `language` nor
`keiro-dsl` is a reserved word, so both live in Section 4 of the spec (curated contextual
keywords) rather than Section 3.

**What the upstream range did.** `keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` gained a
`version3` value and a third entry in `languageRegistry`, bound to the existing
`LanguageBodyParserV2` body grammar. Around it, a new module
`keiro-dsl/src/Keiro/Dsl/IdDomain.hs` and a new upstream-core module
`keiro-core/src/Keiro/Codec/IdDomain.hs` define a TypeID-v7 identifier domain, and
`keiro-dsl/src/Keiro/Dsl/Validate.hs` began rejecting `id` declarations whose `prefix=` value is
not a legal TypeID prefix — but only for sources whose effective runtime semantics are
`keiro-dsl/runtime-semantics/2`, which version 3 is the first version to select. `Parser.hs`,
`Grammar.hs`, and `PrettyPrint.hs` were not touched.


## Plan of Work

The work is four milestones. Milestone 1 fixes the false sentence in the spec, which is the
only strictly necessary edit. Milestones 2 and 3 add the test coverage that makes the spec's
claim about version-blindness true by demonstration rather than by assertion. Milestone 4 proves
nothing regressed.


### Milestone 1 — correct the released-version paragraph in Section 1 of the spec

Scope: one paragraph of `spec/keiro-dsl-language-model.md`. At the end of this milestone the
spec states that three language contracts are released rather than two, names the upstream
commit that released the third, and explains both what version 3 does not add (any spelling)
and what it does add (a semantic rule on `prefix=` values that a highlighter ignores). No other
section of the spec moves; in particular the Section 3 word grid stays at exactly 72 words and
the Section 4 grids stay at 100 and 32, because `highlight_spec.lua` asserts those three counts.

The paragraph to replace currently begins "Since keiro-dsl commit `fcd6748` the released-contract
registry holds **two** versions" and runs to the closing parenthesis of the sentence about the
`LanguageFeatureRequiresVersion` diagnostic. Keep every fact it already carries — version 2 is
the contract for nominal bindings, the gates live in the productions that own the syntax, an
editor must still tokenize a file whose version line is wrong — and add the version 3 facts
around them.

Acceptance: `grep -n 'holds \*\*two\*\* versions' spec/keiro-dsl-language-model.md` finds
nothing, `grep -n 'e41e989' spec/keiro-dsl-language-model.md` finds the new text, and the vim
suite's three word-count checks still pass in Milestone 4.


### Milestone 2 — add a version-3 corpus sample

Scope: a new file `corpus/language-version-3.keiro` plus one entry in `corpus/README.md`. At the
end of this milestone the corpus contains a `.keiro` source whose preamble reads
`language keiro-dsl 3` and whose body uses the version-2-gated surface — the scalar expression
roots `reg.` and `cmd.`, the `Integer` type name, and a `mapped nominal` binding with its
trailing `using { … }` clause — so that both suites can show a third version value changes
nothing about how the file colours.

The file must open with the preamble on its first line, because the suites' `expect`/
`expectScope` helpers find the *first* occurrence of a literal and a `3` appearing earlier in a
comment would shadow the version. Keep the body small; every spelling in it is already covered
by other corpus files, so this file's job is only to show them under a `3`.

Acceptance: the file exists, opens with `language keiro-dsl 3`, and `corpus/README.md` describes
it in the same voice as the neighbouring entries — what it covers, why it was hand-authored,
and which plan it backs.


### Milestone 3 — assert the new sample in both suites

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`. At the end of this milestone both suites load
`corpus/language-version-3.keiro` and assert that the `3` is a Number, that `language` and
`keiro-dsl` carry the same classes they carry over a `1` preamble, and that the version-2-gated
body beneath colours as it does elsewhere.

In the Shiki suite, add the `readFileSync` constant beside the existing `preamble` constant and
add tests in the version-preamble section. In the Vim suite, add an `open()` plus assertions in
the version-preamble section, before the word-grid checks at the end of the file.

Acceptance: both suites report the new checks passing in Milestone 4.


### Milestone 4 — run both suites

Scope: no edits. Run both suites and record their output in this plan.


## Concrete Steps

All commands are run from the repository root `/Users/shinzui/Keikaku/bokuno/keiro-syntax`
unless stated otherwise.

First, re-confirm the upstream claim this plan rests on — that the three surface-defining files
did not change:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
git diff --stat 1d3356546830a2c26a9c04e119b02c81d810594a..e41e989a9013624136b7af93557919089a16eb4d \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs
```

Expect no output at all. Any output means this plan's premise is wrong and the reserved-word
list must be re-derived before continuing.

Second, re-confirm that the spec's Section 3 grid still matches the parser exactly. The grid is
the fenced block immediately under the heading `## Section 3 — Reserved keywords (authoritative)`:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
awk '/^reservedWords/,/\]/' keiro-dsl/src/Keiro/Dsl/Parser.hs \
  | grep -o '"[a-zA-Z-]*"' | tr -d '"' | sort > /tmp/upstream_rw.txt
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
sed -n '220,231p' spec/keiro-dsl-language-model.md | tr -s ' ' '\n' | grep -v '^$' | sort > /tmp/spec_rw.txt
diff /tmp/upstream_rw.txt /tmp/spec_rw.txt && wc -l < /tmp/spec_rw.txt
```

Expect an empty diff and the number `72`. (The line range `220,231` is the grid's position
*after* Milestone 1's edit, which pushed it down by eight lines; before that edit it was
`204,215`. If the spec has shifted again, find the block with
`grep -n 'Section 3 — Reserved keywords' spec/keiro-dsl-language-model.md` and take the twelve
lines inside the fenced block below it.)

Third, perform Milestone 1's edit, then Milestone 2's new file and README entry, then Milestone
3's test additions, as described in Plan of Work.

Fourth, run the suites:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh
```

Fifth, write the one-line Conventional Commits subject the calling automation will use:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
printf '%s\n' 'docs(spec): record keiro-dsl language version 3 and cover a version-3 preamble in the corpus' \
  > .keiro-dsl-sync-subject
```

Do not run `git add`, `git commit`, or `git push`, and do not write to `spec/.keiro-dsl-sync` —
the calling script re-runs both suites itself and owns the commit.


## Validation and Acceptance

The observable outcome is that both highlighter suites tokenize a `.keiro` file whose preamble
names version 3 exactly as they tokenize one naming version 1 or 2, and that they say so in
named checks rather than by silence.

Run the Shiki suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

Expected — 72 tests pass, zero fail (68 before this plan, plus the four new version-3 tests):

```text
 72 pass
 0 fail
 365 expect() calls
Ran 72 tests across 1 file.
```

`bun test` prints only failures by name, so to see the four new tests individually, filter on
them:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test -t "version-3"
```

```text
 4 pass
 68 filtered out
 0 fail
 24 expect() calls
```

The four are `the version-3 preamble version is an ordinary number`, `the version-3 preamble
words keep their preamble classes`, `a version-3 body colours exactly like a version-2 body`,
and `a version-3 nominal binding colours like any other nominal binding`.

Run the Vim suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh
```

Expected — every line reads `ok`, and the trailer reports zero failures (389 checks, up from
375 before this plan). The new file's checks appear together, and the run still ends with the
three word-grid counts, which must be unchanged by this plan:

```text
ok   "language keiro-dsl 3" -> keiroKeyword
ok   "nominal EntryLabel" -> keiroModifier
ok   "aggregate VersionThreeLedger" -> keiroKeyword
ok   "prefix=ledger" -> keiroModifier
...
ok   reserved-word count -> 72
ok   bare contextual-keyword count -> 100
ok   dashed contextual-keyword count -> 32

389 checks, 0 failures
```

A failure in either suite that names a corpus line is a real defect in the new sample or the new
assertions; a failure naming one of the three counts means Milestone 1's edit strayed into a
word grid, which it must not.

To see the change is effective beyond compilation, replace the `3` in the new corpus file's
preamble with a letter and re-run: the version assertions fail rather than passing vacuously.
This was performed and the failures observed:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
sed -i.bak '1s/.*/language keiro-dsl x/' corpus/language-version-3.keiro
(cd packages/shiki-keiro && bun test -t "version-3")
mv corpus/language-version-3.keiro.bak corpus/language-version-3.keiro
```

```text
(fail) the version-3 preamble version is an ordinary number
(fail) the version-3 preamble words keep their preamble classes

 2 pass
 2 fail
```

The two that still pass are the body assertions, which is correct — the body is version-2
surface and does not depend on the preamble's value. Restore the file before continuing; if the
`.bak` move was missed, `git checkout -- corpus/language-version-3.keiro` also restores it once
the file is committed.


## Idempotence and Recovery

Every step is safe to repeat. The spec edit replaces one paragraph with another and is a no-op
the second time. The new corpus file is created whole, so re-running simply rewrites identical
content. The test additions are appended blocks; if a run is interrupted midway, `git diff` shows
exactly what landed and `git checkout -- <path>` restores any file to its committed state.

Nothing here is destructive: no upstream file is written, no `git` history is rewritten, and the
plan explicitly does not stage or commit anything. If the whole plan must be abandoned, `git
status` lists exactly seven paths — this plan file, `spec/keiro-dsl-language-model.md`,
`corpus/language-version-3.keiro`, `corpus/README.md`,
`packages/shiki-keiro/test/scopes.test.ts`, `packages/keiro-vim/test/highlight_spec.lua`, and
`.keiro-dsl-sync-subject` — and discarding them returns the tree to its prior state.


## Interfaces and Dependencies

No new library, package, or service is introduced. The Shiki suite continues to run under `bun`
(`bun install && bun test` inside `packages/shiki-keiro`) against the `shiki` package already in
that workspace's `package.json`; the Vim suite continues to run under headless Neovim via
`packages/keiro-vim/test/run.sh`.

At the end of Milestone 2 the file `corpus/language-version-3.keiro` must exist at the
repository root's `corpus/` directory with `language keiro-dsl 3` as its first line.

At the end of Milestone 3 `packages/shiki-keiro/test/scopes.test.ts` must define a top-level
constant holding that file's text (read with `readFileSync(resolve(repoRoot, …), 'utf8')`, the
same shape as the existing `preamble` constant) and `packages/keiro-vim/test/highlight_spec.lua`
must call `open('corpus/language-version-3.keiro')` before its assertions over it.

The upstream interface this plan depends on is `languageRegistry` in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`, whose type is
`NonEmpty LanguageDefinition` and whose third element is
`LanguageDefinition version3 (Just version2) LanguageBodyParserV2`. Nothing in this repository
imports it; it is read by a human and transcribed into the spec.


## Revision Notes

**2026-08-01 — figures replaced with measured ones.** The Validation and Acceptance section was
written before the suites were run and carried estimated totals (111 Shiki tests, 345 Vim
checks). Both were wrong: the real counts are 72 Shiki tests (68 before this plan) and 389 Vim
checks (375 before, measured by restoring the committed `highlight_spec.lua`, re-running, and
putting the edited file back). The section now carries the actual transcripts, plus the
`bun test -t "version-3"` filter command, because `bun test` prints only failing test names and
a reader following the plan would otherwise have no way to see the four new tests by name. The
non-vacuousness check moved from a suggestion to a recorded transcript for the same reason. The
Concrete Steps line range for the Section 3 word grid was also corrected from `204,215` to
`220,231`, since Milestone 1's edit pushed the grid down eight lines; the Surprises &
Discoveries section gained the two findings these runs produced. No milestone, decision, or
scope changed.
