---
id: 22
slug: highlight-the-keiro-dsl-explicit-id-admission-domain-clause-and-its-typeid-v5-or-v7-and-typeid-v7-values
title: "Highlight the keiro-dsl explicit id admission domain clause and its typeid-v5-or-v7 and typeid-v7 values"
kind: exec-plan
created_at: 2026-09-20T15:41:16Z
provenance:
  created_by:
    model: "claude-opus-5"
    harness: "claude-code"
    at: 2026-09-20T15:41:16Z
  revisions:
    - model: "claude-opus-5"
      harness: "claude-code"
      at: 2026-09-20T15:51:46Z
      mode: "implement"
      note: "Implemented all five milestones; both suites green (Shiki 117/0, Vim 722/0)"
---

# Highlight the keiro-dsl explicit id admission domain clause and its typeid-v5-or-v7 and typeid-v7 values

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.
If durable project context changes, update or create ADRs in docs/adr/ in the same change.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter at
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file of
regular expressions that assigns each matched piece of text a dotted *scope name* such as
`storage.modifier.keiro`; editors and Shiki colour text by scope name. A "Vim syntax file" does
the same job with Vim's `syntax keyword` and `syntax match` commands and Vim's standard highlight
group names such as `StorageClass`.) Both are driven by one written contract,
`spec/keiro-dsl-language-model.md`, which this repository keeps in step with the upstream parser
for the language, keiro-dsl, which lives in a separate repository (canonical project URI
`mori://shinzui/keiro`, checked out at `/Users/shinzui/Keikaku/bokuno/keiro`).

This plan reconciles this repository with keiro-dsl commit
`6b89cb5173c4aa5e73598c2ca41437d9fd07a6df` (short form `6b89cb51`, subject
*feat(dsl): add explicit UUID admission domains*), the head of the two-commit range
`e548fffd21f385321c7d5e42c1cbb020243c1e2b..6b89cb5173c4aa5e73598c2ca41437d9fd07a6df`. That commit
lets an `id` declaration say, in the source text, which canonical identifier values it will admit:

```text
language keiro-dsl 6
context id-admission-domains

id LegacyId prefix=legacy domain=typeid-v5-or-v7
```

The clause is optional. Leaving it off means the same thing as writing `domain=typeid-v7`, which is
also a legal spelling. Semantically the choice decides whether identifiers derived from UUID version
5 are accepted alongside the version-7 ones keiro has always accepted; none of that matters to a
highlighter. What matters is that three *words* arrived that neither package knows today: the clause
label `domain` and the two enumerated values `typeid-v5-or-v7` and `typeid-v7`.

After this change, opening a `.keiro` file that carries such a declaration in Neovim, or rendering
it through Shiki, shows `domain` coloured exactly like the `prefix` beside it, and shows
`typeid-v5-or-v7` coloured as one whole keyword rather than as a coloured `typeid` followed by grey
`-v5-`, a coloured `v5`, and so on. That is the observable outcome, and both package test suites
assert it by name against a new corpus file.


## Progress

- [x] Milestone 1 (2026-09-20) — corrected `spec/keiro-dsl-language-model.md`: Section 1 gained the
      "fifth late feature" paragraph; Section 4's bare grid gained `domain` (140 → 141) and its
      dashed grid gained `typeid-v5-or-v7 typeid-v7` (57 → 59); the implementer note's collision
      count moved from twelve to fourteen and gained the digit-ordering paragraph; a new subsection
      "The explicit id admission domain" was added between the version-preamble and mapped-type
      subsections; and Section 6's Modifier, Control and Primitive-type rows were all amended.
      Section 3 was deliberately left untouched at 72 words.
- [x] Milestone 2 (2026-09-20) — taught both highlighters the three words.
      `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`: `typeid-v5-or-v7|typeid-v7` added to
      `dashed-keywords`, `domain` added to `modifiers`, three `comment` fields extended. No
      reordering of the top-level `patterns` array was needed.
      `packages/keiro-vim/syntax/keiro.vim`: new
      `syntax match keiroStatement /\<\%(typeid-v5-or-v7\|typeid-v7\)\>/`, new
      `syntax match keiroModifier /\<domain\>-\@!/`, and `typeid` moved off the
      `syntax keyword keiroType` line onto `syntax match keiroType /\<typeid\>-\@!/`.
- [x] Milestone 3 (2026-09-20) — `corpus/id-admission-domains.keiro` copied verbatim from upstream
      (`diff` reports no difference); ` domain=typeid-v7` appended to the `id TemplateId` line of
      `corpus/language-version-6-reactions-and-selection.keiro`; both documented in
      `corpus/README.md`.
- [x] Milestone 4 (2026-09-20) — both suites extended and green. Shiki: 118 pass, 0 fail (was 111).
      Vim: 724 checks, 0 failures (was 693). Count constants moved to 141/59 in both. The last
      assertion added was the one not foreseen when the plan was written: `domain` recolours the tail
      of `package=artifact-domain` in `corpus/consumer-mapped-types.keiro`, so both suites now pin
      that deliberately (see Surprises & Discoveries).
- [x] Milestone 5 (2026-09-20) — `.keiro-dsl-sync-subject` written.


## Surprises & Discoveries

