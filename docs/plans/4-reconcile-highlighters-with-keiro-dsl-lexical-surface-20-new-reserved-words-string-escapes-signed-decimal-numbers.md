---
id: 4
slug: reconcile-highlighters-with-keiro-dsl-lexical-surface-20-new-reserved-words-string-escapes-signed-decimal-numbers
title: "Reconcile highlighters with keiro-dsl lexical surface (20 new reserved words, string escapes, signed/decimal numbers)"
kind: exec-plan
created_at: 2026-07-15T01:48:06Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Reconcile highlighters with keiro-dsl lexical surface (20 new reserved words, string escapes, signed/decimal numbers)

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

The keiro-dsl parser — the source of truth for the `.keiro` language this repository
highlights — has grown since the shared language model (`spec/keiro-dsl-language-model.md`)
was last reconciled. This plan brings all four highlighting artifacts back into agreement
with the parser's **current** lexical surface so that both editor packages color the new
surface correctly.

The reconciliation is driven by a change in the keiro-dsl repository. The triggering
commit is **`29bd7952fa5201adf789bbb21427b2cffe228d4b`** (`feat(mori): signal keiro-syntax
on keiro-dsl lexical-surface changes`). That commit only adds the mori automation that
notified this repository; the lexical surface it points at is the *accumulated* current
state of `keiro-dsl/src/Keiro/Dsl/Parser.hs`. Because this repository carries no prior sync
marker, this is a **full reconciliation** against that file's `reservedWords`, string,
number, and identifier rules — not an incremental one-commit diff.

Three concrete lexical facts changed since the spec was written (plan 1 verified the spec's
Section 3 matched the parser's `reservedWords` **exactly, 50 words**; the parser now has 70):

1. **Twenty new reserved words.** `reservedWords` grew from 50 to 70. The additions are
   `module`, `layout`, `prefixed`, `collocated`, `snapshot`, `category`, `process`, `router`,
   `dispatch-each`, `resolve`, `read-model`, `dispatch`, `persist`, `patch`, `continueAsNew`,
   `readmodel`, `columns`, `feed`, `scope`, `shape`. (`process` and `dispatch` were already
   highlighted as declaration introducers via the *curated contextual* list in Section 4;
   they are now formally reserved and move to Section 3. `router` and `readmodel` are two new
   top-level node introducers. `read-model` and `dispatch-each` are dashed reserved words.)

2. **String escape sequences.** Strings were "no escapes" when the spec was written. The
   parser's `stringLit` now recognizes a closed escape set — `\"`, `\\`, `\n`, `\t`, `\r` —
   inside double-quoted strings, rejects an unescaped newline, and rejects unknown escapes.
   Highlighters should color the escape sequences distinctly inside strings.

3. **Signed and fractional numbers.** Register initializers accept a signed decimal
   (`signedDecimalText`: `-?[0-9]+`, e.g. `count Int = -1`), and backoff multipliers accept a
   fractional decimal (`decimalText`: `[0-9]+(\.[0-9]+)?`, e.g. `multiplier=1.5`). Duration
   tokens are confirmed to use only the single units `s`, `m`, `h` (`pWindow`), so the
   spec's `30d` example is inaccurate.

After this change, opening a `.keiro` file that uses a `router`, a `readmodel`, an aggregate
`snapshot`, a workflow `patch`/`continueAsNew`, a `module`/`layout` header, a string with a
`\n` escape, or a `-1`/`1.5` numeric literal renders every one of those tokens in its proper
color in both Vim/Neovim and Shiki. The observable proof is the two package test suites,
extended to assert the new tokens, running green.


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] M1 (2026-07-15) — Updated `spec/keiro-dsl-language-model.md`: Section 2
      (strings now have escapes; numbers gain signed/fractional; identifiers gain patch-id
      and module-prefix shapes), Section 3 (reserved list → 70 words verbatim), Section 4
      (dropped `process`/`dispatch`; added contextual + dashed words), Section 6 (added the
      String-escape class; `router`/`readmodel` introducers; new control words; Number row).
