---
id: 15
slug: record-keiro-dsl-language-version-4-as-the-stable-contract-and-cover-a-version-4-preamble-in-the-corpus
title: "Record keiro-dsl language version 4 as the stable contract and cover a version-4 preamble in the corpus"
kind: exec-plan
created_at: 2026-08-03T00:09:03Z
---

# Record keiro-dsl language version 4 as the stable contract and cover a version-4 preamble in the corpus

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
`cd22e7f269d89dd7c3a54d0c8fa713d99b4f078b` (short form `cd22e7f`, subject
`test(dsl): migrate the stable fixture corpus`), the head of the six-commit range
`15dbea9e2ebfd49fdf1504cc6a19a4482ad3d060..cd22e7f269d89dd7c3a54d0c8fa713d99b4f078b`.

**The headline is that no highlighting rule changes.** The range adds no reserved word, removes
none, adds no operator, no literal form, and no token class, and it changes no comment, string,
number, or identifier rule. Every file under `keiro-dsl/src/Keiro/Dsl/Parser/` is byte-identical
across the range, as are `Parser.hs`, `Grammar.hs`, `PrettyPrint.hs`, and `Frontend.hs`. The
parser's `reservedWords` list still holds exactly the same 72 words that Section 3 of the spec
copies verbatim. Both highlighter files are already correct and stay byte-for-byte unchanged, and
so do Section 3 (the reserved-keyword list) and Section 6 (the token-class taxonomy).

What *did* change is which released language version a `.keiro` author is expected to write.
A `.keiro` source may open with a preamble naming the released language contract it was written
against, spelled `language keiro-dsl <positive-decimal>` — for example `language keiro-dsl 4`.
Upstream's registry of released contracts has held four entries (`1` through `4`) since keiro-dsl
commit `3e1217c`, but until this range every entry was equal in standing. This range splits them:
a new `LanguageSupport` value marks version 4 `Stable` and versions 1 through 3
`CompatibilityOnly`, the starter files emitted by the `keiro new <kind>` subcommand switched from
a hard-coded `language keiro-dsl 1` to whichever version is `Stable`, and upstream migrated its
entire fixture corpus — 225 `.keiro` files — from `1` and `2` onto `4`.

Two things follow for this repository, and both are documentation and test-coverage work rather
than highlighting work. First, Section 1 of `spec/keiro-dsl-language-model.md` states in so many
words that the registry "holds **three**: `1`, `2`, and `3`". That sentence is false about the
parser this document claims to be derived from, which is the one thing this specification exists
to get right. Second, every `.keiro` file in `corpus/` opens with `1`, `2`, or `3`, so neither
package has ever tokenized a preamble carrying the version that upstream's own tooling now writes
into every new file. A highlighter that special-cased the digits it had seen would still pass
every test in this repository.

What someone gains after this change: a reader of `spec/keiro-dsl-language-model.md` gets an
accurate count of the released contracts, learns which one is stable and which are kept only so
historical sources retain their released meaning, and reads a plain statement that the
stable/compatibility-only split is invisible to a highlighter. Both suites gain a sample proving
the preamble's version is an ordinary Number at the value an editor will now see most often. You
can see the new coverage working by running the two suites named in Validation and Acceptance and
watching the new assertions pass against the new corpus file `corpus/language-version-4.keiro`.


## Progress

- [x] Read the upstream diff for the whole six-commit range and establish that the lexical
      surface is unchanged (2026-08-02).
- [x] Confirm mechanically that every surface-defining upstream file is byte-identical across the
      range, and that the spec's 72-word reserved list still matches the parser's `reservedWords`
      exactly (2026-08-02).
- [x] Confirm mechanically that upstream's migrated fixture corpus introduces no new token — the
      before/after token vocabularies differ only by user-chosen identifiers (2026-08-02).
- [x] Record the pre-change suite baselines: 72 Shiki tests / 365 `expect()` calls, 389 Vim
      checks (2026-08-02).
- [x] Write this ExecPlan (2026-08-02).
- [x] Milestone 1 — correct the released-version paragraph in Section 1 of
      `spec/keiro-dsl-language-model.md` and record the stable/compatibility-only split
      (2026-08-02).
- [x] Milestone 2 — add `corpus/language-version-4.keiro` and document it in `corpus/README.md`
      (2026-08-02).
- [x] Milestone 3 — extend both suites with assertions over the new corpus file, including the
      first assertions anywhere in this repository over a qualified enum member (2026-08-02).
- [x] Milestone 4 — run both suites to green and record the transcripts (2026-08-02).
- [x] Write the Conventional Commits subject to `.keiro-dsl-sync-subject` (2026-08-02).


## Surprises & Discoveries

