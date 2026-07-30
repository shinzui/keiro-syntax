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

**Out of scope: the `.keiro-workspace` manifest.** keiro-dsl also has a *second* file format,
a service workspace manifest with the extension `.keiro-workspace`, parsed by a different
module (`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/src/Keiro/Dsl/Workspace.hs`) with its
own grammar. Neither this document nor either package covers it — both packages register only
for `.keiro`. Its complete lexical surface is written down under Surprises & Discoveries in
`docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`, so a future
plan that decides to highlight it starts from recorded facts rather than fresh research.


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

Strings are **double-quoted**: `"..."`. A string body supports a **closed set of escape
sequences** introduced by a backslash: `\"`, `\\`, `\n`, `\t`, `\r`. An **unescaped newline**
inside a string is invalid, and any **other** backslash sequence (e.g. `\q`) is invalid.
(Parser: `stringLit`'s `strChar` = `char '\\' *> escapeCode <|> … <|> anySingleBut '"'`, with
`escapeCode` accepting exactly `" \ n t r`.) For highlighting purposes treat a string as
beginning at a `"` and ending at the next `"` on the same line; color each `\"`/`\\`/`\n`/
`\t`/`\r` inside the string with the **String escape** class (Section 6) so it stands out
from the surrounding string body. Strings are not expected to span lines in practice.

### Numbers

There are three numeric forms. A highlighter should treat all three as the **Number** token
class (Section 6):

- **Plain decimal integers** — `[0-9]+` (e.g. `0`, `1`, `10`, `2024`). In a register
  initializer, and as the default value of a mapped-type wire field's `on-missing=` clause
  (Section 4), the integer may carry a leading `-` sign (`-?[0-9]+`, e.g. `count Int = -1`
  and `on-missing=-1`; parsers `signedDecimalText` and `integerLiteral`). Because `-` is also
  the transition/arrow operator, a purely lexical highlighter colors the digits as a number
  and the `-` as an operator — that is the correct, non-over-reaching behavior.
- **Fractional decimals** — a digit run, a `.`, and a digit run, `[0-9]+\.[0-9]+` (e.g. a
  backoff `multiplier=1.5`; parser `decimalText`). Match this before the plain integer so
  `1.5` is one number and not `1` `.` `5`.
- **Version tokens** — a literal `v` immediately followed by digits, `v[0-9]+` (e.g. `v2`,
  `v3`). These appear after an event name, as in `event Touched v2`.
- **Duration tokens** — digits immediately followed by a single unit letter `s`, `m`, or `h`,
  i.e. `[0-9]+[smh]` (e.g. `5m`, `2s`, `3h`). These appear in timer windows like
  `fireAt input.observedAt + 5m` and retry delays like `retry 5s`. (Parser `pWindow` accepts
  only `s`/`m`/`h`; there is no `d` unit.)

Because the version, duration, and fractional forms all start with the integer pattern, a
highlighter should match the longer forms (`v[0-9]+`, `[0-9]+[a-z]+`, `[0-9]+\.[0-9]+`)
before, or together with, the plain integer so that the trailing letters or fractional part
are colored as part of the number.

### Identifiers

There are three identifier shapes:

- **Plain identifiers** — a letter or `_` followed by letters, digits, or `_`:
  `[A-Za-z_][A-Za-z0-9_]*`. Type names, register names, command/event/state names, and enum
  constructors all use this shape. A plain identifier that equals a reserved keyword (Section
  3) is treated as that keyword.
- **Wire words** — used for the context name, id prefixes, enum wire spellings, and
  status-map values; these may contain dashes: `[A-Za-z0-9][A-Za-z0-9_-]*` (e.g.
  `hospital-capacity`, `partial-divert`, `rsv`).
- **Patch ids** — a wire word that may additionally contain a colon: `[A-Za-z0-9][A-Za-z0-9_:-]*`
  (parser `patchIdWord`, used after `patch` in a workflow body). A highlighter that colors the
  `:` as an operator and the rest as an identifier is fine.
- **Dotted references** — a plain identifier with one or more `.name` parts, e.g.
  `input.hospitalId` or `timer.id`.
- **Module prefixes** — one or more PascalCase segments joined by dots, `[A-Z][A-Za-z0-9_]*`
  (`.[A-Z]…`)\* (parser `pModulePrefix`, used after `module`, e.g. `Acme.Services`).


## Section 3 — Reserved keywords (authoritative)

