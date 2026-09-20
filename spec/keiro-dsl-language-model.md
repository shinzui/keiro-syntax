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

Since keiro-dsl commit `fcd6748` the released-contract registry holds more than one version,
and as of keiro-dsl commit `3e1217c` it holds **four**: `1`, `2`, `3`, and `4`. Version 2 is the
contract under which the **nominal binding** syntax described in Section 4 is legal, and a
source using that syntax must open `language keiro-dsl 2` or later. A highlighter models none
of that: the version is an ordinary Number (Section 2) whatever its value, and which words a
given version admits is a parser concern. (Parser: the grammar production that owns each piece
of successor syntax checks the version itself and fails with a
`LanguageFeatureRequiresVersion` diagnostic below version 2 — `pIdDecl` and `pEnumDecl` for the
trailing `using { … }` clause, and the `nominal` branch of `pMappedTopItem` for
`mapped nominal …`. An editor must still tokenize such a file while its author is fixing the
version line.)

**Version 3 adds no spelling at all.** The registry in `Keiro/Dsl/LanguageVersion.hs` names a
body grammar per released version, and the version 3 entry names the *same* one version 2 does
(`LanguageDefinition version3 (Just version2) LanguageBodyParserV2`). So a version-3 source is
lexically a version-2 source that happens to write `3` in its preamble, and everything Section 4
says about the version-2 surface applies unchanged under a `3`. What version 3 actually
introduces is **semantic**: it is the first contract to select runtime semantics
`keiro-dsl/runtime-semantics/2`, under which an `id` declaration's `prefix=` value must be a
legal TypeID prefix (module `Keiro/Dsl/IdDomain.hs`, published domain
`keiro-dsl/id-domain/typeid-v7/1`, enforced by `validateNominal` in `Keiro/Dsl/Validate.hs` with
a `NominalInvalidIdPrefix` diagnostic). Versions 1 and 2 keep admitting arbitrary prefix text.
A highlighter colours `prefix=` and its value identically either way — whether a value passes a
semantic check is not a lexical property, and the rule above still holds: an editor tokenizes a
file while its author is fixing the diagnostic. `corpus/language-version-3.keiro` is the sample
both packages tokenize to prove a third version value changes nothing.

**Version 4 is the one version marked stable, and — since keiro-dsl commit `b31896cf` — the
first version since 2 to admit spellings its predecessors reject.** Its registry entry still
names the version-2 body grammar, but no longer version 2's syntax profile: it reads
`LanguageDefinition version4 (Just version3) LanguageBodyParserV2 profileV3 runtimeProfileV3 Stable`,
where `profileV3` (`keiro-dsl/syntax-profile/3`) is version 2's profile plus one new
`LanguageFeature` value, `FieldAliasSyntax`. That feature is the **field alias** clause described
in its own subsection of Section 4 — an optional `haskell <identifier>` and `as "<string>"`
between a field's name and its type, on aggregate command/event fields and on contract event
fields. Crucially it adds no new *word*: `haskell` and `as` have been curated contextual
keywords (Section 4) since the mapped type declaration arrived, so the highlighting rules that
cover a version-4 source are exactly the ones that cover a version-2 source, and a source below
version 4 that writes an alias is rejected with a `LanguageFeatureRequiresVersion` diagnostic at
the marker word — a parser concern, per Section 1's standing rule. Version 4 also selects a
third runtime-semantics profile, which governs generated-code capabilities rather than notation.
Since keiro-dsl commit `b49b11f` each registry entry also carries a
`LanguageSupport` value — `Stable` or `CompatibilityOnly` — and exactly one entry may be `Stable`:
version 4 is, while versions 1 through 3 are `CompatibilityOnly`, retained so historical sources
keep their released meaning. **A highlighter models neither the count nor the support status nor
the feature gate.** All three are registry facts, and the preamble's version stays an ordinary
Number whatever its value and whatever its standing; a file opening `language keiro-dsl 1` must
colour exactly as one opening `language keiro-dsl 4`, and a file naming a version that does not
exist at all must still tokenize while its author fixes the diagnostic.

The split is nonetheless worth knowing about, because it changed which version a reader will
actually meet. `Keiro/Dsl/Skeleton.hs` writes the preamble of every starter file the
`keiro new <kind>` subcommand produces, and that commit changed it from a hard-coded
`language keiro-dsl 1` to `currentStableLanguageVersion`; upstream then migrated its own 225-file
fixture corpus onto `4` in commits `bce4b35` and `cd22e7f`. So `4` is now the version a newly
authored `.keiro` file opens with. `corpus/language-version-4.keiro` is the sample both packages
tokenize to prove a fourth version value changes nothing, and it doubles as this repository's
coverage of the transition shape that migration made standard: no hand-maintained state-vertex
register, and operands qualified with `cmd.`, `reg.`, or an enum type name.

**Versions 5 and 6 are the first to add real vocabulary since the mapped type declaration.**
As of keiro-dsl commit `9fb54d56` the registry holds **six** versions. Version 5 (syntax profile
`keiro-dsl/syntax-profile/4`) is now the one `Stable` entry, and version 4 has joined 1 through 3
as `CompatibilityOnly`; version 6 (`keiro-dsl/syntax-profile/5`) is a third support status,
`Candidate` — accepted for authoring, but not yet a published compatibility contract. Version 5
admits the **projection catalog** (`target`, `rebuild-group`, `projection-revision`,
`projection-owner`), the **external read** contract (`external-read`), readmodel
`freshness = immediate | wait-for-head …` and `query input = … / query result = …`, typed
workqueue payload fields, and **domain command outcomes** (`domain-outcomes …` on an aggregate and
an `outcome accepted | rejected … | no-op …` transition clause). Version 6 adds **process
reactions** (`reactions version 1`, `on … when … otherwise …`, `timers …`), **declarative router
selection** (`resolve declarative { … }`), delegated intake idempotence (`idempotence delegated`),
the `ordering fifo-heads` workqueue policy, identifier-keyed maps (`Map[Key] Value`), and a
declared `id` type in a contract field. None of those words is reserved — Section 3 is unchanged —
so every one of them lives in Section 4, in the subsection "The Language 5 and 6 surface". The
standing rule applies to all of it: the version is an ordinary Number, the gates are parser
concerns (helper `requireLanguageFeatureAt` with the new `LanguageFeature` values
`ProjectionCatalogSyntax`, `ProcessReactionSyntax`, `WorkqueueFifoHeadsSyntax`, and so on), and a
file opening `language keiro-dsl 1` that uses a Language 6 word colours exactly as it would under
a `6`. `corpus/language-version-5-projection-catalog.keiro` and
`corpus/language-version-6-reactions-and-selection.keiro` are the samples both packages tokenize.

**Version 6 has since gained one more feature, and it costs no word at all.** keiro-dsl commit
`a6110a94` added `BareStructuralMappingSyntax` to syntax profile `keiro-dsl/syntax-profile/5` (and
the runtime capability `BareStructuralMappings` to `keiro-dsl/runtime-semantics/5`). It is the
**bare container mapping**, a fourth shape of the `mapped structural` declaration described in
Section 4's mapped-type subsection, written `mapped structural value X { … wire <Type> }`. Both of
its marker words were already here — `value` in Section 4's bare grid since plan 4, `wire` in
Section 3 since the first corpus — so Section 3 is still 72 words and Section 4 is still 139 bare
and 56 dashed. The registry still holds six versions. `corpus/consumer-mapped-bare-containers.keiro`
is the sample both packages tokenize.