**The range is large but lexically inert, and this is provable in one command.** The six commits
touch 380 files and over 5,800 lines, including a whole new upstream test module
(`keiro-dsl/test/Keiro/Dsl/ConformanceBaseline.hs`) and a 330-line
`keiro-dsl/test/conformance-baseline.json`. None of it touches the files that define what a
`.keiro` file *looks like*:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
git diff --stat 15dbea9e2ebfd49fdf1504cc6a19a4482ad3d060..cd22e7f269d89dd7c3a54d0c8fa713d99b4f078b \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser/ \
     keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
     keiro-dsl/src/Keiro/Dsl/Frontend.hs
```

```text
(no output — every one of those paths is byte-identical across the range)
```

**The 225-file fixture migration adds no token.** This was the one part of the range that could
plausibly have carried new surface, because it rewrote transition bodies as well as preamble
lines. It does not. Extracting every word and every punctuation character from every `.keiro` and
`.keiro-workspace` file under `keiro-dsl/test/` at both ends of the range and diffing the two
vocabularies yields only user-chosen identifiers — no keyword, no operator, no bracket, no
punctuation mark appears on one side and not the other:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
for rev in 15dbea9e2ebfd49fdf1504cc6a19a4482ad3d060 cd22e7f269d89dd7c3a54d0c8fa713d99b4f078b; do
  git ls-tree -r --name-only $rev -- keiro-dsl/test \
    | grep -E '\.keiro$|\.keiro-workspace$' \
    | while read f; do git show "$rev:$f"; done \
    | grep -oE '[A-Za-z_][A-Za-z0-9_-]*|[^A-Za-z0-9_ \t]' | sort -u > /tmp/$rev.txt
done
comm -3 /tmp/15dbea9e2ebfd49fdf1504cc6a19a4482ad3d060.txt \
        /tmp/cd22e7f269d89dd7c3a54d0c8fa713d99b4f078b.txt
```

```text
BetaVertex          Counter
HospitalVertex      Tick
ProjectVertex       feature
RUnVertex           runb
ReservationVertex
RunVertex
SubscriptionVertex
SurgeVertex
hospitalState
reservationState
run2
subscriptionState
surgeState
```

(The left column is old-only, the right column new-only.) Every word there is a name an author
chose, not a word of the language. The `*Vertex` types and `*State` register names vanished
because the migration deleted the register that tracked an aggregate's state machine vertex by
hand, which the version-2 body grammar makes unnecessary.

**The migration's real change is that operands became qualified, and this repository already
covers that spelling.** Upstream's version-1 fixtures wrote transition guards with bare operand
names, and the migrated version-4 fixtures qualify every one of them:

```diff
-  Held -- ConfirmReservation --> write reservationState := Confirmed ; emit TransferReservationConfirmed ; goto Confirmed
-    guard divertStatus != TotalDivert || lifeCriticalOverride
+  Held -- ConfirmReservation --> emit TransferReservationConfirmed ; goto Confirmed
+    guard cmd.divertStatus != DivertStatus.TotalDivert || cmd.lifeCriticalOverride
```

Both halves of that are surface this repository already models. The `cmd.` and `reg.` expression
roots are Section 4's scalar expression sublanguage, covered by
`corpus/aggregate-scalar-expressions.keiro` and asserted in both suites. The qualified enum
member `DivertStatus.TotalDivert` is an identifier, a `.`, and an identifier, which is exactly
what `corpus/transition-implementation-hole.keiro` already contains as `TicketStatus.Open`.

**But the qualified enum member was in the corpus and asserted by neither suite.** Grepping both
test files for `TicketStatus` returns nothing. Before this range that was a defensible gap: the
spelling appeared once, in one hand-authored file, and upstream's own fixtures never used it.
After this range it is the dominant way upstream writes an enum operand — `DivertStatus.TotalDivert`,
`PatientAcuity.RedTag`, `ProjectPhase.Active`, `Plan.Free`, and `Color.Red` all appear in the
migrated corpus. Milestone 3 therefore adds the first assertions in this repository over a
qualified enum member. This is coverage this range motivates, not a rule change.

**The stable designation reaches the surface only through the `keiro new` starter files.** The
one place the new `Stable` marking produces different *text* is
`keiro-dsl/src/Keiro/Dsl/Skeleton.hs`, whose `versioned` helper prefixes every starter spec with
a preamble:

```diff
-    versioned source = "language keiro-dsl 1\n" <> source
+    versioned source = "language keiro-dsl " <> languageVersionText currentStableLanguageVersion <> "\n" <> source
```

That is the strongest argument for Milestone 2. Every file a user creates with `keiro new
aggregate` now opens `language keiro-dsl 4`, so `4` is the version an editor will meet most
often, and it was the one version value the corpus never carried.

**The qualified enum member turned out to be a purely negative property, and that is the
interesting result.** Milestone 3's caution against guessing scopes paid off. Probing the Shiki
grammar against the new corpus file shows the guard line splitting like this:

```text
LINE: "    guard cmd.amount >= 0 && reg.status == EntryStatus.Active"
    "guard"              -> keyword.control.keiro
    "cmd"                -> keyword.control.keiro
    ".amount "           -> (none)
    ">="                 -> keyword.operator.keiro
    "0"                  -> constant.numeric.keiro
    "&&"                 -> keyword.operator.keiro
    "reg"                -> keyword.control.keiro
    ".status "           -> (none)
    "=="                 -> keyword.operator.keiro
    " EntryStatus.Active" -> (none)
```

