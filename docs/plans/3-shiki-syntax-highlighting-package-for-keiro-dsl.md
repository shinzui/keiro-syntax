---
id: 3
slug: shiki-syntax-highlighting-package-for-keiro-dsl
title: "Shiki Syntax Highlighting Package for keiro-dsl"
kind: exec-plan
created_at: 2026-06-10T20:39:45Z
intention: "intention_01ktqdn85xe2btqzr2zghxgrpr"
master_plan: "docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md"
---

# Shiki Syntax Highlighting Package for keiro-dsl

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries,
Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.


## Purpose / Big Picture

**Shiki** is a syntax highlighter library used by documentation sites and static-site
generators to turn code blocks into colored HTML. It colors code using **TextMate grammars**
(the same grammar format VS Code uses). Out of the box Shiki knows dozens of languages but
not keiro-dsl, so a ```` ```keiro ```` code block in any Shiki-powered site today renders as
plain, uncolored text.

After this plan, there will be an installable npm package — `packages/shiki-keiro/` — that
ships a TextMate grammar for keiro-dsl plus a ready-to-use Shiki **language registration**
object. A site author writes:

```ts
import { createHighlighter } from 'shiki'
import { keiro } from 'shiki-keiro'

const highlighter = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
const html = highlighter.codeToHtml(source, { lang: 'keiro', theme: 'github-light' })
```

and gets fully colored keiro-dsl HTML. The observable proof in this plan is an automated test
that tokenizes corpus files through Shiki and asserts that specific tokens carry the expected
TextMate scope (for example, that `aggregate` carries `keyword.declaration.keiro` and a `#`
line carries `comment.line.number-sign.keiro`), plus a small demo script that writes a
colored HTML file you can open in a browser.

keiro-dsl is a small domain-specific language for event-sourced workflows; files end in
`.keiro`. You do not need to know what it means — you are classifying its tokens by pattern.
The authoritative, shared classification (which words are keywords, what scope each token
class gets) lives in `spec/keiro-dsl-language-model.md`, produced by the first plan in this
initiative. This plan implements that classification as a TextMate grammar.


## Progress

Use a checklist to summarize granular steps. Every stopping point must be documented here,
even if it requires splitting a partially completed task into two ("done" vs. "remaining").
This section must always reflect the actual current state of the work.

- [x] Scaffold `packages/shiki-keiro/` (`package.json`, `tsconfig.json`, directory layout).
- [x] Write `syntaxes/keiro.tmLanguage.json` implementing the full taxonomy.
- [x] Write `src/index.ts` exporting the Shiki `LanguageRegistration`.
- [x] Install deps and build (`bun install`, `bun run build`).
- [x] Write and pass the tokenization tests (`test/scopes.test.ts`) — 10 pass, 0 fail.
- [x] Write the demo script (`examples/demo.ts`) that emits colored HTML.
- [x] Write `packages/shiki-keiro/README.md`.
- [x] Commit with the required git trailers.


## Surprises & Discoveries

Document unexpected behaviors, bugs, optimizations, or insights discovered during
implementation. Provide concise evidence.

- `bun install` resolved `shiki@4.2.0` (the `^4.0.0` peer/dev range; the spec's reference
  machine was 4.0.2). The Shiki 4.x API used — `LanguageRegistration`, `createHighlighter({
  langs: [keiro] })`, and `codeToTokensBase(..., { includeExplanation: true })` — works as the
  plan documented.