**The digit hazard is real this time, and only rule ordering hides it.** When `base16-bytes` arrived
in keiro-dsl `e548fffd` both packages were shown safe from their own number rules *by construction*:
every numeric pattern requires a word boundary before the digits, and `base16`'s `1` follows the word
character `e`. `typeid-v5-or-v7` has no such protection — its `v` follows a `-`, which is not a word
character in either engine, so Vim's `\<v\d\+\>` and the TextMate `\bv[0-9]+\b` both genuinely match
the `v5` and the `v7`. Removing the dashed rule from the Vim file and re-running the suite shows the
whole spelling fall through to plain text, which is what the number rules were previously blamed for
in the helper's own failure message:

```text
FAIL "typeid-v5-or-v7": want keiroStatement on every character, got (none) at offset 0 ("t")
FAIL "typeid-v7": want keiroStatement on every character, got (none) at offset 0 ("t")
722 checks, 4 failures
```

These are the first keywords in the language whose digits are protected by *precedence* rather than
by *pattern*, and that fact is now recorded in Section 4 of `spec/keiro-dsl-language-model.md`.

**Both new prefix collisions bite, and they bite differently.** Replacing the two guarded Vim matches
with plain `syntax keyword` declarations — `syntax keyword keiroType typeid` and
`syntax keyword keiroModifier domain` — produces seven failures rather than the four above, and the
groups reported name the culprit exactly:

```text
FAIL "domain-outcomes": want keiroStatement on every character, got keiroModifier at offset 0 ("d")
FAIL "typeid-v5-or-v7": want keiroStatement on every character, got keiroType at offset 0 ("t")
FAIL contextual-dashed "domain-outcomes": keiroModifier stops before "-outcomes" (column 7)
722 checks, 7 failures
```

`domain` shadowing `domain-outcomes` is the ordinary case the `-\@!` guards have always handled.
`typeid` shadowing the two new values is not ordinary: `typeid` is a **primitive type**, so this is
the first time the guard has been needed on a `syntax keyword keiroType` line rather than a
`keiroStatement` one, and the bare uses in `corpus/intake.keiro`, `corpus/emit.keiro`, and
`corpus/field-aliases.keiro` had to be re-checked afterwards. They are unaffected, and
`packages/keiro-vim/test/highlight_spec.lua` now pins the one in `corpus/intake.keiro` by name.

**The Shiki grammar needed no reordering at all.** Its `#dashed-keywords` rule already sits at index
4 of the top-level `patterns` array, ahead of `#modifiers` (10), `#types` (12) and `#numbers` (15),
so both collisions were resolved by adding alternatives and nothing else. Removing the two new
alternatives and the `domain` alternative reproduces the same four failures the Vim experiment
showed, which is how that ordering was confirmed rather than assumed:

```text
(fail) the domain clause label is a modifier, coloured exactly like the prefix beside it
(fail) typeid-v5-or-v7 is one whole control keyword and no part of it is a number
(fail) the explicit default typeid-v7 is the same whole control keyword
(fail) every curated contextual keyword is classified as a keyword by the grammar
 113 pass, 4 fail
```

**Upstream's fixture writes only one of the two legal spellings.** `keiro-dsl/test/fixtures/id-admission-domains.keiro`
uses `domain=typeid-v5-or-v7` and never `domain=typeid-v7`, because omitting the clause means the
same thing — `docId` in `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` prints the clause only for
`TypeIdV5OrV7`. A verbatim copy would therefore have left the second value with no hand-named
assertion in any real corpus file, covered only by the scratch-buffer word-list guard. That is why
`corpus/language-version-6-reactions-and-selection.keiro` gained the explicit spelling; see the
Decision Log.

**`domain` recolours five corpus files the upstream range never touched, and the plan did not
foresee it.** Section 6's Primitive-type row already warns that a new spelling can do this, but the
warning is written about *type* spellings and this is a clause label. Because a dash is not a word
character in either engine, the `domain` segment of an unquoted Haskell package name is now a whole
word: `haskell package=artifact-domain …` in `corpus/consumer-mapped-types.keiro`, and the same in
`corpus/aggregate-scalar-types.keiro` (`ledger-domain`), `corpus/mapped-type-spellings.keiro`
(`shipment-domain`), `corpus/language-identifier-collisions.keiro` (`language-domain`), and
`corpus/language-version-3.keiro` (`id-domain-conformance`). Neither suite noticed, because no
existing assertion pinned those segments as plain — which is itself the finding. Both suites now pin
the behaviour deliberately, following the precedent plan 21 set for `refined` inside
`context refined-base16`. Two nearby spellings survive untouched and the reasons differ: the context
name `id_domain_ledger` in `corpus/language-version-3.keiro` keeps its `domain` plain because `_`
**is** a word character, so the whole thing is one identifier and no boundary exists; and
`shape-hash="id-domain-ledger-v3"` in the same file keeps its plain because the string rule wins
inside a literal. Grepping the corpus for a new word as a *substring* before adding it — the habit
Section 6 recommends — is what turned this up.

**The commit is 60 files and 2529 insertions, and four lines of it are lexical.** Almost all of
`6b89cb51` is a new compiled conformance suite, codec plumbing, fingerprint threading, and diff
findings. A sync that judged relevance by commit size would have skipped it. What makes it lexical is
`pIdAdmission` in `keiro-dsl/src/Keiro/Dsl/Parser/Declaration.hs` — three literal spellings a
`.keiro` author now types. This is a second instance of the standing warning already in Section 3 of
the spec: `reservedWords` was untouched, and a stable Section 3 does not mean a stable language.


