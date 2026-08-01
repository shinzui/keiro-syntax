---
id: 13
slug: reconcile-the-language-version-gating-notes-with-grammar-context-parsing
title: "Reconcile the language version gating notes with grammar context parsing"
kind: exec-plan
created_at: 2026-08-01T16:33:11Z
---

# Reconcile the language version gating notes with grammar context parsing

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for Shiki at
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. Both are driven by one written contract,
`spec/keiro-dsl-language-model.md`, which is kept in step with the upstream parser for the
language: `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, in the
separate `keiro` repository (canonical project URI `mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`9ea8f8541da57c26d7317d120457240d7a634225` (short form `9ea8f85`), the head of the range
`f7699611d34a735a6f54c48ffc9c5f0bfe97265d..9ea8f8541da57c26d7317d120457240d7a634225`.

**The headline is that no highlighting rule changes.** The upstream commit range adds no
keyword, removes none, adds no operator, and changes no comment, string, number, or identifier
rule. Both packages are already correct and stay byte-for-byte unchanged.

What *did* change is the machinery that decides which *language version* a source is written
against, and that machinery is described at length in four places in this repository as
justification for highlighter decisions. Those descriptions are now factually wrong about the
parser. Concretely, before this range a `.keiro` file was scanned as **raw text, line by line**,
before any grammar ran; that scan rejected a file merely for containing certain *spellings*
anywhere on a non-comment line. After this range the same decisions are made **inside the
grammar**, at the productions that own the syntax. The user-visible consequence is that words
which are legal identifiers — `language`, `using`, `Integer`, `reg`, `cmd` — no longer poison a
file just by appearing in it.

What someone gains after this change: a reader of `spec/keiro-dsl-language-model.md` gets an
accurate account of the parser it claims to be derived from, and both test suites gain a sample
proving the highlighters do the right thing on a file that **could not previously exist** — a
valid `.keiro` source in which every one of those five words is used as an ordinary identifier.
You can see it working by running the two suites named in Validation and Acceptance and watching
the new assertions pass against the new corpus file.


## Progress

- [x] Read the upstream diff for the range and establish that the lexical surface is unchanged
      (2026-08-01).
- [x] Confirm mechanically that `reservedWords` and the whole Lexer section of `Parser.hs` are
      byte-identical across the range, and that no keyword or operator spelling was added or
      removed (2026-08-01).
- [x] Write this ExecPlan (2026-08-01).
- [x] Milestone 1 — correct the four stale parser-mechanics passages in
      `spec/keiro-dsl-language-model.md` (2026-08-01).
- [x] Milestone 2 — correct the stale in-file comment in `corpus/language-preamble.keiro`
      (2026-08-01).
- [x] Milestone 3 — add `corpus/language-identifier-collisions.keiro` and document its
      provenance in `corpus/README.md` (2026-08-01).
- [x] Milestone 4 — extend `packages/shiki-keiro/test/scopes.test.ts` and
      `packages/keiro-vim/test/highlight_spec.lua` to tokenize the new corpus file
      (2026-08-01).
- [x] Milestone 5 — run both suites green and record the transcripts here (2026-08-01).
- [x] Write the Conventional Commits subject to `.keiro-dsl-sync-subject` (2026-08-01).


## Surprises & Discoveries

**The reserved-word list and the entire lexer are byte-identical across the range.** This is
the mechanical check that decides whether a sync needs highlighter work at all. Both the
`reservedWords` list and the block of `Parser.hs` between the `-- Lexer` banner and the next
banner hash the same at both ends of the range:

```text
$ for r in f769961 9ea8f85; do
    git -C /Users/shinzui/Keikaku/bokuno/keiro show $r:keiro-dsl/src/Keiro/Dsl/Parser.hs \
      | sed -n '/^reservedWords/,/^$/p' | md5
  done
f852b83874ce7c4d533712be63bbc21f
f852b83874ce7c4d533712be63bbc21f
```

**Not one keyword or operator spelling was added or removed.** Extracting every literal passed
to `keyword`, `symbol`, `chunk`, or `string` from both revisions and diffing the sets yields
only *relocations* — the same spellings appearing at new call sites:

```text
$ diff <(spellings f769961) <(spellings 9ea8f85)
0a1
> chunk "language"        # the new preamble lookahead
8d8
< keyword "Integer"       # now spelled via languageFeatureKeyword ... "Integer"
32a33
> keyword "cmd"           # the new version-1 rejection path
144a146
> keyword "reg"           # ditto
```

`Integer` is not gone: `pMappedTypeExpr` now reads
`TInteger <$ languageFeatureKeyword version IntegerScalarSyntax "Integer"`, which wraps the same
`keyword "Integer"` call in a version check. The spelling, and therefore the highlighting, is
identical.

**The spec's "parser trap" note about `language` is now false, and upstream proves it.** Before
this range, `selectSourceLanguage` walked every *significant line* (a line with its `#` comment
stripped and whitespace trimmed, kept only if something remained) and treated any line whose
first word was `language` as a preamble. A register declared on its own line as
`language Text = "en"` was therefore read as a misplaced preamble and rejected. That behavior is
written down in this repository in `spec/keiro-dsl-language-model.md` Section 4 and again in a
comment inside `corpus/language-preamble.keiro`.

The commit `54a5342` in this range deleted `significantLines`, `isLanguageLine`, and
`ensureBodyFeatures` outright and replaced the preamble scan with a real parser,
`pInitialLanguageClause`, which only fires on the file's *first* token and only when the word
`language` is not followed by an identifier character or by `-` plus an identifier character.
Upstream's own new test asserts the consequence directly — an `id` declaration *named* `language`
is now legal, and the misplaced-preamble diagnostic is reported at line 3, the line the real
preamble is on:

```haskell
sourceFailureAt MisplacedLanguagePreamble 3
  "context located\nid language prefix=lang\nlanguage keiro-dsl 1\n"
```

**A version-1 source may now use every successor spelling as an identifier.** The deleted
`ensureBodyFeatures` gate rejected a version-1 source that contained the word `using` anywhere,
the word `Integer` anywhere, or the substrings `implementation hole`, `reg.`, or `cmd.` anywhere
on a significant line — *including inside a string literal or inside a longer identifier*. The
range replaced it with per-production gates, so those spellings are now rejected only where they
actually mean the successor syntax. Upstream added two fixtures for exactly this,
`keiro-dsl/test/fixtures/language-identifier-v1.keiro` and `…-v2.keiro`, and asserts both parse,
validate, scaffold, and pass `keiro-dsl check`. The version-1 one has a register declared as
`language Text = "using Integer implementation hole reg. cmd."` and an enum named `Integer` —
a file that the previous parser rejected on three separate counts.

**The upstream gate is still real, only relocated.** Do not read this as "version 1 now accepts
version 2 syntax". Upstream's new test pins each gate to the line of its owning production:

```haskell
featureFailureAt 3 "…\ncontext feature-gates\nid AccountId prefix=acct using {"
featureFailureAt 3 "…\ncontext feature-gates\nmapped nominal AccountNumber : Text {}"
featureFailureAt 5 "…\n  regs\n    balance Integer = 0\n  states Open"
featureFailureAt 9 (aggregateWith "guard reg.balance == cmd.amount")
featureFailureAt 9 (aggregateWith "implementation hole")
```

None of this is a highlighter concern — Section 1 of the spec has said since it was written that
an editor must tokenize a file while its author is still fixing a diagnostic — but the spec
described the *mechanism* in enough detail that the description has to be corrected rather than
deleted.

**`enum Integer { … }` is the first corpus line where the two packages legitimately disagree,
and the spec already permitted it.** The new corpus file declares an enum whose name is also a
primitive type spelling. Shiki claims it with `#decl-with-name`, which is listed ahead of
`#types`, so `Integer` there is `entity.name.type.keiro` — the Declaration-site-type-name class.
Vim colours it `keiroType`, because Vim's equivalent rule has never fired for any introducer
(`syntax keyword` outranks the `\zs` match at the same column; recorded in
`docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`). Section 6 marks
the Declaration-site-type-name class an *optional* refinement and explicitly allows the packages
to differ there, so both are compliant and no rule was changed. The suites assert the class each
package actually produces, with a comment naming the other, so the divergence is visible rather
than accidental.