- **Token-boundary discovery (the plan's Step 2a note in action):** `codeToTokensBase` merges
  adjacent tokens that resolve to the same theme color into a single display token (e.g.
  `prefix=` becomes one token, and a whole `"demo.events"` string is one token), while
  preserving per-grammar-match boundaries in `token.explanation[]`. Matching on
  `token.content` therefore failed for `prefix` and the bare `"`; the fix was to match at the
  `explanation[].content` level, which is the granularity at which the grammar assigns scopes.
  After this change all 10 tests pass. The grammar scopes themselves were correct from the
  start — only the test's token-lookup granularity needed adjusting.
- The modifier assertion uses `prefix` (present in `reservation.keiro` as `prefix=rsv`); the
  plan's draft asserted `from`, which does not appear in that corpus file. Recorded as a
  benign token-choice adjustment, per the plan's instruction to assert tokens that exist.
- TypeScript reports `lang: 'keiro'` as not assignable to the built-in language union and the
  test file's `bun:test`/`node:*` imports as unresolved. These are editor/language-server
  diagnostics only: the test file is outside the build's `include: ["src"]`, bun supplies its
  own types at runtime, and `'keiro'` is a valid runtime lang once registered. `bun run build`
  and `bun test` both succeed.


## Decision Log

Record every decision made while working on the plan.

- Decision: Ship the grammar as a `.tmLanguage.json` file and wrap it in a typed Shiki
  `LanguageRegistration` exported from `src/index.ts`.
  Rationale: A raw TextMate grammar is reusable by VS Code and other tools, while the wrapper
  gives Shiki users a one-import registration with `name`/`scopeName`/`aliases` filled in.
  Date: 2026-06-10

- Decision: Target the Shiki 4.x API.
  Rationale: The Shiki source on this machine
  (`/Users/shinzui/Keikaku/hub/ui-libraries/shiki-project`) is version 4.0.2. In Shiki 4,
  `LanguageRegistration` (from `@shikijs/types`, re-exported by `shiki`) is a TextMate grammar
  object extended with `name`, `scopeName`, and optional `aliases`/`displayName`; a custom
  language is passed via the `langs` array of `createHighlighter` (or `loadLanguage`); and
  per-token scopes for testing come from `codeToTokensBase(code, { lang, theme,
  includeExplanation: true })`, whose tokens expose `.explanation[].scopes[].scopeName`.
  Date: 2026-06-10


## Outcomes & Retrospective

Summarize outcomes, gaps, and lessons learned at major milestones or at completion.
Compare the result against the original purpose.

**Outcome (2026-06-10): complete and meeting the original purpose.** A `keiro` code block
rendered through Shiki now produces fully colored HTML. The npm package
`packages/shiki-keiro/` ships `syntaxes/keiro.tmLanguage.json` (scope `source.keiro`,
implementing the full taxonomy with the exact canonical scope names from
`spec/keiro-dsl-language-model.md` Section 6) and a typed `LanguageRegistration` exported from
`src/index.ts` (also re-exported as the `./grammar` path for VS Code / non-Shiki consumers).
`bun run build` produces `dist/index.js` + `dist/index.d.ts`.

**Verification.** `bun test` exits 0 with 10/10 cases passing — one assertion per mandatory
token class (comment, declaration introducer, declaration-site type name, control keyword,
modifier, boolean, primitive type, string, number, operator). `bun run demo` writes
`examples/keiro-demo.html` (145 colored spans; `context`/`id` keyword-red `#D73A49`,
`TransferReservationId` type-purple `#6F42C1`), confirming end-to-end rendering through the
real `createHighlighter` → `codeToHtml` path.

**Against scope.** The grammar includes the optional `entity.name.type.keiro`
declaration-site type-name refinement and omits the optional derivation-function scope — both
within spec. `emit` is consistently `keyword.declaration.keiro` (a deliberate lexical, not
parse-aware, simplification, as the plan noted).


## Context and Orientation

You are working in the git repository `keiro-syntax`, root
`/Users/shinzui/Keikaku/bokuno/keiro-syntax`, default branch `master` (commit directly to
it). This plan depends on the first plan,
`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md`, being complete: it produced
`spec/keiro-dsl-language-model.md` (the classification you implement, including the exact
TextMate scope names you must use) and `corpus/` (the `.keiro` files you test against). If
`spec/` or `corpus/` is missing, stop and complete that plan first.

This machine has `bun` 1.3.13 and `node` v22. You will use bun as the package manager and
test runner. The Shiki library is available locally at
`/Users/shinzui/Keikaku/hub/ui-libraries/shiki-project` (registered with the `mori` tool as
`shikijs/shiki`); you can read its source there if you need to confirm an API detail — run
`mori registry show shikijs/shiki --full` to print its path. The published package name is
`shiki` (version 4.0.2); installing it from the registry with `bun install` is expected.

Key terms:

- A **TextMate grammar** is a JSON object with a `scopeName` (here `source.keiro`), a top-level
  `patterns` array, and a `repository` of named sub-pattern groups. Each pattern has either a
  `match` (a single Oniguruma regex) or a `begin`/`end` pair, and a `name` giving the **scope**
  assigned to matched text. Shiki uses these scopes to pick colors from a theme.
- A **scope** is a dotted string like `keyword.control.keiro`. The set of scopes you assign is
  the contract defined in `spec/keiro-dsl-language-model.md` Section 6 — use those exact
  strings; the Vim package mirrors the same classification under different names, and the
  tests assert these strings literally.
- **Oniguruma** is the regex engine TextMate grammars use. It supports `\b`, character classes,
  alternation `(?:a|b)`, and lookarounds `(?<!...)` / `(?!...)`. You will use single-character
  lookbehind/lookahead to bound keywords that contain dashes.

The relevant lexical facts (repeated here so this plan is self-contained; the spec is
authoritative if they ever disagree):

- **Comments**: `#` to end of line. No block comments.
- **Strings**: double-quoted `"..."`, no escapes, single line.
- **Numbers**: integers `[0-9]+`; version tokens `v[0-9]+` (e.g. `v2`); duration tokens
  `[0-9]+[a-z]+` (e.g. `5m`, `2s`).
- **Reserved keywords** (always keywords): `context id enum rule ex aggregate regs states
  command event wire projection guard write emit goto fields status-map true false deprecated
  upcast from HOLE intake contract topic accept bind dedupe decode disposition publisher map
  workqueue queue payload retry fanout dedup enqueue seenIn workflow operation consistency body
  step await sleep child`.
- **Curated contextual keywords** (also colored as keywords): `process name input output in out
  correlate via saga stream target projections on advance dispatch schedule timer fire fireAt
  source key value run signal query project result ordering backoff outboxId messageId
  idempotencyKey discriminator schemaVersion derive of after required stable strategy policy
  prefix kind logical physical dlq table maxRetries maxAttempts delay readModel field to
  envelope` plus the dashed words `dispatch-id fired-event-id on-appended on-duplicate
  on-failed on-ok on-reject on-error not-mine unknown-status max-attempts dead-letter
  kafka-key kafka-cursor cross-check`.
- **Modifiers**: `deprecated upcast from consistency required stable strategy via policy prefix
  kind`.
- **Language constants**: `true false HOLE placeholder skip hole`.
- **Primitive types**: `Bool Int Text Time Id Maybe typeid text int`.
- **Operators**: `--> -- -> := => == != <= >= <> && || < > + = @ ! ; :`.


## Interfaces and Dependencies

Runtime: none required by consumers beyond a peer dependency on `shiki` (`^4.0.0`); the
package itself is data plus a thin typed wrapper. Dev dependencies (installed with
`bun install`): `shiki` (for the tests and types), `typescript`, and `tsup` (to bundle
`src/index.ts` to `dist/`). Tests run with `bun test` (bun's built-in test runner — no extra
dependency), importing from `shiki` directly.

The package's public interface at the end:

```ts
// packages/shiki-keiro/src/index.ts
import type { LanguageRegistration } from 'shiki'
export const keiro: LanguageRegistration   // name: 'keiro', scopeName: 'source.keiro'
export default keiro
```

and the file `packages/shiki-keiro/syntaxes/keiro.tmLanguage.json` (scope `source.keiro`),
also exported via the package's `./grammar` export path for non-Shiki consumers (VS Code).


## Plan of Work

Two milestones: first the grammar and the package build (so a consumer can register and use
it), then the tests and demo (so its correctness is proven and visible).

### Milestone 1 — Grammar and package

At the end of this milestone the package builds and exports a `keiro` language registration
that Shiki accepts, and you can visually confirm coloring via the demo (built in Milestone 2,
but you can hand-run `createHighlighter` once the grammar exists).

**Step 1a — Scaffold.** Create the package directory and files.

`packages/shiki-keiro/package.json`:

```json
{
  "name": "shiki-keiro",
  "version": "0.1.0",
  "description": "Shiki TextMate grammar and language registration for keiro-dsl (.keiro)",
  "type": "module",
  "files": ["dist", "syntaxes"],
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./grammar": "./syntaxes/keiro.tmLanguage.json"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "bun test",
    "demo": "bun run examples/demo.ts"
  },
  "peerDependencies": {
    "shiki": "^4.0.0"
  },
  "devDependencies": {
    "shiki": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0"
  }
}
```

`packages/shiki-keiro/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**Step 1b — The TextMate grammar.** Create
`packages/shiki-keiro/syntaxes/keiro.tmLanguage.json`. Implement the taxonomy from
`spec/keiro-dsl-language-model.md` Section 6 using the exact scope strings. Pattern ordering
matters: within `patterns`, at any position the earliest-starting match wins, ties broken by
list order, so put longer/more-specific patterns before shorter ones (dashed keywords before
bare keywords; the combined "introducer + type name" pattern before the bare introducer list;
multi-character operators before single-character ones). Use this grammar as the basis — it is
complete and correct for the facts above:

```json
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "keiro",
  "scopeName": "source.keiro",
  "patterns": [
    { "include": "#comments" },
    { "include": "#strings" },
    { "include": "#dashed-keywords" },
    { "include": "#decl-with-name" },
    { "include": "#introducers" },
    { "include": "#modifiers" },
    { "include": "#constants" },
    { "include": "#types" },
    { "include": "#control-keywords" },
    { "include": "#numbers" },
    { "include": "#operators" }
  ],
  "repository": {
    "comments": {
      "match": "#.*$",
      "name": "comment.line.number-sign.keiro"
    },
    "strings": {
      "name": "string.quoted.double.keiro",
      "begin": "\"",
      "end": "\""
    },
    "dashed-keywords": {
      "match": "(?<![A-Za-z0-9_-])(?:status-map|dispatch-id|fired-event-id|on-appended|on-duplicate|on-failed|on-ok|on-reject|on-error|not-mine|unknown-status|max-attempts|dead-letter|kafka-key|kafka-cursor|cross-check)(?![A-Za-z0-9_-])",
      "name": "keyword.control.keiro"
    },
    "decl-with-name": {
      "match": "\\b(aggregate|process|contract|intake|enum|command|event|workflow|operation|rule|id)\\b\\s+([A-Za-z_][A-Za-z0-9_]*)",
      "captures": {
        "1": { "name": "keyword.declaration.keiro" },
        "2": { "name": "entity.name.type.keiro" }
      }
    },
    "introducers": {
      "match": "(?<![A-Za-z0-9_])(?:context|id|enum|rule|aggregate|process|contract|intake|emit|publisher|workqueue|dispatch|workflow|operation)(?![A-Za-z0-9_])",
      "name": "keyword.declaration.keiro"
    },
    "modifiers": {
      "match": "(?<![A-Za-z0-9_])(?:deprecated|upcast|from|consistency|required|stable|strategy|via|policy|prefix|kind)(?![A-Za-z0-9_])",
      "name": "storage.modifier.keiro"
    },
    "constants": {
      "patterns": [
        {
          "match": "(?<![A-Za-z0-9_])(?:true|false)(?![A-Za-z0-9_])",
          "name": "constant.language.boolean.keiro"
        },
        {
          "match": "(?<![A-Za-z0-9_])(?:HOLE|placeholder|skip|hole)(?![A-Za-z0-9_])",
          "name": "constant.language.keiro"
        }
      ]
    },
    "types": {
      "match": "(?<![A-Za-z0-9_])(?:Bool|Int|Text|Time|Id|Maybe|typeid|text|int)(?![A-Za-z0-9_])",
      "name": "support.type.keiro"
    },
    "control-keywords": {
      "match": "(?<![A-Za-z0-9_])(?:regs|states|command|event|wire|projection|guard|write|emit|goto|fields|accept|bind|dedupe|decode|disposition|map|queue|payload|retry|fanout|dedup|enqueue|seenIn|body|step|await|sleep|child|topic|ex|name|input|output|in|out|correlate|saga|stream|target|projections|on|advance|schedule|timer|fireAt|fire|source|key|value|run|signal|query|project|result|ordering|backoff|outboxId|messageId|idempotencyKey|discriminator|schemaVersion|derive|of|after|logical|physical|dlq|table|maxRetries|maxAttempts|delay|readModel|field|to|envelope)(?![A-Za-z0-9_])",
      "name": "keyword.control.keiro"
    },
    "numbers": {
      "patterns": [
        { "match": "\\bv[0-9]+\\b", "name": "constant.numeric.keiro" },
        { "match": "\\b[0-9]+[a-zA-Z]+\\b", "name": "constant.numeric.keiro" },
        { "match": "\\b[0-9]+\\b", "name": "constant.numeric.keiro" }
      ]
    },
    "operators": {
      "match": "-->|--|->|:=|=>|==|!=|<=|>=|<>|&&|\\|\\||[<>@!+;=]",
      "name": "keyword.operator.keiro"
    }
  }
}
```

Notes on the grammar:

- `decl-with-name` is listed before `introducers` so that, for `aggregate Reservation`, the
  `aggregate` keyword and the `Reservation` type name are scoped together; `introducers` then
  handles the words that are not followed by a CamelCase type (`context`, `emit`, `publisher`,
  `workqueue`, `dispatch`). Both assign `keyword.declaration.keiro` to the introducer, so they
  agree.
- `emit` appears only in `introducers`, not in `control-keywords`, so it is consistently
  `keyword.declaration.keiro` whether it begins an emit node or appears as a transition action.
  This is a deliberate simplification (lexical, not parse-aware); record it as acceptable.
- The single-character lookbehind/lookahead `(?<![A-Za-z0-9_])...(?![A-Za-z0-9_])` is the
  Oniguruma-safe way to require whole-word matches without consuming the boundary characters.
- The `entity.name.type.keiro` and the (omitted-for-now) derivation-function scopes are the
  optional refinements from the spec; the grammar above includes the type-name one and skips
  derivation functions. That is within spec.

**Step 1c — The wrapper.** Create `packages/shiki-keiro/src/index.ts`:

```ts
import type { LanguageRegistration } from 'shiki'
import grammar from '../syntaxes/keiro.tmLanguage.json' with { type: 'json' }

