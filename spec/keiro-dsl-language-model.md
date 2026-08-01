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

**The optional version preamble.** Since keiro-dsl commit `4523b52` a `.keiro` source may
open with a clause naming the released language contract it was written against:

```text
language keiro-dsl 1
context hospital-capacity
```

It is optional — a source without one is a *legacy unversioned* source and parses
identically. When present it must be the first clause of the file, so it may sit **below** a
comment banner, and it may appear only once. (Parser: a two-stage entry point `parseSource`
runs `selectSourceLanguage` first; since keiro-dsl commit `54a5342` that pass is a real
parser, `pInitialLanguageClause`, which skips leading whitespace and `#` comments and then
looks for the word `language` at the very first token position and nowhere else.) The clause
is exactly three tokens: the word `language`, the word `keiro-dsl`, and a positive decimal
version. Neither word is reserved, so both are listed in Section 4, which also explains why a
highlighter must **not** try to model the placement rule.

Since keiro-dsl commit `fcd6748` the released-contract registry holds **two** versions, `1`
and `2`; version 2 is the contract under which the **nominal binding** syntax described in
Section 4 is legal, and a source using that syntax must open `language keiro-dsl 2`. A
highlighter models none of that: the version is an ordinary Number (Section 2) whatever its
value, and which words a given version admits is a parser concern. (Parser: the grammar
production that owns each piece of successor syntax checks the version itself and fails with a
`LanguageFeatureRequiresVersion` diagnostic below version 2 — `pIdDecl` and `pEnumDecl` for the
trailing `using { … }` clause, and the `nominal` branch of `pMappedTopItem` for
`mapped nominal …`. An editor must still tokenize such a file while its author is fixing the
version line.)

Since keiro-dsl commit `8b0f55b` version 2 is also the contract for the **scalar expression
sublanguage** described in Section 4, which adds four more gated spellings: the type name
`Integer`, the transition clause `implementation hole`, and the two expression roots `reg.` and
`cmd.`. Nothing about this changes what a highlighter does. A version-1 file that uses the
sublanguage is a parse failure and is still an ordinary thing to colour, for the same reason as
above: an editor tokenizes a file while its author is fixing the diagnostic.

**How the gates are enforced, and why it matters to a reader of this document.** Until
keiro-dsl commit `54a5342` all of the above was a **raw-text pre-scan**: `parseSource` called
`ensureBodyFeatures`, which walked every *significant line* — a line with its `#` comment
stripped and whitespace trimmed, kept only if anything remained — and rejected the file if one
of those lines merely *contained* the word `using`, the word `Integer`, or the substrings
`implementation hole`, `reg.`, or `cmd.`, wherever they fell, including inside a string literal.
That commit deleted the pre-scan (`significantLines`, `isLanguageLine`, and `ensureBodyFeatures`
are all gone) and moved every decision into the grammar, using a custom `megaparsec` error
component so a production can still report the exact source-language diagnostic. Three helpers
do the work — `requireLanguageFeatureAt`, `optionalLanguageFeature`, and
`languageFeatureKeyword` — and the version threshold for each feature now lives beside the
released-version registry in `Keiro/Dsl/LanguageVersion.hs` as a `LanguageFeature` value rather
than as a list of spellings inside the parser. The user-visible relaxation is that all five
spellings are now rejected only where they actually *mean* the successor syntax, so a version-1
source may use every one of them as an ordinary identifier and as string content. Both packages
coloured those words unconditionally before the change and still do; what changed is that the
files they colour that way can now be valid.

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

