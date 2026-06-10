---
id: 1
slug: shared-keiro-dsl-language-model-and-test-corpus
title: "Shared keiro-dsl Language Model and Test Corpus"
kind: exec-plan
created_at: 2026-06-10T20:39:45Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Shared keiro-dsl Language Model and Test Corpus

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

This repository will eventually hold two syntax-highlighting packages for a small
programming language called **keiro-dsl** — one for the Vim/Neovim text editor and one for
the **Shiki** highlighter library used to render code on documentation websites. keiro-dsl
is a domain-specific language for describing event-sourced workflows; its source files end
in `.keiro`. (You do not need to understand event sourcing to do this plan — you are
describing how the *text* of the language looks, not what it means.)

Both packages need to agree on the same facts: which words are keywords, what a comment
looks like, what a string looks like, what the operators are, and how each kind of token
should be named/classified. If the two packages each worked these out separately they would
drift apart and disagree. So this plan — which must be done first — writes those facts down
once, in two forms a later contributor can consume:

1. A specification file, `spec/keiro-dsl-language-model.md`, that enumerates every keyword,
   operator, and token kind, and gives each token kind a single canonical name.
2. A folder of real example `.keiro` programs, `corpus/`, that both packages will load in
   their automated tests.

After this plan is complete, a person can open `spec/keiro-dsl-language-model.md` and read,
in one place, the complete lexical surface of keiro-dsl and the exact classification table
both packages must implement; and they can list `corpus/` and see a handful of valid
`.keiro` files to test against. There is no runnable program to demonstrate at this stage —
this plan produces reference material — but its correctness is verifiable: every keyword
listed in the spec must match the authoritative keyword list in the keiro parser (a command
to check this is given in Validation), and every file in `corpus/` must be a real `.keiro`
file copied verbatim from the keiro project's test fixtures.


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] Create repository scaffolding: root `README.md`, `.gitignore`, and empty `spec/`,
      `corpus/`, and `packages/` directories.
- [x] Copy the chosen `.keiro` fixtures from the keiro project into `corpus/` and write
      `corpus/README.md` recording their provenance.
- [x] Write `spec/keiro-dsl-language-model.md` Section 1 (overview + file extension).
- [x] Write Section 2 (comments, strings, numbers, identifiers).
- [x] Write Section 3 (the complete reserved-keyword list, copied from the parser).
- [x] Write Section 4 (curated contextual/soft keywords).
- [x] Write Section 5 (operators and punctuation).
- [x] Write Section 6 (the token-class taxonomy table with TextMate scope and Vim group columns).
- [x] Verify the spec's reserved-keyword list against the live parser (see Validation).
- [x] Commit with the required git trailers.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- The parser's `reservedWords` list matches the spec's Section 3 **exactly** (50 words). The
  cross-check `diff /tmp/parser-keywords.txt /tmp/spec-keywords.txt` produced no differences.
  No keyword discrepancy was found. The `reservedWords` list in `Parser.hs` carries inline
  comments referencing "EP-4 / EP-5 / EP-6" (keiro's own internal plan markers for intake,
  pgmq, and workflow/operation keywords); these are unrelated to this repository's plan
  numbers and do not affect the word set.
- The string literal in `Parser.hs` is `char '"' *> many (anySingleBut '"') *> char '"'`,
  i.e. *any* character but `"` (technically including a newline). The spec keeps the practical
  highlighter simplification "a string runs to the next `"` on the same line", which is the
  correct behavior for a lexical regex highlighter and matches how strings are used in the
  corpus.
- A repository-root `.gitignore` already existed (ignoring `.claude/`, `.agents/`, etc.) from
  the planning scaffolding. Rather than overwrite it, the required `node_modules/` / `dist/` /
  `*.tsbuildinfo` / `.DS_Store` entries were appended under a new section.


## Decision Log

Record every decision made while working on the plan.

- Decision: The corpus is assembled by copying real fixtures from the keiro project rather
  than authoring synthetic samples.
  Rationale: Real fixtures exercise every node type and every lexical feature, and copying
  guarantees the corpus stays faithful to the actual language. Provenance is recorded in
  `corpus/README.md`.
  Date: 2026-06-10


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-06-10): complete and matching the original purpose.** The plan set out to
write down, once, the lexical facts both highlighter packages need, in two consumable forms.
Both now exist:

- `spec/keiro-dsl-language-model.md` — six sections covering overview/extension, comments/
  strings/numbers/identifiers, the 50 authoritative reserved keywords, the curated contextual
  keywords (plain and dashed), operators/punctuation, and the token-class taxonomy table
  (Token class → TextMate scope → Vim group) that is the cross-package contract.
- `corpus/` — five real fixtures copied verbatim from the keiro project on 2026-06-10
  (`reservation`, `hospital-surge`, `emit`, `intake`, `workflow-signal-mismatch`) plus the
  hand-written `comments-and-literals.keiro` sampler that supplies the `#` comments and the
  full literal set the upstream fixtures lack. `corpus/README.md` records provenance and the
  read-only rule for consumers.

