---
id: 10
slug: highlight-the-language-keiro-dsl-version-preamble
title: "Highlight the language keiro-dsl version preamble"
kind: exec-plan
created_at: 2026-07-31T17:10:20Z
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Highlight the language keiro-dsl version preamble

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
`da0973662301f7cb259481ca7cdeb5b3e5267278..4523b525561e3602dfffaf2b2338d6703bd5a632` —
whose range-ending (triggering) commit is
**`4523b525561e3602dfffaf2b2338d6703bd5a632`, `feat(dsl): add source language version
dispatch`** — gives a `.keiro` file a brand new **first line**. Before this range a `.keiro`
source began with `context <name>`. After it, a source may optionally open with a *version
preamble* naming the language contract it was written against:

```text
language keiro-dsl 1
context hospital-capacity
```

Two literal words enter the language: **`language`** and **`keiro-dsl`**. Neither is a word
either highlighter has ever heard of, so today the most prominent line in a versioned file —
its very first — renders as **plain grey text** in both packages, with only the trailing `1`
picking up the number colour. After this plan both packages colour it, so a versioned file
looks like a keiro file from its first character rather than like a stray line of prose above
one.

You can see the gap and then the fix with your own eyes. From the repository root, before the
change:

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/language-preamble.keiro' \
  -c 'call search("^language")' \
  -c 'for c in [col("."), col(".")+9] | echo synIDattr(synID(line("."), c, 1), "name") | endfor' \
  -c 'quitall!'
```

Before the change this prints two **empty lines** (no highlight group at either the `l` of
`language` or the `k` of `keiro-dsl`). After the change it prints `keiroKeyword` and then
`keiroStatement`. The equivalent tour of the new corpus sample, interactively:

```bash
nvim -u NONE -N \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  corpus/language-preamble.keiro
```

And for Shiki:

```bash
(cd packages/shiki-keiro && bun run demo && open examples/keiro-demo.html)
```


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] Read the keiro-dsl range diff and isolate the one parser change that touches the
      lexical surface — the optional `language keiro-dsl <positive-decimal>` preamble
      (2026-07-31).
- [x] Confirm mechanically that `reservedWords` is byte-identical across the range — 72 words
      before and after, so Section 3 of the spec needs no edit (2026-07-31).
- [x] Measure both highlighters against the preamble *before* editing anything: both leave
      `language` and `keiro-dsl` entirely uncoloured (2026-07-31).
- [x] Confirm no upstream fixture uses the preamble, so the corpus sample must be
      hand-written (2026-07-31).
- [x] Capture the green baseline of both suites (39 pass / 171 expect() calls; 283 checks, 0
      failures) (2026-07-31).
- [x] Milestone 1 — reconcile `spec/keiro-dsl-language-model.md` (Sections 1, 2, 4, 6)
      (2026-07-31).
- [x] Milestone 2 — add `corpus/language-preamble.keiro` and register it in
      `corpus/README.md` (2026-07-31).
- [x] Milestone 3 — teach `packages/keiro-vim/syntax/keiro.vim` the two words (2026-07-31).
- [x] Milestone 4 — teach `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` the two words
      (2026-07-31).
- [x] Milestone 5 — extend both suites, including the raised Section 4 word counts and an
      optional anchor argument on each package's whole-token helper (2026-07-31).
- [x] Milestone 6 — run both suites green (2026-07-31).
- [x] Milestone 7 — write `.keiro-dsl-sync-subject` (2026-07-31).


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- **The preamble is parsed *outside* the grammar that every other keiro-dsl keyword belongs
  to, and that is what makes it a genuinely new kind of clause.** `parseSource` in
  `Parser.hs` now runs in two stages. Stage one, `selectSourceLanguage`, works on raw
  **text**: it splits the input into lines, drops everything from the first `#` on each line,
  drops the lines that are then empty, and looks at whether the first surviving line's first
  word is `language`. Only after that does it look up a body parser in a registry
  (`Keiro/Dsl/LanguageVersion.hs`) and run the megaparsec grammar. So the preamble is
  recognised by hand-written text scanning, not by the `keyword`/`ident` lexer that produces
  every other token in the language. `pDeclaredPreamble` — the megaparsec rule that
  re-consumes the already-validated line — is the only place `keyword "language"` and
  `keyword "keiro-dsl"` appear:

  ```haskell
  pDeclaredPreamble :: P ()
  pDeclaredPreamble = do
      keyword "language"
      keyword "keiro-dsl"
      _ <- lexeme (some digitChar)
      pure ()
  ```

  For a lexical highlighter the consequence is small and reassuring: both words go through
  the same `keyword` combinator as `context` or `guard`, so they are ordinary fixed words and
  Section 1's rule ("a word is a keyword because it is in a fixed list, not because of where
  it appears") applies unchanged.

