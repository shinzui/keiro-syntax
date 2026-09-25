# keiro-syntax

Syntax highlighting for **keiro-dsl**, the domain-specific language for defining
event-sourced workflows in the [keiro](https://github.com/) framework. keiro-dsl source
files use the `.keiro` extension and describe aggregates, processes, contracts, intakes,
emitters, publishers, workqueues, workflows, and operations. Service workspaces use
separate `.keiro-workspace` manifests to list member files.

This repository provides highlighting for both file formats in two environments,
with shared language models for their token classifications:

- **`spec/`** — language models for `.keiro` sources and `.keiro-workspace` manifests,
  with canonical TextMate scopes and Vim highlight groups.
- **`corpus/`** — a shared test corpus that both packages tokenize
  in their automated tests.
- **`packages/keiro-vim/`** — a self-contained Vim/Neovim plugin (filetype detection plus
  syntax highlighting for both file formats).
- **`packages/shiki-keiro/`** — a self-contained npm package shipping TextMate grammars
  and [Shiki](https://shiki.style/) language registrations for `keiro` and
  `keiro-workspace`.

The packages are documented by the execution plans under `docs/plans/`, coordinated by the
master plan under `docs/masterplans/`.
