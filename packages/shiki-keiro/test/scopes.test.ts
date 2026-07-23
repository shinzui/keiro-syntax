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

// The reserved-keyword list from Section 3 of spec/keiro-dsl-language-model.md, which is a
// verbatim copy of `reservedWords` in the keiro-dsl parser. Read it out of the spec rather
// than duplicating it here, so the spec stays the single source and a word added there
// without a matching grammar rule fails this suite by name.
function reservedWordsFromSpec(): string[] {
  const spec = readFileSync(resolve(repoRoot, 'spec/keiro-dsl-language-model.md'), 'utf8')
  const lines = spec.split('\n')
  const start = lines.findIndex((l) => l.startsWith('## Section 3'))
  if (start < 0) throw new Error('spec has no "## Section 3" heading')
  const open = lines.indexOf('```text', start)
  if (open < 0) throw new Error('Section 3 has no ```text fenced block')
  const close = lines.indexOf('```', open + 1)
  if (close < 0) throw new Error('Section 3 fenced block is unterminated')
  return lines
    .slice(open + 1, close)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
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

// --- Reserved-word coverage guard (keiro-dsl 75286d7) ------------------------
//
// `retiring` joined the parser's `reservedWords` in keiro-dsl 75286d7 without changing how
// the word is spelled or where it may appear, so this range needed no grammar edit. The
// standing risk it exposes is that the *next* word to join the list would simply not be in
// the grammar, and no hand-named assertion would notice. These two tests close that gap.

test('the spec Section 3 list holds the parser 71 reserved words', () => {
  expect(reservedWordsFromSpec().length).toBe(71)
})

test('every reserved word is classified as a keyword by the grammar', () => {
  // A one-word document is enough: apart from strings and comments — neither of which a bare
  // word can start — the grammar carries no state between tokens.
  const unclassified = reservedWordsFromSpec()
    .map((word) => {
      const scopes = scopesOf(word, word)
      return { word, scopes }
    })
    .filter(({ scopes }) => !(scopes ?? []).some((s) => KEYWORDISH_SCOPES.has(s)))
    .map(({ word, scopes }) => `${word}: ${JSON.stringify(scopes)}`)
  // Assert on the collected list rather than per word, so a run that has drifted by several
  // words names all of them at once.
  expect(unclassified).toEqual([])
})