- **Both packages left the entire preamble uncoloured before this plan.** Measured with
  throwaway probes on the exact two-line source `language keiro-dsl 1\ncontext
  hospital-capacity`. Shiki, via `codeToTokensBase(..., { includeExplanation: true })`:

  ```text
  "language keiro-dsl " (none)
  "1"                   constant.numeric.keiro
  "context"             keyword.declaration.keiro
  " hospital-capacity"  (none)
  ```

  Neovim, reading `synID` at every character of line 1:

  ```text
  l=. a=. n=. g=. u=. a=. g=. e=. ' '=. k=. e=. i=. r=. o=. -=. d=. s=. l=. ' '=. 1=keiroNumber
  ```

  (`.` means no highlight group.) The two engines agreed exactly, which is the outcome
  Section 6 of the spec demands even when the answer is "nothing".

- **`language` is not a reserved word, and that has a user-visible trap that has nothing to
  do with highlighting.** `reservedWords` is byte-identical across the range — 72 words at
  both ends:

  ```bash
  cd /Users/shinzui/Keikaku/bokuno/keiro
  for c in da0973662301f7cb259481ca7cdeb5b3e5267278 \
           4523b525561e3602dfffaf2b2338d6703bd5a632; do
    git show $c:keiro-dsl/src/Keiro/Dsl/Parser.hs \
      | sed -n '/^reservedWords =/,/^    ]/p' | grep -o '"[^"]*"' | tr -d '"'
  done
  ```

  So `language` remains legal as an ordinary identifier — but only *mid-line*.
  `selectSourceLanguage` calls `isLanguageLine` on **every** significant line, not just the
  first, and any line whose first word is `language` that is not the file's first significant
  line is rejected with `MisplacedLanguagePreamble`. A register declared on its own line as
  `language Text = "en"` inside a `regs` block would therefore fail to parse, while a
  command field written as `command Record { language:Text }` parses fine because that line
  begins with `command`. This is a *parser* trap, not a highlighting one — both packages
  colour `language` unconditionally either way — but it is the reason the new corpus sample
  puts its `language` field in a brace list rather than on a line of its own.

- **The preamble may follow comments and blank lines, which is why a highlighter must not try
  to anchor it to line 1.** `significantLines` strips `#` comments before deciding what the
  first significant line is, and upstream's own test asserts it:

  ```haskell
  declared = "# leading comment\n\nlanguage keiro-dsl 1\ncontext hospital-capacity\n"
  ```

  Both packages match the two words with plain unconditional word rules and so get this for
  free. A "clever" first-line-only rule would have been wrong.

- **No upstream fixture exercises the preamble.** The range touches
  `keiro-dsl/keiro-dsl.cabal`, `LanguageVersion.hs`, `Parser.hs`, `PrettyPrint.hs`,
  `Scaffold.hs`, and `test/Main.hs`, and nothing under `keiro-dsl/test/fixtures/`; every
  versioned source in the range is an inline string literal inside `test/Main.hs`. Checked
  directly:

  ```bash
  cd /Users/shinzui/Keikaku/bokuno/keiro
  grep -rl 'language keiro-dsl' keiro-dsl/ --include=*.keiro | wc -l   # -> 0
  ```

  So `corpus/language-preamble.keiro` is hand-written here, like
  `corpus/router-readmodel-snapshot.keiro` and `corpus/aggregate-scalar-types.keiro` before
  it.

- **`keiro-dsl` is the first dashed keyword in the language whose leading segment is not a
  word either package knows.** Every other entry in Section 4's dashed list either collides
  with a bare keyword (`on-ok` with `on`, `dispatch-each` with `dispatch`) or contains one in
  its interior (`status-map` contains `map`). `keiro` is not a keyword anywhere, and neither
  is `dsl`, so `keiro-dsl` needs no `-\@!` guard on the Vim side and no reordering on either
  side — only membership in the dashed rule so the whole spelling is claimed as one token.
  Verified by the `expect_all_keywordish` / `classifyFailures` guards, which fail loudly on a
  split spelling.

- **Adding `language` to the introducer lists means a *wire word* beginning `language-` now
  shows a coloured head.** The corpus sample was first written with `context
  language-preamble`, and both engines coloured the leading `language` and left `-preamble`
  grey:

  ```text
  c=Keyword o=Keyword n=Keyword t=Keyword e=Keyword x=Keyword t=Keyword  =. \
  l=Keyword a=Keyword n=Keyword g=Keyword u=Keyword a=Keyword g=Keyword e=Keyword \
  -=. p=. r=. e=. a=. m=. b=. l=. e=.
  ```

  This is not new behaviour and it is not specific to `language`: a wire word may contain
  dashes (Section 2), a bare keyword rule ends at a `-` in both engines, and the same thing
  already happens to a context named `map-reduce` or `on-call`. Nothing was changed in either
  grammar for it — the corpus context was simply renamed to `journal-service` so the sample
  demonstrates the preamble rather than an unrelated pre-existing artefact. Recorded here so
  the next reader who notices it knows it was seen and judged, not missed.