`cmd` and `reg` are keywords *because* a `.` follows them, and `EntryStatus` in the identical
position gets nothing at all. So the assertion to write is a negative one — the same shape as the
existing `prefix=cmd` guard — not "the qualifier is a type name". Had the expectation been
guessed, it would have demanded a scope the grammar deliberately withholds, and "fixing" it would
have lit up every qualified operand in upstream's migrated corpus. The declaration site is the
only place `EntryStatus` is a type name (`enum EntryStatus { … }` → `entity.name.type.keiro`), and
the test asserts both halves so the contrast is pinned.

**Two comment banners in the new corpus file had to be reworded, and both failures were the same
mistake.** Both suites anchor on the *first* line containing a literal, so any literal a banner
mentions is a literal the banner steals. Writing `` `prefix=entry` `` in the file's own commentary
made the Vim suite report `FAIL "prefix=entry": want keiroModifier, got keiroComment` — a real
failure with a misleading name, since nothing was wrong with the highlighter. The fix is to
describe the token without spelling it. The one place the banner *may* name the spelling is the
qualified enum member, because that assertion anchors on `== EntryStatus.Active`, a phrase no
prose sentence contains.

**Test transcripts.** Both suites pass with the new file and assertions: 76 Shiki tests (72
before, plus four) and 405 Vim checks (389 before, plus sixteen), zero failures in either. The
three spec word-grid counts the Vim suite guards — 72 reserved, 100 bare contextual, 32 dashed —
are unchanged, confirming Milestone 1's prose edits stayed out of the grids. Full transcripts are
in Validation and Acceptance.


## Decision Log

- Decision: Treat this range as a *documentation and coverage* reconciliation rather than a
  no-op sync, even though no highlighting rule changes.
  Rationale: The automation that produced this plan says a semantics-only upstream change means
  no work here, and that is right about the two highlighter files and about Sections 3 and 6 of
  the spec — none of them move, and this plan does not touch them. But Section 1 of
  `spec/keiro-dsl-language-model.md` makes a *factual claim about the parser* — that the
  released-contract registry "holds **three**: `1`, `2`, and `3`" — and the range's whole subject
  is that registry. The spec's own Authoritative Source paragraph stakes the document's value on
  every such claim being confirmed against `Parser.hs` and its neighbours, so leaving a
  known-false sentence in the cross-package contract costs more than the small edit does. There
  is direct precedent in this repository:
  `docs/plans/13-reconcile-the-language-version-gating-notes-with-grammar-context-parsing.md`
  and `docs/plans/14-record-keiro-dsl-language-version-3-and-prove-the-preamble-version-stays-an-ordinary-number.md`
  both handled exactly this shape — an upstream range with no lexical change but a stale factual
  claim about the parser — and plan 14's retrospective records the lesson verbatim: "grep the
  spec for claims that count things upstream … and check each count against the current parser,
  rather than stopping at 'did any rule change'."
  Date: 2026-08-02

- Decision: Add no rule to `packages/keiro-vim/syntax/keiro.vim` or
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, and no word to Section 3 or Section 6 of
  the spec.
  Rationale: There is nothing to add. `reservedWords` is unchanged at 72 words, verified by a
  mechanical diff against the spec's Section 3 grid; no operator or literal form is new; and
  version 4 binds the same `LanguageBodyParserV2` body grammar and the same `profileV2` syntax
  profile as versions 2 and 3, so it admits exactly the spellings the highlighters already
  colour. The preamble version is matched by the existing Number rules, which are value-blind.
  Adding anything here would be inventing surface the parser does not have.
  Date: 2026-08-02

- Decision: Correct Section 1's version count with a formulation that will not go stale on the
  next release — name the current count *and* the stable entry, and say explicitly that a
  highlighter models neither.
  Rationale: The sentence being replaced went stale the moment upstream released a fourth
  version, and the sentence it replaced went stale when upstream released a third. Rather than
  repeat that, the new text states the registry's current shape, attributes it to the commit that
  produced it, and then states the invariant a reader actually needs — that the version is an
  ordinary Number whatever its value and whatever its support status. A future release makes the
  count stale again, but the invariant beneath it stays true, so a reader who skims past the
  count is not misled about how to build a highlighter.
  Date: 2026-08-02

- Decision: Add a new corpus file `corpus/language-version-4.keiro` rather than editing an
  existing one.
  Rationale: A `.keiro` file may carry at most one version preamble, so a `4` cannot be added to
  a file that already opens `language keiro-dsl 1`. A new file is also the honest shape: the
  claim under test is a property of a whole file's opening line, namely that a fourth distinct
  version value tokenizes identically to the three the corpus already carries. This mirrors what
  `docs/plans/14-…` did for version 3.
  Date: 2026-08-02

