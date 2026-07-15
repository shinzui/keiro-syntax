" Vim syntax file for keiro-dsl (.keiro)
" Classification mirrors spec/keiro-dsl-language-model.md Section 6.

if exists('b:current_syntax')
  finish
endif

" --- Comments -------------------------------------------------------------
syntax match keiroComment /#.*$/ contains=@Spell

" --- Strings (double-quoted, closed escape set \" \\ \n \t \r) -------------
syntax match keiroStringEscape /\\["\\ntr]/ contained
syntax region keiroString start=/"/ end=/"/ oneline contains=keiroStringEscape

" --- Numbers: versions (v2), durations (5m), fractionals (1.5), integers ---
syntax match keiroNumber /\<v\d\+\>/
syntax match keiroNumber /\<\d\+\a\+\>/
syntax match keiroNumber /\<\d\+\.\d\+\>/
syntax match keiroNumber /\<\d\+\>/

" --- Booleans and other language constants --------------------------------
syntax keyword keiroBoolean true false
syntax keyword keiroConstant HOLE placeholder skip hole

" --- Primitive types ------------------------------------------------------
syntax keyword keiroType Bool Int Text Time Id Maybe typeid text int

" --- Declaration-introducer keywords --------------------------------------
syntax keyword keiroKeyword context id enum rule aggregate process router contract
syntax keyword keiroKeyword intake emit publisher workqueue readmodel workflow operation
" `dispatch` is an introducer, but a 'syntax keyword' would win over (and mis-color) the
" dashed `dispatch-each` / `dispatch-id` control words. Match bare `dispatch` only when it
" is NOT followed by '-', leaving the dashed words to the keiroStatement matches below.
syntax match keiroKeyword /\<dispatch\>-\@!/

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
" Reserved control/section words added in the current parser surface.
syntax keyword keiroStatement module layout prefixed collocated snapshot category
syntax keyword keiroStatement resolve persist patch continueAsNew columns feed scope shape
" Curated contextual words for the router/readmodel/snapshot/workqueue/intake surfaces.
syntax keyword keiroStatement every partial header schema version inline row halt
syntax keyword keiroStatement poison rejected group provision outcome fixture interval
syntax keyword keiroStatement retention standard unlogged partitioned unordered off
syntax keyword keiroStatement strict lenient

" Dashed keywords need 'match' because '-' is not a keyword character.
syntax match keiroStatement /\<\%(status-map\|dispatch-id\|fired-event-id\)\>/
syntax match keiroStatement /\<\%(on-appended\|on-duplicate\|on-failed\|on-ok\)\>/
syntax match keiroStatement /\<\%(on-reject\|on-error\|on-ambiguous\|not-mine\)\>/
syntax match keiroStatement /\<\%(unknown-status\|max-attempts\|dead-letter\)\>/
syntax match keiroStatement /\<\%(kafka-key\|kafka-cursor\|cross-check\)\>/
syntax match keiroStatement /\<\%(dispatch-each\|read-model\|on-terminal\)\>/
syntax match keiroStatement /\<\%(state-codec\|shape-hash\|full-envelope\|dedupe-only\)\>/
syntax match keiroStatement /\<\%(entire-log\|fifo-throughput\|fifo-roundrobin\)\>/

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
highlight default link keiroComment      Comment
highlight default link keiroString       String
highlight default link keiroStringEscape SpecialChar
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
