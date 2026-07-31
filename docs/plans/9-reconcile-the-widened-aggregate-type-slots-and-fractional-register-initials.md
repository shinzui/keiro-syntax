---
id: 9
slug: reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials
title: "Reconcile the widened aggregate type slots and fractional register initials"
kind: exec-plan
created_at: 2026-07-31T15:00:52Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Reconcile the widened aggregate type slots and fractional register initials

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
`430c3d2cca0f491697d7e67a85362b78718a50be..da0973662301f7cb259481ca7cdeb5b3e5267278` —
whose range-ending (triggering) commit is
**`da0973662301f7cb259481ca7cdeb5b3e5267278`, `feat(dsl): unify aggregate type
capabilities`** — is the first sync in this repository's history whose parser change
**widens where existing tokens may appear** rather than adding new words. Exactly one of the
nine commits in the range touches `Parser.hs`, and it changes three things:

1. **An aggregate register's type slot** stopped being a bare identifier and became a full
   *type expression*. Before: `pRegDecl` read `ty <- ident`. After: `ty <- pMappedTypeExpr`.
2. **An aggregate command's and event's field type slot** did the same. Before, `pCommand`
   and `pEvent` parsed their braces with `pField`, whose type slot is `optional (symbol ":"
   *> ident)`. After, they parse with a new `pAggregateField`, whose type slot is `optional
   (symbol ":" *> pMappedTypeExpr)`. (Process and router nodes keep the old `pField`, so
   this widening is confined to aggregates.)
3. **A register initializer may now carry a fractional part.** `signedDecimalText` grew an
   `optional (char '.' *> some digitChar)`, so `-1.5` lexes where only `-1` did before.

`pMappedTypeExpr` is unchanged by this range. It is the ten-spelling grammar Section 4 of
`spec/keiro-dsl-language-model.md` already documents — `Text`, `Int`, `Bool`, `Natural`,
`Time` (with `UTCTime` as an accepted alias), `Json`, the one-argument constructors
`Optional`, `List`, `Map`, and a bare identifier naming another type. Until this range those
ten spellings could only appear inside a `mapped` declaration's `wire` block. Now they reach
two of the most-written slots in the language:

```text
aggregate ScalarLedger
  regs
    observedAt  Time       = "2026-01-02T03:04:05.123456789012Z"
    revision    Natural    = 0
  states Empty Recorded!

  command Record { observedAt:Time revision:Natural }
  event   ScalarsRecorded { observedAt:UTCTime revision:Natural }
```

**The good news, established by direct measurement before any edit was written, is that
neither highlighter classifies keywords by context.** Section 1 of the spec makes that a
rule: "A word is a keyword because it is in a fixed list, not because of where it appears."
Both packages already match `Time`, `Natural`, `Optional`, `List`, `Map`, and `Json`
unconditionally, so all six were already coloured correctly in a register or an aggregate
field the moment the parser began accepting them there. That is the payoff of the design
choice recorded in plan 8, and this range is the first evidence that it pays.

So this reconciliation is mostly a **contract and coverage** change: the spec has to stop
implying the ten type spellings live only inside a `mapped` block, the corpus has to contain
a sample that actually exercises the widened slots, and both suites have to assert the
result — otherwise the next person to "tidy" the grammars by scoping `Natural` to a mapped
block would break aggregates and no test would notice.

**One real defect did fall out of the measurement, and fixing it is the user-visible part of
this plan.** The Vim package has never coloured a fractional number as one token. Vim breaks
a same-start-column tie in favour of the syntax item **defined last**, and
`packages/keiro-vim/syntax/keiro.vim` declares the four number rules longest-first, so the
plain-integer rule `\<\d\+\>` — the last of the four — beats the fractional rule
`\<\d\+\.\d\+\>` and claims only the leading digits. `1.5` renders as a coloured `1`, an
**uncoloured `.`**, and a coloured `5`. The existing suite missed it because it reads the
highlight group at a token's first character only, and that character is `1` either way. The
Shiki package has always been correct here. This range is the moment to fix it: the parser
change puts a *signed* fractional literal into a register initializer, the most ordinary
place in the language to write a number.

You can see the defect, and then the fix, with your own eyes. From the repository root,
before the change:

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/router-readmodel-snapshot.keiro' \
  -c 'call search("1\.5")' \
  -c 'for c in range(col("."), col(".")+2) | echo synIDattr(synID(line("."), c, 1), "name") | endfor' \
  -c 'quitall!'
```

Before the change this prints `keiroNumber`, then an **empty line**, then `keiroNumber`.
After the change it prints `keiroNumber` three times.

The equivalent tour of the new corpus sample, interactively:

```bash
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/aggregate-scalar-types.keiro
```

Put the cursor on the `T` of `Time` in the `regs` block and run
`:echo synIDattr(synID(line('.'), col('.'), 1), 'name')`; it prints `keiroType`. The same on
`Natural`, on the `UTCTime` in the event's field list, and on the `Optional`, `List`, `Map`,
and `Json` in the second aggregate's `command Inspect { … }`. And for Shiki:

```bash
(cd packages/shiki-keiro && bun run demo && open examples/keiro-demo.html)
```


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] Read the keiro-dsl range diff and isolate the three parser changes that touch the
      lexical surface (2026-07-31).
- [x] Confirm mechanically that `reservedWords` is byte-identical across the range — 72
      words before and after, so Section 3 needs no edit (2026-07-31).
- [x] Measure both highlighters against the widened slots *before* editing anything, to
      establish what actually needs to change (2026-07-31).
- [x] Add `corpus/aggregate-scalar-types.keiro` and register it in `corpus/README.md`
      (2026-07-31).
- [x] Milestone 1 — reconcile `spec/keiro-dsl-language-model.md` (Sections 2, 4, 6)
      (2026-07-31).
- [x] Milestone 2 — fix the Vim fractional-number rule ordering (2026-07-31).
- [x] Milestone 3 — confirm the Shiki grammar needs no rule change, and record its
      deliberately-inverse `#numbers` ordering in a `comment` key (2026-07-31).