/**
 * Shiki language registration for keiro-dsl.
 *
 * Usage:
 *   import { createHighlighter } from 'shiki'
 *   import { keiro } from 'shiki-keiro'
 *   const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
 *   hl.codeToHtml(src, { lang: 'keiro', theme: 'github-light' })
 */
export const keiro: LanguageRegistration = {
  ...(grammar as unknown as LanguageRegistration),
  name: 'keiro',
  scopeName: 'source.keiro',
  aliases: ['keiro-dsl'],
}

export default keiro
```

**Step 1d — Install and build.**

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro
bun install
bun run build
```

`bun run build` should produce `dist/index.js` and `dist/index.d.ts`. If `tsup` cannot embed
the JSON import, the simplest fix is to keep the runtime `import ... with { type: 'json' }`
(bun and node 22 support it) and let tsup bundle it; if you hit a bundler edge case, switch
`src/index.ts` to read the JSON at module load with `import grammar from
'../syntaxes/keiro.tmLanguage.json'` and add `"json": true` handling, or inline the grammar
object. Acceptance for this step is simply that `dist/index.js` exists and re-exports `keiro`.

### Milestone 2 — Tests and demo

At the end of this milestone, an automated test proves each token class gets its scope, and a
demo script writes a colored HTML file you can open.

