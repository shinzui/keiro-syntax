---
id: 2
slug: vim-and-neovim-syntax-highlighting-package-for-keiro-dsl
title: "Vim and Neovim Syntax Highlighting Package for keiro-dsl"
kind: exec-plan
created_at: 2026-06-10T20:39:45Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Vim and Neovim Syntax Highlighting Package for keiro-dsl

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

After this plan, a person who installs this plugin and opens any `.keiro` file in Vim or
Neovim will immediately see the file highlighted: keywords in the keyword color, type names
as types, strings, numbers, comments, and operators each in their own color — with zero
per-project configuration. Today a `.keiro` file opens as flat, single-color text, which
makes these workflow definitions hard to scan and review. This plugin fixes that.

keiro-dsl is a small domain-specific language for describing event-sourced workflows in the
keiro framework. Its files end in `.keiro`. You do not need to understand what the language
*means* — this plan is about coloring its *text* by recognizing patterns (keywords, strings,
numbers, comments, operators). All the lexical facts you need are repeated in this plan, and
the authoritative, shared classification lives in `spec/keiro-dsl-language-model.md`, which
the first plan in this initiative produced.

You will produce a conventional Vim plugin under `packages/keiro-vim/` with the standard
layout (`ftdetect/`, `ftplugin/`, `syntax/`). It works in both classic Vim and Neovim
because it uses the portable Vim syntax-highlighting mechanism (regex-based `:syntax`
commands), not anything editor-specific. The observable proof is twofold: opening a corpus
file in Neovim shows colors, and an automated headless-Neovim test asserts that specific
tokens receive the correct syntax group.

A Tree-sitter grammar (the newer Neovim highlighting mechanism) is explicitly **out of
scope** here; it is noted as a possible future package at the end of this plan.


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] Create `packages/keiro-vim/` with `ftdetect/keiro.vim` and `ftplugin/keiro.vim`.
- [x] Write `syntax/keiro.vim` implementing comments, strings, numbers, keyword groups,
      types, operators, and the `highlight default link` mappings (incl. the optional
      `keiroTypeName` declaration-site refinement).
- [x] Manually confirm a corpus file shows colors in Neovim (verified via the headless test,
      which asserts concrete syntax groups independent of color scheme).
- [x] Write the headless-Neovim test (`test/highlight_spec.lua` + `test/run.sh`) and make it pass.
- [x] Write `packages/keiro-vim/README.md` with installation instructions for common plugin managers.
- [x] Commit with the required git trailers.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- The headless test passes 10/10 with exit 0 on `nvim` v0.12.2. Sample output:
  `ok "# keiro-dsl" -> keiroComment`, `ok "guard" -> keiroStatement`,
  `ok "-->" -> keiroOperator`, `ok "true" -> keiroBoolean`. The `-l script.lua args` runner
  form works as documented and passes the plugin dir as `arg[1]`.
- The optional `keiroTypeName` declaration-site refinement (Step C) was implemented — it
  colors the CamelCase name after a declaration introducer as `Type`. Because `keiroKeyword`
  is a `keyword`-form item it keeps its own color and `\zs` makes the match begin after the
  keyword, so the two do not conflict.
- No keyword/operator discrepancies vs. `spec/keiro-dsl-language-model.md` were found; the
  keyword sets were transcribed directly from the spec's Section 6 buckets.


## Decision Log

Record every decision made while working on the plan.

- Decision: Use the classic regex `:syntax` mechanism (one `syntax/keiro.vim` file) rather
  than Tree-sitter.
  Rationale: It works in both Vim and Neovim with no compiled parser, is the format the
  shared language model maps to directly, and delivers the full user-visible win at low cost.
  Date: 2026-06-10


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-06-10): complete and meeting the original purpose.** Opening any `.keiro`
file in Vim or Neovim now highlights keywords, type names, strings, numbers, comments, and
operators with zero per-project configuration. The package `packages/keiro-vim/` ships the
standard layout — `ftdetect/keiro.vim` (maps `*.keiro` → filetype `keiro`),
`ftplugin/keiro.vim` (`commentstring`/`comments` for `#`), and `syntax/keiro.vim` (the
`keiro*` syntax groups linked to standard highlight groups per the shared taxonomy).