- [x] Milestone 4 — extend both suites: widened-slot assertions plus a whole-token
      fractional-number guard (2026-07-31).
- [x] Milestone 5 — run both suites green (2026-07-31).
- [x] Milestone 6 — write `.keiro-dsl-sync-subject` (2026-07-31).


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **A widening of the grammar can be a no-op for a context-free highlighter, and that is
  the design working.** Both packages match `Natural`, `Time`, `UTCTime`, `Json`,
  `Optional`, `List`, and `Map` with unconditional word-boundary rules, so the parser
  accepting them in a new slot required no grammar edit at all. Measured on the new corpus
  sample before any edit, via `packages/shiki-keiro/probe.ts` (a scratch script, deleted
  afterwards) and a Neovim `synID` sweep:

  ```text
  Time         ["support.type.keiro"]        Optional     ["support.type.keiro"]
  Natural      ["support.type.keiro"]        List         ["support.type.keiro"]
  Int          ["support.type.keiro"]        Map          ["support.type.keiro"]
  Bool         ["support.type.keiro"]        Json         ["support.type.keiro"]
  Text         ["support.type.keiro"]        UTCTime      ["support.type.keiro"]
  ```

  The Vim sweep agreed: `keiroType` on every one of the ten, in both the `regs` block and
  the `command`/`event` field lists. Recording this matters more than it looks — a future
  reader tempted to scope the type rules to a `mapped` block by context would silently break
  every aggregate written after this range.

- **Vim breaks a same-column tie by *last definition*, which had silently disabled the
  fractional-number rule since the rule was written.** `packages/keiro-vim/syntax/keiro.vim`
  listed the four number patterns longest-first:

  ```vim
  syntax match keiroNumber /\<v\d\+\>/
  syntax match keiroNumber /\<\d\+\a\+\>/
  syntax match keiroNumber /\<\d\+\.\d\+\>/
  syntax match keiroNumber /\<\d\+\>/
  ```

  At the `1` of `1.5` both the third and fourth patterns match; the fourth is defined last,
  so it wins and claims `1` alone. A character-by-character probe of a scratch buffer, before
  the fix:

  ```text
  multiplier=1.5   →  1=keiroNumber  .=(none)  5=keiroNumber
  fireAt x + 5m    →  5=keiroNumber  m=keiroNumber
  event T v2       →  v=keiroNumber  2=keiroNumber
  balance Int = -1 →  -=(none)       1=keiroNumber
  ```

  Only the fractional form is affected. `5m` and `v2` survive because `\<\d\+\>` cannot match
  them at all: `\>` requires a non-word character after the digits, and `m` and the digits of
  `v2` are word characters. The fix is to declare `\<\d\+\>` **first** so the longer patterns,
  declared after it, win the tie. This is the exact inverse of the TextMate rule the Shiki
  grammar follows (first listed alternative wins), which is why the two packages diverged.

- **The existing `1.5` assertion in both suites could not have caught it.** Both suites
  locate a token and read its class at the token's *first character* — `1` in both engines,
  `keiroNumber` in both, pass. This is the same class of blind spot plan 8 found for dashed
  keywords, where `on-ok` read as a coloured `on` plus a grey `-ok` and a first-character
  check passed. The remedy is the same: assert the class is uniform across **every**
  character of the literal. Both suites now do that for `1.5` and `-1.5`.

- **Section 2 of the spec claimed a lone `-` is coloured as an operator; neither package
  does that, and neither should.** The sentence read: "a purely lexical highlighter colors
  the digits as a number and the `-` as an operator". Measured: Vim's operator rules are
  `-->`, `->`, `--`, `:=`, `=>`, `[=!<>]=`, `<>`, `&&`, `||`, `[<>@!+]` — no lone `-`;
  Shiki's single alternation is `-->|--|->|:=|=>|==|!=|<=|>=|<>|&&|\|\||[<>@!+;=]` — also no
  lone `-`. Section 5's operator list contains `-->`, `--`, and `->` but never a bare `-`, so
  the two packages match Section 5 and it was Section 2's prose that was wrong. Corrected in
  Milestone 1 rather than "fixed" in the grammars: colouring a lone `-` would light up the
  first character of every `--` and `-->` chain the moment either engine's longest-match
  guarantee slipped, for no reader benefit.

