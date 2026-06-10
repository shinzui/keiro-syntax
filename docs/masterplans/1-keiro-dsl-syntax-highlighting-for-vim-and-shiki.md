---
id: 1
slug: keiro-dsl-syntax-highlighting-for-vim-and-shiki
title: "keiro-dsl Syntax Highlighting for Vim and Shiki"
kind: master-plan
created_at: 2026-06-10T20:39:35Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
---

# keiro-dsl Syntax Highlighting for Vim and Shiki

This MasterPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Vision & Scope

keiro-dsl is a domain-specific language for defining event-sourced workflows in the
keiro framework (a Haskell event-sourcing and workflow engine). Its source files use the
`.keiro` extension and describe aggregates, processes, contracts, intakes, emitters,
publishers, workqueues, workflows, and operations. The grammar is defined by a
megaparsec parser at `keiro-dsl/src/Keiro/Dsl/Parser.hs` inside the keiro project
(located on this machine at `/Users/shinzui/Keikaku/bokuno/keiro`). Today, `.keiro`
files render as undifferentiated plain text in every editor and in rendered
documentation, which makes them hard to read and review.

After this initiative is complete, a person editing a `.keiro` file in Vim or Neovim
will see keywords, type names, strings, numbers, comments, and operators highlighted
automatically the moment they open the file, with no per-project configuration. Separately,
anyone rendering `.keiro` code blocks through the Shiki syntax highlighter (the library
used by many documentation sites, including the keiro docs) will be able to register a
`keiro` language and get the same semantic coloring in static HTML output. Both
highlighters are driven by one shared, authoritative description of the language so they
agree on exactly which words are keywords, which tokens are types, and how each token is
classified.

This repository (`keiro-syntax`, the directory this MasterPlan lives in) is currently
empty apart from the planning scaffolding. The initiative produces, inside this
repository: a shared language specification and a shared corpus of real `.keiro` sample
files; a self-contained Vim/Neovim plugin under `packages/keiro-vim/`; and a self-contained
npm package under `packages/shiki-keiro/` that ships a TextMate grammar and a Shiki
language registration.

In scope: regex-based / TextMate-grammar-based highlighting that covers the full lexical
surface of keiro-dsl (comments, strings, numbers, the complete reserved-keyword set, the
common contextual keywords, primitive types, declaration-site type names, and operators);
filetype detection for `.keiro`; automated tests for both packages that tokenize the
shared corpus and assert classifications; and READMEs with installation instructions.

Explicitly out of scope: a Tree-sitter grammar for Neovim (a much larger effort requiring
a hand-written grammar and a compiled C parser — noted as a possible future extension in
the Vim plan, not built here); a Language Server or any semantic / type-aware analysis;
auto-indentation logic beyond a `commentstring`; and any change to the keiro project
itself. The highlighters are lexical only — they color tokens by pattern, they do not
parse the grammar.


## Decomposition Strategy

The initiative splits into three child ExecPlans along functional concerns, following the
MasterPlan decomposition principle of grouping by demonstrable behavior rather than by
file.

The two deliverables the user asked for — a Vim/Neovim package and a Shiki package — share
one non-trivial body of knowledge: the exact lexical model of keiro-dsl (which words are
keywords, grouped by role; what the comment, string, and number syntax is; what the
operators are; what the file extension is; and a stable taxonomy of token classes with a
canonical name for each). If each package independently reverse-engineered this from the
parser source, they would drift: one might classify `guard` as a keyword and the other
miss it, or they might disagree on whether `typeid` is a type or a keyword. That drift is
exactly the cross-plan coupling a MasterPlan exists to manage. So the first work stream
extracts that shared knowledge once, into a written specification plus a shared test
corpus, and the two package work streams each consume it.

This yields three plans: (1) **Shared keiro-dsl Language Model and Test Corpus** — the
foundation; (2) **Vim and Neovim Syntax Highlighting Package** — consumes the model; (3)
**Shiki Syntax Highlighting Package** — consumes the model. Plans 2 and 3 have no code in
common (a Vim `syntax/*.vim` file and a TextMate `*.tmLanguage.json` grammar are entirely
different formats with no shared source), so once Plan 1 fixes the taxonomy they proceed
fully in parallel and are independently verifiable: Plan 2's success is observable by
opening a `.keiro` file in Neovim and seeing colors; Plan 3's success is observable by
running a Shiki tokenization test and seeing the expected scopes.