**Step 2a — Tokenization test.** Create `packages/shiki-keiro/test/scopes.test.ts`. It builds
a highlighter with the custom language and asserts scopes via `codeToTokensBase(...,
{ includeExplanation: true })`. Each returned token exposes its scopes at
`token.explanation[].scopes[].scopeName`.

```ts
import { test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createHighlighter, type Highlighter } from 'shiki'
import { keiro } from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')

let hl: Highlighter

beforeAll(async () => {
  hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
})

// Collect every scope assigned to the first token whose trimmed content equals `content`.
function scopesOf(code: string, content: string): string[] | null {
  const lines = hl.codeToTokensBase(code, {
    lang: 'keiro',
    theme: 'github-light',
    includeExplanation: true,
  })
  for (const line of lines) {
    for (const tok of line) {
      if (tok.content.trim() === content) {
        return (tok.explanation ?? []).flatMap((e) => e.scopes.map((s) => s.scopeName))
      }
    }
  }
  return null
}

function expectScope(code: string, content: string, scope: string) {
  const scopes = scopesOf(code, content)
  expect(scopes, `token ${JSON.stringify(content)} not found`).not.toBeNull()
  expect(scopes).toContain(scope)
}

const reservation = readFileSync(resolve(repoRoot, 'corpus/reservation.keiro'), 'utf8')
const sampler = readFileSync(resolve(repoRoot, 'corpus/comments-and-literals.keiro'), 'utf8')

test('comments get the comment scope', () => {
  expectScope(sampler, '# keiro-dsl lexical sampler — comments, strings, numbers, durations, versions', 'comment.line.number-sign.keiro')
})

test('declaration introducers get keyword.declaration', () => {
  expectScope(reservation, 'aggregate', 'keyword.declaration.keiro')
  expectScope(reservation, 'enum', 'keyword.declaration.keiro')
})

test('declaration-site type name gets entity.name.type', () => {
  expectScope(reservation, 'Reservation', 'entity.name.type.keiro')
})

test('control keywords get keyword.control', () => {
  expectScope(reservation, 'guard', 'keyword.control.keiro')
  expectScope(reservation, 'states', 'keyword.control.keiro')
})

test('modifiers get storage.modifier', () => {
  expectScope(reservation, 'from', 'storage.modifier.keiro')
})

test('booleans get constant.language.boolean', () => {
  expectScope(reservation, 'true', 'constant.language.boolean.keiro')
})

test('primitive types get support.type', () => {
  expectScope(reservation, 'Bool', 'support.type.keiro')
})

test('strings get string.quoted.double', () => {
  // reservation has no string; use the sampler's "demo.events"
  const scopes = scopesOf(sampler, 'demo.events')
  // string body may tokenize together with quotes; assert via the opening quote instead
  expectScope(sampler, '"', 'string.quoted.double.keiro')
})

test('numbers get constant.numeric', () => {
  expectScope(reservation, '1', 'constant.numeric.keiro')
})

test('operators get keyword.operator', () => {
  expectScope(reservation, '-->', 'keyword.operator.keiro')
  expectScope(reservation, ':=', 'keyword.operator.keiro')
})
```