- **Both suites' whole-token helpers needed an optional anchor, for a reason the corpus file
  creates on purpose.** `corpus/language-preamble.keiro` names `language` and `keiro-dsl`
  inside its comment banner, which is exactly what makes the comment-wins assertion
  meaningful — and it means the *first* occurrence of either word in the file is inside a
  comment. Vim's `expect_uniform` and Shiki's `expectWholeToken` both search from the top,
  so both reported the banner instead. Shiki's failure was the more misleading of the two,
  because the helper's diagnostic is written for a split token:

  ```text
  error: token "keiro-dsl" was split — the rule that should claim it whole is losing to a
  shorter one; line tokenized as ["# keiro-dsl language version preamble — a source may open
  by naming the released language"]
  ```

  Nothing was split; the helper was on the wrong line. Both helpers now take an optional
  anchor phrase (`'language keiro-dsl 1'` here) that restricts the search to the line
  containing it. The plain `expect` / `expectScope` helpers already had this property by
  accident — they match a *phrase*, so callers had been anchoring by hand since plan 8.


## Decision Log

Record every decision made while working on the plan.

- Decision: Treat this range as a real lexical-surface change requiring spec, grammar,
  corpus, and test work, rather than closing it with a `chore(sync)` "no lexical change"
  subject.
  Rationale: the range adds two literal words to the language and a whole new clause form,
  and both packages demonstrably render every character of that clause as plain text today
  (see the measurement in Surprises & Discoveries). That is precisely the kind of gap this
  repository exists to close.
  Date: 2026-07-31

- Decision: Classify `language` as a **Declaration introducer**
  (`keyword.declaration.keiro` / `keiroKeyword`), not as a control keyword.
  Rationale: Section 6 defines the class as the words that "begin a top-level item". The
  preamble is the only clause in the language that sits *outside* `pSpec` entirely — it is
  selected before a body grammar is even chosen — so it is the most top-level thing a
  `.keiro` file can contain. The nearby alternative, following `module` and `layout` (both
  control keywords), was rejected because those two are sub-clauses *of* the `context`
  declaration: `pSpec` reads `keyword "context"`, then a wire word, then optionally
  `pModuleClause` and `pLayoutClause`. `language` is not subordinate to anything.
  Date: 2026-07-31

- Decision: Classify `keiro-dsl` as a **Control / section keyword** (the dashed list), not as
  an uncoloured name and not as a type.
  Rationale: the parser reads it with `keyword "keiro-dsl"` — it is a fixed literal, not a
  user-chosen name, so the precedent of the uncoloured wire word after `context` does not
  apply. Among the keyword classes it behaves exactly like the other fixed enumerated clause
  values already in the control row (`reject`, `ignore`, `standard`, `unlogged`): a word that
  can only ever be spelled one way in one slot.
  Date: 2026-07-31

- Decision: Do not colour the version number specially; leave it in the existing **Number**
  class.
  Rationale: the parser reads it with `lexeme (some digitChar)` and both packages already
  match a bare digit run as `constant.numeric.keiro` / `keiroNumber`. Measured before any
  edit: the `1` in `language keiro-dsl 1` already carried the number class in both engines.
  Inventing a "version" class for it would split one concept across two colours for no
  reader benefit, and the existing `v[0-9]+` version-token form (`event Touched v2`) is a
  different spelling that already lives in Number too.
  Date: 2026-07-31

- Decision: Add both words to Section 4 (curated contextual keywords) rather than Section 3.
  Rationale: Section 3 is a mechanical verbatim copy of the parser's `reservedWords` list and
  must stay diffable against it. `reservedWords` is unchanged across this range — 72 words at
  both ends — so neither new word may be added there. Section 4 is exactly the home the spec
  describes for "words the parser recognizes **in context** that are *not* in
  `reservedWords`".
  Date: 2026-07-31

- Decision: Add a new corpus file rather than putting the preamble on an existing one.
  Rationale: both suites locate tokens by *first occurrence* in a file, so prepending a line
  to a shared corpus file can silently move an existing assertion onto a different token —
  the failure mode `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`
  warns about under Idempotence and Recovery. A new file is additive and cannot disturb any
  existing check.
  Date: 2026-07-31

- Decision: Do not attempt to model the parser's *placement* rules (first significant line;
  at most one preamble) in either grammar.
  Rationale: Section 1 of the spec states that highlighting is purely lexical and that a
  highlighter "must not rely on column position". A misplaced or duplicated preamble is a
  parser diagnostic, and an editor must still tokenize the file while its author is fixing
  it — the same principle plan 9 applied to aggregate types that parse and are then
  semantically rejected.
  Date: 2026-07-31


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