- **Plain decimal integers** — `[0-9]+` (e.g. `0`, `1`, `10`, `2024`). The version in the
  `language keiro-dsl 1` preamble (Section 1) is one of these — parser
  `lexeme (some asciiDigit)`, narrowed from megaparsec's Unicode-aware `digitChar` in keiro-dsl
  commit `54a5342` — and takes the Number class like any other integer; there is no
  separate "version" class for it. Three slots admit a
  leading `-` sign. A **register initializer** takes `-?[0-9]+(\.[0-9]+)?` — signed, and
  optionally fractional since keiro-dsl commit `da09736` widened `signedDecimalText` (e.g.
  `count Int = -1`, `fractional Natural = -1.5`). The default value of a mapped-type wire
  field's `on-missing=` clause (Section 4) takes `-?[0-9]+` only; its parser `integerLiteral`
  is a separate rule and admits no fractional part. Since keiro-dsl commit `8b0f55b` that same
  `integerLiteral` rule is also an **operand of a scalar expression** in an aggregate
  transition's `guard` or `write` clause (Section 4), so `guard cmd.balance >= -100` is the
  third slot. In all three the `-` is a *separate*
  token: the digits take the **Number** class and the lone `-` is left as **uncolored
  punctuation**, because Section 5's operator list contains `-->`, `--`, and `->` but no bare
  `-`, and claiming one would put a color on the first character of every transition arrow —
  and on the dash inside every wire word (`hospital-capacity`, `partial-divert`). That is also
  why the **subtraction** operator of a scalar expression is uncolored: `reg.balance - 1` shows
  a colored register root, an uncolored `-`, and a colored `1`. Both packages behave this way
  today.
- **Fractional decimals** — a digit run, a `.`, and a digit run, `[0-9]+\.[0-9]+`. Two homes:
  a backoff `multiplier=1.5` (parser `decimalText`), and — since `da09736` — a register
  initializer (parser `signedDecimalText`, above), which is now the commoner of the two.
  What a highlighter must guarantee is the *outcome*: `1.5` is **one whole token**, not `1`
  `.` `5`. The ordering that achieves it is engine-dependent, so do not copy a rule order
  between engines. A TextMate grammar takes the first listed alternative that matches, so
  the fractional pattern goes *before* the plain integer; Vim resolves a same-start-column
  tie in favour of the item defined **last**, so there the fractional `syntax match` goes
  *after* it. Getting this backwards is silent — the leading digit is still colored, so an
  assertion that reads only a token's first character passes either way.
- **Version tokens** — a literal `v` immediately followed by digits, `v[0-9]+` (e.g. `v2`,
  `v3`). These appear after an event name, as in `event Touched v2`.
- **Duration tokens** — digits immediately followed by a single unit letter `s`, `m`, or `h`,
  i.e. `[0-9]+[smh]` (e.g. `5m`, `2s`, `3h`). These appear in timer windows like
  `fireAt input.observedAt + 5m` and retry delays like `retry 5s`. (Parser `pWindow` accepts
  only `s`/`m`/`h`; there is no `d` unit.)