- Decision: Shape the new corpus file after upstream's *migrated* fixtures rather than after the
  `keiro new aggregate` starter.
  Rationale: The starter is a version-4 file, so it would satisfy the preamble half of the claim,
  but its body is deliberately minimal — no guard, no `write`, no enum — and would leave the more
  interesting half untested. The migrated fixtures show what a real version-4 aggregate now looks
  like: no hand-maintained vertex register, qualified `cmd.`/`reg.` operands, and qualified enum
  members in guards and writes. Modelling the sample on them means the new assertions cover the
  spellings that this range actually made common.
  Date: 2026-08-02

- Decision: Assert the qualified enum member (`EntryStatus.Active`) in both suites, even though
  no rule changed and the spelling already existed in `corpus/transition-implementation-hole.keiro`.
  Rationale: Neither suite asserted it anywhere, so nothing in this repository would notice if a
  future rule change split or recoloured it. That was a tolerable gap while the spelling was rare;
  this range makes it the way upstream writes every enum operand, so the gap is now worth closing.
  The assertion records the *current* behaviour rather than demanding new behaviour — see the
  Milestone 3 note about deriving the expected scopes from a run rather than guessing them.
  Date: 2026-08-02

- Decision: Name the file's `id` prefix so it satisfies version 3's TypeID prefix rule, and give
  the aggregate's states names that do not collide with the enum's member names.
  Rationale: The corpus is read only by the two highlighter suites and is never fed to the
  upstream validator, so nothing forces either. But a corpus file that names version 4 in its
  preamble and would then be rejected by `keiro check` is a trap for the next reader, who may
  reasonably paste it in. Upstream rejects a colliding vertex and enum constructor name with a
  `VertexCtorCollision` diagnostic, and rejects a non-TypeID `prefix=` value with
  `NominalInvalidIdPrefix`. Both cost nothing to avoid.
  Date: 2026-08-02

- Decision: Proceed without an Intention ID.
  Rationale: This plan is written by the unattended `sync-keiro-dsl` automation, which has no
  interactive channel on which to ask for one. The plan is linked from the commit the calling
  script makes via the `ExecPlan:` trailer, which is the durable link that matters here.
  Date: 2026-08-02


## Outcomes & Retrospective

The reconciliation is complete and both suites are green.

Achieved: Section 1 of `spec/keiro-dsl-language-model.md` now states the correct number of
released language contracts, names keiro-dsl commit `b49b11f` as the one that split them into a
single stable entry and three compatibility-only ones, and says plainly that a highlighter models
neither the count nor the split. The corpus gained `corpus/language-version-4.keiro`, documented
in `corpus/README.md` alongside the other hand-authored samples, and both suites gained
assertions proving a `4` in the preamble is an ordinary Number, that the body beneath it colours
exactly as the same surface does under a `2` or `3` preamble, and — for the first time in this
repository — that a qualified enum member such as `EntryStatus.Active` tokenizes as a plain
qualified name rather than being split or mistaken for a keyword.

Not done, deliberately: no highlighter file changed, and no word was added to or removed from
Section 3 or Section 6. That is the correct outcome for this range, not an omission — see the
second Decision Log entry.

Lesson for the next sync: a fixture-corpus migration is worth reading as carefully as a parser
diff, but it can be *cleared* mechanically. Diffing the token vocabulary of every upstream
`.keiro` file before and after the range — the `comm -3` command in Surprises & Discoveries —
turned a 225-file migration into a thirteen-word answer in one command, and it would have caught
a genuinely new operator or bracket that reading a handful of sample diffs might have missed.
The second lesson repeats plan 14's: the corpus is where a *spelling* that upstream newly favours
should be pinned, even when no rule changed, because an unasserted spelling is one nothing in
this repository defends.


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
  `keiroStatement`, `keiroNumber`, and `keiroComment`.
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
  `group`, which is how dashed spellings like `keiro-dsl` are checked for not being split; and
  `expect_no_group(anchor, offset)` asserts the character at `offset` within the first line
  containing `anchor` carries no highlight group at all. At the end of the file the suite re-reads
  the word grids out of Sections 3 and 4 of the spec and asserts their sizes (72 reserved, 100
  bare contextual, 32 dashed contextual) — so any edit to those grids changes a number in
  `highlight_spec.lua` too. This plan does not touch them.