- **The parser now lexes `*` and `/` in aggregate guard expressions, but only in order to
  reject them.** `operatorTable` gained a new highest-precedence row
  `[InfixL arithmeticUnsupported]` whose parser consumes one of `+ - * /` and then
  unconditionally calls `failAt` with "aggregate arithmetic operator '…' is unsupported;
  compare or copy whole values instead". No well-formed `.keiro` file can contain `*` or `/`
  in a guard. Deliberately **not** added to Section 5 or to either grammar — see the Decision
  Log.

- **Two cross-package divergences already in the tree, found while measuring operators, and
  left alone as out of scope.** Vim does not colour a bare `=` or a bare `;`, both of which
  Shiki claims via `[<>@!+;=]` and both of which Section 5 lists; and neither package claims
  `:`, `.`, or `,`, which Section 5 also lists. Nothing in this keiro-dsl range touches any
  of them. Recorded here, not fixed here, exactly as plan 8 recorded the permanently-inert
  `keiroTypeName` rule: a future plan that wants Section 5 fully implemented in both engines
  starts from this note rather than from fresh measurement.

- **A Neovim probe run from the wrong working directory silently measures a *different*
  plugin, and the result looks like a regression.** `probe.lua` prepends
  `getcwd() .. '/packages/keiro-vim'` to `runtimepath`. Run from
  `packages/shiki-keiro/` (where an earlier step had left the shell), that path does not
  exist, the prepend is a no-op, and `-u NONE` still leaves the user's own
  `~/.config/nvim` on the runtimepath — so an older *installed* copy of this plugin loaded
  instead. The symptom was baffling and specific: after the Milestone 2 reorder, `Natural`
  suddenly had no highlight group while `Int` still did, and `1.5` was still split. That is
  the signature of a keiro.vim from before plan 8, which added `Natural`. Re-running the same
  probe from the repository root reproduced neither symptom. The reorder was correct all
  along; nothing was broken and nothing needed reverting. Anything measuring this plugin must
  `cd` to the repository root first — which `packages/keiro-vim/test/run.sh` does correctly,
  by deriving an absolute plugin directory from its own path.

- **`reservedWords` did not change, and this range is the best illustration yet of why that
  proves nothing.** Verified mechanically at both ends of the range:

  ```bash
  cd /Users/shinzui/Keikaku/bokuno/keiro
  for c in 430c3d2cca0f491697d7e67a85362b78718a50be \
           da0973662301f7cb259481ca7cdeb5b3e5267278; do
    git show $c:keiro-dsl/src/Keiro/Dsl/Parser.hs \
      | sed -n '/^reservedWords =/,/^    ]/p' | grep -o '"[^"]*"' | tr -d '"'
  done
  ```

  Both ends print the identical 72 words. Section 3 of the spec already warns that "a stable
  Section 3 does not mean a stable language"; plan 8 made that point about *added* words that
  simply were not reserved. This range makes the sharper point: the parser can move an entire
  existing sub-grammar into a new slot without touching a single word list.


## Decision Log

Record every decision made while working on the plan.

- Decision: Treat this range as a real lexical-surface change requiring spec, corpus, and
  test work, rather than closing it with a `chore(sync)` "no lexical change" subject.
  Rationale: three parser rules that the spec describes verbatim (`pRegDecl`, the aggregate
  field type slot, `signedDecimalText`) all changed. Section 2's number description and
  Section 4's framing of `pMappedTypeExpr` as mapped-block-only both became inaccurate, and
  the corpus contained no file exercising the widened slots. A `chore(sync)` subject would
  have left the contract stating something the parser no longer does.
  Date: 2026-07-31

- Decision: Do not add `*` or `/` to Section 5's operator list or to either grammar.
  Rationale: the parser lexes them only inside `arithmeticUnsupported`, which always fails.
  They can never appear in a `.keiro` file that parses. Colouring them as operators would
  advertise an arithmetic surface the language deliberately does not have, and the diagnostic
  the parser emits ("compare or copy whole values instead") is the intended teaching moment.
  Leaving them uncoloured is the honest signal. `+` stays an operator because it is genuinely
  valid elsewhere — `fireAt input.observedAt + 5m`.
  Date: 2026-07-31

- Decision: Fix the Vim fractional-number ordering in this plan rather than deferring it.
  Rationale: it is a live defect in the exact token class this range widens — `signedDecimalText`
  now produces fractional register initializers, so the language grew its first ordinary place
  to write `-1.5`. Deferring would ship a sync that documents fractional register initials in
  the spec while the Vim package still splits them into three tokens.
  Date: 2026-07-31

- Decision: Leave the bare `=` / `;` / `:` / `.` / `,` operator divergences alone.
  Rationale: none of them is touched by this keiro-dsl range, all predate it, and fixing them
  means restyling every existing `.keiro` file in both engines — a change that deserves its
  own plan and its own before/after screenshots rather than riding along on a sync. Recorded
  in Surprises & Discoveries so the evidence does not have to be gathered twice.
  Date: 2026-07-31

- Decision: Put both the aggregate-accepted and the parse-accepted-but-semantically-rejected
  type shapes into one corpus file, `corpus/aggregate-scalar-types.keiro`, separated into two
  aggregates with a comment explaining the split.
  Rationale: a highlighter colours text as it is typed, including text a later pass will
  reject. `Optional(Text)`, `List(Text)`, `Map(Text)`, and `Json` all parse in an aggregate
  field slot after this range — upstream's own
  `keiro-dsl/test/fixtures/aggregate-scalars-invalid-capabilities.keiro` writes exactly that
  and expects a *semantic* diagnostic, not a parse error — so an editor must tokenize them.
  Keeping them in a separate aggregate with a comment stops a future reader from taking the
  file as a claim that those shapes are legal in an aggregate.
  Date: 2026-07-31