Also added: root `README.md` describing the repository layout, `packages/.gitkeep`, and the
build-output `.gitignore` entries.

**Verification.** All three acceptance checks pass: every corpus file is non-empty and
`reservation.keiro` is byte-identical to upstream (`diff` clean); the spec's Section 3
reserved-keyword list `diff`s exactly against the parser's `reservedWords` (50 words, no
difference); and the spec answers each self-containment question (extension, comment syntax,
`guard` is a keyword, string scope `string.quoted.double.keiro`, number → Vim `Number`).

**No gaps.** The downstream plans (`docs/plans/2-...` Vim and `docs/plans/3-...` Shiki) can
proceed using only `spec/` and `corpus/`.


## Context and Orientation

You are working inside the git repository `keiro-syntax`, whose root on this machine is
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`. At the start of this plan the repository
contains only planning material: `docs/masterplans/`, `docs/plans/`, a `.claude/` skills
directory, and an `agents/` directory. There is no source code yet. The default git branch
is `master`; commit directly to it (do not create a feature branch).

**keiro-dsl** is defined by a parser written in Haskell inside a *separate* project, the
"keiro" project, located on this machine at `/Users/shinzui/Keikaku/bokuno/keiro`. The two
files that define the language are:

- `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` — the lexer and
  parser (uses the `megaparsec` library). This is the **authoritative source** for which
  words are reserved keywords, what counts as a comment, and what the operators are.
- `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Grammar.hs` — the abstract
  syntax tree types (the shape of the language).

The example `.keiro` programs live at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/`.

This plan does **not** modify the keiro project in any way. It only reads from it.

Two terms you will use:

- A **TextMate scope** is a dotted string like `keyword.control.keiro` that the Shiki
  highlighter (and editors like VS Code) attach to a token to decide its color. By
  convention the last segment is the language id (`keiro`) and the earlier segments name the
  kind of token from a standard vocabulary (`keyword`, `string`, `comment`, `constant`,
  `support.type`, `entity.name.type`, `keyword.operator`, ...). The Vim package cannot use
  these strings, but it will mirror the same classification with its own group names.
- A **Vim highlight group** is a name like `Keyword`, `Type`, `String`, `Comment`, `Number`,
  `Boolean`, `Operator`, `Constant`, `Function`, `PreProc`, `StorageClass` that Vim/Neovim
  uses to color text. These are the standard built-in groups every color scheme styles.

All facts you need about keiro-dsl are embedded below in the Plan of Work so you can write
the spec without re-deriving them — but you must still open the two keiro source files to
confirm them, because this plan's whole value is fidelity to the real language.


## Interfaces and Dependencies

This plan has no software dependencies and produces no executable. It uses only a shell, a
text editor, and read access to the keiro project. The `mori` tool (available on this
machine) can locate the keiro project if its path ever changes: run
`mori registry show shinzui/keiro --full` to print the project's on-disk path.

The artifacts this plan must produce, by full path, and which exist at the end:

- `spec/keiro-dsl-language-model.md` — the canonical language model and taxonomy.
- `corpus/*.keiro` — at least the five files named in the Plan of Work.
- `corpus/README.md` — provenance of the corpus files.
- `README.md` (repository root) — what this repo is.
- `.gitignore` — ignores `node_modules/` and build output for the later packages.