The second repository is `keiro`, rooted at `/Users/shinzui/Keikaku/bokuno/keiro` (canonical
project URI `mori://shinzui/keiro`). It holds the upstream parser package `keiro-dsl`. The files
that matter here are `keiro-dsl/src/Keiro/Dsl/Parser.hs` and the modules under
`keiro-dsl/src/Keiro/Dsl/Parser/` (the lexer, including the `reservedWords` list in
`Parser/Core.hs`), `keiro-dsl/src/Keiro/Dsl/Grammar.hs` and
`keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (the rest of the surface syntax),
`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` (the registry of released language contracts, which
is what this range changed), and `keiro-dsl/src/Keiro/Dsl/Skeleton.hs` (the starter `.keiro` files
the `keiro new <kind>` subcommand writes).

**The version preamble, defined.** Since keiro-dsl commit `4523b52` a `.keiro` file may begin
with a clause naming the released language contract it was written against. It is exactly three
tokens — the word `language`, the word `keiro-dsl`, and a positive decimal number — it is
optional, it may sit below a leading comment banner, and it may appear at most once. A file
without one is a *legacy unversioned* source and parses under version 1. Neither `language` nor
`keiro-dsl` is a reserved word, so both live in Section 4 of the spec (curated contextual
keywords) rather than Section 3.

**What the upstream range did.** Six commits, of which two matter here.

`b49b11f` (`feat(dsl): designate language 4 as stable`) added a `LanguageSupport` type to
`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` with two constructors, `Stable` and
`CompatibilityOnly`, and a field carrying one of them on every registry entry:

```haskell
languageRegistry =
  LanguageDefinition version1 Nothing LanguageBodyParserV1 profileV1 runtimeProfileV1 CompatibilityOnly
    :| [ LanguageDefinition version2 (Just version1) LanguageBodyParserV2 profileV2 runtimeProfileV1 CompatibilityOnly,
         LanguageDefinition version3 (Just version2) LanguageBodyParserV2 profileV2 runtimeProfileV2 CompatibilityOnly,
         LanguageDefinition version4 (Just version3) LanguageBodyParserV2 profileV2 runtimeProfileV3 Stable
       ]
```

Read the fourth and fifth columns: versions 2, 3, and 4 all name the same body grammar
(`LanguageBodyParserV2`) and the same syntax profile (`profileV2`). That is why version 4 adds no
spelling. The same commit added `currentStableLanguageVersion` (which fails loudly unless exactly
one entry is `Stable`), exposed the support status in the JSON that
`keiro-dsl/src/Keiro/Dsl/SemanticContract.hs` emits under a new `languageSupport` key, and changed
`keiro-dsl/src/Keiro/Dsl/Skeleton.hs` so the `keiro new <kind>` starter files open with the stable
version rather than a hard-coded `1`.

`cd22e7f` (`test(dsl): migrate the stable fixture corpus`), together with `bce4b35`, rewrote
upstream's fixtures: 225 `.keiro` files now open `language keiro-dsl 4`, hand-maintained
state-vertex registers were deleted, transition operands were qualified with `cmd.`, `reg.`, or an
enum type name, and the sources that were previously inlined as JSON strings inside
`keiro-dsl/test/frontend-0.7/manifest.json` were extracted to real files under
`keiro-dsl/test/frontend-0.7/sources/`. The remaining three commits in the range
(`f3b2cc7`, `de31c48`, `607986c`) are documentation and diagram-rendering changes with no `.keiro`
content at all.

Not one of those files is `Parser.hs`, a module under `Parser/`, `Grammar.hs`, `PrettyPrint.hs`,
or `Frontend.hs`.


## Plan of Work

The work is four milestones. Milestone 1 fixes the false sentence in the spec, which is the only
strictly necessary edit. Milestones 2 and 3 add the test coverage that makes the spec's claim
about version-blindness true by demonstration rather than by assertion, and close the
qualified-enum-member gap this range exposed. Milestone 4 proves nothing regressed.


### Milestone 1 — correct the released-version paragraph in Section 1 of the spec

Scope: two paragraphs of `spec/keiro-dsl-language-model.md`, both inside Section 1. At the end of
this milestone the spec states that four language contracts are released rather than three, names
the upstream commit that split them into one stable entry and three compatibility-only ones,
explains that version 4 binds the same body grammar and syntax profile as versions 2 and 3 and
therefore adds no spelling, and says plainly that a highlighter models neither the count nor the
support status. No other section of the spec moves; in particular the Section 3 word grid stays at
exactly 72 words and the Section 4 grids stay at 100 and 32, because `highlight_spec.lua` asserts
those three counts and would fail by name if an edit strayed into a grid.

The first paragraph to change begins "Since keiro-dsl commit `fcd6748` the released-contract
registry holds more than one version, and since keiro-dsl commit `e41e989` it holds **three**"
and runs to the closing parenthesis of the sentence about the `LanguageFeatureRequiresVersion`
diagnostic. Keep every fact it already carries — version 2 is the contract for nominal bindings,
the gates live in the grammar productions that own the syntax, an editor must still tokenize a
file whose version line is wrong — and correct the count around them.

The second is the paragraph beginning "**Version 3 adds no spelling at all.**", which already
explains that version 3 reuses version 2's body grammar. Extend it to cover version 4 the same
way and to record the stable/compatibility-only split, including the one place that split reaches
the surface: `Keiro/Dsl/Skeleton.hs` now writes the stable version into every `keiro new <kind>`
starter file, which is why `4` is the version an editor will meet most often.

Acceptance: `grep -n 'holds \*\*three\*\*' spec/keiro-dsl-language-model.md` finds nothing,
`grep -n 'b49b11f' spec/keiro-dsl-language-model.md` finds the new text, and the Vim suite's three
word-count checks still pass in Milestone 4.


### Milestone 2 — add a version-4 corpus sample

Scope: a new file `corpus/language-version-4.keiro` plus one entry in `corpus/README.md`. At the
end of this milestone the corpus contains a `.keiro` source whose preamble reads
`language keiro-dsl 4` and whose body is shaped like upstream's freshly migrated fixtures: an
aggregate with no hand-maintained state-vertex register, a guard and a `write` whose operands are
qualified with `cmd.`, `reg.`, and an enum type name, and the `Integer` type name that version 2
introduced.

Three constraints on the file, each of which will otherwise cost a debugging cycle:

The preamble must be on line 1, with any comment banner *below* it. Both suites' anchoring helpers
find the *first* line containing a literal, so a `4` appearing earlier — in a banner reading
"version 4", for instance — would shadow the version and the Number assertion would silently test
the wrong character.

The aggregate's state names must not collide with the enum's member names. Upstream rejects that
with a `VertexCtorCollision` diagnostic, and a corpus file that names version 4 and then fails
`keiro check` is a trap for the next reader. Use distinct words: states `Recording` and `Settled!`,
enum members `Active` and `Closed`.

The `id` declaration's `prefix=` value must be a legal TypeID prefix — lowercase ASCII letters and
underscores, no digits and no dashes — because version 3 and later enforce that. `prefix=entry` is
fine.

Acceptance: the file exists, its first line is exactly `language keiro-dsl 4`, and
`corpus/README.md` describes it in the same voice as the neighbouring entries — what it covers,
why it was hand-authored, and which plan it backs.


### Milestone 3 — assert the new sample in both suites

Scope: `packages/shiki-keiro/test/scopes.test.ts` and
`packages/keiro-vim/test/highlight_spec.lua`. At the end of this milestone both suites load
`corpus/language-version-4.keiro` and assert three things: that the `4` is a Number and the two
preamble words keep the classes they carry over a `1` preamble; that the body beneath colours
exactly as the same surface does elsewhere in the corpus; and that a qualified enum member
tokenizes as a plain qualified name, which is the assertion this repository has never had.

In the Shiki suite, add the `readFileSync` constant beside the existing `versionThree` constant
and add tests immediately after the version-3 block. In the Vim suite, add an `open()` plus
assertions immediately after the version-3 block, which is well before the word-grid checks at the
end of the file.

One important caution for the qualified-enum-member assertions. Do **not** guess the scope or
highlight group that `EntryStatus` and `Active` receive in `EntryStatus.Active`, and do not write
an assertion that demands a scope you think they *ought* to have. No rule changed in this range, so
the correct assertion is the one that records what the highlighters already do. Derive it by
running the suite with a deliberately wrong expectation once and reading the actual value out of
the failure message, then write that value down. The Concrete Steps section gives the exact
commands.

Acceptance: both suites report the new checks passing in Milestone 4.


### Milestone 4 — run both suites

Scope: no edits. Run both suites, confirm zero failures, and record the transcripts in Validation
and Acceptance, including the counts before and after so a reader can see how many checks this
plan added.


## Concrete Steps

All commands are run from the repository root `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless
stated otherwise.