- [x] M2 (2026-07-15) — Updated `packages/keiro-vim/syntax/keiro.vim`: new reserved/contextual
      bare words, new dashed matches (`dispatch-each`, `read-model`, …), `keiroStringEscape`
      contained match linked to `SpecialChar`, fractional-decimal number match, and converted
      bare `dispatch` to a `-`-negative-lookahead match so it stops shadowing `dispatch-each`.
- [x] M3 (2026-07-15) — Updated `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` (same
      surface) and rebuilt the tracked `dist/` bundle (`bun run build`).
- [x] M4 (2026-07-15) — Added `corpus/router-readmodel-snapshot.keiro` and documented it in
      `corpus/README.md`.
- [x] M5 (2026-07-15) — Extended both test suites to assert the new tokens.
- [x] M6 (2026-07-15) — Both suites green: Shiki `15 pass / 0 fail`; Vim `18 checks, 0 failures`.
- [x] M7 (2026-07-15) — Wrote `.keiro-dsl-sync-subject`.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **The `reservedWords` delta is purely additive (50 → 70).** All 50 words the spec recorded
  are still present in the parser; the 20 listed in Purpose are new. Cross-checked by reading
  `keiro-dsl/src/Keiro/Dsl/Parser.hs` lines 111–191 against Section 3 of the spec. Plan 1's
  Surprises note recorded the original exact 50-word match.
- **`process` and `dispatch` were already highlighted, just as *contextual* keywords.** They
  now appear in `reservedWords`, so they move from the spec's Section 4 to Section 3. No
  highlighter regex change is required for them (both were already `keyword.declaration`),
  but the classification note must be corrected so the spec's "Section 3 is verbatim
  `reservedWords`" claim stays true.
- **`readmodel` (no dash) and `read-model` (dashed) are two distinct reserved words.**
  `readmodel` introduces the read-model node (`pReadModel`); `read-model` is the dashed word
  used inside a router's `resolve stable via read-model X` clause (`pResolveDecl`). Both are
  reserved; the dashed one needs match-before-bare-words treatment.


## Decision Log

Record every decision made while working on the plan.

- Decision: Reuse the sibling plans' `intention` and `master_plan` frontmatter values rather
  than prompting for new ones.
  Rationale: This plan runs unattended as the `sync-keiro-dsl` mori automation; there is no
  interactive user to supply an Intention ID, and this work is a continuation of the same
  master plan (`docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md`) that
  produced the spec and both packages.
  Date: 2026-07-15

- Decision: Classify the 20 new reserved words as — introducers: `router`, `readmodel`
  (new top-level nodes; `process`/`dispatch` already introducers); everything else as
  control/section keywords: `module`, `layout`, `prefixed`, `collocated`, `snapshot`,
  `category`, `dispatch-each`, `resolve`, `read-model`, `persist`, `patch`, `continueAsNew`,
  `columns`, `feed`, `scope`, `shape`.
  Rationale: Introducers are the words that begin a top-level item or node in `pTopItem`.
  `router` (`pRouter`) and `readmodel` (`pReadModel`) do; the rest are section/clause words
  or placement selectors that occur inside a node. `prefixed`/`collocated` are `layout`
  values but are simplest to color as control keywords alongside `layout` itself.
  Date: 2026-07-15

- Decision: Add a new mandatory token class **String escape** with TextMate scope
  `constant.character.escape.keiro` and Vim group `SpecialChar`, matching `\\["\\ntr]`
  inside strings.
  Rationale: The parser now defines a closed escape set; a highlighter that colors `\n` as
  ordinary string text is no longer faithful to the surface. `SpecialChar` and
  `constant.character.escape` are the conventional groups/scopes for this.
  Date: 2026-07-15

- Decision: For numbers, add a fractional-decimal pattern (`[0-9]+\.[0-9]+`) ahead of the
  plain-integer pattern in both highlighters, and describe signed integers in the spec prose,
  but do **not** attempt to color a leading `-` as part of the number.
  Rationale: `-` is also the transition/arrow operator; a purely lexical highlighter cannot
  reliably tell `-1` (a signed initializer) from `x - 1`. Coloring the digits as a number and
  the `-` as an operator is the correct, non-over-reaching behavior. The fractional pattern is
  safe (a `.` between two digit runs is unambiguous) and prevents `1.5` from splitting into
  `1` `.` `5`.
  Date: 2026-07-15