## Decision Log

- Decision: Change no rule in `packages/keiro-vim/syntax/keiro.vim` and no rule in
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`.
  Rationale: The mechanical checks recorded under Surprises & Discoveries show the token surface
  is unchanged — same 72 reserved words, byte-identical lexer, no added or removed spelling, no
  new operator. Section 6 of `spec/keiro-dsl-language-model.md` (the token-class taxonomy) gains
  no row and loses none. Editing a highlighter here would be change for its own sake.
  Date: 2026-08-01

- Decision: Do not treat this as a no-op `chore(sync)` either, even though the token surface is
  unchanged.
  Rationale: The five previous no-op syncs in this repository (git log `5637158`, `80b93fd`,
  `1833e51`, `a45a963`, `698d5b3`) each touched only `spec/.keiro-dsl-sync`, and that was right
  because those ranges were reformats, code generation, or semantics with no footprint in any
  artifact here. This range is different: it *deletes* three functions of `Parser.hs`
  (`significantLines`, `isLanguageLine`, `ensureBodyFeatures`) that `spec/keiro-dsl-language-model.md`
  names and describes as current behavior in four separate passages, and it changes a
  user-visible parsing outcome that a corpus file's comment asserts. Leaving a false statement
  about the source of truth inside the cross-package contract is a defect in the contract; this
  automation is the only process that keeps it accurate.
  Date: 2026-08-01

- Decision: Copy the version-1 upstream fixture into the corpus, not the version-2 one, and not
  both.
  Rationale: The two upstream fixtures differ only by the presence of a `language keiro-dsl 2`
  preamble line; their bodies are identical. The version-1 file is the sharper sample because it
  is the one that the *previous* parser rejected — it is a legal `.keiro` source with no preamble
  in which `using`, `Integer`, `implementation hole`, `reg.`, and `cmd.` all appear as ordinary
  data. The corpus already has two files carrying a `language keiro-dsl 2` preamble
  (`consumer-nominal-bindings.keiro` and, at version 1, `language-preamble.keiro`), so the
  version-2 twin would add a third preamble sample and nothing else.
  Date: 2026-08-01

- Decision: Correct, rather than delete, the in-file comment in `corpus/language-preamble.keiro`.
  Rationale: `corpus/README.md` calls the corpus files "read-only inputs" that the *packages*
  must not edit, and says a change to one is owned by the shared-language-model plan. This
  ExecPlan is performing that shared-language-model reconciliation, so the edit is in scope. The
  comment is load-bearing for two suite assertions (`# deciding which line is first` in both
  suites), so it is corrected in place with those anchor phrases left untouched rather than
  rewritten wholesale.
  Date: 2026-08-01

- Decision: Write a `docs(spec)` Conventional Commits subject rather than `feat(syntax)` or
  `chore(sync)`.
  Rationale: `feat(syntax)` would claim something is newly highlighted, and nothing is.
  `chore(sync): no lexical-surface change` is the subject this repository uses for a sync that
  edits nothing but the sync marker, and this one edits the spec, the corpus, and both suites.
  `docs(spec)` names the dominant change — restoring the contract's accuracy — while the subject
  body states plainly that the lexical surface did not change, so a later reader scanning
  `git log` is not misled into thinking a highlighter moved.
  Date: 2026-08-01


## Outcomes & Retrospective

Both suites pass. `packages/shiki-keiro` reports 68 pass / 0 fail across 341 expect() calls;
`packages/keiro-vim` reports 375 checks / 0 failures. Transcripts are in Validation and
Acceptance below. Neither highlighter grammar was edited, and every new assertion passed on its
first run — which is the result this plan predicted and wanted, since it means the packages were
already correct on a class of file that could not previously exist.

