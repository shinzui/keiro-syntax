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
