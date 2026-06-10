# shiki-keiro

A [Shiki](https://shiki.style/) language registration and TextMate grammar for **keiro-dsl**
(`.keiro`) files. Register it and your `keiro` code blocks render as fully colored HTML.

The classification mirrors the shared language model in
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
import { keiro } from 'shiki-keiro'

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: [keiro],
})

const html = highlighter.codeToHtml(source, { lang: 'keiro', theme: 'github-light' })
```

`keiro` is a Shiki `LanguageRegistration` (`name: 'keiro'`, `scopeName: 'source.keiro'`,
alias `keiro-dsl`). It is also the default export.

## Raw grammar (VS Code and other TextMate tools)

The bare TextMate grammar is published at the `shiki-keiro/grammar` export path and as
`syntaxes/keiro.tmLanguage.json` in the package, for consumers that want the grammar without
Shiki:

```ts
import grammar from 'shiki-keiro/grammar'
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
