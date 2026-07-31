---
id: 12
slug: highlight-the-typed-scalar-expression-language-implementation-hole-integer-reg-cmd-roots-and-arithmetic
title: "Highlight the typed scalar expression language: implementation hole, Integer, reg/cmd roots, and arithmetic"
kind: exec-plan
created_at: 2026-07-31T20:07:51Z
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Highlight the typed scalar expression language: implementation hole, Integer, reg/cmd roots, and arithmetic

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository ships two syntax highlighters for **keiro-dsl**, a small domain-specific
language for describing event-sourced workflows whose source files end in `.keiro`. One is a
Vim/Neovim syntax file (`packages/keiro-vim/`), the other a TextMate grammar consumed by the
Shiki JavaScript highlighter (`packages/shiki-keiro/`). Both must agree, token for token, with
the language's parser, which lives in a *different* repository at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`.

The keiro-dsl commit range
`fcd67482d33712b1a07675039049eb00322583bb..8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9` —
whose range-ending (triggering) commit is
**`8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9`, `feat(dsl): add typed scalar expression
language`** — replaces the language's guard-and-write expression grammar. Before it, the body
of an aggregate transition could only compare or copy whole values, and every arithmetic
character was a hand-written parse error. After it, a source that declares
`language keiro-dsl 2` gets a real scalar expression sublanguage: register and command-field
values reached through the roots `reg.` and `cmd.`, arithmetic with `+`, `-`, and `*`, quoted
and numeric and enum and id literals as operands, a new `Integer` type spelling for exact
arbitrary-precision arithmetic, and a way for a transition to hand its whole behavior to
consumer-written Haskell with a one-line `implementation hole` clause:

```text
  Open -- Adjust -->
    guard cmd.balance + reg.balance >= -100
      && reg.reserved + cmd.requested <= reg.capacity
    write balance := reg.balance + cmd.balance * 2
    emit Adjusted
    goto Closed
```

Today both highlighters render most of that line-for-line as **plain grey text**: `Integer`,
`implementation`, `reg`, `cmd`, and the `*` operator all carry no highlight group at all, so
the most-written part of a version-2 aggregate — its transition bodies — reads as an
uncoloured blob dropped into an otherwise coloured file. After this plan `Integer` is coloured
as a primitive type like `Int` and `Natural`; `implementation` is coloured as a clause keyword
like `guard` and `write`; `reg` and `cmd` are coloured wherever they head a dotted path, like
`input.` and `timer.` already are; and `*` joins `+` as an operator.

You can see the gap and then the fix with your own eyes. From the repository root, before the
change:

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/aggregate-scalar-expressions.keiro' \
  -c 'call search("Integer")' \
  -c 'echo synIDattr(synID(line("."), col("."), 1), "name")' \
  -c 'call search("reg\\.")' \
  -c 'echo synIDattr(synID(line("."), col("."), 1), "name")' \
  -c 'quitall!'
```

Before the change this prints two **empty lines** (no highlight group at either the `I` of
`Integer` or the `r` of `reg`). After the change it prints `keiroType` and then
`keiroStatement`. The equivalent tour of the new corpus samples, interactively:

```bash
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/aggregate-scalar-expressions.keiro
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
      surface: the `implementation hole` transition clause, the `Integer` type spelling, the
      `reg.`/`cmd.` expression roots, and the arithmetic operators `+`, `-`, `*` (2026-07-31).
- [x] Confirm mechanically that `reservedWords` is byte-identical across the range — 72 words
      before and after, so Section 3 of the spec needs no edit (2026-07-31).
- [x] Establish which parts of the new expression grammar need **no** new rule: quoted string
      operands, integral literals, `true`/`false`, the `Type.Constructor` enum literal, and the
      `Type("…")` id literal are all already covered by existing String, Number, constant, and
      identifier handling (2026-07-31).
- [x] Establish which new words must **not** be highlighted: the collection vocabulary `keys`,
      `values`, `any`, `all`, and `in`/`not in`, which the parser matches only in order to
      reject with `CollectionExpressionUnsupported` (2026-07-31).
- [x] Measure both highlighters against the new surface *before* editing anything: `Integer`,
      `implementation`, `reg`, `cmd`, and `*` are entirely uncoloured in both; `hole` is
      already a Language constant in both (2026-07-31).
- [x] Capture the green baseline of both suites (51 pass / 249 expect() calls; 324 checks, 0
      failures) (2026-07-31).
- [x] Milestone 1 — reconcile `spec/keiro-dsl-language-model.md` (Sections 1, 2, 4, 5, 6)
      (2026-07-31).
- [x] Milestone 2 — add `corpus/aggregate-scalar-expressions.keiro` (verbatim from upstream)
      and `corpus/transition-implementation-hole.keiro` (hand-written), and register both in
      `corpus/README.md` (2026-07-31).
- [x] Milestone 3 — teach `packages/keiro-vim/syntax/keiro.vim` the four new spellings
      (2026-07-31).
- [x] Milestone 4 — teach `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` the same four
      (2026-07-31).
- [x] Milestone 5 — extend both suites, including the raised Section 4 bare-word count
      (2026-07-31).
- [x] Milestone 6 — run both suites green: `bun test` 62 pass / 0 fail / 299 expect() calls,
      `run.sh` 355 checks / 0 failures (2026-07-31).
- [x] Acceptance A, C, D, E, and F — including all ten failing-direction reversals, whose
      output is recorded under Validation and Acceptance. The first attempt at E restored a
      file with `git checkout` and lost Milestone 4's edits; they were re-applied and the
      checks redone with a `/tmp` copy as the restore point (2026-07-31).
- [x] Milestone 7 — write `.keiro-dsl-sync-subject` (2026-07-31).


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **`reservedWords` did not move, for the fourth sync running.** Both ends of the range hold
  the identical 72 words:

  ```bash
  cd /Users/shinzui/Keikaku/bokuno/keiro
  diff <(git show fcd67482d33712b1a07675039049eb00322583bb:keiro-dsl/src/Keiro/Dsl/Parser.hs \
          | sed -n '/^reservedWords/,/^    ]/p') \
       <(git show 8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9:keiro-dsl/src/Keiro/Dsl/Parser.hs \
          | sed -n '/^reservedWords/,/^    ]/p') && echo IDENTICAL
  ```

  ```text
  IDENTICAL
  ```

  This is the strongest example yet of the warning Section 3 of the spec already carries — "**A
  stable Section 3 therefore does not mean a stable language:** a sync that finds
  `reservedWords` unchanged must still read the rest of `Parser.hs`." This range rewrites the
  entire expression sublanguage, adds a transition clause, a type spelling, two path roots and
  three arithmetic operators, and reserves not one of them.

