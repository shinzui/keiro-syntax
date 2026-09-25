" Vim syntax for keiro-dsl service workspace manifests.
" Classification mirrors spec/keiro-workspace-language-model.md.
if exists('b:current_syntax')
  finish
endif

syntax match keiroWorkspaceComment /#.*$/ contains=@Spell

" The value rules are contained and reached only from their own clause word.
" nextgroup lets Vim resume after the word without losing a same-start match.
syntax match keiroWorkspaceService /[A-Za-z0-9][A-Za-z0-9_-]*/ contained
syntax match keiroWorkspaceRuntimePackage /[A-Za-z0-9][A-Za-z0-9_.-]*/ contained
syntax match keiroWorkspaceModule /[A-Z][A-Za-z0-9_]*\%(\.[A-Z][A-Za-z0-9_]*\)*/ contained
syntax match keiroWorkspaceLayout /\%(prefixed\|collocated\)\>/ contained
syntax match keiroWorkspacePath /[A-Za-z0-9_./-]*\.keiro\>/ contained

syntax match keiroWorkspaceKeyword /^\s*\zsservice\ze\s/ nextgroup=keiroWorkspaceService skipwhite
syntax match keiroWorkspaceKeyword /^\s*\zsruntime-package\ze\s/ nextgroup=keiroWorkspaceRuntimePackage skipwhite
syntax match keiroWorkspaceKeyword /^\s*\zsmodule\ze\s/ nextgroup=keiroWorkspaceModule skipwhite
syntax match keiroWorkspaceKeyword /^\s*\zslayout\ze\s/ nextgroup=keiroWorkspaceLayout skipwhite
syntax match keiroWorkspaceKeyword /^\s*\zsspec\ze\s/ nextgroup=keiroWorkspacePath skipwhite

highlight default link keiroWorkspaceComment        Comment
highlight default link keiroWorkspaceService        Identifier
highlight default link keiroWorkspaceRuntimePackage Identifier
highlight default link keiroWorkspaceModule         Type
highlight default link keiroWorkspaceLayout         StorageClass
highlight default link keiroWorkspacePath           String
highlight default link keiroWorkspaceKeyword        Keyword

let b:current_syntax = 'keiro-workspace'