Adjust the exact `content` strings to match how Shiki splits tokens if a lookup returns null —
print the token list once with `console.log(JSON.stringify(hl.codeToTokensBase(reservation,
{ lang: 'keiro', theme: 'github-light' }), null, 2))` to see the boundaries, then assert on
real token contents. The string test samples the opening `"`; if Shiki merges the quote with
the body, assert on the merged token's content instead. The reserved-keyword facts are fixed,
so the scopes themselves must match exactly.

**Step 2b — Demo.** Create `packages/shiki-keiro/examples/demo.ts`:

```ts
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { createHighlighter } from 'shiki'
import { keiro } from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')
const src = readFileSync(resolve(repoRoot, 'corpus/reservation.keiro'), 'utf8')

const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
const html = hl.codeToHtml(src, { lang: 'keiro', theme: 'github-light' })

const out = resolve(here, 'keiro-demo.html')
writeFileSync(out, `<!doctype html><meta charset="utf8"><body>${html}</body>`)
console.log('wrote', out)
```

**Step 2c — README.** Create `packages/shiki-keiro/README.md` describing installation
(`bun add shiki-keiro shiki` / `npm i shiki-keiro shiki`), the usage snippet from Purpose, the
fact that the raw grammar is available at the `shiki-keiro/grammar` export for VS Code/other
tools, and how to run the tests and the demo.