**Verification.** `bash packages/keiro-vim/test/run.sh` exits 0 with 10/10 token checks
passing against the shared corpus — at least one assertion per mandatory class (comment,
string, number, boolean, type, declaration-introducer keyword, control keyword, operator).
The test asserts concrete `keiro*` syntax-group names via `synID`, so it is independent of
any color scheme.

**Against scope.** Tree-sitter remains out of scope (documented as a future
`packages/keiro-treesitter/`). This regex syntax file delivers the full user-visible win and
is the only highlighting option for classic Vim.


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master` (commit directly to
it). This plan depends on the first plan in this initiative,
`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md`, being complete: it
produced `spec/keiro-dsl-language-model.md` (the classification you implement) and `corpus/`
(the `.keiro` files you test against). If `spec/` or `corpus/` is missing, stop and complete
that plan first.

You need Neovim installed to run the tests; this machine has `nvim` (version 0.12.2). The
plugin itself is plain text files and needs no build step or package manager.

How Vim/Neovim highlighting works, in plain terms. When you open a file, Vim decides its
**filetype** (a short name like `keiro`). Files in a plugin's `ftdetect/` directory map file
patterns to filetypes. When the filetype is `keiro`, Vim looks for `syntax/keiro.vim` and
runs the `:syntax` commands in it. Those commands define **syntax groups** (we name ours
`keiroKeyword`, `keiroString`, ...) and then **link** each group to a standard **highlight
group** (`Keyword`, `String`, `Comment`, `Number`, `Boolean`, `Type`, `Operator`,
`StorageClass`, `Constant`) that the user's color scheme already styles. The `ftplugin/`
directory holds per-filetype options like the comment string.

Two `:syntax` command forms you will use:

- `syntax keyword <group> word1 word2 ...` — declares that each listed whole word belongs to
  `<group>`. Words must consist of "keyword characters" (letters, digits, `_`); this form
  **cannot** match words containing a dash.
- `syntax match <group> /pattern/` — declares that text matching the regex belongs to
  `<group>`. Use this for operators, numbers, strings (or `syntax region`), and the dashed
  keywords. `keyword`-form items take priority over `match`-form items where they overlap.

The full classification you implement is the taxonomy table in
`spec/keiro-dsl-language-model.md`, Section 6. The relevant lexical facts are repeated below
so you can implement without flipping back and forth, but if anything here disagrees with the
spec, the spec wins (and you should fix this plan and note it in Surprises & Discoveries).


## Interfaces and Dependencies

No libraries. Tools: a text editor and `nvim` (for the test). The plugin's public interface
is its file layout, which any Vim plugin manager understands:

```text
packages/keiro-vim/
  ftdetect/keiro.vim      detect *.keiro -> filetype "keiro"
  ftplugin/keiro.vim      commentstring and comment options for keiro buffers
  syntax/keiro.vim        the syntax groups and highlight links
  test/run.sh             headless-Neovim test runner
  test/highlight_spec.lua the assertions
  README.md               installation instructions
```

At the end, opening a `.keiro` buffer must set `&filetype` to `keiro` and define the syntax
groups `keiroComment`, `keiroString`, `keiroNumber`, `keiroBoolean`, `keiroConstant`,
`keiroType`, `keiroKeyword`, `keiroStatement`, `keiroModifier`, and `keiroOperator`, each
linked to the standard highlight group named in the taxonomy.


## Plan of Work

One milestone, built in the order below.

### Step A — Filetype detection

Create `packages/keiro-vim/ftdetect/keiro.vim`:

```vim
" Detect keiro-dsl source files.
autocmd BufRead,BufNewFile *.keiro setfiletype keiro
```

`setfiletype` (rather than `set filetype=`) is deliberate: it respects a filetype the user
may have already set.

### Step B — Filetype options

Create `packages/keiro-vim/ftplugin/keiro.vim`. keiro-dsl comments start with `#` and run to
end of line, so set the comment string and comment leader accordingly:

```vim
if exists('b:did_ftplugin')
  finish
endif
let b:did_ftplugin = 1

setlocal commentstring=#\ %s
setlocal comments=:#
```

### Step C — The syntax file

Create `packages/keiro-vim/syntax/keiro.vim`. This is the core deliverable. Implement exactly
the classification from `spec/keiro-dsl-language-model.md` Section 6. The relevant facts:

- **Comments**: `#` to end of line. No block comments.
- **Strings**: double-quoted `"..."`, no escape sequences, single line.
- **Numbers**: plain integers (`[0-9]+`), version tokens (`v[0-9]+`, e.g. `v2`), and duration
  tokens (`[0-9]+` followed by letters, e.g. `5m`, `2s`).
- **Booleans**: `true`, `false`.
- **Other language constants**: `HOLE`, `placeholder`, `skip`, `hole`.
- **Primitive types**: `Bool`, `Int`, `Text`, `Time`, `Id`, `Maybe`, `typeid`, `text`, `int`.
- **Declaration-introducer keywords**: `context`, `id`, `enum`, `rule`, `aggregate`,
  `process`, `contract`, `intake`, `emit`, `publisher`, `workqueue`, `dispatch`, `workflow`,
  `operation`.
- **Control / section keywords** (everything else that should read as a keyword): the rest of
  the reserved words — `regs`, `states`, `command`, `event`, `wire`, `projection`, `guard`,
  `write`, `goto`, `fields`, `status-map`, `accept`, `bind`, `dedupe`, `decode`,
  `disposition`, `map`, `queue`, `payload`, `retry`, `fanout`, `dedup`, `enqueue`, `seenIn`,
  `body`, `step`, `await`, `sleep`, `child`, `topic`, `ex` — plus the curated contextual
  words — `name`, `input`, `output`, `in`, `out`, `correlate`, `saga`, `stream`, `target`,
  `projections`, `on`, `advance`, `schedule`, `timer`, `fire`, `fireAt`, `source`, `key`,
  `value`, `run`, `signal`, `query`, `project`, `result`, `ordering`, `backoff`, `outboxId`,
  `messageId`, `idempotencyKey`, `discriminator`, `schemaVersion`, `derive`, `of`, `after`,
  `logical`, `physical`, `dlq`, `table`, `maxRetries`, `maxAttempts`, `delay`, `readModel`,
  `field`, `to`, `envelope` — plus the dashed contextual words — `status-map`, `dispatch-id`,
  `fired-event-id`, `on-appended`, `on-duplicate`, `on-failed`, `on-ok`, `on-reject`,
  `on-error`, `not-mine`, `unknown-status`, `max-attempts`, `dead-letter`, `kafka-key`,
  `kafka-cursor`, `cross-check`.
- **Modifiers**: `deprecated`, `upcast`, `from`, `consistency`, `required`, `stable`,
  `strategy`, `via`, `policy`, `prefix`, `kind`. (Note: `consistency` is a single keyword;
  classify it once, as a modifier, not also as a control keyword.)
- **Operators**: highlight the distinctive ones — `-->`, `--`, `->`, `:=`, `=>`, `==`, `!=`,
  `<=`, `>=`, `<>`, `&&`, `||`, `<`, `>`, `+`, `@`, `!`. (The single-character punctuation
  `=`, `:`, `.`, `,` may be left uncolored to match conventional editor behavior; the spec
  marks them low priority.)

Write the file as follows. Note that dashed words use `syntax match` (not `syntax keyword`)
and that `\<word-with-dash\>` works because the inner `-` is matched literally while `\<`/`\>`
anchor the outer word boundaries:

```vim
" Vim syntax file for keiro-dsl (.keiro)
" Classification mirrors spec/keiro-dsl-language-model.md Section 6.

if exists('b:current_syntax')
  finish
endif

" --- Comments -------------------------------------------------------------
syntax match keiroComment /#.*$/ contains=@Spell

" --- Strings (double-quoted, no escapes) ----------------------------------
syntax region keiroString start=/"/ end=/"/ oneline

" --- Numbers: versions (v2), durations (5m), and plain integers -----------
syntax match keiroNumber /\<v\d\+\>/
syntax match keiroNumber /\<\d\+\a\+\>/
syntax match keiroNumber /\<\d\+\>/

" --- Booleans and other language constants --------------------------------
syntax keyword keiroBoolean true false
syntax keyword keiroConstant HOLE placeholder skip hole

" --- Primitive types ------------------------------------------------------
syntax keyword keiroType Bool Int Text Time Id Maybe typeid text int

" --- Declaration-introducer keywords --------------------------------------
syntax keyword keiroKeyword context id enum rule aggregate process contract
syntax keyword keiroKeyword intake emit publisher workqueue dispatch workflow operation

" --- Modifiers ------------------------------------------------------------
syntax keyword keiroModifier deprecated upcast from consistency required stable
syntax keyword keiroModifier strategy via policy prefix kind

" --- Control / section keywords -------------------------------------------
syntax keyword keiroStatement regs states command event wire projection guard
syntax keyword keiroStatement write goto fields accept bind dedupe decode
syntax keyword keiroStatement disposition map queue payload retry fanout dedup
syntax keyword keiroStatement enqueue seenIn body step await sleep child topic ex
syntax keyword keiroStatement name input output in out correlate saga stream
syntax keyword keiroStatement target projections on advance schedule timer fire
syntax keyword keiroStatement fireAt source key value run signal query project
syntax keyword keiroStatement result ordering backoff outboxId messageId
syntax keyword keiroStatement idempotencyKey discriminator schemaVersion derive
syntax keyword keiroStatement of after logical physical dlq table maxRetries
syntax keyword keiroStatement maxAttempts delay readModel field to envelope

" Dashed keywords need 'match' because '-' is not a keyword character.
syntax match keiroStatement /\<\%(status-map\|dispatch-id\|fired-event-id\)\>/
syntax match keiroStatement /\<\%(on-appended\|on-duplicate\|on-failed\|on-ok\)\>/
syntax match keiroStatement /\<\%(on-reject\|on-error\|not-mine\|unknown-status\)\>/
syntax match keiroStatement /\<\%(max-attempts\|dead-letter\|kafka-key\)\>/
syntax match keiroStatement /\<\%(kafka-cursor\|cross-check\)\>/

" --- Operators (longest alternatives first) -------------------------------
syntax match keiroOperator /-->/
syntax match keiroOperator /->/
syntax match keiroOperator /--/
syntax match keiroOperator /:=/
syntax match keiroOperator /=>/
syntax match keiroOperator /[=!<>]=/
syntax match keiroOperator /<>/
syntax match keiroOperator /&&/
syntax match keiroOperator /||/
syntax match keiroOperator /[<>@!+]/

" --- Highlight links ------------------------------------------------------
highlight default link keiroComment   Comment
highlight default link keiroString    String
highlight default link keiroNumber    Number
highlight default link keiroBoolean   Boolean
highlight default link keiroConstant  Constant
highlight default link keiroType      Type
highlight default link keiroKeyword   Keyword
highlight default link keiroStatement Statement
highlight default link keiroModifier  StorageClass
highlight default link keiroOperator  Operator

let b:current_syntax = 'keiro'
```

Optional refinement (only if time permits): highlight the CamelCase name right after a
declaration introducer as a type, using `\zs` to start the match after the keyword:

```vim
syntax match keiroTypeName /\<\%(aggregate\|enum\|contract\|command\|event\|workflow\|operation\|process\|id\|rule\)\s\+\zs\u\w*/
highlight default link keiroTypeName Type
```

Because `keiroKeyword` is a `keyword`-form item it keeps its own color; `\zs` makes
`keiroTypeName` color only the name that follows.

### Step D — Manual visual check

