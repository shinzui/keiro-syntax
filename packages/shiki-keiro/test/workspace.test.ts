import { test, expect, beforeAll } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createHighlighter, type Highlighter } from 'shiki'
import { keiro, keiroWorkspace } from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const corpus = resolve(here, '../../../corpus')
let hl: Highlighter

beforeAll(async () => {
  hl = await createHighlighter({ themes: ['github-light'], langs: [keiro, keiroWorkspace] })
})

function expectScope(source: string, lineText: string, token: string, scope: string) {
  const lines = hl.codeToTokensBase(source, {
    lang: 'keiro-workspace',
    theme: 'github-light',
    includeExplanation: true,
  })
  const line = lines.find((tokens) => tokens.map((t) => t.content).join('') === lineText)
  expect(line, `missing line ${lineText}`).toBeDefined()
  const part = line!.flatMap((t) => t.explanation ?? []).find((e) => e.content === token)
  expect(part, `missing whole token ${token} on ${lineText}`).toBeDefined()
  expect(part!.scopes.map((s) => s.scopeName)).toContain(scope)
}

test('workspace clauses and values use the workspace grammar', () => {
  const source = readFileSync(resolve(corpus, 'service.keiro-workspace'), 'utf8')
  expectScope(source, 'service workspace-proof', 'service', 'keyword.declaration.keiro-workspace')
  expectScope(source, 'service workspace-proof', 'workspace-proof', 'entity.name.service.keiro-workspace')
  expectScope(source, 'runtime-package keiro-dsl-conformance-service-runtime', 'runtime-package', 'keyword.control.keiro-workspace')
  expectScope(source, 'runtime-package keiro-dsl-conformance-service-runtime', 'keiro-dsl-conformance-service-runtime', 'entity.name.package.keiro-workspace')
  expectScope(source, 'module Proof', 'module', 'keyword.control.keiro-workspace')
  expectScope(source, 'module Proof', 'Proof', 'entity.name.namespace.keiro-workspace')
  expectScope(source, 'layout collocated', 'layout', 'keyword.control.keiro-workspace')
  expectScope(source, 'layout collocated', 'collocated', 'storage.modifier.keiro-workspace')
  expectScope(source, 'spec domain/alpha.keiro', 'spec', 'keyword.declaration.keiro-workspace')
  expectScope(source, 'spec domain/alpha.keiro', 'domain/alpha.keiro', 'string.unquoted.path.keiro-workspace')
  expectScope(source, '# One durable service assembled from several ownership members. The generated', '# One durable service assembled from several ownership members. The generated', 'comment.line.number-sign.keiro-workspace')
})

test('prefixed layout and dotted module prefix', () => {
  const source = readFileSync(resolve(corpus, 'prefixed.keiro-workspace'), 'utf8')
  expectScope(source, 'module Example.Service', 'Example.Service', 'entity.name.namespace.keiro-workspace')
  expectScope(source, 'layout prefixed', 'prefixed', 'storage.modifier.keiro-workspace')
  expectScope(source, 'spec domain/module.keiro  # member source', 'domain/module.keiro', 'string.unquoted.path.keiro-workspace')
  expectScope(source, 'spec domain/module.keiro  # member source', '# member source', 'comment.line.number-sign.keiro-workspace')
})

test('existing .keiro registration remains available', () => {
  expect(hl.getLoadedLanguages()).toContain('keiro')
  expect(hl.getLoadedLanguages()).toContain('keiro-workspace')
})