Downstream consumers (do not implement them here, but know they exist): the Vim plan at
`docs/plans/2-vim-and-neovim-syntax-highlighting-package-for-keiro-dsl.md` and the Shiki
plan at `docs/plans/3-shiki-syntax-highlighting-package-for-keiro-dsl.md` both read
`spec/keiro-dsl-language-model.md` and load files from `corpus/`. The taxonomy table in
Section 6 of the spec is the contract between them; keep its three columns (token class,
TextMate scope, Vim highlight group) exactly as specified below so the two packages classify
the same words into corresponding buckets.


## Plan of Work

The work is one milestone: produce the scaffolding, the corpus, and the spec. It is small
enough not to need sub-milestones, but do it in the order below so the spec can cite the
corpus files it describes.

### Step A — Repository scaffolding

Create these directories and files. Use full repository-relative paths from the repo root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`.

Create `README.md` at the repository root with a short description: that `keiro-syntax`
provides syntax highlighting for the keiro-dsl language (`.keiro` files); that it contains a
shared language model under `spec/`, a shared test corpus under `corpus/`, a Vim/Neovim
plugin under `packages/keiro-vim/`, and a Shiki package under `packages/shiki-keiro/`; and a
one-line pointer that the packages are documented by the plans under `docs/plans/`.

Create `.gitignore` at the repository root containing at least:

```text
node_modules/
dist/
*.tsbuildinfo
.DS_Store
```

Create the empty directories `spec/`, `corpus/`, and `packages/` (a directory is created in
git by adding a file to it; the files below will populate `spec/` and `corpus/`, and
`packages/` will be populated by the later plans — for now add `packages/.gitkeep` so the
directory exists).

### Step B — Assemble the shared corpus

Copy the following five fixture files verbatim from the keiro project into `corpus/`,
keeping their names. These five together exercise every lexical feature (comments are absent
from fixtures, so you will add one comment-bearing file — see below):

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
SRC=/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures
cp "$SRC/reservation.keiro"               corpus/reservation.keiro
cp "$SRC/hospital-surge.keiro"            corpus/hospital-surge.keiro
cp "$SRC/emit.keiro"                      corpus/emit.keiro
cp "$SRC/intake.keiro"                    corpus/intake.keiro
cp "$SRC/workflow-signal-mismatch.keiro"  corpus/workflow-signal-mismatch.keiro
```

If any source file is missing (the keiro project may have moved or renamed fixtures), list
the available fixtures with `ls /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures`
and pick replacements that, between them, contain at least one `aggregate`, one `process`
with a `timer`, one `contract` + `emit` + `publisher`, one `intake`, and one `workflow` +
`operation`. Record any substitution in this plan's Decision Log.

None of the real fixtures contain a `#` comment, but comments are a real lexical feature
(`#` to end of line — confirmed in `Parser.hs`). So additionally create a small hand-written
file `corpus/comments-and-literals.keiro` that exercises comments and every literal form, so
both packages have something to assert comment/number/string highlighting against. Use
exactly this content:

```text
# keiro-dsl lexical sampler — comments, strings, numbers, durations, versions
context demo-context                 # line comment after code

id  OrderId  prefix=ord              # wire-word prefix

enum Color { Red=red Green=green Blue=blue }

aggregate Sample
  regs
    count   Int    = 0
    label   Text   = placeholder
  states Draft Open! Closed!

  command Touch { count label }
  event   Touched v2 { count label }

  wire kind=ctorName fields=camelCase schemaVersion=1

contract demo {
  schemaVersion 1
  discriminator messageType
  topic ev "demo.events"
  event Pinged on ev {
    at: text
    n: int
  }
}
```

