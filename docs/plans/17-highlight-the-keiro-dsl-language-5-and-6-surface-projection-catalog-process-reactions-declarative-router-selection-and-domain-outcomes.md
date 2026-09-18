---
id: 17
slug: highlight-the-keiro-dsl-language-5-and-6-surface-projection-catalog-process-reactions-declarative-router-selection-and-domain-outcomes
title: "Highlight the keiro-dsl Language 5 and 6 surface: projection catalog, process reactions, declarative router selection, and domain outcomes"
kind: exec-plan
created_at: 2026-09-18T18:33:43Z
provenance:
  created_by:
    model: "claude-opus-5"
    harness: "claude-code"
    at: 2026-09-18T18:33:43Z
---

# Highlight the keiro-dsl Language 5 and 6 surface: projection catalog, process reactions, declarative router selection, and domain outcomes

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.
If durable project context changes, update or create ADRs in docs/adr/ in the same change.


## Purpose / Big Picture

This repository ships two syntax highlighters for the `.keiro` language — a Vim/Neovim syntax
file at `packages/keiro-vim/syntax/keiro.vim` and a TextMate grammar for the Shiki highlighter at
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. ("TextMate grammar" means a JSON file of
regular expressions that assigns each matched piece of text a dotted *scope name* such as
`keyword.control.keiro`; editors and Shiki colour text by scope name.) Both are driven by one
written contract, `spec/keiro-dsl-language-model.md`, which this repository keeps in step with
the upstream parser for the language, keiro-dsl, in the separate `keiro` repository (canonical
project URI `mori://shinzui/keiro`).

This plan reconciles this repository with keiro-dsl commit
`9fb54d56db4f2aedb2dd1cf9aa2016b93ff7c822` (short form `9fb54d56`), the head of the 455-commit
range `d7be0fe6bee7a4745c872908acabcf1b144952a6..9fb54d56db4f2aedb2dd1cf9aa2016b93ff7c822`, which
upstream released as keiro-dsl 0.17.0.0. The triggering commit itself only upgrades a test
dependency, but the range beneath it adds two language versions and the largest new vocabulary
since the mapped type declaration: **63 new words (39 bare, 24 dashed), none of them reserved**.
Before this plan a `.keiro` file written against version 5 or 6 showed most of its structure as
plain text — `projection-owner`, `freshness`, `reactions`, `when`, `otherwise`, `declarative`,
`recipient`, `domain-outcomes`, and the rest were uncoloured, and some dashed ones were worse
than uncoloured: in Vim, `projection-owner` and `schema-version` coloured only their leading
segment (`projection`, `schema`) and left the tail plain.

After this plan, opening either new corpus sample in Neovim with the plugin on the runtime path,
or rendering it with Shiki, shows every one of those words as a keyword: the four dashed
projection-catalog declarations in the introducer colour, `once`/`silent`/`declarative` in the
modifier colour, `bool` as a type, and everything else in the control-keyword colour, each dashed
word coloured across its whole spelling. Both test suites prove it by name.


## Progress

- [x] (2026-09-18 18:20Z) Read the parser diff for the range; confirmed `reservedWords` is
  unchanged (72 words, Section 3 still matches verbatim) and catalogued every new
  `keyword "…"` / `symbol "…"` literal.
- [x] (2026-09-18 18:30Z) Classified the 63 new words and computed the seven new prefix
  collisions.
- [x] (2026-09-18 18:40Z) Milestone 1: added `corpus/language-version-5-projection-catalog.keiro`
  and `corpus/language-version-6-reactions-and-selection.keiro`; both pass `keiro-dsl check` at
  0.17.0.0 (the second with warnings only).
- [x] (2026-09-18 18:45Z) Milestone 2: `packages/keiro-vim/syntax/keiro.vim` and
  `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` updated; both suites still green against
  the old spec.
- [x] (2026-09-18 18:50Z) Milestone 3: `spec/keiro-dsl-language-model.md` Sections 1, 4, and 6
  updated; the grid guards then failed only on the two word counts, as expected.
- [x] (2026-09-18 18:55Z) Milestone 4: counts bumped (100→139 bare, 32→56 dashed) and hand-named
  assertions added over both new corpus files in both suites; `corpus/README.md` records the
  files. Shiki `92 pass / 0 fail`; Vim `585 checks, 0 failures`.


## Surprises & Discoveries

- Observation: `reservedWords` did not move even though `Keiro/Dsl/Parser/Core.hs` changed blob
  (`2698f132` → `450009ef`). The file's edits are record-field renames (`contextualFailureCode` →
  `code`, …) and a `match`-based rewrite of `withOwnedSpan`.
  Evidence: the extraction script in Concrete Steps printed `72 True`.