- Decision: Extend the curated Section 4 contextual set with the structural words of the new
  node families (router/resolve, snapshot, readmodel, workqueue provisioning, intake persist,
  workflow patch), plus the new dashed contextual words `on-ambiguous`, `on-terminal`,
  `state-codec`, `shape-hash`, `full-envelope`, `dedupe-only`, `entire-log`,
  `fifo-throughput`, `fifo-roundrobin`. Leave CamelCase disposition/consistency *values*
  (`AckOk`, `Retry`, `DeadLetter`, `Fired`, `Strong`, `Eventual`) uncolored.
  Rationale: Section 4 is explicitly a curated judgment set, not authoritative. The structural
  words read as keywords and users expect them highlighted; the CamelCase values are
  context-dependent and colored acceptably as plain/type-name identifiers already.
  Date: 2026-07-15


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-07-15): complete and meeting the original purpose.** All four artifacts now
agree with the current `keiro-dsl` lexical surface. `spec/keiro-dsl-language-model.md`
Section 3 lists the parser's 70 reserved words verbatim; Section 2 documents string escapes
and signed/fractional numbers; Section 6 carries a new mandatory **String escape** class and
promotes `router`/`readmodel` to introducers. Both packages implement the surface and prove
it: `packages/shiki-keiro` `bun test` reports `15 pass / 0 fail` (5 new cases: new
introducers, new control words, dashed reserved words, string escape, fractional decimal),
and `packages/keiro-vim` `test/run.sh` reports `18 checks, 0 failures` (8 new checks). The new
shared sample `corpus/router-readmodel-snapshot.keiro` exercises every new construct.

**Lesson — the dashed-keyword collision has teeth when the leading segment is a keyword of a
*different* class.** In Vim, a `syntax keyword` always outranks a `syntax match`, so the
introducer keyword `dispatch` shadowed the dashed control word `dispatch-each` (and
`dispatch-id`), coloring them `Keyword` instead of `Statement`. Existing dashed words were
unaffected because their leading segments were either non-keywords or `on`/`max`/`dead`
(which link to the *same* group). The fix was to demote bare `dispatch` to a
`syntax match /\<dispatch\>-\@!/` (a negative lookahead for `-`), so the dashed match owns the
`dispatch-…` words. Shiki was unaffected because its `dashed-keywords` group is listed before
`introducers`, and earliest/longest match wins there.

**Against scope.** The reconciliation is complete for the mandatory contract (reserved words,
token classes). Section 4's contextual set was extended with the structural words of the new
node families but deliberately omits CamelCase disposition/consistency *values* (`AckOk`,
`Retry`, `Strong`, `Eventual`, …), which remain acceptably colored as plain/type-name
identifiers — an in-spec choice for a purely lexical highlighter.


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master` (commit directly to
it). This repository ships two syntax highlighters for **keiro-dsl**, a small
domain-specific language for event-sourced workflows whose files end in `.keiro`.
Highlighting is **purely lexical**: tokens are colored one-by-one by pattern, with no parse
of the grammar.

The authoritative parser is a Haskell (megaparsec) file **outside** this repository:
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`. Its `reservedWords`
list (lines 111–191), `stringLit` (lines 1421–1442), `pWindow`/`signedDecimalText`/
`decimalText` (lines 1353–1370), and identifier parsers (`ident`, `wireWord`, `patchIdWord`,
`dottedRef`, `pModulePrefix`) define the lexical surface.

The four artifacts this plan keeps in agreement:

- `spec/keiro-dsl-language-model.md` — the cross-package contract. Section 3 is copied
  verbatim from `reservedWords`; Section 6 is the token-class taxonomy both packages
  implement (TextMate scope for Shiki, Vim highlight group for Vim).
