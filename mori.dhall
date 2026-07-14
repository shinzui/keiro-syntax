let Schema =
      https://raw.githubusercontent.com/shinzui/mori-schema/143b3138e697e211249f094eddaf8248c590a5a0/package.dhall
        sha256:da11f2da781dca8824039c41ef27177193c060099800221c490d961fd07061c2

in  Schema.Project::{
    , project = Schema.ProjectIdentity::{
      , name = "keiro-syntax"
      , namespace = "shinzui"
      , type = Schema.PackageType.Tool
      , language = Schema.Language.TypeScript
      , lifecycle = Schema.Lifecycle.Active
      , description = Some
          "Syntax highlighting for keiro-dsl (.keiro) in Vim/Neovim and Shiki"
      , domains = [ "Workflow", "DeveloperTooling" ]
      }
    , repos =
      [ Schema.Repo::{
        , name = "keiro-syntax"
        , github = Some "shinzui/keiro-syntax"
        }
      ]
    , packages =
      [ Schema.Package::{
        , name = "keiro-vim"
        , type = Schema.PackageType.Tool
        , language = Schema.Language.Other "VimScript"
        , path = Some "packages/keiro-vim"
        , description = Some
            "Vim/Neovim filetype detection and regex syntax highlighting for .keiro files"
        }
      , Schema.Package::{
        , name = "shiki-keiro"
        , type = Schema.PackageType.Library
        , language = Schema.Language.TypeScript
        , path = Some "packages/shiki-keiro"
        , description = Some
            "TextMate grammar and Shiki language registration for keiro-dsl"
        , runtimeEnvironment = Some Schema.RuntimeEnvironment.Node
        }
      ]
    , dependencies = [ "shinzui/keiro", "shikijs/shiki" ]
    , docs =
      [ Schema.DocRef::{
        , key = "keiro-dsl-language-model"
        , kind = Schema.DocKind.Spec
        , audience = Schema.DocAudience.Module
        , description = Some
            "Authoritative keiro-dsl language model: keywords, operators, literals, and the token-class taxonomy (TextMate scopes and Vim highlight groups) both packages implement"
        , location = Schema.DocLocation.LocalFile "spec/keiro-dsl-language-model.md"
        }
      , Schema.DocRef::{
        , key = "keiro-dsl-test-corpus"
        , kind = Schema.DocKind.Other "Corpus"
        , audience = Schema.DocAudience.Module
        , description = Some
            "Shared corpus of .keiro sample files both packages tokenize in their tests"
        , location = Schema.DocLocation.LocalDir "corpus"
        }
      ]
    }