Because the version, duration, and fractional forms all start with the integer pattern, a
highlighter must arrange its rules so that the longer forms (`v[0-9]+`, `[0-9]+[a-z]+`,
`[0-9]+\.[0-9]+`) win over the plain integer and the trailing letters or fractional part are
colored as part of the number — by rule order, by a single combined pattern, or however the
engine expresses precedence. See the fractional bullet above for why "put the longer form
first" is not portable advice.

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
discriminator             schemaVersion           derive     of         implementation
after        required    stable      strategy    policy      prefix
kind         logical     physical    dlq         table       maxRetries
maxAttempts  delay       readModel   field       to          envelope
every        partial     header      schema      version     inline
row          halt        poison      rejected    group       provision
outcome      fixture     interval    retention   standard    unlogged
partitioned  unordered   off         strict      lenient     language
as           binding     codec       constructor contents    fixtures
haskell      ignore      initial     nominal     null        object
opaque       optional    package     record      reject      string
structural   tag         type        union       using
```

The last three-and-a-bit rows — `as` through `using` — are the **mapped type declaration**
vocabulary, described in its own subsection below. They are listed here in alphabetical order
rather than in the order they appear in a declaration, because this grid is a flat membership
list and nothing else in it is ordered either. `nominal` and `using` (keiro-dsl commit
`fcd6748`) belong to the **nominal binding** forms described at the end of that subsection.
`implementation` is the most recent arrival (keiro-dsl commit `8b0f55b`) and belongs to none of
the mapped-type families: it opens an aggregate transition's `implementation hole` clause,
described in "The scalar expression sublanguage" below.

### Dashed contextual keywords (match-before-bare-words)

A small set of node/section words written **with dashes** appear in process timers and
dispositions and should also be colored as keywords:

```text
dispatch-id    fired-event-id  on-appended   on-duplicate  on-failed
on-ok          on-reject       on-error      on-ambiguous  not-mine
unknown-status max-attempts    dead-letter   kafka-key     kafka-cursor
on-blocked     on-terminal     state-codec   shape-hash    full-envelope
dedupe-only    entire-log      fifo-throughput fifo-roundrobin
replay-only    cross-check     keiro-dsl
binding-version canonical-type  on-missing    tagged-object unknown-fields
```

`keiro-dsl` is the dialect name in the **version preamble** described in its own subsection
below. The last five — `binding-version` through `unknown-fields` — belong to the **mapped
type declaration** described after it. `cross-check` is not new: it is a real `keyword "cross-check"`
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

`keiro-dsl` is the one entry in the dashed list whose leading segment is **not** a keyword at
all — `keiro` means nothing to either package, and neither does `dsl` — so it needs neither
the `-\@!` treatment nor any reordering. It needs only to *be* in the dashed rule, so the
whole spelling is claimed as one token instead of falling through as plain text.

### The language version preamble

Since keiro-dsl commit `4523b52` a `.keiro` source may open with a clause naming the released
language contract it was written against (Section 1):

```text
# A comment banner may precede the preamble.

language keiro-dsl 1
context hospital-capacity
```

Two literal words, neither of them reserved:

- **`language`** is a **Declaration introducer** in Section 6 — the same class as `context`
  and `aggregate`. It is the only word in the language that begins a clause sitting *outside*
  the spec body altogether: the parser selects the source's language contract before it
  chooses a body grammar at all, so nothing is more top-level than this. (Contrast `module`
  and `layout`, which are Control keywords because `pSpec` reads them *after* `context`, as
  clauses of the context declaration.)
- **`keiro-dsl`** is a **Control / section keyword**, matched with the dashed rules above. It
  is a fixed literal read by `keyword "keiro-dsl"`, not a user-chosen name, so the precedent
  of the uncoloured wire word after `context` does not apply to it; it behaves like the other
  fixed enumerated clause values in the control class (`reject`, `ignore`, `standard`,
  `unlogged`).

The version itself is an ordinary **Number** (Section 2). There is no separate version token
class.

**A highlighter must not model the placement rule.** The parser requires the preamble to be
the file's first clause — first after leading blank lines and `#` comments — and allows at most
one; a misplaced or duplicated one is rejected with a `MisplacedLanguagePreamble` or
`DuplicateLanguagePreamble` diagnostic. Neither package encodes any of that. Section 1's rule
stands: a word is a keyword because it is in a fixed list, not because of where it appears. Two
consequences follow, and both are intended. A file whose preamble is in the wrong place still
tokenizes — which is what an editor must do while its author is fixing the diagnostic. And
`language` used as an ordinary identifier is coloured as a keyword, exactly like `initial`,
`key`, and `value` before it.

`language` really is legal as an identifier, and since keiro-dsl commit `54a5342` it is legal
*anywhere*, including at the start of a line. The parser no longer asks whether a line's first
word is `language`; it recognises the preamble only as the complete three-token clause
`language keiro-dsl <decimal>`, and only at the file's first token (production
`pInitialLanguageClause`) or, when reporting a misplaced or duplicated one, at a declaration
boundary in the body (production `pContextualPreamble`, which wraps the whole clause in `try` so
it backtracks harmlessly off anything shorter). So all three of these now parse: a field written
`command Record { language:Text }`, a register declared on its own line as
`language Text = "en"`, and a whole declaration named for the word, as in upstream's own test
case `id language prefix=lang`. Before that commit only the first parsed; this document
previously recorded the other two as a parser trap, and that trap is gone.