- Decision: Write the corpus file by hand rather than copying an upstream fixture verbatim.
  Rationale: no single upstream fixture covers the range's whole lexical surface.
  `aggregate-scalars.keiro` has `Time` and `Natural` but no `Int`/`Bool`/`Text` register, no
  `UTCTime`, no type-expression constructors and no fractional initializer;
  `aggregate-scalars-invalid-capabilities.keiro` has the constructors and a fractional
  initializer but drops `UTCTime` and the `mapped` type reference. The corpus README already
  distinguishes copied-verbatim files from hand-written ones, and hand-written is the
  established answer when the surface spans fixtures — see
  `corpus/router-readmodel-snapshot.keiro` and `corpus/mapped-type-spellings.keiro`.
  Date: 2026-07-31


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

The range reconciled cleanly. Final state:

- `spec/keiro-dsl-language-model.md` — Section 2's number description now states the
  register-initializer form as `-?[0-9]+(\.[0-9]+)?` and no longer claims a lone `-` is
  coloured as an operator; Section 4's mapped-type subsection now says explicitly that
  `pMappedTypeExpr` is *also* the aggregate register and aggregate command/event field type
  slot, with the keiro-dsl commit named; Section 6's Primitive type row carries the same
  pointer. Section 3 is untouched — still the same verbatim 72 words.
- `packages/keiro-vim/syntax/keiro.vim` — the four number rules are reordered
  shortest-first, with a comment recording Vim's last-definition-wins tie-break so the order
  is not "tidied" back.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — no rule change; measured correct
  before and after. It gained one `comment` key on `#numbers` recording that its
  longest-first ordering is deliberately the *inverse* of Vim's, so a future contributor
  does not "align" the two files and reintroduce the defect in the other direction.
- `corpus/aggregate-scalar-types.keiro` — new, plus its entry in `corpus/README.md`.
- Both suites — new assertions for the widened slots, and a whole-token number guard that
  would have caught the Vim defect on the day it was introduced.

Suites at completion: `bun test` 39 pass / 0 fail / 171 expect() calls; `run.sh` 283 checks,
0 failures. Both guards were verified in the failing direction as well (acceptance check G):
restoring Vim's longest-first ordering fails two checks naming `1.5`, and swapping the two
`#numbers` alternatives in the TextMate grammar fails two Shiki tests.

The lesson worth carrying forward is the one in the second and third Surprises entries. Both
suites had an assertion named for the fractional literal, it had passed since plan 4, and the
feature it named had never worked. First-character assertions are cheap to write and they
verify strictly less than they appear to. Plan 8 learned this for dashed keywords and fixed
it *for dashed keywords*; the same blind spot was sitting in the number rules the whole time.
Any assertion about a multi-character token should check the whole token, and this plan's
`expect_uniform` (Vim) and `expectWholeToken` (Shiki) helpers are there to make that the easy
thing to do next time.


## Context and Orientation

A reader who has never seen this repository needs the following.

**What keiro-dsl is.** A domain-specific language for describing event-sourced workflows in
the keiro framework. A `.keiro` file declares things like aggregates, processes, routers,
contracts, and read models. You do not need to understand event sourcing to work on this
plan — everything here is about how the *text* looks.

**What this repository is.** Two syntax-highlighting packages plus the shared contract and
corpus that keep them honest:

- `spec/keiro-dsl-language-model.md` — the **cross-package contract**. Section 2 describes
  comments, strings, numbers, and identifiers; Section 3 is a verbatim copy of the parser's
  `reservedWords` list; Section 4 is a curated list of words the parser recognises in context
  but does not reserve; Section 5 lists operators; Section 6 is the token-class taxonomy that
  maps every word to a TextMate scope (for Shiki) and a Vim highlight group.
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar.
- `corpus/*.keiro` — the shared sample files both suites tokenize. `corpus/README.md`
  records, per file, whether it was copied verbatim from upstream (and at which keiro-dsl
  commit) or hand-written here, and why.
- `packages/keiro-vim/test/highlight_spec.lua`, run by
  `packages/keiro-vim/test/run.sh` — headless Neovim assertions.
- `packages/shiki-keiro/test/scopes.test.ts`, run by `bun test` — Shiki assertions.

**The upstream source of truth.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, a Haskell file
using the `megaparsec` library. Read it directly; do not infer the language from the
highlighters.

**What a `sync-keiro-dsl` run is.** When keiro-dsl changes, an automation opens this
repository with a commit range and asks for the four artifacts above to be brought back into
agreement, with an ExecPlan as the durable record. Plans 4 through 8 in `docs/plans/` are the
previous runs. This is run 9, for the range
`430c3d2cca0f491697d7e67a85362b78718a50be..da0973662301f7cb259481ca7cdeb5b3e5267278`.

### The three parser changes, in full