- Observation: every new word was caught by the existing word-list guards the moment it was added
  to Section 4, with no hand-written assertion needed — adding the spec grid produced exactly two
  failures in each suite, the count assertions.
  Evidence: `FAIL bare contextual-keyword count: want 100, got 139`,
  `FAIL dashed contextual-keyword count: want 32, got 56`, `488 checks, 2 failures`.

- Observation: this range more than doubles the set of Vim prefix collisions. Seven bare words
  now head a dashed word — `projection`, `schema`, `result`, `provisioner`, `validator`,
  `replay` (heading the long-standing `replay-only`), and `from` — and `from` is the first
  **Modifier** to need the `-\@!` guard, so it moved out of the `keiroModifier` keyword line into
  `syntax match keiroModifier /\<from\>-\@!/`.

- Observation: `all` was, until this range, explicitly listed in the spec as collection
  vocabulary that must *not* be highlighted (the parser matches it only to reject it inside an
  expression). The projection catalog's `source = all` made it a real word, so it joined the
  grid and the spec note was rewritten.

- Observation: the router selection "policy" values (`target-stream`, `stable-union`,
  `retain-successes`) are not parser literals: `pSelectionPolicyName` reads identifiers joined by
  `-`, and `Keiro/Dsl/RouterSelection.hs` checks them later. They render segment by segment like
  any dashed wire word.


## Decision Log

- Decision: Classify the four dashed catalog words (`rebuild-group`, `projection-revision`,
  `external-read`, `projection-owner`) as Declaration introducers, and leave the fifth catalog
  declaration, `target`, as a Control keyword.
  Rationale: the four begin top-level items and nothing else. `target` has been a Control keyword
  since plan 4 as a process/router clause word and remains far commoner in that role; a lexical
  highlighter cannot tell the two uses apart, and promoting it would recolour every process and
  router.
  Date: 2026-09-18

- Decision: `once`, `silent`, and `declarative` are Modifiers; `bool` is a Primitive type; every
  other new word — including enumerated clause values such as `clear`, `immediate`,
  `from-beginning`, `fifo-heads`, `delegated`, `accepted`, `no-op`, `ack` — is a Control keyword.
  Rationale: `once` qualifies `schedule` as `optional` qualifies a wire field; `silent` qualifies
  `no-action`; `declarative` selects a `resolve` form exactly as the existing Modifier `stable`
  does. Lowercase enumerated values follow the precedent of `inline`, `reject`, `ignore`,
  `standard`, `strict`, and `halt`.
  Date: 2026-09-18

- Decision: Colour `subscription` now, although it predates this range as a legacy readmodel
  value and clause label.
  Rationale: plan 8 listed it among pre-existing gaps left alone because they were outside that
  range. This range makes it both the `delivery = subscription` value of a `projection-owner` and
  that node's `subscription = "…"` clause label — new surface — and leaving it plain beside a
  coloured `inline` in the same slot would look like a bug.
  Date: 2026-09-18

- Decision: Do not colour the camel-case `deadLetter` / `ackOk` values or the router selection
  policy values.
  Rationale: camel-case disposition values were deliberately left uncoloured in plan 4, and the
  selection policies are identifiers validated semantically, not parser literals.
  Date: 2026-09-18

- Decision: Hand-write two corpus files rather than copy upstream fixtures verbatim, and put their
  comment banners at the end.
  Rationale: the surface is spread over a dozen upstream fixtures (`projection-catalog.keiro`,
  `domain-command-outcomes.keiro`, `process-timers.keiro`, `structural-nominal-leaves.keiro`,
  `intake-delegated.keiro`, `workqueue-fifo-heads.keiro`, …) and none holds more than a slice.
  Both suites anchor on the first occurrence of a literal, so a banner naming the new words at the
  top would shadow the code. Both files were run through `keiro-dsl check` so they are legal
  samples, not merely parseable ones.
  Date: 2026-09-18


## Outcomes & Retrospective

**Outcome (2026-09-18): complete.** All four artifacts agree with the keiro-dsl 0.17.0.0 lexical
surface. `spec/keiro-dsl-language-model.md` Section 3 is unchanged (72 reserved words, verified
mechanically); Section 4's bare grid grew from 100 to 139 words and its dashed list from 32 to 56,
with a new subsection "The Language 5 and 6 surface" and an updated prefix-collision list;
Section 1 records versions 5 (stable) and 6 (candidate); Section 6 gains the four dashed
introducers, three Modifiers, and `bool`. Both packages implement it: `bun test` reports
`92 pass / 0 fail` (11 new tests) and `test/run.sh` reports `585 checks, 0 failures`.

Lesson: the word-list guards added in plan 8 did the heavy lifting — every new word, including
all seven new prefix collisions, was proven whole-token by the grid probes before any
hand-written assertion existed. The hand-written assertions add what the guards deliberately do
not check: the *class* each word takes, in real code.