Alternatives considered. **Two plans, no foundation** (fold the language model into each
package): rejected because it guarantees the drift described above and forces each plan to
repeat the same parser research, with no single place to fix a classification error.
**Four plans** (separate "repo scaffolding" from "language model"): rejected as
over-decomposition — scaffolding this small repo is a few files and belongs with the
foundation work. **A code-generation approach** (one source format mechanically compiled to
both a Vim syntax file and a TextMate grammar): rejected as disproportionate — building and
testing a generator is more work than writing two small highlighters, and the two target
formats are different enough that a generator would be leaky. Instead, the shared
specification is a human-and-agent-readable document that both plans translate by hand,
and the shared corpus plus matching test expectations keep them honest.


## Exec-Plan Registry

| # | Title | Path | Hard Deps | Soft Deps | Status |
|---|-------|------|-----------|-----------|--------|
| 1 | Shared keiro-dsl Language Model and Test Corpus | docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md | None | None | Complete |
| 2 | Vim and Neovim Syntax Highlighting Package for keiro-dsl | docs/plans/2-vim-and-neovim-syntax-highlighting-package-for-keiro-dsl.md | EP-1 | None | Complete |
| 3 | Shiki Syntax Highlighting Package for keiro-dsl | docs/plans/3-shiki-syntax-highlighting-package-for-keiro-dsl.md | EP-1 | None | Complete |

Status values: Not Started, In Progress, Complete, Cancelled.
Hard Deps and Soft Deps reference other rows by their # prefix (e.g., EP-1, EP-3).


## Dependency Graph

EP-1 is the root and has no dependencies. It produces two artifacts the other plans need:
the language-model specification at `spec/keiro-dsl-language-model.md` (which fixes the
keyword groupings, the token-class taxonomy, and the canonical TextMate scope name assigned
to each class) and the shared corpus of `.keiro` files under `corpus/`. EP-2 and EP-3 both
hard-depend on EP-1 because each one's central task is to encode the taxonomy from that
specification — without it there is nothing to encode, and any guess would risk
disagreeing with the other package. The dependency is "hard" in the MasterPlan sense
because the later plans' deliverables are meaningless and unverifiable until the shared
classification exists: EP-2 and EP-3 tests both assert that specific corpus tokens receive
specific classes, and those expected classes come from EP-1.

Once EP-1 is Complete, EP-2 and EP-3 can be implemented at the same time in either order or
concurrently — they share no files and no code. There is no path by which EP-2 blocks EP-3
or vice versa. This is the parallel fan-out the decomposition was designed to enable.


## Integration Points

There is exactly one integration point, and it is the reason EP-1 exists: the **token-class
taxonomy and its canonical scope names**.

- Involved plans: EP-1 (defines), EP-2 (consumes), EP-3 (consumes).
- Shared artifact: the file `spec/keiro-dsl-language-model.md`. It enumerates every keiro-dsl
  token class (declaration-introducer keyword, control/section keyword, modifier keyword,
  language constant, primitive type, declaration-site type name, string, number, comment,
  operator, optional derivation-function name), lists exactly which literal words belong to
  each keyword group, and assigns each class a single canonical TextMate scope name of the
  form `<class>.keiro` (for example `keyword.control.keiro`, `support.type.keiro`,
  `string.quoted.double.keiro`, `comment.line.number-sign.keiro`).
- Responsible for defining it: EP-1.
- How later plans consume it: EP-3 (Shiki) uses the canonical scope names verbatim as the
  `name` field on its TextMate grammar patterns — they are the public contract its tests
  assert against. EP-2 (Vim) cannot emit TextMate scopes; instead it defines one Vim syntax
  group per class (for example `keiroKeyword`, `keiroType`, `keiroString`) and links each to
  a standard Vim highlight group (`Keyword`, `Type`, `String`, ...). EP-1's specification
  provides a mapping table with three columns — token class, TextMate scope (for Shiki), and
  Vim highlight group (for Vim) — so both packages classify the identical set of words into
  corresponding buckets. If the taxonomy changes after EP-2 or EP-3 has started, update
  `spec/keiro-dsl-language-model.md` first, record the change in the Decision Log below, then
  cascade it into both packages and their test expectations.