## Concrete Steps

```bash
cd /Users/shinzui/Keikaku/bokuno/keiro-syntax/packages/shiki-keiro
# create files per Milestones 1-2, then:
bun install
bun run build          # produces dist/
bun test               # runs test/scopes.test.ts
bun run demo           # writes examples/keiro-demo.html
```


## Validation and Acceptance

1. **Tests pass.** From `packages/shiki-keiro/`, `bun test` exits 0 with all `scopes.test.ts`
   cases green. A passing run looks like:

   ```text
   bun test v1.3.13

   test/scopes.test.ts:
   ✓ comments get the comment scope
   ✓ declaration introducers get keyword.declaration
   ✓ declaration-site type name gets entity.name.type
   ✓ control keywords get keyword.control
   ✓ modifiers get storage.modifier
   ✓ booleans get constant.language.boolean
   ✓ primitive types get support.type
   ✓ strings get string.quoted.double
   ✓ numbers get constant.numeric
   ✓ operators get keyword.operator

    10 pass
    0 fail
   ```

   These assertions cover every mandatory token class. If a test fails because a token lookup
   returned null, it means Shiki split that token differently than assumed — print the token
   list (Step 2a note) and fix the asserted `content`, not the grammar, unless the *scope* is
   wrong (then fix the grammar).

