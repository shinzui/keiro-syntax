# keiro-vim

Syntax highlighting for **keiro-dsl** (`.keiro`) files in Vim and Neovim.

Opening any `.keiro` file highlights keywords, type names, strings, numbers, comments, and
operators automatically — no per-project configuration. It uses the portable regex-based
`:syntax` mechanism, so it works in both classic Vim and Neovim with no compiled parser or
build step.

The classification mirrors the shared language model in
[`spec/keiro-dsl-language-model.md`](../../spec/keiro-dsl-language-model.md) (Section 6),
so it agrees with the `shiki-keiro` package on which words are keywords, types, constants,
etc.

## What it provides

- `ftdetect/keiro.vim` — maps `*.keiro` to the `keiro` filetype.
- `ftplugin/keiro.vim` — sets `commentstring` / `comments` for `#` line comments.
- `syntax/keiro.vim` — defines the `keiro*` syntax groups and links each to a standard
  highlight group your color scheme already styles:

  | Syntax group | Highlight group |
  |---|---|
  | `keiroComment` | `Comment` |
  | `keiroString` | `String` |
  | `keiroNumber` | `Number` |
  | `keiroBoolean` | `Boolean` |
  | `keiroConstant` | `Constant` |
  | `keiroType`, `keiroTypeName` | `Type` |
  | `keiroKeyword` | `Keyword` |
  | `keiroStatement` | `Statement` |
  | `keiroModifier` | `StorageClass` |
  | `keiroOperator` | `Operator` |

## Installation

```vim
" lazy.nvim
{ dir = "/path/to/keiro-syntax/packages/keiro-vim" }

" vim-plug
Plug '/path/to/keiro-syntax/packages/keiro-vim'

" packer
use '/path/to/keiro-syntax/packages/keiro-vim'
```

Manual install: copy or symlink the `ftdetect/`, `ftplugin/`, and `syntax/` directories into
your `~/.config/nvim/` (Neovim) or `~/.vim/` (Vim).

Once installed, opening a `.keiro` file just works. To verify, open one and run
`:set filetype?` — it should print `filetype=keiro`.

## Tests

A headless-Neovim test asserts that specific tokens in the shared corpus
([`corpus/`](../../corpus/)) receive the expected syntax group, independent of any color
scheme:

```bash
bash packages/keiro-vim/test/run.sh
```

It prints an `ok` line per asserted token and exits 0 on success (non-zero if any token gets
the wrong group or is missing). Requires `nvim` on your `PATH`.

## Future extension (not included)

A Tree-sitter grammar (`packages/keiro-treesitter/`) would give Neovim parse-tree-based
highlighting, but requires a hand-written `grammar.js` and a compiled C parser — a separate,
larger effort. This regex syntax file remains the fallback for Neovim and the only option for
classic Vim.