Then write `corpus/README.md` explaining: that the `.keiro` files in this directory are the
shared test corpus consumed by both packages; that the five `reservation`/`hospital-surge`/
`emit`/`intake`/`workflow-signal-mismatch` files were copied verbatim from
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/` (give the date); that
`comments-and-literals.keiro` was hand-written for this repo to exercise comments and
literals (which the upstream fixtures omit); and that consumers (the Vim and Shiki packages)
must treat these files as read-only inputs and must not edit them.

### Step C — Write the language-model specification

Create `spec/keiro-dsl-language-model.md`. It must be self-contained: a contributor reading
only it can build a highlighter. Use the following content as the substance — all of it is
confirmed against `Parser.hs`. Write it as the six sections below. (You may copy the prose
and tables here directly into the spec; they are written to be the spec's content.)

**Section 1 — Overview and file extension.** State that keiro-dsl is a DSL for event-sourced
workflows in the keiro framework; that source files use the extension **`.keiro`**; that the
language is free-form (whitespace and newlines are not significant beyond separating tokens —
structure comes from keywords, not indentation); and that highlighting is purely lexical
(token-by-token by pattern), not a parse of the grammar. Name the authoritative source:
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`.

**Section 2 — Comments, strings, numbers, identifiers.** Record these facts (all from
`Parser.hs`):

- **Comments**: a `#` character begins a comment that runs to the end of the line. There are
  no block comments. (Parser: the space consumer is `L.space space1 (L.skipLineComment "#")
  empty`.) Comments may appear at end of a line after code, or on their own line.
- **Strings**: double-quoted, `"..."`. There are **no escape sequences** — a string is a
  run of characters between two double quotes, and a backslash is an ordinary character. A
  string does not span lines.
- **Numbers**: three numeric forms.
  - plain decimal integers, matching `[0-9]+` (e.g. `0`, `1`, `10`, `2024`);
  - schema/event **version** tokens, a literal `v` immediately followed by digits, matching
    `v[0-9]+` (e.g. `v2`, `v3`) — these appear after an event name, as in `event Touched v2`;
  - **duration** tokens, digits immediately followed by unit letters, matching `[0-9]+[a-z]+`
    (e.g. `5m`, `2s`, `30d`) — these appear in timer windows like `fireAt input.observedAt +
    5m` and retry delays like `retry 5s`.
- **Identifiers**: two shapes.
  - "plain" identifiers — a letter or `_` followed by letters, digits, or `_`, matching
    `[A-Za-z_][A-Za-z0-9_]*`. Type names, register names, command/event/state names, and enum
    constructors all use this shape. A plain identifier that equals a reserved keyword (see
    Section 3) is treated as that keyword.
  - "wire words" — used for the context name, id prefixes, enum wire spellings, and
    status-map values; these may contain dashes, matching `[A-Za-z0-9][A-Za-z0-9_-]*` (e.g.
    `hospital-capacity`, `partial-divert`, `rsv`).
  - dotted references like `input.hospitalId` or `timer.id` — a plain identifier with one or
    more `.name` parts.

**Section 3 — Reserved keywords (authoritative).** State that these are the words the parser
forbids as bare identifiers (the `reservedWords` list in `Parser.hs`), so they are *always*
keywords. Copy the list verbatim — it must match the parser exactly:

```text
context   id        enum      rule      ex        aggregate regs      states
command   event     wire      projection guard    write     emit      goto
fields    status-map true     false     deprecated upcast   from      HOLE
intake    contract  topic     accept    bind      dedupe    decode    disposition
publisher map       workqueue queue     payload   retry     fanout    dedup
enqueue   seenIn    workflow  operation consistency body     step      await
sleep     child
```