What was achieved: `spec/keiro-dsl-language-model.md` no longer describes three functions that
upstream deleted, and no longer tells a reader that `language Text = "en"` on its own line is
rejected — a claim that had been true when it was written and became false in this range. The
corpus gained `language-identifier-collisions.keiro`, a verbatim upstream fixture that is a legal
`.keiro` file only *because* of this range, and both suites now tokenize it and assert the five
colliding words still receive their documented classes.

What remains: nothing from this range. One pre-existing item is unchanged and deliberately so —
the Vim package's `keiroTypeName` rule for the optional Declaration-site-type-name refinement has
never fired (see `docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`),
and Section 6 marks that class optional, so Vim remains compliant.

Lesson learned: a sync whose `reservedWords` diff is empty is not automatically a no-op sync. The
spec warns about this in Section 3 in so many words — "A stable Section 3 therefore does not mean
a stable language: a sync that finds `reservedWords` unchanged must still read the rest of
`Parser.hs`." This range is the first one where the thing that changed was not a token at all but
the *accuracy of the spec's own account of the parser*. The checks worth keeping are the two
mechanical ones recorded under Surprises & Discoveries (hash the reserved-word list and the lexer
block; diff the set of keyword/symbol spellings), followed by a grep of the spec for the names of
any parser function the range deleted.


## Context and Orientation

**What this repository is.** `keiro-syntax` provides syntax highlighting for `.keiro` files, the
source format of a domain-specific language called keiro-dsl. It contains:

- `spec/keiro-dsl-language-model.md` — the single authoritative description of the language's
  *lexical surface*: which words are keywords, which tokens are types, and which class each token
  falls into. Section 6 of that file, the **token-class taxonomy**, is the cross-package contract.
  A "token class" here is a bucket like *Declaration introducer*, *Control / section keyword*,
  *Modifier*, *Language constant*, *Type*, *Number*, *String*, *Comment*, *Operator*; each package
  emits its own name for the same bucket (a TextMate scope for Shiki, a Vim highlight group for
  Vim).
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim implementation.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate/Shiki implementation.
- `corpus/` — a set of `.keiro` sample files both packages tokenize in their tests. Some are
  copied verbatim from upstream test fixtures; some are hand-written here. `corpus/README.md`
  records the provenance of every one.
- `packages/shiki-keiro/test/scopes.test.ts` and `packages/keiro-vim/test/highlight_spec.lua` —
  the two test suites. Both read word lists straight out of the spec's fenced blocks, so a word
  added to the spec without a matching highlighter rule fails the suites by name.
- `docs/plans/` — ExecPlans like this one, the durable record of *why* this repository changed.
  Plans 1 through 12 exist; this is plan 13.

**Where the language is defined.** The parser is a Haskell file using the `megaparsec` parser
library, at `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, in the
`keiro` repository (`mori://shinzui/keiro`; the artifact-level URI for a source file is not yet
defined, so the project URI plus the repository-relative path is used here). That file is the
source of truth. Section 3 of the spec is a verbatim copy of its `reservedWords` list.

**Terms used below, defined here.**

- *Lexical surface* — the set of facts a highlighter needs: which literal spellings are keywords,
  what a comment/string/number/identifier looks like, and what the operators are. A change to the
  parser that does not alter any of those is not a change to the lexical surface.
- *Preamble* — the optional first clause of a `.keiro` file naming the language contract it was
  written against, spelled `language keiro-dsl <positive-decimal>`, e.g. `language keiro-dsl 2`.
- *Language version / released contract* — keiro-dsl has a registry of released versions. Version
  1 is the original frozen grammar; version 2 added consumer-owned *nominal bindings* (the
  `mapped nominal …` declaration and the `using { … }` clause), the `Integer` type spelling, the
  typed scalar expression sublanguage reached through the `reg.` and `cmd.` roots, and the
  `implementation hole` transition clause.
- *Feature gate* — the parser's rule that version-2-only syntax is rejected in a version-1
  source, reported as a `LanguageFeatureRequiresVersion` diagnostic. Neither highlighter models
  gates: highlighting is purely lexical, and an editor must colour a file while its author is
  still fixing the diagnostic.
- *Significant line* — the old parser's unit of pre-grammar scanning: a source line with its `#`
  comment stripped and whitespace trimmed, kept only if anything remained. This concept no longer
  exists upstream, which is most of what this plan is about.

