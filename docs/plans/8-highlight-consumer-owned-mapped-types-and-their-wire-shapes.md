---
id: 8
slug: highlight-consumer-owned-mapped-types-and-their-wire-shapes
title: "Highlight consumer-owned mapped types and their wire shapes"
kind: exec-plan
created_at: 2026-07-30T03:50:16Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Highlight consumer-owned mapped types and their wire shapes

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for **keiro-dsl**, a small domain-specific
language for describing event-sourced workflows whose source files end in `.keiro`. One
highlighter is a Vim/Neovim syntax file (`packages/keiro-vim/`), the other is a TextMate
grammar consumed by the Shiki JavaScript highlighter (`packages/shiki-keiro/`). Both must
agree, token for token, with the language's parser, which lives in a *different* repository
at `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`.

The keiro-dsl commit range
`407f6fe5007b711d5a81f858eb0db2e221f71ee3..430c3d2cca0f491697d7e67a85362b78718a50be` —
whose range-ending (triggering) commit is
**`430c3d2cca0f491697d7e67a85362b78718a50be`, `test(dsl): complete multi-file workspace
acceptance`** — adds an entirely new **top-level declaration** to the language, and it is
the largest single growth of the lexical surface since this repository was created. A
`.keiro` file may now declare a **consumer-owned mapped type**: a Haskell data type that
lives in somebody else's package, together with an explicit description of how that type is
encoded on the wire. The declaration begins with the new reserved word `mapped` and reads
like this (copied verbatim from the upstream fixture
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/consumer-types.keiro`):

```text
mapped structural record ArtifactInfo {
  haskell package=artifact-domain module=Example.Artifact.Domain type=ArtifactInfo
  binding = "Example.Artifact.KeiroBindings.artifactInfoBinding"
  binding-version = "1"
  canonical-type = "example.artifact.ArtifactInfo.v1"
  fixtures = "Example.Artifact.KeiroBindings.artifactInfoCases"
  initial = "Example.Artifact.KeiroBindings.emptyArtifactInfo"
  wire object constructor=ArtifactInfo unknown-fields=reject {
    key         as "key"         : Text                 required
    kind        as "kind"        : ArtifactKind         optional on-missing=Guide
    description as "description" : Optional Text        optional on-missing=null
    tags        as "tags"        : List Text            optional on-missing=[]
    attributes  as "attributes"  : Map Text             optional on-missing={}
    revision    as "revision"    : Natural              required
    observedAt  as "observedAt"  : Time                 required
    extra       as "extra"       : Json                 required
  }
}
```

**Today, in both highlighters, almost every word above is plain uncoloured text.** Open
that file in Neovim with this repository's plugin and you see `module`, `wire`, `enum`,
`required`, `version`, `Text`, `Int`, `Bool`, `Time`, `true`, `false` — words that happened
to already be keywords for unrelated reasons — lit up at random inside a wall of grey. The
words that carry the actual meaning of the declaration (`mapped`, `structural`, `opaque`,
`record`, `union`, `haskell`, `package`, `type`, `binding`, `binding-version`,
`canonical-type`, `fixtures`, `initial`, `codec`, `object`, `constructor`,
`unknown-fields`, `reject`, `ignore`, `string`, `tagged-object`, `tag`, `contents`, `as`,
`optional`, `on-missing`, `null`) are all unstyled, and so are four of the ten type
spellings the wire section accepts (`Natural`, `Json`, `Optional`, `List`, `Map`, and the
`UTCTime` alias for `Time`).

After this change, a `.keiro` file containing a mapped declaration reads as structured
code: `mapped` takes the same colour as `aggregate` and `enum` (a declaration
introducer); `structural`, `opaque`, `record`, `union`, and the field-level `optional` take
the same colour as `deprecated` and `required` (a modifier — a word that qualifies a
declaration rather than introducing one); the clause labels and enumerated clause values
take the same colour as `guard` and `states` (a control/section keyword); `Natural`,
`UTCTime`, `Json`, `Optional`, `List`, and `Map` take the same colour as `Int` and `Text`
(a primitive type); `null` takes the same colour as `HOLE` (a language constant); and, in the
Shiki package, the type name after `record`, `union`, or `opaque` takes the same colour as the
name after `aggregate` (a declaration-site type name). That is 1 new reserved word, 21 new
bare contextual keywords (of which `null` is the language constant), 5 new dashed contextual
keywords, and 6 new primitive-type spellings — 33 words in total.

You can see it working with your own eyes. After the change, from the repository root:

```bash
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/consumer-mapped-types.keiro
```

Put the cursor on the `m` of `mapped` and run
`:echo synIDattr(synID(line('.'), col('.'), 1), 'name')`; it prints `keiroKeyword`. On the
`s` of `structural` it prints `keiroModifier`; on `unknown-fields` it prints
`keiroStatement`; on the `N` of `Natural` it prints `keiroType`; on the `n` of the
`on-missing=null` sentinel it prints `keiroConstant`. Before the change, every one of those
prints an empty string.

The equivalent for Shiki, again from the repository root:

```bash
(cd packages/shiki-keiro && bun run demo && open examples/keiro-demo.html)
```

Two further things fall out of this range, and both are recorded here so that the next
reconciliation does not mistake them for regressions.

First, **the two suites gain a coverage guard for the spec's Section 4**, mirroring the one
plan 7 added for Section 3. `spec/keiro-dsl-language-model.md` Section 3 is a verbatim copy
of the parser's list of reserved words and has been mechanically guarded since
`docs/plans/7-reconcile-the-reserved-word-list-retiring-is-now-reserved.md`; Section 4 — the
*curated* list of words the parser recognises in context but does not reserve — has never
been guarded at all. This range adds 26 words to Section 4, and Section 4 is by far the
larger list (127 words after this plan, against Section 3's 72). Without a guard, a single
typo in one of the two grammar files leaves a word silently uncoloured and no test notices.
The guard reads Section 4's two fenced word lists out of the spec and asserts both packages
claim every word **in its entirety** as a keyword of some kind. Writing it immediately exposed
one pre-existing drift (`on-blocked`, listed in the spec since plan 4, present in neither
highlighter) and one pre-existing omission in the opposite direction (`cross-check`, present
in both highlighters and in the parser, absent from the spec). Both are fixed here.

Second, **the Vim package had a real mis-colouring bug affecting 13 dashed words**, and this
range would have added a fourteenth. Vim's `syntax keyword` beats a `syntax match` that starts
at the same column, so a bare `syntax keyword keiroStatement on` swallows the `on` of `on-ok`
and leaves `-ok` grey — exactly the failure the spec's Section 4 implementer note warns about.
The syntax file already works around this for `dispatch` (so that `dispatch-each` survives)
but not for `on`, `dedupe`, or `shape`, so the whole `on-*` family plus `dedupe-only` and
`shape-hash` rendered as a coloured head and a grey tail. This range's new `on-missing` would
have joined them, and the new bare keyword `binding` would have done the same to the new
`binding-version`. All are fixed with the same one-line idiom, and — because the *original*
version of the new guard probed only column 1 and therefore passed on every one of these — the
guard now checks every character of every word and fails with the exact column where the
colour stops.

**Not in scope: the `.keiro-workspace` manifest.** The same upstream range introduced a
second, *separate* file format — a service workspace manifest with the extension
`.keiro-workspace`, parsed by `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Workspace.hs`
rather than by `Parser.hs`, and looking like this:

```text
# The demo-project service workspace.
service demo-project
module Demo.Modules.Project
layout collocated
spec domain/project-artifact.keiro
```

Highlighting it would mean a second grammar, a second `ftdetect` rule, a second Shiki
language registration, and a second corpus and test surface — a new deliverable, not a
reconciliation of the existing one. Every artifact this plan touches is scoped to `.keiro`
files and the `reservedWords`/lexing rules of `Parser.hs`, which is the contract
`spec/keiro-dsl-language-model.md` states it implements. The manifest is recorded under
Surprises & Discoveries as the natural next piece of work, with the two new words it needs
(`service`, `spec`) named so a future plan starts from facts rather than a re-reading.

The observable proof of this plan is the two package test suites running green with the new
tokens and the new guard in place:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] M0 (2026-07-29) — Read the keiro-dsl diff for the range and established the lexical
      delta. `Parser.hs` grew 242 lines, all in a new "Consumer-owned mapped types (EP-149)"
      block, plus one line adding `"mapped"` to `reservedWords` (71 → 72). Enumerated the 33
      new words mechanically (see Concrete Steps) and confirmed the comment, string,
      identifier, wire-word, module-prefix, and decimal lexers are all unchanged.
- [x] M1 (2026-07-29) — `spec/keiro-dsl-language-model.md` reconciled: Section 1 records the
      `.keiro-workspace` manifest as out of scope, Section 2 notes the new signed-integer
      site, Section 3 regrown to the verbatim 72 words with `mapped` in parser position,
      Section 4 grown from 75/25 to **96 bare / 31 dashed** words (21 + 5 new, plus
      `cross-check`, plus a note explaining the curated survivor `on-blocked`), a new Section
      4 subsection describing the mapped declaration's shape, and Section 6's Declaration
      introducer, Control, Modifier, Language constant, Primitive type, and Declaration-site
      type name rows all extended.
- [x] M2 (2026-07-29) — `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` updated:
      `mapped` added to `#introducers`, the five new dashed words to `#dashed-keywords`, the
      new modifiers to `#modifiers`, the new control words to `#control-keywords`, the six
      new spellings to `#types`, `null` to `#constants`, and a new
      `#mapped-decl-with-name` rule for the type name after `record`/`union`/`opaque`.
- [x] M3 (2026-07-29) — `packages/keiro-vim/syntax/keiro.vim` updated with the same
      classification, `on-blocked` added to the dashed matches, and the `-\@!` fix applied to
      the complete set of prefix collisions: `on`, `binding`, `dedupe`, `shape` (`dispatch`
      was already handled). A comment records that the `keiroTypeName` rule is inert in Vim
      and why.
- [x] M4 (2026-07-29) — Corpus grown by two files: `corpus/consumer-mapped-types.keiro`
      (verbatim from upstream) and `corpus/mapped-type-spellings.keiro` (hand-written, for
      the `UTCTime` alias and `unknown-fields=ignore`). `corpus/README.md` provenance
      updated.
- [x] M5 (2026-07-29) — Both suites extended: hand-named assertions for the new tokens plus
      the new Section 4 coverage guard in
      `packages/shiki-keiro/test/scopes.test.ts` and
      `packages/keiro-vim/test/highlight_spec.lua`; the Section 3 count assertions moved
      from 71 to 72; both guards strengthened from a first-character probe to a whole-word
      one after the first-character version passed on three genuinely broken words.
- [x] M6 (2026-07-29) — Both suites green: Shiki `33 pass / 0 fail / 127 expect() calls`;
      Vim `260 checks, 0 failures`. Both guards proven to fail on drift, in two independent
      ways: a bogus word injected into Section 4, and the `on` fix reverted in the syntax file
      (transcripts under Validation and Acceptance).
- [x] M7 (2026-07-29) — `.keiro-dsl-sync-subject` written.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **Only one of the 33 new words is reserved, and the ratio is the point.** The parser adds
  a single line to `reservedWords` (`"mapped"`, between `"rule"` and `"ex"`) while
  introducing 32 further literal words it matches with `keyword "…"` in the new mapped-type
  parsers. This is by design and it is the rule, not the exception, in this language:
  reservation exists only to stop the plain-identifier parser `ident` from swallowing a
  structural word at a place where the grammar would otherwise be ambiguous, and inside a
  brace-delimited `mapped … { … }` block there is no such ambiguity. Evidence — the whole
  `reservedWords` change for a 242-line parser addition:

  ```diff
  @@ -118,6 +119,7 @@ reservedWords =
       , "id"
       , "enum"
       , "rule"
  +    , "mapped"
       , "ex"
       , "aggregate"
  ```

  The practical consequence for this repository is that Section 3 of the spec — the only
  mechanically diffable list — captures 1/33rd of this range's lexical surface. The other 32
  words are only ever going to be caught by a human reading `Parser.hs`, which is why this
  plan spends its test budget on making Section 4 (the curated list where those 32 words
  land) enforceable.

- **`initial` is both a new contextual keyword and an existing ordinary identifier, in the
  same upstream fixture.** The mapped declaration uses `initial = "…"` as a clause label,
  and the aggregate below it uses the bare word `initial` as a *register initializer value*:

  ```text
  mapped opaque VendorGeometry {
    initial = "Vendor.Geometry.KeiroBindings.emptyGeometry"
  }

  aggregate Catalog
    regs
      currentArtifact ArtifactInfo = initial
  ```

  The second `initial` is parsed by `RegInitBare <$> ident`, i.e. as a plain identifier, and
  `initial` is not reserved, so this is legal and will stay legal. Both highlighters colour
  both occurrences as a keyword, because highlighting here is purely lexical (spec Section
  1) and a curated contextual keyword is matched unconditionally wherever it appears. This is
  not new behaviour — `key`, `value`, `field`, `table`, `row`, and `group` have all been
  unconditional keywords since plan 4 and can all appear as ordinary names — but this is the
  first case where a *single upstream fixture* shows both readings six lines apart, so it is
  worth having written down before someone reports it as a bug.

- **Vim's `syntax keyword` beats a `syntax match` that starts at the same column, and 13
  dashed words have been mis-coloured since plan 4 because of it.** The syntax file matches
  `on-ok`, `on-terminal`, `shape-hash`, `dedupe-only`, and friends with a `syntax match`
  covering the whole dashed spelling, but it also declared bare
  `syntax keyword keiroStatement … on … dedupe … shape …`. Probing the live syntax character
  by character shows the keyword winning and the tail left grey:

  ```text
  o=keiroStatement n=keiroStatement -= o= k=
  o=keiroStatement n=keiroStatement -= t= e= r= m= i= n= a= l=
  ```

  Words whose *leading* segment is not itself a keyword are fine, because Vim's
  earlier-start rule then applies:

  ```text
  m=keiroStatement a=keiroStatement x=keiroStatement -=keiroStatement a=keiroStatement …
  s=keiroStatement t=keiroStatement a=keiroStatement t=keiroStatement u=keiroStatement s=keiroStatement -=keiroStatement m=keiroStatement a=keiroStatement p=keiroStatement
  ```

  Note the second line: `status-map` survives even though `map` *is* a keyword, because the
  `map` keyword starts at column 8 and the dashed match starts at column 1. So the hazard is
  specific to a keyword that is a **prefix** of a dashed word. The syntax file already knew
  this — it matches bare `dispatch` with `/\<dispatch\>-\@!/` and says so in a comment — it
  simply never applied the same treatment to the other four. Computing the collisions
  mechanically rather than by eye is what turned "fix `on`" into "fix all five", and it is
  worth re-running on any future sync that adds a dashed word:

  ```text
  prefix collisions (bare keyword that heads a dashed keyword):
    binding      -> binding-version
    dedupe       -> dedupe-only
    dispatch     -> dispatch-each dispatch-id
    on           -> on-ambiguous on-appended on-blocked on-duplicate on-error on-failed
                    on-missing on-ok on-reject on-terminal
    shape        -> shape-hash
  ```

  Shiki was never affected: its `#dashed-keywords` rule is listed before `#control-keywords`
  in the grammar's `patterns` array and TextMate breaks same-position ties by pattern order.

- **The first version of the new Section 4 guard passed on all 13 broken words, because it
  probed only the first character.** That is the single most useful thing this plan learned.
  The Section 3 guard inherited from plan 7 reads `group_at(lnum, 1)` — column 1 of a scratch
  buffer line — and for `on-ok` column 1 is `keiroStatement` (from the bare `on` keyword) even
  though `-ok` is grey. A guard shaped that way certifies exactly the property that is not
  broken. Both guards were rewritten to require the word be claimed **whole**: Vim compares
  every character's group against the first and reports the column where they diverge, and
  Shiki requires `explanation[]` to hold exactly one entry whose content is the entire word.
  Re-running the Vim suite with the `on` fix reverted now produces ten precise failures where
  it previously produced zero:

  ```text
  FAIL contextual-dashed "on-ok": keiroStatement stops before "-ok" (column 3) — a bare
       keyword is shadowing the dashed spelling; see the -\@! matches in syntax/keiro.vim
  260 checks, 10 failures
  ```

- **The Vim package's declaration-site type-name rule has never fired, for any introducer.**
  `keiroTypeName` is a `syntax match` of the form
  `/\<\%(aggregate\|enum\|…\)\s\+\zs\u\w*/`. Probing it directly shows the name uncoloured
  even in the simplest possible case:

  ```text
  1: a=keiroKeyword … e=keiroKeyword  = R= e= s= e= r= v= a= t= i= o= n=
  3: m=keiroKeyword … d=keiroModifier  = A= r= t= i= f= a= c= t= I= n= f= o=
  ```

  The cause is the same priority rule as above, in a form `\zs` cannot escape: Vim tries
  syntax items only at the *current scan column*, the introducer is claimed by its
  higher-priority keyword rule, and the scan then resumes *after* the introducer — at which
  point this pattern, which must begin at the introducer, can no longer match. `\zs` moves the
  highlighted region but not where the pattern has to start. Section 6 of the spec marks the
  Declaration-site type name an **optional** refinement ("A package that does not implement
  them is still correct"), so Vim remains compliant, and the Shiki package does implement it —
  which is why `expectScope(mappedTypes, 'ArtifactInfo', 'entity.name.type.keiro')` passes
  there. Plan 6 noticed the symptom (its Surprises note "`keiroTypeName` is not asserted here")
  without diagnosing the cause. The fix is a `nextgroup=keiroTypeName skipwhite` on every
  introducer declaration plus a `contained` `keiroTypeName`; that touches every introducer line
  in the file for an optional feature, so it is recorded here and left to a future plan. The
  three new mapped shape words were still added to the rule's alternation so it stays in step
  with Section 6, and a comment in `syntax/keiro.vim` explains that it is currently inert.

- **`on-blocked` has been in the spec since plan 4 but exists in neither highlighter and, as
  far as the current parser is concerned, not in the language either.** It is listed in
  Section 4's dashed block, which the section introduces as words "the parser also
  recognizes **in context**". It is not there:

  ```bash
  grep -c 'on-blocked' /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs
  ```

  ```text
  0
  ```

  It was invisible until the new Section 4 guard went in, and then it failed in Vim for a
  subtle reason worth recording: before the `on` fix, column 1 of `on-blocked` was
  `keiroStatement` (from the bare `on` keyword) so a column-1 probe *passed* while the word
  rendered wrong; after the fix, column 1 became empty and the guard failed honestly. The
  word is added to both highlighters rather than deleted from the spec, because Section 4 is
  explicitly a *curated* list and it already contains at least one other word with no
  current parser backing (`output`, likewise absent from `Parser.hs`), so the established
  convention in this repository is that the highlighters carry the curated set as written.

- **`cross-check` is the mirror image: a real parser keyword, in both highlighters, missing
  from the spec.** `Parser.hs` has `keyword "cross-check"` (it appears in an intake `bind …
  required cross-check body` clause, and `corpus/intake.keiro` line 20 uses it), and both
  grammar files have matched it since plan 4 — the spec's Section 4 dashed block simply
  never listed it. The new guard does not catch this direction (it asserts spec ⊆
  highlighters, not the reverse), so it was found by diffing the parser's full set of
  `keyword "…"` / `symbol "…"` literals against the spec while enumerating this range's new
  words. Adding it costs one word in the spec and makes the next such diff quieter.

- **The upstream range also introduces a whole second file format, which this plan
  deliberately does not highlight.** `.keiro-workspace` is a service workspace manifest,
  parsed by `Keiro.Dsl.Workspace` (a separate megaparsec parser at
  `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Workspace.hs`) with its own
  space consumer `sc = L.space space1 (L.skipLineComment "#") empty`. Its surface is tiny and
  entirely known: `#` line comments as in `.keiro`, then the four clause words `service`,
  `module`, `layout`, `spec`, the two layout values `prefixed` / `collocated`, a wire word
  after `service`, a dotted PascalCase module prefix after `module`, and a relative file path
  after each `spec`. Only `service` and `spec` are new spellings; everything else this
  repository already classifies. Highlighting it needs a second `ftdetect` rule, a second Vim
  syntax file, a second TextMate grammar, a second Shiki `LanguageRegistration` export from
  `packages/shiki-keiro/src/index.ts`, and its own corpus and assertions — a new deliverable
  rather than a reconciliation, and outside the `.keiro` scope
  `spec/keiro-dsl-language-model.md` states for itself in Section 1. Recorded here so the
  next plan can start from this paragraph.

- **`unknown-fields=ignore` and the `UTCTime` alias are the only two new spellings no single
  upstream fixture exercises, which is why the corpus gains a hand-written second file.**
  `keiro-dsl/test/fixtures/consumer-types.keiro` covers all four declaration forms, all six
  `on-missing` value shapes, and nine of the ten type spellings, but uses
  `unknown-fields=reject` throughout and never writes `UTCTime`.
  `keiro-dsl/test/fixtures/structural-conformance.keiro` has the one
  `unknown-fields=ignore`, but drops `Natural`, `Json`, `Map`, and three `on-missing` forms.
  `UTCTime` appears in no fixture at all — it is an accepted alias in
  `pMappedTypeExpr` (`TTime <$ (keyword "Time" <|> keyword "UTCTime")`) with no fixture
  coverage upstream. Copying both fixtures would still leave `UTCTime` untested here, so the
  corpus takes one verbatim copy plus one small hand-written file for the two gaps.


## Decision Log

Record every decision made while working on the plan.

- Decision: Reuse the `intention` and `master_plan` frontmatter values from the sibling plan
  `docs/plans/7-reconcile-the-reserved-word-list-retiring-is-now-reserved.md` rather than
  prompting for new ones.
  Rationale: This plan runs unattended as the `sync-keiro-dsl` mori automation; there is no
  interactive user to supply an Intention ID, and the work continues the same master plan
  (`docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md`) that produced the
  spec and both packages. Plans 4, 5, 6, and 7 set this precedent for the same reason.
  Date: 2026-07-29

- Decision: Classify `mapped` as a **Declaration introducer** and `structural`, `opaque`,
  `record`, `union` as **Modifiers**.
  Rationale: Section 6 defines an introducer as a word that "begins a top-level item or node"
  and a modifier as one that "qualifies a declaration without introducing one". `mapped` is
  the word `pTopItem` dispatches on, so it begins the item; the other four select which
  *kind* of mapped declaration follows and cannot appear without it. Applying the section's
  own definitions rather than inventing a new class keeps the taxonomy honest. The visible
  consequence is that `mapped structural enum X` shows `enum` in the introducer colour while
  `mapped structural record X` shows `record` in the modifier colour, because `enum` is a
  reserved word that is unconditionally an introducer everywhere. That asymmetry is inherent
  to lexical highlighting and is called out in the spec rather than papered over.
  Date: 2026-07-29

- Decision: Classify the field-level `optional` as a **Modifier**, matching `required`.
  Rationale: `pWireField` parses the two words in one `choice`
  (`choice [PRequired <$ keyword "required", POptional <$ keyword "optional"]`), so they
  occupy one slot and describe the same property of the same construct. `required` has been
  a Modifier since plan 4; splitting the pair across two token classes would make the wire
  section read as though the two words did different jobs.
  Date: 2026-07-29

- Decision: Classify the enumerated clause *values* `reject`, `ignore`, `object`, `string`,
  `tagged-object` as **Control / section keywords**, not Modifiers or constants.
  Rationale: The spec already classifies every other enumerated clause value this way —
  `standard`, `unlogged`, `partitioned`, `unordered`, `off`, `strict`, `lenient`, `halt`,
  `poison`, `inline` are all Control keywords in Section 6. `reject`/`ignore` are the two
  values of `unknown-fields=`, and `object`/`string`/`tagged-object` are the three values of
  the `wire` clause, so they belong with the existing set.
  Date: 2026-07-29

- Decision: Classify `null` as a **Language constant** (`constant.language.keiro` in Shiki,
  Vim group `Constant`), not as a control keyword and not as a boolean.
  Rationale: It is a literal value, not a clause label — `pOnMissing` puts it in the same
  `choice` as `true`, `false`, an integer literal, a string literal, `[]`, and `{}`. Section
  6's Language constant row already holds `HOLE`, `placeholder`, `skip`, and `hole` and
  reserves the more specific `constant.language.boolean.keiro` scope for `true`/`false`
  only, so `null` takes the general scope and Vim's `Constant` rather than `Boolean`.
  Date: 2026-07-29

- Decision: Add `Natural`, `UTCTime`, `Json`, `Optional`, `List`, and `Map` to the
  **Primitive type** class, including the two type *constructors* `List` and `Map` and the
  `Optional` wrapper.
  Rationale: All ten spellings `pMappedTypeExpr` accepts are built-in type vocabulary; a
  reader scanning `attributes as "attributes" : Map Text optional` should see `Map` and
  `Text` in one colour and `attributes` in another. `Maybe` — the pre-existing analogue of
  `Optional` — is already in that row, so this is consistent rather than novel. Note that
  `Map` (capital) and the reserved `map` (lowercase) are different words in different
  classes; both grammars are case-sensitive, and in the Shiki grammar `#types` is listed
  before `#control-keywords` so there is no ambiguity even if that changed.
  Date: 2026-07-29

- Decision: Extend the optional **Declaration-site type name** refinement to cover
  `record X`, `union X`, and `opaque X`, using a dedicated rule rather than adding those
  words to the existing `#decl-with-name` rule.
  Rationale: `#decl-with-name` gives its first capture `keyword.declaration.keiro`, so
  folding `record`/`union`/`opaque` into it would silently reclassify them as introducers and
  contradict the decision above. A separate `#mapped-decl-with-name` rule whose first capture
  is `storage.modifier.keiro` keeps the modifier classification and still colours the name.
  Without this, `mapped structural enum ArtifactKind` would be the only one of the four
  declaration forms whose name was coloured — an arbitrary-looking inconsistency, since
  `enum ArtifactKind` already matches the existing rule.
  Date: 2026-07-29

- Decision: Fix the pre-existing Vim mis-colouring of every dashed word whose leading segment
  is a bare keyword (`on`, `dedupe`, `shape` join the already-handled `dispatch`) and add the
  missing `on-blocked` to both highlighters, even though neither is a change this upstream
  range made.
  Rationale: The `on` bug is the exact defect the new `on-missing` would inherit, in the file
  this plan is already editing, and the spec's Section 4 implementer note already mandates
  the correct behaviour ("otherwise the leading segment (`on`, `max`, `dead`, ...) is matched
  first and the rest of the word is mis-coloured") — so the Vim package is out of compliance
  with a contract this repository wrote. Having found the bug class, fixing only the instance
  this range happens to touch would leave a guard that fails on 12 known-broken words, which
  is not a shippable state; the complete set was computed mechanically rather than guessed.
  `on-blocked` cannot be left alone either: the new Section 4 guard fails on it, and the
  alternatives are to add the word or to weaken the guard. Every fix is one line, and all are
  called out here and in Surprises so the diff is not mistaken for scope creep.
  Date: 2026-07-29

- Decision: Make both coverage guards require each word be claimed **whole**, not merely that
  its first character carry a keyword scope.
  Rationale: The first-character version — inherited from plan 7's Section 3 guard — passed on
  all 13 words this plan found broken, because for `on-ok` column 1 really is
  `keiroStatement`. A guard that certifies the property that is not broken is worse than no
  guard, because it invites trust. Whole-word checking costs one loop in each suite and turns
  the failure into a precise, actionable message naming the column where the colour stops. The
  Section 3 guard is upgraded along with the Section 4 one, since it shares the helper.
  Date: 2026-07-29

- Decision: Do **not** assert `keiroTypeName` in the Vim suite, and do not fix the Vim
  declaration-site type-name rule in this plan.
  Rationale: The rule has never fired for any introducer (see Surprises for the cause and the
  evidence), and Section 6 classifies Declaration-site type name as an *optional* refinement
  that a package may skip while remaining correct. Fixing it means adding
  `nextgroup=keiroTypeName skipwhite` to every introducer declaration and making
  `keiroTypeName` `contained` — a change to every introducer line in the file, with real
  regression risk across all eleven existing introducers, in service of an optional feature
  that has nothing to do with this upstream range. The three new shape words are still added
  to the rule's alternation so it stays in step with Section 6, and a comment in the syntax
  file records that it is inert so nobody "fixes" the wrong thing. Shiki does implement the
  refinement and this plan asserts it there.
  Date: 2026-07-29

- Decision: Add `cross-check` to Section 4's dashed list in the spec rather than removing it
  from the two highlighters.
  Rationale: It is a genuine `keyword "cross-check"` in `Parser.hs` and appears in
  `corpus/intake.keiro`, so the highlighters are right and the spec is incomplete. Removing
  it from the grammars would stop colouring a word the language really has.
  Date: 2026-07-29

- Decision: Spend this plan's structural test budget on a **Section 4 coverage guard** in
  both suites, in addition to hand-named assertions for the new tokens.
  Rationale: 26 of this range's 33 new words land in Section 4, and nothing checks Section 4
  against the highlighters — a typo in either grammar file leaves a word grey and no test
  notices. Plan 7 added exactly this guard for Section 3 and its value was proven the moment
  it ran (it is what makes a word added to the spec fail by name). Extending the same idea to
  the larger, entirely unguarded list is the smallest change that makes this range's surface
  self-checking, and it immediately found `on-blocked`.
  Date: 2026-07-29

- Decision: Have the Section 4 guard assert only that each word lands in *some*
  keyword-ish class, matching the Section 3 guard's looseness.
  Rationale: Section 6 deliberately splits Section 4's words across Control, Modifier, and
  Language-constant classes (for instance `via` and `required` are Modifiers while `stream`
  and `key` are Control keywords), and the two packages differ in one known, accepted place.
  A per-word class assertion would freeze the split and turn every deliberate
  reclassification into a test edit. "Is it a keyword at all?" is the question that catches
  the failure worth catching — a curated keyword rendering as plain identifier text.
  Date: 2026-07-29

- Decision: Add two corpus files — one verbatim upstream copy
  (`corpus/consumer-mapped-types.keiro`) and one small hand-written companion
  (`corpus/mapped-type-spellings.keiro`).
  Rationale: The verbatim copy is the repository's established provenance convention
  (`corpus/README.md` distinguishes copied from hand-written files) and guarantees the
  sample is real, parseable keiro-dsl exercising 31 of the 33 new words. The remaining two
  spellings — `unknown-fields=ignore` and the `UTCTime` alias — are not covered by any single
  upstream fixture, and `UTCTime` by none at all, so a small hand-written file is the only way
  to give both suites something to tokenize for them. Following the existing convention for
  `comments-and-literals.keiro` and `router-readmodel-snapshot.keiro`, it is labelled
  hand-written in `corpus/README.md`.
  Date: 2026-07-29

- Decision: Do **not** add `[`, `]`, `{`, `}` to Section 5's operator list, even though
  `on-missing=[]` and `on-missing={}` are new literal spellings built from them.
  Rationale: Braces and brackets already appear all over the language — every `{ … }` field
  list and every `project [ … ]` list — and Section 5 has never claimed them; both packages
  leave them uncoloured today. Colouring them for the first time would restyle every existing
  `.keiro` file in service of two new two-character literals, which is a change to the
  language's whole visual weight rather than a reconciliation of this range. The two empty
  literals therefore render as uncoloured punctuation, which is stated in the spec next to the
  `on-missing` description so it reads as a decision rather than an oversight.
  Date: 2026-07-29

- Decision: Do **not** highlight the new `.keiro-workspace` manifest format in this plan.
  Rationale: It is a different file extension with a different parser
  (`Keiro.Dsl.Workspace`, not `Keiro.Dsl.Parser`), and `spec/keiro-dsl-language-model.md`
  Section 1 scopes itself to `.keiro`. Supporting it means a new `ftdetect` rule, a new Vim
  syntax file, a new TextMate grammar, a new Shiki language export, and a new corpus and test
  surface — a new deliverable rather than a reconciliation of the existing four artifacts.
  Its complete lexical surface is recorded under Surprises & Discoveries so a follow-up plan
  needs no fresh research.
  Date: 2026-07-29

- Decision: Do not rebuild `packages/shiki-keiro/dist/`.
  Rationale: `dist/index.js` inlines the grammar JSON, so it *is* stale after this plan's
  grammar edit — but it has been tracked-but-not-rebuilt across plans 5, 6, and 7 by
  deliberate choice, `.gitignore` lists `dist/`, and the test suite imports
  `packages/shiki-keiro/src/index.ts` (which reads the JSON from
  `syntaxes/keiro.tmLanguage.json` directly), so nothing this repository runs consumes the
  bundle. Rebuilding it is a packaging concern for whoever publishes the package and is not
  gated by this reconciliation; doing it here would put a generated 4 KB blob in the diff and
  obscure the 33 words that are the actual change.
  Date: 2026-07-29


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-07-29): complete and meeting the original purpose.** The consumer-owned
mapped-type declaration introduced by keiro-dsl
`430c3d2cca0f491697d7e67a85362b78718a50be` is now fully highlighted by both packages. All 33
new words are classified: `mapped` as a declaration introducer; `structural`, `opaque`,
`record`, `union`, `optional` as modifiers; 15 clause labels and enumerated values as bare
control keywords and 5 more as dashed ones; `Natural`, `UTCTime`, `Json`, `Optional`, `List`,
`Map` as primitive types; `null` as a language constant. In Shiki, the type name after
`record`, `union`, and `opaque` now also receives the declaration-site type-name refinement, so
all four mapped declaration forms read the same way as `aggregate X`; in Vim that refinement
is inert for every introducer and always has been (see Surprises), which Section 6 permits.
`spec/keiro-dsl-language-model.md` Section 3 holds exactly the parser's 72 reserved words in
parser order, verified by the mechanical diff in Concrete Steps, and Section 4 holds 96 bare
and 31 dashed curated words. Every one of the 214 words the spec names — Section 3, both of
Section 4's lists, and Section 6's primitive types — is claimed as a single whole token by
exactly one rule in each package.

**Three classes of pre-existing defect were found and fixed on the way**, none of them visible
to any test beforehand. Thirteen dashed words (the whole `on-*` family plus `shape-hash` and
`dedupe-only`) rendered as a coloured head and a grey tail in Vim, because `syntax keyword`
outranks a same-column `syntax match` and `on`, `shape`, and `dedupe` were declared as bare
keywords. `on-blocked` had been listed in the spec's Section 4 since plan 4 while existing in
neither highlighter nor the current parser, and `cross-check` was the mirror case. And the Vim
`keiroTypeName` rule has never fired for any introducer — diagnosed here, left unfixed by an
explicit decision, and documented in the syntax file so it is not mistaken for a
recently-broken rule.

**The lasting artifact is the pair of whole-word coverage guards.** Both suites now read
Section 3's list and Section 4's two lists out of the spec and assert every word is claimed,
in its entirety, as a keyword by the package under test: Shiki reports `33 pass / 0 fail / 127
expect() calls` (up from 22 tests), Vim `260 checks, 0 failures` (up from 99). The most
valuable single change in this plan is the word "entirety": the guard's first draft probed only
the first character and passed on all 13 broken words, which is how a guard can be worse than
none. Together with plan 7's Section 3 guard, every *word list* in the spec is now mechanically
checked against both packages, and the check is strong enough to catch shadowing rather than
just absence. The gap that remains — and it is the honest one to name — is that nothing checks
the spec against the *parser*; that direction still depends on a human diffing `Parser.hs`
during a sync, which is what this plan's Concrete Steps do by hand. Closing it would make the
test suites depend on a sibling checkout at a fixed path, a cost plan 7 already weighed and
declined.

**Against scope.** Section 5 was left alone: the range adds no operator, and the deliberate
choice not to start colouring `[`/`]`/`{`/`}` is recorded in the Decision Log. Section 2 grew
by one clause noting that a signed integer now also appears as an `on-missing` default; the
comment, string, wire-word, module-prefix, and identifier rules are untouched, as is the
`.keiro` file extension. `packages/shiki-keiro/dist/` was not rebuilt. The `.keiro-workspace`
manifest that the same range introduced is **not** highlighted; its complete lexical surface
is written down under Surprises & Discoveries so the follow-up plan is a small one.


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master`. Commit directly to
`master`; do not create a branch. This repository ships two syntax highlighters for
**keiro-dsl**, a domain-specific language for event-sourced workflows whose files end in
`.keiro`.

**Highlighting here is purely lexical.** Tokens are coloured one at a time by pattern
matching. There is no parse of the grammar, no nesting, and no type inference. A word is a
keyword because it appears in a fixed list, not because of where it sits on the line. Two
consequences matter throughout this plan. First, whether the parser *reserves* a word or
merely recognises it in a particular position makes no difference to how this repository
colours it — both kinds are matched unconditionally, everywhere they appear. Second, a
curated keyword will therefore also be coloured where the parser would have accepted it as
an ordinary name; that is accepted, documented in the spec's Section 1, and not a bug.

**The authoritative parser is outside this repository.** It is a Haskell file using the
`megaparsec` parser-combinator library at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`. Read it; never edit
it. The definitions that matter here:

- `reservedWords :: [Text]` (around line 111) — a flat list of the words the parser refuses
  to accept as a plain identifier. Section 3 of the spec copies it verbatim. It now holds 72
  words; before this range it held 71.
- `ident :: P Name` (immediately after `reservedWords`) — the plain-identifier parser. It
  reads a letter or `_` followed by letters, digits, or `_`, then fails with "unexpected
  reserved word" if the result is in `reservedWords`. This is the **only** place
  `reservedWords` is consulted, which is why reserving a word restricts identifiers and
  nothing else.
- `keyword :: Text -> P ()` — matches a literal word not followed by an identifier character
  (nor by `-` plus an identifier character). Every one of the 32 unreserved new words in this
  range is matched with this combinator.
- `pMappedDecl :: P MappedDecl` and the helpers below it (`pStructuralClause`,
  `pOpaqueClause`, `pHaskellSource`, `pQuotedFact`, `pMappedShape`, `pUnknownFieldsFact`,
  `pWireField`, `pWireEnum`, `pWireArm`, `pMappedTypeExpr`, `pOnMissing`) — the new block,
  starting at the banner comment `-- Consumer-owned mapped types (EP-149)`. This is where
  every new word is spelled.

To see the change this plan reconciles, read-only:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  407f6fe5007b711d5a81f858eb0db2e221f71ee3..430c3d2cca0f491697d7e67a85362b78718a50be \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs
```

The range is large (283 upstream commits, ~44,000 changed lines) but almost none of it is
lexical: it is workspace composition, structural codec generation, evolution diffing, and
documentation. `Parser.hs` is the only file in it with a lexical surface, and its entire
change is the one `reservedWords` line plus the new mapped-type block.

### What a mapped type declaration is

Plain-language version, because the plan refers to these parts by name. A `.keiro` file
describes a service. Sometimes that service needs to store or transmit a data type that
belongs to a *different* Haskell package — one keiro-dsl does not generate and must not
change. A **mapped type declaration** is how the spec author points at such a type and pins
down its encoding so the toolchain can generate a codec for it. There are two families:

- `mapped structural …` — the encoding is described field by field, so the toolchain can
  generate the codec and later diff it for compatibility. It comes in three **shapes**:
  `record` (a product type, encoded as a JSON object), `enum` (a set of nullary
  constructors, encoded as a JSON string), and `union` (a sum type with payloads, encoded as
  a tagged JSON object).
- `mapped opaque …` — the encoding is *not* described; the spec just names an existing codec
  by id and version and takes it on trust.

Both families begin with facts about where the Haskell type lives
(`haskell package=… module=… type=…`) followed by quoted clause values (`binding`,
`binding-version`, `canonical-type`, `fixtures`, `initial` for structural; `codec`,
`version`, `fixtures`, `initial` for opaque). A structural declaration then ends with a
`wire` block:

- `wire object constructor=<Name> unknown-fields=<reject|ignore> { … }` for `record`, whose
  body is one line per field: `<haskellName> as "<wireKey>" : <Type> <required|optional>`
  with an optional trailing `on-missing=<value>`.
- `wire string { … }` for `enum`, whose body is one line per constructor:
  `<Ctor> as "<wireTag>"`.
- `wire tagged-object tag="…" contents="…" unknown-fields=<reject|ignore> { … }` for `union`,
  whose body is one line per arm: `<Ctor> as "<wireTag>"` with an optional `: <Type>`
  payload.

The `<Type>` slot accepts exactly ten spellings (`pMappedTypeExpr`): `Text`, `Int`, `Bool`,
`Natural`, `Time` (with `UTCTime` as an accepted alias), `Json`, the one-argument
constructors `Optional`, `List`, `Map`, and a bare identifier referring to another mapped
type. The `on-missing=` slot accepts exactly seven value shapes (`pOnMissing`): `null`, `[]`,
`{}`, `true`, `false`, a quoted string, a signed integer, or a bare constructor name.

### The four artifacts this repository keeps in agreement

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 1 is an overview
  and states that highlighting is lexical; Section 2 covers comments, strings, numbers, and
  identifier shapes; Section 3 is the verbatim `reservedWords` list; Section 4 is a *curated*
  set of words the parser recognises in context but does not reserve, with a sub-list for the
  ones written with hyphens; Section 5 lists operators; Section 6 is the token-class
  taxonomy — a table mapping each conceptual class to a TextMate scope (used by Shiki) and a
  standard Vim highlight group (used by Vim).
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file. It uses `syntax
  keyword` for bare words, `syntax match` for hyphenated words and operators, `syntax region`
  for strings, and `highlight default link` to map its own `keiro*` groups onto standard Vim
  groups (`Keyword`, `Statement`, `StorageClass`, `Type`, `Boolean`, `Constant`, `Number`,
  `String`, `SpecialChar`, `Comment`, `Operator`).
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar, scope name
  `source.keiro`. A top-level `patterns` array of `{ "include": "#name" }` entries, and a
  `repository` object defining each named rule. **Order in `patterns` is load-bearing**:
  TextMate picks the pattern whose match starts earliest in the line, breaking ties by
  position in the array, which is why `#dashed-keywords` is listed before the bare-word
  rules.
- `corpus/*.keiro` — shared `.keiro` sample files that *both* test suites tokenize.
  `corpus/README.md` records where each file came from and states that the files are
  read-only inputs for the packages.

Terms used below:

- **Reserved word** — a word the parser forbids as a bare identifier, i.e. a member of
  `reservedWords`. Always a keyword here.
- **Contextual keyword** — a word the parser recognises in a specific position but does not
  reserve, so it could still be used as a name elsewhere. A curated subset is coloured as
  keywords (spec Section 4).
- **Introducer** — a keyword that begins a top-level item or node (`aggregate`, `router`, …);
  scope `keyword.declaration.keiro`, Vim group `Keyword`.
- **Modifier** — a keyword that qualifies a declaration without introducing one
  (`deprecated`, `retiring`, `upcast`, `required`, `replay-only`, …); scope
  `storage.modifier.keiro`, Vim group `StorageClass`.
- **Control / section keyword** — every other keyword; scope `keyword.control.keiro`, Vim
  group `Statement`.

### The two test suites

- **Vim** — `packages/keiro-vim/test/highlight_spec.lua`, run headless by
  `packages/keiro-vim/test/run.sh` (requires `nvim` on `PATH`). Its hand-named assertions are
  `expect(<literal text>, <expected keiro group>)`: the helper finds the first line in the
  current buffer containing that literal text, then asserts
  `synIDattr(synID(line, col_of_first_char, 1), 'name')` equals the expected group. **It
  reads the group at the first character of the literal you pass**, so passing a multi-word
  phrase anchors on the phrase's first word — the file already uses that trick to avoid
  matching words that also appear in a header comment. Buffers are opened from the corpus
  with `open('corpus/<file>.keiro')`. The script counts checks and failures in the locals
  `checks` and `failures`, prints a summary, and calls `cquit 1` if anything failed. Its
  existing Section 3 guard fills a scratch buffer with one word per line and probes column 1
  of each line; it must run *last*, because it leaves the scratch buffer current.
- **Shiki** — `packages/shiki-keiro/test/scopes.test.ts`, run with `bun test` from
  `packages/shiki-keiro/`. It tokenizes with
  `hl.codeToTokensBase(code, { lang: 'keiro', theme: 'github-light', includeExplanation:
  true })` and asserts the token whose *trimmed* content equals a given string carries an
  expected scope. Shiki merges adjacent same-coloured tokens for display but preserves
  per-match boundaries in `explanation[]`, which is the level its `scopesOf` helper searches.
  A word that no rule claims carries only the root scope `source.keiro`, which is how the
  Section 3 guard's failure message identifies an unhighlighted word.


## Plan of Work

Seven milestones. Milestone 1 makes the contract true; milestones 2 and 3 implement it in the
two grammars; milestone 4 gives the suites something to tokenize; milestone 5 adds the
assertions and the new guard; milestone 6 runs everything; milestone 7 hands off to the
calling automation.

### Milestone 1 — Reconcile the cross-package contract (`spec/keiro-dsl-language-model.md`)

This is the substance of the plan; everything after it is mechanical. At the end of this
milestone the spec is a true description of the parser at `430c3d2`, and nothing is runnable
yet. Six edits, all in one file.

**Edit 1 — Section 2's number paragraph.** The plain-decimal bullet currently says a leading
`-` sign appears "In a register initializer". A signed integer is now also an `on-missing`
default value (`integerLiteral = lexeme (L.signed (pure ()) L.decimal)` in `pOnMissing`).
Widen the parenthetical to name both sites. Nothing else in Section 2 changes: the comment
rule, the string rule and its five escapes, the fractional/version/duration forms, and all
five identifier shapes are byte-for-byte the same upstream. In particular
`haskell package=artifact-domain` uses the existing **wire word** shape (dashes allowed) and
`module=Example.Artifact.Domain` uses the existing **module prefix** shape, both already
documented.

**Edit 2 — Section 3's count and list.** The introducing sentence says the list "contains
exactly **71** words"; change it to **72**. Insert `mapped` into the code block between
`rule` and `ex`, matching the parser's own order, and re-flow the six-column grid. The exact
72-word block is given verbatim in Concrete Steps; after editing, run the two verification
commands there — a word count, and a mechanical diff against `Parser.hs`.

Also update the closing paragraph of Section 3, which lists the changes to the reserved-word
list on record. It currently names two (50 → 70 in plan 4, 70 → 71 in plan 7); add the
third, 71 → 72, pointing at this plan's file path. And update the two places that hard-code
the count `71` in prose.

**Edit 3 — Section 3's "not every keyword is a reserved word" paragraph.** The two bullets
beneath the list explain why a keyword might sit outside `reservedWords`, and both are still
correct. Add one sentence to the second bullet naming this range as the largest example so
far: a 242-line parser addition that reserved exactly one of the 33 words it introduced.
This matters because a reader arriving at Section 3 during the *next* sync needs to know
that a stable Section 3 does not mean a stable language.

**Edit 4 — Section 4 grows by 26 words and is corrected in two places.** Add the 21 new bare
words to the bare grid, alphabetically ordered within a new final row group so the grid stays
readable, taking it from 75 to **96** words:

```text
as           binding     codec       constructor contents    fixtures
haskell      ignore      initial     null        object      opaque
optional     package     record      reject      string      structural
tag          type        union
```

Add the 5 new dashed words to the dashed sub-block — `binding-version`, `canonical-type`,
`on-missing`, `tagged-object`, `unknown-fields` — plus `cross-check`, taking it from 25 to
**31**. `cross-check` is the first of the two corrections recorded in the Decision Log: a real
`keyword "cross-check"` in `Parser.hs`, matched by both packages since plan 4 and used in
`corpus/intake.keiro`, that this list never named. The second correction is `on-blocked`: it
*stays* in the list, milestones 2 and 3 add it to both packages so the section's claim becomes
true, and a short paragraph beneath the block explains that it is a curated survivor with no
current parser backing (as `output` is in the bare grid) so a future reader does not take a
Section 4 entry as proof the parser accepts the word.

Then add a new subsection to Section 4, after the dashed sub-block, that describes the mapped
declaration's shape in prose and shows the worked example from this plan's Purpose section.
Its job is to let a third-party implementer know *why* these 26 words are keywords and where
they appear, since none of them is reserved and none of them is guessable from the grid
alone. Include the note about `on-missing=[]` and `on-missing={}` rendering as uncoloured
punctuation (Decision Log), and the note that `initial` is legal both as this clause label
and as a bare register-initializer identifier (Surprises).

**Edit 5 — Section 6's taxonomy rows.** Four rows change and one is added:

1. **Declaration introducer** — add `mapped` to the member list.
2. **Modifier** — add `structural`, `opaque`, `record`, `union`, and `optional`, with a
   parenthetical explaining that the first four select the family and shape of a `mapped`
   declaration and that `optional` is `required`'s partner on a wire field.
3. **Language constant** — add `null`, and state explicitly that it takes the general
   `constant.language.keiro` scope (Vim `Constant`), not the boolean-specific one.
4. **Primitive type** — add `Natural`, `UTCTime`, `Json`, `Optional`, `List`, `Map`, noting
   that `Map` (capital) is a primitive type while the reserved `map` (lowercase) is a control
   keyword, and that both grammars are case-sensitive.
5. **Declaration-site type name** — extend the pattern description to include the name after
   `record`, `union`, and `opaque`, and state that `mapped structural enum X` is covered by
   the pre-existing `enum X` case.

The **Control / section keyword** row needs no member edit — it is defined as "all other
reserved keywords (Section 3) **and** all curated contextual keywords (Section 4) *except the
words the Modifier row below claims*", which already sweeps up the 20 remaining new words —
but add two or three of them (`wire`, `unknown-fields`, `as`) to its illustrative list so a
reader sees the mapped surface represented.

**Edit 6 — Section 1's authoritative-source paragraph.** It names `Parser.hs` as the source
of every fact. Add one sentence stating that the sibling `Keiro.Dsl.Workspace` parser and its
`.keiro-workspace` manifest format are deliberately **out of scope** for this document and
for both packages, so the next reader does not assume an omission. Name this plan as the
place the manifest's surface is written down.

### Milestone 2 — The Shiki grammar (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

At the end of this milestone, tokenizing the new corpus with Shiki assigns every new word its
Section 6 scope. Seven edits, all inside the single JSON file. Remember that `patterns` order
decides same-position ties.

Add `"mapped"` to the `#introducers` alternation. Add the five new dashed words to
`#dashed-keywords`, plus `on-blocked` (Decision Log). Add `structural|opaque|record|union|
optional` to `#modifiers`. Add the fifteen remaining new bare words to `#control-keywords`
(the 21 new bare words less the five modifiers and `null`).
Add `Natural|UTCTime|Json|Optional|List|Map` to `#types`. Add `null` to the second pattern of
`#constants` (the one whose name is `constant.language.keiro`), **not** the first (the
boolean one).

Then add a new repository rule for the mapped declaration header and register it in
`patterns` immediately after `#decl-with-name`, so it wins the same-position tie against
`#modifiers`:

```json
"mapped-decl-with-name": {
  "match": "(?<![A-Za-z0-9_-])(record|union|opaque)(?![A-Za-z0-9_-])\\s+([A-Za-z_][A-Za-z0-9_]*)",
  "captures": {
    "1": { "name": "storage.modifier.keiro" },
    "2": { "name": "entity.name.type.keiro" }
  }
}
```

Note the negative lookbehind and lookahead: without them, `record` would match inside a
hyphenated word. The existing `#decl-with-name` rule uses `\b…\b` instead; both work for the
words they cover, and the new rule uses the stricter form the rest of the file uses because
none of its three words should ever match inside a dashed spelling.

Do not touch `#numbers` or `#operators`: this range adds no numeric form and no operator, and
the deliberate choice not to colour `[`/`]`/`{`/`}` is recorded in the Decision Log.

### Milestone 3 — The Vim syntax file (`packages/keiro-vim/syntax/keiro.vim`)

At the end of this milestone, the same classification holds in Neovim. The word lists are the
same as milestone 2; the mechanics differ in three ways, and two of them are the pre-existing
bug fix.

Add `mapped` to the introducer `syntax keyword keiroKeyword` lines. Add
`structural opaque record union optional` to the `keiroModifier` lines. Add the fifteen new
bare control words to the `keiroStatement` lines. Add `Natural UTCTime Json Optional List
Map` to the `keiroType` line. Add `null` to the `keiroConstant` line.

**The `-\@!` guard.** Vim's `syntax keyword` outranks a `syntax match` starting at the same
column, so a bare keyword that is a **prefix** of a dashed keyword swallows the dashed word's
head and leaves its tail grey. Do not declare such a word as a plain `syntax keyword`; use the
same idiom the file already uses for `dispatch`. Compute the complete set of prefix collisions
rather than guessing at it — the script is in Concrete Steps, and it finds five:
`binding` → `binding-version` (new here), `dedupe` → `dedupe-only`, `dispatch` →
`dispatch-each`/`dispatch-id` (already handled), `on` → the ten `on-*` words, and `shape` →
`shape-hash`. Remove `on`, `dedupe`, and `shape` from the bare `keiroStatement` keyword lists,
do not add `binding` to them, and declare all four as matches:

```vim
syntax match keiroStatement /\<on\>-\@!/
syntax match keiroStatement /\<binding\>-\@!/
syntax match keiroStatement /\<dedupe\>-\@!/
syntax match keiroStatement /\<shape\>-\@!/
```

Take care with the near-miss pairs: `dedup` (no `e`) is a *separate* reserved word and stays a
plain keyword, and `\<dedupe\>-\@!` does not match it. A word that is a keyword only in the
*interior* of a dashed word needs no treatment at all — Vim's earlier-start rule already lets
the dashed match win, which is why `status-map` survives despite `map` being a keyword and
`unknown-fields` survives despite `fields` being one. All of this was verified character by
character; see Surprises & Discoveries.

**The dashed matches.** Add a new `syntax match keiroStatement` line for the five new dashed
words, and add `on-blocked` to one of the existing `on-*` lines (Decision Log).

**The type-name refinement.** Extend the `keiroTypeName` alternation with `record`, `union`,
and `opaque` so the rule stays in step with Section 6:

```vim
syntax match keiroTypeName /\<\%(aggregate\|enum\|contract\|command\|event\|workflow\|operation\|process\|id\|rule\|record\|union\|opaque\)\s\+\zs\u\w*/
```

Be clear-eyed about what this achieves: **nothing, yet.** This rule has never fired for any
introducer, for the same priority reason as the `-\@!` guard above and in a form `\zs` cannot
escape — Vim tries syntax items only at the current scan column, the introducer is claimed by
its keyword rule, and the scan resumes after it, so a pattern that must begin at the introducer
never gets a chance. Section 6 marks this class an *optional* refinement, so Vim stays
compliant; the Shiki package implements it and milestone 5 asserts it there. Add a comment
above the rule recording this, and do **not** assert `keiroTypeName` in the Vim suite. Fixing
it properly (a `nextgroup=keiroTypeName skipwhite` on every introducer declaration plus a
`contained` `keiroTypeName`) touches every introducer line and is left to a future plan.

### Milestone 4 — Grow the shared corpus

At the end of this milestone two new `.keiro` files exist that between them contain every one
of the 33 new words, and `corpus/README.md` records where each came from.

`corpus/consumer-mapped-types.keiro` is a **verbatim** copy of
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/consumer-types.keiro` at
`430c3d2`. Copy it with `cp`; do not retype or reformat it. It contains all four declaration
forms, all six `on-missing` value shapes, nine of the ten type spellings, and — usefully for
the highlighters — an `aggregate` beneath the mapped declarations that consumes them, so both
suites can check that a mapped declaration does not disturb the rest of the file.

`corpus/mapped-type-spellings.keiro` is **hand-written for this repository** and covers the
two spellings no upstream fixture pairs together: `unknown-fields=ignore` and the `UTCTime`
alias for `Time`. Keep it small — one `mapped structural record` with three fields is
enough — and give it a leading `#` comment, both to match the convention of the other
hand-written corpus files and so the suites can confirm a comment still wins over the
keywords inside it. Its exact contents are in Concrete Steps.

Add both files to the provenance list in `corpus/README.md`: the first under "Copied later,
as the parser's lexical surface grew" naming the upstream fixture path and commit `430c3d2`,
the second under "The remaining files are **hand-written for this repository**" naming the
two spellings it exists for. Both entries should name this plan, as the existing entries name
plans 4, 5, and 6.

### Milestone 5 — Extend both test suites

At the end of this milestone both suites assert the new tokens by name *and* mechanically
check the whole of Section 4. Three groups of change per suite.

**Group A — hand-named assertions for the new surface.** One assertion per token class, read
from the new corpus files, so a failure names the class that broke: `mapped` is an
introducer; `structural`, `record`, `union`, `opaque`, and `optional` are modifiers;
`unknown-fields`, `as`, `haskell`, `package`, `constructor`, and `reject` are control
keywords; the five new dashed labels are control keywords; `Natural`, `Json`, `Optional`,
`List`, and `Map` are primitive types; `null` is a language constant. From
`corpus/mapped-type-spellings.keiro`: `ignore` is a control keyword and `UTCTime` a primitive
type. In Shiki only, `ArtifactInfo` and `VendorGeometry` are declaration-site type names —
which is also what proves `#mapped-decl-with-name` won its same-position tie against
`#modifiers`. Finish with a check that a mapped declaration does not disturb the `aggregate`
beneath it (`aggregate`, `guard`, `:=`) and that the hand-written file's leading comment stays
a comment despite naming five keywords.

Three cautions, all learned by hitting them. **In Vim,** the `expect()` helper reads the group
at the **first character** of the literal you pass and finds the **first** line containing it,
so anchor on phrases wherever the bare word appears earlier in the file: `type` alone would be
found inside `canonical-type` on an earlier line and must be written `type=ArtifactInfo`, and
`as` alone would be found inside `canonical`. **In both suites,** a token named in a *comment*
earlier in the file will be located there instead of at the declaration — which is why
`corpus/mapped-type-spellings.keiro` deliberately does not spell `unknown-fields=ignore` or
`UTCTime` in its header comment, and says so in the comment itself. **In Shiki,** `scopesOf`
matches on exact trimmed content, so a comment assertion must quote the comment line verbatim;
changing the corpus comment text breaks it with "Received value must be an array type"
(`scopesOf` returned `null`), not with a scope mismatch.

**Group B — update the Section 3 count.** Both suites assert the reserved-word list has 71
entries; change both to 72, and update the surrounding comments to name this range.

**Group C — the Section 4 coverage guard, and a whole-word upgrade to both guards.** Both
suites gain a guard that reads Section 4's two fenced word lists out of
`spec/keiro-dsl-language-model.md` and asserts the package under test classifies every word as
a keyword of some kind, accepting the same keyword-ish set the Section 3 guard accepts.
Implement the extraction the same way in both: find the line starting `## Section 4`, then
collect fenced ```` ```text ```` blocks up to the next `## Section` heading. Section 4 contains
a **third** fenced block — the `replay-only` worked example, which is `.keiro` code, not a word
list — so take only the **first two** blocks, which are the bare grid and the dashed sub-block
in that order. Distinguishing them structurally rather than by content is what keeps the
extraction from having to recognise prose. Assert the counts (**96** bare, **31** dashed after
this plan's edits) before checking any word, so a spec edit that breaks the extraction fails as
a count mismatch rather than as a hundred confusing per-word failures. Factor the extraction
into one helper per suite parameterised by heading and block count, and use it for Section 3
too.

The guard must require each word be claimed **whole**, not merely that its first character
carries a keyword scope. This is the single most important line in the milestone: the
first-character version passes on every one of the 13 dashed words this plan fixes, because for
`on-ok` column 1 genuinely is `keiroStatement`. In Vim, compare every character's group against
the first and report the column where they diverge; in Shiki, require `explanation[]` to hold
exactly one entry whose content is the entire word.

In Shiki, reuse the existing `KEYWORDISH_SCOPES` set, tokenizing each word as a one-word
document; collect all failures and assert on the collected array so a multi-word drift reports
every word at once. In Vim, reuse the existing scratch-buffer technique from the Section 3
guard — `enew!`, then `buftype=nofile` / `bufhidden=wipe` / `swapfile=false`, then
`nvim_buf_set_lines`, then `vim.bo.filetype = 'keiro'` (setting the filetype *last* is what
makes the syntax apply to contents already in the buffer), then `syntax sync fromstart` — and
factor it into a helper called once per word list. Route results through the existing
`checks`/`failures` counters, and clear `vim.bo.modified` afterwards so the script's closing
`quitall` does not fail with `E37: No write since last change`.

### Milestone 6 — Run both suites green, and prove the new guard guards

See Concrete Steps for the commands and expected transcripts, and Validation and Acceptance
for the deliberate-breakage check.

### Milestone 7 — Write the sync subject

Write a single Conventional Commits subject line to `.keiro-dsl-sync-subject` at the
repository root. The calling `sync-keiro-dsl` automation reads this file and owns the commit;
the file is listed in `.gitignore`, so it never appears as a change. Because the user-visible
outcome is new colour on a new declaration, the subject is a `feat(syntax)` change.


## Concrete Steps

All commands assume the working directory `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless
stated otherwise.

Inspect the upstream change this plan reconciles (read-only):

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  407f6fe5007b711d5a81f858eb0db2e221f71ee3..430c3d2cca0f491697d7e67a85362b78718a50be \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs
```

The one-line reserved-word change inside that diff:

```diff
@@ -118,6 +119,7 @@ reservedWords =
     , "id"
     , "enum"
     , "rule"
+    , "mapped"
     , "ex"
     , "aggregate"
```

Enumerate the range's new words mechanically rather than by eye — this is how the 33 were
found, and re-running it is the cheapest way to confirm nothing was missed. It lists every
literal word the parser matches with `keyword "…"` or `symbol "…"`, subtracts everything the
spec already knows about, and prints the remainder:

```bash
python3 - <<'PY'
import re
P='/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs'
src=open(P).read()
words = set(re.findall(r'(?:keyword|symbol|pQuotedFact|pPolicyLine) "([A-Za-z][A-Za-z0-9_-]*)"', src))
spec=open('spec/keiro-dsl-language-model.md').read().split('\n')
def blocks(heading, limit):
    i=next(j for j,l in enumerate(spec) if l.startswith(heading))
    out=[]
    while i < len(spec) and len(out) < limit:
        if spec[i]=='```text':
            j=i+1; b=[]
            while spec[j]!='```': b.append(spec[j]); j+=1
            out.append(' '.join(b).split()); i=j
        elif spec[i].startswith('## Section') and not spec[i].startswith(heading):
            break
        i+=1
    return [w for b in out for w in b]
known = set(blocks('## Section 3',1)) | set(blocks('## Section 4',2))
known |= {'Bool','Int','Text','Time','Id','Maybe','typeid','text','int'}      # Section 6 primitive types
known |= {'true','false','HOLE','placeholder','skip','hole'}                  # Section 6 language constants
print('parser words the spec does not classify:')
print(' '.join(sorted(words - known)))
PY
```

Before milestone 1 this prints the 33 new words interleaved with 15 pre-existing gaps
(`AckOk`, `DeadLetter`, `Eventual`, `Fired`, `Retry`, `Strong`, `ackOk`, `deadLetter`, `max`,
`multiplier`, `occurrence`, `sourceEventId`, `subscription`, `targetStreamName`, `uuidv5` —
mostly constructor-like disposition values, all outside this range and deliberately left
alone). After milestone 1 it prints only those 15. It also reports `cross-check` before the
edit, which is how that omission was found.

Compute the bare/dashed **prefix collisions** that milestone 3's `-\@!` guard must cover. Do
not guess at this list; re-run it on any future sync that adds a dashed keyword:

```bash
python3 - <<'PY'
spec=open('spec/keiro-dsl-language-model.md').read().split('\n')
def blocks(h,n):
    s=next(j for j,l in enumerate(spec) if l.startswith(h)); out=[]; i=s+1
    while i<len(spec) and len(out)<n:
        if spec[i].startswith('## Section'): break
        if spec[i]=='```text':
            c=spec.index('```',i+1); out.append(' '.join(spec[i+1:c]).split()); i=c
        i+=1
    return out
words = set(blocks('## Section 3',1)[0]) | set(w for b in blocks('## Section 4',2) for w in b)
dashed = [w for w in words if '-' in w]
print('prefix collisions (bare keyword that heads a dashed keyword):')
for b in sorted(w for w in words if '-' not in w):
    hits = sorted(d for d in dashed if d.startswith(b + '-'))
    if hits: print(f'  {b:12s} -> {" ".join(hits)}')
PY
```

```text
prefix collisions (bare keyword that heads a dashed keyword):
  binding      -> binding-version
  dedupe       -> dedupe-only
  dispatch     -> dispatch-each dispatch-id
  on           -> on-ambiguous on-appended on-blocked on-duplicate on-error on-failed on-missing on-ok on-reject on-terminal
  shape        -> shape-hash
```

The exact replacement for Section 3's code block — 72 words, parser order, six aligned
columns:

```text
context   module    layout    prefixed      collocated  id
enum      rule      mapped    ex            aggregate   regs
states    command   event     wire          projection  snapshot
category  guard     write     emit          goto        fields
status-map true     false     retiring      deprecated  upcast
from      HOLE      process   router        dispatch-each resolve
read-model dispatch intake    contract      topic       accept
bind      dedupe    persist   decode        disposition publisher
map       workqueue queue     payload       retry       fanout
dedup     enqueue   seenIn    workflow      operation   consistency
body      step      await     sleep         child       patch
continueAsNew readmodel columns feed        scope       shape
```

Verify the list after editing — the count, then the round-trip against the parser:

```bash
awk '/^## Section 3/{f=1} f&&/^```text/{g=1;next} g&&/^```/{exit} g' \
  spec/keiro-dsl-language-model.md | tr -s '[:space:]' '\n' | grep -c .
```

```text
72
```

```bash
diff <(awk '/^## Section 3/{f=1} f&&/^```text/{g=1;next} g&&/^```/{exit} g' \
        spec/keiro-dsl-language-model.md | tr -s '[:space:]' '\n' | grep .) \
     <(sed -n '/^reservedWords ::/,/^    \]$/p' \
        /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs \
        | grep -oE '"[A-Za-z0-9_-]+"' | tr -d '"') && echo 'spec matches parser'
```

```text
spec matches parser
```

That second command is the mechanical diff Section 3 exists to enable. Run it by hand; it is
deliberately not part of either suite, because the suites must stay runnable in a checkout
without the sibling keiro repository beside it.

Copy the upstream fixture into the corpus verbatim:

```bash
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/consumer-types.keiro \
   corpus/consumer-mapped-types.keiro
diff /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/consumer-types.keiro \
     corpus/consumer-mapped-types.keiro && echo 'verbatim copy'
```

```text
verbatim copy
```

Write the hand-authored companion `corpus/mapped-type-spellings.keiro`. Note that the header
comment deliberately avoids spelling `unknown-fields=ignore` and `UTCTime`: both suites locate
a token by its **first** occurrence in the file, so naming them in a comment makes the
assertions read the comment instead of the declaration.

```text
# keiro-dsl mapped-type spellings that no single upstream fixture exercises together: the
# lenient policy for unknown wire fields, and the alias spelling of the timestamp type.
# Every keyword in this comment — mapped, record, wire, optional, Natural — must stay
# Comment, not keyword. The two spellings under test are deliberately NOT written here: both
# suites locate a token by its first occurrence in the file, so naming them in a comment
# would make the assertions read the comment instead of the declaration.
context mapped-spellings

mapped structural record ShipmentTouch {
  haskell package=shipment-domain module=Example.Shipment.Domain type=ShipmentTouch
  binding = "Example.Shipment.KeiroBindings.shipmentTouchBinding"
  binding-version = "1"
  canonical-type = "example.shipment.ShipmentTouch.v1"
  fixtures = "Example.Shipment.KeiroBindings.shipmentTouchCases"
  initial = "Example.Shipment.KeiroBindings.emptyShipmentTouch"
  wire object constructor=ShipmentTouch unknown-fields=ignore {
    touchedAt as "touched_at" : UTCTime         required
    note      as "note"       : Optional Text   optional on-missing=null
    hopCount  as "hop_count"  : Natural         optional on-missing=0
  }
}

aggregate Shipment
  regs
    lastTouch ShipmentTouch = initial
  states Idle Touched!

  command RecordTouch { touch:ShipmentTouch }
  event TouchRecorded = fields(RecordTouch)

  Idle -- RecordTouch -->
    write lastTouch := touch
    emit  TouchRecorded
    goto  Touched

  wire kind=ctorName fields=camelCase schemaVersion=1
```

Run both suites:

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

Observed Shiki transcript tail:

```text
bun test v1.3.13 (bf2e2cec)

 33 pass
 0 fail
 127 expect() calls
Ran 33 tests across 1 file. [479.00ms]
```

Observed Vim transcript tail:

```text
ok   contextual-dashed "binding-version" -> keiroStatement
ok   contextual-dashed "canonical-type" -> keiroStatement
ok   contextual-dashed "on-missing" -> keiroStatement
ok   contextual-dashed "tagged-object" -> keiroStatement
ok   contextual-dashed "unknown-fields" -> keiroStatement

260 checks, 0 failures
```

Write the sync subject:

```bash
printf '%s\n' \
  'feat(syntax): highlight consumer-owned mapped types and their wire shapes' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Both suites must exit 0. `bun test` must print `0 fail`; `packages/keiro-vim/test/run.sh`
must print `0 failures` (it calls `cquit 1` on any failure, so a non-zero exit is itself the
signal).

Beyond the suites, the acceptance a human can see is that a mapped declaration reads as
structured code. Open the verbatim corpus file in Neovim with only this repository's plugin
on the runtime path:

```bash
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/consumer-mapped-types.keiro
```

With the cursor on the first character of each token below, `:echo synIDattr(synID(line('.'),
col('.'), 1), 'name')` must print the group shown. Every one of the first eleven prints an
**empty string** before this plan, which is the before/after that matters; the last three are
regression checks on the `aggregate` that sits beneath the mapped declarations. This is the
observed transcript of exactly that probe, run headless over
`corpus/consumer-mapped-types.keiro`:

```text
mapped                   -> keiroKeyword
structural               -> keiroModifier
opaque VendorGeometry    -> keiroModifier
haskell                  -> keiroStatement
unknown-fields           -> keiroStatement
reject                   -> keiroStatement
as "key"                 -> keiroStatement
optional                 -> keiroModifier
null                     -> keiroConstant
Natural                  -> keiroType
Map Text                 -> keiroType
Json                     -> keiroType
aggregate Catalog        -> keiroKeyword
write                    -> keiroStatement
emit                     -> keiroKeyword
```

Two things to read carefully in that list. `Natural`, `Map`, and `Json` are `keiroType`, not
`keiroConstant` — only `null` is a constant. And `emit` is `keiroKeyword` rather than
`keiroStatement`, because `emit` is classified as a declaration introducer (it introduces a
contract's emit clause); that is pre-existing and unrelated to this range.

`keiroTypeName` is deliberately **absent** from the list: the Vim rule for that optional
refinement has never fired for any introducer (see Surprises & Discoveries). Shiki does
implement it, and `bun test` asserts `ArtifactInfo` and `VendorGeometry` there.

Use `synIDattr(synID(...), 'name')` — the untranslated form. `synIDtrans` follows the whole
`highlight default link` chain and would print `Type` for a modifier, because Vim's own
defaults link `StorageClass` to `Type`.

The pre-existing Vim bug this plan fixes is verifiable directly. Before the fix, probing
`on-ok` character by character shows the tail unhighlighted; after the fix the whole word is
`keiroStatement`. The one-off probe:

```bash
cat > /tmp/dashed-probe.lua <<'LUA'
vim.opt.runtimepath:prepend(vim.fn.getcwd() .. '/packages/keiro-vim')
vim.cmd('filetype on'); vim.cmd('syntax on')
vim.cmd('enew!')
vim.bo.buftype = 'nofile'; vim.bo.swapfile = false
local words = {'on-ok', 'on-terminal', 'on-missing', 'on-blocked', 'binding-version',
  'canonical-type', 'unknown-fields', 'tagged-object', 'status-map', 'shape-hash',
  'dedupe-only', 'binding', 'on'}
vim.api.nvim_buf_set_lines(0, 0, -1, false, words)
vim.bo.filetype = 'keiro'
vim.cmd('syntax sync fromstart')
for l = 1, #words do
  local line = vim.fn.getline(l); local groups = {}
  for c = 1, #line do groups[vim.fn.synIDattr(vim.fn.synID(l, c, 1), 'name')] = true end
  local names = {}
  for g in pairs(groups) do names[#names + 1] = (g == '' and '<none>' or g) end
  table.sort(names)
  print(string.format('%-16s -> %s', line, table.concat(names, ',')))
end
vim.bo.modified = false; vim.cmd('quitall!')
LUA
nvim --headless -u NONE -N -l /tmp/dashed-probe.lua
```

Each line must print exactly one group. Observed after this plan:

```text
on-ok            -> keiroStatement
on-terminal      -> keiroStatement
on-missing       -> keiroStatement
on-blocked       -> keiroStatement
binding-version  -> keiroStatement
canonical-type   -> keiroStatement
unknown-fields   -> keiroStatement
tagged-object    -> keiroStatement
status-map       -> keiroStatement
shape-hash       -> keiroStatement
dedupe-only      -> keiroStatement
binding          -> keiroStatement
on               -> keiroStatement
```

Before it, `on-ok`, `on-terminal`, `shape-hash`, and `dedupe-only` print
`<none>,keiroStatement` (a coloured head, a grey tail), and the five new words print `<none>`.

**The headline structural acceptance is that the two guards actually guard.** Prove it two
different ways. First, break the *spec* and watch both suites name the offending word:

```bash
cp spec/keiro-dsl-language-model.md /tmp/spec-backup.md
```

Edit `spec/keiro-dsl-language-model.md` and append a word the highlighters do not know —
`frobnicate` — to the last line of Section 4's **bare** word grid. Then:

```bash
(cd packages/shiki-keiro && bun test) ; ./packages/keiro-vim/test/run.sh
```

Shiki fails twice, once on the count and once naming the word, and the scope list in the
message is the whole point — `["source.keiro"]` means no rule claimed it, so it would render
as plain identifier text. Observed:

```text
Expected: 96
Received: 97
(fail) the spec Section 4 lists 96 bare and 31 dashed contextual keywords [1.14ms]

+   "frobnicate: [\"source.keiro\"]",
(fail) every curated contextual keyword is classified as a keyword by the grammar [4.06ms]

 31 pass
 2 fail
```

Vim reports the same drift in its own idiom and `run.sh` exits 1. Observed:

```text
FAIL bare contextual-keyword count: want 96, got 97
FAIL contextual "frobnicate": want a keyword group, got

261 checks, 2 failures
```

Restore the spec and confirm green again:

```bash
cp /tmp/spec-backup.md spec/keiro-dsl-language-model.md
(cd packages/shiki-keiro && bun test) && ./packages/keiro-vim/test/run.sh
```

Second, break the *syntax file* rather than the spec, which is the failure mode the whole-word
upgrade exists for. Replace `syntax match keiroStatement /\<on\>-\@!/` in
`packages/keiro-vim/syntax/keiro.vim` with `syntax keyword keiroStatement on` — reintroducing
the pre-existing bug — and re-run the Vim suite. Observed:

```text
FAIL contextual-dashed "on-appended": keiroStatement stops before "-appended" (column 3) — a
     bare keyword is shadowing the dashed spelling; see the -\@! matches in syntax/keiro.vim
… eight more …
FAIL contextual-dashed "on-missing": keiroStatement stops before "-missing" (column 3) — a
     bare keyword is shadowing the dashed spelling; see the -\@! matches in syntax/keiro.vim

260 checks, 10 failures
```

That transcript is the acceptance for the whole-word upgrade: a first-character guard reports
`260 checks, 0 failures` on the very same broken file. Restore with
`git checkout -- packages/keiro-vim/syntax/keiro.vim`.

Finally, confirm all three extractions are wired up independently by repeating the first
exercise against Section 3's block and against Section 4's **dashed** sub-block.

Finally, `git status --porcelain` at the end of the work must show exactly these entries:

```text
 M corpus/README.md
 M packages/keiro-vim/syntax/keiro.vim
 M packages/keiro-vim/test/highlight_spec.lua
 M packages/shiki-keiro/syntaxes/keiro.tmLanguage.json
 M packages/shiki-keiro/test/scopes.test.ts
 M spec/keiro-dsl-language-model.md
?? corpus/consumer-mapped-types.keiro
?? corpus/mapped-type-spellings.keiro
?? docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md
```

`.keiro-dsl-sync-subject` is deliberately absent: `.gitignore` lists it as "Scratch handoff
from the agent to `scripts/sync-keiro-dsl.sh`", so it never shows up as a change. What
matters is what is *not* in that list — `packages/shiki-keiro/dist/` (tracked despite the
`dist/` ignore rule) is untouched, per the Decision Log.


## Idempotence and Recovery

Every edit is to a tracked file or an additive new file, and all of them are safe to repeat.
`bun install`, `bun test`, and `packages/keiro-vim/test/run.sh` are repeatable and write only
to `node_modules/` and test scratch. This plan runs no build step, so
`packages/shiki-keiro/dist/` is never rewritten. The two corpus additions are created with
`cp` and a heredoc respectively; re-running either overwrites with identical bytes.

The spec edits are the only place where a partial application leaves the repository
inconsistent — for example a list regrown to 72 words while the introducing sentence still
says 71, or Section 4's grid grown while the suites still assert the old counts. Three
verification commands detect exactly that and are safe to run at any point: the Section 3
word count, the mechanical diff against `Parser.hs`, and the two suites (whose count
assertions fail loudly on a mismatch). If a grid's alignment gets mangled mid-edit, the code
blocks are plain text with no semantic dependence on column positions — re-paste the block
given in Concrete Steps verbatim.

If the deliberate-breakage check under Validation and Acceptance is interrupted, restore the
spec from the backup copy (`cp /tmp/spec-backup.md spec/keiro-dsl-language-model.md`) or, if
that is gone, with `git checkout -- spec/keiro-dsl-language-model.md` followed by re-applying
milestone 1.

The two grammar files are the riskiest edits in practice, because a malformed regex or a
missing comma in the JSON breaks *all* highlighting rather than one word. Both failures are
loud: `bun test` throws while building the grammar, and Neovim reports the offending
`syntax` command. If either happens, `git checkout -- packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`
or `git checkout -- packages/keiro-vim/syntax/keiro.vim` restores a working file and the
milestone can be re-applied one alternation at a time.

If `nvim` is not installed the Vim suite cannot run locally. That is not a blocker: the
calling `sync-keiro-dsl` automation re-runs both suites itself and owns the commit, so leaving
the tree edited is the correct end state. Record the skip in Progress if it happens.

Do **not** run `git commit`, `git add`, or `git push`, and do **not** write
`spec/.keiro-dsl-sync`. The calling script owns all of those.


## Interfaces and Dependencies

No new runtime or development dependencies. `packages/shiki-keiro/package.json` already
declares everything the Shiki suite uses (`shiki` ^4.0.0 as both a peer and a dev dependency,
`tsup` ^8.0.0, `typescript` ^5.5.0) and tests run under `bun test`. The Shiki suite reads the
spec with `readFileSync` from `node:fs` and `resolve` from `node:path`, both already imported
in `packages/shiki-keiro/test/scopes.test.ts`. The Vim suite needs `nvim` on `PATH`, loads no
plugins (`-u NONE`), and uses only built-in API (`vim.cmd`, `vim.api.nvim_buf_set_lines`,
`vim.bo`, `vim.fn.synID`, `vim.fn.synIDattr`, `vim.fn.readfile`).

The keiro-dsl parser at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` is a read-only input,
not a build dependency. Neither test suite reads it — the guards read
`spec/keiro-dsl-language-model.md` instead — so the suites remain runnable in a checkout that
does not have the sibling keiro repository beside it.

Contracts that must hold at the end of the work:

- `spec/keiro-dsl-language-model.md` Section 3 announces **72** words and its code block
  contains exactly the 72 members of the parser's `reservedWords`, in parser order, with
  `mapped` between `rule` and `ex`.
- `spec/keiro-dsl-language-model.md` Section 4's bare grid holds **96** words including the
  21 added here (`as`, `binding`, `codec`, `constructor`, `contents`, `fixtures`, `haskell`,
  `ignore`, `initial`, `null`, `object`, `opaque`, `optional`, `package`, `record`, `reject`,
  `string`, `structural`, `tag`, `type`, `union` — of which `null` is a language constant and
  `opaque`, `optional`, `record`, `structural`, `union` are modifiers rather than control
  keywords), and its dashed sub-block holds **31** words including `binding-version`,
  `canonical-type`, `on-missing`, `tagged-object`, `unknown-fields`, and `cross-check`. No word
  appears in both lists or in Section 3.
- `spec/keiro-dsl-language-model.md` Section 6 lists `mapped` in the Declaration-introducer
  row; `structural`, `opaque`, `record`, `union`, `optional` in the Modifier row; `null` in
  the Language-constant row; `Natural`, `UTCTime`, `Json`, `Optional`, `List`, `Map` in the
  Primitive-type row; and `record`/`union`/`opaque` in the Declaration-site-type-name row.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` defines a `mapped-decl-with-name`
  repository rule, included in `patterns` after `#decl-with-name` and before `#introducers`,
  whose capture 1 is `storage.modifier.keiro` and capture 2 `entity.name.type.keiro`.
- `packages/keiro-vim/syntax/keiro.vim` declares **no** bare `syntax keyword` for `on`,
  `binding`, `dedupe`, or `shape`; all four (plus the already-handled `dispatch`) are
  `syntax match … -\@!` so the dashed words that start with them survive. Its `keiroTypeName`
  rule carries a comment recording that it is inert.
- `corpus/consumer-mapped-types.keiro` is byte-identical to
  `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/consumer-types.keiro` at
  keiro-dsl `430c3d2`.
- `packages/shiki-keiro/test/scopes.test.ts` and
  `packages/keiro-vim/test/highlight_spec.lua` each assert the Section 3 count is 72, assert
  the Section 4 counts are 96 bare / 31 dashed, and assert every word in all three lists is
  claimed **as one whole token** carrying one of the keyword-ish classes
  (`keyword.declaration.keiro`, `keyword.control.keiro`, `storage.modifier.keiro`,
  `constant.language.keiro`, `constant.language.boolean.keiro` for Shiki; `keiroKeyword`,
  `keiroStatement`, `keiroModifier`, `keiroBoolean`, `keiroConstant` for Vim). Neither suite
  asserts a *specific* class per word.
- `packages/shiki-keiro/dist/` is unchanged.