The range reconciled cleanly, and it is the first sync in this repository's history that
added a clause *above* `context` rather than inside a node. Final state:

- `spec/keiro-dsl-language-model.md` — Section 1 gains a paragraph describing the optional
  version preamble and stating that it may follow comments; Section 2's number description
  names the preamble's version number as a third home for the plain-integer form; Section 4's
  bare grid gains `language` and its dashed grid gains `keiro-dsl`, with a new subsection
  explaining the clause; Section 6's Declaration-introducer row gains `language` and its
  Control row names `keiro-dsl`. Section 3 is untouched — still the same verbatim 72 words.
- `packages/keiro-vim/syntax/keiro.vim` — `language` joins the introducer keyword list;
  `keiro-dsl` joins the dashed `syntax match` block.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — `language` joins `#introducers`;
  `keiro-dsl` joins `#dashed-keywords`.
- `corpus/language-preamble.keiro` — new, plus its entry in `corpus/README.md`.
- Both suites — a block of preamble assertions each, an optional anchor argument on
  `expect_uniform` (Vim) and `expectWholeToken` (Shiki) so a whole-token check can be aimed
  past a comment banner that names the same word, and the two Section 4 word counts raised
  from 96 bare / 31 dashed to 97 / 32.

Suites at completion: `bun test` 44 pass / 0 fail / 195 expect() calls (from 39 / 171);
`run.sh` 299 checks, 0 failures (from 283). Both new guards were verified in the failing
direction as well (acceptance check E): removing `language` from `#introducers` fails two
Shiki tests, and removing `keiro-dsl` from the Vim dashed match fails two Vim checks, one of
them the spec-driven dashed-contextual guard naming the word.

The lesson worth carrying forward is about *where* a lexical change can appear. Plans 4
through 9 all added or widened something inside a node body, and every one of them could be
checked by dropping a word into a one-word scratch buffer. This range added a clause that the
parser recognises before its grammar even starts, by scanning raw text — and it still reduced
to two ordinary words in two ordinary word lists, because both packages classify by
membership rather than by position. The design choice recorded in plan 8 and paid off in plan
9 paid off a third time here: the *only* reason this sync was cheap is that neither grammar
tries to know what line it is on.


## Context and Orientation

A reader who has never seen this repository needs the following.

**What keiro-dsl is.** A domain-specific language for describing event-sourced workflows in
the keiro framework. A `.keiro` file declares things like aggregates, processes, routers,
contracts, and read models. You do not need to understand event sourcing to work on this
plan — everything here is about how the *text* looks.

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
- `corpus/*.keiro` — the shared sample files both suites tokenize. `corpus/README.md`
  records, per file, whether it was copied verbatim from upstream (and at which keiro-dsl
  commit) or hand-written here, and why.
- `packages/keiro-vim/test/highlight_spec.lua`, run by `packages/keiro-vim/test/run.sh` —
  headless Neovim assertions.
- `packages/shiki-keiro/test/scopes.test.ts`, run by `bun test` — Shiki assertions.

**The upstream source of truth.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`, a Haskell file
using the `megaparsec` parser-combinator library. Read it directly; do not infer the language
from the highlighters.

**What a `sync-keiro-dsl` run is.** When keiro-dsl changes, an automation opens this
repository with a commit range and asks for the four artifacts above to be brought back into
agreement, with an ExecPlan as the durable record. Plans 4 through 9 in `docs/plans/` are the
previous runs. This is run 10, for the range
`da0973662301f7cb259481ca7cdeb5b3e5267278..4523b525561e3602dfffaf2b2338d6703bd5a632`.

### The parser change, in full

Inspect it with:

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  da0973662301f7cb259481ca7cdeb5b3e5267278..4523b525561e3602dfffaf2b2338d6703bd5a632 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

Two commits sit in the range. `e82ce8f`, `test(dsl): align scalar fixture freshness`, touches
only test expectations. `4523b52`, `feat(dsl): add source language version dispatch`, is the
one that matters. It introduces a new module,
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`, holding a
registry of released language contracts (today exactly one, version `1`), and rewires
`parseSpec` to go through a new two-stage `parseSource`.

Stage one is `selectSourceLanguage`. It is **not** a megaparsec parser; it works on raw text:

```haskell
significantLines :: Text -> [SignificantLine]
significantLines =
    mapMaybe significant . zip [1 ..] . T.lines
  where
    significant (lineNumber, line) =
        let content = T.strip (T.takeWhile (/= '#') line)
         in if T.null content then Nothing else Just SignificantLine{..}

isLanguageLine :: SignificantLine -> Bool
isLanguageLine line = case T.words (significantLineText line) of
    "language" : _ -> True
    _ -> False
```