**What the upstream range did, in one paragraph.** The range is five commits, of which two touch
the parser. `54a5342` ("parse language gates from grammar context") deletes the raw-text
pre-scan — the functions `significantLines`, `isLanguageLine`, and `ensureBodyFeatures` — and
moves both the preamble scan and every feature gate into the grammar itself. It does this by
giving megaparsec a *custom error component*, a new `ContextualParseFailure` record carrying a
diagnostic code and a line number, so a production can fail with the exact source-language
diagnostic the pre-scan used to produce. The preamble is now recognised by a real parser,
`pInitialLanguageClause`, which runs only at the file's first token; the gates are now applied by
three small helpers — `requireLanguageFeatureAt`, `optionalLanguageFeature`, and
`languageFeatureKeyword` — at the productions that own each piece of syntax. A companion module,
`keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`, gains a `LanguageFeature` enumeration
(`NominalBindingSyntax`, `IntegerScalarSyntax`, `TypedAggregateExpressionSyntax`,
`ExplicitTransitionImplementationSyntax`) and a `languageSupportsFeature` predicate, so the
version threshold for each feature lives beside the version registry instead of as a list of
textual spellings inside the parser. `9ea8f85` ("preserve v1 arithmetic diagnostics") then adds
`pUnsupportedScalarTerm`, so a version-1 source writing `reg.` or `cmd.` still gets the version
diagnostic rather than falling through to the older, less specific arithmetic error. The other
three commits are documentation and generated-code tests.

**Why this leaves the highlighters alone.** Every one of those changes is about *when a parse
fails and what the message says*. None of them changes what a token looks like. The four
passages this plan corrects describe the deleted mechanism, and one of them draws a
user-visible conclusion from it that is no longer true.


## Plan of Work

The work is five milestones, in the order the repository's artifacts depend on one another: the
spec first (it is the contract), then the corpus, then the tests, then validation, then the sync
subject. No milestone edits a highlighter grammar, because none needs to.

### Milestone 1 — Correct the spec's parser-mechanics passages

At the end of this milestone `spec/keiro-dsl-language-model.md` names no function that upstream
deleted, and states no consequence that upstream's tests now contradict. Section 3's keyword list
still holds exactly 72 words and Section 6's taxonomy still holds exactly the rows it held
before; both suites assert those counts, so an accidental edit to either fails immediately.

Four passages need work. All four are *parenthetical parser notes* — the surrounding prose about
what a highlighter should do is already correct and stays.

The first is in Section 1, in the paragraph beginning "**The optional version preamble.**" It
currently says the parser "runs `selectSourceLanguage` over the raw text before any grammar is
chosen; `significantLines` strips each line's `#` comment and drops the lines that are then
empty." Replace that with an account of `pInitialLanguageClause`: the preamble is now recognised
by a parser that runs after leading whitespace and comments and looks only at the file's first
clause. Keep the surrounding sentence that a preamble may sit below a comment banner — that is
still true, because the space consumer `sc` skips comments before the clause parser is tried, and
`corpus/language-preamble.keiro` depends on it.

The second is in Section 1, in the paragraph about version 2 and nominal bindings, which
describes `ensureBodyFeatures` scanning "the raw significant lines for `mapped nominal …` or for
any line containing the word `using`". Replace with the per-production gate: `optionalLanguageFeature`
in `pIdDecl` and `pEnumDecl`, and the `nominal` branch of `pMappedTopItem`.

The third is the following Section 1 paragraph, which describes "that same scan — renamed
`requiresSuccessorSyntax`" firing on the word `Integer` and the substrings `implementation hole`,
`reg.`, and `cmd.`. Replace with the three helpers and note the user-visible relaxation: those
spellings are now rejected only where they mean the successor syntax, so a version-1 file may use
all of them as identifiers and as string content.