Inspect them with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  430c3d2cca0f491697d7e67a85362b78718a50be..da0973662301f7cb259481ca7cdeb5b3e5267278 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs
```

**One — the register type slot.** A `regs` block declares an aggregate's mutable registers,
each `name Type = initial`:

```diff
 pRegDecl :: P RegDecl
 pRegDecl = do
     loc <- getLoc
     name <- ident
-    ty <- ident
+    ty <- pMappedTypeExpr
     _ <- symbol "="
```

**Two — the aggregate field type slot.** `pCommand` and `pEvent` swapped `pField` for a new
`pAggregateField`:

```diff
+pAggregateField :: P AggregateField
+pAggregateField = do
+    loc <- getLoc
+    n <- ident
+    mty <- optional (symbol ":" *> pMappedTypeExpr)
+    pure AggregateField{…}
+
 pField :: P Field
 pField = do
     n <- ident
     mty <- optional (symbol ":" *> ident)
```

`pField` survives unchanged for process and router nodes — the upstream Haddock says the two
are "kept separate so widening aggregate syntax does not widen those node families". A
router's `input IncidentInput { incidentId:Id region }` still takes a bare identifier in the
type slot. That distinction is invisible to a context-free highlighter, which is why neither
grammar needs to model it.

**Three — fractional register initializers.**

```diff
 signedDecimalText :: P Text
 signedDecimalText = lexeme $ do
     sign <- optional (char '-')
     digits <- some digitChar
-    pure (T.pack (maybe "" pure sign <> digits))
+    fractional <- optional (char '.' *> some digitChar)
+    pure (T.pack (maybe "" pure sign <> digits <> maybe "" ('.' :) fractional))
```

`signedDecimalText` is called from exactly one place, `pRegDecl`'s initializer:
`(RegInitText <$> stringLit) <|> (RegInitBare <$> (ident <|> signedDecimalText))`. The
separate `integerLiteral` used by a mapped wire field's `on-missing=` clause is unchanged and
still integer-only.

### What `pMappedTypeExpr` accepts

Unchanged by this range, quoted here so the plan is self-contained:

```haskell
pMappedTypeExpr :: P TypeExpr
pMappedTypeExpr =
    choice
        [ TOptional <$> (keyword "Optional" *> pTypeArgument)
        , TList <$> (keyword "List" *> pTypeArgument)
        , TMap <$> (keyword "Map" *> pTypeArgument)
        , TText <$ keyword "Text"
        , TInt <$ keyword "Int"
        , TBool <$ keyword "Bool"
        , TNatural <$ keyword "Natural"
        , TTime <$ (keyword "Time" <|> keyword "UTCTime")
        , TJson <$ keyword "Json"
        , TRef <$> ident
        ]
  where
    pTypeArgument = parens pMappedTypeExpr <|> pTypeAtom
```

Ten spellings plus `TRef`, and a type argument that may be parenthesised (`Optional(Text)`)
or bare (`Optional Text`). Parentheses are uncoloured punctuation in both packages, like the
braces of a field list — Section 5 has never claimed them.

### Syntax accepted here, rejected later

The new module
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/AggregateType.hs` decides,
*after* parsing, which of those shapes an aggregate may actually carry — `Text`, `Int`,
`Bool`, `Natural`, `Time`, id types, enums, state vertices, and mapped types are admitted;
`Optional`, `List`, `Map`, and `Json` produce an `UnsupportedAggregateShape` or
`UnsupportedAggregateCapability` diagnostic pointing at the offending token. That is a
*semantic* rejection, not a parse failure, which is why upstream's
`keiro-dsl/test/fixtures/aggregate-scalars-invalid-capabilities.keiro` is a well-formed file
containing `command Inspect { … optionalValue:Optional(Text) values:List(Text) … }`. A
highlighter must tokenize such a file, because the user is looking at it in an editor while
fixing the diagnostic. This plan's corpus sample covers both sides.


## Plan of Work

Six milestones, in dependency order. Each is independently verifiable.

### Milestone 1 — Reconcile the cross-package contract (`spec/keiro-dsl-language-model.md`)

Three edits, none of them to Section 3.

**Section 2, "Numbers", first bullet.** It currently says the register-initializer integer
"may carry a leading `-` sign (`-?[0-9]+`, e.g. `count Int = -1` and `on-missing=-1`; parsers
`signedDecimalText` and `integerLiteral`)", and closes with the inaccurate claim about a lone
`-` being coloured as an operator. Rewrite so it: (a) gives the register-initializer form as
`-?[0-9]+(\.[0-9]+)?` and names the commit that widened it, (b) keeps `integerLiteral`'s
`on-missing=` form at `-?[0-9]+`, and (c) replaces the operator claim with what both packages
actually do — the digits take the Number class and the lone `-` is left as uncoloured
punctuation, because Section 5's list contains `-->`, `--`, and `->` but no bare `-`.

**Section 2, "Numbers", second bullet.** The fractional bullet currently justifies itself
with a backoff `multiplier=1.5`. Add the register initializer as the second, and now more
common, home for the form, and strengthen the closing note: matching the fractional form
before *or after* the plain integer is engine-dependent — a TextMate grammar takes the first
listed alternative that matches, Vim takes the item defined last — so what a highlighter must
guarantee is the *outcome* (one whole token), not a fixed ordering.