A "significant line" is a line with its `#` comment removed and its whitespace trimmed, kept
only if something is left. If no significant line starts with the word `language`, the source
is `LegacyUnversioned` and parses exactly as before. If one does, it must be the *first*
significant line (otherwise `MisplacedLanguagePreamble`), it must be the *only* one
(otherwise `DuplicateLanguagePreamble`), and it must read exactly three words —
`language`, `keiro-dsl`, and a run of ASCII digits denoting a positive version that the
registry knows (otherwise `InvalidLanguageVersion` or `UnsupportedLanguageVersion`).

Stage two runs the ordinary grammar, prefixed by a rule that re-consumes the line stage one
already validated:

```haskell
pDeclaredPreamble :: P ()
pDeclaredPreamble = do
    keyword "language"
    keyword "keiro-dsl"
    _ <- lexeme (some digitChar)
    pure ()
```

`keyword` is the same combinator that reads `context`, `guard`, and every other fixed word in
the language: it matches the literal text and then requires that the next character is not an
identifier character (and not a `-` followed by one). So for a highlighter, `language` and
`keiro-dsl` are ordinary fixed words.

`PrettyPrint.hs` gains a matching `renderSource`, which re-emits `language keiro-dsl <n>`
above the rendered body for a source that declared one. That confirms the surface spelling is
stable and canonical — the printer writes exactly the three tokens the parser reads.

### What is *not* in this change

`reservedWords` — the list Section 3 of the spec copies verbatim — is untouched. Both ends of
the range hold the identical 72 words. Neither `language` nor `keiro-dsl` was reserved,
which is normal and is exactly the situation Section 3 already warns about at length: a
dashed word like `keiro-dsl` *cannot* be produced by the plain-identifier parser `ident`
(which accepts only `[A-Za-z0-9_]` after the first character) and so can never need
reserving, and a bare word like `language` simply was not reserved. Nothing about the
comment, string, number, identifier, or operator rules changed.


## Plan of Work

Seven milestones, in dependency order. Each is independently verifiable.

### Milestone 1 — Reconcile the cross-package contract (`spec/keiro-dsl-language-model.md`)

Four edits, none of them to Section 3.

**Section 1, "Overview and file extension".** Add a short paragraph after the bullet list
describing the optional version preamble: a `.keiro` source may open with
`language keiro-dsl <positive-decimal>`; it must be the first line that is not blank and not
a comment, so it may sit *below* a comment banner; a source without one is a legacy
unversioned source and parses identically. Name the parser entry point (`parseSource` /
`selectSourceLanguage` in `Parser.hs`) and the keiro-dsl commit `4523b52`. Close by saying
that neither word is reserved and both are therefore listed in Section 4.

**Section 2, "Numbers", first bullet.** The preamble's version number is a third home for
the plain decimal integer form. Add it to the bullet's parenthetical list of examples so the
Number class visibly covers it.

**Section 4.** Add `language` to the bare grid and `keiro-dsl` to the dashed grid. Then add a
subsection, "The language version preamble", after the dashed-keyword subsection and before
the mapped-type subsection, that shows the clause, states its two words and their Section 6
classes, records that the version number is an ordinary Number, and records the
first-significant-line placement rule together with the explicit note that **neither package
models it** because Section 1 forbids position-dependent highlighting.

**Section 6.** Add `language` to the Declaration-introducer row's member list and `keiro-dsl`
to the Control-keyword row's examples.

Acceptance: the spec describes what `Parser.hs` does at `4523b52`, and the word counts the
suites assert become 72 reserved (unchanged), **97** bare contextual, and **32** dashed
contextual.

### Milestone 2 — Grow the shared corpus

Add `corpus/language-preamble.keiro`, hand-written for this repository because no upstream
fixture uses the preamble. It must contain, at minimum:

- a leading `#` comment banner *above* the preamble, so both suites can prove the preamble is
  still recognised when it is not physically on line 1 — and a comment that names the words
  `language` and `keiro-dsl` inside it, so both suites can also prove a comment still beats
  the words inside it;
- the preamble itself, `language keiro-dsl 1`;
- a `context` declaration with `module` and `layout` clauses underneath, so the file proves
  the preamble does not disturb the header clauses that follow it;
- a small `aggregate` with `regs`, `states`, a `command`, an `event`, and one transition with
  `guard` / `write` / `emit` / `goto`, so the file proves the rest of the language still
  tokenizes below a preamble;
- a command field literally named `language`, on a line that begins with `command`, with a
  comment explaining that the word is not reserved and so remains legal as a field name — and
  why it may not begin a line. This is the honest record of Section 1's lexical rule: the
  field name is coloured as a keyword, exactly like `initial` and `key` before it.