(That is 50 words. If the parser's `reservedWords` has changed, use the parser's list and
note the difference in this plan's Surprises & Discoveries.)

**Section 4 — Curated contextual keywords.** State that the parser also recognizes many words
*in context* that are not in `reservedWords` (they could legally be identifiers, but in
practice they read as keywords and users expect them highlighted). List this curated set,
which both packages will highlight as keywords:

```text
process      name        input       output      in          out
correlate    via         saga        stream      target      projections
on           advance     dispatch    schedule    timer       fire
fireAt       source      key         value       run         signal
query        project     result      ordering    backoff     outboxId
messageId    idempotencyKey          discriminator           schemaVersion
derive       of          after       schemaVersion           required
stable       strategy    policy      prefix      kind        logical
physical     dlq         table       maxRetries  maxAttempts delay
readModel    field       to          envelope    cross-check
```

Also list the small set of **node/section words written with dashes** that appear in process
timers and dispositions and should be colored as keywords: `dispatch-id`, `fired-event-id`,
`on-appended`, `on-duplicate`, `on-failed`, `on-ok`, `on-reject`, `on-error`, `not-mine`,
`unknown-status`, `max-attempts`, `dead-letter`, `kafka-key`, `kafka-cursor`, `on-blocked`.
Note for implementers: because these contain dashes, a highlighter must match them *before*
matching bare keywords/identifiers, or the leading segment (`on`, `max`, ...) will be matched
first.

**Section 5 — Operators and punctuation.** List the operators and punctuation, longest-match
first (a highlighter must try the longer ones before the shorter ones, e.g. `-->` before
`->` before `-`):

```text
-->   --   ->   :=   =>   ==   !=   <=   >=   <>   &&   ||   <   >   +   =   @   !   :   ;   .   ,
```

Note their roles briefly: `-->`/`--` form aggregate transitions (`State -- Command -->`);
`->` is the result/transition arrow; `:=` is register assignment (`write x := y`); `=>` is
the map/case arrow (status maps, rule cases, dispositions); `==`/`!=`/`<`/`>`/`<=`/`>=` are
comparisons in guard expressions; `&&`/`||` are boolean operators in guards; `<>` is string
concatenation in id expressions; `+` adds a duration to a time; `=` is assignment in
`prefix=...`, `kind=...`, register initializers, and enum constructors; `@` is the
aggregate-reference separator (`Hospital@input.hospitalId`); `!` marks a terminal state
(`Expired!`); `:` separates a field from its type; `;` separates clauses; `.` is the dotted
reference separator; `,` separates list items.

**Section 6 — Token-class taxonomy (the cross-package contract).** This is the table both
packages implement. Present it exactly as below. The "Token class" is the conceptual bucket;
"TextMate scope" is the string the Shiki package uses as the pattern `name`; "Vim group" is
the standard highlight group the Vim package links its `keiro*` syntax group to.

| Token class | Members / pattern | TextMate scope | Vim group |
|---|---|---|---|
| Declaration introducer | the subset of reserved + contextual words that begin a top-level item or node: `context`, `id`, `enum`, `rule`, `aggregate`, `process`, `contract`, `intake`, `emit`, `publisher`, `workqueue`, `dispatch`, `workflow`, `operation` | `keyword.declaration.keiro` | `Keyword` |
| Control / section keyword | all other reserved keywords (Section 3) **and** all curated contextual keywords (Section 4), e.g. `regs`, `states`, `command`, `event`, `guard`, `write`, `goto`, `on`, `advance`, `schedule`, `timer`, `bind`, `accept`, `map`, `step`, `await`, ... | `keyword.control.keiro` | `Statement` |
| Modifier | `deprecated`, `upcast`, `from`, `consistency`, `required`, `stable`, `strategy`, `via`, `policy`, `prefix`, `kind` | `storage.modifier.keiro` | `StorageClass` |
| Language constant | `true`, `false`, `HOLE`, `placeholder`, `skip`, `hole` | `constant.language.keiro` (give `true`/`false` the more specific `constant.language.boolean.keiro`) | `Boolean` for `true`/`false`, else `Constant` |
| Primitive type | `Bool`, `Int`, `Text`, `Time`, `Id`, `Maybe`, `typeid`, `text`, `int` | `support.type.keiro` | `Type` |
| Declaration-site type name | a CamelCase plain identifier appearing immediately after a declaration introducer that names a type (`enum X`, `aggregate X`, `contract X`, `command X`, `event X`, `id X`, `workflow X`, `operation X`, `process X`) | `entity.name.type.keiro` | `Type` |
| String | `"..."` (Section 2) | `string.quoted.double.keiro` | `String` |
| Number | integer, `v[0-9]+`, and `[0-9]+[a-z]+` duration (Section 2) | `constant.numeric.keiro` | `Number` |
| Comment | `#` to end of line (Section 2) | `comment.line.number-sign.keiro` | `Comment` |
| Operator | the symbols in Section 5 | `keyword.operator.keiro` | `Operator` |
| Derivation function (optional) | a plain identifier appearing right after `via` or `derive` (e.g. `idText`, `uuidv5`, `reservationStream`) | `entity.name.function.keiro` | `Function` |

State explicitly at the bottom of Section 6: the "Declaration-site type name" and
"Derivation function" classes are *optional refinements* — a package that does not implement
them is still correct, it just colors those identifiers as plain text. Every other class is
mandatory. Both packages must classify the identical literal words into the keyword classes
(introducer / control / modifier / constant / primitive type) so they agree.


## Concrete Steps

Run everything from the repository root `/Users/shinzui/Keikaku/bokuno/keiro-syntax`.

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax

# Step A — scaffolding (create files with your editor, then:)
mkdir -p spec corpus packages
touch packages/.gitkeep

# Step B — corpus
SRC=/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures
cp "$SRC/reservation.keiro"              corpus/reservation.keiro
cp "$SRC/hospital-surge.keiro"           corpus/hospital-surge.keiro
cp "$SRC/emit.keiro"                     corpus/emit.keiro
cp "$SRC/intake.keiro"                   corpus/intake.keiro
cp "$SRC/workflow-signal-mismatch.keiro" corpus/workflow-signal-mismatch.keiro
# then hand-write corpus/comments-and-literals.keiro and corpus/README.md

# Step C — write spec/keiro-dsl-language-model.md per Plan of Work Section 1-6
```

A successful corpus copy looks like:

```text
$ ls corpus
README.md                      emit.keiro            intake.keiro
comments-and-literals.keiro    hospital-surge.keiro  reservation.keiro
workflow-signal-mismatch.keiro
```


## Validation and Acceptance

This plan produces reference material, so acceptance is "the facts are correct and complete",
verified three ways.

1. **The corpus files are real and non-empty.** Run `wc -l corpus/*.keiro`; every file should
   have content, and `corpus/reservation.keiro` must be byte-identical to the upstream
   fixture. Verify with:

   ```bash
   diff /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/reservation.keiro \
        corpus/reservation.keiro && echo "reservation.keiro matches upstream"
   ```

   Expected output: `reservation.keiro matches upstream` (and no diff lines).

2. **The reserved-keyword list in the spec matches the parser.** Extract the parser's
   `reservedWords` and compare against what you wrote. Run:

   ```bash
   sed -n '/^reservedWords ::/,/^    ]/p' \
     /Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs \
     | grep -oE '"[^"]+"' | tr -d '"' | sort > /tmp/parser-keywords.txt
   wc -l /tmp/parser-keywords.txt   # expect 50
   ```

   Then confirm every word in `/tmp/parser-keywords.txt` appears in Section 3 of your spec.
   If the count is not 50 or a word is missing from your spec, fix the spec and record the
   discrepancy in Surprises & Discoveries.

3. **The spec is self-contained.** Re-read `spec/keiro-dsl-language-model.md` start to finish
   as if you knew nothing about keiro-dsl. You must be able to answer, from the spec alone:
   what extension do files use; what does a comment look like; is `guard` a keyword; what
   TextMate scope does a string get; what Vim group does a number link to. If any answer is
   not in the spec, add it.

There is nothing to run for the user to "see it work" at this stage; the observable outcome
is the next two plans being able to proceed using only `spec/` and `corpus/`.


## Idempotence and Recovery

Every step is safe to repeat. The `cp` commands overwrite the corpus copies with identical
bytes. Re-running `mkdir -p` and `touch` is harmless. If you need to start the corpus over,
delete `corpus/*.keiro` and re-run Step B. Nothing in this plan is destructive to the keiro
project (it is only read).


## Commit

Commit on `master` with a Conventional Commits message and both required trailers:

```text
feat(spec): add shared keiro-dsl language model and test corpus

Add spec/keiro-dsl-language-model.md enumerating keiro-dsl's keywords,
operators, literals, and the token-class taxonomy shared by the Vim and
Shiki packages. Add a corpus of real .keiro fixtures plus a literal/comment
sampler under corpus/.

MasterPlan: docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md
ExecPlan: docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md
Intention: intention_01ktqdn85xe2btqzr2zghxgrpr
```
