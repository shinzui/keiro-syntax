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
" `null` is the on-missing sentinel of a mapped type's wire field: a value, not a clause
" label, so it joins HOLE rather than the control words.
syntax keyword keiroConstant HOLE placeholder skip hole null

" --- Primitive types ------------------------------------------------------
" `Map` (capitalized) is a type; the reserved lowercase `map` is a control word below.
" 'syntax keyword' is case sensitive by default, so the two never collide.
syntax keyword keiroType Bool Int Text Time UTCTime Id Maybe Natural Json Optional List Map
syntax keyword keiroType typeid text int

" --- Declaration-introducer keywords --------------------------------------
syntax keyword keiroKeyword context id enum rule mapped aggregate process router contract
syntax keyword keiroKeyword intake emit publisher workqueue readmodel workflow operation
" `dispatch` is an introducer, but a 'syntax keyword' would win over (and mis-color) the
" dashed `dispatch-each` / `dispatch-id` control words. Match bare `dispatch` only when it
" is NOT followed by '-', leaving the dashed words to the keiroStatement matches below.
syntax match keiroKeyword /\<dispatch\>-\@!/

" --- Modifiers ------------------------------------------------------------
" `retiring` and `deprecated` are the two mutually exclusive event prefixes: an event on its
" way off the write path, and one already off it. Both qualify the declaration `event`
" introduces, so both are modifiers rather than statements.
syntax keyword keiroModifier deprecated retiring upcast from consistency required stable
syntax keyword keiroModifier strategy via policy prefix kind
" `structural` / `opaque` select a mapped declaration's family and `record` / `union` its
" shape; `optional` is `required`'s partner on a mapped wire field. All qualify the
" declaration `mapped` introduces rather than introducing one, so all are modifiers.
syntax keyword keiroModifier structural opaque record union optional
" The `replay-only` transition prefix is dashed, and '-' is not a keyword character, so it
" needs 'match' and must cover the whole spelling — otherwise `replay` and `only` are seen
" as two separate words and the marker is left plain.
syntax match keiroModifier /\<replay-only\>/

" --- Control / section keywords -------------------------------------------
syntax keyword keiroStatement regs states command event wire projection guard
syntax keyword keiroStatement write goto fields accept bind decode
syntax keyword keiroStatement disposition map queue payload retry fanout dedup
syntax keyword keiroStatement enqueue seenIn body step await sleep child topic ex
syntax keyword keiroStatement name input output in out correlate saga stream
syntax keyword keiroStatement target projections advance schedule timer fire
syntax keyword keiroStatement fireAt source key value run signal query project
syntax keyword keiroStatement result ordering backoff outboxId messageId
syntax keyword keiroStatement idempotencyKey discriminator schemaVersion derive
syntax keyword keiroStatement of after logical physical dlq table maxRetries
syntax keyword keiroStatement maxAttempts delay readModel field to envelope
" Reserved control/section words added in the current parser surface.
syntax keyword keiroStatement module layout prefixed collocated snapshot category
syntax keyword keiroStatement resolve persist patch continueAsNew columns feed scope
" Curated contextual words for the router/readmodel/snapshot/workqueue/intake surfaces.
syntax keyword keiroStatement every partial header schema version inline row halt
syntax keyword keiroStatement poison rejected group provision outcome fixture interval
syntax keyword keiroStatement retention standard unlogged partitioned unordered off
syntax keyword keiroStatement strict lenient
" Mapped-type clause labels and enumerated clause values (see the mapped-type subsection of
" spec/keiro-dsl-language-model.md Section 4). `binding` is deliberately absent: it is a
" prefix of the dashed `binding-version` and so needs the '-\@!' match below.
syntax keyword keiroStatement haskell package type codec fixtures initial object
syntax keyword keiroStatement constructor string tag contents as reject ignore

" Dashed keywords need 'match' because '-' is not a keyword character.
syntax match keiroStatement /\<\%(status-map\|dispatch-id\|fired-event-id\)\>/
syntax match keiroStatement /\<\%(on-appended\|on-duplicate\|on-failed\|on-ok\)\>/
syntax match keiroStatement /\<\%(on-reject\|on-error\|on-ambiguous\|not-mine\)\>/
syntax match keiroStatement /\<\%(unknown-status\|max-attempts\|dead-letter\)\>/
syntax match keiroStatement /\<\%(kafka-key\|kafka-cursor\|cross-check\)\>/
syntax match keiroStatement /\<\%(dispatch-each\|read-model\|on-terminal\)\>/
syntax match keiroStatement /\<\%(state-codec\|shape-hash\|full-envelope\|dedupe-only\)\>/
syntax match keiroStatement /\<\%(entire-log\|fifo-throughput\|fifo-roundrobin\)\>/
syntax match keiroStatement /\<\%(on-blocked\|on-missing\|unknown-fields\)\>/
syntax match keiroStatement /\<\%(binding-version\|canonical-type\|tagged-object\)\>/

" Bare words that are a *prefix* of a dashed word above must not be 'syntax keyword': a
" keyword outranks a match starting at the same column, so `on` would claim the head of
" `on-ok` and leave `-ok` uncolored, and `binding`, `dedupe`, `shape` would do the same to
" `binding-version`, `dedupe-only`, `shape-hash`. Match them only when NOT followed by '-',
" exactly as `dispatch` is handled above. Those five (with `dispatch`) are the complete set of
" prefix collisions across Sections 3 and 4 of spec/keiro-dsl-language-model.md.
"
" A bare word appearing in the *interior* of a dashed word needs no such treatment: Vim
" prefers the match that starts earlier, which is why `status-map` survives `map` being a
" keyword and `unknown-fields` survives `fields` being one.
syntax match keiroStatement /\<on\>-\@!/
syntax match keiroStatement /\<binding\>-\@!/
syntax match keiroStatement /\<dedupe\>-\@!/
syntax match keiroStatement /\<shape\>-\@!/

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
" `record` / `union` / `opaque` are a mapped declaration's shape words, listed here so this
" rule stays in step with Section 6 of spec/keiro-dsl-language-model.md.
"
" NOTE: this rule is currently inert, and has been since it was written. Vim tries syntax
" items only at the current scan column, and 'syntax keyword' outranks 'syntax match' at the
" same column, so the introducer is claimed by its keyword rule and the scan resumes *after*
" it — at which point this pattern, which must begin at the introducer, can no longer match.
" '\zs' moves the highlighted region but not where the pattern has to start. Section 6 marks
" the Declaration-site-type-name class an *optional* refinement, so leaving it unimplemented
" is compliant; the Shiki package does implement it. Making it work in Vim means restructuring
" the introducer declarations to carry 'nextgroup=keiroTypeName skipwhite' with a 'contained'
" keiroTypeName, which is a change to every introducer line and is left to a future plan.
syntax match keiroTypeName /\<\%(aggregate\|enum\|contract\|command\|event\|workflow\|operation\|process\|id\|rule\|record\|union\|opaque\)\s\+\zs\u\w*/

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