### The mapped type declaration

A `.keiro` file can declare a **consumer-owned mapped type**: a Haskell data type that lives
in a *different* package, together with an explicit description of how it is encoded on the
wire. The declaration begins with the reserved word `mapped` (Section 3) and supplies 28 of
this section's curated words — 23 bare and 5 dashed. None of them is reserved, because
everything inside the declaration's `{ … }` braces is unambiguous without reservation, so a
reader of Section 3 alone would never learn that these words exist. Hence this subsection.

There are three families. Two of them describe a *structure*, and are covered first;
`mapped nominal …`, added by keiro-dsl commit `fcd6748`, describes an *identity* and is
covered in "Nominal bindings" at the end of this subsection.

`mapped structural …` describes the encoding field by field and comes
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

- **The type slot accepts exactly eleven spellings** (parser `pMappedTypeExpr`): `Text`, `Int`,
  `Integer`, `Bool`, `Natural`, `Time` — with `UTCTime` as an accepted alias for `Time` —
  `Json`, the one-argument constructors `Optional`, `List`, `Map`, and a bare identifier naming
  another mapped type. All ten literal spellings are **Primitive types** in Section 6, alongside
  the pre-existing `Int` and `Text`. `Integer` is the newest (keiro-dsl commit `8b0f55b`, which
  added it to both branches of `pMappedTypeExpr`); it is a distinct spelling from `Int`, not an
  alias for it — upstream uses `Int` for machine integers and `Integer` for exact
  arbitrary-precision ones. Note that `Map` (capital) is a primitive type while the
  reserved `map` (lowercase, Section 3) is a control keyword: they are different words, and
  both packages match case-sensitively. A one-argument constructor's argument may be written
  bare (`Optional Text`) or parenthesized (`Optional(Text)`); the parentheses are **uncolored
  punctuation**, like the braces of a field list.
- **That same type slot is no longer confined to a `mapped` declaration.** keiro-dsl commit
  `da09736` made `pMappedTypeExpr` the type slot of an **aggregate register** (`pRegDecl`,
  which read a bare `ident` before) and of an **aggregate command/event field**
  (`pAggregateField`, likewise). So all eleven spellings now appear in the two most-written
  slots in the language:

  ```text
  regs
    observedAt Time    = "2026-01-02T03:04:05.123456789012Z"
    revision   Natural = 0

  command Record { observedAt:Time revision:Natural }
  event   ScalarsRecorded { observedAt:UTCTime revision:Natural }
  ```

  **Process and router** fields keep the older bare-identifier slot (parser `pField`), which
  upstream keeps separate precisely so widening aggregate syntax does not widen those node
  families. That distinction is invisible to a lexical highlighter and neither package models
  it. The widening needed **no rule change in either package**, because Section 1's rule —
  a word is a keyword because it is in a fixed list, not because of where it appears — means
  both packages already matched these spellings everywhere. Do not "improve" that by scoping
  the type rules to a `mapped` block: it would uncolor every aggregate written after this
  commit. A later, *semantic* pass in keiro-dsl narrows which of these an aggregate may
  actually carry (`Optional`, `List`, `Map`, and `Json` are rejected there), but that is a
  diagnostic on a file that parsed, and a highlighter must still tokenize it.
- **The `on-missing=` slot accepts exactly seven value forms** (parser `pOnMissing`): `null`,
  `[]`, `{}`, `true`, `false`, a quoted string, a signed integer, or a bare constructor name.
  `null` is a **Language constant** in Section 6, like `HOLE`; `true` and `false` already are.
  The two empty-collection literals `[]` and `{}` render as **uncolored punctuation**: Section
  5 has never claimed brackets or braces, and both packages leave every `{ … }` field list and
  `project [ … ]` list uncolored today. Coloring them for these two literals alone would
  restyle every existing `.keiro` file, so they are deliberately left alone.