- `packages/keiro-vim/syntax/keiro.vim` — the Vim/Neovim syntax file. Uses `syntax keyword`
  for bare words, `syntax match` for dashed words and operators, `syntax region` for strings,
  and `highlight default link` to map its `keiro*` groups to standard groups.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — the TextMate grammar (scope
  `source.keiro`) with a `patterns` list and a `repository` of named sub-patterns. Earlier
  patterns win ties, so longer/dashed patterns precede bare ones.
- `corpus/*.keiro` — shared sample files both test suites tokenize.

Tests:

- Vim: `packages/keiro-vim/test/highlight_spec.lua`, run headless via
  `packages/keiro-vim/test/run.sh` (needs `nvim`). It opens a corpus file, locates a word,
  and asserts `synIDattr(synID(...),'name')` equals the expected `keiro*` group.
- Shiki: `packages/shiki-keiro/test/scopes.test.ts`, run with `bun test` from
  `packages/shiki-keiro/`. It tokenizes via `codeToTokensBase(..., { includeExplanation:
  true })` and asserts a token's `explanation[].scopes[].scopeName` contains the expected
  scope.

Key terms:

- **Reserved word** — a word the parser forbids as a bare identifier; always a keyword.
- **Contextual keyword** — a word that is not reserved but reads as a keyword in practice; a
  curated set is colored as keywords (Section 4).
- **Dashed keyword** — a keyword containing `-` (e.g. `dispatch-each`); because `-` is not a
  keyword character, highlighters must match these *before* bare words or the leading segment
  is mis-colored.
- **Introducer** — a keyword that begins a top-level item or node; scoped
  `keyword.declaration.keiro` / Vim `Keyword`.


## Plan of Work

### Milestone 1 — Spec (`spec/keiro-dsl-language-model.md`)

Update the cross-package contract first; the packages implement it.

- **Section 2 → Strings.** Replace the "no escape sequences" paragraph with: strings are
  double-quoted; a backslash begins one of a closed set of escapes `\"`, `\\`, `\n`, `\t`,
  `\r`; an unescaped newline is invalid; unknown escapes are invalid. Note that highlighters
  color the escape sequence with the String-escape class (Section 6). Cite the parser:
  `stringLit`'s `strChar`/`escapeCode`.
- **Section 2 → Numbers.** Keep the three forms, and add: a plain decimal integer may carry a
  leading `-` sign in a register initializer (`-?[0-9]+`), and a decimal may have a fractional
  part (`[0-9]+(\.[0-9]+)?`, e.g. backoff `multiplier=1.5`). Correct the duration note to say
  units are exactly `s`, `m`, `h` (drop the misleading `30d` example; use `5m`, `2s`, `3h`).
- **Section 2 → Identifiers.** Add that a **patch id** is a wire-word that may also contain
  `:` (`patchIdWord`), and a **module prefix** is dotted PascalCase segments joined by `.`
  (`pModulePrefix`).
- **Section 3 → Reserved keywords.** Replace the 50-word list and the "exactly 50 words" count
  with the current **70**-word list copied verbatim (order-preserving) from `reservedWords`.
- **Section 4 → Curated contextual keywords.** Remove `process` and `dispatch` (now reserved).
  Add the new structural contextual words (see Decision Log) to the bare list and the new
  dashed words to the dashed list.
- **Section 6 → Taxonomy.** Add a **String escape** row (`constant.character.escape.keiro` /
  `SpecialChar`). Add `router` and `readmodel` to the Declaration-introducer members. Add the
  new reserved control words to the Control/section examples. Keep the "50" count language out
  of Section 6.

### Milestone 2 — Vim (`packages/keiro-vim/syntax/keiro.vim`)

- Add the new bare reserved words to the appropriate `syntax keyword` groups: `router`,
  `readmodel` to `keiroKeyword` (introducers); `module layout prefixed collocated snapshot
  category resolve persist patch continueAsNew columns feed scope shape` to `keiroStatement`.
- Add the new dashed reserved/contextual words to `syntax match keiroStatement` lines:
  `dispatch-each`, `read-model`, and the new dashed contextual words.
