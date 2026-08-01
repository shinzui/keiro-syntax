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

test('the spec Section 4 lists 100 bare and 32 dashed contextual keywords', () => {
  // 96 -> 97 and 31 -> 32 at keiro-dsl 4523b52, which added the version preamble's `language`
  // (bare) and `keiro-dsl` (dashed). 97 -> 99 at keiro-dsl fcd6748, which added the nominal
  // binding words `nominal` and `using`, both bare. 99 -> 100 at keiro-dsl 8b0f55b, which added
  // the transition clause word `implementation`. Section 3 is unchanged throughout: none of
  // those five words is reserved.
  //
  // The scalar expression roots `reg` and `cmd` are deliberately NOT in the bare grid, even
  // though both packages colour them: this guard probes each grid word in a one-word document,
  // where a root correctly is not a keyword because no `.` follows it. They are covered by the
  // hand-named assertions above instead.
  const { bare, dashed } = contextualWordsFromSpec()
  expect(bare.length).toBe(100)
  expect(dashed.length).toBe(32)
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
