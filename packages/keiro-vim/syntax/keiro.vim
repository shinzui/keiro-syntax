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

" --- Numbers: integers, durations (5m), fractionals (1.5), versions (v2) ---
" Order matters, and it is the *opposite* of a TextMate grammar's. Vim resolves a tie between
" two items that start at the same column in favour of the one defined LAST, so the plain
" integer must come FIRST or it swallows the head of every longer form. It only ever collided
" with the fractional rule — `\<\d\+\>` cannot match `5` in `5m` or the `2` in `v2`, because
" '\>' needs a non-word character after the digits — but that collision left `1.5` rendering
" as a coloured `1`, an uncoloured `.`, and a coloured `5`. Do not "tidy" these back to
" longest-first; see docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md.
syntax match keiroNumber /\<\d\+\>/
syntax match keiroNumber /\<\d\+\a\+\>/
syntax match keiroNumber /\<\d\+\.\d\+\>/
syntax match keiroNumber /\<v\d\+\>/

" --- Booleans and other language constants --------------------------------
syntax keyword keiroBoolean true false
" `null` is the on-missing sentinel of a mapped type's wire field: a value, not a clause
" label, so it joins HOLE rather than the control words.
syntax keyword keiroConstant HOLE placeholder skip hole null

" --- Primitive types ------------------------------------------------------
" `Map` (capitalized) is a type; the reserved lowercase `map` is a control word below.
" 'syntax keyword' is case sensitive by default, so the two never collide.
" `Integer` is a distinct type from `Int`, not an alias (keiro-dsl 8b0f55b): upstream uses `Int`
" for machine integers and `Integer` for exact arbitrary-precision ones. 'syntax keyword' matches
" whole words, so `Int` never claims the head of `Integer`.
" `Day` is the newest spelling of the mapped type expression (keiro-dsl 6b92bd52) — a calendar
" date with no time-of-day part and no time zone, so a different type from `Time`, and unlike
" `Time` it has no alias. Whole-word matching is load-bearing for it: upstream's own fixture
" declares `LocalDay`, `MaybeLocalDay`, and a field named `optionalDay`, none of which may be
" touched. 'syntax keyword' is also case sensitive, so a lowercase `day` field name stays plain.
" `Set` (keiro-dsl 01ba6c58) is the first half of the language's only two-word type spelling,
" `Set Text` — an unordered collection of text values with no duplicates, unlike the ordered
" `List Text`. The parser admits no other element type after `Set`, but one ordinary keyword here
" colours the phrase correctly wherever it is legal; a two-word rule would buy nothing visible.
" Whole-word matching is load-bearing for it in a way it was not for `Day`: `Set` is the *head* of
" `Settle`, `Settled`, `SettleEntry`, `TicketSettled`, and `EntrySettled`, which are in three
" corpus files this word never came near. 'syntax keyword' never matches a word prefix, so all
" five stay plain — and the tests in test/highlight_spec.lua pin that against those files.
syntax keyword keiroType Bool Int Integer Text Time UTCTime Day Set Id Maybe Natural Json Optional List Map
syntax keyword keiroType typeid text int
" `bool` joins `text` and `int` as the third lowercase legacy workqueue payload type
" (keiro-dsl d7be0fe6..9fb54d56, `pLegacyPayload` in Parser/Queue.hs).
syntax keyword keiroType bool

" --- Declaration-introducer keywords --------------------------------------
syntax keyword keiroKeyword context id enum rule mapped aggregate process router contract
syntax keyword keiroKeyword intake emit publisher workqueue readmodel workflow operation
" `language` opens the optional version preamble (`language keiro-dsl 1`), the only clause
" that sits above `context`. Matched unconditionally like every other word here: the parser's
" first-significant-line rule is not something a lexical highlighter models.
syntax keyword keiroKeyword language
" `dispatch` is an introducer, but a 'syntax keyword' would win over (and mis-color) the
" dashed `dispatch-each` / `dispatch-id` control words. Match bare `dispatch` only when it
" is NOT followed by '-', leaving the dashed words to the keiroStatement matches below.
syntax match keiroKeyword /\<dispatch\>-\@!/
" The four dashed Language-5 projection-catalog declarations (keiro-dsl 9fb54d56 range,
" Parser/ProjectionCatalog.hs). They begin top-level items, so they are introducers; being
" dashed they need 'match'. The fifth catalog declaration, `target`, keeps the Statement class
" it has always had as a clause word — a lexical highlighter cannot tell the two uses apart.
syntax match keiroKeyword /\<\%(rebuild-group\|projection-revision\|external-read\|projection-owner\)\>/