- Add the new bare contextual words to `keiroStatement`.
- **String escapes:** give the string region `contains=keiroStringEscape` and add
  `syntax match keiroStringEscape /\\["\\ntr]/ contained`, linked to `SpecialChar`.
- **Decimal number:** add `syntax match keiroNumber /\<\d\+\.\d\+\>/` before the plain-integer
  match.

### Milestone 3 — Shiki (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

- Add `router`, `readmodel` to the `introducers` alternation (and to `decl-with-name` where a
  type name follows).
- Add the new reserved/contextual bare words to `control-keywords`.
- Add the new dashed words to `dashed-keywords`.
- **String escapes:** convert `strings` from a bare `begin`/`end` to one with a `patterns`
  array containing `{ "match": "\\\\[\"\\\\ntr]", "name": "constant.character.escape.keiro" }`.
- **Decimal number:** add `{ "match": "\\b[0-9]+\\.[0-9]+\\b", ... }` before the plain-integer
  pattern in `numbers`.

### Milestone 4 — Corpus

Add `corpus/router-readmodel-snapshot.keiro` exercising: `module`/`layout` header, an
aggregate `snapshot` block, a `readmodel` node (`columns`/`feed`/`scope`/`shape`), a `router`
node (`resolve … via read-model …`, `dispatch-each`), a `workflow` with `patch` and
`continueAsNew`, a string containing a `\n` escape, and `-1` / `1.5` numeric literals.

### Milestone 5 — Tests

- Vim `highlight_spec.lua`: open the new corpus file and assert `router`→`keiroKeyword`,
  `snapshot`→`keiroStatement`, `readmodel`→`keiroKeyword`, `patch`→`keiroStatement`, and the
  decimal `1.5`→`keiroNumber`.
- Shiki `scopes.test.ts`: assert `router`→`keyword.declaration.keiro`,
  `snapshot`→`keyword.control.keiro`, the escape `\n`→`constant.character.escape.keiro`, and
  `1.5`→`constant.numeric.keiro`.

### Milestone 6 — Run suites green (see Concrete Steps).

### Milestone 7 — Write `.keiro-dsl-sync-subject` with a Conventional Commits subject.


## Concrete Steps

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax

# Shiki suite
(cd packages/shiki-keiro && bun install && bun test)

# Vim suite
./packages/keiro-vim/test/run.sh
```

Expected Shiki transcript (new assertions added to the existing set):

```text
 N pass
 0 fail
```

Expected Vim transcript tail:

```text
... ok   "router" -> keiroKeyword
M checks, 0 failures
```


## Validation and Acceptance

- Both suites exit 0. The Shiki run reports `0 fail`; the Vim run prints `0 failures` and
  exits 0 (its `run.sh` `cquit 1`s on any failure).
- The new corpus file `corpus/router-readmodel-snapshot.keiro` tokenizes such that: every new
  reserved word carries its keyword class, the `\n` escape carries
  `constant.character.escape.keiro` (Shiki) / `SpecialChar` (Vim), and `1.5` is a number.
- `spec/keiro-dsl-language-model.md` Section 3 lists exactly the 70 words of the parser's
  `reservedWords`, in order.
- `.keiro-dsl-sync-subject` contains a single Conventional Commits subject line naming what
  was highlighted.


## Idempotence and Recovery

All edits are to tracked files and are safe to re-run; `bun install`/`bun test` and the Vim
`run.sh` are repeatable and write only to `dist/`/test scratch. If `nvim` is unavailable the
Vim suite cannot run locally; the calling automation re-runs both suites and owns the commit,
so leaving the tree edited is the correct end state. Do not run `git commit`/`add`/`push` and
do not write `spec/.keiro-dsl-sync`.


## Interfaces and Dependencies

No new runtime dependencies. Shiki dev deps (`shiki`, `tsup`, `typescript`) are already
declared in `packages/shiki-keiro/package.json`; tests run under `bun test`. The Vim suite
needs `nvim` on PATH. The parser at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` is read-only input,
not a dependency of the build. The canonical TextMate scope strings and Vim group names are
those already in `spec/keiro-dsl-language-model.md` Section 6, extended here by the
String-escape class.