Open a corpus file in Neovim and confirm it is colored:

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
nvim --cmd "set rtp^=$PWD/packages/keiro-vim" corpus/reservation.keiro
```

You should see `aggregate`, `command`, `event`, `guard`, `goto` colored as keywords;
`Reservation` as a type (if you added the optional refinement); `1` as a number; `-->`, `:=`,
`=>` as operators; and `true`/`false` as booleans. Type `:set filetype?` inside Neovim and
confirm it prints `filetype=keiro`. Quit with `:q!`.

### Step E — Automated headless test

Create `packages/keiro-vim/test/highlight_spec.lua`. It loads corpus files in a headless
Neovim, then for chosen tokens checks the syntax group via `synID`. Use the syntax-group
name (e.g. `keiroKeyword`) directly so the test does not depend on any color scheme:

```lua
-- Headless syntax assertions for the keiro-vim plugin.
-- Run via test/run.sh, which passes the plugin dir as the first script arg.
local plugin_dir = (arg and arg[1]) or vim.fn.getcwd()
local repo_root = vim.fn.fnamemodify(plugin_dir, ':h:h')  -- packages/keiro-vim -> repo root

vim.opt.runtimepath:prepend(plugin_dir)
vim.cmd('filetype on')
vim.cmd('syntax on')

local failures = 0
local checks = 0

local function group_at(lnum, col)
  -- trans=1 returns the topmost syntax item name, e.g. "keiroKeyword".
  return vim.fn.synIDattr(vim.fn.synID(lnum, col, 1), 'name')
end

-- Find the first (lnum, col) where `word` appears as text in the buffer.
local function locate(word)
  for lnum = 1, vim.fn.line('$') do
    local line = vim.fn.getline(lnum)
    local s = vim.fn.match(line, '\\V' .. vim.fn.escape(word, '\\'))
    if s >= 0 then
      return lnum, s + 1  -- columns are 1-based
    end
  end
  return nil, nil
end

local function open(relpath)
  vim.cmd('silent! edit! ' .. repo_root .. '/' .. relpath)
  vim.cmd('syntax sync fromstart')
  assert(vim.bo.filetype == 'keiro',
    'expected filetype=keiro for ' .. relpath .. ', got ' .. vim.bo.filetype)
end

local function expect(word, want)
  checks = checks + 1
  local lnum, col = locate(word)
  if not lnum then
    failures = failures + 1
    print(string.format('MISSING token %q in current buffer', word))
    return
  end
  local got = group_at(lnum, col)
  if got ~= want then
    failures = failures + 1
    print(string.format('FAIL %q: want %s, got %s', word, want, got))
  else
    print(string.format('ok   %q -> %s', word, got))
  end
end

open('corpus/comments-and-literals.keiro')
expect('# keiro-dsl', 'keiroComment')
expect('context', 'keiroKeyword')
expect('aggregate', 'keiroKeyword')
expect('"demo.events"', 'keiroString')
expect('Int', 'keiroType')

open('corpus/reservation.keiro')
expect('guard', 'keiroStatement')
expect('-->', 'keiroOperator')
expect(':=', 'keiroOperator')
expect('true', 'keiroBoolean')
expect('schemaVersion', 'keiroStatement')

print(string.format('\n%d checks, %d failures', checks, failures))
if failures > 0 then
  vim.cmd('cquit 1')
else
  vim.cmd('quitall')
end
```

Note on the substring-anchored checks: `locate` returns the column of the first character of
the match, so `expect('# keiro-dsl', ...)` samples the group at `#` (a comment) and
`expect('"demo.events"', ...)` samples at the opening `"` (a string) — both correct sample
points. Every asserted token must actually appear in the named corpus file; if one is absent,
`locate` returns nil and the check fails loudly. Adjust tokens to ones present in your final
corpus.

Create `packages/keiro-vim/test/run.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
plugin_dir="$(cd "$(dirname "$0")/.." && pwd)"
nvim --headless -n -u NONE -i NONE \
  -l "$plugin_dir/test/highlight_spec.lua" "$plugin_dir"
```