First, re-confirm the upstream claim this plan rests on — that no surface-defining file changed:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
git diff --stat 15dbea9e2ebfd49fdf1504cc6a19a4482ad3d060..cd22e7f269d89dd7c3a54d0c8fa713d99b4f078b \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser/ \
     keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
     keiro-dsl/src/Keiro/Dsl/Frontend.hs
```

Expect no output at all. Any output means this plan's premise is wrong and the reserved-word list
must be re-derived before continuing.

Second, re-confirm that the spec's Section 3 grid still matches the parser exactly. The grid is
the fenced block immediately under the heading `## Section 3 — Reserved keywords (authoritative)`.
Note that `reservedWords` lives in `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`, not in `Parser.hs`
itself — it moved there in an earlier upstream refactor:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
awk '/^reservedWords/,/\]/' keiro-dsl/src/Keiro/Dsl/Parser/Core.hs \
  | grep -o '"[a-zA-Z-]*"' | tr -d '"' | sort -u > /tmp/upstream_rw.txt
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
sed -n '244,255p' spec/keiro-dsl-language-model.md | tr -s ' ' '\n' | grep -v '^$' | sort -u > /tmp/spec_rw.txt
diff /tmp/upstream_rw.txt /tmp/spec_rw.txt && wc -l < /tmp/spec_rw.txt
```

Expect an empty diff and the number `72`. (The line range `244,255` is the grid's position
*after* Milestone 1's edits, which pushed it down by twenty-four lines; before those edits it was
`220,231`. If the spec has shifted again, find the block with
`grep -n 'Section 3 — Reserved keywords' spec/keiro-dsl-language-model.md` and take the twelve
lines inside the fenced block below it. Nothing depends on the range being right — the Vim
suite's own word-grid checks locate the grids structurally rather than by line number, so a wrong
range here fails loudly at this step and nowhere else.)

Third, record the suite baselines so Milestone 4 can report how many checks this plan added:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test 2>&1 | tail -5
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh 2>&1 | tail -2
```