## Decision Log

- Decision: classify the new clause label `domain` as a **Modifier** (Vim `StorageClass`, TextMate
  `storage.modifier.keiro`) rather than as a Control keyword.
  Rationale: Section 6 of `spec/keiro-dsl-language-model.md` already classifies `prefix` and `kind`
  as Modifiers, and `domain=` is written immediately beside `prefix=` on the same `id` line, in the
  same `label=value` shape, qualifying the declaration `id` introduces rather than opening a clause
  of its own. Giving it any other class would render one half of `prefix=legacy domain=typeid-v7`
  in a different colour from the other half for no reason a reader could name.
  Date: 2026-09-20

- Decision: classify the two values `typeid-v5-or-v7` and `typeid-v7` as **Control / section
  keywords** (Vim `Statement`, TextMate `keyword.control.keiro`).
  Rationale: Section 6 already puts every other fixed enumerated clause value in that class —
  `reject`, `ignore`, `standard`, `unlogged`, `live-only`, `wait-for-head`, `fifo-heads`,
  `from-beginning`. These two are read by `symbol` from a closed two-element `choice`, so they are
  exactly that kind of value.
  Date: 2026-09-20

- Decision: copy `keiro-dsl/test/fixtures/id-admission-domains.keiro` into the corpus verbatim, and
  cover the *other* spelling, the explicit `domain=typeid-v7`, by adding it to the existing
  hand-authored `corpus/language-version-6-reactions-and-selection.keiro` rather than by editing the
  verbatim copy or authoring a second new file.
  Rationale: the upstream fixture uses only `domain=typeid-v5-or-v7`, so a verbatim copy leaves the
  second spelling with no hand-named assertion in any real file. The verbatim copy is worth keeping
  verbatim — `corpus/README.md` treats "copied verbatim at commit X" as the strongest evidence a
  corpus file can carry, because it proves both packages tokenize text that really is valid
  keiro-dsl. Appending ` domain=typeid-v7` to the existing `id TemplateId prefix=template` line in a
  file that already declares `language keiro-dsl 6` is a one-token, semantically inert change: the
  parser stores `TypeIdV7` either way, and `docId` in `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs`
  prints nothing for `TypeIdV7`, so the explicit spelling round-trips back to the implicit one.
  Date: 2026-09-20

- Decision: pin, rather than suppress, the fact that the new `domain` rule colours the `domain`
  segment of unquoted Haskell package names such as `package=artifact-domain`.
  Rationale: discovered during implementation and not foreseen when the plan was written (see
  Surprises & Discoveries). Suppressing it would mean teaching both packages that a keyword loses its
  class when a `-` precedes it, which is false for every other clause and family word in the language
  — `refined` inside `context refined-base16` and `structural` inside `context structural-text-sets`
  are coloured today, and plan 21 pinned the first of those on purpose. One rule for all of them is
  worth more than a better rendering for one word, so both suites now assert the behaviour and the
  spec's new subsection names the five corpus files it affects.
  Date: 2026-09-20

- Decision: in `packages/keiro-vim/syntax/keiro.vim`, move `typeid` off the shared
  `syntax keyword keiroType` line and onto its own `syntax match keiroType /\<typeid\>-\@!/`.
  Rationale: Vim resolves a tie between a `syntax keyword` and a `syntax match` that begin at the
  same column in favour of the keyword. `typeid` is now the leading segment of two dashed keywords,
  so left as a `syntax keyword` it would claim the head of `typeid-v5-or-v7` and leave the rest
  uncoloured — the exact defect the `-\@!` guards elsewhere in that file exist to prevent. This is
  the first time the guard has been needed on a word in the Primitive-type row.
  Date: 2026-09-20


## Outcomes & Retrospective

All five milestones are complete and both suites are green.

```text
packages/shiki-keiro:  118 pass, 0 fail, 890 expect() calls
packages/keiro-vim:    724 checks, 0 failures
```

Before this plan those numbers were 111 pass and 693 checks. The seven new Shiki tests and the
thirty-one new Vim checks cover the declaration line's two labels landing in one class, both dashed
values as whole tokens with no numeric scope inside them, the two words the new rules could have
broken (`typeid` bare in `corpus/intake.keiro`, `domain-outcomes` in
`corpus/language-version-5-projection-catalog.keiro`), the coloured `id` segment and plain tail of
`context id-admission-domains`, the newly coloured `domain` segment of
`package=artifact-domain` alongside the capitalised `Domain` that must stay plain, and enough of the
rest of the new corpus file to show the clause leaves everything else tokenizing normally.

What was achieved against the original purpose: a `.keiro` file carrying
`id LegacyId prefix=legacy domain=typeid-v5-or-v7` now renders `domain` in the same colour as the
`prefix` beside it, and renders `typeid-v5-or-v7` as a single keyword rather than as a coloured type
name followed by grey dashes and coloured version numbers. Both packages agree, because both read
their word lists from the same spec section and both are asserted against the same corpus file.