The fourth is in Section 4, in the subsection "### The language version preamble", under the bold
sentence "**A highlighter must not model the placement rule.**" That sentence and its conclusion
stay — they are the design decision, and it is still right. What must go is the trailing
parenthetical claiming `language` is legal as an identifier "only *mid-line*" and that a register
declared on its own line "does not [parse]". Replace it with the current rule and cite upstream's
test.

While in Section 4, also fix the sentence in the "#### Nominal bindings" subsection reading "its
`ensureBodyFeatures` gate rejects a version-1 source whose lines contain `using` *anywhere*, not
just at the start of a line as with `language`". Both halves of that comparison are now wrong.

### Milestone 2 — Correct the corpus comment that repeats the same claim

`corpus/language-preamble.keiro` carries a four-line comment inside its aggregate that repeats
the "parser asks whether a line's FIRST word is `language`" claim and concludes that a register
named `language` "would be read as a misplaced preamble and rejected". Rewrite those four lines
to state the current rule, keeping the concluding sentence — "A highlighter has no such rule: it
colours every `language` as a keyword" — which is the reason the comment is there.

Two anchor phrases in this file are read by the suites and must not change: the banner line
`# deciding which line is first` (Vim, and the longer form in Shiki) and `language keiro-dsl 1`.
Neither is in the block being rewritten.

### Milestone 3 — Add the upstream collision fixture to the corpus

Copy `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/language-identifier-v1.keiro`
verbatim to `corpus/language-identifier-collisions.keiro`, and add a provenance entry to
`corpus/README.md` in the "Copied later, as the parser's lexical surface grew" list, naming the
keiro-dsl commit and explaining what the file proves.

The file is worth having for a reason that is not "it has new tokens" — it has none. It is worth
having because it is the first corpus sample in which the five words that collide with successor
syntax appear as *data*: a context wire word `language-collisions`, an `id UsingId`, an
`enum Integer`, wire keys spelled `"implementation hole"` and `"cmd. using Integer implementation
hole"`, a register named `language` whose initial value is the string
`"using Integer implementation hole reg. cmd."`, and command fields named `using`, `implementation`,
`reg`, and `cmd`. Before this range no such file could be a valid `.keiro` source at all.

### Milestone 4 — Extend both suites to tokenize it

Add one block to each suite. The assertions are all of the form "this word still gets the class
Section 6 gives it, even here", plus two negative-shaped guards that matter:

- The bare words `reg` and `cmd` appear here as command field names with **no** following `.`, so
  both packages must leave them uncoloured. This is the same guard both suites already carry
  against `corpus/reservation.keiro`'s `prefix=cmd`, but in a new position — a field name inside
  a `command { … }` list — so it exercises the rule from a different direction. In Shiki, assert
  the collected scopes contain nothing from `KEYWORDISH_SCOPES`; in Vim, use `expect_no_group`.
- The string literal `"using Integer implementation hole reg. cmd."` must be one String from end
  to end, with none of the words inside it stealing a class. Assert the whole literal.

### Milestone 5 — Run both suites and record the transcripts

Run each suite from the repository root and paste the tail of each into Validation and
Acceptance. Then write the Conventional Commits subject line to `.keiro-dsl-sync-subject` at the
repository root.


## Concrete Steps

All commands are run from the repository root, `/Users/shinzui/Keikaku/bokuno/keiro-syntax`,
unless a different directory is shown.

Re-derive the two mechanical checks that decide whether a highlighter needs work. First, that the
reserved-word list and the lexer are unchanged:

```bash
for r in f7699611d34a735a6f54c48ffc9c5f0bfe97265d 9ea8f8541da57c26d7317d120457240d7a634225; do
  git -C /Users/shinzui/Keikaku/bokuno/keiro show "$r:keiro-dsl/src/Keiro/Dsl/Parser.hs" \
    | sed -n '/^reservedWords/,/^$/p' | md5
done
```

Expect the same hash twice. Second, that no keyword or operator spelling was added or removed:

```bash
for r in f7699611d34a735a6f54c48ffc9c5f0bfe97265d 9ea8f8541da57c26d7317d120457240d7a634225; do
  git -C /Users/shinzui/Keikaku/bokuno/keiro show "$r:keiro-dsl/src/Keiro/Dsl/Parser.hs" \
    | grep -oE '(keyword|symbol|chunk|string) "[^"]*"' | sort -u > "/tmp/lits-$r.txt"
done
diff /tmp/lits-f7699611d34a735a6f54c48ffc9c5f0bfe97265d.txt \
     /tmp/lits-9ea8f8541da57c26d7317d120457240d7a634225.txt
```

Expect only the four relocations quoted under Surprises & Discoveries.

Copy the upstream fixture into the corpus (Milestone 3):

```bash
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/language-identifier-v1.keiro \
   corpus/language-identifier-collisions.keiro
```

Run the Shiki suite (Milestone 5):

```bash
cd packages/shiki-keiro && bun install && bun test
```

Run the Vim suite:

```bash
./packages/keiro-vim/test/run.sh
```

Write the sync subject. It is a single line; the parenthetical carries the two facts a later
reader of `git log` needs — that nothing about the lexical surface moved, and what did:

```text
docs(spec): reconcile the language-gating notes with keiro-dsl 9ea8f85 (no lexical-surface
change: all 72 reserved words and the whole lexer are byte-identical and no keyword or operator
spelling was added or removed, but the raw-text pre-scan moved into the grammar, so
ensureBodyFeatures/significantLines/isLanguageLine are gone and keyword-spelled identifiers such
as a register named language now parse; spec and corpus notes corrected, upstream collision
fixture added, both suites extended)
```

Do **not** run `git add`, `git commit`, or `git push`, and do not write to `spec/.keiro-dsl-sync`.
The calling automation re-runs both suites itself and owns the commit; this plan leaves its work
in the tree.


## Validation and Acceptance

The acceptance condition is that both suites pass with the new corpus file loaded and the new
assertions in place, and that the three counts the suites read out of the spec are unchanged: 72
reserved words in Section 3, and 100 bare plus 32 dashed contextual keywords in Section 4. Those
counts are the guard that the spec edits touched only prose. If a spec edit accidentally
disturbed a fenced word list, the suites fail with a message naming the count.

Shiki, run on 2026-08-01. Six tests are new in this range; the counts rose from 62 pass /
300 expect() calls to the following:

```text
$ cd packages/shiki-keiro && bun install && bun test
bun install v1.3.13 (bf2e2cec)
Checked 94 installs across 144 packages (no changes) [93.00ms]
bun test v1.3.13 (bf2e2cec)

 68 pass
 0 fail
 341 expect() calls
Ran 68 tests across 1 file. [1244.00ms]
```

Vim, run on 2026-08-01. The check count rose from 351 to 375; the lines below are the block
this range added, extracted from the full transcript:

```text
$ ./packages/keiro-vim/test/run.sh
ok   "# `using Integer implementation hole" -> keiroComment
ok   "language" -> keiroKeyword (all 8 characters)
ok   "language" -> keiroKeyword (all 8 characters)
ok   "using" -> keiroStatement (all 5 characters)
ok   "implementation" -> keiroStatement (all 14 characters)
ok   "Integer" -> keiroType (all 7 characters)
ok   "\"Integer\"" -> keiroString (all 9 characters)
ok   "\"implementation hole\"" -> keiroString (all 21 characters)
ok   "\"using Integer implementation hole reg. cmd.\"" -> keiroString (all 45 characters)
ok   "reg             as" at offset 0 -> (no group)
ok   "cmd             as" at offset 0 -> (no group)
ok   "reg:Text" at offset 0 -> (no group)
ok   "cmd:Text" at offset 0 -> (no group)
ok   "mapped structural record" -> keiroKeyword
ok   "aggregate LanguageAggregate" -> keiroKeyword
ok   "regs" -> keiroStatement
ok   "states Open" -> keiroStatement
ok   "emit LanguageObserved" -> keiroKeyword
ok   "goto Open" -> keiroStatement
ok   "-->" -> keiroOperator