- **`structural`, `opaque`, `nominal`, `record`, `union`, and the field-level `optional` are
  Modifiers** in Section 6, not control keywords: they qualify the declaration `mapped`
  introduces rather than introducing one themselves. (`nominal` is the third family word; see
  "Nominal bindings" below.) `optional` is `required`'s partner in one parser `choice`,
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

#### Nominal bindings

Since keiro-dsl commit `fcd6748` a `.keiro` file can also say that a name is a **consumer-owned
nominal type** — a Haskell type whose *identity* matters even though its wire representation is
an ordinary scalar. `AccountNumber` and `OrderId` may both be `Text` on the wire while being
two distinct types in the consumer's Haskell code. This is the third `mapped` family, and it
takes two spellings.

The first is a declaration of its own, `mapped nominal <Name> : <Representation> { … }`:

```text
mapped nominal AccountNumber : Text {
  haskell package=nominal-conformance module=NominalConformance.Domain type=AccountNumber
  binding = "NominalConformance.Bindings.accountNumberBinding"
  binding-version = "1"
  canonical-type = "nominal.AccountNumber.v1"
  fixtures = "NominalConformance.Bindings.accountNumberFixtures"
  initial = "NominalConformance.Bindings.initialAccountNumber"
}
```

The second attaches the identical block of facts to an `id` or `enum` declaration the file
already had, with a trailing `using` clause:

```text
id OrderId prefix=ord using {
  haskell package=nominal-conformance module=NominalConformance.Domain type=OrderId
  binding = "NominalConformance.Bindings.orderIdBinding"
  binding-version = "1"
  canonical-type = "nominal.OrderId.v1"
  fixtures = "NominalConformance.Bindings.orderIdFixtures"
  initial = "NominalConformance.Bindings.initialOrderId"
}

enum OrderStatus { Draft=draft Submitted=submitted } using {
  haskell package=nominal-conformance module=NominalConformance.Domain type=OrderStatus
  binding = "NominalConformance.Bindings.orderStatusBinding"
  binding-version = "1"
  canonical-type = "nominal.OrderStatus.v1"
  fixtures = "NominalConformance.Bindings.orderStatusFixtures"
  initial = "NominalConformance.Bindings.initialOrderStatus"
}
```

Four facts a highlighter implementer needs:

- **Only two words are new.** The braced block is `pNominalBindingBlock`, whose clause parser
  `pNominalClause` is a `choice` over rules the two older families already used —
  `pHaskellSource` (the `haskell package=… module=… type=…` line) and `pQuotedFact` for
  `binding`, `binding-version`, `canonical-type`, `fixtures`, and `initial`. Every one of
  those words is already in this section. So the whole of nominal binding costs exactly
  `nominal` and `using`.
- **`nominal` is a Modifier and `using` is a Control keyword** in Section 6. `nominal` joins
  `structural` and `opaque` because it selects a `mapped` declaration's family:
  `pMappedTopItem` reads `keyword "mapped"` and then chooses between the three. `using`
  introduces a *clause* of a declaration some other word already began —
  `pUsingNominalBinding` is invoked from inside `pIdDecl` and `pEnumDecl` — which is what
  `wire` does inside a `mapped structural` block, and `wire` is a control keyword.
- **The name after `nominal` is a declaration-site type name**, the same optional refinement
  Section 6 already gives `record X`, `union X`, and `opaque X`. The type it declares is used
  exactly like theirs — an aggregate register may be declared
  `accountNumber AccountNumber = initial`.
- **The representation after the `:` is parsed as a bare identifier**, not with the
  ten-spelling `pMappedTypeExpr` grammar, and is narrowed later by `keiro-dsl check`. The
  accepted set (`Keiro/Dsl/NominalType.hs`, `scalarRepresentation`) is `Text`, `Int`,
  `Natural`, `Bool`, `Time`, and `UTCTime` as an alias for `Time` — all six already
  **Primitive types** in Section 6, so the slot needs no new rule. Because the *parser*
  accepts any identifier there, a file naming an unsupported representation still tokenizes;
  that is the same principle applied to aggregate type slots in
  `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`.