- **`hole` was already a Language constant in both packages, and it now has a second parser
  site.** The word entered both grammars long before this range (it is the `derive "…" hole`
  marker in a contract's emitter, `Parser.hs` `pDerive`, and the `resolve … hole` router
  source). This range gives it a second home as the second word of `implementation hole`.
  Measured before any edit, on the literal line `    implementation hole`:

  ```text
  "    implementation "=(none)  "hole"=constant.language.keiro
  ```

  So exactly one of the clause's two words was missing. That is why this range costs one word,
  not two, in the constant/control lists.

- **`cmd` is already in use in the corpus as an ordinary wire word, which is what forces the
  follow-character guard on the new roots.** Five corpus files — copied verbatim from upstream
  fixtures — contain `id CommandId prefix=cmd`:

  ```bash
  grep -rn 'prefix=cmd' corpus/
  ```

  ```text
  corpus/reservation.keiro:5:id  CommandId              prefix=cmd
  corpus/reservation-retiring.keiro:5:id  CommandId              prefix=cmd
  corpus/reservation-guard-tightened-twin.keiro:5:id  CommandId              prefix=cmd
  corpus/reservation-deprecated-replay-only.keiro:5:id  CommandId              prefix=cmd
  corpus/hospital-surge.keiro:4:id  CommandId   prefix=cmd
  ```

  An unconditional `cmd` keyword would recolour every one of those id prefixes, which are
  user-chosen wire words and have been uncoloured since the corpus was created. The follow-`.`
  guard described in the Decision Log avoids that, and it is also closer to what the parser
  does: `pScalarPath` only treats these two words specially when they are the **first segment
  of a dotted path** (`("reg", name : path) -> EPath loc RegisterRoot …`).

