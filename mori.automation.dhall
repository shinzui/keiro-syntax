let Schema =
      https://raw.githubusercontent.com/shinzui/mori-schema/143b3138e697e211249f094eddaf8248c590a5a0/package.dhall
        sha256:da11f2da781dca8824039c41ef27177193c060099800221c490d961fd07061c2

in  Schema.Automation::{
    , events =
      [ Schema.EventSelector.SignalSelector Schema.SignalSelector::{
        , name = "keiro-dsl-surface-changed"
        , signalTypes = [ "KeiroDslSurfaceChanged" ]
        , sourceProjects = [ "shinzui/keiro" ]
        }
      ]
    , reactions =
      [ Schema.Reaction::{
        , name = "sync-keiro-dsl"
        , on = [ "keiro-dsl-surface-changed" ]
        , actions =
          [ Schema.ReactionAction.RunCommand Schema.RunCommandAction::{
            , command = "just"
            , args = [ "sync-keiro-dsl" ]
            , timeout = Some +5400
            , env =
              [ { mapKey = "KEIRO_DSL_COMMIT", mapValue = "{{meta.commit}}" }
              , { mapKey = "KEIRO_DSL_SUBJECT", mapValue = "{{meta.subject}}" }
              ]
            }
          ]
        }
      ]
    , execution = Schema.ExecutionPolicy::{ allowLocal = True }
    }