A second, lighter shared artifact is the **corpus** under `corpus/`. Both EP-2 and EP-3 load
the same `.keiro` files as test inputs. EP-1 owns the corpus; EP-2 and EP-3 must not edit the
corpus files (only add their own per-package expectation fixtures that point at them). If a
corpus file must change, EP-1 owns the change and both packages re-validate.


## Progress

Track milestone-level progress across all child plans. Each entry names the child plan
and the milestone. This section provides an at-a-glance view of the entire initiative.

- [x] EP-1: Repository scaffolding in place (root README, .gitignore, `spec/`, `corpus/`, `packages/`).
- [x] EP-1: `spec/keiro-dsl-language-model.md` written — full keyword groups, taxonomy, and scope/highlight-group mapping table.
- [x] EP-1: Shared `.keiro` corpus assembled under `corpus/` with provenance README.
- [x] EP-2: `packages/keiro-vim/` plugin skeleton with `ftdetect`, `ftplugin`, `syntax` files.
- [x] EP-2: `syntax/keiro.vim` implements the full taxonomy; opening a corpus file in Neovim shows correct colors.
- [x] EP-2: Headless Neovim test asserts token classifications on the corpus; README written.
- [x] EP-3: `packages/shiki-keiro/` npm package skeleton (package.json, tsconfig, build).
- [x] EP-3: `syntaxes/keiro.tmLanguage.json` TextMate grammar implements the full taxonomy.
- [x] EP-3: `src/index.ts` exports the Shiki `LanguageRegistration`; bun tokenization tests pass on the corpus (10/10); README written.


## Surprises & Discoveries

Document cross-plan insights, dependency changes, scope adjustments, or unexpected
interactions between child plans. Provide concise evidence.

- EP-1 complete (2026-06-10). The cross-package integration point — the token-class taxonomy
  in `spec/keiro-dsl-language-model.md` Section 6 — is now fixed and ready for EP-2 and EP-3
  to consume. The spec's reserved-keyword list was verified to match the parser's
  `reservedWords` exactly (50 words, `diff` clean), so both packages encode the same set.
- The corpus is assembled at `corpus/` (5 verbatim fixtures + 1 hand-written
  `comments-and-literals.keiro`). EP-2 and EP-3 must treat these as read-only, per
  `corpus/README.md`. The hand-written sampler is the only corpus file containing `#`
  comments — EP-2/EP-3 comment assertions should target it.
- EP-2 and EP-3 are now both unblocked and have no dependency on each other; they may proceed
  in parallel.
- EP-2 complete (2026-06-10): headless-Neovim test passes 10/10 against the corpus. The
  optional `keiroTypeName` declaration-site refinement was implemented.
- EP-3 complete (2026-06-10): `bun test` passes 10/10 and the HTML demo renders. **Cross-plan
  insight worth noting for any future package:** Shiki's `codeToTokensBase` *merges adjacent
  same-color tokens* but preserves per-match boundaries in `token.explanation[]`; assert
  scopes at the `explanation[].content` level, not `token.content`. The Vim package (EP-2) has
  no analogous merge — `synID` samples per character — so the two packages' tests differ in
  mechanism even though they assert the same classification.
- **The integration point held.** Both packages classify the identical literal word sets into
  corresponding buckets (introducer / control / modifier / constant / primitive type) sourced
  from `spec/keiro-dsl-language-model.md` Section 6; no drift occurred. The one corpus-driven
  test adjustment (EP-3 asserting the modifier `prefix` instead of `from`, which is absent from
  `reservation.keiro`) did not touch the shared taxonomy.


## Decision Log

Record every decomposition or coordination decision made while working on the master
plan.