```text
 72 pass
 0 fail
 365 expect() calls
Ran 72 tests across 1 file.

389 checks, 0 failures
```

Fourth, perform Milestone 1's two paragraph edits, then Milestone 2's new file and README entry,
as described in Plan of Work.

Fifth, for Milestone 3, determine the actual scopes and groups of the qualified enum member before
writing its assertions. Add the new corpus constant and the preamble and body assertions first,
then add one deliberately wrong assertion for the qualified name and read the truth out of the
failure. For the Shiki suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test -t "version-4" 2>&1 | head -20
```

A failing `expectScope` prints both the expected and the received scope, so the received value is
the one to write down. For the Vim suite, the corresponding trick is to assert a group you know is
wrong and read the `got` field:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh 2>&1 | grep -i 'fail\|got'
```

Replace the deliberately wrong expectations with the observed values and re-run until green.

Sixth, run both suites in full:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh
```

Seventh, write the one-line Conventional Commits subject the calling automation will use:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
printf '%s\n' 'docs(spec): record keiro-dsl language version 4 as the stable contract and cover a version-4 preamble in the corpus' \
  > .keiro-dsl-sync-subject
```

Do not run `git add`, `git commit`, or `git push`, and do not write to `spec/.keiro-dsl-sync` —
the calling script re-runs both suites itself and owns the commit.


## Validation and Acceptance

The observable outcome is that both highlighter suites tokenize a `.keiro` file whose preamble
names version 4 — the version upstream's own `keiro new` subcommand now writes into every starter
file — exactly as they tokenize one naming version 1, 2, or 3, and that they say so in named
checks rather than by silence. A second observable outcome is that a qualified enum member such as
`EntryStatus.Active`, which upstream's migrated corpus now uses everywhere, is pinned by name in
both suites for the first time.

Run the Shiki suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun install && bun test
```

Observed — 76 tests pass, zero fail (72 before this plan, plus four new tests):

```text
 76 pass
 0 fail
 387 expect() calls
Ran 76 tests across 1 file. [1207.00ms]
```

`bun test` prints only failures by name, so to see the new tests individually, filter on them.
Only three of the four carry `version-4` in their name; the fourth is named for the spelling it
pins rather than for the version, so it needs its own filter:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test -t "version-4"
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro && bun test -t "qualified enum member"
```

```text
 3 pass
 73 filtered out
 0 fail
 18 expect() calls

 1 pass
 75 filtered out
 0 fail
 4 expect() calls
```

The four are `the version-4 preamble version is an ordinary number`, `the version-4 preamble words
keep their preamble classes`, `a version-4 body colours exactly like a version-2 body`, and `a
qualified enum member is a plain qualified name`.

Run the Vim suite:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax && ./packages/keiro-vim/test/run.sh
```

Observed — every line reads `ok`, and the trailer reports zero failures (405 checks, up from 389
before this plan). The new file's sixteen checks appear together, and the run still ends with the
three word-grid counts, which this plan must leave unchanged:

```text
ok   "language keiro-dsl 4" -> keiroKeyword
ok   "aggregate StableLedger" -> keiroKeyword
ok   "enum EntryStatus" -> keiroKeyword
ok   "states Recording" -> keiroStatement
ok   "emit EntrySettled" -> keiroKeyword
ok   "prefix=entry" -> keiroModifier
ok   "== EntryStatus.Active" at offset 3 -> (no group)
ok   "== EntryStatus.Active" at offset 14 -> (no group)
ok   "== EntryStatus.Active" at offset 15 -> (no group)
...
ok   reserved-word count -> 72
ok   bare contextual-keyword count -> 100
ok   dashed contextual-keyword count -> 32

405 checks, 0 failures
```

A failure in either suite that names a corpus line is a real defect in the new sample or the new
assertions; a failure naming one of the three counts means Milestone 1's edit strayed into a word
grid, which it must not.

To see the change is effective beyond compilation, replace the `4` in the new corpus file's
preamble with a letter and re-run: the version assertions must fail rather than pass vacuously.

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
sed -i.bak '1s/.*/language keiro-dsl x/' corpus/language-version-4.keiro
(cd packages/shiki-keiro && bun test -t "version-4")
./packages/keiro-vim/test/run.sh 2>&1 | grep -E 'FAIL|MISSING|checks,'
mv corpus/language-version-4.keiro.bak corpus/language-version-4.keiro
```

This was performed and the failures observed:

```text
(fail) the version-4 preamble version is an ordinary number
(fail) the version-4 preamble words keep their preamble classes

 1 pass
 2 fail
```