One shape here is the first of its kind in the language: an `enum … using { … }` declaration
continues *after* a closing brace, so a line can read
`enum OrderStatus { Draft=draft Submitted=submitted } using {`. Braces are uncolored
punctuation in both packages, so nothing special is needed for it — but a future contributor
tempted to add brace matching to either grammar should know the case exists.

Nominal binding syntax requires the source to declare `language keiro-dsl 2` (Section 1).
Neither package models that, for the reason Section 1 gives: highlighting is purely lexical.
Until keiro-dsl commit `54a5342` the parser was stricter about `using` than about any other
unreserved word — the `ensureBodyFeatures` pre-scan rejected a version-1 source whose lines
contained `using` *anywhere*, string literals included. That commit moved the check into
`pIdDecl` and `pEnumDecl` (helper `optionalLanguageFeature`), so a version-1 source is now
rejected only where `using` actually opens a binding clause and is free to use the word as an
identifier elsewhere. Either way it is a parser rule, and both packages color the word
unconditionally.

### The scalar expression sublanguage

Since keiro-dsl commit `8b0f55b` a source declaring `language keiro-dsl 2` writes the `guard`
and `write` clauses of an **aggregate transition** in a real expression language. Before that
commit those clauses could only compare or copy whole values and every arithmetic character was
a hand-written parse error; now they read values through two named roots, do arithmetic, and
take literals as operands. A whole transition:

```text
  Open -- Adjust -->
    guard cmd.balance + reg.balance >= -100
      && reg.reserved + cmd.requested <= reg.capacity
      && reg.status == OrderStatus.Draft
      && reg.orderId == OrderId("ord_01h455vb4pex5vsknk084sn02q")
    write balance := reg.balance + cmd.balance * 2
    write label := "settled"
    emit Adjusted
    goto Closed
```

Six facts a highlighter implementer needs.

- **`implementation hole` is a new transition clause, and only its first word is new.** It
  replaces the whole body of a transition — the consumer writes that transition's behavior in
  Haskell instead, against a generated typed signature — and it is a peer of `guard`, `write`,
  `emit`, and `goto` (parser `pClause`, whose first alternative under version 2 is
  `keyword "implementation" *> keyword "hole"`). `implementation` is therefore a **Control /
  section keyword** in Section 6, like the four clause words it sits beside. `hole` keeps the
  **Language constant** class it has had since plan 4, where it entered as the `derive "…" hole`
  marker of a contract emitter and the `resolve … hole` source of a router; this clause is
  simply its third parser site. So the clause renders as a keyword followed by a constant. Note
  that `HOLE` (capitalized, reserved, Section 3) is a *different* word in a different place, and
  both packages match case-sensitively.

- **`reg` and `cmd` are the two expression roots, and both packages color them only when the
  very next character is a `.`.** `reg.balance` reads a register — a value the aggregate stores
  between commands — and `cmd.balance` reads a field of the command being handled. They read
  like the dotted-reference roots `input.`, `timer.`, and `source.`, which have been
  unconditional keywords in this section since plan 4, and they take the same **Control /
  section keyword** class. The follow-`.` condition is what is different, and there are two
  reasons for it. The parser gives these words meaning *only* in that position — `pScalarPath`
  reads an identifier and its dotted tail and then asks whether the head was `reg` or `cmd`, so
  a register genuinely named `reg` still parses — and, more concretely, `cmd` is already a
  common **wire word**: `id CommandId prefix=cmd` appears in five files of this repository's
  corpus, and an unconditional rule would recolor every one of them. A condition on the
  *following character* is the same device Section 4's implementer note already describes for
  the `-\@!` guards on `on`, `binding`, `dedupe`, `shape`, and `dispatch`; it is not the kind of
  look-*behind* Section 6 marks optional, so these rules are mandatory like any other keyword
  rule. In TextMate the rule is `(?<![A-Za-z0-9_])(?:reg|cmd)(?=\.)`; in Vim it is
  `syntax match … /\<\%(reg\|cmd\)\>\.\@=/`, and `\>` is what keeps the reserved word `regs`
  out of it.