**Version 6 has since gained a second late feature, and this one does cost a word.** keiro-dsl
commit `6b92bd52` added `CalendarDaySyntax` to syntax profile `keiro-dsl/syntax-profile/5` (and the
runtime capability `CalendarDayMappings` to `keiro-dsl/runtime-semantics/5`). It is the **calendar
day type**: a new primitive spelling `Day` accepted by `pMappedTypeExpr`, and so accepted
everywhere that grammar is the type slot — a mapped type's wire field, the bare `wire <Type>` line
of the shape above, the argument of `Optional` / `List` / `Map`, an aggregate register, an
aggregate command/event field, and a workqueue payload field. It is a date with no time-of-day part
and no time zone, which is what distinguishes it from the older `Time`. Unlike every other
version-5 and version-6 arrival, `Day` is a **type**, not a clause word, so it lands in neither
Section 3 nor Section 4 — the type vocabulary of this language lives only in Section 6's
Primitive-type row. Section 3 is therefore still 72 words and Section 4 still 139 bare and 56
dashed even though a word did arrive, and the registry still holds six versions.
`corpus/mapped-calendar-days.keiro` is the sample both packages tokenize.

**Version 6 has since gained a third late feature, and it costs one word in the same place.**
keiro-dsl commit `01ba6c58` added `TextSetSyntax` to syntax profile `keiro-dsl/syntax-profile/5`
(and the runtime capability `TextSetMappings` to `keiro-dsl/runtime-semantics/5`). It is the
**structural text set**: a new spelling `Set Text` accepted by `pMappedTypeExpr`, and so accepted
everywhere that grammar is the type slot — a mapped type's wire field, the bare `wire <Type>` line
of the bare container shape, the argument of `Optional` / `List` / `Map`, an aggregate register, an
aggregate command/event field, and a workqueue payload field. It is an unordered collection of text
values with no duplicates, which is what distinguishes it from `List Text`. The spelling is two
words and the second is fixed: the parser reads `Set` and then *requires* `Text`
(`pTextSet = languageFeatureKeyword context TextSetSyntax "Set" >> keyword "Text"`), so there is no
`Set Natural` and no bare `Set`. Only one of the two words is new, and like `Day` before it, `Set`
is a **type** rather than a clause word, so it lands in neither Section 3 nor Section 4 — see
Section 6's Primitive-type row, where the type vocabulary of this language lives. Section 3 is
therefore still 72 words and Section 4 still 139 bare and 56 dashed, and the registry still holds
six versions. `corpus/mapped-text-sets.keiro` is the sample both packages tokenize.

**Version 6 has since gained a fourth late feature, and this one costs two words — the first
arrivals since Language 6 itself.** keiro-dsl commit `e548fffd` added `RefinedBase16Syntax` to
syntax profile `keiro-dsl/syntax-profile/5` (and the runtime capability `RefinedBase16Mappings` to
`keiro-dsl/runtime-semantics/5`). It is the **checked base16 byte refinement**: a fourth family of
the `mapped` declaration, written `mapped refined X { … wire base16-bytes }`, in which keiro itself
owns admission and canonicalization of the value — which byte strings are accepted and how they are
written back out — and the consumer supplies only the Haskell binding. Exactly one policy exists,
named by the two-segment word `base16-bytes` after `wire`. Unlike the three features before it, both
new words are **clause vocabulary** rather than type vocabulary, so both land in Section 4 rather
than in Section 6's Primitive-type row: `refined` in the bare grid, which goes from 139 words to
**140**, and `base16-bytes` in the dashed grid, which goes from 56 to **57**. Section 3 is still 72
words — `keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`, which owns `reservedWords`, is untouched by the
commit — and the registry still holds six versions. `corpus/mapped-refined-base16.keiro` is the
sample both packages tokenize.

**Version 6 has since gained a fifth late feature, and this one costs three words.** keiro-dsl commit
`6b89cb51` added `ExplicitIdAdmissionDomainSyntax` to syntax profile `keiro-dsl/syntax-profile/5`
(and the runtime capability `ExplicitIdAdmissionDomains` to `keiro-dsl/runtime-semantics/5`). It is
the **explicit id admission domain**: an optional trailing clause on an `id` declaration, written
`id LegacyId prefix=legacy domain=typeid-v5-or-v7`, which names in the source text which canonical
identifier values the declared type will admit. There are exactly two values, `typeid-v5-or-v7` and
`typeid-v7`, and the clause is optional: omitting it means the same thing as writing
`domain=typeid-v7`, which is itself a legal spelling. (Semantically the choice decides whether
identifiers derived from UUID version 5 are admitted alongside the version-7 ones keiro has always
admitted. None of that is lexical.) All three words are **clause vocabulary**, so all three land in
Section 4: `domain` in the bare grid, which goes from 140 words to **141**, and the two values in the
dashed grid, which goes from 57 to **59**. Section 3 is still 72 words —
`keiro-dsl/src/Keiro/Dsl/Parser/Core.hs`, which owns `reservedWords`, is untouched by the commit —
and the registry still holds six versions. The clause has its own subsection in Section 4, "The
explicit id admission domain", because it brings two new prefix collisions with it, one of them the
first ever to fall on a word in Section 6's Primitive-type row.
`corpus/id-admission-domains.keiro` is the sample both packages tokenize, and
`corpus/language-version-6-reactions-and-selection.keiro` carries the explicit `domain=typeid-v7`
spelling the fixture never writes.

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
reset        clear       preserve    targets     order       provisioner
validator    promotion   index       constraint  all         delivery
subscription replay      explicit    fail        freshness   immediate
backing      accepted    rejection   reactions   when        otherwise
silent       cancel      once        timers      declarative identity
with         where       recipient   empty       failure     redelivery
ack          idempotence delegated
refined
domain
```

The last three-and-a-bit rows — `as` through `using` — are the **mapped type declaration**
vocabulary, described in its own subsection below. They are listed here in alphabetical order
rather than in the order they appear in a declaration, because this grid is a flat membership
list and nothing else in it is ordered either. `nominal` and `using` (keiro-dsl commit
`fcd6748`) belong to the **nominal binding** forms described at the end of that subsection.
`implementation` is the most recent arrival (keiro-dsl commit `8b0f55b`) and belongs to none of
the mapped-type families: it opens an aggregate transition's `implementation hole` clause,
described in "The scalar expression sublanguage" below. Since keiro-dsl commit `b31896cf` two of
the mapped-type words, `haskell` and `as`, also serve a second grammar: they are the **field
alias** markers on aggregate command/event fields and contract event fields, described in "Field
aliases on aggregate and contract fields" at the end of this section. That gave the words a new
home without adding a word to this grid.

The seven rows after `using` — `reset` through `delegated`, 39 words — are the **Language 5 and
6 surface** (keiro-dsl `d7be0fe6..9fb54d56`), described in its own subsection at the end of this
section. They are listed in the order the plan that added them met them in the parser, not
alphabetically.

The row before the last holds `refined` (keiro-dsl commit `e548fffd`), the family word of
the **checked base16 byte refinement** — the fourth `mapped` family, described with the other three
in "The mapped type declaration" below. Like `structural`, `opaque`, and `nominal` it is a
**Modifier** in Section 6, not a control keyword. It sits on a row of its own rather than at the end
of the row above so the sentence naming the Language 5 and 6 rows stays true as written.

The final row holds the newest arrival, `domain` (keiro-dsl commit `6b89cb51`), the clause label of
the **explicit id admission domain** described in its own subsection below. Like `prefix` and `kind`
beside which it is written, it is a **Modifier** in Section 6: it qualifies the declaration `id`
introduces rather than opening a clause of its own. It too sits on a row of its own, for the same
reason `refined` does.

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
rebuild-group  projection-revision external-read projection-owner
depends-on     schema-version  provisioner-version expected-shape validator-version
owned-sequence result-schema   result-type   compatible-revisions surface-generation
checkpoint-on-missing from-beginning from-current-head live-only wait-for-head
fifo-heads     domain-outcomes no-op         no-action     max-recipients
base16-bytes
typeid-v5-or-v7 typeid-v7
```