Do **not** name the file's context something beginning `language-`. A wire word may contain
dashes, and a bare keyword rule stops at the `-` in both engines, so `context
language-preamble` renders as a coloured `language` and a grey `-preamble` — a pre-existing
artefact of dashed wire words that has nothing to do with the preamble and would only muddy
the sample. Use `context journal-service`.

Then add the file to `corpus/README.md` under the hand-written section, with its date, what
it covers, and a pointer back to this plan — matching the entries already there.

Acceptance: the file exists and both suites can open it. (It is not run through the keiro-dsl
parser here; this repository has no Haskell toolchain. Its shape is checked by eye against
`pSpec` and against upstream's `test/Main.hs` preamble strings.)

### Milestone 3 — Teach the Vim syntax file (`packages/keiro-vim/syntax/keiro.vim`)

Two additions. Under "Declaration-introducer keywords", add `language` to a
`syntax keyword keiroKeyword` line. Under the dashed `syntax match` block, add `keiro-dsl` to
one of the existing alternation groups (dashed words need `match` rather than `keyword`
because `-` is not a Vim keyword character). Add a short comment recording that `keiro`
is not itself a keyword, so unlike `on-ok` or `dispatch-each` this word needs no `-\@!`
guard on a bare prefix.

Acceptance: the character sweep in Validation reports `keiroKeyword` on all eight characters
of `language` and `keiroStatement` on all nine of `keiro-dsl`.

### Milestone 4 — Teach the TextMate grammar (`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`)

Two additions, mirroring Milestone 3. Add `language` to the `#introducers` alternation and
`keiro-dsl` to the `#dashed-keywords` alternation. `#dashed-keywords` is already listed
before `#introducers` and `#control-keywords` in the top-level `patterns` array, so no
reordering is needed.

Acceptance: `scopesOf` reports `keyword.declaration.keiro` for `language` and
`keyword.control.keiro` for `keiro-dsl`, each as one whole token.

### Milestone 5 — Extend both test suites

`packages/shiki-keiro/test/scopes.test.ts` and `packages/keiro-vim/test/highlight_spec.lua`
each gain a block for this range:

- `language` gets the declaration-introducer class;
- `keiro-dsl` gets the control class **as one whole token** — using the whole-token helpers
  (`expectWholeToken` in Shiki, `expect_uniform` in Vim) rather than a first-character check,
  because a split dashed word is exactly the blind spot plans 8 and 9 both had to close;
- the preamble's version number still gets the Number class;
- the comment banner above the preamble is still a comment across its whole length, even
  though it names both new words;
- the `context` / `module` / `layout` header and the aggregate below the preamble still
  tokenize normally.

Both whole-token helpers need one small extension for this: an **optional anchor phrase** that
restricts the search to the line containing it. Without it they find the corpus file's comment
banner — which names both new words deliberately — and Shiki's reports it as a "split token",
a misleading failure for a token that was never split. Vim's `expect_uniform` gains a third
argument; Shiki's `expectWholeToken` gains a fourth. Both default to the old behaviour, so no
existing call changes.

Then raise the two Section 4 counts in both suites: bare 96 → **97**, dashed 31 → **32**. The
reserved count stays 72. These counts are the guard that fails by name if a word is added to
the spec without a matching grammar rule, so they must move in lockstep with Milestone 1.

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

All commands are run from the repository root,
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, unless stated otherwise.

**1. Read the range.**

```bash
git -C /Users/shinzui/Keikaku/bokuno/keiro diff \
  da0973662301f7cb259481ca7cdeb5b3e5267278..4523b525561e3602dfffaf2b2338d6703bd5a632 \
  -- keiro-dsl/src/Keiro/Dsl/Parser.hs keiro-dsl/src/Keiro/Dsl/Grammar.hs \
     keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs keiro-dsl/test/fixtures
```

**2. Prove `reservedWords` did not move.**

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro
for c in da0973662301f7cb259481ca7cdeb5b3e5267278 \
         4523b525561e3602dfffaf2b2338d6703bd5a632; do
  git show $c:keiro-dsl/src/Keiro/Dsl/Parser.hs \
    | sed -n '/^reservedWords =/,/^    ]/p' | grep -o '"[^"]*"' | tr -d '"' > /tmp/rw-$c.txt
  echo "$c: $(wc -l < /tmp/rw-$c.txt) words"
done
diff /tmp/rw-da09736*.txt /tmp/rw-4523b52*.txt && echo IDENTICAL
```

Expected:

```text
da0973662301f7cb259481ca7cdeb5b3e5267278: 72 words
4523b525561e3602dfffaf2b2338d6703bd5a632: 72 words
IDENTICAL
```

**3. Capture the baseline.** Both suites must be green before any edit, so a later failure is
unambiguously this plan's.

```bash
(cd packages/shiki-keiro && bun install && bun test) 2>&1 | tail -4
./packages/keiro-vim/test/run.sh 2>&1 | tail -2
```

Expected: `39 pass / 0 fail`, and `283 checks, 0 failures`.

**4. Measure the preamble against both highlighters before editing either grammar.** For
Shiki, a scratch `packages/shiki-keiro/probe.ts`:

```typescript
import { createHighlighter } from 'shiki'
import { keiro } from './src/index'
const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
const code = 'language keiro-dsl 1\ncontext hospital-capacity\n'
for (const line of hl.codeToTokensBase(code, {
  lang: 'keiro', theme: 'github-light', includeExplanation: true,
})) {
  for (const t of line) for (const e of t.explanation ?? [])
    console.log(JSON.stringify(e.content),
      e.scopes.map((s) => s.scopeName).filter((s) => s !== 'source.keiro').join(',') || '(none)')
}
```

Run with `(cd packages/shiki-keiro && bun probe.ts)`, then delete it. For Vim, a scratch
`/tmp/probe.lua` that prints the highlight group of every character of the two lines:

```lua
vim.opt.runtimepath:prepend(vim.fn.getcwd() .. '/packages/keiro-vim')
vim.cmd('filetype on'); vim.cmd('syntax on')
vim.cmd('enew!'); vim.bo.buftype = 'nofile'
vim.api.nvim_buf_set_lines(0, 0, -1, false,
  {'language keiro-dsl 1', 'context hospital-capacity'})
vim.bo.filetype = 'keiro'
vim.cmd('syntax sync fromstart')
for lnum = 1, 2 do
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

**5. Apply Milestone 1** to `spec/keiro-dsl-language-model.md`.

**6. Apply Milestone 2**: write `corpus/language-preamble.keiro`, then add its entry to
`corpus/README.md`.

**7. Apply Milestones 3 and 4** to the two grammar files, then re-run the step-4 probes and
confirm `language` and `keiro-dsl` now carry a group on every character.

**8. Apply Milestone 5** to both suites.

**9. Run both suites.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
./packages/keiro-vim/test/run.sh
```

**10. Write the sync subject.**

```bash
printf '%s\n' 'feat(syntax): highlight the language keiro-dsl version preamble' \
  > .keiro-dsl-sync-subject
```


## Validation and Acceptance

Acceptance is behavioural, not "it compiles".

**A — the preamble is coloured in Vim.** Before Milestone 3 neither word has a highlight
group; after, `language` is `keiroKeyword` on all eight characters and `keiro-dsl` is
`keiroStatement` on all nine.

```bash
nvim --headless -n -u NONE -i NONE \
  --cmd 'set runtimepath^=packages/keiro-vim' \
  --cmd 'filetype on | syntax on' \
  -c 'edit corpus/language-preamble.keiro' \
  -c 'call search("^language")' \
  -c 'for c in [col("."), col(".")+9] | echo synIDattr(synID(line("."), c, 1), "name") | endfor' \
  -c 'quitall!'
```

Expected after the change:

```text
keiroKeyword
keiroStatement
```

**B — the preamble is coloured in Shiki.** The scratch probe from Concrete Steps step 4,
re-run after Milestone 4, must report:

```text
"language"   keyword.declaration.keiro
" "          (none)
"keiro-dsl"  keyword.control.keiro
" "          (none)
"1"          constant.numeric.keiro
```

The point is `"keiro-dsl"` appearing as **one** entry. If `#dashed-keywords` ever stopped
winning, it would split, and the whole-token assertions added in Milestone 5 would fail.

**C — a comment above the preamble still wins.** `corpus/language-preamble.keiro` opens with
a comment naming both new words. It must be `keiroComment` / `comment.line.number-sign.keiro`
across its whole length, and the preamble on the line below must still be recognised — which
is the point of putting the comment there at all, since the parser also allows it.

**D — both suites green.**

```bash
(cd packages/shiki-keiro && bun install && bun test)
```

```text
 44 pass
 0 fail
 195 expect() calls
```

```bash
./packages/keiro-vim/test/run.sh
```

```text
299 checks, 0 failures
```

**E — the new guards actually guard.** Run each in its failing direction, then restore. A
guard that passes in both directions is not a guard.

Shiki — temporarily delete `language|` from the `#introducers` alternation in
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` and re-run `bun test`. Observed:

```text
(fail) the language version preamble gets keyword.declaration
(fail) every curated contextual keyword is classified as a keyword by the grammar
 42 pass
 2 fail
```

The second failure is the spec-driven guard: it reads `language` out of Section 4 of
`spec/keiro-dsl-language-model.md` and reports it by name, which is the whole point of that
list existing.

Vim — temporarily delete the `syntax match keiroStatement /\<keiro-dsl\>/` line from
`packages/keiro-vim/syntax/keiro.vim` and re-run `run.sh`. Observed:

```text
FAIL "keiro-dsl": want keiroStatement on every character, got (none) at offset 0 ("k") — a
shorter rule is claiming part of the literal; see the number matches in syntax/keiro.vim
FAIL contextual-dashed "keiro-dsl": want a keyword group, got
299 checks, 2 failures
```

**F — the spec's word-list guards move together.** Both suites assert Section 3 has 72 words
and Section 4 has 97 bare plus 32 dashed. Section 3 must be unchanged by this range; the two
Section 4 counts must each have risen by exactly one. A failure here means Milestone 1's edits
and Milestone 5's counts disagree.


## Idempotence and Recovery

Every step here is safe to repeat.

- The measurement steps (2, 3, 4) are read-only apart from files under `/tmp` and the scratch
  `packages/shiki-keiro/probe.ts`, which is deleted before the suites are run. Re-running them
  costs only time.
- The edits (Milestones 1 through 5) are ordinary file edits under version control. `git diff`
  shows the whole change; `git checkout -- <path>` reverts any single file. Nothing in this
  plan runs `git add`, `git commit`, or `git push` — the calling automation owns the commit —
  so recovery never involves rewriting history.
- Milestones 3 and 4 are the only behavioural changes to a shipped grammar, and each is a
  purely **additive** word in an existing list. Adding a word cannot uncolour anything that
  was coloured before; the worst case is that a `.keiro` file using `language` or `keiro-dsl`
  as an ordinary identifier now shows it as a keyword, which is Section 1's documented
  lexical rule and the same behaviour `initial`, `key`, and `value` already have. Reverting
  either file alone restores the previous behaviour.
- `corpus/language-preamble.keiro` is new, so nothing depends on it until Milestone 5 adds
  assertions. Deleting it and its `corpus/README.md` entry cleanly undoes Milestone 2.
- The two count assertions in Milestone 5 are the one place where two files must agree. If
  the suites fail with "want 97, got 96", the spec edit in Milestone 1 did not land in the
  fenced word block; fix the spec rather than lowering the count.
- `bun install` in `packages/shiki-keiro` is idempotent; the lockfile is committed.
- If the corpus file is edited after the suites are written, re-run both suites: they locate
  tokens by *first occurrence*, so inserting a line that repeats an anchor earlier in the file
  can move an assertion onto the wrong token. That failure mode is loud — the reported group
  is wrong, not missing.


## Interfaces and Dependencies

**Upstream, read-only.**
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs` at
`4523b525561e3602dfffaf2b2338d6703bd5a632` — the authority for every claim in the spec. Its
new companion `/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/LanguageVersion.hs`
holds the released-version registry, the `SourceLanguage` / `ParsedSource` / `ParseFailure`
types, and the four `SourceLanguageErrorCode` diagnostics; it is read for context only.
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` gains
`renderSource`, which confirms the canonical spelling of the preamble.

**In this repository.**

- `spec/keiro-dsl-language-model.md` — the contract. Section 3 must remain a verbatim copy of
  `reservedWords`; the fenced word blocks in Sections 3 and 4 are parsed by both suites, so
  their shape (```` ```text ```` fences, whitespace-separated words) must be preserved. After
  this plan Section 4's bare block holds 97 words and its dashed block holds 32.