- **The arithmetic operators are `+`, `-`, and `*`.** `+` was already in Section 5 (it adds a
  duration to a time in a process timer) and `*` is new there. A bare `-` is deliberately
  **not** an operator in either package — Section 2's numbers subsection gives the two reasons,
  the transition arrows `-->`/`--` and the dashes inside wire words — so subtraction shows as
  uncolored punctuation between two colored operands. `/` and `%` are matched by the parser only
  to produce the diagnostic "aggregate arithmetic operator '/' is unsupported"; they are not
  part of the language and neither package claims them.

- **Every operand shape is already covered.** A quoted operand is an ordinary **String**
  (Section 2); an integral operand is an ordinary **Number**, signed by the same
  `integerLiteral` rule as a wire field's `on-missing=` default; `true` and `false` are already
  **Language constants**. Two operand shapes are new to the language and still need no rule: a
  **qualified enum literal** `OrderStatus.Draft` is an identifier, a `.`, and an identifier —
  lexically indistinguishable from the dotted references `input.hospitalId` and `timer.id` the
  language has always had — and an **id literal** `OrderId("ord_01h4…")` is an identifier, a
  parenthesized string, and nothing else, with the parentheses left as uncolored punctuation
  exactly as in `Optional(Text)`. Do not add a rule that colors a capitalized identifier before
  a `.`: it would also color the module prefixes of `module Acme.Services`, which are plain
  today.