`keiro-dsl` is the dialect name in the **version preamble** described in its own subsection
below. The five rows from `rebuild-group` through `max-recipients` — 24 words — are the dashed
half of the **Language 5 and 6 surface** described at the end of this section; the first four of
them are **Declaration introducers**, the only dashed introducers in the language. The five words
`binding-version`, `canonical-type`, `on-missing`, `tagged-object`, and `unknown-fields` belong to
the **mapped type declaration** described after it, and so does `base16-bytes` (keiro-dsl commit
`e548fffd`) — the one wire policy a `mapped refined` declaration may name. It sits on a row of its
own so the sentence above it stays true as written. The newest arrivals, on the final row, are
`typeid-v5-or-v7` and `typeid-v7` (keiro-dsl commit `6b89cb51`): the two — and only two — values of
the **explicit id admission domain** clause described in its own subsection below.
`cross-check` is not new: it is a real `keyword "cross-check"`
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
`dispatch-each`, `binding` of `binding-version`. The complete set is fourteen words: `on`,
`dispatch`, `binding`, `dedupe`, `shape`, and — since the Language 5 and 6 surface — `projection`
(`projection-revision`, `projection-owner`), `schema` (`schema-version`), `result`
(`result-schema`, `result-type`), `provisioner`, `validator`, `replay` (whose dashed partner
`replay-only` predates it), and the Modifier `from` (`from-beginning`, `from-current-head`); and —
since keiro-dsl `6b89cb51` — the Modifier `domain` (of the Control value `domain-outcomes`, which
predates it by a whole language surface) and the **primitive type** `typeid` (of `typeid-v5-or-v7`
and `typeid-v7`). `typeid` is the first member of this set that is not a clause word at all: it
lives in Section 6's Primitive-type row, where it is the lowercase legacy workqueue payload type of
`incidentId: typeid "inc"`, so in Vim the guard has to be applied to a `syntax keyword keiroType`
line rather than to a `keiroStatement` one, and the bare uses must be re-checked afterwards. A bare
keyword appearing in the *interior* of
a dashed word is harmless in both engines — `status-map` survives even though `map` is a
keyword, and `unknown-fields` survives even though `fields` is one, because both engines
prefer the match that starts earlier in the line. (That is also why the `or` in the middle of
`typeid-v5-or-v7` would be harmless even if `or` were a keyword in this language, which it is not.)
For the prefix cases, Vim needs the bare
word declared as a `syntax match … /\<word\>-\@!/` rather than a `syntax keyword`, because
Vim's `syntax keyword` outranks a `syntax match` that begins at the same column. A TextMate
grammar needs no such trick, only the dashed rule listed earlier in its `patterns` array.

Two entries in the dashed list have a leading segment that is **not** a keyword at all, and the
same conclusion follows for both. `keiro-dsl` is the older one — `keiro` means nothing to either
package, and neither does `dsl` — and `base16-bytes` (keiro-dsl `e548fffd`) is the newer: `base16`
is no word this language knows, and neither is `bytes`. Neither needs the `-\@!` treatment and
neither needs any reordering. Each needs only to *be* in the dashed rule, so the whole spelling is
claimed as one token instead of falling through as plain text. `base16-bytes` is also the first
keyword in the language to contain a **digit**, and it is safe from every number rule in both
packages for a reason worth stating: both require a word boundary before a numeric literal (Vim's
`\<\d\+\>`, the TextMate `\b[0-9]+\b`), and in `base16` the `1` is preceded by the word character
`e`, so no boundary exists there.

**`typeid-v5-or-v7` is not safe for that reason, and it is the first keyword that is not.** Its
digits are preceded by `v`, and that `v` is preceded by `-`, which is *not* a word character in
either engine. So the **version-token** rule of Section 2 — the one that colours the `v2` of
`event Touched v2`, written `\<v\d\+\>` in Vim and `\bv[0-9]+\b` in the TextMate grammar — genuinely
matches the `v5` and the `v7` inside the spelling. What keeps the word whole is not the pattern but
**rule precedence**: the dashed keyword rule starts at the `t` of `typeid`, earlier in the line than
either `v`, and both engines prefer the match that starts earlier. Every keyword with a digit before
this one was safe by construction; these two are safe only by ordering, which is why the
"one uniform group over every character" assertions in both suites are load-bearing for them.

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

### The explicit id admission domain

Since keiro-dsl commit `6b89cb51` an `id` declaration may carry one more clause, between its
`prefix=` clause and its optional trailing `using { … }` nominal binding block:

```text
language keiro-dsl 6
context id-admission-domains

id LegacyId prefix=legacy domain=typeid-v5-or-v7
```

Three literal words, none of them reserved:

- **`domain`** is a **Modifier** in Section 6 — the same class as `prefix`, beside which it is
  written, and as `kind`. It qualifies the declaration `id` introduces rather than opening a clause
  of its own, and giving it any other class would colour the two halves of
  `prefix=legacy domain=typeid-v5-or-v7` differently for no reason a reader could name.
- **`typeid-v5-or-v7`** and **`typeid-v7`** are **Control / section keywords**, matched with the
  dashed rules above. They are fixed enumerated clause values, like `reject`, `standard`,
  `live-only`, and `fifo-heads` before them, and the grammar admits no third.

The whole of the notation is one parser production in
`keiro-dsl/src/Keiro/Dsl/Parser/Declaration.hs`:

```haskell
pIdAdmission :: P IdAdmission
pIdAdmission = do
  keyword "domain"
  _ <- symbol "="
  choice
    [ TypeIdV5OrV7 <$ symbol "typeid-v5-or-v7",
      TypeIdV7 <$ symbol "typeid-v7"
    ]
```

called from `pIdDecl` as
`fromMaybe TypeIdV7 <$> optionalLanguageFeature context ExplicitIdAdmissionDomainSyntax "domain" pIdAdmission`.
So the clause is **optional**, and omitting it means exactly what writing `domain=typeid-v7` means:
`docId` in `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` prints the clause only for `TypeIdV5OrV7` and
prints nothing for `TypeIdV7`, which is why a file carrying the explicit default round-trips back to
a file without it. Both spellings are legal input and a highlighter must colour both.