No `docs/adr/` directory exists in this repository and nothing here changes a project-level
decision beyond what the spec already records, so no ADR was created.


## Context and Orientation

The repository root is `/Users/shinzui/Keikaku/bokuno/keiro-syntax`. Four artifacts must agree.

`spec/keiro-dsl-language-model.md` is the cross-package contract. Section 3 is a verbatim copy of
the upstream parser's `reservedWords` list. Section 4 holds the *curated contextual keywords* —
words the parser recognises in context without reserving — as two fenced `text` grids, a bare one
and a dashed one, followed by prose subsections per construct. Section 6 is the token-class table
mapping each word to a TextMate scope and a Vim highlight group. Both test suites read Section 3
and Section 4's first two `text` blocks and assert that every word is claimed, whole, by some
keyword scope or group; they also assert the exact word counts.

`packages/keiro-vim/syntax/keiro.vim` is the Vim syntax file. Two Vim facts matter. A
`syntax keyword` outranks a `syntax match` that begins at the same column, so a bare keyword that
is a *prefix* of a dashed keyword (e.g. `projection` of `projection-owner`) must be written as
`syntax match … /\<word\>-\@!/` ("the word, not followed by `-`") or it claims the head of the
dashed word. Among several `syntax match` items starting at the same column, the one defined
last wins.

`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` is the TextMate grammar. Its top-level
`patterns` list is tried in order at each position, so dashed rules (`#dashed-introducers`,
`#dashed-keywords`, `#dashed-modifiers`) are listed before the bare-word rules and win ties.

`corpus/` holds shared `.keiro` samples both suites open; `corpus/README.md` records their
provenance. The tests are `packages/keiro-vim/test/highlight_spec.lua` (run via
`packages/keiro-vim/test/run.sh`, headless Neovim) and `packages/shiki-keiro/test/scopes.test.ts`
(run with `bun test`).

Upstream, the parser lives in the `keiro` repository under `keiro-dsl/src/Keiro/Dsl/Parser.hs`
and `keiro-dsl/src/Keiro/Dsl/Parser/`. The range's lexically relevant changes are: the new module
`Parser/ProjectionCatalog.hs` (the five catalog declarations and the external read);
`Parser/ReadModel.hs` (`freshness`, `wait-for-head`, `immediate`, `query input`/`query result`,
`group`/`targets`/`backing`); `Parser/Aggregate.hs` (`domain-outcomes rejection=… no-op=…` and the
contextual `outcome accepted|rejected|no-op` clause); `Parser/Coordination.hs` (process
`reactions version N`, `on`/`when`/`otherwise` arms, `advance … accepted … silent no-action`,
`schedule … once`, `cancel`, `no-action`, `timers max-attempts … dead-letter …`, and the router's
typed `input X : T` with `resolve declarative { identity version query with where recipient order
dedupe max-recipients empty failure redelivery partial }`, whose dispositions are
`ack|retry|deadLetter|halt`); `Parser/Integration.hs` (`idempotence table|delegated`, a declared
id as a contract field type); `Parser/Queue.hs` (`ordering fifo-heads`, typed `:` payload fields,
lowercase `text|int|bool`); and `Parser/Mapped.hs` (`Map[Key] Value`). The version registry in
`Keiro/Dsl/LanguageVersion.hs` now has six entries; version 5 is `Stable` and version 6 is
`Candidate`. The remaining parser edits in the range are record-field renames with no lexical
effect.

No ADRs exist in this repository (`docs/adr/` is absent), and no cross-repository ADR bears on
highlighting.


## Plan of Work

Milestone 1 adds the corpus. Create `corpus/language-version-5-projection-catalog.keiro`
(opening `language keiro-dsl 5`) containing three `target`s (one with `depends-on`), two
`rebuild-group`s, a `projection-revision` with `promotion index`, `promotion constraint`, and
`promotion owned-sequence`, an inline and a subscription `projection-owner` (the latter with
`source = all`, `checkpoint-on-missing = from-current-head`, and `replay = live-only "…"`), two
`readmodel`s using `query input`/`query result`, `freshness = immediate`,
`freshness = wait-for-head entire-log`, and `backing`, an `external-read`, a workqueue with typed
`:` payload fields and a `bool` field, and an aggregate with `domain-outcomes` and all three
`outcome` clauses. Create `corpus/language-version-6-reactions-and-selection.keiro` (opening
`language keiro-dsl 6`) containing a reactions-style `process` with `when`/`otherwise`,
`accepted`/`silent no-action`, `schedule … once`, `cancel`, `no-action`, `timers`, and two
`timer` blocks; a router with typed input and `resolve declarative { … }`; an intake with
`idempotence delegated`; a workqueue with `ordering fifo-heads`; a `Map[TemplateId] Text` wire
field; a contract field typed with a declared id; plus the aggregates, catalog, and readmodel
those refer to. Put each file's comment banner at the end. Acceptance: `keiro-dsl check` prints
`OK` for both.