- **The collection vocabulary must not be highlighted.** The parser matches `[`, `{`, `keys`,
  `values`, `any`, and `all` as terms, and `in` and `not in` as operators, purely in order to
  *reject* them with `CollectionExpressionUnsupported: collection expressions are reserved for
  plan 166`. No source containing them parses, so none of them is a word of the language yet
  and none is listed in this section. (`in` is unaffected: it has been a curated keyword since
  plan 4 for a process node's `in`/`out` clauses, and stays exactly as it is.) When a later
  keiro-dsl release makes collection expressions real, the sync for that range adds them.

- **A transition may carry both `implementation hole` and a `guard`, and it still parses.**
  Upstream's own test asserts that pairing produces a *semantic* diagnostic,
  `AggregateTransitionOwnershipConflict`, from a source the parser accepted. As with the
  aggregate type slots above, a highlighter colors what the semantic pass will later reject.


## Section 5 — Operators and punctuation

The operators and punctuation, listed **longest-match first** — a highlighter must try the
longer ones before the shorter ones (e.g. `-->` before `->` before `-`, and `==` before `=`):

```text
-->   --   ->   :=   =>   ==   !=   <=   >=   <>   &&   ||   <   >   +   *   =   @   !   :   ;   .   ,
```

Roles, briefly:

- `-->` / `--` — aggregate transitions, written `State -- Command -->`.
- `->` — the result / transition arrow.
- `:=` — register assignment, e.g. `write x := y`.
- `=>` — the map / case arrow (status maps, rule cases, dispositions).
- `==`, `!=`, `<`, `>`, `<=`, `>=` — comparisons in guard expressions.
- `&&`, `||` — boolean operators in guards.
- `<>` — string concatenation in id expressions.
- `+` — adds a duration to a time (`fireAt input.observedAt + 5m`), and adds two operands of an
  aggregate scalar expression (`write balance := reg.balance + cmd.balance`).
- `*` — multiplies two operands of an aggregate scalar expression (`reg.balance * 2`). The
  matching subtraction operator is written `-`, which neither package colors — see the numbers
  subsection of Section 2 for why.
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
| Declaration introducer | the subset of reserved + contextual words that begin a top-level item or node: `language` (the version preamble, which begins the only clause outside the spec body — see Section 4), `context`, `id`, `enum`, `rule`, `mapped`, `aggregate`, `process`, `router`, `contract`, `intake`, `emit`, `publisher`, `workqueue`, `dispatch`, `readmodel`, `workflow`, `operation` | `keyword.declaration.keiro` | `Keyword` |
| Control / section keyword | all other reserved keywords (Section 3) **and** all curated contextual keywords (Section 4) *except the words the Modifier and Language-constant rows below claim*, e.g. `regs`, `states`, `command`, `event`, `wire`, `guard`, `write`, `goto`, `snapshot`, `module`, `layout`, `resolve`, `dispatch-each`, `read-model`, `category`, `persist`, `patch`, `continueAsNew`, `columns`, `feed`, `scope`, `shape`, `on`, `advance`, `schedule`, `timer`, `bind`, `accept`, `map`, `step`, `await`, the version preamble's dialect name `keiro-dsl` (dashed — see Section 4), and the mapped-type vocabulary `haskell`, `package`, `type`, `binding`, `binding-version`, `canonical-type`, `codec`, `fixtures`, `initial`, `object`, `constructor`, `string`, `tagged-object`, `tag`, `contents`, `as`, `unknown-fields`, `reject`, `ignore`, `on-missing`, and the nominal-binding clause word `using` (which attaches a consumer binding block to an `id` or `enum` declaration — see Section 4), the transition clause word `implementation` (of `implementation hole`; its second word `hole` is a Language constant, one row down), and the two scalar-expression roots `reg` and `cmd` — which, uniquely in this table, are matched **only when the next character is a `.`**, so `reg.balance` is a keyword and the wire word in `id CommandId prefix=cmd` is not (see Section 4), ... | `keyword.control.keiro` | `Statement` |
| Modifier | `deprecated`, `retiring` (the two mutually exclusive event prefixes — see Section 3), `upcast`, `from`, `consistency`, `required`, `stable`, `strategy`, `via`, `policy`, `prefix`, `kind`, the mapped-type words `structural`, `opaque`, `nominal`, `record`, `union` (which select the family and shape of a `mapped` declaration) and `optional` (`required`'s partner on a wire field — see Section 4), and the dashed `replay-only` (the transition prefix — see Section 4; being dashed it must be matched before bare words) | `storage.modifier.keiro` | `StorageClass` |
| Language constant | `true`, `false`, `null` (the `on-missing=null` sentinel — see Section 4), `HOLE`, `placeholder`, `skip`, `hole` (three parser sites: a contract emitter's `derive "…" hole`, a router's `resolve … hole`, and — since keiro-dsl `8b0f55b` — the second word of a transition's `implementation hole` clause, whose first word is a Control keyword one row up) | `constant.language.keiro` (give `true` / `false` the more specific `constant.language.boolean.keiro`; `null` takes the general scope) | `Boolean` for `true` / `false`, else `Constant` |
| Primitive type | `Bool`, `Int`, `Integer` (a distinct spelling from `Int`, not an alias — keiro-dsl `8b0f55b`), `Text`, `Time`, `Id`, `Maybe`, `typeid`, `text`, `int`, and the mapped-type spellings `Natural`, `UTCTime` (an alias for `Time`), `Json`, `Optional`, `List`, `Map` (see Section 4 — `Map` capitalized is a type, the reserved lowercase `map` is a control keyword, and both packages match case-sensitively). These are matched **unconditionally, everywhere**, not only inside a `mapped` declaration: since keiro-dsl `da09736` the same type grammar is also an aggregate register's and an aggregate command/event field's type slot (Section 4) | `support.type.keiro` | `Type` |
| Declaration-site type name | a CamelCase plain identifier appearing immediately after a declaration introducer that names a type (`enum X`, `aggregate X`, `contract X`, `command X`, `event X`, `id X`, `workflow X`, `operation X`, `process X`) or immediately after a `mapped` declaration's family or shape word (`record X`, `union X`, `opaque X`, `nominal X`; `mapped structural enum X` is already covered by the `enum X` case) | `entity.name.type.keiro` | `Type` |
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