What the clause *means* — which canonical identifier values the declared type admits, and in
particular whether values derived from UUID version 5 are accepted alongside the version-7 ones — is
not a lexical property, and the standing rule of Section 1 applies to it as to every other gate: a
file that writes the clause under `language keiro-dsl 5` is rejected with a
`LanguageFeatureRequiresVersion` diagnostic, and an editor must still tokenize it while its author is
fixing the version line.

Two implementation facts, both covered by the implementer note above. `domain` is a **prefix** of the
older dashed Control value `domain-outcomes`, so in Vim it must be a guarded
`syntax match … /\<domain\>-\@!/` and never a `syntax keyword`; the parser draws the same line, since
`keyword "domain"` ends with `notFollowedBy (identChar <|> (char '-' *> identChar))` and so refuses
to fire on `domain-outcomes`. And `typeid` is a prefix of both values, which makes the lowercase
primitive type of Section 6's Primitive-type row the first member of the prefix-collision set that is
not a clause word — see the implementer note for what that costs in Vim.

`domain` is also the first of these three words to **recolour text in files the upstream range never
touched**, and a reader who greps for it will find the hits before they find the clause. Because a
dash is not a word character in either engine, the `domain` segment of an unquoted Haskell package
name is now coloured: `haskell package=artifact-domain …` shows a coloured `domain`, and so do
`ledger-domain`, `shipment-domain`, `language-domain`, and `id-domain-conformance` in four other
corpus files. That is the same long-standing behaviour `refined` already shows inside
`context refined-base16` and `structural` inside `context structural-text-sets`, and both packages
pin it so a future "fix" has to be deliberate. Two nearby spellings are *not* touched, for reasons
worth knowing: `id_domain_ledger` keeps its `domain` plain because `_` **is** a word character, so
the whole thing is one identifier; and `shape-hash="id-domain-ledger-v3"` keeps its plain because
the string rule wins inside a literal.

One more thing a reader will meet in the sample and should not mistake for a defect: the context name
of `corpus/id-admission-domains.keiro` is `context id-admission-domains`, and its first segment `id`
is coloured as a declaration introducer, because a dash is not a word character in either engine and
`id` there is therefore a whole word. `admission` and `domains` stay plain — `domains` in particular
is *not* claimed by the new `domain` rule, because every rule in both packages requires a word
boundary after the match. This is the same long-standing behaviour already recorded for `refined`
inside `context refined-base16` and `structural` inside `context structural-text-sets`.

### The mapped type declaration

A `.keiro` file can declare a **consumer-owned mapped type**: a Haskell data type that lives
in a *different* package, together with an explicit description of how it is encoded on the
wire. The declaration begins with the reserved word `mapped` (Section 3) and supplies 30 of
this section's curated words — 24 bare and 6 dashed. None of them is reserved, because
everything inside the declaration's `{ … }` braces is unambiguous without reservation, so a
reader of Section 3 alone would never learn that these words exist. Hence this subsection.

Since keiro-dsl commit `a6110a94` the declaration also **borrows** one word it does not supply:
`value`, the selector of the fourth structural shape described below, which this section has
carried in its bare grid since plan 4 as the last clause word of a workflow signal operation. It
is a borrowing rather than an arrival, so the counts above are unchanged.

There are four families. Two of them describe a *structure*, and are covered first;
`mapped refined …`, added by keiro-dsl commit `e548fffd`, hands the encoding to a keiro-owned
policy and is covered in "Refined byte policies" below; and `mapped nominal …`, added by keiro-dsl
commit `fcd6748`, describes an *identity* and is covered in "Nominal bindings" at the end of this
subsection.

`mapped structural …` describes the encoding and comes in four **shapes** — `record` (a product
type, encoded as a JSON object), `enum` (nullary constructors, encoded as a JSON string), `union`
(a sum type with payloads, encoded as a tagged JSON object), and — since keiro-dsl commit
`a6110a94` — `value` (the type *is* a container: an `Optional`, a `List`, a `Map`, or a nesting of
those, encoded as that container directly, with no wrapping object). The first three describe the
encoding field by field in a braced `wire … { … }` block; the fourth writes it as a single
unbraced `wire <Type>` line and is covered in its own fact bullet below. `mapped opaque …` does
not describe the encoding at all; it names an existing codec by id and version. A worked example
of the first, which uses every clause and every value form the record shape admits:

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
`haskell`, `codec`, `version`, `fixtures`, and `initial`. The `value` shape replaces the whole
`wire … { … }` block with one unbraced line:

```text
mapped structural value NestedIds {
  haskell package=keiro-dsl module=Conformance.BareContainers.Domain type=NestedIds
  binding = "Conformance.BareContainers.Bindings.nestedIdsBinding"
  binding-version = "1"
  canonical-type = "conformance.bare-containers.NestedIds.v1"
  fixtures = "Conformance.BareContainers.Bindings.nestedIdsFixtures"
  wire List (Optional ItemId)
}
```

Seven facts a highlighter implementer needs:

- **The type slot accepts exactly thirteen spellings** (parser `pMappedTypeExpr`): `Text`, `Int`,
  `Integer`, `Bool`, `Natural`, `Time` — with `UTCTime` as an accepted alias for `Time` — `Day`,
  `Set Text`, `Json`, the one-argument constructors `Optional`, `List`, `Map`, and a bare
  identifier naming another mapped type. All twelve literal spellings are **Primitive types** in
  Section 6, alongside the pre-existing `Int` and `Text`. `Set Text` is the newest (keiro-dsl commit `01ba6c58`, which
  added it to both branches of `pMappedTypeExpr`); it is a **set of text values** — unordered, no
  duplicates — and so is a different type from `List Text`, which is ordered and may repeat a
  value. It is the language's only **two-word** type spelling, and the second word is fixed: the
  parser reads `Set` and then requires `Text`, so there is no `Set Natural`, no `Set ItemId`, and
  no bare `Set`. Both packages nevertheless match `Set` with an ordinary one-word type rule, which
  colours the two-word phrase correctly wherever it is legal; colouring an illegal `Set Natural` is
  the same harmless over-acceptance both packages already show for a version-gated word in a
  version-1 file. Before it, `Day` was the newest (keiro-dsl commit `6b92bd52`, which added
  it to both branches of `pMappedTypeExpr`); it is a **calendar date** — a year, month, and day
  with no time-of-day part and no time zone — and so is a different type from `Time`, which is an
  instant. Unlike `Time` it has no alias: the one accepted spelling is `Day`. Before it, `Integer`
  was the newest (keiro-dsl commit `8b0f55b`); it is a distinct spelling from `Int`, not an
  alias for it — upstream uses `Int` for machine integers and `Integer` for exact
  arbitrary-precision ones. Note that `Map` (capital) is a primitive type while the
  reserved `map` (lowercase, Section 3) is a control keyword: they are different words, and
  both packages match case-sensitively. A one-argument constructor's argument may be written
  bare (`Optional Text`) or parenthesized (`Optional(Text)`); the parentheses are **uncolored
  punctuation**, like the braces of a field list.