" --- Modifiers ------------------------------------------------------------
" `retiring` and `deprecated` are the two mutually exclusive event prefixes: an event on its
" way off the write path, and one already off it. Both qualify the declaration `event`
" introduces, so both are modifiers rather than statements.
" `from` is a prefix of the dashed checkpoint policies `from-beginning` / `from-current-head`,
" so it is matched with the '-\@!' guard further down rather than listed here.
syntax keyword keiroModifier deprecated retiring upcast consistency required stable
syntax keyword keiroModifier strategy via policy prefix kind
" `structural` / `opaque` / `nominal` select a mapped declaration's family and `record` /
" `union` its shape; `optional` is `required`'s partner on a mapped wire field. All qualify the
" declaration `mapped` introduces rather than introducing one, so all are modifiers.
" `nominal` is the third family, added by keiro-dsl fcd6748: `mapped nominal X : Text { ... }`.
syntax keyword keiroModifier structural opaque nominal record union optional
" The `replay-only` transition prefix is dashed, and '-' is not a keyword character, so it
" needs 'match' and must cover the whole spelling — otherwise `replay` and `only` are seen
" as two separate words and the marker is left plain.
syntax match keiroModifier /\<replay-only\>/
" Language 5/6 modifiers: `once` qualifies a reaction `schedule`, `silent` qualifies the
" `no-action` of an accepted block, and `declarative` selects a router's resolve form the way
" `stable` always has.
syntax keyword keiroModifier once silent declarative
syntax match keiroModifier /\<from\>-\@!/

" --- Control / section keywords -------------------------------------------
syntax keyword keiroStatement regs states command event wire guard
syntax keyword keiroStatement write goto fields accept bind decode
syntax keyword keiroStatement disposition map queue payload retry fanout dedup
syntax keyword keiroStatement enqueue seenIn body step await sleep child topic ex
syntax keyword keiroStatement name input output in out correlate saga stream
syntax keyword keiroStatement target projections advance schedule timer fire
syntax keyword keiroStatement fireAt source key value run signal query project
syntax keyword keiroStatement ordering backoff outboxId messageId
syntax keyword keiroStatement idempotencyKey discriminator schemaVersion derive
syntax keyword keiroStatement of after logical physical dlq table maxRetries
syntax keyword keiroStatement maxAttempts delay readModel field to envelope
" Reserved control/section words added in the current parser surface.
syntax keyword keiroStatement module layout prefixed collocated snapshot category
syntax keyword keiroStatement resolve persist patch continueAsNew columns feed scope
" Curated contextual words for the router/readmodel/snapshot/workqueue/intake surfaces.
syntax keyword keiroStatement every partial header version inline row halt
syntax keyword keiroStatement poison rejected group provision outcome fixture interval
syntax keyword keiroStatement retention standard unlogged partitioned unordered off
syntax keyword keiroStatement strict lenient
" Mapped-type clause labels and enumerated clause values (see the mapped-type subsection of
" spec/keiro-dsl-language-model.md Section 4). `binding` is deliberately absent: it is a
" prefix of the dashed `binding-version` and so needs the '-\@!' match below.
syntax keyword keiroStatement haskell package type codec fixtures initial object
syntax keyword keiroStatement constructor string tag contents as reject ignore
" `using` introduces the consumer binding block on an `id` or `enum` declaration
" (`id OrderId prefix=ord using { ... }`). It opens a clause of a declaration another word
" already began — like `wire` inside a `mapped structural` block — so it is a statement, not a
" modifier. No '-\@!' guard: it is neither dashed nor the prefix of a dashed word.
syntax keyword keiroStatement using
" `implementation` opens the transition clause `implementation hole`, which hands one
" transition's behaviour to consumer-written Haskell. It is a peer of `guard`, `write`, `emit`,
" and `goto`, so it is a statement. Its second word `hole` is already in the constant list
" above — it has been there since plan 4 as the `derive "..." hole` and `resolve ... hole`
" marker — so the clause reads as a statement followed by a constant.
syntax keyword keiroStatement implementation
" The Language 5/6 surface (keiro-dsl d7be0fe6..9fb54d56): projection-catalog clause labels
" and values, readmodel freshness/backing, domain outcomes, process reactions and their timers,
" declarative router selection, and delegated intake idempotence. None is reserved. `replay`,
" `provisioner`, and `validator` are absent here because each heads a dashed word; they are
" '-\@!' matches below.
syntax keyword keiroStatement reset clear preserve targets order promotion index constraint
syntax keyword keiroStatement all delivery subscription explicit fail freshness immediate
syntax keyword keiroStatement backing accepted rejection reactions when otherwise cancel
syntax keyword keiroStatement timers identity with where recipient empty failure redelivery
syntax keyword keiroStatement ack idempotence delegated

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
" `keiro-dsl` is the dialect name in the version preamble. It is the one dashed word here
" whose leading segment is not itself a keyword — `keiro` and `dsl` mean nothing to this file
" — so unlike `on-ok` or `dispatch-each` it needs no '-\@!' guard on a bare prefix. It only
" has to be matched at all, so the whole spelling is one token instead of plain text.
syntax match keiroStatement /\<keiro-dsl\>/
" Language 5/6 dashed clause labels and values.
syntax match keiroStatement /\<\%(depends-on\|schema-version\|provisioner-version\|expected-shape\)\>/
syntax match keiroStatement /\<\%(validator-version\|owned-sequence\|result-schema\|result-type\)\>/
syntax match keiroStatement /\<\%(compatible-revisions\|surface-generation\|checkpoint-on-missing\)\>/
syntax match keiroStatement /\<\%(from-beginning\|from-current-head\|live-only\|wait-for-head\)\>/
syntax match keiroStatement /\<\%(fifo-heads\|domain-outcomes\|no-op\|no-action\|max-recipients\)\>/