- **Vim splits `>=`, `<=`, and `!=` into a coloured first character and an uncoloured `=`, and
  leaves a bare `=` and `;` uncoloured entirely. This predates the range and is left alone.**
  Reading `synID` at every character of `guard cmd.balance + reg.balance >= -100`:

  ```text
  >=Operator  ==.
  ```

  The cause is the same Vim tie-break `docs/plans/9-…` documented for numbers: at equal start
  columns the item defined **last** wins, and `syntax match keiroOperator /[<>@!+]/` is defined
  after `/[=!<>]=/`, so the single-character rule claims the `>` and the scan resumes past it
  at the `=`, which no Vim rule matches. The Shiki grammar has no such problem (its operator
  alternation lists `>=` before the single-character class, and its class includes `=` and
  `;`). Every operator rule in `keiro.vim` links to the same `keiroOperator` group, so the
  defect is invisible for `-->` (which tokenizes as `--` plus `>`, both coloured) and visible
  only where the trailing character has no rule of its own — that is, `=`. Fixing it means
  re-ordering the whole operator block shortest-first and adding `=`, `;`, `:`, `.`, and `,`
  to Vim, which would restyle every existing `.keiro` file (`prefix=rsv`, `kind=ctorName`,
  every field's `:`) and is a change to Section 5 compliance in its own right. It is recorded
  here for a future plan and deliberately not attempted by this one, which only adds `*` to the
  existing single-character class where it behaves exactly like `+`.

- **The collection vocabulary in this range exists only to be rejected.** `Parser.hs` gained
  `collectionTermUnsupported` and `collectionOperatorUnsupported`, which match `[`, `{`,
  `keys`, `values`, `any`, `all`, `in`, and `not in` and then immediately fail:

  ```haskell
  collectionExpressionMessage :: String
  collectionExpressionMessage = "CollectionExpressionUnsupported: collection expressions are reserved for plan 166"
  ```

  Upstream's own fixture `aggregate-collection-expressions-v2-rejects.keiro` exists to assert
  that `guard any([cmd.active])` does not parse. No source containing these words is a valid
  `.keiro` file, so none of them is added to Section 4. (`in` is a different matter: it has
  been a curated contextual keyword since plan 4 for the process-node `in`/`out` clauses, and
  stays exactly as it is.)

- **The `implementation hole` clause and a `guard` clause can appear in the same transition and
  still parse.** Upstream's own test asserts the pair produces a *semantic* diagnostic,
  `AggregateTransitionOwnershipConflict`, from a source that parsed cleanly
  (`keiro-dsl/test/Main.hs`, "enforces exclusive Hole ownership and preserves its canonical
  spelling"). This is the now-familiar pattern: a highlighter must colour text the semantic
  pass will later reject, exactly as
  `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`
  settled for `Optional` in an aggregate register.

- **`git checkout` is not an undo during a sync run, and it fails silently.** While running the
  failing-direction checks of acceptance E, the temporary reversal of a grammar edit was undone
  with `git checkout -- packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. A sync run commits
  nothing — the calling automation owns the commit — so that command restored the file to its
  state *before the plan began*, discarding all four of Milestone 4's edits at once. The failure
  was invisible in the transcript: the suite had already run and printed `61 pass / 1 fail`, and
  the next check reported only `!! ANCHOR NOT FOUND`, which reads like a bad `sed` pattern
  rather than a lost file. `git status --short` is what exposed it — the grammar file had
  vanished from the modified list. The checks were redone with a `/tmp` copy as the restore
  point, which is the form recorded in acceptance E.

- **The version gate grew four new triggers, and one of them is a bare type name.**
  `ensureBodyFeatures` — the pre-grammar scan that rejects version-2 syntax in a version-1
  source — was renamed from `requiresNominalSyntax` to `requiresSuccessorSyntax` and now fires
  on `Integer` appearing as a word anywhere on a significant line, on the substring
  `implementation hole`, and on the substrings `reg.` and `cmd.`:

  ```haskell
  requiresSuccessorSyntax line =
      case wordsFound of
          "mapped" : "nominal" : _ -> True
          _ ->
              "using" `elem` wordsFound
                  || "Integer" `elem` wordsFound
                  || "implementation hole" `T.isInfixOf` content
                  || "reg." `T.isInfixOf` content
                  || "cmd." `T.isInfixOf` content
  ```

  Neither package models any of it, for the reason Section 1 of the spec gives: highlighting is
  purely lexical, and an editor must tokenize a file while its author is fixing the version
  line. It is worth recording because it means a *version-1* file that merely mentions
  `Integer` is now a parse failure while still being a perfectly ordinary thing to highlight.


## Decision Log

Record every decision made while working on the plan.

- Decision: Treat this range as a real lexical-surface change requiring spec, grammar, corpus,
  and test work, rather than closing it with a `chore(sync)` "no lexical change" subject.
  Rationale: the range adds four spellings that appear in the most-written part of the language
  and that both packages demonstrably render as plain text today — the type name `Integer`, the
  clause word `implementation`, the two path roots `reg` and `cmd`, and the operator `*` (see
  the measurement in Surprises & Discoveries).
  Date: 2026-07-31

- Decision: Classify `implementation` as a **Control / section keyword**
  (`keyword.control.keiro` / `keiroStatement`), and leave `hole` where it already is, as a
  **Language constant**.
  Rationale: `implementation` introduces a clause of a transition, which is precisely what
  `guard`, `write`, `emit`, and `goto` do, and all four are control keywords. The second word
  names the thing the clause selects — a typed hole the consumer fills — which is what `HOLE`
  and the existing `hole` already mean in this language, and both packages have coloured `hole`
  as a constant since plan 4. Reclassifying `hole` to match `implementation` would change how
  the two *older* parser sites (`derive "…" hole` and `resolve … hole`) render, for no gain.
  The clause therefore reads as a keyword followed by a constant, like `write x := HOLE`.
  Date: 2026-07-31

- Decision: Classify `Integer` as a **Primitive type** (`support.type.keiro` / `keiroType`) and
  match it unconditionally, everywhere.
  Rationale: it is the eleventh spelling of `pMappedTypeExpr`, added in the same `choice` as
  `Text`, `Int`, `Bool`, and `Natural`, and — because keiro-dsl commit `da09736` made that same
  grammar the type slot of an aggregate register and of an aggregate command/event field — it
  appears in the two most-written slots in the language. Section 6's Primitive-type row already
  says these spellings are matched unconditionally and warns against scoping them to a `mapped`
  block.
  Date: 2026-07-31

- Decision: Classify `reg` and `cmd` as **Control / section keywords**, but match them **only
  when the very next character is a `.`**.
  Rationale: the two words read like the dotted-path roots `input.`, `timer.`, and `source.`,
  which have been unconditional control keywords since plan 4, so the class is settled. The
  follow-character condition is what is new, and it has two independent justifications. First,
  `cmd` is already a user-chosen wire word in five corpus files (`id CommandId prefix=cmd`), so
  an unconditional rule would recolour existing text — the one outcome plan 9 warned about when
  it refused to claim a bare `-`. Second, the parser itself gives these words meaning only in
  that position: `pScalarPath` reads an identifier and its dotted tail and *then* checks
  whether the head was `reg` or `cmd`. A condition on the following character is the same
  device both packages already use for the `-\@!` guards on `on`, `binding`, `dedupe`, `shape`,
  and `dispatch`; it is not the kind of look-behind that Section 6 marks "optional", so these
  rules are mandatory like every other keyword rule.
  Date: 2026-07-31

- Decision: List `reg` and `cmd` in Section 4 as prose inside the new scalar-expression
  subsection rather than adding them to Section 4's bare-word grid.
  Rationale: both test suites read that grid and probe every word in it in a **one-word
  document**, where `reg` and `cmd` are correctly *not* keywords because no `.` follows. Adding
  them to the grid would assert the opposite of the behaviour this plan wants. The grid gains
  only `implementation`, taking it from 99 words to 100; the dashed grid stays at 32. The two
  roots get their own hand-named assertions in both suites instead.
  Date: 2026-07-31

- Decision: Add `*` to the operator rules of both packages, and continue **not** to claim a
  bare `-`.
  Rationale: `*` is a new operator in Section 5 and collides with nothing — no keyword, wire
  word, or comment marker contains it. A bare `-` is a different matter: Section 2 of the spec
  already records why neither package claims it (Section 5 lists `-->`, `--`, and `->`, and a
  bare `-` rule would put a colour on the first character of every transition arrow), and there
  is now a third reason — every wire word may contain dashes (`hospital-capacity`,
  `partial-divert`), so a bare `-` rule would colour a character inside dozens of existing
  identifiers. The consequence is that subtraction's `-` renders as uncoloured punctuation,
  exactly as the sign of a negative register initializer already does. That is stated in the
  spec rather than left for a reader to discover.
  Date: 2026-07-31

- Decision: Add no rule for the two new literal *shapes* — the qualified enum literal
  `TicketStatus.Open` and the id literal `TicketId("tkt_01h4…")`.
  Rationale: both are built entirely out of tokens the packages already handle. The enum
  literal is an identifier, a `.`, and an identifier — indistinguishable, lexically, from the
  dotted references `input.hospitalId` and `timer.id` that the language has always had. The id
  literal is an identifier, parentheses, and a quoted string; parentheses are uncoloured
  punctuation (Section 4 already says so for `Optional(Text)`) and the string is already a
  String. Adding a rule to colour a capitalised identifier before a `.` would also colour the
  module prefixes in `module Acme.Services`, which are deliberately plain today.
  Date: 2026-07-31

- Decision: Add two corpus files — one copied verbatim from upstream, one hand-written — rather
  than re-copying the updated `nominal-scalars.keiro` over
  `corpus/consumer-nominal-bindings.keiro`.
  Rationale: upstream's `aggregate-scalar-expressions-v2.keiro` covers `Integer`, both roots,
  all three arithmetic operators, and quoted/integral/boolean operands in one file, so it is
  copied verbatim. It does *not* contain `implementation hole`; the only upstream fixture that
  does is `nominal-scalars.keiro`, which this range edited by **replacing** its guard and its
  seven `write` clauses with the one-line clause. Re-copying it over the existing corpus file
  would delete the only `guard`, `write`, and `:=` tokens in that file, which six assertions
  across the two suites already read. The corpus README pins each copied file to the commit it
  was copied at, so leaving it at `fcd6748` is exactly what that record means. The second file
  is therefore hand-written, in the same spirit as `corpus/aggregate-scalar-types.keiro` and
  `corpus/language-preamble.keiro`.
  Date: 2026-07-31

- Decision: Do not add `keys`, `values`, `any`, `all`, or a `not in` spelling to Section 4.
  Rationale: the parser matches them only to produce the `CollectionExpressionUnsupported`
  failure quoted in Surprises & Discoveries. No file containing them parses, so they are not
  part of the language's surface yet. When a later keiro-dsl release makes them real, the sync
  for that range adds them.
  Date: 2026-07-31

- Decision: Record, but do not fix, the pre-existing Vim operator defects (`>=`, `<=`, `!=`
  split; bare `=` and `;` uncoloured).
  Rationale: they predate this range by eight plans, are caused by the ordering of rules this
  range does not otherwise touch, and fixing them means adding `=`, `;`, `:`, `.`, and `,` to
  the Vim grammar and re-ordering its operator block — a change that restyles every existing
  `.keiro` file and belongs in a plan whose acceptance can be about that. The evidence is in
  Surprises & Discoveries so the next contributor starts from a measurement rather than a
  suspicion.
  Date: 2026-07-31


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

The range reconciled cleanly. Final state:

- `spec/keiro-dsl-language-model.md` — Section 1's preamble paragraph now names the four new
  triggers of the version gate; Section 2's number bullet records that the expression operand
  slot is the third home of a signed integer literal; Section 4's bare grid gains
  `implementation` (99 → 100 words) and the section gains a new subsection, "The scalar
  expression sublanguage", covering `implementation hole`, the `reg.`/`cmd.` roots, arithmetic,
  the literal shapes, and the deliberately-unhighlighted collection vocabulary; Section 4's
  mapped-type subsection now says the type slot accepts **eleven** spellings, with `Integer`
  named; Section 5 gains `*`; Section 6's Control row names `implementation` and the two roots,
  its Primitive-type row gains `Integer`, and its Language-constant row records that `hole` now
  has a third parser site. Section 3 is untouched — still the same verbatim 72 words.
- `packages/keiro-vim/syntax/keiro.vim` — `Integer` joins the primitive-type keyword list,
  `implementation` joins the control keyword list, a new `syntax match` claims `reg` and `cmd`
  before a `.`, and `*` joins the single-character operator class.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — `Integer` joins `#types`,
  `implementation` joins `#control-keywords`, a new `#scalar-roots` rule claims `reg` and `cmd`
  before a `.`, and `*` joins the `#operators` character class.
- `corpus/aggregate-scalar-expressions.keiro` — new, copied verbatim from upstream's
  `aggregate-scalar-expressions-v2.keiro`.
- `corpus/transition-implementation-hole.keiro` — new, hand-written, covering the
  `implementation hole` clause and the two literal shapes no upstream fixture uses.
- Both suites — a block of scalar-expression assertions each, and the Section 4 bare count
  raised from 99 to 100. The dashed count stays 32 and the reserved count stays 72. The Vim
  suite also gained one new helper, `expect_no_group`, for the one assertion neither existing
  helper could express: that a token stays plain.

Suites at completion: `bun test` 62 pass / 0 fail / 299 expect() calls (from 51 / 249);
`run.sh` 355 checks, 0 failures (from 324). All eight grammar edits were verified in the
failing direction as well (acceptance check E), each one individually, plus both packages'
`prefix=cmd` regression guard.

Three lessons are worth carrying forward. The first is that **a keyword's class is decided by
the role it plays, but its *rule* is decided by the text already in the corpus**: `reg` and
`cmd` are control keywords like `input` and `timer`, yet they could not be written as
unconditional rules like those, because one of them was already spelled as a wire word in five
files. Checking the corpus for a collision before writing a rule took one `grep` and saved a
silent recolouring of four verbatim upstream samples. The second is that the *shape* of an
expression grammar can grow enormously — this range adds a 564-line `Expression.hs`, a type
resolver, arithmetic, and a literal algebra — while its *lexical* footprint stays at four
spellings, because the operands are built out of identifiers, strings, and numbers the language
already had. A sync's cost tracks new spellings, not new grammar. The third is operational and
was learned the hard way during acceptance check E: **never use `git checkout -- <path>` to undo
a temporary edit during a sync run.** A sync commits nothing until the calling automation does,
so every edit in the tree is uncommitted, and `git checkout` reverts the file to the state
*before* the plan started rather than to the state before the temporary edit. Doing it to
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` silently threw away all four of Milestone
4's edits mid-check; the suite then reported "62 pass" because the restore happened after the
run. Copy the file to `/tmp` first and copy it back — which is what the check now does.


## Context and Orientation

A reader who has never seen this repository needs the following.

**What keiro-dsl is.** A domain-specific language for describing event-sourced workflows in the
keiro framework. A `.keiro` file declares things like aggregates, processes, routers,
contracts, and read models. You do not need to understand event sourcing to work on this plan —
everything here is about how the *text* looks.

**What an aggregate transition is.** The one construct this range changes. Inside an
`aggregate` block, a line of the form `State -- Command -->` opens a transition, and the
indented clauses beneath it say what happens: `guard <expression>` is a precondition, `write
<register> := <expression>` updates a stored value, `emit <Event>` records an event, and `goto
<State>` moves the machine. The expressions in the `guard` and `write` clauses are what this
range rewrites.

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
- `corpus/*.keiro` — the shared sample files both suites tokenize. `corpus/README.md` records,
  per file, whether it was copied verbatim from upstream (and at which keiro-dsl commit) or
  hand-written here, and why.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` —
  headless Neovim assertions.
- `packages/shiki-keiro/test/scopes.test.ts`, run by `bun test` — Shiki assertions.

**The upstream source of truth.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, a Haskell file using
the `megaparsec` parser-combinator library. Read it directly; do not infer the language from
the highlighters.

**What a `sync-keiro-dsl` run is.** When keiro-dsl changes, an automation opens this repository
with a commit range and asks for the four artifacts above to be brought back into agreement,
with an ExecPlan as the durable record. Plans 4 through 11 in `docs/plans/` are the previous
runs. This is run 12, for the range
`fcd67482d33712b1a07675039049eb00322583bb..8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9`.

**Terms this plan uses.**

- A **register** is a named value an aggregate stores between commands, declared in its `regs`
  block: `balance Integer = 0`. The word `reg` in an expression reaches one.
- A **command field** is a named value carried by the command currently being handled, declared
  in `command Adjust { balance:Integer }`. The word `cmd` in an expression reaches one.
- A **typed hole** is a function signature keiro-dsl generates for the consumer to implement in
  Haskell, leaving the body blank. Before this range an aggregate had one hole for its whole
  transducer; after it, a single transition can be given its own with `implementation hole`.
- **Version 2** is the second released language contract. A `.keiro` file opts into it with the
  preamble line `language keiro-dsl 2`, and the whole scalar expression sublanguage described
  here is legal only under it. A highlighter models none of that — see the version-gate note in
  Surprises & Discoveries.

### The parser change, in full

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  fcd67482d33712b1a07675039049eb00322583bb..8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

Five commits sit in the range. Three (`8186cab`, `824d683`, `7897f19`) touch upstream planning
documents, a scaffold-compatibility fix, and a changelog; `39a993a` generates nominal consumer
bindings, which is Haskell code generation and not surface syntax. `8b0f55b`, `feat(dsl): add
typed scalar expression language`, is the one that matters.

Four things in it touch the lexical surface, and several deliberately do not.

**One — a new transition clause, `implementation hole`.** `pClause` gained a first alternative,
available only under version 2:

```haskell
pClause :: Bool -> P Clause
pClause scalarSyntax =
    choice
        ( [CImplementationHole <$ (keyword "implementation" *> keyword "hole") | scalarSyntax]
            ++ [ CGuard <$> (keyword "guard" *> pExpr scalarSyntax)
               , (\r e -> CWrite r e) <$> (keyword "write" *> ident) <*> (symbol ":=" *> pExpr scalarSyntax)
               , ...
               ]
        )
```

Two literal words. `hole` is already in both packages as a Language constant (it has been the
`derive "…" hole` and `resolve … hole` marker since plan 4). `implementation` is new.
`PrettyPrint.hs` confirms the canonical spelling by rendering it back out as the first clause
of a transition: `["implementation hole" | tImplementation t == HoleImplementation]`.

**Two — a new type spelling, `Integer`.** Added to both branches of `pMappedTypeExpr`:

```haskell
        , TText <$ keyword "Text"
        , TInt <$ keyword "Int"
        , TInteger <$ keyword "Integer"
        , TBool <$ keyword "Bool"
```

`pMappedTypeExpr` is the type slot of a mapped type's wire field *and*, since keiro-dsl commit
`da09736`, of an aggregate register and an aggregate command/event field. So `Integer` appears
in the same three places `Natural` does. `Grammar.hs` gained the matching `TInteger`
constructor and `PrettyPrint.hs` the matching `docTypeExpr TInteger = "Integer"`.

**Three — the scalar expression sublanguage.** `pExpr` now takes a flag and chooses between the
frozen version-1 grammar and a new one:

```haskell
pExpr :: Bool -> P Expr
pExpr scalarSyntax
    | scalarSyntax = makeExprParser pScalarTerm scalarOperatorTable
    | otherwise = makeExprParser pLegacyTerm legacyOperatorTable
```

The new term parser accepts, in order: a parenthesised expression, `true`/`false`, a quoted
string, a signed integer, an id literal (`ident` followed by a parenthesised string), and a
dotted path:

```haskell
pScalarPath :: P Expr
pScalarPath = do
    loc <- getLoc
    firstName <- ident
    rest <- many (symbol "." *> ident)
    pure $ case (firstName, rest) of
        ("reg", name : path) -> EPath loc RegisterRoot (name : path)
        ("cmd", name : path) -> EPath loc CommandRoot (name : path)
        (_, [constructor]) | startsUpper firstName -> ELiteral loc (LiteralQualified firstName constructor)
        _ -> EPath loc UnqualifiedRoot (firstName : rest)
```

Read that carefully, because it is what decides the highlighting rule for the two roots: `reg`
and `cmd` are ordinary identifiers to the lexer, and become roots only when they are the head
of a path with at least one more segment. A register or field genuinely named `reg` is
reachable — the fourth case — so the words are not reserved and never could be.

The new operator table adds arithmetic:

```haskell
scalarOperatorTable =
    [ [InfixL (op "*" *> located EMultiply)]
    ,
        [ InfixL (op "+" *> located EAdd)
        , InfixL (op "-" *> located ESubtract)
        , InfixL scalarArithmeticUnsupported
        ]
    , [ InfixN (ECmp OpLe <$ op "<=") , … ]
    , [InfixL (EAnd <$ op "&&")]
    , [InfixL (EOr <$ op "||")]
    ]
```

`+` and `-` and `*` are real operators now; `/` and `%` are matched only to produce the error
"aggregate arithmetic operator '/' is unsupported". Of the three, only `*` is new to the
packages: `+` has been in both since plan 4 (it adds a duration to a time in a process timer),
and `-` is deliberately unclaimed, for the reasons in the Decision Log.

**Four — nothing else.** The comment rule, the string rule and its five escapes, the identifier
shapes, and the number forms are untouched by this range. `stringLit` and `integerLiteral` are
reused verbatim as expression operands, which is why the expression literals need no new rule:
a quoted operand is the same String both packages already match, and `integerLiteral`'s signed
decimal is the same shape Section 2 already describes for a mapped wire field's `on-missing=`
default.

### What is *not* in this change

`reservedWords` — the list Section 3 of the spec copies verbatim — is untouched. Both ends of
the range hold the identical 72 words. Neither `implementation` nor `Integer` nor `reg` nor
`cmd` was reserved, which Section 3 already explains at length: reservation exists only to stop
the plain-identifier parser `ident` from swallowing a structural word, and in each of these
positions there is nothing to swallow. Nothing about the comment, string, number, or identifier
rules changed.


## Plan of Work

Seven milestones, in dependency order. Each is independently verifiable.

### Milestone 1 — Reconcile the cross-package contract (`spec/keiro-dsl-language-model.md`)

Five edits, none of them to Section 3.

**Section 1, the version-preamble paragraph.** It currently says the parser's
`ensureBodyFeatures` gate scans for `mapped nominal …` and for the word `using`. Note that
keiro-dsl commit `8b0f55b` renamed that scan to `requiresSuccessorSyntax` and added four more
triggers — the word `Integer`, and the substrings `implementation hole`, `reg.`, and `cmd.` —
and repeat that a highlighter models none of it.

**Section 2, the numbers subsection.** The bullet on plain decimal integers lists the two slots
that admit a leading `-`. Add the third: an operand of a version-2 scalar expression, parsed by
the same `integerLiteral` rule, so `guard cmd.balance >= -100` is an uncoloured `-` followed by
one Number token. Say plainly that subtraction's `-` is uncoloured too, and why.

**Section 4.** Add `implementation` to the bare grid, taking it from 99 words to 100. The
dashed grid is unchanged at 32. In the mapped-type subsection, change "The type slot accepts
exactly ten spellings" to eleven and add `Integer` to the list of Primitive types there.

Then add a new subsection, "The scalar expression sublanguage", after the mapped-type one. It
must cover: the `implementation hole` clause and the class of each of its two words; the `reg.`
and `cmd.` roots, their class, and the follow-`.` condition with both of its justifications;
the arithmetic operators and the deliberate absence of a bare `-` rule; the literal shapes
(`"…"`, signed integers, `true`/`false`, `TicketStatus.Open`, `TicketId("tkt_…")`) and why none
of them needs a rule; and the collection vocabulary that must **not** be highlighted. Include a
worked example. Do not add `reg` or `cmd` to the bare grid — see the Decision Log.

**Section 5.** Add `*` to the operator list, in longest-match-first position (it is a single
character, so it goes with `<`, `>`, `+`), and add a role line: multiplication in an aggregate
scalar expression. Extend the `+` role line to mention addition.

**Section 6.** Add `implementation` and the two conditional roots to the Control row; add
`Integer` to the Primitive-type row; note in the Language-constant row that `hole` now has a
third parser site.

Acceptance: the spec describes what `Parser.hs` does at `8b0f55b`, and the word counts the
suites assert become 72 reserved (unchanged), **100** bare contextual, and 32 dashed contextual
(unchanged).

### Milestone 2 — Grow the shared corpus

Two files.

The first is a verbatim copy of upstream's authoritative version-2 fixture:

```bash
cp /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/aggregate-scalar-expressions-v2.keiro \
   corpus/aggregate-scalar-expressions.keiro
```

That file opens `language keiro-dsl 2`, declares registers of every scalar type including
`balance Integer = 0`, and carries one transition whose guard and writes use both roots, all
three arithmetic operators, a negative literal, a parenthesised subexpression, and a boolean
comparison. It is the single best sample of the new expression grammar and upstream's own test
suite parses and re-renders it.

The second is hand-written, because no upstream fixture pairs the `implementation hole` clause
with the two literal shapes. Create `corpus/transition-implementation-hole.keiro` with exactly
this content:

```text
# keiro-dsl transition implementation ownership and the scalar literal shapes. Every keyword
# named in this comment — implementation, guard, write, Integer, reg, cmd — must stay Comment,
# not keyword.
language keiro-dsl 2
context transition-implementation

id   TicketId    prefix=tkt
enum TicketStatus { Open=open Closed=closed }

aggregate TicketDesk
  regs
    ticketId TicketId     = initial
    status   TicketStatus = initial
    reserved Integer      = 0
    label    Text         = ""
  states Idle Holding Done!

  command Hold   { ticketId:TicketId amount:Integer label:Text }
  event   TicketHeld = fields(Hold)
  command Settle { ticketId:TicketId amount:Integer }
  event   TicketSettled = fields(Settle)

  # A transition whose behaviour the consumer owns. The whole body is one clause: keiro-dsl
  # generates a typed hole for it instead of a deterministic transducer.
  Idle -- Hold -->
    implementation hole
    emit TicketHeld
    goto Holding

  # A generated transition, using the scalar expression sublanguage in full: the reg. and cmd.
  # roots, all three arithmetic operators, a quoted literal, a qualified enum literal, and an
  # id literal.
  Holding -- Settle -->
    guard reg.reserved + cmd.amount * 2 - 1 >= 0
      && reg.status == TicketStatus.Open
      && reg.ticketId == TicketId("tkt_01h455vb4pex5vsknk084sn02q")
      && reg.label != ""
    write reserved := reg.reserved * 2
    write label := "settled"
    emit TicketSettled
    goto Done

  wire kind=ctorName fields=camelCase schemaVersion=1
```

Then add both files to `corpus/README.md` — the first under the "copied verbatim" section with
its date and keiro-dsl commit, the second under the "hand-written" section with its date and
the reason no upstream fixture covers it — matching the entries already there.

Acceptance: both files exist and both suites can open them. Neither is run through the keiro-dsl
parser here; this repository has no Haskell toolchain. The copied one is parsed by upstream's
own suite. The hand-written one is modelled clause-for-clause on that fixture, and where it goes
beyond it — the two literal shapes — a lexical highlighter's job is unchanged even if a later
semantic pass were to object, which is the principle
`docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`
settled.

### Milestone 3 — Teach the Vim syntax file (`packages/keiro-vim/syntax/keiro.vim`)

Four additions.

Add `Integer` to the `syntax keyword keiroType` line that already carries `Natural` and `Json`.
Add `implementation` to a `syntax keyword keiroStatement` line, with a comment recording that
it opens the transition clause `implementation hole` and that `hole` itself is already in the
constant list two blocks above.

Add a new rule for the two roots, near the other `-\@!`-guarded matches so the technique stays
in one place:

```vim
syntax match keiroStatement /\<\%(reg\|cmd\)\>\.\@=/
```

`\>` requires a word boundary after the word, so `regs` is untouched; `\.\@=` is a
zero-width lookahead for a literal `.`, so `prefix=cmd` is untouched. Neither word is a
`syntax keyword` anywhere in the file, so there is no keyword-outranks-match tie to lose.

Finally add `*` to the single-character operator class, which becomes `/[<>@!+*]/`.

Acceptance: the character sweep in Validation reports `keiroType` on all seven characters of
`Integer`, `keiroStatement` on all fourteen of `implementation` and on all three of `reg` and
`cmd` in `reg.balance` / `cmd.amount`, `keiroOperator` on `*`, and **no** group on the `cmd` of
`prefix=cmd`.

### Milestone 4 — Teach the TextMate grammar (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

Four additions, mirroring Milestone 3. Add `Integer` to the `#types` alternation — placed
before `Int` is not required, because the rule's trailing `(?![A-Za-z0-9_])` prevents `Int`
from matching the head of `Integer`, but the alternation reads better with the longer spelling
first and costs nothing. Add `implementation` to `#control-keywords`. Add a new repository
entry:

```json
"scalar-roots": {
  "match": "(?<![A-Za-z0-9_])(?:reg|cmd)(?=\\.)",
  "name": "keyword.control.keiro"
}
```

and include it in the top-level `patterns` array before `#control-keywords`. Add `*` to the
`#operators` character class, which becomes `[<>@!+;=*]`.

Acceptance: `scopesOf` reports `support.type.keiro` for `Integer`, `keyword.control.keiro` for
`implementation` and for `reg` and `cmd`, and `keyword.operator.keiro` for `*`; and the `cmd`
in `prefix=cmd` carries no keyword scope.

### Milestone 5 — Extend both test suites

`packages/shiki-keiro/test/scopes.test.ts` and `packages/keiro-vim/test/highlight_spec.lua`
each gain a block for this range, asserting against the two new corpus files:

- `Integer` gets the Primitive-type class, in the register slot and in a command field;
- `implementation` gets the Control class and `hole` on the same line keeps the
  Language-constant class;
- `reg` and `cmd` get the Control class when they head a path;
- `cmd` in `prefix=cmd`, in the existing `corpus/reservation.keiro`, gets **no** keyword class —
  the regression guard for the follow-`.` condition;
- `*` gets the Operator class;
- a negative operand (`-100`) is one whole Number token, with the `-` uncoloured;
- the aggregate around the new clauses still tokenizes normally.

Then raise the Section 4 bare count in both suites: 99 → **100**. The dashed count stays 32 and
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

All commands are run from the repository root, `/Users/shinzui/Keikaku/bokuno/keiro-syntax`,
unless stated otherwise.

**1. Read the range.**

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  fcd67482d33712b1a07675039049eb00322583bb..8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

**2. Prove `reservedWords` did not move.**

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
diff <(git show fcd67482d33712b1a07675039049eb00322583bb:keiro-dsl/src/Keiro/Dsl/Parser.hs \
        | sed -n '/^reservedWords/,/^    ]/p') \
     <(git show 8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9:keiro-dsl/src/Keiro/Dsl/Parser.hs \
        | sed -n '/^reservedWords/,/^    ]/p') && echo IDENTICAL
```

Expected: `IDENTICAL`.

**3. Capture the baseline.** Both suites must be green before any edit, so a later failure is
unambiguously this plan's.

```bash
(cd packages/shiki-keiro && bun install && bun test) 2>&1 | tail -4
./packages/keiro-vim/test/run.sh 2>&1 | tail -2
```

Expected: `51 pass / 0 fail`, and `324 checks, 0 failures`.

**4. Check the corpus for collisions before writing any unconditional rule.**

```bash
grep -rn 'prefix=cmd\|\breg\b\|implementation\|Integer' corpus/
```

Run this **before** Milestone 2 adds the two new samples, or their own text will answer the
question. Expected then: five `prefix=cmd` hits and nothing else. That result is what makes
`reg`/`cmd` conditional and `implementation`/`Integer` unconditional.

**5. Measure the new surface against both highlighters before editing either grammar.** For
Shiki, a scratch `packages/shiki-keiro/probe.ts`:

```typescript
import { createHighlighter } from 'shiki'
import { keiro } from './src/index'
const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
const code = [
  '    balance Integer = 0',
  '    implementation hole',
  '    guard cmd.balance + reg.balance >= -100 && reg.status == TicketStatus.Open',
  '    write balance := reg.balance * 2',
].join('\n')
for (const line of hl.codeToTokensBase(code, {
  lang: 'keiro', theme: 'github-light', includeExplanation: true,
})) {
  console.log(line.flatMap((t) => t.explanation ?? []).map((e) =>
    JSON.stringify(e.content) + '=' +
    (e.scopes.map((s) => s.scopeName).filter((s) => s !== 'source.keiro').join(',') || '.'),
  ).join(' '))
}
```

Run with `(cd packages/shiki-keiro && bun probe.ts)`, then delete it. For Vim, a scratch
`/tmp/probe.lua` that prints the highlight group of every character of the same lines:

```lua
vim.opt.runtimepath:prepend(vim.fn.getcwd() .. '/packages/keiro-vim')
vim.cmd('filetype on'); vim.cmd('syntax on')
vim.cmd('enew!'); vim.bo.buftype = 'nofile'
vim.api.nvim_buf_set_lines(0, 0, -1, false, {
  '    balance Integer = 0',
  '    implementation hole',
  '    guard cmd.balance + reg.balance >= -100 && reg.status == TicketStatus.Open',
  '    write balance := reg.balance * 2',
})
vim.bo.filetype = 'keiro'
vim.cmd('syntax sync fromstart')
for lnum = 1, 4 do
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

**6. Apply Milestone 1** to `spec/keiro-dsl-language-model.md`.

**7. Apply Milestone 2**: copy the upstream fixture, write the hand-written sample, then add
both entries to `corpus/README.md`.

**8. Apply Milestones 3 and 4** to the two grammar files, then re-run the step-5 probes and
confirm every new spelling now carries a group on every character.

**9. Apply Milestone 5** to both suites.

**10. Run both suites.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

**11. Write the sync subject.**

```bash
printf '%s\n' 'feat(syntax): highlight the typed scalar expression language' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Acceptance is behavioural, not "it compiles".

**A — the new spellings are coloured in Vim.** Before Milestone 3 none of `Integer`,
`implementation`, `reg`, `cmd`, or `*` has a highlight group; after, each does.

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/aggregate-scalar-expressions.keiro' \
  -c 'call search("Integer")' \
  -c 'echo synIDattr(synID(line("."), col("."), 1), "name")' \
  -c 'call search("reg\\.")' \
  -c 'echo synIDattr(synID(line("."), col("."), 1), "name")' \
  -c 'quitall!'
```

Expected after the change:

```text
keiroType
keiroStatement
```

**B — the new spellings are coloured in Shiki.** The scratch probe from Concrete Steps step 5,
re-run after Milestone 4, must report `support.type.keiro` on `Integer`,
`keyword.control.keiro` on `implementation`, `constant.language.keiro` on `hole`,
`keyword.control.keiro` on both `reg` and `cmd`, and `keyword.operator.keiro` on `*`.

**C — `prefix=cmd` is still uncoloured.** This is the regression guard for the whole
follow-`.` decision, and it must be checked in both engines against
`corpus/reservation.keiro`, which has carried `id CommandId prefix=cmd` since the corpus was
created:

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/reservation.keiro' \
  -c 'call search("prefix=cmd")' \
  -c 'echo "[" . synIDattr(synID(line("."), col(".") + 7, 1), "name") . "]"' \
  -c 'quitall!'
```

Observed: `[]` — an empty group name, meaning the `c` of `cmd` is plain text.

**D — both suites green.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

```text
 62 pass
 0 fail
 299 expect() calls
```

```bash
./packages/keiro-vim/test/run.sh
```

```text
355 checks, 0 failures
```

**E — the new guards actually guard.** Run each grammar edit in its failing direction, one at a
time, then restore. A guard that passes in both directions is not a guard, and doing them one at
a time is what shows which test covers which edit.

**Restore with a file copy, never with `git checkout`.** A sync run has committed nothing, so
`git checkout -- <path>` reverts the file to its state before the plan began and destroys every
edit in it — which is exactly what happened on the first attempt (see Surprises & Discoveries).
The working form is:

```bash
cp <grammar-file> /tmp/backup && <make the temporary edit> && <run that package's suite>
cp /tmp/backup <grammar-file>
```

Ten reversals were run this way — four Shiki grammar edits, four Vim ones, and one
"make the roots unconditional" reversal per package for the `prefix=cmd` guard. Observed:

```text
Shiki, remove `Integer` from #types
  (fail) the Integer type spelling gets support.type                                61 pass 1 fail
Shiki, remove `implementation` from #control-keywords
  (fail) the implementation hole clause is a control keyword plus a language constant
  (fail) every curated contextual keyword is classified as a keyword by the grammar  60 pass 2 fail
Shiki, remove the #scalar-roots include
  (fail) the scalar expression roots get keyword.control                             61 pass 1 fail
Shiki, remove `*` from #operators
  (fail) the arithmetic operators get keyword.operator                               61 pass 1 fail
Shiki, make #scalar-roots unconditional
  (fail) a root without a following dot is not a keyword                             61 pass 1 fail

Vim, remove `Integer` from the keiroType keyword list                                355 checks, 3 failures
Vim, remove the `syntax keyword keiroStatement implementation` line                  355 checks, 3 failures
Vim, remove the reg/cmd root match                                                   355 checks, 4 failures
Vim, remove `*` from the operator class                                              355 checks, 1 failures
Vim, replace the root match with `syntax keyword keiroStatement reg cmd`             355 checks, 1 failures
  FAIL "prefix=cmd" at offset 7: want no highlight group, got keiroStatement —
  a rule is claiming text that must stay plain
```

Two details are worth keeping. Removing `implementation` fails *two* Shiki tests, because it is
in Section 4's bare grid and so is covered by the spec-driven word-list guard as well as by the
hand-named one; removing the `reg`/`cmd` rule fails only hand-named tests, because those two
words are deliberately absent from that grid. And the last line of each package is the guard
that matters most: it is the one that fires if a future contributor "simplifies" the two roots
into an unconditional keyword and silently recolours five verbatim upstream corpus samples.

**F — the spec's word-list guards move together.** Both suites assert Section 3 has 72 words
and Section 4 has 100 bare plus 32 dashed. Section 3 and the dashed list must be unchanged by
this range; the bare count must have risen by exactly one. A failure here means Milestone 1's
edits and Milestone 5's counts disagree.


## Idempotence and Recovery

Every step here is safe to repeat.

- The measurement steps (2, 3, 4, 5) are read-only apart from files under `/tmp` and the
  scratch `packages/shiki-keiro/probe.ts`, which is deleted before the suites are run.
  Re-running them costs only time.
- The edits (Milestones 1 through 5) are ordinary file edits under version control. `git diff`
  shows the whole change. Nothing in this plan runs `git add`, `git commit`, or `git push` — the
  calling automation owns the commit — so recovery never involves rewriting history. **That also
  means `git checkout -- <path>` is not an undo for a temporary edit made mid-run**: with
  nothing committed, it reverts the file all the way to its state before the plan began. Use it
  only to abandon a file's changes deliberately and completely; for the temporary reversals of
  acceptance check E, copy the file to `/tmp` and copy it back.
- Milestones 3 and 4 are the only behavioural changes to a shipped grammar. Three of the four
  edits per package are purely **additive** words in existing lists, which cannot uncolour
  anything that was coloured before; the worst case is that a `.keiro` file using
  `implementation` or `Integer` as an ordinary identifier now shows it as a keyword, which is
  Section 1's documented lexical rule and the same behaviour `initial`, `key`, and `value`
  already have. The fourth, the `reg`/`cmd` rule, is the one that could recolour existing text,
  which is why acceptance check C exists and why both suites assert `prefix=cmd` stays plain.
  Reverting either grammar file alone restores the previous behaviour.
- The two corpus files are new, so nothing depends on them until Milestone 5 adds assertions.
  Deleting them and their `corpus/README.md` entries cleanly undoes Milestone 2. Re-running the
  `cp` is idempotent.
- The count assertions in Milestone 5 are the one place where two files must agree. If the
  suites fail with "want 100, got 99", the spec edit in Milestone 1 did not land in the fenced
  word block; fix the spec rather than lowering the count.
- `bun install` in `packages/shiki-keiro` is idempotent; the lockfile is committed.
- Both suites locate tokens by *first occurrence* in a file, so if a corpus file is ever edited
  after the assertions are written, re-run both suites: inserting a line that repeats an anchor
  earlier in the file can move an assertion onto the wrong token. That failure mode is loud —
  the reported group is wrong, not missing.


## Interfaces and Dependencies

**Upstream, read-only.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` at
`8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9` — the authority for every claim in the spec. Its
companions read for context:
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Grammar.hs` (the new `TInteger`
type constructor, the `EAdd`/`ESubtract`/`EMultiply`/`EPath`/`ELiteral` expression nodes, the
`ExprRoot` and `ScalarLiteral` types, and `TransitionImplementation`),
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` (`docTypeExpr`,
`docTransition`, `docPath`, and `docLiteral`, which fix the canonical spelling of every new
form), `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Expression.hs` (the
resolver that gives the literal shapes their meaning — read only to confirm what is a literal
and what is a path), and
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/aggregate-scalar-expressions-v2.keiro`
(the fixture copied into the corpus).

**In this repository.**

- `spec/keiro-dsl-language-model.md` — the contract. Section 3 must remain a verbatim copy of
  `reservedWords`; the fenced word blocks in Sections 3 and 4 are parsed by both suites, so
  their shape (```` ```text ```` fences, whitespace-separated words) must be preserved, and the
  suites read only the **first** block under Section 3 and the **first two** under Section 4 —
  any further fenced block in Section 4 is skipped structurally, which is what lets the new
  subsection carry a worked example. After this plan Section 4's bare block holds 100 words and
  its dashed block still holds 32.
- `packages/keiro-vim/syntax/keiro.vim` — Vim syntax. `Integer` joins the `syntax keyword
  keiroType` list; `implementation` joins a `syntax keyword keiroStatement` line; a new
  `syntax match keiroStatement /\<\%(reg\|cmd\)\>\.\@=/` claims the two roots; `*` joins the
  single-character operator class.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — TextMate grammar. `Integer` joins
  `#types`; `implementation` joins `#control-keywords`; a new `#scalar-roots` entry claims the
  two roots and is included in the top-level `patterns` array; `*` joins `#operators`.
- `corpus/aggregate-scalar-expressions.keiro` and `corpus/transition-implementation-hole.keiro`
  — new shared samples. Read-only to both packages per `corpus/README.md`; each package asserts
  against them from its own suite.
- `packages/keiro-vim/test/highlight_spec.lua` — reuses `expect`, `expect_uniform`, and the
  spec word-list guards already there. New assertions and one raised count; no helper change is
  needed. One new *negative* assertion is needed for `prefix=cmd`, which the existing helpers
  cannot express (they assert a group, never its absence), so add a small
  `expect_no_group(word, offset)` helper alongside them.
- `packages/shiki-keiro/test/scopes.test.ts` — reuses `expectScope`, `expectWholeToken`, and
  the spec word-list guards already there. New assertions, one raised count, and one negative
  assertion for `prefix=cmd` written directly against `scopesOf`, which already returns the
  scope list and can be asserted not to contain a keyword scope.

**Toolchain.** Neovim (headless, `-l` script mode) for the Vim suite; Bun and `shiki` for the
Shiki suite, both already pinned in `packages/shiki-keiro/package.json` and `bun.lock`. No new
dependency is added by this plan. This repository has no Haskell toolchain, so the upstream
parser is read, never run.