- `packages/keiro-vim/syntax/keiro.vim` — Vim syntax. `language` joins the
  `syntax keyword keiroKeyword` introducer lines; `keiro-dsl` joins the dashed
  `syntax match keiroStatement` block.
- `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` — TextMate grammar. `language` joins
  the `#introducers` alternation; `keiro-dsl` joins the `#dashed-keywords` alternation.
  `#dashed-keywords` stays ahead of `#introducers` and `#control-keywords` in the top-level
  `patterns` array.
- `corpus/language-preamble.keiro` — new shared sample. Read-only to both packages per
  `corpus/README.md`; each package asserts against it from its own suite.
- `packages/keiro-vim/test/highlight_spec.lua` — reuses `expect`, `expect_uniform`, and the
  spec word-list guards already there. `expect_uniform(word, want)` gains an optional third
  argument `anchor`: when given, the helper locates `anchor` first and searches for `word`
  within that line. New assertions and two raised counts otherwise.
- `packages/shiki-keiro/test/scopes.test.ts` — reuses `expectScope`, `expectWholeToken`, and
  the spec word-list guards already there. `expectWholeToken(code, content, scope)` gains an
  optional fourth argument `anchor`, which skips lines that do not contain it. New assertions
  and two raised counts otherwise.

**Toolchain.** Neovim (headless, `-l` script mode) for the Vim suite; Bun and `shiki` for the
Shiki suite, both already pinned in `packages/shiki-keiro/package.json` and `bun.lock`. No new
dependency is added by this plan. This repository has no Haskell toolchain, so the upstream
parser is read, never run.