- **That same type slot is no longer confined to a `mapped` declaration.** keiro-dsl commit
  `da09736` made `pMappedTypeExpr` the type slot of an **aggregate register** (`pRegDecl`,
  which read a bare `ident` before) and of an **aggregate command/event field**
  (`pAggregateField`, likewise). So all thirteen spellings now appear in the two most-written
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
- **The `value` shape's encoding is one unbraced `wire <Type>` line**, where `<Type>` is the same
  `pMappedTypeExpr` grammar the wire fields use (parser: `MappedBare -> ShapeBare <$>
  pMappedTypeExpr context`; pretty-printer: `docMappedShape (ShapeBare e) = "wire" <+>
  docTypeExpr e`). Nothing in that line is new. `wire` is a reserved word (Section 3) and has
  headed the braced form since the declaration arrived; `Optional`, `List`, `Map`, and the scalar
  spellings are **Primitive types** in Section 6, matched unconditionally everywhere; a reference
  to another declared type (`ItemId` above) is a plain identifier and stays uncolored, exactly as
  it does in a `: MaybeText` wire field; and the parentheses of a nested constructor are
  **uncolored punctuation**, as `Optional(Text)` already is. So the shape needed no new matching
  rule in either package.
- **`structural`, `opaque`, `nominal`, `refined`, `record`, `union`, and the field-level `optional`
  are Modifiers** in Section 6, not control keywords: they qualify the declaration `mapped`
  introduces rather than introducing one themselves. (`nominal` is the third family word; see
  "Nominal bindings" below. `refined` is the fourth, added by keiro-dsl commit `e548fffd`; see
  "Refined byte policies" below. Both join `structural` and `opaque` for the same reason — upstream's
  `pMappedTopItem` reads `keyword "mapped"` and then chooses between the four.) `optional` is
  `required`'s partner in one parser `choice`,
  and `required` has been a Modifier since plan 4. The visible consequence of classifying by
  role rather than by position is that `mapped structural enum X` shows `enum` in the
  *introducer* color while `mapped structural record X` shows `record` in the *modifier* color
  — because `enum` is a reserved word that is unconditionally an introducer everywhere. That
  asymmetry is inherent to lexical highlighting and is not worth working around.
- **`value`, the fourth shape word, does *not* join them: it stays a Control / section keyword.**
  This is the second instance of the asymmetry the bullet above describes, and it resolves the
  same way for the same reason. A word gets exactly one class everywhere it appears (Section 1),
  and `value` already had an older, more frequently written role when the shape arrived: the final
  clause word of a workflow signal operation, `signal <label> of <Workflow> key from <f> via <g>
  value <Type>`, which `corpus/workflow-signal-mismatch.keiro` has carried since the first corpus.
  That role is a clause label, which is what the Control class is for. Promoting the word to
  Modifier to win consistency inside `mapped structural value X` would recolor the older site, so
  both packages leave it alone: `mapped structural value MaybeText` reads `mapped` in the
  *introducer* color, `structural` in the *modifier* color, and `value` in the *control* color.
  The name after it is still a **Declaration-site type name** (Section 6) — `value X` is the fifth
  position that optional refinement recognizes. Because the refinement is purely lexical it also
  fires on the workflow site, coloring the `ReservationConfirmation` of `value
  ReservationConfirmation` as a type name. That is accurate rather than accidental — upstream's
  `Keiro/Dsl/Validate.hs` binds that slot as `valueType` and resolves it against the declared
  types — but it is a *use* site, not a declaration site, so the class name is now slightly wider
  than its label. One further care is needed in the refinement's pattern: `value` is a common wire
  *field* name — twenty-one upstream fixtures open a wire field with `value as "…" : …` — so the
  name slot must require the CamelCase spelling Section 6 already specifies, or the alias marker
  `as` in that line would be claimed as a type name.
- **`initial` is legal both as a clause label here and as an ordinary identifier**, and both
  readings appear in the upstream fixture six lines apart: `initial = "…"` inside the mapped
  block, and `currentArtifact ArtifactInfo = initial` in an aggregate's `regs` block, where
  the parser reads it with plain `ident`. Both packages color both occurrences as a keyword.
  That is Section 1's lexical-highlighting rule working as designed, not a bug — `key`,
  `value`, `field`, `table`, `row`, and `group` have all been unconditional keywords since
  plan 4 and can all appear as ordinary names too.

#### Refined byte policies

Since keiro-dsl commit `e548fffd` a `.keiro` file can also declare a **checked byte refinement**:
a consumer-owned type whose accepted values and canonical spelling are decided by *keiro* rather
than by the declaration. The consumer still supplies the Haskell binding; what it does not supply
is the encoding, because the encoding is a frozen wire contract keiro owns. This is the fourth
`mapped` family and it takes one spelling:

```text
mapped refined ContentHash {
  haskell package=keiro-dsl module=Conformance.RefinedBase16.Domain type=ContentHash
  binding = "Conformance.RefinedBase16.Bindings.contentHashBinding"
  binding-version = "1"
  canonical-type = "conformance.refined-base16.ContentHash.v1"
  fixtures = "Conformance.RefinedBase16.Bindings.contentHashFixtures"
  initial = "Conformance.RefinedBase16.Bindings.initialContentHash"
  wire base16-bytes
}
```

Three facts a highlighter implementer needs:

- **Only two words are new.** The braced block is `pRefinedClause`, a `choice` over rules the older
  families already used — `pHaskellSource` (the `haskell package=… module=… type=…` line) and
  `pQuotedFact` for `binding`, `binding-version`, `canonical-type`, `fixtures`, and `initial` —
  plus one new alternative, `keyword "wire" *> keyword "base16-bytes"`. Every one of those six
  clause labels is already in this section, and `wire` is reserved (Section 3) and has headed the
  braced form since the declaration arrived. So the whole of refined byte policies costs exactly
  `refined` and `base16-bytes`.
- **`refined` is a Modifier and `base16-bytes` is a Control keyword** in Section 6. `refined` joins
  `structural`, `opaque`, and `nominal` because it selects a `mapped` declaration's family.
  `base16-bytes` is a fixed enumerated clause value read immediately after `wire`, which is exactly
  the position and exactly the parser shape of `tagged-object` in
  `wire tagged-object tag=… contents=…` — and `tagged-object` has been a Control keyword since the
  declaration arrived. Being dashed, `base16-bytes` must be matched before bare words; being a
  dashed word whose leading segment is not a keyword, it needs no `-\@!` partner (see the dashed
  subsection above).
- **The name after `refined` is a declaration-site type name**, the same optional refinement
  Section 6 already gives `record X`, `union X`, `opaque X`, `nominal X`, and `value X`.

`base16-bytes` is the only policy the grammar admits. Upstream's own test suite pins that by
asserting that `wire base16-bytes length=32` and `wire custom Example.decodeHash` are both
rejected, so neither `length` nor `custom` is a word of this language. A highlighter models none of
that: it colours the one spelling that exists and would colour an invented second one as plain
text, which is the correct rendering of a word that is not in the list.