These are the words the parser forbids as bare identifiers — the `reservedWords` list in
`Parser.hs`. Because a plain identifier equal to one of these is always treated as the
keyword, they are **always** highlighted as keywords, regardless of context. The list is
copied verbatim from the parser (order preserved) and contains exactly **72** words:

```text
context   module    layout    prefixed      collocated  id
enum      rule      mapped    ex            aggregate   regs
states    command   event     wire          projection  snapshot
category  guard     write     emit          goto        fields
status-map true     false     retiring      deprecated  upcast
from      HOLE      process   router        dispatch-each resolve
read-model dispatch intake    contract      topic       accept
bind      dedupe    persist   decode        disposition publisher
map       workqueue queue     payload       retry       fanout
dedup     enqueue   seenIn    workflow      operation   consistency
body      step      await     sleep         child       patch
continueAsNew readmodel columns feed        scope       shape
```

Note that `readmodel` (no dash) and `read-model` (with a dash) are **two distinct** reserved
words: `readmodel` introduces the read-model node, while `read-model` appears inside a
router's `resolve stable via read-model X` clause. `status-map`, `dispatch-each`, and
`read-model` are the three dashed reserved words (match them before bare words — see Section
4's implementer note).

`retiring` and `deprecated` are the two mutually exclusive optional prefixes on an **event
declaration**, occupying one shared slot (parser `pEvent`: `option (False, False) (choice
[(True, False) <$ keyword "retiring", (False, True) <$ keyword "deprecated"])`, immediately
before `keyword "event"`). `retiring` marks an event on its way out of the write path that
must keep a live emitting transition for now; `deprecated` marks one already off the write
path. Because they qualify the declaration `event` introduces rather than introducing one
themselves, both are classified as **Modifiers** in Section 6, not as control keywords:

```text
event TransferReservationCreated   = fields(RequestTransferReservation)
retiring event TransferReservationConfirmed { reservationId hospitalId commandId }
```

**Not every keyword is a reserved word.** Reservation exists for one purpose: to stop the
plain-identifier parser `ident` from swallowing a structural word. Two different reasons put
a keyword outside `reservedWords`, and both are normal:

- A keyword written **with a dash** *cannot* need reserving. `ident` accepts only
  `[A-Za-z0-9_]` after the first character (Section 2), so such a word can never be produced
  by `ident` and there is nothing to reserve against. Most dashed keywords are consequently
  absent — including `replay-only`, which the parser matches with `keyword "replay-only"` in
  `pTransition` but does not reserve. (`status-map`, `dispatch-each`, and `read-model` are
  dashed *and* reserved — a belt-and-braces choice by the parser author, not a requirement.)
- A keyword written as a **bare word** *could* be reserved, and sometimes simply is not. A
  router's resolve clause is five literal words in a fixed order — `pResolveDecl` parses
  `resolve`, `stable`, `via`, `read-model`, then an identifier, then `row` — and yet only
  `resolve` and `read-model` are reserved. `stable`, `via`, and `row` sit in Section 4, and
  `ident` would happily produce any of them. Do not read anything into the asymmetry; the
  parser reserves a word when its author chose to, and it may reserve one *later*: `retiring`
  was a bare unreserved keyword until keiro-dsl commit `75286d7`, which added it to this list
  without changing a single thing about how the word is spelled or where it may appear.

  The largest example so far is the **mapped type declaration** (Section 4's mapped-type
  subsection). keiro-dsl commit `430c3d2` added 242 lines of new parser and 33 new words to
  the language, and reserved exactly one of them — `mapped`, the word that begins the
  declaration. Everything inside the declaration's `{ … }` braces is unambiguous without
  reservation, so nothing inside it was reserved. **A stable Section 3 therefore does not mean
  a stable language:** a sync that finds `reservedWords` unchanged must still read the rest of
  `Parser.hs`.

Either way those words live in Section 4 and are highlighted just the same. Do not "fix"
their absence by adding them here: this list must stay a verbatim copy of `reservedWords` so
it can be diffed against the parser mechanically.

If the parser's `reservedWords` ever changes, the parser's list wins: update this section to
match and record the difference under Surprises & Discoveries in the `docs/plans/` ExecPlan
that performs the reconciliation. Three such changes are on record so far: 50 → 70 words in
`docs/plans/4-reconcile-highlighters-with-keiro-dsl-lexical-surface-20-new-reserved-words-string-escapes-signed-decimal-numbers.md`,
70 → 71 (`retiring`) in
`docs/plans/7-reconcile-the-reserved-word-list-retiring-is-now-reserved.md`, and 71 → 72
(`mapped`) in
`docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`. Both package
test suites read the list above and assert every word in it is classified as a keyword, so a
word added here without a matching highlighter rule fails the suites by name.


## Section 4 — Curated contextual keywords

The parser also recognizes many words **in context** that are *not* in `reservedWords`. They
could legally be used as identifiers, but in practice they read as keywords and users expect
them highlighted. The following curated set is highlighted as keywords by both packages:

(`process`, `dispatch`, and `retiring` used to be listed here; they are now **reserved** — see
Section 3.)

```text
name         input       output      in          out         correlate
via          saga        stream      target      projections on
advance      schedule    timer       fire        fireAt      source
key          value       run         signal      query       project
result       ordering    backoff     outboxId    messageId   idempotencyKey
discriminator             schemaVersion           derive     of
after        required    stable      strategy    policy      prefix
kind         logical     physical    dlq         table       maxRetries
maxAttempts  delay       readModel   field       to          envelope
every        partial     header      schema      version     inline
row          halt        poison      rejected    group       provision
outcome      fixture     interval    retention   standard    unlogged
partitioned  unordered   off         strict      lenient
as           binding     codec       constructor contents    fixtures
haskell      ignore      initial     null        object      opaque
optional     package     record      reject      string      structural
tag          type        union
```

The last three-and-a-bit rows — `as` through `union` — are the **mapped type declaration**
vocabulary, described in its own subsection below. They are listed here in alphabetical order
rather than in the order they appear in a declaration, because this grid is a flat membership
list and nothing else in it is ordered either.

### Dashed contextual keywords (match-before-bare-words)

A small set of node/section words written **with dashes** appear in process timers and
dispositions and should also be colored as keywords:

```text
dispatch-id    fired-event-id  on-appended   on-duplicate  on-failed
on-ok          on-reject       on-error      on-ambiguous  not-mine
unknown-status max-attempts    dead-letter   kafka-key     kafka-cursor
on-blocked     on-terminal     state-codec   shape-hash    full-envelope
dedupe-only    entire-log      fifo-throughput fifo-roundrobin
replay-only    cross-check     binding-version canonical-type on-missing
tagged-object  unknown-fields
```

The last five — `binding-version` through `unknown-fields` — belong to the **mapped type
declaration** described below. `cross-check` is not new: it is a real `keyword "cross-check"`
in `Parser.hs` (it appears in an intake `bind messageId from header "…" required cross-check
body` clause) that both packages have matched since the reconciliation recorded in
`docs/plans/4-reconcile-highlighters-with-keiro-dsl-lexical-surface-20-new-reserved-words-string-escapes-signed-decimal-numbers.md`;
this list simply never named it.

One word here is a curated survivor with no current parser backing: **`on-blocked`** matches
nothing in `Parser.hs` today. It is kept because this section is explicitly a *curated* set
rather than a mechanical copy — `output`, in the bare grid above, is in the same position —
and because both packages match it, so the section's claim that "the following curated set is
highlighted as keywords by both packages" is true as written. Do not read a curated word's
presence here as proof the parser accepts it; only Section 3 makes that promise.

`replay-only` is the one word in this list that is **not** a control keyword: it is a
**Modifier** (Section 6), because it qualifies an aggregate transition rather than
introducing a clause of one. It is an optional prefix on the transition line, marking a
transition that is never taken by a new command and exists only so events written under a
retired rule still have an edge during replay:

```text
replay-only Unrequested -- RequestTransferReservation -->
  guard (divertStatus != TotalDivert || lifeCriticalOverride) && patientAcuity == RedTag
  write reservationState := Held
  emit  TransferReservationCreated
  goto  Held
```

The three **reserved** dashed words `status-map`, `dispatch-each`, and `read-model` (Section
3) also require this match-before-bare-words treatment.

**Implementer note:** because these contain dashes, a highlighter **must match them before**
matching bare keywords or identifiers. Otherwise the leading segment (`on`, `max`, `dead`,
...) is matched first and the rest of the word is mis-colored. In a TextMate grammar this
means placing these multi-segment patterns earlier in the pattern list; in Vim it means
defining their `syntax match` (or `syntax keyword` with the dashed spelling) so it wins.

The hazard is narrower than it looks, and knowing exactly how narrow saves work. It only
bites when a **bare keyword is a prefix** of a dashed keyword: `on` of `on-ok`, `dispatch` of
`dispatch-each`, `binding` of `binding-version`. A bare keyword appearing in the *interior* of
a dashed word is harmless in both engines — `status-map` survives even though `map` is a
keyword, and `unknown-fields` survives even though `fields` is one, because both engines
prefer the match that starts earlier in the line. For the prefix cases, Vim needs the bare
word declared as a `syntax match … /\<word\>-\@!/` rather than a `syntax keyword`, because
Vim's `syntax keyword` outranks a `syntax match` that begins at the same column. A TextMate
grammar needs no such trick, only the dashed rule listed earlier in its `patterns` array.

### The mapped type declaration

A `.keiro` file can declare a **consumer-owned mapped type**: a Haskell data type that lives
in a *different* package, together with an explicit description of how it is encoded on the
wire. The declaration begins with the reserved word `mapped` (Section 3) and supplies 26 of
this section's curated words — 21 bare and 5 dashed. None of them is reserved, because
everything inside the declaration's `{ … }` braces is unambiguous without reservation, so a
reader of Section 3 alone would never learn that these words exist. Hence this subsection.

There are two families. `mapped structural …` describes the encoding field by field and comes
in three **shapes** — `record` (a product type, encoded as a JSON object), `enum` (nullary
constructors, encoded as a JSON string), and `union` (a sum type with payloads, encoded as a
tagged JSON object). `mapped opaque …` does not describe the encoding at all; it names an
existing codec by id and version. A worked example of the first, which uses every clause and
every value form the record shape admits:

```text
mapped structural record ArtifactInfo {
  haskell package=artifact-domain module=Example.Artifact.Domain type=ArtifactInfo
  binding = "Example.Artifact.KeiroBindings.artifactInfoBinding"
  binding-version = "1"
  canonical-type = "example.artifact.ArtifactInfo.v1"
  fixtures = "Example.Artifact.KeiroBindings.artifactInfoCases"
  initial = "Example.Artifact.KeiroBindings.emptyArtifactInfo"
  wire object constructor=ArtifactInfo unknown-fields=reject {
    key         as "key"         : Text                 required
    kind        as "kind"        : ArtifactKind         optional on-missing=Guide
    description as "description" : Optional Text        optional on-missing=null
    tags        as "tags"        : List Text            optional on-missing=[]
    attributes  as "attributes"  : Map Text             optional on-missing={}
    revision    as "revision"    : Natural              required
    observedAt  as "observedAt"  : Time                 required
    extra       as "extra"       : Json                 required
  }
}
```

The `enum` shape replaces the `wire object …` block with `wire string { Ctor as "tag" … }`,
and the `union` shape with
`wire tagged-object tag="tag" contents="contents" unknown-fields=reject { Ctor as "tag" : Type … }`
where each arm's `: Type` payload is optional. A `mapped opaque X { … }` block carries only
`haskell`, `codec`, `version`, `fixtures`, and `initial`.

Four facts a highlighter implementer needs:

- **The type slot accepts exactly ten spellings** (parser `pMappedTypeExpr`): `Text`, `Int`,
  `Bool`, `Natural`, `Time` — with `UTCTime` as an accepted alias for `Time` — `Json`, the
  one-argument constructors `Optional`, `List`, `Map`, and a bare identifier naming another
  mapped type. All nine literal spellings are **Primitive types** in Section 6, alongside the
  pre-existing `Int` and `Text`. Note that `Map` (capital) is a primitive type while the
  reserved `map` (lowercase, Section 3) is a control keyword: they are different words, and
  both packages match case-sensitively.
- **The `on-missing=` slot accepts exactly seven value forms** (parser `pOnMissing`): `null`,
  `[]`, `{}`, `true`, `false`, a quoted string, a signed integer, or a bare constructor name.
  `null` is a **Language constant** in Section 6, like `HOLE`; `true` and `false` already are.
  The two empty-collection literals `[]` and `{}` render as **uncolored punctuation**: Section
  5 has never claimed brackets or braces, and both packages leave every `{ … }` field list and
  `project [ … ]` list uncolored today. Coloring them for these two literals alone would
  restyle every existing `.keiro` file, so they are deliberately left alone.
- **`structural`, `opaque`, `record`, `union`, and the field-level `optional` are Modifiers**
  in Section 6, not control keywords: they qualify the declaration `mapped` introduces rather
  than introducing one themselves. `optional` is `required`'s partner in one parser `choice`,
  and `required` has been a Modifier since plan 4. The visible consequence of classifying by
  role rather than by position is that `mapped structural enum X` shows `enum` in the
  *introducer* color while `mapped structural record X` shows `record` in the *modifier* color
  — because `enum` is a reserved word that is unconditionally an introducer everywhere. That
  asymmetry is inherent to lexical highlighting and is not worth working around.
- **`initial` is legal both as a clause label here and as an ordinary identifier**, and both
  readings appear in the upstream fixture six lines apart: `initial = "…"` inside the mapped
  block, and `currentArtifact ArtifactInfo = initial` in an aggregate's `regs` block, where
  the parser reads it with plain `ident`. Both packages color both occurrences as a keyword.
  That is Section 1's lexical-highlighting rule working as designed, not a bug — `key`,
  `value`, `field`, `table`, `row`, and `group` have all been unconditional keywords since
  plan 4 and can all appear as ordinary names too.


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
| Declaration introducer | the subset of reserved + contextual words that begin a top-level item or node: `context`, `id`, `enum`, `rule`, `mapped`, `aggregate`, `process`, `router`, `contract`, `intake`, `emit`, `publisher`, `workqueue`, `dispatch`, `readmodel`, `workflow`, `operation` | `keyword.declaration.keiro` | `Keyword` |
| Control / section keyword | all other reserved keywords (Section 3) **and** all curated contextual keywords (Section 4) *except the words the Modifier and Language-constant rows below claim*, e.g. `regs`, `states`, `command`, `event`, `wire`, `guard`, `write`, `goto`, `snapshot`, `module`, `layout`, `resolve`, `dispatch-each`, `read-model`, `category`, `persist`, `patch`, `continueAsNew`, `columns`, `feed`, `scope`, `shape`, `on`, `advance`, `schedule`, `timer`, `bind`, `accept`, `map`, `step`, `await`, and the mapped-type vocabulary `haskell`, `package`, `type`, `binding`, `binding-version`, `canonical-type`, `codec`, `fixtures`, `initial`, `object`, `constructor`, `string`, `tagged-object`, `tag`, `contents`, `as`, `unknown-fields`, `reject`, `ignore`, `on-missing`, ... | `keyword.control.keiro` | `Statement` |
| Modifier | `deprecated`, `retiring` (the two mutually exclusive event prefixes — see Section 3), `upcast`, `from`, `consistency`, `required`, `stable`, `strategy`, `via`, `policy`, `prefix`, `kind`, the mapped-type words `structural`, `opaque`, `record`, `union` (which select the family and shape of a `mapped` declaration) and `optional` (`required`'s partner on a wire field — see Section 4), and the dashed `replay-only` (the transition prefix — see Section 4; being dashed it must be matched before bare words) | `storage.modifier.keiro` | `StorageClass` |
| Language constant | `true`, `false`, `null` (the `on-missing=null` sentinel — see Section 4), `HOLE`, `placeholder`, `skip`, `hole` | `constant.language.keiro` (give `true` / `false` the more specific `constant.language.boolean.keiro`; `null` takes the general scope) | `Boolean` for `true` / `false`, else `Constant` |
| Primitive type | `Bool`, `Int`, `Text`, `Time`, `Id`, `Maybe`, `typeid`, `text`, `int`, and the mapped-type spellings `Natural`, `UTCTime` (an alias for `Time`), `Json`, `Optional`, `List`, `Map` (see Section 4 — `Map` capitalized is a type, the reserved lowercase `map` is a control keyword, and both packages match case-sensitively) | `support.type.keiro` | `Type` |
| Declaration-site type name | a CamelCase plain identifier appearing immediately after a declaration introducer that names a type (`enum X`, `aggregate X`, `contract X`, `command X`, `event X`, `id X`, `workflow X`, `operation X`, `process X`) or immediately after a `mapped` declaration's shape word (`record X`, `union X`, `opaque X`; `mapped structural enum X` is already covered by the `enum X` case) | `entity.name.type.keiro` | `Type` |
| String | `"..."` (Section 2) | `string.quoted.double.keiro` | `String` |
| String escape | one of `\"`, `\\`, `\n`, `\t`, `\r` inside a string (Section 2) | `constant.character.escape.keiro` | `SpecialChar` |
| Number | integer, `[0-9]+\.[0-9]+` fractional, `v[0-9]+`, and `[0-9]+[smh]` duration (Section 2) | `constant.numeric.keiro` | `Number` |
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
