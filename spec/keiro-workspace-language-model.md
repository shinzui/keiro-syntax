# Keiro workspace manifest language model

The `.keiro-workspace` manifest is a separate line-oriented format parsed by
`Keiro.Dsl.Workspace` in `mori://shinzui/keiro/packages/keiro-dsl`
(`keiro-dsl/src/Keiro/Dsl/Workspace.hs`). Blank lines and `#` comments are
ignored. The first clause is `service <name>`; optional `runtime-package`,
`module`, and `layout` clauses and one or more `spec <path>.keiro` clauses follow.
Clause order after `service` does not affect lexical highlighting.

| Form | Meaning | TextMate scope | Vim group |
|---|---|---|---|
| `service`, `spec` | Declaration words | `keyword.declaration.keiro-workspace` | `keiroWorkspaceKeyword` |
| `runtime-package`, `module`, `layout` | Clause words | `keyword.control.keiro-workspace` | `keiroWorkspaceKeyword` |
| `prefixed`, `collocated` | Layout values | `storage.modifier.keiro-workspace` | `keiroWorkspaceLayout` |
| service name | Service identity | `entity.name.service.keiro-workspace` | `keiroWorkspaceService` |
| runtime package name | Cabal package identity | `entity.name.package.keiro-workspace` | `keiroWorkspaceRuntimePackage` |
| dotted PascalCase module name | Module prefix | `entity.name.namespace.keiro-workspace` | `keiroWorkspaceModule` |
| relative `.keiro` path | Member source | `string.unquoted.path.keiro-workspace` | `keiroWorkspacePath` |
| `#` through end of line | Comment | `comment.line.number-sign.keiro-workspace` | `keiroWorkspaceComment` |

The highlighters recognize these forms in clause positions. They do not parse
manifest validity, normalize member paths, or infer membership. The upstream
parser remains authoritative for those behaviors.
