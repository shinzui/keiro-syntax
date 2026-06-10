# keiro-syntax

Syntax highlighting for **keiro-dsl**, the domain-specific language for defining
event-sourced workflows in the [keiro](https://github.com/) framework. keiro-dsl source
files use the `.keiro` extension and describe aggregates, processes, contracts, intakes,
emitters, publishers, workqueues, workflows, and operations.

This repository provides highlighting for `.keiro` files in two environments, both driven
by one shared, authoritative description of the language so they agree on exactly which
words are keywords, which tokens are types, and how each token is classified:

- **`spec/`** — the shared language model: `spec/keiro-dsl-language-model.md` enumerates
  keiro-dsl's keywords, operators, literals, and the token-class taxonomy (with canonical
  TextMate scope names and Vim highlight groups) that both packages implement.
- **`corpus/`** — a shared test corpus of real `.keiro` files that both packages tokenize
  in their automated tests.
- **`packages/keiro-vim/`** — a self-contained Vim/Neovim plugin (filetype detection plus
  syntax highlighting for `.keiro` files).
- **`packages/shiki-keiro/`** — a self-contained npm package shipping a TextMate grammar
  and a [Shiki](https://shiki.style/) language registration for `keiro`.

The packages are documented by the execution plans under `docs/plans/`, coordinated by the
master plan under `docs/masterplans/`.