- Decision: Decompose into three plans — one shared foundation (language model + corpus)
  plus two parallel package plans (Vim/Neovim and Shiki).
  Rationale: The two packages share one hard thing — the exact lexical classification of
  keiro-dsl — and share no code. Extracting the classification once prevents the two
  packages from drifting, and keeps each package independently implementable and verifiable.
  Date: 2026-06-10

- Decision: Treat the keiro project's parser (`keiro-dsl/src/Keiro/Dsl/Parser.hs`,
  specifically the `reservedWords` list) as the authoritative source of the hard-keyword
  set, and supplement it with a curated set of contextual ("soft") keywords enumerated in
  the shared spec.
  Rationale: `reservedWords` is the ground truth for words that can never be identifiers, so
  it must be highlighted; but many meaningful words (`process`, `name`, `on`, `via`,
  `dispatch`, `timer`, ...) are parsed contextually and are not in that list, yet readers
  expect them colored. Enumerating the curated supplement in one place keeps both packages
  in agreement.
  Date: 2026-06-10

- Decision: Highlighters are lexical only (regex / TextMate); no Tree-sitter grammar and no
  semantic analysis in this initiative.
  Rationale: Lexical highlighting delivers the user-visible win (colored `.keiro` files in
  Vim/Neovim and Shiki) at a fraction of the cost. Tree-sitter is noted as a future
  extension in the Vim plan.
  Date: 2026-06-10

- Decision: Pin the Shiki package to the Shiki 4.x API (`LanguageRegistration` from
  `@shikijs/types`; `codeToTokensBase(..., { includeExplanation: true })` for scope
  assertions in tests).
  Rationale: The Shiki source on this machine
  (`/Users/shinzui/Keikaku/hub/ui-libraries/shiki-project`) is at version 4.0.2; pinning to
  its documented API avoids guessing at older/newer surface.
  Date: 2026-06-10


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original vision.

**Initiative complete (2026-06-10). All three child plans are Complete and the original
vision is fully met.**

What now exists in this repository, matching the Vision & Scope:

- **Shared foundation (EP-1):** `spec/keiro-dsl-language-model.md` — the authoritative lexical
  model and token-class taxonomy (canonical TextMate scope + Vim group per class), with its
  50-word reserved-keyword list verified byte-exact against the keiro parser's `reservedWords`.
  `corpus/` holds five verbatim upstream fixtures plus a hand-written comment/literal sampler,
  documented in `corpus/README.md` as read-only inputs.
- **Vim/Neovim package (EP-2):** `packages/keiro-vim/` — `ftdetect` + `ftplugin` + `syntax`
  files giving automatic, config-free highlighting of `.keiro` files in both Vim and Neovim,
  with a headless-Neovim test (10/10) and a README. Verified by `bash
  packages/keiro-vim/test/run.sh` (exit 0).
- **Shiki package (EP-3):** `packages/shiki-keiro/` — a TextMate grammar (`source.keiro`) and a
  typed Shiki `LanguageRegistration`, buildable to `dist/`, with bun tokenization tests (10/10)
  and a rendering demo. Verified by `bun test` (exit 0) and `bun run demo`.

**Did the decomposition pay off?** Yes. Extracting the language model once (EP-1) meant EP-2
and EP-3 each *translated* a fixed taxonomy rather than re-deriving it from the parser, and the
shared corpus gave both packages a common ground truth to assert against. No classification
drift between the two packages occurred. EP-2 and EP-3 shared no source and could have run
fully in parallel; here they were done in sequence but independently.

**Gaps / out-of-scope (unchanged from the original scope):** no Tree-sitter grammar, no
language server / semantic analysis, no auto-indentation beyond `commentstring`, and the keiro
project itself was only read, never modified. The optional `entity.name.type.keiro` /
declaration-site type-name refinement was implemented in both packages; the optional
derivation-function scope was not (within spec).

**Lessons:** (1) The single most valuable coordination artifact was Section 6's three-column
mapping table — it made "the same classification, two output formats" mechanical. (2) Test
harnesses must adapt to each highlighter's token granularity (Vim per-character `synID` vs.
Shiki's color-merged tokens with `explanation[]` sub-scopes); the *grammars* were correct, the
*assertions* needed format-specific care.
