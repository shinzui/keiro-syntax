# keiro-dsl Language Model

This document is the single, authoritative description of the **lexical surface** of
keiro-dsl — the set of facts both syntax-highlighting packages in this repository
(`packages/keiro-vim/` and `packages/shiki-keiro/`) must implement so they agree on exactly
which words are keywords, which tokens are types, and how each token is classified.

It is self-contained: a contributor who has never seen keiro-dsl can build a highlighter
from this document alone. Section 6 — the **token-class taxonomy** — is the cross-package
contract. Both packages classify the identical set of literal words into the same buckets;
the only difference is the *name* each package emits (a TextMate scope for Shiki, a standard
Vim highlight group for Vim).


## Section 1 — Overview and file extension

**keiro-dsl** is a domain-specific language for describing **event-sourced workflows** in
the keiro framework. A `.keiro` source file declares things like aggregates, processes,
contracts, intakes, emitters, publishers, workqueues, workflows, and operations. (You do not
need to understand event sourcing to highlight the language — this document describes how the
*text* looks, not what it means.)

- **File extension:** `.keiro`
- **Free-form layout:** whitespace and newlines are not significant beyond separating tokens.
  Structure comes from keywords, not from indentation. A highlighter therefore matches tokens
  by pattern anywhere on a line; it must not rely on column position or indentation.
- **Highlighting is purely lexical:** tokens are colored one-by-one by pattern. There is no
  parse of the grammar, no scope nesting tracking, and no type inference. A word is a keyword
  because it is in a fixed list, not because of where it appears (with the two clearly-marked
  *optional* contextual refinements in Section 6).

**Authoritative source.** Every fact in this document is confirmed against the keiro-dsl
parser, a Haskell file using the `megaparsec` library:
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Parser.hs`. The reserved-keyword
list in Section 3 is copied verbatim from that file's `reservedWords` list and must match it
exactly.


## Section 2 — Comments, strings, numbers, identifiers

All facts below are confirmed against `Parser.hs`.

### Comments

A `#` character begins a comment that runs to the **end of the line**. There are **no block
comments**. (Parser: the whitespace consumer is `sc = L.space space1 (L.skipLineComment "#")
empty`.) A comment may appear on its own line, or at the end of a line after code:

```text
# a whole-line comment
context demo-context     # a trailing comment after code
```

### Strings

Strings are **double-quoted**: `"..."`. There are **no escape sequences** — a string is
simply a run of any characters between two double quotes, and a backslash is an ordinary
character with no special meaning. (Parser: `char '"' *> many (anySingleBut '"') *> char
'"'`.) For highlighting purposes treat a string as beginning at a `"` and ending at the next
`"` on the same line; strings are not expected to span lines in practice.

### Numbers

There are three numeric forms. A highlighter should treat all three as the **Number** token
class (Section 6):

- **Plain decimal integers** — `[0-9]+` (e.g. `0`, `1`, `10`, `2024`).
- **Version tokens** — a literal `v` immediately followed by digits, `v[0-9]+` (e.g. `v2`,
  `v3`). These appear after an event name, as in `event Touched v2`.
- **Duration tokens** — digits immediately followed by unit letters, `[0-9]+[a-z]+` (e.g.
  `5m`, `2s`, `30d`). These appear in timer windows like `fireAt input.observedAt + 5m` and
  retry delays like `retry 5s`.

Because the version and duration forms both start with the integer pattern, a highlighter
should match the longer forms (`v[0-9]+`, `[0-9]+[a-z]+`) before, or together with, the plain
integer so that the trailing letters are colored as part of the number.

### Identifiers

There are three identifier shapes:

- **Plain identifiers** — a letter or `_` followed by letters, digits, or `_`:
  `[A-Za-z_][A-Za-z0-9_]*`. Type names, register names, command/event/state names, and enum
  constructors all use this shape. A plain identifier that equals a reserved keyword (Section
  3) is treated as that keyword.
- **Wire words** — used for the context name, id prefixes, enum wire spellings, and
  status-map values; these may contain dashes: `[A-Za-z0-9][A-Za-z0-9_-]*` (e.g.
  `hospital-capacity`, `partial-divert`, `rsv`).
- **Dotted references** — a plain identifier with one or more `.name` parts, e.g.
  `input.hospitalId` or `timer.id`.


## Section 3 — Reserved keywords (authoritative)

These are the words the parser forbids as bare identifiers — the `reservedWords` list in
`Parser.hs`. Because a plain identifier equal to one of these is always treated as the
keyword, they are **always** highlighted as keywords, regardless of context. The list is
copied verbatim from the parser and contains exactly **50** words:

```text
context   id        enum       rule       ex         aggregate  regs       states
command   event     wire       projection guard      write      emit       goto
fields    status-map true      false      deprecated upcast     from       HOLE
intake    contract  topic      accept     bind       dedupe     decode     disposition
publisher map       workqueue  queue      payload    retry      fanout     dedup
enqueue   seenIn    workflow   operation  consistency body      step       await
sleep     child
```

If the parser's `reservedWords` ever changes, the parser's list wins: update this section to
match and record the difference in this repository's plan
`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md` (Surprises & Discoveries).


## Section 4 — Curated contextual keywords

The parser also recognizes many words **in context** that are *not* in `reservedWords`. They
could legally be used as identifiers, but in practice they read as keywords and users expect
them highlighted. The following curated set is highlighted as keywords by both packages:

```text
process      name        input       output      in          out
correlate    via         saga        stream      target      projections
on           advance     dispatch    schedule    timer       fire
fireAt       source      key         value       run         signal
query        project     result      ordering    backoff     outboxId
messageId    idempotencyKey          discriminator           schemaVersion
derive       of          after       required    stable      strategy
policy       prefix      kind        logical     physical    dlq
table        maxRetries  maxAttempts delay       readModel   field
to           envelope    cross-check
```

### Dashed contextual keywords (match-before-bare-words)

A small set of node/section words written **with dashes** appear in process timers and
dispositions and should also be colored as keywords:

```text
dispatch-id    fired-event-id  on-appended   on-duplicate  on-failed
on-ok          on-reject       on-error      not-mine      unknown-status
max-attempts   dead-letter     kafka-key     kafka-cursor  on-blocked
```

**Implementer note:** because these contain dashes, a highlighter **must match them before**
matching bare keywords or identifiers. Otherwise the leading segment (`on`, `max`, `dead`,
...) is matched first and the rest of the word is mis-colored. In a TextMate grammar this
means placing these multi-segment patterns earlier in the pattern list; in Vim it means
defining their `syntax match` (or `syntax keyword` with the dashed spelling) so it wins.


## Section 5 — Operators and punctuation

The operators and punctuation, listed **longest-match first** — a highlighter must try the
longer ones before the shorter ones (e.g. `-->` before `->` before `-`, and `==` before `=`):

```text
-->   --   ->   :=   =>   ==   !=   <=   >=   <>   &&   ||   <   >   +   =   @   !   :   ;   .   ,
```

Roles, briefly:

- `-->` / `--` — aggregate transitions, written `State -- Command -->`.
- `->` — the result / transition arrow.
- `:=` — register assignment, e.g. `write x := y`.
- `=>` — the map / case arrow (status maps, rule cases, dispositions).
- `==`, `!=`, `<`, `>`, `<=`, `>=` — comparisons in guard expressions.
- `&&`, `||` — boolean operators in guards.
- `<>` — string concatenation in id expressions.
- `+` — adds a duration to a time (`fireAt input.observedAt + 5m`).
- `=` — assignment in `prefix=...`, `kind=...`, register initializers, and enum constructors.
- `@` — the aggregate-reference separator (`Hospital@input.hospitalId`).
- `!` — marks a terminal state (`Expired!`).
- `:` — separates a field from its type.
- `;` — separates clauses.
- `.` — the dotted reference separator.
- `,` — separates list items.


## Section 6 — Token-class taxonomy (the cross-package contract)

This is the table both packages implement. The **Token class** is the conceptual bucket;
the **TextMate scope** is the string the Shiki package uses as the pattern `name`; the
**Vim group** is the standard highlight group the Vim package links its `keiro*` syntax group
to. Both packages must classify the identical literal words into the keyword classes
(introducer / control / modifier / constant / primitive type) so they agree.

| Token class | Members / pattern | TextMate scope | Vim group |
|---|---|---|---|
| Declaration introducer | the subset of reserved + contextual words that begin a top-level item or node: `context`, `id`, `enum`, `rule`, `aggregate`, `process`, `contract`, `intake`, `emit`, `publisher`, `workqueue`, `dispatch`, `workflow`, `operation` | `keyword.declaration.keiro` | `Keyword` |
| Control / section keyword | all other reserved keywords (Section 3) **and** all curated contextual keywords (Section 4), e.g. `regs`, `states`, `command`, `event`, `guard`, `write`, `goto`, `on`, `advance`, `schedule`, `timer`, `bind`, `accept`, `map`, `step`, `await`, ... | `keyword.control.keiro` | `Statement` |
| Modifier | `deprecated`, `upcast`, `from`, `consistency`, `required`, `stable`, `strategy`, `via`, `policy`, `prefix`, `kind` | `storage.modifier.keiro` | `StorageClass` |
| Language constant | `true`, `false`, `HOLE`, `placeholder`, `skip`, `hole` | `constant.language.keiro` (give `true` / `false` the more specific `constant.language.boolean.keiro`) | `Boolean` for `true` / `false`, else `Constant` |
| Primitive type | `Bool`, `Int`, `Text`, `Time`, `Id`, `Maybe`, `typeid`, `text`, `int` | `support.type.keiro` | `Type` |
| Declaration-site type name | a CamelCase plain identifier appearing immediately after a declaration introducer that names a type (`enum X`, `aggregate X`, `contract X`, `command X`, `event X`, `id X`, `workflow X`, `operation X`, `process X`) | `entity.name.type.keiro` | `Type` |
| String | `"..."` (Section 2) | `string.quoted.double.keiro` | `String` |
| Number | integer, `v[0-9]+`, and `[0-9]+[a-z]+` duration (Section 2) | `constant.numeric.keiro` | `Number` |
| Comment | `#` to end of line (Section 2) | `comment.line.number-sign.keiro` | `Comment` |
| Operator | the symbols in Section 5 | `keyword.operator.keiro` | `Operator` |
| Derivation function (optional) | a plain identifier appearing right after `via` or `derive` (e.g. `idText`, `uuidv5`, `reservationStream`) | `entity.name.function.keiro` | `Function` |

**Mandatory vs. optional.** The **Declaration-site type name** and **Derivation function**
classes are *optional refinements* — they require looking at the token *before* the current
one, which a purely token-by-token highlighter may not do. A package that does not implement
them is still correct; it simply colors those identifiers as plain text. **Every other class
is mandatory.** Both packages must classify the identical literal words into the keyword
classes (introducer / control / modifier / constant / primitive type) so that, given the same
`.keiro` input, they agree on which words are keywords, types, constants, strings, numbers,
comments, and operators.