2. **The demo renders.** `bun run demo` prints `wrote .../examples/keiro-demo.html`. Open that
   file in a browser; `aggregate`, `command`, `event`, `guard`, `goto` appear in the keyword
   color, `Reservation`/`TransferReservationId` as types, `1` as a number, `-->`/`:=`/`=>` as
   operators, and (in the sampler) `#` lines as comments and `"..."` as strings.

3. **Consumer integration.** The usage snippet in Purpose works against the built `dist/`:
   from a scratch script, `import { keiro } from 'shiki-keiro'` (or from the local path during
   development) and `createHighlighter({ langs: [keiro] })` succeeds and `codeToHtml(..., {
   lang: 'keiro' })` returns colored HTML rather than throwing "language not found".


## Idempotence and Recovery

`bun install`, `bun run build`, and `bun test` are all safe to repeat. The build writes only
to `dist/`; the demo writes only to `examples/keiro-demo.html`; the tests read but never write
the corpus. If `bun install` fails because the registry is unreachable, the grammar JSON is
still valid and reusable on its own (it does not depend on Shiki at all) — the wrapper and
tests are the only parts needing the `shiki` dependency. Nothing here touches the keiro project
or the shared `spec/`/`corpus/`.


## Commit

Commit on `master`:

```text
feat(shiki-keiro): add Shiki/TextMate syntax highlighting for keiro-dsl

Add packages/shiki-keiro shipping syntaxes/keiro.tmLanguage.json and a typed
Shiki LanguageRegistration. Classification follows
spec/keiro-dsl-language-model.md. Include bun tokenization tests asserting
scopes against the shared corpus and an HTML demo script.

MasterPlan: docs/masterplans/1-keiro-dsl-syntax-highlighting-for-vim-and-shiki.md
ExecPlan: docs/plans/3-shiki-syntax-highlighting-package-for-keiro-dsl.md
Intention: intention_01ktqdn85xe2btqzr2zghxgrpr
```