Milestone 2 updates the highlighters. In `keiro.vim`: add `bool` to `keiroType`; add a
`syntax match keiroKeyword` for the four dashed introducers; drop `from` from the
`keiroModifier` keyword line and add `syntax keyword keiroModifier once silent declarative` and
`syntax match keiroModifier /\<from\>-\@!/`; remove `projection`, `result`, and `schema` from
their `keiroStatement` keyword lines; add the other 36 new bare words as `keiroStatement`
keywords; add the 20 dashed Control words as `keiroStatement` matches; and add `-\@!`-guarded
`keiroStatement` matches for `projection`, `schema`, `result`, `provisioner`, `validator`, and
`replay`. In `keiro.tmLanguage.json`: add a `#dashed-introducers` repository rule (scope
`keyword.declaration.keiro`) included before `#dashed-keywords`; append the 20 dashed Control
words to `#dashed-keywords`; append `once|silent|declarative` to `#modifiers`, `bool` to
`#types`, and the 36 bare Control words to `#control-keywords`. Acceptance: both suites still
pass unchanged.

Milestone 3 updates the spec. Section 1 gains a paragraph on versions 5 and 6; Section 4's bare
grid gains 39 words and its dashed list 24, the implementer note lists all twelve prefix
collisions, the collection-vocabulary bullet is corrected for `all`, and a new subsection "The
Language 5 and 6 surface" documents the constructs and their classification; Section 6's
introducer, Control, Modifier, and Primitive-type rows are extended. Acceptance: each suite fails
only on its word-count assertion.

Milestone 4 updates the tests and README: bump the counts to 139 and 56 in both suites, add
hand-named class assertions over both new corpus files, and record the files in
`corpus/README.md`. Acceptance: both suites green.


## Concrete Steps

From the repository root, confirm the corpus samples are legal sources:

```bash
KD=/Users/shinzui/Keikaku/bokuno/keiro/dist-newstyle/build/aarch64-osx/ghc-9.12.4/keiro-dsl-0.17.0.0/x/keiro-dsl/build/keiro-dsl/keiro-dsl
$KD check corpus/language-version-5-projection-catalog.keiro
$KD check corpus/language-version-6-reactions-and-selection.keiro
```

Expected: each ends with `OK` (the second also prints four `warning[...]` lines of the same kinds
upstream's own fixtures produce).

Run both suites:

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

Expected tails:

```text
 92 pass
 0 fail
```

```text
585 checks, 0 failures
```

Re-verify Section 3 against upstream mechanically (save as a script or paste into `python3 -`):

```python
import re
core = open('/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser/Core.hs').read()
i = core.index('reservedWords ='); j = core.index(']', i)
rw = re.findall(r'"([^"]+)"', core[i:j])
spec = open('spec/keiro-dsl-language-model.md').read().split('\n')
s = next(k for k, l in enumerate(spec) if l.startswith('## Section 3'))
a = spec.index('```text', s); b = spec.index('```', a + 1)
print(len(rw), rw == ' '.join(spec[a + 1:b]).split())
```

Expected: `72 True`.


## Validation and Acceptance

Both suites green is the acceptance. The word-list guards probe all 139 bare and 56 dashed
contextual words one per line and require each to be claimed whole by a keyword scope or group;
this is what proves the seven new prefix collisions are handled (for example, `from-beginning` is
one `keiroStatement` token, not a `keiroModifier` `from` followed by plain text). The new
hand-named tests pin classes in real code: `projection-owner` → `keyword.declaration.keiro` /
`keiroKeyword`; `declarative`, `once`, `silent` → `storage.modifier.keiro` / `keiroModifier`;
`bool` → `support.type.keiro` / `keiroType`; `target order_summary {` stays Control; and the `-`
of `stable-union` stays uncoloured. A human can also open
`corpus/language-version-6-reactions-and-selection.keiro` in Neovim with `packages/keiro-vim` on
the runtime path and see the reaction arms and the declarative router fully coloured.


## Idempotence and Recovery

All edits are text edits to the spec, the two highlighters, the two test files, and the corpus
README, plus two new corpus files; re-running the suites is side-effect free (`bun install` only
refreshes `node_modules`). If a later upstream sync finds one of these words removed, delete it
from both highlighters and the spec grid together and decrement the counts in both suites; the
guards name any word left behind.


## Interfaces and Dependencies

No code interfaces change. The dependencies are the existing ones: headless Neovim for
`packages/keiro-vim/test/run.sh`, and Bun with the `shiki` package for `packages/shiki-keiro`.
keiro-dsl 0.17.0.0 (built in the sibling `keiro` checkout) is used only to confirm the corpus
samples are legal sources; it is not a build dependency.