Refined-byte-policy syntax requires the source to declare `language keiro-dsl 6` or later. Neither
package models that, for the reason Section 1 gives: highlighting is purely lexical, and a file
naming an earlier version still tokenizes while its author fixes the
`LanguageFeatureRequiresVersion` diagnostic.

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
  thirteen-spelling `pMappedTypeExpr` grammar, and is narrowed later by `keiro-dsl check`. The
  accepted set (`Keiro/Dsl/NominalType.hs`, `scalarRepresentation`) is `Text`, `Int`,
  `Natural`, `Bool`, `Time`, and `UTCTime` as an alias for `Time` — all six already
  **Primitive types** in Section 6, so the slot needs no new rule. keiro-dsl `6b92bd52` added
  `Day` to `pMappedTypeExpr` but **not** to `scalarRepresentation`, and keiro-dsl `01ba6c58` did
  the same with `Set Text`, so a nominal binding still cannot be represented as a calendar date or
  as a text set; the difference is a `keiro-dsl check` diagnostic and is invisible to a lexical
  highlighter, which colours `Day` and `Set` wherever they appear. Because the *parser*
  accepts any identifier there, a file naming an unsupported representation still tokenizes;
  that is the same principle applied to aggregate type slots in
  `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`.

One shape here is the first of its kind in the language: an `enum … using { … }` declaration
continues *after* a closing brace, so a line can read
`enum OrderStatus { Draft=draft Submitted=submitted } using {`. Braces are uncolored
punctuation in both packages, so nothing special is needed for it — but a future contributor
tempted to add brace matching to either grammar should know the case exists.

Nominal binding syntax requires the source to declare `language keiro-dsl 2` or later
(Section 1; version 3 shares version 2's body grammar, so it admits this syntax too).
Neither package models that, for the reason Section 1 gives: highlighting is purely lexical.
Until keiro-dsl commit `54a5342` the parser was stricter about `using` than about any other
unreserved word — the `ensureBodyFeatures` pre-scan rejected a version-1 source whose lines
contained `using` *anywhere*, string literals included. That commit moved the check into
`pIdDecl` and `pEnumDecl` (helper `optionalLanguageFeature`), so a version-1 source is now
rejected only where `using` actually opens a binding clause and is free to use the word as an
identifier elsewhere. Either way it is a parser rule, and both packages color the word
unconditionally.

### The scalar expression sublanguage

Since keiro-dsl commit `8b0f55b` a source declaring `language keiro-dsl 2` or later writes the `guard`
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
  plan 4 for a process node's `in`/`out` clauses, and stays exactly as it is. `all` is now
  affected the same way: keiro-dsl `9fb54d56`'s projection catalog made it a real word elsewhere,
  as the all-stream source `source = all` of a `projection-owner`, so it joined the bare grid and
  is coloured everywhere, including in an expression that the parser will reject.) When a later
  keiro-dsl release makes collection expressions real, the sync for that range adds the rest.

- **A transition may carry both `implementation hole` and a `guard`, and it still parses.**
  Upstream's own test asserts that pairing produces a *semantic* diagnostic,
  `AggregateTransitionOwnershipConflict`, from a source the parser accepted. As with the
  aggregate type slots above, a highlighter colors what the semantic pass will later reject.

### Field aliases on aggregate and contract fields

Since keiro-dsl commit `b31896cf` a source declaring `language keiro-dsl 4` may give a field up
to two optional **aliases** between its name and its `:` type: a generated-Haskell
record-selector alias introduced by the word `haskell`, and a serialized wire-key alias
introduced by the word `as`. The clause exists in two productions — an **aggregate
command/event field** (parser `pAggregateField` in `Parser/Aggregate.hs`, where the `:` type
was already optional) and a **contract event field** (parser `pContractField` inside
`pContract` in `Parser/Integration.hs`, where the `:` type is mandatory and is one of
`typeid "…"`, `text`, or `int`):

```text
command Observe {
  family:Text
  type haskell payloadType:Text
  region haskell serviceRegion as "region_code":Text
}

event ParcelObserved on parcelEvents {
  parcelId: typeid "parcel"
  region haskell serviceRegion as "region_code": text
}
```

Semantically the logical DSL name (`region`) stays the identity used by expressions and
evolution pairing, the selector (`serviceRegion`) names the generated Haskell record selector,
and the wire key (`"region_code"`) names the serialized JSON key — none of which a highlighter
models. Three facts an implementer needs:

- **No word here is new, so no rule changes.** `haskell` and `as` are the same curated Control
  / section keywords the mapped type declaration supplied (this section's bare grid, both
  matched unconditionally by both packages since then). The selector is an ordinary plain
  identifier and takes no class; the wire key is an ordinary **String** (Section 2). This is
  the same shape as the widened aggregate type slots above: existing spellings in a new
  position, already covered because a word is a keyword by membership, not by position.
- **The gate is a registry fact, not a lexical one.** The clause is legal only under the
  `FieldAliasSyntax` feature of syntax profile 3, which exactly one released version carries:
  version 4 (see Section 1). Below version 4 the parser rejects the marker word with a
  `LanguageFeatureRequiresVersion` diagnostic (helper `optionalLanguageFeature`), and an editor
  must still tokenize the file while its author fixes the version line.
- **Upstream leans on the vocabulary collisions, deliberately.** Its own fixtures alias a
  field *named* `type` (`type haskell payloadType:Text`) and declare a field literally named
  `as` (`as:Text`); both parse because neither word is reserved, and both packages colour both
  words as keywords wherever they appear — Section 1's lexical-highlighting rule working as
  designed, exactly as `initial`, `key`, and `value` before them. `corpus/field-aliases.keiro`
  reproduces both collisions so the suites pin them.

### The Language 5 and 6 surface

keiro-dsl `d7be0fe6..9fb54d56` (455 commits, released as keiro-dsl 0.17.0.0) is the largest
vocabulary change since the mapped type declaration: 63 new words — 39 bare and 24 dashed — and
**none of them reserved**, so Section 3 did not move. Five constructs carry nearly all of it.

The **projection catalog** (new module `Parser/ProjectionCatalog.hs`, Language 5) adds five
top-level declarations that describe the physical tables a projection writes and who owns them:

```text
target audit_log {
  schema = "sales"
  table = "audit_log"
  reset = preserve
  depends-on = [ order_summary ]
}

rebuild-group reporting {
  targets = [ order_summary audit_log ]
  order = [ order_summary audit_log ]
}

projection-revision reporting_v1 {
  group = reporting
  target order_summary {
    schema-version = "v1"
    provisioner = "reporting-v1-order-summary"
    provisioner-version = 1
    expected-shape = "order-summary-v1"
    validator = "reporting-v1-order-summary-validator"
    validator-version = 1
    promotion index "order_summary_status_idx__v1" -> "order_summary_status_idx"
  }
}

projection-owner audit_writer {
  source = all
  delivery = subscription
  group = reporting
  targets = [ audit_log ]
  order = 20
  subscription = "catalog-demo-audit"
  dedup = "catalog-demo-audit-v1"
  checkpoint-on-missing = from-current-head
  replay = live-only "audit events cannot be replayed"
}

external-read order_reader {
  version = 1
  query = order_lookup
  result-schema = "app_contract"
  result-type = "order_row_v1"
  compatible-revisions = [ reporting_v1 ]
  surface-generation = 1
}
```

