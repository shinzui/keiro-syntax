" Vim syntax file for keiro-dsl (.keiro)
" Classification mirrors spec/keiro-dsl-language-model.md Section 6.

if exists('b:current_syntax')
  finish
endif

" --- Comments -------------------------------------------------------------
syntax match keiroComment /#.*$/ contains=@Spell

" --- Strings (double-quoted, no escapes) ----------------------------------
syntax region keiroString start=/"/ end=/"/ oneline

" --- Numbers: versions (v2), durations (5m), and plain integers -----------
syntax match keiroNumber /\<v\d\+\>/
syntax match keiroNumber /\<\d\+\a\+\>/
syntax match keiroNumber /\<\d\+\>/

" --- Booleans and other language constants --------------------------------
syntax keyword keiroBoolean true false
syntax keyword keiroConstant HOLE placeholder skip hole

" --- Primitive types ------------------------------------------------------
syntax keyword keiroType Bool Int Text Time Id Maybe typeid text int

" --- Declaration-introducer keywords --------------------------------------
syntax keyword keiroKeyword context id enum rule aggregate process contract
syntax keyword keiroKeyword intake emit publisher workqueue dispatch workflow operation

" --- Modifiers ------------------------------------------------------------
syntax keyword keiroModifier deprecated upcast from consistency required stable
syntax keyword keiroModifier strategy via policy prefix kind

" --- Control / section keywords -------------------------------------------
syntax keyword keiroStatement regs states command event wire projection guard
syntax keyword keiroStatement write goto fields accept bind dedupe decode
syntax keyword keiroStatement disposition map queue payload retry fanout dedup
syntax keyword keiroStatement enqueue seenIn body step await sleep child topic ex
syntax keyword keiroStatement name input output in out correlate saga stream
syntax keyword keiroStatement target projections on advance schedule timer fire
syntax keyword keiroStatement fireAt source key value run signal query project
syntax keyword keiroStatement result ordering backoff outboxId messageId
syntax keyword keiroStatement idempotencyKey discriminator schemaVersion derive
syntax keyword keiroStatement of after logical physical dlq table maxRetries
syntax keyword keiroStatement maxAttempts delay readModel field to envelope

" Dashed keywords need 'match' because '-' is not a keyword character.
syntax match keiroStatement /\<\%(status-map\|dispatch-id\|fired-event-id\)\>/
syntax match keiroStatement /\<\%(on-appended\|on-duplicate\|on-failed\|on-ok\)\>/
syntax match keiroStatement /\<\%(on-reject\|on-error\|not-mine\|unknown-status\)\>/
syntax match keiroStatement /\<\%(max-attempts\|dead-letter\|kafka-key\)\>/
syntax match keiroStatement /\<\%(kafka-cursor\|cross-check\)\>/

" --- Operators (longest alternatives first) -------------------------------
syntax match keiroOperator /-->/
syntax match keiroOperator /->/
syntax match keiroOperator /--/
syntax match keiroOperator /:=/
syntax match keiroOperator /=>/
syntax match keiroOperator /[=!<>]=/
syntax match keiroOperator /<>/
syntax match keiroOperator /&&/
syntax match keiroOperator /||/
syntax match keiroOperator /[<>@!+]/

" --- Declaration-site type name (optional refinement) ---------------------
syntax match keiroTypeName /\<\%(aggregate\|enum\|contract\|command\|event\|workflow\|operation\|process\|id\|rule\)\s\+\zs\u\w*/

" --- Highlight links ------------------------------------------------------
highlight default link keiroComment   Comment
highlight default link keiroString    String
highlight default link keiroNumber    Number
highlight default link keiroBoolean   Boolean
highlight default link keiroConstant  Constant
highlight default link keiroType      Type
highlight default link keiroTypeName  Type
highlight default link keiroKeyword   Keyword
highlight default link keiroStatement Statement
highlight default link keiroModifier  StorageClass
highlight default link keiroOperator  Operator

let b:current_syntax = 'keiro'