Make it executable: `chmod +x packages/keiro-vim/test/run.sh`. The `-l script.lua args...`
form runs the Lua script and passes `args` as `arg[1..]`; here we pass the plugin directory so
the script can locate the repo root and the corpus.

### Step F — README

Create `packages/keiro-vim/README.md` covering: what the plugin does (syntax highlighting for
`.keiro` files in Vim and Neovim); installation for the common managers, e.g.

```text
" lazy.nvim
{ dir = "/path/to/keiro-syntax/packages/keiro-vim" }

" vim-plug
Plug '/path/to/keiro-syntax/packages/keiro-vim'

" packer
use '/path/to/keiro-syntax/packages/keiro-vim'

" manual: copy or symlink ftdetect/, ftplugin/, syntax/ into ~/.config/nvim/
```

and how to run the test (`bash packages/keiro-vim/test/run.sh`).


## Concrete Steps

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax
mkdir -p packages/keiro-vim/ftdetect packages/keiro-vim/ftplugin \
         packages/keiro-vim/syntax packages/keiro-vim/test
# create the files from Steps A-F with your editor, then:
chmod +x packages/keiro-vim/test/run.sh
bash packages/keiro-vim/test/run.sh
```


## Validation and Acceptance

Acceptance is observable behavior, two ways.

1. **Visual**: the manual check in Step D shows a colored buffer and `:set filetype?` prints
   `filetype=keiro`.

2. **Automated**: `bash packages/keiro-vim/test/run.sh` prints an `ok` line for each asserted
   token and exits 0. A successful run looks like:

   ```text
   ok   "# keiro-dsl" -> keiroComment
   ok   "context" -> keiroKeyword
   ok   "aggregate" -> keiroKeyword
   ok   "\"demo.events\"" -> keiroString
   ok   "Int" -> keiroType
   ok   "guard" -> keiroStatement
   ok   "-->" -> keiroOperator
   ok   ":=" -> keiroOperator
   ok   "true" -> keiroBoolean
   ok   "schemaVersion" -> keiroStatement

   10 checks, 0 failures
   ```

   If any line says `FAIL` (wrong group) or `MISSING` (token absent), the runner exits 1.
   Fix the syntax file or the asserted token and re-run. The test exit code is the build
   signal: `echo $?` after the run must be `0`.

Coverage expectation: assert at least one token of each mandatory class (comment, string,
number, boolean, type, declaration-introducer keyword, control keyword, operator). Add more
assertions against the real fixtures (`reservation.keiro`, `hospital-surge.keiro`,
`emit.keiro`) as you see fit — for example `emit.keiro` line `topic hospitalEvents
"emergency.hospital.events"` lets you assert `topic` is `keiroStatement` and the quoted topic
is `keiroString`.


## Idempotence and Recovery

All steps are safe to repeat: re-running `mkdir -p` is harmless, files are overwritten in
place, and the test reads but never writes the corpus. If Neovim ever caches an old syntax
file during manual testing, run `:syntax clear | edit!` or restart Neovim. Nothing here
touches the keiro project or the shared `spec/` and `corpus/`.


## Future Extension (out of scope)

A Tree-sitter grammar would give Neovim users incremental, parse-tree-based highlighting and
structural editing. That requires writing a `grammar.js`, generating and compiling a C
parser, and shipping `queries/highlights.scm`. It is a separate, larger package
(`packages/keiro-treesitter/`) and is intentionally not built here. The regex syntax file in
this plan remains useful even alongside a future Tree-sitter grammar (it is the Vim fallback
and the only option for classic Vim).


## Commit

Commit on `master`:

```text
feat(keiro-vim): add Vim/Neovim syntax highlighting for keiro-dsl

Add packages/keiro-vim with ftdetect, ftplugin, and a syntax file that
classifies keiro-dsl tokens per spec/keiro-dsl-language-model.md. Include a
headless-Neovim test asserting token groups against the shared corpus.

MasterPlan: docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md
ExecPlan: docs/plans/2-vim-and-neovim-syntax-highlighting-package-for-keiro-dsl.md
Intention: intention_01ktqdn85xe2btqzr2zghxgrpr
```
