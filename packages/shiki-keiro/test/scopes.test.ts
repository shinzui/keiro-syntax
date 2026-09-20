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

// Assert that one grammar rule claims `content` *in its entirety* — not that some rule
// claimed its leading characters.
//
// `expectScope` above finds the first explanation entry whose trimmed content equals
// `content`, so it can only ever see a token the grammar already emitted whole; it is silent
// about a literal that got split. `1.5` is the case that matters: an engine that prefers the
// plain-integer rule emits `1`, `.`, `5` and a first-character check still reports
// `constant.numeric.keiro`. The Vim package shipped exactly that defect from plan 4 until the
// reconciliation of keiro-dsl da09736. Here we walk every explanation entry on the line and
// require the one containing `content` to be exactly `content`.
//
// The optional `anchor` restricts the search to lines that contain it. Needed when the token
// under test also appears earlier in the file inside a comment — `corpus/language-preamble.keiro`
// deliberately names `language` and `keiro-dsl` in its banner so the comment-wins check has
// something to bite on, and without an anchor this helper would report the banner as a "split"
// token and fail for the wrong reason.
function expectWholeToken(code: string, content: string, scope: string, anchor?: string) {
  const lines = hl.codeToTokensBase(code, {
    lang: 'keiro',
    theme: 'github-light',
    includeExplanation: true,
  })
  for (const line of lines) {
    const parts = line.flatMap((t) => t.explanation ?? [])
    if (anchor && !parts.map((p) => p.content).join('').includes(anchor)) continue
    const at = parts.findIndex((p) => p.content.includes(content))
    if (at < 0) continue
    expect(
      parts[at]!.content,
      `token ${JSON.stringify(content)} was split — the rule that should claim it whole is ` +
        `losing to a shorter one; line tokenized as ${JSON.stringify(parts.map((p) => p.content))}`,
    ).toBe(content)
    expect(parts[at]!.scopes.map((s) => s.scopeName)).toContain(scope)
    return
  }
  throw new Error(`token ${JSON.stringify(content)} not found`)
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
const scalarTypes = readFileSync(resolve(repoRoot, 'corpus/aggregate-scalar-types.keiro'), 'utf8')
const preamble = readFileSync(resolve(repoRoot, 'corpus/language-preamble.keiro'), 'utf8')
const nominalBindings = readFileSync(
  resolve(repoRoot, 'corpus/consumer-nominal-bindings.keiro'),
  'utf8',
)
const scalarExpressions = readFileSync(
  resolve(repoRoot, 'corpus/aggregate-scalar-expressions.keiro'),
  'utf8',
)
const implementationHole = readFileSync(
  resolve(repoRoot, 'corpus/transition-implementation-hole.keiro'),
  'utf8',
)
const collisions = readFileSync(
  resolve(repoRoot, 'corpus/language-identifier-collisions.keiro'),
  'utf8',
)
const versionThree = readFileSync(resolve(repoRoot, 'corpus/language-version-3.keiro'), 'utf8')
const versionFour = readFileSync(resolve(repoRoot, 'corpus/language-version-4.keiro'), 'utf8')
const fieldAliases = readFileSync(resolve(repoRoot, 'corpus/field-aliases.keiro'), 'utf8')
const languageFive = readFileSync(
  resolve(repoRoot, 'corpus/language-version-5-projection-catalog.keiro'),
  'utf8',
)
const languageSix = readFileSync(
  resolve(repoRoot, 'corpus/language-version-6-reactions-and-selection.keiro'),
  'utf8',
)
const bareContainers = readFileSync(
  resolve(repoRoot, 'corpus/consumer-mapped-bare-containers.keiro'),
  'utf8',
)
const workflowSignal = readFileSync(
  resolve(repoRoot, 'corpus/workflow-signal-mismatch.keiro'),
  'utf8',
)
const calendarDays = readFileSync(resolve(repoRoot, 'corpus/mapped-calendar-days.keiro'), 'utf8')

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

// --- Widened aggregate type slots (keiro-dsl da09736) ------------------------
//
// `pRegDecl` and the new `pAggregateField` swapped a bare identifier for the full
// `pMappedTypeExpr` grammar, so the ten type spellings that used to appear only inside a
// `mapped` declaration's wire block now appear in an aggregate's `regs` block and in its
// command/event field lists. #types matches them unconditionally, so this needed no grammar
// change — these assertions exist to keep it that way. Scoping #types by context would
// uncolor every aggregate written after this commit and nothing else would notice.

test('a register type expression gets support.type', () => {
  // `Time`, `Natural`, `Int`, and `Bool` appear in this file only in the `regs` block, so
  // finding them at all proves the register slot is covered. (`Text` is deliberately absent
  // from this list: it also appears in the `mapped` block above the aggregate, so its first
  // occurrence would not prove anything about the register slot.)
  expectScope(scalarTypes, 'Time', 'support.type.keiro')
  expectScope(scalarTypes, 'Natural', 'support.type.keiro')
  expectScope(scalarTypes, 'Int', 'support.type.keiro')
  expectScope(scalarTypes, 'Bool', 'support.type.keiro')
})

test('an aggregate command/event field type expression gets support.type', () => {
  // `UTCTime`, `Json`, and the three one-argument constructors appear only in the field
  // lists of this file, so finding them at all proves the field slot is covered.
  expectScope(scalarTypes, 'UTCTime', 'support.type.keiro')
  expectScope(scalarTypes, 'Json', 'support.type.keiro')
  expectScope(scalarTypes, 'Optional', 'support.type.keiro')
  expectScope(scalarTypes, 'List', 'support.type.keiro')
  expectScope(scalarTypes, 'Map', 'support.type.keiro')
})

test('a mapped-type reference in an aggregate slot still names a type', () => {
  // `LedgerNote` is the `mapped structural record` above the aggregate; #mapped-decl-with-name
  // claims the declaration site, and the register and field that reference it tokenize plainly.
  expectScope(scalarTypes, 'LedgerNote', 'entity.name.type.keiro')
})

test('the widened slots do not disturb the aggregate around them', () => {
  expectScope(scalarTypes, 'aggregate', 'keyword.declaration.keiro')
  expectScope(scalarTypes, 'regs', 'keyword.control.keiro')
  expectScope(scalarTypes, 'states', 'keyword.control.keiro')
  expectScope(scalarTypes, 'write', 'keyword.control.keiro')
  expectScope(scalarTypes, 'guard', 'keyword.control.keiro')
  // `command` and `event` are deliberately absent: #decl-with-name claims them together with
  // the name that follows, so they carry `keyword.declaration.keiro` here rather than the
  // control scope Section 6 gives them on their own. That is pre-existing behaviour, shared
  // with every other `command X` in the corpus, and not something this range changed.
  expectScope(scalarTypes, ':=', 'keyword.operator.keiro')
  expectScope(scalarTypes, 'placeholder', 'constant.language.keiro')
})

test('type keywords inside a comment stay a comment', () => {
  expectScope(
    scalarTypes,
    '# regs, command, event, Natural, Optional, Map — must stay Comment, not keyword.',
    'comment.line.number-sign.keiro',
  )
})

test('a fractional number is one whole token, signed or not', () => {
  // The guard the Vim package needed. `-` is not an operator in either package (Section 5
  // lists `-->`, `--`, and `->` but no bare `-`), so a signed initializer is an uncolored `-`
  // followed by one whole number token.
  expectWholeToken(scalarTypes, '1.5', 'constant.numeric.keiro')
  expectWholeToken(surface, '1.5', 'constant.numeric.keiro')
  // The other two multi-character numeric forms, so a future reordering of #numbers cannot
  // trade one whole token for another.
  expectWholeToken(surface, '2s', 'constant.numeric.keiro')
  expectWholeToken(surface, 'v2', 'constant.numeric.keiro')
})

// --- The language version preamble (keiro-dsl 4523b52) -----------------------
//
// A `.keiro` source may now open with `language keiro-dsl <positive-decimal>`, the only clause
// that sits above `context`. Both words are new to the grammar; neither is reserved.

test('the language version preamble gets keyword.declaration', () => {
  expectScope(preamble, 'language', 'keyword.declaration.keiro')
})

test('the preamble dialect name gets keyword.control as one whole token', () => {
  // The point is that `keiro-dsl` is ONE explanation entry. If #dashed-keywords stopped
  // claiming it, the line would tokenize as plain text and this fails on the split.
  expectWholeToken(preamble, 'keiro-dsl', 'keyword.control.keiro', 'language keiro-dsl 1')
})

test('the preamble version is an ordinary number', () => {
  // No separate version token class: `lexeme (some asciiDigit)` upstream, Number here. The
  // preamble is the file's first digit, so the first `1` found is the version.
  expectScope(preamble, '1', 'constant.numeric.keiro')
})

test('a preamble does not disturb the header clauses below it', () => {
  expectScope(preamble, 'context', 'keyword.declaration.keiro')
  expectScope(preamble, 'module', 'keyword.control.keiro')
  expectScope(preamble, 'layout', 'keyword.control.keiro')
  expectScope(preamble, 'prefixed', 'keyword.control.keiro')
  expectScope(preamble, 'aggregate', 'keyword.declaration.keiro')
  expectScope(preamble, 'regs', 'keyword.control.keiro')
  expectScope(preamble, 'Natural', 'support.type.keiro')
  expectScope(preamble, ':=', 'keyword.operator.keiro')
})

test('a comment banner above the preamble stays a comment', () => {
  // The parser strips comments before deciding which line is first, so the preamble is legal
  // below this banner — and the banner names both new words, which must stay Comment.
  expectScope(
    preamble,
    '# deciding which line is first. Every word named in this comment — language, keiro-dsl,',
    'comment.line.number-sign.keiro',
  )
})

// --- A third released language version (keiro-dsl e41e989) -------------------
//
// Upstream released version 3, bound to the SAME body grammar as version 2. So version 3 adds
// no spelling; what it adds is a semantic rule on `id … prefix=` values, which no highlighter
// models. These tests exist because until now the corpus only ever wrote `1` or `2` in a
// preamble — a grammar that special-cased those two digits would have passed everything.

test('the version-3 preamble version is an ordinary number', () => {
  // The preamble is on line 1 of this corpus file, so the first `3` found is the version.
  expectScope(versionThree, '3', 'constant.numeric.keiro')
})

test('the version-3 preamble words keep their preamble classes', () => {
  expectScope(versionThree, 'language', 'keyword.declaration.keiro')
  expectWholeToken(versionThree, 'keiro-dsl', 'keyword.control.keiro', 'language keiro-dsl 3')
})

test('a version-3 body colours exactly like a version-2 body', () => {
  // Every one of these is version-2-gated surface asserted elsewhere over a `2` preamble
  // (see the scalar-expression tests below). Under a `3` it must not move.
  expectWholeToken(versionThree, 'Integer', 'support.type.keiro', 'balance Integer = 0')
  expectWholeToken(versionThree, 'reg', 'keyword.control.keiro', 'guard reg.balance')
  expectWholeToken(versionThree, 'cmd', 'keyword.control.keiro', 'guard reg.balance')
  expectScope(versionThree, ':=', 'keyword.operator.keiro')
  expectScope(versionThree, 'guard', 'keyword.control.keiro')
  expectScope(versionThree, 'aggregate', 'keyword.declaration.keiro')
})

test('a version-3 nominal binding colours like any other nominal binding', () => {
  expectWholeToken(versionThree, 'nominal', 'storage.modifier.keiro', 'mapped nominal EntryLabel')
  expectWholeToken(versionThree, 'using', 'keyword.control.keiro', 'id LedgerId prefix=ledger')
  expectScope(versionThree, 'prefix', 'storage.modifier.keiro')
})

// --- The stable fourth language version (keiro-dsl b49b11f, cd22e7f) ---------
//
// keiro-dsl b49b11f marked version 4 the one `Stable` registry entry and versions 1-3
// `CompatibilityOnly`, and changed `Keiro/Dsl/Skeleton.hs` so every `keiro new <kind>` starter
// file opens `language keiro-dsl 4`. cd22e7f then migrated upstream's 225-file fixture corpus
// onto it. When these tests were written version 4 bound the SAME body grammar and syntax
// profile as versions 2 and 3; keiro-dsl b31896cf has since rebound it to syntax profile 3,
// whose one feature is the field-alias clause covered by the field-alias tests below — this
// corpus file deliberately contains only version-2 surface, so nothing here moves. These
// assertions exist because `4` is now the version an editor will meet most often and the
// corpus had never carried it, and because the migration made the qualified enum member the
// standard way to write an enum operand.

test('the version-4 preamble version is an ordinary number', () => {
  // The preamble is on line 1 of this corpus file, so the first `4` found is the version.
  expectScope(versionFour, '4', 'constant.numeric.keiro')
})

test('the version-4 preamble words keep their preamble classes', () => {
  expectScope(versionFour, 'language', 'keyword.declaration.keiro')
  expectWholeToken(versionFour, 'keiro-dsl', 'keyword.control.keiro', 'language keiro-dsl 4')
})

test('a version-4 body colours exactly like a version-2 body', () => {
  // Every one of these is version-2-gated surface asserted elsewhere over a `2` preamble. The
  // stable/compatibility-only split is a registry fact, so under a `4` none of it may move.
  expectWholeToken(versionFour, 'Integer', 'support.type.keiro', 'balance Integer       = 0')
  expectWholeToken(versionFour, 'cmd', 'keyword.control.keiro', 'guard cmd.amount')
  expectWholeToken(versionFour, 'reg', 'keyword.control.keiro', 'guard cmd.amount')
  expectScope(versionFour, ':=', 'keyword.operator.keiro')
  expectScope(versionFour, 'guard', 'keyword.control.keiro')
  expectScope(versionFour, 'aggregate', 'keyword.declaration.keiro')
})

test('a qualified enum member is a plain qualified name', () => {
  // The spelling upstream's migration made standard: `guard divertStatus != TotalDivert` became
  // `guard cmd.divertStatus != DivertStatus.TotalDivert`. It reached this corpus once, as
  // `TicketStatus.Open` in transition-implementation-hole.keiro, and neither suite asserted it.
  //
  // The property under test is a *negative* one, and it is the other half of the follow-`.`
  // decision the two tests above exercise. `cmd` and `reg` become keywords precisely because a
  // `.` follows them; an enum type name in the same position must not. Nothing here should be
  // claimed by any rule — not the qualifier, not the member, not the dot.
  const scopes = scopesOf(versionFour, 'EntryStatus.Active')
  expect(scopes, 'the qualified enum member was not found in corpus/language-version-4.keiro').not.toBeNull()
  expect(scopes!.filter((s) => KEYWORDISH_SCOPES.has(s))).toEqual([])
  // The declaration site is different: there `EntryStatus` is a declared type name.
  expectScope(versionFour, 'EntryStatus', 'entity.name.type.keiro')
})

// --- Field aliases (keiro-dsl b31896cf) --------------------------------------
//
// Under `language keiro-dsl 4` — which that commit rebound to the new syntax profile 3, whose
// one feature is FieldAliasSyntax — a field of an aggregate command/event or of a contract
// event may carry `haskell <selector>` and `as "<wire-key>"` between its name and its `:`
// type. Both markers are mapped-type words this grammar has matched unconditionally since
// keiro-dsl 430c3d2, the selector is a plain identifier, and the wire key an ordinary string,
// so no rule changed for this range; these assertions exist to keep the markers coloured in
// the clause's two new grammatical homes.
//
// One helper caveat shapes these tests: expectWholeToken cannot be pointed at `as`, because
// its find step matches by substring inclusion and `as` is a substring of `haskell`, which
// precedes it on every full-alias line. `as` is asserted with expectScope instead, whose find
// step requires trimmed equality — and corpus/field-aliases.keiro orders its fields so the
// file's first bare `as` is the alias marker, not the field named `as` further down.

test('the field alias markers get keyword.control in an aggregate field list', () => {
  expectWholeToken(fieldAliases, 'haskell', 'keyword.control.keiro', 'type haskell payloadType:Text')
  expectScope(fieldAliases, 'as', 'keyword.control.keiro')
})

test('the field alias markers get keyword.control in a contract field', () => {
  expectWholeToken(fieldAliases, 'haskell', 'keyword.control.keiro', 'type haskell payloadType: text')
})

test('the alias selector identifier stays plain', () => {
  // `serviceRegion` sits between the two claimed marker tokens, so it is its own unclaimed
  // explanation entry. Nothing should claim it: it is a user-chosen Haskell selector name.
  const scopes = scopesOf(fieldAliases, 'serviceRegion')
  expect(scopes, 'the selector was not found in corpus/field-aliases.keiro').not.toBeNull()
  expect(scopes!.filter((s) => KEYWORDISH_SCOPES.has(s))).toEqual([])
})

test('the alias wire key is an ordinary string', () => {
  expectWholeToken(fieldAliases, 'region_code', 'string.quoted.double.keiro')
})

test('a field alias leaves its neighbours undisturbed', () => {
  // The aliased field named `type` keeps the keyword colour the word has everywhere
  // (Section 1's rule — upstream's own fixture leans on it), the types on both sides of the
  // clause still colour, and the aggregate and contract around the aliases still tokenize.
  expectWholeToken(fieldAliases, 'type', 'keyword.control.keiro', 'type haskell payloadType:Text')
  expectScope(fieldAliases, 'Text', 'support.type.keiro')
  expectScope(fieldAliases, 'aggregate', 'keyword.declaration.keiro')
  expectScope(fieldAliases, 'goto', 'keyword.control.keiro')
  expectScope(fieldAliases, 'contract', 'keyword.declaration.keiro')
  expectScope(fieldAliases, 'topic', 'keyword.control.keiro')
  expectScope(fieldAliases, 'typeid', 'support.type.keiro')
  expectScope(fieldAliases, 'text', 'support.type.keiro')
  expectScope(fieldAliases, 'int', 'support.type.keiro')
})

// --- Consumer-owned nominal bindings (keiro-dsl fcd6748) ---------------------
//
// The third `mapped` family. `mapped nominal X : R { … }` declares a consumer-owned Haskell
// type whose identity matters even though its wire representation is a plain scalar, and a
// trailing `using { … }` clause attaches the same block of facts to an `id` or `enum`
// declaration the file already had. Only two words are new: `nominal` and `using`.

test('the mapped nominal family word gets storage.modifier', () => {
  // Anchored on the declaration line: `nominal` also appears as the leading segment of this
  // file's context wire word (`context nominal-scalars`), where a bare-word rule ends at the
  // `-` — pre-existing behaviour for every dashed wire word, not something this range changed.
  expectWholeToken(
    nominalBindings,
    'nominal',
    'storage.modifier.keiro',
    'mapped nominal AccountNumber',
  )
})

test('the name a mapped nominal declaration introduces gets entity.name.type', () => {
  // Proves #mapped-decl-with-name learned the third family word: `nominal X` now claims the
  // name exactly as `record X`, `union X`, and `opaque X` already did.
  expectScope(nominalBindings, 'AccountNumber', 'entity.name.type.keiro')
  expectScope(nominalBindings, 'RiskScore', 'entity.name.type.keiro')
})

test('the nominal representation slot gets support.type', () => {
  // Upstream parses this slot as a bare `ident` and narrows it later in NominalType.hs to
  // Text / Int / Natural / Bool / Time / UTCTime — all already in #types, so no rule was
  // needed. These assertions exist to keep it that way.
  expectScope(nominalBindings, 'Text', 'support.type.keiro')
  expectScope(nominalBindings, 'Int', 'support.type.keiro')
  expectScope(nominalBindings, 'Natural', 'support.type.keiro')
  expectScope(nominalBindings, 'Bool', 'support.type.keiro')
  expectScope(nominalBindings, 'Time', 'support.type.keiro')
})

test('the using binding clause gets keyword.control at both call sites', () => {
  // `pUsingNominalBinding` is invoked from `pIdDecl` and from `pEnumDecl`; the enum case is
  // the language's first declaration body that continues *after* a closing brace, so assert
  // it separately rather than trusting the id case to cover both.
  expectWholeToken(nominalBindings, 'using', 'keyword.control.keiro', 'id OrderId prefix=ord')
  expectWholeToken(nominalBindings, 'using', 'keyword.control.keiro', 'enum OrderStatus')
})

test('the binding clause labels inside a using block get keyword.control', () => {
  // The block itself is not new: `pNominalClause` is a choice over rules the mapped-type
  // declaration already had, so every label here has been matched since keiro-dsl 430c3d2.
  // The first occurrence of each is inside this file's `id … using { … }` block.
  expectScope(nominalBindings, 'haskell', 'keyword.control.keiro')
  expectScope(nominalBindings, 'package', 'keyword.control.keiro')
  expectScope(nominalBindings, 'type', 'keyword.control.keiro')
  expectScope(nominalBindings, 'binding', 'keyword.control.keiro')
  expectScope(nominalBindings, 'binding-version', 'keyword.control.keiro')
  expectScope(nominalBindings, 'canonical-type', 'keyword.control.keiro')
  expectScope(nominalBindings, 'fixtures', 'keyword.control.keiro')
  expectScope(nominalBindings, 'initial', 'keyword.control.keiro')
})

test('a nominal source still tokenizes its version 2 preamble', () => {
  // Nominal syntax requires `language keiro-dsl 2`. The version is an ordinary Number
  // whatever its value — there is no per-version token class.
  expectScope(nominalBindings, 'language', 'keyword.declaration.keiro')
  expectWholeToken(nominalBindings, 'keiro-dsl', 'keyword.control.keiro', 'language keiro-dsl 2')
  expectScope(nominalBindings, '2', 'constant.numeric.keiro')
})

test('a nominal binding does not disturb the aggregate below it', () => {
  expectScope(nominalBindings, 'aggregate', 'keyword.declaration.keiro')
  expectScope(nominalBindings, 'regs', 'keyword.control.keiro')
  expectScope(nominalBindings, 'states', 'keyword.control.keiro')
  expectScope(nominalBindings, 'guard', 'keyword.control.keiro')
  expectScope(nominalBindings, 'goto', 'keyword.control.keiro')
  expectScope(nominalBindings, ':=', 'keyword.operator.keiro')
})

// --- The typed scalar expression language (keiro-dsl 8b0f55b) ----------------
//
// Under `language keiro-dsl 2` an aggregate transition's `guard` and `write` clauses are a real
// expression language: values reached through the `reg.` and `cmd.` roots, arithmetic with
// `+`, `-`, and `*`, and literals as operands. The same commit added the `Integer` type
// spelling and the `implementation hole` clause, which hands one transition's behaviour to
// consumer-written Haskell. Four spellings are new to the grammar: `Integer`, `implementation`,
// `reg`, and `cmd`, plus the operator `*`.

test('the Integer type spelling gets support.type', () => {
  // `Integer` is the eleventh spelling of `pMappedTypeExpr`, which since keiro-dsl da09736 is
  // also an aggregate register's and an aggregate command field's type slot. Both occur in this
  // file; the register one comes first.
  expectWholeToken(scalarExpressions, 'Integer', 'support.type.keiro', 'balance Integer = 0')
  expectWholeToken(
    scalarExpressions,
    'Integer',
    'support.type.keiro',
    'balance:Integer requested:Natural',
  )
})

test('the scalar expression roots get keyword.control', () => {
  // Whole-token assertions: the rule must claim `reg` and `cmd` and stop at the `.`, which is
  // uncoloured punctuation in both packages.
  expectWholeToken(scalarExpressions, 'cmd', 'keyword.control.keiro', 'guard cmd.balance')
  expectWholeToken(scalarExpressions, 'reg', 'keyword.control.keiro', 'guard cmd.balance')
})

test('a root without a following dot is not a keyword', () => {
  // The regression guard for the whole follow-`.` decision. `cmd` is a user-chosen wire word in
  // five corpus files (`id CommandId prefix=cmd`), and an unconditional rule would recolour
  // every one of them. Asserted against the oldest corpus file so a future "simplification" of
  // the rule fails here rather than silently restyling verbatim upstream samples.
  const scopes = scopesOf(reservation, 'cmd')
  expect(scopes, 'the wire word `cmd` was not found in corpus/reservation.keiro').not.toBeNull()
  expect(scopes!.filter((s) => KEYWORDISH_SCOPES.has(s))).toEqual([])
})

test('the reserved word regs is not eaten by the reg root rule', () => {
  // `\b`-style boundaries on both sides: `#scalar-roots` requires a `.` next, which `regs` does
  // not have, so `regs` still reaches #control-keywords whole.
  expectWholeToken(scalarExpressions, 'regs', 'keyword.control.keiro')
})

test('the arithmetic operators get keyword.operator', () => {
  expectScope(scalarExpressions, '*', 'keyword.operator.keiro')
  expectScope(scalarExpressions, '+', 'keyword.operator.keiro')
})

test('a negative operand is one whole number with an uncoloured sign', () => {
  // Section 2 of the spec: the digits take the Number class and the lone `-` is left as
  // punctuation, in an expression operand exactly as in a register initializer.
  expectWholeToken(scalarExpressions, '100', 'constant.numeric.keiro', '>= -100')
})

test('a scalar transition still highlights its surrounding clauses', () => {
  expectScope(scalarExpressions, 'guard', 'keyword.control.keiro')
  expectScope(scalarExpressions, 'write', 'keyword.control.keiro')
  expectScope(scalarExpressions, 'goto', 'keyword.control.keiro')
  expectScope(scalarExpressions, ':=', 'keyword.operator.keiro')
  expectScope(scalarExpressions, 'Natural', 'support.type.keiro')
})

test('the implementation hole clause is a control keyword plus a language constant', () => {
  // Only `implementation` is new. `hole` has been a constant in both packages since plan 4, as
  // the `derive "..." hole` and `resolve ... hole` marker; this clause is its third parser site.
  expectWholeToken(
    implementationHole,
    'implementation',
    'keyword.control.keiro',
    'implementation hole',
  )
  expectWholeToken(implementationHole, 'hole', 'constant.language.keiro', 'implementation hole')
})

test('an implementation hole does not disturb the aggregate around it', () => {
  expectScope(implementationHole, 'aggregate', 'keyword.declaration.keiro')
  expectScope(implementationHole, 'states', 'keyword.control.keiro')
  expectScope(implementationHole, 'emit', 'keyword.declaration.keiro')
  expectScope(implementationHole, 'goto', 'keyword.control.keiro')
  expectScope(implementationHole, 'guard', 'keyword.control.keiro')
  expectScope(implementationHole, ':=', 'keyword.operator.keiro')
})

test('the scalar literal shapes need no rule of their own', () => {
  // A qualified enum literal is an identifier, a `.`, and an identifier — lexically the same as
  // the dotted references the language has always had — and an id literal is an identifier and
  // a parenthesised string. Neither gains a scope; what must hold is that the string inside the
  // id literal is still a String and that the `==` before it is still an operator.
  expectScope(implementationHole, '==', 'keyword.operator.keiro')
  expectWholeToken(
    implementationHole,
    'tkt_01h455vb4pex5vsknk084sn02q',
    'string.quoted.double.keiro',
  )
})

test('scalar keywords inside a comment stay a comment', () => {
  expectScope(
    implementationHole,
    '# named in this comment — implementation, guard, write, Integer, reg, cmd — must stay Comment,',
    'comment.line.number-sign.keiro',
  )
})

// --- Keyword-spelled identifiers (keiro-dsl 9ea8f85) -------------------------
//
// This range added no token. What it added is a *file* — upstream's
// `language-identifier-v1.keiro`, copied here as corpus/language-identifier-collisions.keiro —
// in which the five spellings that collide with version-2 syntax all appear as ordinary data.
// Before the range, keiro-dsl scanned a source as raw lines before any grammar ran and rejected
// it for containing `using`, `Integer`, `implementation hole`, `reg.`, or `cmd.` anywhere on a
// non-comment line, and read any line whose first word was `language` as a version preamble. So
// no such file could be valid. It now is, which makes these the first assertions in this suite
// that run against a legal source using every one of those words as a name.
//
// Nothing here should need a grammar change, and that is the point: both packages have always
// coloured these words unconditionally, and Section 1 of spec/keiro-dsl-language-model.md says
// they should. These assertions keep it that way now that such files exist in the wild.

test('a keyword-spelled identifier still gets its keyword class', () => {
  // `language` at the head of a wire word (`context language-collisions`) and — the case the
  // old parser rejected outright — at the head of its own register declaration line.
  expectWholeToken(
    collisions,
    'language',
    'keyword.declaration.keiro',
    'context language-collisions',
  )
  expectWholeToken(collisions, 'language', 'keyword.declaration.keiro', 'language Text = ')
  // A mapped wire field named `using`, and one named `implementation`.
  expectWholeToken(collisions, 'using', 'keyword.control.keiro', 'as "using"')
  expectWholeToken(collisions, 'implementation', 'keyword.control.keiro', 'as "implementation')
  // ...and the same word as a command field name, where the old parser's substring scan for
  // `implementation hole` would never have looked.
  expectWholeToken(collisions, 'implementation', 'keyword.control.keiro', 'reg:Text cmd:Text')
})

test('an enum named for a type spelling is claimed by the declaration-site rule', () => {
  // `enum Integer { … }`. #decl-with-name is listed before #types, so the name after `enum`
  // takes the declaration-site type-name scope rather than the primitive-type one. The Vim
  // package colours it `keiroType` instead, because its equivalent rule is inert (Section 6 of
  // spec/keiro-dsl-language-model.md marks the Declaration-site-type-name class optional and
  // permits exactly this divergence). What both must do is claim the whole word.
  expectWholeToken(collisions, 'Integer', 'entity.name.type.keiro', 'enum Integer {')
})

test('a bare scalar root with no following dot stays plain in a field list', () => {
  // The same follow-`.` guard the reservation.keiro `prefix=cmd` test makes, from a different
  // direction: here `reg` and `cmd` are a mapped wire field name and a command field name, both
  // followed by whitespace or `:`. An unconditional root rule would recolour four positions in
  // this one file.
  for (const root of ['reg', 'cmd']) {
    const scopes = scopesOf(collisions, root)
    expect(scopes, `the bare word ${root} was not found in the collisions corpus`).not.toBeNull()
    expect(scopes!.filter((s) => KEYWORDISH_SCOPES.has(s))).toEqual([])
  }
})

test('successor spellings inside a string literal stay one string', () => {
  // The register initializer is a string made entirely of words both packages colour elsewhere.
  // #strings is second in the pattern list, ahead of every bare-word rule, so the whole run is
  // one token — asserted whole, because a leak would show up as a split rather than as a
  // missing scope.
  expectWholeToken(
    collisions,
    'using Integer implementation hole reg. cmd.',
    'string.quoted.double.keiro',
    'language Text = ',
  )
  expectWholeToken(
    collisions,
    'implementation hole',
    'string.quoted.double.keiro',
    'as "implementation hole"',
  )
  expectWholeToken(
    collisions,
    'cmd. using Integer implementation hole',
    'string.quoted.double.keiro',
    'as "cmd.',
  )
})

test('colliding spellings inside a comment stay a comment', () => {
  expectScope(
    collisions,
    '# `using Integer implementation hole reg. cmd.` are inert in comments.',
    'comment.line.number-sign.keiro',
  )
})

test('the collisions file tokenizes normally around the colliding names', () => {
  expectScope(collisions, 'context', 'keyword.declaration.keiro')
  expectScope(collisions, 'mapped', 'keyword.declaration.keiro')
  expectScope(collisions, 'structural', 'storage.modifier.keiro')
  expectScope(collisions, 'aggregate', 'keyword.declaration.keiro')
  expectScope(collisions, 'regs', 'keyword.control.keiro')
  expectScope(collisions, 'states', 'keyword.control.keiro')
  expectScope(collisions, 'goto', 'keyword.control.keiro')
  expectScope(collisions, 'Text', 'support.type.keiro')
  expectScope(collisions, '-->', 'keyword.operator.keiro')
})

// --- The Language 5 and 6 surface (keiro-dsl d7be0fe6..9fb54d56) -------------------------
//
// 63 new words, none reserved: the projection catalog, readmodel freshness and query types, the
// external read contract, domain command outcomes, process reactions, declarative router
// selection, delegated intake idempotence, and `ordering fifo-heads`. The word-list guards at
// the bottom of this file prove each word is claimed whole by *some* keyword scope; these tests
// pin the class each one takes and that the constructs tokenize in real code. Both corpus files
// keep their comment banner at the end, so the first-match helpers land on code.

test('the dashed projection-catalog declarations get keyword.declaration as one whole word', () => {
  // The bare `projection` heads two of these, so #dashed-introducers must win the same-position
  // tie against #control-keywords.
  for (const word of ['rebuild-group', 'projection-revision', 'projection-owner', 'external-read']) {
    expectWholeToken(languageFive, word, 'keyword.declaration.keiro')
  }
})

test('the catalog target declaration keeps its control scope', () => {
  expectWholeToken(languageFive, 'target', 'keyword.control.keiro', 'target order_summary {')
})

test('projection-catalog clause labels and values get keyword.control', () => {
  expectWholeToken(languageFive, 'reset', 'keyword.control.keiro', 'reset = clear')
  expectWholeToken(languageFive, 'clear', 'keyword.control.keiro', 'reset = clear')
  expectWholeToken(languageFive, 'preserve', 'keyword.control.keiro', 'reset = preserve')
  expectWholeToken(languageFive, 'depends-on', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'targets', 'keyword.control.keiro', 'targets = [')
  expectWholeToken(languageFive, 'order', 'keyword.control.keiro', 'order = [')
  expectWholeToken(languageFive, 'schema', 'keyword.control.keiro', 'schema = "sales"')
  expectWholeToken(languageFive, 'schema-version', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'provisioner', 'keyword.control.keiro', 'provisioner = ')
  expectWholeToken(languageFive, 'provisioner-version', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'expected-shape', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'validator', 'keyword.control.keiro', 'validator = ')
  expectWholeToken(languageFive, 'validator-version', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'promotion', 'keyword.control.keiro', 'promotion index')
  expectWholeToken(languageFive, 'index', 'keyword.control.keiro', 'promotion index')
  expectWholeToken(languageFive, 'constraint', 'keyword.control.keiro', 'promotion constraint')
  expectWholeToken(languageFive, 'owned-sequence', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'all', 'keyword.control.keiro', 'source = all')
  expectWholeToken(languageFive, 'delivery', 'keyword.control.keiro', 'delivery = inline')
  expectWholeToken(languageFive, 'subscription', 'keyword.control.keiro', 'delivery = subscription')
  expectWholeToken(languageFive, 'replay', 'keyword.control.keiro', 'replay = explicit')
  expectWholeToken(languageFive, 'explicit', 'keyword.control.keiro', 'replay = explicit')
  expectWholeToken(languageFive, 'live-only', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'checkpoint-on-missing', 'keyword.control.keiro')
  // `from` is a Modifier that heads this dashed Control value.
  expectWholeToken(languageFive, 'from-current-head', 'keyword.control.keiro')
})

test('readmodel freshness, backing, and query types tokenize', () => {
  expectWholeToken(languageFive, 'freshness', 'keyword.control.keiro', 'freshness = immediate')
  expectWholeToken(languageFive, 'immediate', 'keyword.control.keiro', 'freshness = immediate')
  expectWholeToken(languageFive, 'wait-for-head', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'entire-log', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'backing', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'query', 'keyword.control.keiro', 'query input = Text')
  expectWholeToken(languageFive, 'result', 'keyword.control.keiro', 'query result = ')
  expectWholeToken(languageFive, 'Optional', 'support.type.keiro', 'query result = ')
})

test('the external read contract labels get keyword.control as whole words', () => {
  for (const word of ['result-schema', 'result-type', 'compatible-revisions', 'surface-generation']) {
    expectWholeToken(languageFive, word, 'keyword.control.keiro')
  }
})

test('the lowercase bool payload type gets support.type', () => {
  expectWholeToken(languageFive, 'bool', 'support.type.keiro', '"urgent"')
})

test('domain command outcomes tokenize', () => {
  expectWholeToken(languageFive, 'domain-outcomes', 'keyword.control.keiro')
  expectWholeToken(languageFive, 'rejection', 'keyword.control.keiro', 'domain-outcomes')
  expectWholeToken(languageFive, 'no-op', 'keyword.control.keiro', 'domain-outcomes')
  expectWholeToken(languageFive, 'accepted', 'keyword.control.keiro', 'outcome accepted')
  expectWholeToken(languageFive, 'rejected', 'keyword.control.keiro', 'outcome rejected')
  expectWholeToken(languageFive, 'no-op', 'keyword.control.keiro', 'outcome no-op')
  expectScope(languageFive, 'aggregate', 'keyword.declaration.keiro')
  expectScope(languageFive, '-->', 'keyword.operator.keiro')
})

test('process reactions tokenize', () => {
  expectWholeToken(languageSix, 'reactions', 'keyword.control.keiro', 'reactions version 1')
  expectWholeToken(languageSix, 'when', 'keyword.control.keiro', 'when input.severity')
  expectWholeToken(languageSix, 'otherwise', 'keyword.control.keiro')
  expectWholeToken(languageSix, 'accepted', 'keyword.control.keiro', '        accepted')
  expectWholeToken(languageSix, 'silent', 'storage.modifier.keiro', 'silent no-action')
  expectWholeToken(languageSix, 'no-action', 'keyword.control.keiro', 'silent no-action')
  expectWholeToken(languageSix, 'once', 'storage.modifier.keiro', 'schedule reminder once')
  expectWholeToken(languageSix, 'cancel', 'keyword.control.keiro', 'cancel reminder')
  expectWholeToken(languageSix, 'timers', 'keyword.control.keiro', 'timers max-attempts')
  expectWholeToken(languageSix, 'max-attempts', 'keyword.control.keiro', 'timers max-attempts')
  expectWholeToken(languageSix, '5m', 'constant.numeric.keiro')
})

test('declarative router selection tokenizes', () => {
  expectWholeToken(languageSix, 'declarative', 'storage.modifier.keiro', 'resolve declarative')
  expectWholeToken(languageSix, 'identity', 'keyword.control.keiro')
  expectWholeToken(languageSix, 'read-model', 'keyword.control.keiro', 'query = read-model')
  expectWholeToken(languageSix, 'with', 'keyword.control.keiro', 'template_lookup with input')
  expectWholeToken(languageSix, 'where', 'keyword.control.keiro', 'where = ')
  expectWholeToken(languageSix, 'recipient', 'keyword.control.keiro', 'recipient = ')
  expectWholeToken(languageSix, 'max-recipients', 'keyword.control.keiro')
  expectWholeToken(languageSix, 'empty', 'keyword.control.keiro', 'empty => ack')
  expectWholeToken(languageSix, 'ack', 'keyword.control.keiro', 'empty => ack')
  expectWholeToken(languageSix, 'failure', 'keyword.control.keiro', 'failure => retry')
  expectWholeToken(languageSix, 'redelivery', 'keyword.control.keiro')
})

test('router selection policy values are not parser literals', () => {
  // `stable-union` is two identifiers joined by `-`, checked later against a fixed value, so no
  // rule claims the whole spelling: it renders segment by segment, with `stable` and `union`
  // keeping the Modifier scope they have everywhere and the dash left as plain text.
  expectWholeToken(languageSix, 'stable', 'storage.modifier.keiro', 'redelivery = stable-union')
  expectWholeToken(languageSix, 'union', 'storage.modifier.keiro', 'redelivery = stable-union')
  const lines = hl.codeToTokensBase(languageSix, {
    lang: 'keiro',
    theme: 'github-light',
    includeExplanation: true,
  })
  const line = lines
    .map((l) => l.flatMap((t) => t.explanation ?? []))
    .find((parts) => parts.map((p) => p.content).join('').includes('redelivery = stable-union'))
  const dash = line!.find((p) => p.content === '-')
  expect(dash, 'the dash of stable-union should be its own plain token').toBeDefined()
  expect(dash!.scopes.map((s) => s.scopeName).filter((s) => KEYWORDISH_SCOPES.has(s))).toEqual([])
})

test('the remaining Language 6 spellings tokenize', () => {
  expectWholeToken(languageSix, 'idempotence', 'keyword.control.keiro')
  expectWholeToken(languageSix, 'delegated', 'keyword.control.keiro')
  expectWholeToken(languageSix, 'fifo-heads', 'keyword.control.keiro')
  // The keyed map: `Map` is still a type and the brackets stay plain.
  expectWholeToken(languageSix, 'Map', 'support.type.keiro', 'Map[TemplateId]')
})

// --- Bare container mappings (keiro-dsl a6110a94) ---------------------------
//
// `mapped structural value X { ... wire <Type> }` is a fourth structural shape: the declared
// Haskell type *is* a container, so its encoding is one unbraced `wire <Type>` line instead of a
// braced `wire ... { ... }` block. It adds no word — `value` has been in Section 4's bare grid
// since plan 4 and `wire` is reserved — so these assertions mostly pin that the existing rules
// already cover it. The one real change is #bare-mapped-decl-with-name, which teaches the
// Declaration-site-type-name refinement its fifth position.

test('the bare container shape word keeps keyword.control', () => {
  // `value` does NOT join `record` and `union` in the Modifier class: the same word is the older
  // workflow-signal clause label, and one word gets one class. See Section 6 of
  // spec/keiro-dsl-language-model.md.
  expectWholeToken(
    bareContainers,
    'value',
    'keyword.control.keiro',
    'mapped structural value MaybeText',
  )
  // Its neighbours are undisturbed.
  expectWholeToken(bareContainers, 'mapped', 'keyword.declaration.keiro')
  expectWholeToken(
    bareContainers,
    'structural',
    'storage.modifier.keiro',
    'mapped structural value MaybeText',
  )
})

test('the name a bare container mapping declares gets entity.name.type', () => {
  // Proves #bare-mapped-decl-with-name won the same-position tie against #control-keywords: the
  // shape word keeps its control scope (asserted above) *and* the name is claimed.
  expectScope(bareContainers, 'MaybeText', 'entity.name.type.keiro')
  expectScope(bareContainers, 'TextList', 'entity.name.type.keiro')
  expectScope(bareContainers, 'TextMap', 'entity.name.type.keiro')
  expectScope(bareContainers, 'NestedIds', 'entity.name.type.keiro')
})

test('the bare wire line tokenizes with no new rule', () => {
  // `wire` is reserved and has headed the braced form since the declaration arrived; the type
  // slot is the unchanged `pMappedTypeExpr`, whose literal spellings are already in #types.
  expectWholeToken(bareContainers, 'wire', 'keyword.control.keiro', 'wire Optional Text')
  expectWholeToken(bareContainers, 'Optional', 'support.type.keiro', 'wire Optional Text')
  expectWholeToken(bareContainers, 'List', 'support.type.keiro', 'wire List Text')
  expectWholeToken(bareContainers, 'Map', 'support.type.keiro', 'wire Map Text')
  // The nested, parenthesised form: both constructors are types, and the parentheses plus the
  // reference to another declared type stay plain — exactly as `Optional(Text)` already does.
  expectWholeToken(bareContainers, 'Optional', 'support.type.keiro', 'wire List (Optional ItemId)')
  const lines = hl.codeToTokensBase(bareContainers, {
    lang: 'keiro',
    theme: 'github-light',
    includeExplanation: true,
  })
  const nested = lines
    .map((l) => l.flatMap((t) => t.explanation ?? []))
    .find((parts) => parts.map((p) => p.content).join('').includes('wire List (Optional ItemId)'))
  expect(nested, 'corpus is missing the nested bare wire line').toBeDefined()
  const reference = nested!.find((p) => p.content.includes('ItemId'))
  expect(reference, 'ItemId should be part of a plain token').toBeDefined()
  expect(
    reference!.scopes.map((s) => s.scopeName).filter((s) => KEYWORDISH_SCOPES.has(s)),
  ).toEqual([])
})

test('a bare container mapping leaves the rest of the file tokenizing normally', () => {
  // The clause labels inside the block are the ones the older mapped families already use.
  expectScope(bareContainers, 'haskell', 'keyword.control.keiro')
  expectWholeToken(bareContainers, 'binding-version', 'keyword.control.keiro')
  expectWholeToken(bareContainers, 'canonical-type', 'keyword.control.keiro')
  // The nodes beneath the declarations.
  expectScope(bareContainers, 'aggregate', 'keyword.declaration.keiro')
  expectScope(bareContainers, 'workqueue', 'keyword.declaration.keiro')
  expectWholeToken(bareContainers, 'rebuild-group', 'keyword.declaration.keiro')
  expectWholeToken(bareContainers, 'projection-owner', 'keyword.declaration.keiro')
  expectScope(bareContainers, 'readmodel', 'keyword.declaration.keiro')
  // The corpus's only type expression in a `query result =` slot.
  expectWholeToken(bareContainers, 'List', 'support.type.keiro', 'query result = List TextList')
})

test('the workflow signal value clause is undisturbed', () => {
  // The non-regression that matters: `value` keeps its control scope at its older site, which is
  // why it was not promoted to a Modifier. The type it names does gain the type-name scope,
  // because the refinement is purely lexical — and that is accurate, since upstream's
  // Validate.hs binds this slot as `valueType`.
  expectWholeToken(
    workflowSignal,
    'value',
    'keyword.control.keiro',
    'value ReservationConfirmation',
  )
  // Anchored: the same spelling appears earlier in the file as the target of an `await ... ->`
  // arrow, where it is plain and must stay plain.
  expectWholeToken(
    workflowSignal,
    'ReservationConfirmation',
    'entity.name.type.keiro',
    'value ReservationConfirmation',
  )
})

// --- The calendar day type (keiro-dsl 6b92bd52) -----------------------------
//
// `Day` is the newest spelling of `pMappedTypeExpr`: a calendar date with no time-of-day part
// and no time zone, so a different type from `Time`, which is an instant. Unlike `Time` it has
// no alias. Adding it was one alternative in the #types rule — but unlike every Language 5 and
// 6 word before it, a *type* spelling appears in neither Section 3 nor Section 4 of
// spec/keiro-dsl-language-model.md, so the three mechanical word-count guards at the bottom of
// this file cannot see it arrive or go missing. The assertions in this block are the only thing
// protecting it.
//
// Every assertion below is anchored to a phrase. `corpus/mapped-calendar-days.keiro` writes
// `Day` eleven times and the helpers above match the *first* occurrence of a literal, so an
// unanchored assertion would only ever re-test the bare `wire Day` line.

// The explanation parts of the first line containing `anchor`, or null. Needed here because the
// `Day` token has to be located positionally on several different lines, and on two of them the
// spelling is also a substring of a plain identifier earlier in the line (`optionalDay ... Day`),
// which `expectWholeToken`'s "first part containing the literal" search would find instead.
function partsOfLine(code: string, anchor: string) {
  const lines = hl.codeToTokensBase(code, {
    lang: 'keiro',
    theme: 'github-light',
    includeExplanation: true,
  })
  for (const line of lines) {
    const parts = line.flatMap((t) => t.explanation ?? [])
    if (parts.map((p) => p.content).join('').includes(anchor)) return parts
  }
  return null
}

// Assert that the line containing `anchor` carries at least one token whose content is exactly
// `Day`, and that every such token is a primitive type.
function expectDayIsType(anchor: string) {
  const parts = partsOfLine(calendarDays, anchor)
  expect(parts, `line containing ${JSON.stringify(anchor)} not found`).not.toBeNull()
  const days = parts!.filter((p) => p.content === 'Day')
  expect(
    days.length,
    `no whole \`Day\` token on the line containing ${JSON.stringify(anchor)}; it tokenized as ` +
      JSON.stringify(parts!.map((p) => p.content)),
  ).toBeGreaterThan(0)
  for (const day of days) {
    expect(day.scopes.map((s) => s.scopeName)).toContain('support.type.keiro')
  }
}

test('Day is a primitive type in every position the type slot admits', () => {
  // The bare `wire <Type>` line of a `mapped structural value` — plan 18's fourth shape.
  expectDayIsType('wire Day')
  // The same line wrapped in the one-argument constructor `Optional`.
  expectDayIsType('wire Optional Day')
  expectWholeToken(calendarDays, 'Optional', 'support.type.keiro', 'wire Optional Day')
  // A required wire field of a `mapped structural record`.
  expectDayIsType('primary as "primary" : Day required')
  // An optional wire field, whose own name `optionalDay` ends in the spelling under test.
  expectDayIsType('optionalDay as "optionalDay" : Optional Day optional')
  // Inside `List` and inside `Map`.
  expectDayIsType('sequence as "sequence" : List Day required')
  expectDayIsType('labelled as "labelled" : Map Day required')
  expectWholeToken(calendarDays, 'List', 'support.type.keiro', ': List Day required')
  expectWholeToken(calendarDays, 'Map', 'support.type.keiro', ': Map Day required')
})

test('Day does not claim the tail of an identifier that ends in it', () => {
  // The non-regression that matters: `Day` is a substring of `LocalDay`, `MaybeLocalDay`, and the
  // field name `optionalDay`, all of which appear in this file, and none may be touched. The
  // #types rule's `(?<![A-Za-z0-9_])` guard is what prevents it.
  //
  // `current LocalDay = initial` is a *use* site, so the whole phrase up to the control keyword
  // `initial` is one plain token. Asserting on a use site rather than a declaration site keeps
  // this independent of #bare-mapped-decl-with-name, which legitimately colours the declaration.
  const reg = partsOfLine(calendarDays, 'current LocalDay = initial')
  expect(reg, 'the aggregate register line was not found').not.toBeNull()
  expect(reg!.some((p) => p.content === 'Day'), '`Day` was split out of `LocalDay`').toBe(false)
  const use = reg!.find((p) => p.content.includes('LocalDay'))!
  expect(use.scopes.map((s) => s.scopeName)).not.toContain('support.type.keiro')
  expect(use.scopes.map((s) => s.scopeName).filter((s) => KEYWORDISH_SCOPES.has(s))).toEqual([])
  // Same for the reference to the other bare container type in a wire field's type slot.
  const named = partsOfLine(calendarDays, 'namedOptional as "namedOptional" : MaybeLocalDay')
  expect(named, 'the MaybeLocalDay wire field was not found').not.toBeNull()
  expect(named!.some((p) => p.content === 'Day'), '`Day` was split out of `MaybeLocalDay`').toBe(
    false,
  )
})

test('a calendar day mapping leaves the rest of the file tokenizing normally', () => {
  // The declaration head is plan 18's bare container shape, unchanged by this range.
  expectWholeToken(calendarDays, 'value', 'keyword.control.keiro', 'mapped structural value LocalDay')
  expectScope(calendarDays, 'LocalDay', 'entity.name.type.keiro')
  expectWholeToken(calendarDays, 'structural', 'storage.modifier.keiro', 'mapped structural value LocalDay')
  // The clause labels inside the block.
  expectScope(calendarDays, 'haskell', 'keyword.control.keiro')
  expectWholeToken(calendarDays, 'binding-version', 'keyword.control.keiro')
  expectWholeToken(calendarDays, 'unknown-fields', 'keyword.control.keiro')
  expectWholeToken(calendarDays, 'on-missing', 'keyword.control.keiro')
  // The nodes beneath the declarations.
  expectScope(calendarDays, 'aggregate', 'keyword.declaration.keiro')
  expectScope(calendarDays, 'workqueue', 'keyword.declaration.keiro')
  expectWholeToken(calendarDays, 'rebuild-group', 'keyword.declaration.keiro')
  expectWholeToken(calendarDays, 'projection-owner', 'keyword.declaration.keiro')
  expectScope(calendarDays, 'readmodel', 'keyword.declaration.keiro')
  // The version-6 preamble this file needs, which colours as any other preamble does.
  expectWholeToken(calendarDays, 'keiro-dsl', 'keyword.control.keiro', 'language keiro-dsl 6')
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

test('the spec Section 4 lists 139 bare and 56 dashed contextual keywords', () => {
  // 96 -> 97 and 31 -> 32 at keiro-dsl 4523b52, which added the version preamble's `language`
  // (bare) and `keiro-dsl` (dashed). 97 -> 99 at keiro-dsl fcd6748, which added the nominal
  // binding words `nominal` and `using`, both bare. 99 -> 100 at keiro-dsl 8b0f55b, which added
  // the transition clause word `implementation`. 100 -> 139 and 32 -> 56 at keiro-dsl 9fb54d56,
  // the Language 5 and 6 surface: 39 bare and 24 dashed words (the four dashed projection-catalog
  // introducers among them). Section 3 is unchanged throughout: none of those words is reserved.
  //
  // The scalar expression roots `reg` and `cmd` are deliberately NOT in the bare grid, even
  // though both packages colour them: this guard probes each grid word in a one-word document,
  // where a root correctly is not a keyword because no `.` follows it. They are covered by the
  // hand-named assertions above instead.
  const { bare, dashed } = contextualWordsFromSpec()
  expect(bare.length).toBe(139)
  expect(dashed.length).toBe(56)
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
