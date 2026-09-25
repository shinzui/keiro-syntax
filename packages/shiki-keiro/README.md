# shiki-keiro

[Shiki](https://shiki.style/) language registrations and TextMate grammars for
**keiro-dsl** (`.keiro`) files and service workspace manifests
(`.keiro-workspace`).

The `.keiro` classification mirrors the shared language model in
[`spec/keiro-dsl-language-model.md`](../../spec/keiro-dsl-language-model.md) (Section 6), so it
agrees with the `keiro-vim` package on which words are keywords, types, constants, etc. The
grammar's scope names are the canonical `*.keiro` scopes from that spec.

## Installation

```bash
npm i shiki-keiro shiki
# or
bun add shiki-keiro shiki
```

`shiki` is a peer dependency (`^4.0.0`).

## Usage

```ts
import { createHighlighter } from 'shiki'
import { keiro, keiroWorkspace } from 'shiki-keiro'

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: [keiro, keiroWorkspace],
})

const html = highlighter.codeToHtml(source, { lang: 'keiro', theme: 'github-light' })
const workspaceHtml = highlighter.codeToHtml(manifest, {
  lang: 'keiro-workspace',
  theme: 'github-light',
})
```

`keiro` is a Shiki `LanguageRegistration` (`name: 'keiro'`, `scopeName: 'source.keiro'`,
alias `keiro-dsl`). It is also the default export.
`keiroWorkspace` registers the `keiro-workspace` language with
`source.keiro-workspace` as its root scope.

## Raw grammar (VS Code and other TextMate tools)

The bare TextMate grammars are published at `shiki-keiro/grammar` and
`shiki-keiro/workspace-grammar`, as well as under `syntaxes/` in the package:

```ts
import grammar from 'shiki-keiro/grammar'
import workspaceGrammar from 'shiki-keiro/workspace-grammar'
```

## Scopes

| Token class | TextMate scope |
|---|---|
| Declaration introducer | `keyword.declaration.keiro` |
| Declaration-site type name | `entity.name.type.keiro` |
| Control / section keyword | `keyword.control.keiro` |
| Modifier | `storage.modifier.keiro` |
| Boolean | `constant.language.boolean.keiro` |
| Other language constant | `constant.language.keiro` |
| Primitive type | `support.type.keiro` |
| String | `string.quoted.double.keiro` |
| Number | `constant.numeric.keiro` |
| Comment | `comment.line.number-sign.keiro` |
| Operator | `keyword.operator.keiro` |

Workspace manifest scopes are listed in
[`spec/keiro-workspace-language-model.md`](../../spec/keiro-workspace-language-model.md).

## Development

```bash
bun install
bun run build   # bundles src/index.ts to dist/ with type declarations
bun test        # tokenizes the shared corpus and asserts scopes
bun run demo    # writes examples/keiro-demo.html — open it in a browser
```

`bun test` asserts that specific tokens in the shared corpus
([`corpus/`](../../corpus/)) carry the expected TextMate scope — one assertion per mandatory
token class.