" Bare words that are a *prefix* of a dashed word above must not be 'syntax keyword': a
" keyword outranks a match starting at the same column, so `on` would claim the head of
" `on-ok` and leave `-ok` uncolored, and `binding`, `dedupe`, `shape` would do the same to
" `binding-version`, `dedupe-only`, `shape-hash`. Match them only when NOT followed by '-',
" exactly as `dispatch` is handled above. The Language 5/6 range (keiro-dsl 9fb54d56) added
" seven more: `projection` (projection-revision, projection-owner), `schema` (schema-version),
" `result` (result-schema, result-type), `provisioner`, `validator`, `replay` (the long-standing
" `replay-only`), and the modifier `from` (from-beginning, from-current-head), which is matched
" beside the other modifiers above. Those twelve (with `dispatch`) are the complete set of
" prefix collisions across Sections 3 and 4 of spec/keiro-dsl-language-model.md.
"
" A bare word appearing in the *interior* of a dashed word needs no such treatment: Vim
" prefers the match that starts earlier, which is why `status-map` survives `map` being a
" keyword and `unknown-fields` survives `fields` being one.
syntax match keiroStatement /\<on\>-\@!/
syntax match keiroStatement /\<binding\>-\@!/
syntax match keiroStatement /\<dedupe\>-\@!/
syntax match keiroStatement /\<shape\>-\@!/
syntax match keiroStatement /\<projection\>-\@!/
syntax match keiroStatement /\<schema\>-\@!/
syntax match keiroStatement /\<result\>-\@!/
syntax match keiroStatement /\<provisioner\>-\@!/
syntax match keiroStatement /\<validator\>-\@!/
syntax match keiroStatement /\<replay\>-\@!/

" The two roots of a version-2 scalar expression: `reg.balance` reads a register, `cmd.balance`
" reads a field of the command being handled. They are the same class as the older dotted roots
" `input.` and `timer.`, but unlike those they are matched ONLY when a '.' follows. Two reasons,
" both in Section 4 of spec/keiro-dsl-language-model.md: upstream's `pScalarPath` gives these
" words meaning only as the head of a dotted path (a register named `reg` still parses), and
" `cmd` is already a wire word in five corpus files (`id CommandId prefix=cmd`), which an
" unconditional rule would recolour. '\>' keeps the reserved word `regs` out of it; '\.\@='
" is a zero-width lookahead for the dot.
syntax match keiroStatement /\<\%(reg\|cmd\)\>\.\@=/

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
" `*` multiplies two operands of a version-2 scalar expression (`write x := reg.x * 2`). The
" matching subtraction operator is a bare `-`, which this file deliberately does not claim:
" Section 5 of spec/keiro-dsl-language-model.md lists `-->`, `--`, and `->` but no bare `-`, and
" a rule for one would colour the first character of every transition arrow and the dash inside
" every wire word (`hospital-capacity`).
syntax match keiroOperator /[<>@!+*]/

" --- Declaration-site type name (optional refinement) ---------------------
" `record` / `union` / `opaque` / `nominal` are a mapped declaration's shape and family words,
" listed here so this rule stays in step with Section 6 of spec/keiro-dsl-language-model.md.
" `value` is the fourth shape word (`mapped structural value MaybeText`, keiro-dsl a6110a94). It
" is listed here for the same Section 6 parity even though, unlike the four beside it, it is a
" keiroStatement rather than a keiroModifier: one word gets one class, and `value` is also the
" older workflow-signal clause label `signal ... value <Type>`. The '\u' is load-bearing for it
" — a lowercase-admitting name slot would claim the `as` of `value as "value" : Text required`.
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
syntax match keiroTypeName /\<\%(aggregate\|enum\|contract\|command\|event\|workflow\|operation\|process\|id\|rule\|record\|union\|opaque\|nominal\|value\)\s\+\zs\u\w*/

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