What remains: nothing in scope. Two things are worth a future reader's attention but are not defects.
The declaration-site type-name rule in `packages/keiro-vim/syntax/keiro.vim` is still inert, so
`LegacyId` stays plain in Vim while Shiki colours it; Section 6 of the spec marks that class an
optional refinement and the Vim file explains why making it work means restructuring every introducer
line. And `domain` used as an ordinary identifier — a field or register named `domain` — is coloured
as a keyword, exactly as `language`, `initial`, `key`, and `value` already are; Section 1's standing
rule says a word is a keyword because it is in a fixed list, not because of where it appears.

Lessons. The "one uniform group over every character" assertion earned its keep twice in this range:
once for the `typeid` prefix and once for the digits, and a first-character check would have passed
in both cases. And the habit of deliberately breaking a rule and re-running the suite — rather than
reasoning about whether a guard is needed — is what turned two plausible-sounding hazards into
recorded evidence.

ADR distillation: this repository has no `docs/adr/` directory and does not use ADRs; the numbered
plans in `docs/plans/` are the durable record. The two durable facts this range produced — that the
prefix-collision set now has fourteen members, one of which is a primitive type, and that
`typeid-v5-or-v7` is the first keyword whose digits are protected by ordering rather than by pattern
— are recorded in `spec/keiro-dsl-language-model.md` itself, which is where a future sync will look.


## Context and Orientation

There are no Architecture Decision Records in this repository: `docs/adr/` does not exist, and
nothing under `docs/` plays that role. The durable record of why this repository changes is the
numbered ExecPlans in `docs/plans/`, of which this is number 22. No cross-repository ADR is
relevant either; the upstream decision record for the feature is keiro-dsl's own ADR 46, cited by
its plan, and nothing in it bears on lexical highlighting.

### The four artifacts this repository keeps in agreement

`spec/keiro-dsl-language-model.md` is the authority. It is a prose description of the *lexical
surface* of keiro-dsl — which words are keywords, which tokens are types, how comments, strings and
numbers are written, and which conceptual "token class" each word belongs to. Its Section 3 is a
**verbatim copy** of the `reservedWords` list in the upstream parser module
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`, and the document says
in so many words that it must stay a verbatim copy so it can be diffed mechanically. Its Section 4
is a *curated* list of words the parser recognises in context but does not reserve, split into a
bare-word grid and a dashed-word grid. Its Section 6 is the cross-package token-class taxonomy: a
table mapping each class to one TextMate scope and one Vim highlight group.

`packages/keiro-vim/syntax/keiro.vim` is the Vim implementation, 273 lines of `syntax keyword` and
`syntax match` commands followed by `highlight default link` lines.

`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` is the Shiki implementation: a top-level
`patterns` array naming rules in priority order, and a `repository` object holding each rule.

`corpus/` holds `.keiro` sample files that **both** packages tokenize in their tests. Some are
copied verbatim from upstream's own parser fixtures; the rest are hand-authored here. `corpus/README.md`
records, for every file, where it came from and which plan it backs.

The two test suites are `packages/shiki-keiro/test/scopes.test.ts` (run with
`cd packages/shiki-keiro && bun install && bun test`) and `packages/keiro-vim/test/highlight_spec.lua`
(run with `./packages/keiro-vim/test/run.sh`, which drives headless Neovim). Both end with the same
kind of guard: they parse the fenced word lists straight out of Sections 3 and 4 of the spec, assert
the list *lengths* against hard-coded constants, and then assert that every word in those lists is
claimed by some keyword rule **in its entirety**. The whole-word requirement is what catches a dashed
keyword whose leading segment is a bare keyword; a first-character check would pass even when the
word had been split in half.

### What the upstream range changes

The range holds two commits. `30052d43` (*docs(plan): complete base16 refinement rollout*) touches
documentation only and has no lexical effect. `6b89cb51` (*feat(dsl): add explicit UUID admission
domains*) is the trigger. Restricted to the parser, grammar, pretty-printer and fixtures, its diff
is small:

```text
 keiro-dsl/src/Keiro/Dsl/Grammar.hs                 |  6 ++-
 keiro-dsl/src/Keiro/Dsl/Parser/Declaration.hs      | 17 +++++-
 keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs             | 12 ++++-
 keiro-dsl/test/fixtures/id-admission-domains.keiro | 63 ++++++++++++++++++++++
```

The whole of the new notation is one new production in
`keiro-dsl/src/Keiro/Dsl/Parser/Declaration.hs`, plus the line in `pIdDecl` that calls it:

```haskell
  admission <-
    fromMaybe TypeIdV7
      <$> optionalLanguageFeature context ExplicitIdAdmissionDomainSyntax "domain" pIdAdmission

pIdAdmission :: P IdAdmission
pIdAdmission = do
  keyword "domain"
  _ <- symbol "="
  choice
    [ TypeIdV5OrV7 <$ symbol "typeid-v5-or-v7",
      TypeIdV7 <$ symbol "typeid-v7"
    ]