```text
MISSING token "language keiro-dsl 4" in current buffer
MISSING token "language" in current buffer
MISSING token "keiro-dsl" in current buffer
FAIL "4": want keiroNumber, got keiroComment

405 checks, 4 failures
```

The one Shiki test that still passes under the filter is `a version-4 body colours exactly like a
version-2 body`, which is correct — the body is version-2 surface and does not depend on the
preamble's value. (The fourth new test, `a qualified enum member is a plain qualified name`, is
not matched by the `version-4` filter and likewise does not depend on the preamble.)

The last Vim line is the most informative one in this transcript. With the preamble broken,
`expect('4', 'keiroNumber')` does not simply vanish — it falls through to the next line containing
a `4`, which is the file's comment banner, and reports `keiroComment`. That proves the assertion
is genuinely anchored on the preamble rather than on any `4` in the file, which is the exact
failure mode the "preamble on line 1" rule exists to prevent.

Restore the file before continuing; if the `.bak` move was missed,
`git checkout -- corpus/language-version-4.keiro` also restores it once the file is committed.


## Idempotence and Recovery

Every step is safe to repeat. The spec edit replaces two paragraphs with two others and is a
no-op the second time. The new corpus file is created whole, so re-running simply rewrites
identical content. The test additions are inserted blocks; if a run is interrupted midway,
`git diff` shows exactly what landed and `git checkout -- <path>` restores any file to its
committed state.

Nothing here is destructive: no upstream file is written, no `git` history is rewritten, and the
plan explicitly does not stage or commit anything. If the whole plan must be abandoned,
`git status` lists exactly seven paths — this plan file, `spec/keiro-dsl-language-model.md`,
`corpus/language-version-4.keiro`, `corpus/README.md`,
`packages/shiki-keiro/test/scopes.test.ts`, `packages/keiro-vim/test/highlight_spec.lua`, and
`.keiro-dsl-sync-subject` — and discarding them returns the tree to its prior state.

The one step that is *not* idempotent by construction is the non-vacuousness check in Validation
and Acceptance, which edits the corpus file in place. It writes a `.bak` alongside and the
transcript restores it on the next line; if that restore is skipped, `git checkout --
corpus/language-version-4.keiro` recovers the file once it is committed, and until then the `.bak`
file is the copy to move back.


## Interfaces and Dependencies

No new library, package, or service is introduced. The Shiki suite continues to run under `bun`
(`bun install && bun test` inside `packages/shiki-keiro`) against the `shiki` package already in
that workspace's `package.json`; the Vim suite continues to run under headless Neovim via
`packages/keiro-vim/test/run.sh`.

At the end of Milestone 2 the file `corpus/language-version-4.keiro` must exist under the
repository root's `corpus/` directory with `language keiro-dsl 4` as its first line, and
`corpus/README.md` must carry an entry describing it.

At the end of Milestone 3 `packages/shiki-keiro/test/scopes.test.ts` must define a top-level
constant holding that file's text — read with `readFileSync(resolve(repoRoot, …), 'utf8')`, the
same shape as the existing `versionThree` constant — and `packages/keiro-vim/test/highlight_spec.lua`
must call `open('corpus/language-version-4.keiro')` before its assertions over it.

The upstream interface this plan depends on is `languageRegistry` in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`, whose type is
`NonEmpty LanguageDefinition` and whose fourth element is now
`LanguageDefinition version4 (Just version3) LanguageBodyParserV2 profileV2 runtimeProfileV3 Stable`,
together with `currentStableLanguageVersion` in the same module and its one consumer,
`skeletonFor` in `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Skeleton.hs`.
Nothing in this repository imports any of them; they are read by a human and transcribed into the
spec.


## Revision Notes

**2026-08-02 — estimated figures replaced with measured ones, and one milestone note added.**
The Validation and Acceptance section was written before the suites were run and carried
estimated totals (393 Shiki `expect()` calls, 403 Vim checks). Both were slightly wrong: the real
counts are 76 Shiki tests / 387 `expect()` calls (72 / 365 before this plan) and 405 Vim checks
(389 before). The section now carries the actual transcripts, including the non-vacuousness run,
which had been written as a prediction and is now a recording.

Two smaller corrections came out of the same runs. First, `bun test -t "version-4"` matches only
*three* of the four new tests — the fourth is named for the spelling it pins rather than for the
version — so the filter command in Validation and Acceptance gained a second invocation, and the
predicted "4 pass" became the observed "3 pass" plus "1 pass". Second, the Section 3 word-grid
line range in Concrete Steps was corrected from `220,231` to `244,255`, since Milestone 1's two
paragraph edits pushed the grid down twenty-four lines, with a note that nothing downstream
depends on the range.

Surprises & Discoveries gained three findings the runs produced: the probe transcript showing
that a qualified enum member carries no scope at all (which made Milestone 3's "do not guess the
scope" caution load-bearing rather than decorative), the two comment-banner rewordings the
first-occurrence anchoring forced, and the measured totals. No milestone, decision, or scope
changed.
