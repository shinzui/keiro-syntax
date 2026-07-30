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

// Collect every scope assigned to the first sub-token whose trimmed content equals
// `content`. Shiki merges adjacent same-color tokens into one display token but preserves
// the per-match boundaries in `explanation[]`, so we match at the explanation level — that
// is the granularity at which the grammar assigns scopes.
function scopesOf(code: string, content: string): string[] | null {
  const lines = hl.codeToTokensBase(code, {
    lang: 'keiro',
    theme: 'github-light',
    includeExplanation: true,
  })
  for (const line of lines) {
    for (const tok of line) {
      for (const e of tok.explanation ?? []) {
        if (e.content.trim() === content) {
          return e.scopes.map((s) => s.scopeName)
        }
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

// Every scope in the grammar that means "this word is a keyword of some kind" — the union of
// Section 6's Declaration introducer, Control / section keyword, Modifier, and Language
// constant rows. The reserved-word guard below asserts membership in this set rather than a
// specific scope: Section 6 deliberately splits the reserved words across those four classes,
// and pinning each word to one of them would freeze the split instead of catching the failure
// that matters (a reserved word falling through to plain identifier text).
const KEYWORDISH_SCOPES = new Set([
  'keyword.declaration.keiro',
  'keyword.control.keiro',
  'storage.modifier.keiro',
  'constant.language.keiro',
  'constant.language.boolean.keiro',
])

// Collect the words out of the first `count` ```text fenced blocks under a "## Section N"
// heading in spec/keiro-dsl-language-model.md. Reading the word lists out of the spec rather
// than duplicating them here keeps the spec the single source: a word added there without a
// matching grammar rule fails this suite by name.
//
// `count` matters because Section 4 has a *third* fenced block — the `replay-only` worked
// example, which is .keiro code and not a word list. Taking only the leading blocks skips it
// structurally, without having to recognize prose or code by content.
function wordBlocksFromSpec(heading: string, count: number): string[][] {
  const spec = readFileSync(resolve(repoRoot, 'spec/keiro-dsl-language-model.md'), 'utf8')
  const lines = spec.split('\n')
  const start = lines.findIndex((l) => l.startsWith(heading))
  if (start < 0) throw new Error(`spec has no "${heading}" heading`)
  const blocks: string[][] = []
  for (let i = start + 1; i < lines.length && blocks.length < count; i++) {
    if (lines[i].startsWith('## Section')) break
    if (lines[i] !== '```text') continue
    const close = lines.indexOf('```', i + 1)
    if (close < 0) throw new Error(`${heading} fenced block is unterminated`)
    blocks.push(
      lines
        .slice(i + 1, close)
        .join(' ')
        .split(/\s+/)
        .filter(Boolean),
    )
    i = close
  }
  if (blocks.length < count) {
    throw new Error(`${heading} has ${blocks.length} \`\`\`text blocks, expected ${count}`)
  }
  return blocks
}

// Section 3 — the verbatim copy of `reservedWords` in the keiro-dsl parser.
function reservedWordsFromSpec(): string[] {
  return wordBlocksFromSpec('## Section 3', 1)[0]
}

// Section 4 — the curated contextual keywords: the bare grid, then the dashed sub-block.
function contextualWordsFromSpec(): { bare: string[]; dashed: string[] } {
  const [bare, dashed] = wordBlocksFromSpec('## Section 4', 2)
  return { bare, dashed }
}

// Check that each word is claimed as a keyword *in its entirety* by a single rule, and return
// a human-readable line for each one that is not.
//
// Requiring one whole token, rather than just "some scope somewhere in the word", is what
// catches a dashed keyword whose leading segment is a bare keyword: if `#dashed-keywords`
// ever stopped winning the same-position tie against `#control-keywords`, `on-ok` would
// tokenize as `on` (a keyword) plus `-ok` (plain text) and a looser check would pass. The Vim
// package had exactly that defect for `on-*`, `shape-hash`, and `dedupe-only` before the
// reconciliation of keiro-dsl 430c3d2.
//
// A one-word document is enough input: apart from strings and comments — neither of which a
// bare word can start — the grammar carries no state between tokens.
function classifyFailures(words: string[]): string[] {
  const failures: string[] = []
  for (const word of words) {
    const lines = hl.codeToTokensBase(word, {
      lang: 'keiro',
      theme: 'github-light',
      includeExplanation: true,
    })
    const parts = (lines[0] ?? []).flatMap((t) => t.explanation ?? [])
    const whole = parts.length === 1 && parts[0]?.content === word
    const scopes = parts.flatMap((p) => p.scopes.map((s) => s.scopeName))
    if (!whole) {
      failures.push(
        `${word}: split into ${JSON.stringify(parts.map((p) => p.content))} — a bare-word rule ` +
          `is shadowing the whole spelling`,
      )
    } else if (!scopes.some((s) => KEYWORDISH_SCOPES.has(s))) {
      failures.push(`${word}: ${JSON.stringify(scopes)}`)
    }
  }
  return failures
}

const reservation = readFileSync(resolve(repoRoot, 'corpus/reservation.keiro'), 'utf8')
const sampler = readFileSync(resolve(repoRoot, 'corpus/comments-and-literals.keiro'), 'utf8')
const surface = readFileSync(resolve(repoRoot, 'corpus/router-readmodel-snapshot.keiro'), 'utf8')
const replayOnly = readFileSync(
  resolve(repoRoot, 'corpus/reservation-guard-tightened-twin.keiro'),
  'utf8',
)
const retiring = readFileSync(resolve(repoRoot, 'corpus/reservation-retiring.keiro'), 'utf8')
const deprecatedReplayOnly = readFileSync(
  resolve(repoRoot, 'corpus/reservation-deprecated-replay-only.keiro'),
  'utf8',
)
const mappedTypes = readFileSync(resolve(repoRoot, 'corpus/consumer-mapped-types.keiro'), 'utf8')
const mappedSpellings = readFileSync(
  resolve(repoRoot, 'corpus/mapped-type-spellings.keiro'),
  'utf8',
)

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
  // `prefix` (in `prefix=rsv`) is the modifier present in reservation.keiro.
  expectScope(reservation, 'prefix', 'storage.modifier.keiro')
})

test('booleans get constant.language.boolean', () => {
  expectScope(reservation, 'true', 'constant.language.boolean.keiro')
})

test('primitive types get support.type', () => {
  expectScope(reservation, 'Bool', 'support.type.keiro')
})

test('strings get string.quoted.double', () => {
  // reservation has no string; assert via the sampler's opening quote.
  expectScope(sampler, '"', 'string.quoted.double.keiro')
})

test('numbers get constant.numeric', () => {
  expectScope(reservation, '1', 'constant.numeric.keiro')
})

test('operators get keyword.operator', () => {
  expectScope(reservation, '-->', 'keyword.operator.keiro')
  expectScope(reservation, ':=', 'keyword.operator.keiro')
})

// --- Current lexical surface (20 new reserved words, escapes, decimals) ------

test('new node introducers get keyword.declaration', () => {
  expectScope(surface, 'router', 'keyword.declaration.keiro')
  expectScope(surface, 'readmodel', 'keyword.declaration.keiro')
})

test('new reserved control words get keyword.control', () => {
  expectScope(surface, 'snapshot', 'keyword.control.keiro')
  expectScope(surface, 'resolve', 'keyword.control.keiro')
  expectScope(surface, 'continueAsNew', 'keyword.control.keiro')
})

test('dashed reserved words get keyword.control', () => {
  expectScope(surface, 'dispatch-each', 'keyword.control.keiro')
  expectScope(surface, 'read-model', 'keyword.control.keiro')
})

test('string escapes get constant.character.escape', () => {
  expectScope(surface, '\\n', 'constant.character.escape.keiro')
})

test('fractional decimals get constant.numeric', () => {
  expectScope(surface, '1.5', 'constant.numeric.keiro')
})

// --- The `replay-only` transition prefix (keiro-dsl 6c2c8fc) -----------------

test('the replay-only transition marker gets storage.modifier', () => {
  // Matching the trimmed content `replay-only` proves one rule claimed the whole
  // dashed spelling rather than `replay` and `only` falling through separately.
  expectScope(replayOnly, 'replay-only', 'storage.modifier.keiro')
})

test('a replay-only transition still highlights its clauses', () => {
  expectScope(replayOnly, 'guard', 'keyword.control.keiro')
  expectScope(replayOnly, '==', 'keyword.operator.keiro')
})

// --- The `retiring` event prefix (keiro-dsl 451acf2) -------------------------

test('the retiring event prefix gets storage.modifier', () => {
  expectScope(retiring, 'retiring', 'storage.modifier.keiro')
})

test('an event prefix does not disturb the declaration it qualifies', () => {
  // `#modifiers` claims `retiring` at its own column, which is left of `event`, so it wins
  // on position; `#decl-with-name` then still claims the type name on the same line.
  expectScope(retiring, 'TransferReservationConfirmed', 'entity.name.type.keiro')
})

test('the deprecated event prefix is scoped like retiring', () => {
  expectScope(deprecatedReplayOnly, 'deprecated', 'storage.modifier.keiro')
  expectScope(deprecatedReplayOnly, 'replay-only', 'storage.modifier.keiro')
})

// --- Consumer-owned mapped types (keiro-dsl 430c3d2) -------------------------
//
// `mapped structural record|enum|union` and `mapped opaque` declare a Haskell type owned by
// another package plus its wire encoding. One assertion per token class, so a failure names
// the class that broke rather than just "a word is grey".

test('the mapped declaration introducer gets keyword.declaration', () => {
  expectScope(mappedTypes, 'mapped', 'keyword.declaration.keiro')
})

test('the mapped family and shape words get storage.modifier', () => {
  expectScope(mappedTypes, 'structural', 'storage.modifier.keiro')
  expectScope(mappedTypes, 'record', 'storage.modifier.keiro')
  expectScope(mappedTypes, 'union', 'storage.modifier.keiro')
  expectScope(mappedTypes, 'opaque', 'storage.modifier.keiro')
  // `optional` is `required`'s partner on a wire field, so it shares its class.
  expectScope(mappedTypes, 'optional', 'storage.modifier.keiro')
  expectScope(mappedTypes, 'required', 'storage.modifier.keiro')
})

test('the name after a mapped shape word gets entity.name.type', () => {
  // Proves #mapped-decl-with-name won the same-position tie against #modifiers: the shape
  // word keeps its modifier scope (asserted above) *and* the name is claimed.
  expectScope(mappedTypes, 'ArtifactInfo', 'entity.name.type.keiro')
  expectScope(mappedTypes, 'VendorGeometry', 'entity.name.type.keiro')
})

test('mapped clause labels and wire values get keyword.control', () => {
  expectScope(mappedTypes, 'haskell', 'keyword.control.keiro')
  expectScope(mappedTypes, 'package', 'keyword.control.keiro')
  expectScope(mappedTypes, 'constructor', 'keyword.control.keiro')
  expectScope(mappedTypes, 'as', 'keyword.control.keiro')
  expectScope(mappedTypes, 'reject', 'keyword.control.keiro')
  expectScope(mappedSpellings, 'ignore', 'keyword.control.keiro')
})

test('dashed mapped clause labels get keyword.control as one whole word', () => {
  // Matching the trimmed content proves one rule claimed the whole dashed spelling rather
  // than the leading segment being taken by a bare-word rule.
  expectScope(mappedTypes, 'binding-version', 'keyword.control.keiro')
  expectScope(mappedTypes, 'canonical-type', 'keyword.control.keiro')
  expectScope(mappedTypes, 'unknown-fields', 'keyword.control.keiro')
  expectScope(mappedTypes, 'tagged-object', 'keyword.control.keiro')
  expectScope(mappedTypes, 'on-missing', 'keyword.control.keiro')
})

test('the mapped wire type spellings get support.type', () => {
  expectScope(mappedTypes, 'Natural', 'support.type.keiro')
  expectScope(mappedTypes, 'Json', 'support.type.keiro')
  expectScope(mappedTypes, 'Optional', 'support.type.keiro')
  expectScope(mappedTypes, 'List', 'support.type.keiro')
  expectScope(mappedTypes, 'Map', 'support.type.keiro')
  expectScope(mappedSpellings, 'UTCTime', 'support.type.keiro')
})

test('the on-missing null sentinel gets constant.language', () => {
  // The general language-constant scope, not the boolean-specific one.
  expectScope(mappedTypes, 'null', 'constant.language.keiro')
  expectScope(mappedTypes, 'false', 'constant.language.boolean.keiro')
})

test('a mapped declaration does not disturb the aggregate below it', () => {
  expectScope(mappedTypes, 'aggregate', 'keyword.declaration.keiro')
  expectScope(mappedTypes, 'guard', 'keyword.control.keiro')
  expectScope(mappedTypes, ':=', 'keyword.operator.keiro')
})

test('mapped keywords inside a comment stay a comment', () => {
  // The whole line is one comment token even though it names five keywords, which proves
  // #comments is still reached before every bare-word rule.
  expectScope(
    mappedSpellings,
    '# Every keyword in this comment — mapped, record, wire, optional, Natural — must stay',
    'comment.line.number-sign.keiro',
  )
})

// --- Spec word-list coverage guards -----------------------------------------
//
// `retiring` joined the parser's `reservedWords` in keiro-dsl 75286d7 without changing how
// the word is spelled or where it may appear, so that range needed no grammar edit. The
// standing risk it exposed is that the *next* word to join a spec word list would simply not
// be in the grammar, and no hand-named assertion would notice. keiro-dsl 430c3d2 then added
// 33 words at once, 26 of them to Section 4 — which had no guard at all. These tests close
// both gaps: every word in Section 3 and in Section 4's two lists must be classified as a
// keyword of some kind by the grammar.
//
// The check is deliberately loose about *which* class. Section 6 splits these words across
// four of them and lets the two packages differ in one known place, so pinning each word to
// one class would freeze the split instead of catching the failure that matters: a keyword
// rendering as plain identifier text.

test('the spec Section 3 list holds the parser 72 reserved words', () => {
  expect(reservedWordsFromSpec().length).toBe(72)
})

test('the spec Section 4 lists 96 bare and 31 dashed contextual keywords', () => {
  const { bare, dashed } = contextualWordsFromSpec()
  expect(bare.length).toBe(96)
  expect(dashed.length).toBe(31)
})

test('every reserved word is classified as a keyword by the grammar', () => {
  // A one-word document is enough: apart from strings and comments — neither of which a bare
  // word can start — the grammar carries no state between tokens.
  //
  // Assert on the collected list rather than per word, so a run that has drifted by several
  // words names all of them at once.
  expect(classifyFailures(reservedWordsFromSpec())).toEqual([])
})

test('every curated contextual keyword is classified as a keyword by the grammar', () => {
  const { bare, dashed } = contextualWordsFromSpec()
  expect(classifyFailures([...bare, ...dashed])).toEqual([])
})