A `readmodel` gains `query input = <Type>` / `query result = <Type>` (typed with the mapped type
grammar), `freshness = immediate | wait-for-head <scope>` in place of the legacy
`consistency`/`scope`/`feed`/`subscription` clauses, and, inside a catalog group,
`group = …`, `targets = [ … ]`, and `backing = …`. A **domain command outcome** is an aggregate
header line `domain-outcomes rejection=<Enum> no-op=<Enum>` plus a transition clause
`outcome accepted`, `outcome rejected <expr>`, or `outcome no-op <expr>`.

**Process reactions** (Language 6) replace a process's single `handle` block with a versioned list
of per-input reactions:

```text
  reactions version 1
  on IncidentReported
    when input.severity == Severity.Sev1
      advance RecordCritical { incidentId }
        accepted
        silent no-action
      schedule escalation fireAt input.raisedAt + 5m { incidentId }
    otherwise
      schedule reminder once fireAt input.raisedAt + 60m { incidentId }
  on ResponderAcked
    cancel reminder
  timers max-attempts 5 dead-letter "incident timer exceeded ceiling"
```

**Declarative router selection** (Language 6) is a second form of `resolve`, after a router
whose `input` is typed with `:`:

```text
  resolve declarative {
    identity = "template-selection"
    version = 1
    query = read-model template_lookup with input
    where = row.claimId == input.claimId
    recipient = row.templateId
    order = target-stream
    dedupe = target-stream
    max-recipients = 16
    empty => ack
    failure => retry
    redelivery = stable-union
    partial = retain-successes
  }
```

The remaining Language 6 spellings are small: `idempotence table | delegated` on an intake,
`ordering fifo-heads` on a workqueue, `bool` beside `text` and `int` as a legacy workqueue payload
type, `Map[<IdType>] <Type>` as an identifier-keyed map, and a declared `id` type name in a
contract field's type slot.

Facts a highlighter implementer needs:

- **Classification.** The four dashed catalog words `rebuild-group`, `projection-revision`,
  `external-read`, and `projection-owner` are **Declaration introducers** — they begin top-level
  items — and they are the only dashed introducers in the language, so each package needs a
  dashed-introducer rule of its own. `target`, the fifth catalog declaration, stays a **Control**
  keyword: it has been one since plan 4 as a process/router clause word and is far commoner in
  that role, and a lexical highlighter cannot tell the two uses apart. `once`, `silent`, and
  `declarative` are **Modifiers** — `once` qualifies a `schedule` as `optional` qualifies a wire
  field, `silent` qualifies a `no-action`, and `declarative` selects a `resolve` form exactly as
  the existing Modifier `stable` does. `bool` is a **Primitive type** next to `text` and `int`.
  Every other new word is a **Control / section keyword**, including the enumerated clause values
  (`clear`, `preserve`, `index`, `constraint`, `owned-sequence`, `all`, `explicit`, `live-only`,
  `fail`, `from-beginning`, `from-current-head`, `immediate`, `wait-for-head`, `fifo-heads`,
  `delegated`, `accepted`, `no-op`, `no-action`, `ack`), following the precedent `inline`,
  `reject`, `ignore`, `standard`, `strict`, and `halt` set.
- **What is deliberately not a keyword.** The router selection policies after `order =`,
  `dedupe =`, `redelivery =`, and `partial =` are parsed by `pSelectionPolicyName` as identifiers
  joined by `-` and are checked later against a fixed value per clause (`target-stream`,
  `stable-union`, `retain-successes`, in `Keiro/Dsl/RouterSelection.hs`). They are values, not
  parser literals, so neither package claims them; like any dashed wire word they render segment
  by segment, which means `target-stream` shows the Control keywords `target` and `stream` around
  an uncoloured `-`. The camel-case `deadLetter` of `empty => …`/`failure => …` stays uncoloured
  for the reason plan 4 gave for `ackOk` and `deadLetter` everywhere else. The fixed dispatch-id
  tuple `(name, correlationId, sourceEventId, targetStreamName, occurrence)` is identifiers.