```

`keiro-dsl/src/Keiro/Dsl/Grammar.hs` adds an `admission :: !IdAdmission` field to `IdDecl` and
re-exports the `IdAdmission` type from `Keiro.Codec.IdDomain`, whose two constructors are `TypeIdV7`
and `TypeIdV5OrV7`. `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` teaches `docId` to print
` domain=typeid-v5-or-v7` after the prefix, and to print **nothing** for `TypeIdV7` — so the
explicit default spelling is legal input that the pretty-printer normalises away.

`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs` adds a `LanguageFeature` constructor
`ExplicitIdAdmissionDomainSyntax` to syntax profile `keiro-dsl/syntax-profile/5` — the profile bound
by language version 6 — and a `RuntimeCapability` constructor `ExplicitIdAdmissionDomains` to
`keiro-dsl/runtime-semantics/5`. This is the fifth feature to be added to Language 6 after Language 6
itself shipped, following the bare container mapping, the `Day` calendar type, the `Set Text`
structural text set, and the `mapped refined` base16 byte refinement. The registry still holds six
versions; no new version arrived.

`keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` — the module that owns `reservedWords` — is **not touched**
by the commit. Section 3 of the spec therefore stays at exactly 72 words, and the existing 72-word
assertions in both suites stay as they are.

### Why this one is lexical, when most keiro-dsl commits are not

Most of `6b89cb51` is semantics and generated code: 60 files, 2529 insertions, nearly all of it a new
compiled conformance test suite, codec plumbing, fingerprint threading, and diff findings. A sync
that read only the commit's size would conclude nothing here needs to change. What makes it lexical
is the four lines of `pIdAdmission`: three literal spellings a `.keiro` author now types, which no
rule in either package matches today.

### The three words and where they can appear

`domain` may appear in exactly one place: in an `id` declaration, after the `prefix=` clause and
before the optional `using { … }` nominal-binding block. It is read with `keyword "domain"`. It is
**not** in `reservedWords`, so it remains legal as an ordinary identifier elsewhere — a field named
`domain`, a register named `domain`, an aggregate named `domain`. Section 1 of the spec already
settles what a highlighter does about that: a word is a keyword because it is in a fixed list, not
because of where it appears, so an identifier that happens to be spelled `domain` is coloured as a
keyword, exactly as `initial`, `key`, `value`, and `language` already are.

`typeid-v5-or-v7` and `typeid-v7` may appear only as the right-hand side of that clause. They are
read with `symbol`, not `keyword`. The difference is worth stating because it is the reverse of the
usual asymmetry: `keyword` in `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` is
`(lexeme . try) (string' w *> notFollowedBy (identChar <|> (char '-' *> identChar)))` — it refuses to
match a word that continues into another identifier character *or* into a dash followed by one,
which is precisely why `keyword "domain"` cannot fire on `domain-outcomes`. `symbol` has no such
guard at all. Neither fact changes what a highlighter does; both spellings are fixed literals and
both get matched with the same word-boundary guards every other dashed keyword in this repository
gets.

### The collisions these three words bring, and the ones they do not

Section 4 of the spec keeps a running list of the bare keywords that are a **prefix** of some dashed
keyword, because those are the only ones that need special handling. Vim's `syntax keyword` outranks
a `syntax match` that begins at the same column, so a bare keyword left as a `syntax keyword` claims
the head of its dashed partner and leaves the tail grey; the fix is to declare it as
`syntax match … /\<word\>-\@!/` instead, which refuses to fire when a dash follows. A TextMate
grammar needs no such trick, only the dashed rule listed *earlier* in the top-level `patterns` array.
That list stands at twelve words today — `on`, `dispatch`, `binding`, `dedupe`, `shape`,
`projection`, `schema`, `result`, `provisioner`, `validator`, `replay`, and the Modifier `from`.

This range adds two, taking it to **fourteen**:

`domain` is a prefix of the existing dashed Control keyword `domain-outcomes` (the aggregate clause
`domain-outcomes rejection=… no-op=…`, part of the Language 5 surface). So the new bare word must be
a guarded match in Vim from the moment it is added, never a plain `syntax keyword`.

`typeid` is a prefix of both new dashed values. `typeid` is not a clause word at all: it is a
**Primitive type**, the lowercase legacy workqueue payload type that appears in `corpus/intake.keiro`,
`corpus/emit.keiro`, and `corpus/field-aliases.keiro` as `incidentId: typeid "inc"`. It is the first
word in Section 6's Primitive-type row ever to need the `-\@!` guard, which means the fix in the Vim
file touches a `syntax keyword keiroType` line rather than a `keiroStatement` one. The bare uses in
those three corpus files must keep their `keiroType` group afterwards, which is what makes this a
change worth asserting rather than assuming.

Two non-collisions are worth recording so a future reader does not go looking for a problem that is
not there. The word `or` in the middle of `typeid-v5-or-v7` is not a keyword in this language, and a
bare keyword in the *interior* of a dashed word is harmless in both engines anyway, because both
prefer the match that starts earlier in the line. And the context name of the upstream fixture is
`context id-admission-domains`, whose first segment `id` is a reserved declaration introducer and so
*is* coloured — a dash is not a word character in either engine, so `id` there is a whole word. That
is long-standing behaviour shared by every dashed wire word in the corpus (`refined` inside
`context refined-base16`, `structural` inside `context structural-text-sets`), not something this
range introduces. `admission` and `domains` are not keywords and stay plain; note in particular that
`domains` is *not* claimed by the new `domain` rule, because every rule in both packages requires a
word boundary after the match.

### The one genuinely new hazard: digits with a real word boundary in front of them

When `base16-bytes` arrived in keiro-dsl `e548fffd` it was recorded as the first keyword in the
language to contain a digit, and both packages were shown to be safe from their own number rules by
construction: every numeric rule requires a word boundary before the digits (Vim's `\<\d\+\>`, the
TextMate `\b[0-9]+\b`), and in `base16` the `1` is preceded by the word character `e`, so no boundary
exists there.

`typeid-v5-or-v7` is not safe for that reason. Its digits are preceded by `v`, and that `v` is
preceded by `-`, which is *not* a word character in either engine. So `\<v\d\+\>` in
`packages/keiro-vim/syntax/keiro.vim` and `\bv[0-9]+\b` in
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the rules that exist to colour an event
version like `v2` in `event Touched v2` — both genuinely match the `v5` and the `v7` inside the
spelling. The only thing that keeps the word whole is rule precedence: the dashed keyword rule starts
at the `t` of `typeid`, which is earlier in the line than the `v`, and both engines prefer the match
that starts earlier. This is the first keyword in the language whose digits are protected by
ordering rather than by construction, and it means the "one uniform group over every character"
assertions in both suites are load-bearing for these two words in a way they were not for
`base16-bytes`.

### Where the counts stand

Section 3: 72 reserved words, unchanged, because `Parser/Core.hs` is untouched.

Section 4: the bare grid goes from **140** to **141** (`domain`), and the dashed grid from **57** to
**59** (`typeid-v5-or-v7`, `typeid-v7`). Both suites hard-code those three numbers and must be moved
in the same change, or they fail immediately — which is the point of the constants.


## Plan of Work

The work is five milestones. The order matters: the spec is the contract, so it moves first; the two
grammars are then brought into line with it; the corpus gets the text that exercises the new rules;
the suites then pin the behaviour and the counts; and the sync subject line is written last.

### Milestone 1 — correct the spec

At the end of this milestone `spec/keiro-dsl-language-model.md` describes the new surface completely,
and both suites *fail* — because the suites read the spec's word lists and assert their lengths
against constants that still say 140 and 57, and because no grammar rule claims the three new words
yet. That failure is the proof the guards work; do not move the constants in this milestone.

Six edits, all in `spec/keiro-dsl-language-model.md`:

First, Section 1 gains a paragraph after the one beginning "**Version 6 has since gained a fourth
late feature…**", following the established shape of the four paragraphs before it. It names
keiro-dsl commit `6b89cb51`, the `LanguageFeature` `ExplicitIdAdmissionDomainSyntax` and the
`RuntimeCapability` `ExplicitIdAdmissionDomains`, states that this is the fifth late Language 6
feature, that it costs three words, that Section 3 stays 72 because `Parser/Core.hs` is untouched,
that the registry still holds six versions, and that `corpus/id-admission-domains.keiro` is the
sample both packages tokenize.

Second, Section 3's closing note, which lists the recorded changes to `reservedWords`, needs nothing
added — there is no change — but the surrounding prose already carries the standing warning that "a
stable Section 3 does not mean a stable language". Leave it as it stands; this range is another
instance of exactly that, and the new Section 1 paragraph says so.

Third, Section 4's bare grid gains `domain` on a row of its own after `refined`, and the paragraph
that explains the final rows gains a sentence naming it, its commit, and its role.

Fourth, Section 4's dashed grid gains `typeid-v5-or-v7 typeid-v7` on a row of its own after
`base16-bytes`, with the same kind of explaining sentence.

Fifth, the implementer note under the dashed grid — the one that enumerates the twelve prefix
collisions — is corrected to fourteen, naming `domain` and `typeid`, and stating that `typeid` is
the first collision to fall in Section 6's Primitive-type row. The paragraph after it, which says
that `keiro-dsl` and `base16-bytes` are the two dashed entries whose leading segment is not a keyword
at all, is extended with the digit hazard described in Context and Orientation: `base16-bytes` is
safe by construction, `typeid-v5-or-v7` is safe only by ordering.

Sixth, a new subsection "The explicit id admission domain" is added to Section 4, after "The language
version preamble" and before "The mapped type declaration", giving the worked example, the parser
production, and the statement that the clause is optional and that omitting it means the same as
writing `domain=typeid-v7`. Section 6's Modifier row then gains `domain`, and its Control row gains
the two values; the Primitive-type row's entry for `typeid` gains a note that it is now also the
leading segment of two dashed Control keywords and so must be matched before bare words.

### Milestone 2 — teach both highlighters the three words

At the end of this milestone both grammars match all three words, and the two prefix collisions are
fixed. The suites still fail, on the count constants alone.

In `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`: add `typeid-v5-or-v7|typeid-v7` to the
alternation in the `dashed-keywords` rule, longer spelling first for readability (neither is a prefix
of the other, so the order is not load-bearing), and extend that rule's `comment` with the digit-
ordering fact. Add `domain` to the alternation in the `modifiers` rule. No reordering of the
top-level `patterns` array is needed: `#dashed-keywords` already sits at index 4, ahead of
`#modifiers` (index 10), `#types` (index 12) and `#numbers` (index 15), so the dashed spelling wins
every tie it needs to win.

In `packages/keiro-vim/syntax/keiro.vim`: add a `syntax match keiroStatement` for the two dashed
values beside the existing dashed blocks, with a comment recording the digit-ordering fact; add
`syntax match keiroModifier /\<domain\>-\@!/` beside the existing `from` guard; and change the
`syntax keyword keiroType typeid text int` line so that `typeid` becomes
`syntax match keiroType /\<typeid\>-\@!/` while `text` and `int` stay a `syntax keyword`. Extend the
comment block above the `-\@!` matches so the count reads fourteen and names both new entries.

### Milestone 3 — add the corpus samples

At the end of this milestone there is text in the repository that exercises both spellings.

Copy `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/id-admission-domains.keiro` to
`corpus/id-admission-domains.keiro` byte for byte. It is 63 lines: a `language keiro-dsl 6` preamble,
`context id-admission-domains`, the `id LegacyId prefix=legacy domain=typeid-v5-or-v7` declaration,
a `mapped structural record` whose wire fields use the declared id directly, as an `Optional`, and as
a `Map[LegacyId]` key, an `aggregate IdentityLedger` with a `replay-only` transition, a `workqueue`
with typed payload fields and a `disposition` table, and a `contract identities` with a declared id
in an event field.

Then append ` domain=typeid-v7` to the `id TemplateId prefix=template` line (line 5) of
`corpus/language-version-6-reactions-and-selection.keiro`, so the corpus also carries the explicit
default spelling in a real declaration. That file already opens `language keiro-dsl 6`, which is the
version that admits the clause.

Document both in `corpus/README.md`: a new verbatim-provenance entry for the new file after the
`mapped-refined-base16.keiro` entry, and a sentence added to the existing
`language-version-6-reactions-and-selection.keiro` entry recording the one-token extension and why it
is inert.

### Milestone 4 — assert the samples in both suites and run them green

At the end of this milestone both suites pass.

Move the three constants: `packages/shiki-keiro/test/scopes.test.ts` has `expect(bare.length).toBe(140)`
and `expect(dashed.length).toBe(57)` plus the test name that quotes both numbers;
`packages/keiro-vim/test/highlight_spec.lua` has `expect_count('bare contextual-keyword', #bare, 140)`
and `expect_count('dashed contextual-keyword', #dashed, 57)`. Both files carry a comment block
narrating every previous count change; extend it rather than replacing it.

Then add a block of hand-named assertions to each suite against `corpus/id-admission-domains.keiro`,
covering: `id` as an introducer and `LegacyId` as a declaration-site type name on the declaration
line; `prefix` and `domain` both as Modifiers on that same line; `typeid-v5-or-v7` as one whole
Control keyword with no numeric scope anywhere in it; the explicit `typeid-v7` in the Language 6
file, also whole; the bare `typeid` in `corpus/intake.keiro` still a Primitive type after the Vim
change; `domain-outcomes` in `corpus/language-version-5-projection-catalog.keiro` still whole after
the new bare `domain` rule; the `id` segment of `context id-admission-domains` coloured and its tail
plain; and enough of the rest of the new file — the mapped declaration, the aggregate, the workqueue,
the contract — to show the new clause leaves everything else tokenizing normally.

### Milestone 5 — write the sync subject line

Write a single-line Conventional Commits subject to `.keiro-dsl-sync-subject` at the repository root.
The calling automation owns the commit itself; this plan must not run `git add`, `git commit`, or
`git push`.


## Concrete Steps

All commands are run from the repository root `/Users/shinzui/Keikaku/bokuno/keiro-syntax` unless
stated otherwise.

### Step 0 — re-derive the parser facts

Do not trust this plan's quotations of upstream; re-read them. The parser lives in a second working
tree at `/Users/shinzui/Keikaku/bokuno/keiro`.

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  e548fffd21f385321c7d5e42c1cbb020243c1e2b..6b89cb5173c4aa5e73598c2ca41437d9fd07a6df \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Parser \
     keiro-dsl/src/Keiro/Dsl/Grammar.hs keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs \
     keiro-dsl/test/fixtures
```

Confirm that `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs` is absent from the diff, and that the only new
literal spellings are `domain`, `typeid-v5-or-v7`, and `typeid-v7`. Then confirm the reserved list is
still 72 words:

```bash
sed -n '/^reservedWords/,/^$/p' \
  /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser/Core.hs | grep -c '"'
```

Expected output: `72`.

### Step 1 — Milestone 1, spec edits

Edit `spec/keiro-dsl-language-model.md` as described. After editing, check the two grid lengths the
suites will read:

```bash
python3 - <<'PY'
import re
s = open('spec/keiro-dsl-language-model.md').read()
sec4 = s.split('## Section 4')[1].split('## Section 5')[0]
blocks = re.findall(r'```text\n(.*?)```', sec4, re.S)
print('bare', len(blocks[0].split()))
print('dashed', len(blocks[1].split()))
PY
```

Expected output:

```text
bare 141
dashed 59
```

### Step 2 — Milestone 2, grammar edits

Edit `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` and
`packages/keiro-vim/syntax/keiro.vim` as described. Verify the JSON still parses:

```bash
python3 -c "import json;json.load(open('packages/shiki-keiro/syntaxes/keiro.tmLanguage.json'));print('ok')"
```

Expected output: `ok`.

### Step 3 — Milestone 3, corpus

```bash
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/id-admission-domains.keiro \
   corpus/id-admission-domains.keiro
diff /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/id-admission-domains.keiro \
     corpus/id-admission-domains.keiro && echo "verbatim"
```

Expected output: `verbatim`.

Then edit line 5 of `corpus/language-version-6-reactions-and-selection.keiro` from
`id TemplateId prefix=template` to `id TemplateId prefix=template domain=typeid-v7`, and add the two
`corpus/README.md` entries.

### Step 4 — Milestone 4, tests and suites

Move the count constants, add the assertion blocks, then run both suites:

```bash
cd packages/shiki-keiro && bun install && bun test
```

```bash
./packages/keiro-vim/test/run.sh
```

Both must report zero failures. The Vim runner prints a trailing `N checks, 0 failures` line and
exits non-zero if any check failed.

### Step 5 — the sync subject line

```bash
printf '%s\n' \
  'feat(syntax): highlight the explicit id admission domain clause and its typeid domain values' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Acceptance is behaviour a human can see, and each of the following is checked by a named assertion in
both suites.

Given the line `id LegacyId prefix=legacy domain=typeid-v5-or-v7` in
`corpus/id-admission-domains.keiro`, a reader sees `id` in the declaration-introducer colour,
`LegacyId` as a type name (in Shiki; the Vim package leaves declaration-site names plain, which
Section 6 marks an optional refinement), `prefix` and `domain` in the *same* modifier colour, and
`typeid-v5-or-v7` as one unbroken control-keyword token. Specifically, no part of
`typeid-v5-or-v7` carries `constant.numeric.keiro` in Shiki, and in Vim every one of its fifteen
characters reports the same `keiroStatement` group — which is the assertion that would fail if the
`v5`/`v7` number rules won.

Given the line `id TemplateId prefix=template domain=typeid-v7` in
`corpus/language-version-6-reactions-and-selection.keiro`, the same holds for the shorter spelling.

Given `incidentId: typeid "inc"` in `corpus/intake.keiro`, the bare `typeid` still reports
`support.type.keiro` in Shiki and `keiroType` in Vim. This is the regression the `-\@!` change to the
Vim type line could plausibly break, so it is asserted directly rather than assumed.

Given `domain-outcomes rejection=OrderRejection no-op=OrderNoOp` in
`corpus/language-version-5-projection-catalog.keiro`, the word `domain-outcomes` is still one whole
token — the assertion that would fail if the new bare `domain` rule were written without its guard.

Given `context id-admission-domains`, the `id` segment is coloured as an introducer and the remainder
of the wire word is plain, matching the behaviour already pinned for `context refined-base16`.

Given `haskell package=artifact-domain module=Example.Artifact.Domain …` in
`corpus/consumer-mapped-types.keiro`, the lowercase `domain` segment of the package name *is*
coloured as a Modifier and the capitalised `Domain` of the module path beside it is not — the first
because a dash is not a word character in either engine, the second because both engines match
case-sensitively. This assertion was added during implementation rather than planned; see Surprises
& Discoveries.

Finally, the mechanical guards: the spec's Section 3 block still holds 72 words, its Section 4 blocks
hold 141 and 59, and every word in all three blocks is claimed by some keyword rule in its entirety
in both packages.

The two suites are the acceptance test:

```bash
cd packages/shiki-keiro && bun install && bun test
```

```bash
./packages/keiro-vim/test/run.sh
```

A useful way to see the guards working is to run them *between* milestones. After Milestone 1 and
before Milestone 2, both suites fail with the three new words named — Shiki reports them in the
`classifyFailures` list, Vim prints `FAIL contextual "domain": want a keyword group, got` — which
proves the spec-reading guards are not decorative.


## Idempotence and Recovery

Every step is a file edit or a file copy and can be repeated. The `cp` in Step 3 overwrites
`corpus/id-admission-domains.keiro` with the same bytes. Re-running either suite has no side effects
beyond `bun install` populating `packages/shiki-keiro/node_modules`.

The one edit that can be applied twice by mistake is Step 3's change to line 5 of
`corpus/language-version-6-reactions-and-selection.keiro`; check the line before editing and expect
exactly one ` domain=typeid-v7` on it.

Nothing here is destructive, and no step touches the upstream repository at
`/Users/shinzui/Keikaku/bokuno/keiro`, which is read-only for this work. If the work must be
abandoned, `git checkout -- .` in this repository restores it, since the automation that invoked this
plan owns the commit and nothing has been committed.


## Interfaces and Dependencies

No new libraries. The Shiki package already depends on `shiki` and is tested with `bun:test`; the Vim
package is tested by `packages/keiro-vim/test/run.sh`, which requires `nvim` on the path.

At the end of Milestone 2 the following must exist.

In `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`, the `dashed-keywords` repository rule's
`match` includes the alternatives `typeid-v5-or-v7` and `typeid-v7`, and the `modifiers` rule's
`match` includes `domain`. The top-level `patterns` array is unchanged, with `#dashed-keywords` still
ahead of `#modifiers`, `#types`, and `#numbers`.

In `packages/keiro-vim/syntax/keiro.vim`, three items: a
`syntax match keiroStatement /\<\%(typeid-v5-or-v7\|typeid-v7\)\>/`, a
`syntax match keiroModifier /\<domain\>-\@!/`, and a `syntax match keiroType /\<typeid\>-\@!/`
replacing `typeid` on the former `syntax keyword keiroType typeid text int` line, which becomes
`syntax keyword keiroType text int`.

At the end of Milestone 4, `packages/shiki-keiro/test/scopes.test.ts` asserts `bare.length === 141`
and `dashed.length === 59`, and `packages/keiro-vim/test/highlight_spec.lua` asserts the same two
numbers through `expect_count`.