375 checks, 0 failures
```

Beyond the suites, the change is observable by eye. Open the new corpus file in Neovim with the
plugin on the runtime path and confirm that `language` in `context language-collisions` and in the
register line `language Text = "…"` both render as a keyword, that the long string on that
register line is one uniform String, and that `reg` and `cmd` in the `command Implementation { … }`
field list are plain text:

```bash
nvim --cmd 'set runtimepath^=packages/keiro-vim' corpus/language-identifier-collisions.keiro
```

The negative checks are the interesting half. A rule that coloured `reg` or `cmd` unconditionally
would light up two field names here and, more importantly, would recolour the wire word `cmd` in
the five corpus files that declare `id CommandId prefix=cmd`. A rule that let a bare keyword leak
into a string would break the register initializer. Both suites fail loudly on either.


## Idempotence and Recovery

Every step is safely repeatable. The spec and corpus edits are ordinary text edits; re-running
them is a no-op once applied, and `git diff` shows exactly what changed. The `cp` in Milestone 3
overwrites the corpus file with the identical upstream bytes, so running it twice is harmless —
but note that it copies from the `keiro` working tree, so if that tree has moved past
`9ea8f8541da57c26d7317d120457240d7a634225` the file may differ. To pin it, use
`git -C /Users/shinzui/Keikaku/bokuno/keiro show 9ea8f854:keiro-dsl/test/fixtures/language-identifier-v1.keiro`
instead.

Both test commands are read-only with one exception: `bun install` writes
`packages/shiki-keiro/node_modules` and may update a lockfile. If the suite is already installed,
`bun test` alone is sufficient.

To abandon the work entirely, `git checkout -- spec corpus packages docs` and delete
`.keiro-dsl-sync-subject` and this plan file. Nothing here migrates data or touches anything
outside this repository; the `keiro` repository is only ever read.


## Interfaces and Dependencies

This plan adds no dependency. The two suites use what they already used: Bun's built-in test
runner with the `shiki` package for the TextMate side, and headless Neovim driving
`vim.fn.synID` for the Vim side.

The upstream identifiers this plan's prose must name correctly, all in
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` at
`9ea8f8541da57c26d7317d120457240d7a634225` unless noted:

```haskell
-- new: the custom megaparsec error component carrying a diagnostic and its line
data ContextualParseFailure = ContextualParseFailure
  { contextualFailureCode :: !SourceLanguageErrorCode
  , contextualFailureLine :: !Int
  }
type P = Parsec ContextualParseFailure Text

-- new: recognises the preamble at the file's first token, and nowhere else
pInitialLanguageClause :: P (Maybe InitialLanguageClause)

-- new: the three per-production feature gates
requireLanguageFeatureAt  :: LanguageVersion -> LanguageFeature -> Loc -> P ()
optionalLanguageFeature   :: LanguageVersion -> LanguageFeature -> Text -> P a -> P (Maybe a)
languageFeatureKeyword    :: LanguageVersion -> LanguageFeature -> Text -> P ()

-- new (9ea8f85): keeps the version diagnostic ahead of the older arithmetic error
pUnsupportedScalarTerm :: LanguageVersion -> P Expr

-- deleted in this range — the spec must stop naming these
-- significantLines   :: Text -> [SignificantLine]
-- isLanguageLine     :: SignificantLine -> Bool
-- ensureBodyFeatures :: FilePath -> SourceLanguage -> Text -> Either ParseFailure ()
```

And in `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`:

```haskell
data LanguageFeature
  = NominalBindingSyntax
  | IntegerScalarSyntax
  | TypedAggregateExpressionSyntax
  | ExplicitTransitionImplementationSyntax

languageFeatureMinimumVersion :: LanguageFeature -> LanguageVersion  -- all four: version2
languageSupportsFeature       :: LanguageVersion -> LanguageFeature -> Bool
```

Within this repository, the artifacts this plan touches and the order they depend on one another:
`spec/keiro-dsl-language-model.md` is read at test time by both
`packages/shiki-keiro/test/scopes.test.ts` (function `wordBlocksFromSpec`) and
`packages/keiro-vim/test/highlight_spec.lua` (function `word_blocks_from_spec`), so a spec edit
that disturbs a fenced word list fails both suites. `corpus/*.keiro` files are read by both
suites by path. Neither package reads the other's files.