- **Seven new prefix collisions** (Section 4's implementer note): `projection`, `schema`,
  `result`, `provisioner`, `validator`, `replay`, and `from` each head a dashed word, so Vim
  matches each with `/\<word\>-\@!/` rather than `syntax keyword`. `from` is the first
  **Modifier** to need the guard.
- **Collisions with ordinary names are expected.** Upstream's own catalog fixture declares a
  register `accepted Bool = False`; `order`, `index`, `empty`, `with`, and `where` are likely field
  names too. All are coloured as keywords wherever they appear — Section 1's rule, exactly as
  `initial`, `key`, and `value` before them.
- **No new punctuation or literal forms.** `Map[TemplateId] Text` brackets are uncoloured
  punctuation like the `[ … ]` of `targets = [ … ]` and `projections [ ]`; the typed router input
  and workqueue payload `:` is the existing field-type separator; every number, string, duration,
  and expression operand is an existing Section 2 form.


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
| Declaration introducer | the subset of reserved + contextual words that begin a top-level item or node: `language` (the version preamble, which begins the only clause outside the spec body — see Section 4), `context`, `id`, `enum`, `rule`, `mapped`, `aggregate`, `process`, `router`, `contract`, `intake`, `emit`, `publisher`, `workqueue`, `dispatch`, `readmodel`, `workflow`, `operation`, and the four dashed projection-catalog declarations `rebuild-group`, `projection-revision`, `external-read`, `projection-owner` (Language 5; being dashed they must be matched before bare words — the bare `projection` heads two of them; see Section 4) | `keyword.declaration.keiro` | `Keyword` |
| Control / section keyword | all other reserved keywords (Section 3) **and** all curated contextual keywords (Section 4) *except the words the Modifier and Language-constant rows below claim*, e.g. `regs`, `states`, `command`, `event`, `wire`, `guard`, `write`, `goto`, `snapshot`, `module`, `layout`, `resolve`, `dispatch-each`, `read-model`, `category`, `persist`, `patch`, `continueAsNew`, `columns`, `feed`, `scope`, `shape`, `on`, `advance`, `schedule`, `timer`, `bind`, `accept`, `map`, `step`, `await`, the version preamble's dialect name `keiro-dsl` (dashed — see Section 4), and the mapped-type vocabulary `haskell`, `package`, `type`, `binding`, `binding-version`, `canonical-type`, `codec`, `fixtures`, `initial`, `object`, `constructor`, `string`, `tagged-object`, `base16-bytes` (the one wire policy of a `mapped refined` declaration — keiro-dsl `e548fffd`; it is read immediately after `wire`, exactly as `tagged-object` is, and being dashed it must be matched before bare words, though unlike most dashed words its leading segment `base16` is not itself a keyword, so it needs no `-\@!` partner — see Section 4), `tag`, `contents`, `as`, `unknown-fields`, `reject`, `ignore`, `on-missing` (of which `haskell` and `as` are, since keiro-dsl `b31896cf`, also the field-alias markers on aggregate and contract fields — see Section 4), the two values of the explicit id admission domain clause, `typeid-v5-or-v7` and `typeid-v7` (keiro-dsl `6b89cb51`; fixed enumerated clause values exactly as `reject` and `live-only` are, and being dashed they must be matched before bare words — here the bare prefix that must be guarded is the **primitive type** `typeid`, the first word outside the clause vocabulary ever to need it, and the digits inside `typeid-v5-or-v7` are kept out of the Number class by rule ordering rather than by construction — see Section 4), and the nominal-binding clause word `using` (which attaches a consumer binding block to an `id` or `enum` declaration — see Section 4), the transition clause word `implementation` (of `implementation hole`; its second word `hole` is a Language constant, one row down), the shape word `value` of a bare container mapping (`mapped structural value X`, keiro-dsl `a6110a94`) — which stays here, and does **not** join `record` and `union` in the Modifier row, because the same word is the older workflow-signal clause label `signal … value <Type>` and one word gets one class; see Section 4 — and the two scalar-expression roots `reg` and `cmd` — which, uniquely in this table, are matched **only when the next character is a `.`**, so `reg.balance` is a keyword and the wire word in `id CommandId prefix=cmd` is not (see Section 4), the Language 5 and 6 vocabulary of Section 4's last subsection except the words the Modifier, Primitive-type, and introducer rows claim — among them the projection-catalog labels (`reset`, `targets`, `order`, `promotion`, `delivery`, `replay`, `depends-on`, `schema-version`, `checkpoint-on-missing`, …), `freshness`, `backing`, `domain-outcomes`, `rejection`, the reaction words `reactions`, `when`, `otherwise`, `cancel`, `timers`, the declarative-selection labels `identity`, `with`, `where`, `recipient`, `empty`, `failure`, `redelivery`, `max-recipients`, and `idempotence`, plus their enumerated values (`clear`, `preserve`, `all`, `explicit`, `live-only`, `immediate`, `wait-for-head`, `fifo-heads`, `delegated`, `accepted`, `no-op`, `no-action`, `ack`, …), ... | `keyword.control.keiro` | `Statement` |
| Modifier | `deprecated`, `retiring` (the two mutually exclusive event prefixes — see Section 3), `upcast`, `from`, `consistency`, `required`, `stable`, `strategy`, `via`, `policy`, `prefix`, `kind`, `domain` (the explicit id admission domain clause label, written beside `prefix` on the same `id` declaration and in the same `label=value` shape — keiro-dsl `6b89cb51`; it heads the older dashed Control value `domain-outcomes`, so Vim matches it with a `-\@!` guard, as it does `from`), the mapped-type words `structural`, `opaque`, `nominal`, `refined` (the fourth family, of a checked byte refinement `mapped refined X { … wire base16-bytes }` — keiro-dsl `e548fffd`; it selects a family exactly as the three beside it do and, unlike `value`, has no second role anywhere in the language), `record`, `union` (which select the family and shape of a `mapped` declaration — but **not** the fourth shape word `value`, which stays a Control keyword one row up for the reason given there) and `optional` (`required`'s partner on a wire field — see Section 4), the dashed `replay-only` (the transition prefix — see Section 4; being dashed it must be matched before bare words), and the Language 5/6 words `once` (qualifies a reaction `schedule`), `silent` (qualifies `no-action`), and `declarative` (selects a `resolve` form, like `stable`). `from` heads the dashed Control values `from-beginning` / `from-current-head`, so Vim matches it with a `-\@!` guard | `storage.modifier.keiro` | `StorageClass` |
| Language constant | `true`, `false`, `null` (the `on-missing=null` sentinel — see Section 4), `HOLE`, `placeholder`, `skip`, `hole` (three parser sites: a contract emitter's `derive "…" hole`, a router's `resolve … hole`, and — since keiro-dsl `8b0f55b` — the second word of a transition's `implementation hole` clause, whose first word is a Control keyword one row up) | `constant.language.keiro` (give `true` / `false` the more specific `constant.language.boolean.keiro`; `null` takes the general scope) | `Boolean` for `true` / `false`, else `Constant` |
| Primitive type | `Bool`, `Int`, `Integer` (a distinct spelling from `Int`, not an alias — keiro-dsl `8b0f55b`), `Text`, `Time`, `Id`, `Maybe`, `typeid` (which, since keiro-dsl `6b89cb51`, is also the leading segment of the two dashed Control values `typeid-v5-or-v7` and `typeid-v7`, making it the only word in this row that must be matched **after** the dashed rules — in Vim that means a `syntax match … /\<typeid\>-\@!/` rather than a `syntax keyword`, because a keyword outranks a match at the same column; the bare uses, as in `incidentId: typeid "inc"`, must keep this class afterwards), `text`, `int`, `bool` (the third lowercase legacy workqueue payload type — keiro-dsl `9fb54d56` range), and the mapped-type spellings `Natural`, `UTCTime` (an alias for `Time`), `Day` (a calendar date with no time-of-day part and no time zone, distinct from `Time`, which is an instant — keiro-dsl `6b92bd52`; unlike `Time` it has no alias), `Set` (only ever written as the two-word `Set Text`, an unordered collection of text values with no duplicates, distinct from the ordered `List Text` — keiro-dsl `01ba6c58`; the parser admits no other element type after `Set`, but both packages match the word with an ordinary one-word rule, exactly as they match every other spelling in this row), `Json`, `Optional`, `List`, `Map` (see Section 4 — `Map` capitalized is a type, the reserved lowercase `map` is a control keyword, and both packages match case-sensitively). These are matched **unconditionally, everywhere**, not only inside a `mapped` declaration: since keiro-dsl `da09736` the same type grammar is also an aggregate register's and an aggregate command/event field's type slot (Section 4). **This row is the only place the type vocabulary is recorded.** No primitive spelling is in the parser's `reservedWords` and none is a contextual clause word, so none appears in Section 3 or Section 4 — and the mechanical word-count guards in both packages' test suites, which read only those two sections, cannot notice a type spelling arriving or going missing. Named assertions over the corpus are the only protection a type spelling has — and a new spelling can also **recolour text in corpus files the upstream range never touched**, because these rules match everywhere: `Set` (keiro-dsl `01ba6c58`) is the head of `Settle`, `Settled`, `SettleEntry`, `TicketSettled`, and `EntrySettled`, which have been in three corpus files since long before it arrived. Grep the whole corpus for a new spelling as a *substring* before adding it, and pin whatever that grep finds | `support.type.keiro` | `Type` |
| Declaration-site type name | a CamelCase plain identifier appearing immediately after a declaration introducer that names a type (`enum X`, `aggregate X`, `contract X`, `command X`, `event X`, `id X`, `workflow X`, `operation X`, `process X`) or immediately after a `mapped` declaration's family or shape word (`record X`, `union X`, `opaque X`, `nominal X`, since keiro-dsl `a6110a94` the bare-container shape `value X`, and since keiro-dsl `e548fffd` the refined-byte-policy family `refined X`; `mapped structural enum X` is already covered by the `enum X` case). Being lexical, `value X` also claims the type named by a workflow signal operation's trailing `value <Type>` clause, which is a use site rather than a declaration site but does name a type (see Section 4). Note the "CamelCase" requirement is load-bearing for `value X` and for that reason alone: `value` is a common wire field name, and a name slot accepting any identifier would claim the `as` of `value as "value" : Text required` | `entity.name.type.keiro` | `Type` |
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