**Section 4, mapped-type subsection, the "type slot accepts exactly ten spellings" bullet.**
Add a sentence stating that as of keiro-dsl `da09736` the same `pMappedTypeExpr` is the type
slot of an aggregate register (`pRegDecl`) and of an aggregate command/event field
(`pAggregateField`), so those ten spellings appear outside a `mapped` block; note that
process and router fields keep the old bare-identifier slot; and note that because both
packages classify these words unconditionally, the widening needed no grammar change.

**Section 6, Primitive type row.** Extend the parenthetical so the taxonomy table itself
carries the pointer: these spellings are not confined to a `mapped` declaration.

Acceptance: the spec describes what `Parser.hs` does at `da09736`, and the word counts both
suites assert (72 reserved, 96 bare contextual, 31 dashed contextual) are unchanged, because
no word was added or removed anywhere.

### Milestone 2 — Fix the Vim fractional-number rule (`packages/keiro-vim/syntax/keiro.vim`)

Reorder the four `keiroNumber` matches so `\<\d\+\>` comes **first** and the three longer
forms follow it, and add a comment recording why: Vim resolves a same-start-column tie in
favour of the item defined **last**, the opposite of the TextMate rule the Shiki grammar
follows. Nothing else in the file changes.

Acceptance: the character sweep in Validation reports `keiroNumber` on all three characters
of `1.5`, and `5m` / `v2` / `-1` are unaffected.

### Milestone 3 — Confirm the Shiki grammar needs no rule change

`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` already lists `\b[0-9]+\.[0-9]+\b`
before `\b[0-9]+\b` inside `#numbers`, and already matches all ten type spellings
unconditionally in `#types`. Verify by measurement and change no rule. A milestone that ends
in "no edit" still has to be *run*.

Add one thing: a `comment` key on `#numbers` stating that its longest-first ordering is the
deliberate inverse of the Vim file's shortest-first ordering, and that the two must not be
aligned. Milestone 2 puts the same warning in `keiro.vim`. Without the note on both sides, the
next contributor to open either file sees an ordering that looks wrong against the other.

Acceptance: swapping the two `#numbers` alternatives makes the Shiki suite fail — proof the
existing order is load-bearing and not incidental.

### Milestone 4 — Grow the shared corpus

Add `corpus/aggregate-scalar-types.keiro`, hand-written for this repository. It must contain,
at minimum:

- a `mapped structural record LedgerNote { … }` declaration, so the file can exercise a
  register and a field whose type is a reference to a mapped type;
- an `aggregate ScalarLedger` whose `regs` block declares registers typed `Time`, `Natural`,
  `Int`, `Bool`, `Text`, and `LedgerNote`, with a string initializer, a plain integer, a
  signed integer, a bare constructor, and the `placeholder` constant;
- a `command` and an `event` in that aggregate whose fields use `:Time`, `:Natural`, `:Int`,
  `:Bool`, `:UTCTime`, and `:LedgerNote`, plus at least one *bare* field name so the "reuses
  the inferred type" form stays covered;
- a second `aggregate ProbeLedger` carrying the shapes that parse here and are rejected by
  the later semantic pass — a fractional register initializer `-1.5` and fields typed
  `Optional(Text)`, `List(Text)`, `Map(Text)`, and `Json` — introduced by a comment saying
  exactly that, so no reader takes the file as a legality claim;
- a leading comment naming several keywords (`regs`, `command`, `event`, `Natural`,
  `Optional`, `Map`), so both suites can confirm a comment still beats the words inside it.

Then add the file to `corpus/README.md` under the hand-written section, with its date, what
it covers, and a pointer back to this plan — matching the entries already there.

### Milestone 5 — Extend both test suites

`packages/shiki-keiro/test/scopes.test.ts` and `packages/keiro-vim/test/highlight_spec.lua`
each gain a block for this range:

- the widened register slot: `Time`, `Natural`, `Int`, `Bool`, `Text` all get the type class
  inside `regs`;
- the widened field slot: `:Time`, `:Natural`, `:UTCTime`, `:Json` and the parenthesised
  `Optional(Text)`, `List(Text)`, `Map(Text)` all get the type class inside a `command` /
  `event`;
- the mapped-type reference `LedgerNote` still tokenizes in both slots;
- the aggregate around them still tokenizes: `regs`, `command`, `event`, `guard`, `:=`;
- the leading comment still wins over the keywords inside it.

Plus the whole-token number guard, which is the part that would have caught the Vim defect:
a helper that asserts a literal's class is *uniform across every character*, applied to `1.5`
and to the `-1.5` in the new corpus file. In Vim, `expect_uniform` extends the same
per-character technique `expect_all_keywordish` already uses for dashed keywords. In Shiki,
`expectWholeToken` asserts the explanation entry's content equals the whole literal, the
same technique `classifyFailures` already uses.

### Milestone 6 — Write the sync subject

Write one Conventional Commits subject line to `.keiro-dsl-sync-subject` at the repository
root. The calling script owns the commit; this plan does not run `git add`, `git commit`, or
`git push`, and does not write `spec/.keiro-dsl-sync`.


## Concrete Steps

All commands are run from the repository root,
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, unless stated otherwise.

**1. Read the range.**

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  430c3d2cca0f491697d7e67a85362b78718a50be..da0973662301f7cb259481ca7cdeb5b3e5267278 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

**2. Prove `reservedWords` did not move.**

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
for c in 430c3d2cca0f491697d7e67a85362b78718a50be \
         da0973662301f7cb259481ca7cdeb5b3e5267278; do
  git show $c:keiro-dsl/src/Keiro/Dsl/Parser.hs \
    | sed -n '/^reservedWords =/,/^    ]/p' | grep -o '"[^"]*"' | tr -d '"' > /tmp/rw-$c.txt
  echo "$c: $(wc -l < /tmp/rw-$c.txt) words"
done
diff /tmp/rw-430c3d2*.txt /tmp/rw-da09736*.txt && echo IDENTICAL
```

Expected:

```text
430c3d2cca0f491697d7e67a85362b78718a50be: 72 words
da0973662301f7cb259481ca7cdeb5b3e5267278: 72 words
IDENTICAL
```

**3. Capture the baseline.** Both suites must be green before any edit, so a later failure is
unambiguously this plan's.

```bash
(cd packages/shiki-keiro && bun install && bun test) 2>&1 | tail -4
./packages/keiro-vim/test/run.sh 2>&1 | tail -2
```

Expected: `33 pass / 0 fail`, and `260 checks, 0 failures`.

**4. Write `corpus/aggregate-scalar-types.keiro`** to the shape in Milestone 4, then add its
entry to `corpus/README.md`.

**5. Measure the new file against both highlighters before editing either grammar.** For Vim,
a scratch script that prints the highlight group of every character of a literal:

```bash
cat > /tmp/probe.lua <<'EOF'
vim.opt.runtimepath:prepend(vim.fn.getcwd() .. '/packages/keiro-vim')
vim.cmd('filetype on'); vim.cmd('syntax on')
vim.cmd('silent! edit! ' .. vim.fn.getcwd() .. '/corpus/aggregate-scalar-types.keiro')
vim.cmd('syntax sync fromstart')
local function probe(word)
  for lnum = 1, vim.fn.line('$') do
    local s = vim.fn.match(vim.fn.getline(lnum), '\\V' .. vim.fn.escape(word, '\\'))
    if s >= 0 then
      local out = {}
      for c = s + 1, s + #word do
        local g = vim.fn.synIDattr(vim.fn.synID(lnum, c, 1), 'name')
        out[#out + 1] = (g == '' and '·' or g)
      end
      print(string.format('%-22s L%-3d %s', word, lnum, table.concat(out, ' ')))
      return
    end
  end
  print(string.format('%-22s MISSING', word))
end
for _, w in ipairs({'Time', 'Natural', 'Optional(Text)', 'Map(Text)', '-1.5'}) do probe(w) end
vim.cmd('quitall!')
EOF
nvim --headless -n -u NONE -i NONE -l /tmp/probe.lua
```

For Shiki, a scratch `packages/shiki-keiro/probe.ts` calling
`hl.codeToTokensBase(code, { lang: 'keiro', theme: 'github-light', includeExplanation: true })`
and printing the scopes of each explanation entry. Delete both scratch files afterwards; the
findings belong in Surprises & Discoveries, not in the tree.

**6. Apply Milestone 1** to `spec/keiro-dsl-language-model.md`.

**7. Apply Milestone 2** to `packages/keiro-vim/syntax/keiro.vim`, then re-run the step-5
Vim probe and confirm `-1.5` reads `· keiroNumber keiroNumber keiroNumber keiroNumber`
(uncoloured `-`, then four number characters).

**8. Apply Milestone 5** to both suites.

**9. Run both suites.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

**10. Write the sync subject.**

```bash
printf '%s\n' 'fix(keiro-vim): tokenize fractional numbers whole and cover the widened aggregate type slots' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Acceptance is behavioural, not "it compiles".

**A — the Vim fractional-number fix is real.** Before Milestone 2, the middle character of
`1.5` has no highlight group; after, it is `keiroNumber`. Run against a corpus file that
predates this plan, so the check is about the grammar and not about the new sample:

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/router-readmodel-snapshot.keiro' \
  -c 'call search("1\.5")' \
  -c 'for c in range(col("."), col(".")+2) | echo synIDattr(synID(line("."), c, 1), "name") | endfor' \
  -c 'quitall!'
```

Expected after the fix — three identical lines:

```text
keiroNumber
keiroNumber
keiroNumber
```

**B — the fix did not cost the other numeric forms.** In the same buffer, `5m`, `v2`, `100`,
and `-1` must still be `keiroNumber` on every digit and unit character. Covered by the
existing assertions plus the new uniform-token guard.

**C — the widened slots tokenize in both engines.** In
`corpus/aggregate-scalar-types.keiro`:

- Vim: `Time`, `Natural`, `Int`, `Bool`, `Text` in the `regs` block, and `observedAt:Time`,
  `revision:Natural`, `observedAt:UTCTime`, `blob:Json`, `Optional(Text)`, `List(Text)`,
  `Map(Text)` in the command/event field lists → `keiroType`.
- Shiki: the same tokens → `support.type.keiro`.

**D — the aggregate around them is undisturbed.** `regs`, `command`, `event`, `guard` →
`keiroStatement` / `keyword.control.keiro`; `:=` → `keiroOperator` /
`keyword.operator.keiro`; `aggregate` → `keiroKeyword` / `keyword.declaration.keiro`; the
leading comment → `keiroComment` / `comment.line.number-sign.keiro` across its whole length,
even though it names six keywords.

**E — both suites green.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

```text
 39 pass
 0 fail
 171 expect() calls
```

```bash
./packages/keiro-vim/test/run.sh
```

```text
283 checks, 0 failures
```

**F — the spec's word-list guards still hold.** Both suites assert Section 3 has 72 words and
Section 4 has 96 bare plus 31 dashed. This range adds no word to any list, so all three counts
must be unchanged. A failure here means Milestone 1's prose edits accidentally touched a
fenced word block.

**G — the new guards actually guard.** Run each in its failing direction, then restore. A
guard that passes in both directions is not a guard.

Vim — temporarily restore the old longest-first ordering in
`packages/keiro-vim/syntax/keiro.vim` (swap the `\<\d\+\>` and `\<v\d\+\>` lines) and re-run
`run.sh`. Observed:

```text
FAIL "1.5": want keiroNumber on every character, got (none) at offset 1 (".") — a shorter
rule is claiming part of the literal; see the number matches in syntax/keiro.vim
283 checks, 2 failures
```

Shiki — temporarily swap the two alternatives inside `#numbers` in
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` and re-run `bun test`. Observed:

```text
(fail) fractional decimals get constant.numeric
(fail) a fractional number is one whole token, signed or not
 37 pass
 2 fail
```

Note that the *pre-existing* `fractional decimals get constant.numeric` test also fails on the
Shiki side, and the reason is worth knowing. Shiki's `scopesOf` looks for an explanation entry
whose trimmed content **equals** `1.5`, so a split makes the token simply vanish and the
assertion fails on `not.toBeNull()`. Vim's `locate` searches for `1.5` as a **substring** and
then reads the group at its first character, which is `keiroNumber` either way. Same intent,
two helpers, and only one of them could ever see the defect. That is why the whole-token
helper is added to *both* suites and not only to the one that was broken.


## Idempotence and Recovery

Every step here is safe to repeat.

- The measurement steps (2, 3, 5) are read-only apart from files under `/tmp` and the scratch
  `packages/shiki-keiro/probe.ts`, which is deleted before the suites are run. Re-running them
  costs only time.
- The edits (Milestones 1, 2, 4, 5) are ordinary file edits under version control. `git diff`
  shows the whole change; `git checkout -- <path>` reverts any single file. Nothing in this
  plan runs `git add`, `git commit`, or `git push` — the calling automation owns the commit —
  so recovery never involves rewriting history.
- Milestone 2 is the only behavioural change to a shipped grammar and it is four lines of
  reordering in one file. If the reorder ever regresses another numeric form, reverting
  `packages/keiro-vim/syntax/keiro.vim` alone restores the previous behaviour, and only
  acceptance check A fails.
- `bun install` in `packages/shiki-keiro` is idempotent; the lockfile is committed.
- If the corpus file is edited after the suites are written, re-run both suites: they locate
  tokens by *first occurrence*, so inserting a line that repeats an anchor earlier in the file
  can move an assertion onto the wrong token. That failure mode is loud — the reported group
  is wrong, not missing.


## Interfaces and Dependencies

**Upstream, read-only.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` at
`da0973662301f7cb259481ca7cdeb5b3e5267278` — the authority for every claim in the spec. Its
companions `Keiro/Dsl/Grammar.hs` (the `AggregateField` record this range introduces) and
`Keiro/Dsl/AggregateType.hs` (the semantic pass that rejects a subset of what the parser
accepts) are read for context only.

**In this repository.**

- `spec/keiro-dsl-language-model.md` — the contract. Section 3 must remain a verbatim copy of
  `reservedWords`; the fenced word blocks in Sections 3 and 4 are parsed by both suites, so
  their shape (```` ```text ```` fences, whitespace-separated words, and their *order* within
  the section) must not change.
- `packages/keiro-vim/syntax/keiro.vim` — Vim syntax. Ends with the `keiroNumber` matches
  ordered `\<\d\+\>`, `\<\d\+\a\+\>`, `\<\d\+\.\d\+\>`, `\<v\d\+\>`, all linked to `Number`.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — TextMate grammar. No rule changes
  by this plan; `#numbers` keeps `\b[0-9]+\.[0-9]+\b` ahead of `\b[0-9]+\b` and gains a
  `comment` key saying so, and `#types` keeps all ten spellings.
- `corpus/aggregate-scalar-types.keiro` — new shared sample. Read-only to both packages per
  `corpus/README.md`; each package asserts against it from its own suite.
- `packages/keiro-vim/test/highlight_spec.lua` — gains `expect_uniform(word, group)`, which
  reads the highlight group at every character of `word` and fails if any two differ or if the
  group is not the expected one.
- `packages/shiki-keiro/test/scopes.test.ts` — gains
  `expectWholeToken(code, content, scope)`, which requires a single explanation entry whose
  content is exactly `content` and whose scopes include `scope`.

**Toolchain.** Neovim (headless, `-l` script mode) for the Vim suite; Bun and `shiki` for the
Shiki suite, both already pinned in `packages/shiki-keiro/package.json` and `bun.lock`. No new
dependency is added by this plan.
