# keiro-dsl shared test corpus

The `.keiro` files in this directory are the **shared test corpus** consumed by both
highlighting packages in this repository (`packages/keiro-vim/` and
`packages/shiki-keiro/`). Each package loads these files in its automated tests and asserts
that specific tokens receive specific classifications, per the taxonomy in
`spec/keiro-dsl-language-model.md`.

## Provenance

The following files were copied **verbatim** from the keiro project's DSL test fixtures at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/`. The first five were copied
on 2026-06-10:

- `reservation.keiro` — an `aggregate` with `regs`, `states`, `command`/`event`, `wire`,
  and a `status-map`.
- `hospital-surge.keiro` — a `process` with a `timer` (`fireAt ... + 5m`) and dispositions.
- `emit.keiro` — a `contract` with `emit` and a `publisher`.
- `intake.keiro` — an `intake` declaration.
- `workflow-signal-mismatch.keiro` — a `workflow` with an `operation`, `step`, and
  `await`/`signal`.

Together these exercise every top-level node type and every lexical feature of keiro-dsl
**except comments**, which the upstream fixtures omit.

Copied later, as the parser's lexical surface grew:

- `reservation-guard-tightened-twin.keiro` — copied on 2026-07-23 at keiro-dsl commit
  `6c2c8fc623b0c3436a57c828a101fd20fbc3d91e`. It is `reservation.keiro` with the
  `Unrequested -- RequestTransferReservation -->` guard tightened and a **`replay-only`**
  twin transition covering the region the tightened guard removed. It is the corpus's only
  sample of the `replay-only` transition prefix, and it backs the reconciliation recorded in
  `docs/plans/5-highlight-the-replay-only-transition-marker.md`.
- `reservation-retiring.keiro` — copied on 2026-07-23 at keiro-dsl commit
  `451acf2188005211c2d2fe81835e6bff0a4c0580`. It is `reservation.keiro` with
  `TransferReservationConfirmed` declared as a **`retiring` event** while it still keeps a
  live emitting transition. It is the corpus's only sample of the `retiring` event prefix.
- `reservation-deprecated-replay-only.keiro` — copied on 2026-07-23 at the same keiro-dsl
  commit. It is the other end of the same retirement lifecycle: the identical event declared
  **`deprecated`**, with its emitting transition marked `replay-only`. It is the corpus's only
  sample of the `deprecated` event prefix. Both files back the reconciliation recorded in
  `docs/plans/6-highlight-the-retiring-event-marker.md`.
- `consumer-mapped-types.keiro` — copied on 2026-07-29 at keiro-dsl commit
  `430c3d2cca0f491697d7e67a85362b78718a50be`, from that commit's
  `keiro-dsl/test/fixtures/consumer-types.keiro`. It is the corpus's sample of the
  **consumer-owned mapped type declaration**: all four declaration forms
  (`mapped structural record` / `enum` / `union` and `mapped opaque`), every `on-missing`
  default value shape, and nine of the ten literal spellings the wire type slot accepted at that
  commit — including `Natural`, `Json`, `Optional`, `List`, and `Map`. (The slot has since gained
  an eleventh, `Day`, covered by `mapped-calendar-days.keiro` below.) The `aggregate` beneath the declarations
  consumes the mapped types, so both suites can also check that a mapped declaration leaves
  the rest of the file tokenizing normally. It backs the reconciliation recorded in
  `docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md`.
- `consumer-nominal-bindings.keiro` — copied on 2026-07-31 at keiro-dsl commit
  `fcd67482d33712b1a07675039049eb00322583bb`, from that commit's
  `keiro-dsl/test/fixtures/nominal-scalars.keiro`. It is the corpus's sample of the
  **consumer-owned nominal binding**, the third `mapped` family: five `mapped nominal X : R`
  declarations covering the representations `Text`, `Int`, `Natural`, `Bool`, and `Time`, plus
  the two `using { … }` forms that attach the same binding block to an existing `id` and
  `enum` declaration. It is also the corpus's only sample of a `language keiro-dsl 2`
  preamble, which the nominal syntax requires, and of a declaration whose body continues after
  a closing brace (`enum OrderStatus { … } using {`). The `aggregate NominalLedger` beneath the
  declarations consumes all seven declared types in its `regs`, `command`, `event`, and
  transition, so both suites can also check that a nominal declaration leaves the rest of the
  file tokenizing normally. It backs the reconciliation recorded in
  `docs/plans/11-highlight-consumer-owned-nominal-bindings-mapped-nominal-and-using.md`.
  Note that it is pinned to `fcd6748` and deliberately **not** refreshed: keiro-dsl commit
  `8b0f55b` rewrote this fixture's transition body into a single `implementation hole` clause,
  which would delete the only `guard`, `write`, and `:=` tokens in the file and with them six
  assertions across the two suites. The `implementation hole` clause is covered instead by
  `transition-implementation-hole.keiro` below.
- `aggregate-scalar-expressions.keiro` — copied on 2026-07-31 at keiro-dsl commit
  `8b0f55b530b416f60556c5eaf9bbf84ff9c6ffb9`, from that commit's
  `keiro-dsl/test/fixtures/aggregate-scalar-expressions-v2.keiro`. It is the corpus's sample of
  the **scalar expression sublanguage** that commit gave to version-2 aggregate transitions: a
  `regs` block declaring the new `Integer` type spelling beside `Natural`, `Text`, `Bool`, and
  `Time`, and one transition whose `guard` and `write` clauses use the `reg.` and `cmd.` roots,
  all three arithmetic operators (`+`, `-`, `*`), a parenthesised subexpression, a negative
  integral operand (`-100`), and a boolean comparison. It is upstream's authoritative fixture
  for the feature — its own suite parses it, validates it, and asserts it round-trips through
  the pretty-printer — so a verbatim copy proves both packages tokenize the real text. It backs
  the reconciliation recorded in
  `docs/plans/12-highlight-the-typed-scalar-expression-language-implementation-hole-integer-reg-cmd-roots-and-arithmetic.md`.
- `language-identifier-collisions.keiro` — copied on 2026-08-01 at keiro-dsl commit
  `9ea8f8541da57c26d7317d120457240d7a634225`, from that commit's
  `keiro-dsl/test/fixtures/language-identifier-v1.keiro`. It contains **no token this corpus
  did not already have**; what it contributes is a legal source in which the five spellings
  that collide with version-2 syntax all appear as ordinary *data*: the context wire word
  `language-collisions`, an `id UsingId`, an `enum Integer`, wire keys spelled
  `"implementation hole"` and `"cmd. using Integer implementation hole"`, a register named
  `language` on its own line whose initial value is the string
  `"using Integer implementation hole reg. cmd."`, and command fields named `using`,
  `implementation`, `reg`, and `cmd`. Such a file could not exist before that commit: the
  parser's `ensureBodyFeatures` pre-scan rejected a version-1 source that merely *contained*
  any of those spellings on a non-comment line, and any line whose first word was `language`
  was read as a misplaced version preamble. That commit deleted the pre-scan and moved every
  check into the grammar production that owns the syntax. Both suites use the file for the
  cases only it can express — that `reg` and `cmd` stay plain in a field list because no `.`
  follows them, and that a string full of keywords stays one String — and it backs the
  reconciliation recorded in
  `docs/plans/13-reconcile-the-language-version-gating-notes-with-grammar-context-parsing.md`.
  Its version-2 twin, `keiro-dsl/test/fixtures/language-identifier-v2.keiro`, is deliberately
  not copied: the two differ only by a `language keiro-dsl 2` preamble line, and the corpus
  already has two preamble samples.
- `consumer-mapped-bare-containers.keiro` — copied on 2026-09-19 at keiro-dsl commit
  `a6110a94e66dab3cbe4b8b8eb0fbac70652f8ccb`, from that commit's
  `keiro-dsl/test/fixtures/bare-containers.keiro`. It is the corpus's sample of the **bare
  container mapping**, the fourth shape of a `mapped structural` declaration: instead of a braced
  `wire … { … }` block it writes its encoding as one unbraced `wire <Type>` line, because the
  declared Haskell type *is* a container. The file carries all four forms that line takes —
  `wire Optional Text`, `wire List Text`, `wire Map Text`, and the nested, parenthesised
  `wire List (Optional ItemId)` — plus a `mapped structural record` that consumes the four bare
  types as wire fields with their `on-missing=null` / `[]` / `{}` defaults. Beneath the
  declarations it consumes them again in an `aggregate`, a `workqueue`, a `target` /
  `rebuild-group` / `projection-owner` projection catalog, and a `readmodel` whose
  `query result = List TextList` is the corpus's only type expression in that slot, so both suites
  can check that the new shape leaves the rest of the file tokenizing normally. It is upstream's
  authoritative fixture for the feature — `keiro-dsl/test/Main.hs` parses it with
  `checkedServiceFromText`, round-trips it through the pretty-printer, scaffolds from it, and
  asserts that the same text under a `language keiro-dsl 5` preamble is refused — so a verbatim
  copy proves both packages tokenize text that really is valid keiro-dsl. The shape needed no new
  matching rule in either package (`value` and `wire` were both already keywords); what it needed
  was the **Declaration-site type name** refinement, which now recognizes `value X` as it already
  recognized `record X`. It backs the reconciliation recorded in
  `docs/plans/18-record-the-keiro-dsl-bare-container-mapping-shape-mapped-structural-value-and-cover-it-in-the-corpus.md`.
- `mapped-calendar-days.keiro` — copied on 2026-09-19 at keiro-dsl commit
  `6b92bd52348a763311bcc5a7ddc847e6ef4e4406`, from that commit's
  `keiro-dsl/test/fixtures/calendar-days.keiro`. It is the corpus's sample of the **calendar day
  type**, the newest spelling of the mapped type expression: `Day`, a date with no time-of-day part
  and no time zone, and so a different type from the older `Time`, which is an instant. Unlike
  `Time` it has no alias. The file puts the spelling in every position the grammar admits — the
  bare `wire Day` line of a `mapped structural value`, `wire Optional Day`, and as a required wire
  field, an `Optional` wire field, a `List` wire field, and a `Map` wire field of a
  `mapped structural record` — and beneath the declarations consumes the declared types again in an
  `aggregate`, a `workqueue` with typed payload fields, a `target` / `rebuild-group` /
  `projection-owner` projection catalog, and a `readmodel`, so both suites can check that the new
  spelling leaves the rest of the file tokenizing normally. It is also the corpus's only file in
  which a primitive type spelling is a **substring of three identifiers on the same lines** —
  `LocalDay`, `MaybeLocalDay`, and the field name `optionalDay` — which is where both suites pin
  that the type rules match whole words and match case-sensitively. It is upstream's authoritative
  fixture for the feature — `keiro-dsl/test/Main.hs` reads it with `readTestText`, parses it with
  `checkedServiceFromText`, registers it in the conformance fixture list, and asserts that the same
  text under a `language keiro-dsl 5` preamble is refused — so a verbatim copy proves both packages
  tokenize text that really is valid keiro-dsl. It backs the reconciliation recorded in
  `docs/plans/19-highlight-the-keiro-dsl-day-calendar-type-spelling-in-the-mapped-type-expression.md`.
- `mapped-text-sets.keiro` — copied on 2026-09-20 at keiro-dsl commit
  `01ba6c58f418010c1e2c0edd415f776079deecc1`, from that commit's
  `keiro-dsl/test/fixtures/structural-text-sets.keiro`. It is the corpus's sample of the
  **structural text set**, the newest spelling of the mapped type expression: `Set Text`, an
  unordered collection of text values with no duplicates, and so a different type from the ordered
  `List Text`. It is the language's only two-word type spelling, and the second word is fixed —
  the parser reads `Set` and then requires `Text`, so there is no `Set Natural` and no bare `Set`.
  The file puts the spelling in every position the grammar admits — the bare `wire Set Text` line
  of a `mapped structural value`, `wire Optional (Set Text)`, and as a required wire field, an
  `Optional` wire field, a `List` wire field, and a `Map` wire field of a
  `mapped structural record` — and beneath the declarations consumes the declared types again in an
  `aggregate` with a `replay-only` transition, a `workqueue` with typed payload fields, a `target` /
  `rebuild-group` / `projection-owner` projection catalog, and a `readmodel`, so both suites can
  check that the new spelling leaves the rest of the file tokenizing normally. It is also the
  corpus's only file in which a primitive type spelling appears in the **interior of an unquoted
  Haskell module path** — `module=Conformance.StructuralTextSets.Domain` — which both suites pin
  alongside the older files that hold the *prefix* collision this spelling has and no earlier one
  did (`Settle`, `Settled`, `SettleEntry`, `TicketSettled`, `EntrySettled`, in
  `transition-implementation-hole.keiro`, `language-version-3.keiro`, and
  `language-version-4.keiro`). It is upstream's authoritative fixture for the feature —
  `keiro-dsl/test/Main.hs` reads it with `readTestText`, parses it with `checkedServiceFromText`,
  registers it in the conformance fixture manifest, scaffolds generated modules from it, and
  asserts that the same text under a `language keiro-dsl 5` preamble is refused — so a verbatim
  copy proves both packages tokenize text that really is valid keiro-dsl. It backs the
  reconciliation recorded in
  `docs/plans/20-highlight-the-keiro-dsl-set-text-structural-text-set-type-spelling.md`.
- `mapped-refined-base16.keiro` — copied on 2026-09-20 at keiro-dsl commit
  `e548fffd21f385321c7d5e42c1cbb020243c1e2b`, from that commit's
  `keiro-dsl/test/fixtures/refined-base16.keiro`. It is the corpus's sample of the **checked base16
  byte refinement**, the fourth family of the `mapped` declaration: `mapped refined X { … wire
  base16-bytes }`, in which keiro itself owns admission and canonicalization of the value — which
  byte strings are accepted and how they are written back out — while the consumer supplies only the
  Haskell binding. It is the corpus's only sample of that family, and the only file in which the two
  words keiro-dsl `e548fffd` added appear at all: the bare family word `refined` and the dashed wire
  policy `base16-bytes`, the one policy the grammar admits. Every other clause label in the block
  (`haskell`, `binding`, `binding-version`, `canonical-type`, `fixtures`, `initial`) is borrowed from
  the three older families, so the two new words are the whole of the new surface. Beneath the
  declarations the file consumes the declared types again in a `mapped structural value`, a
  `mapped structural record`, an `aggregate` with a `replay-only` transition and a `snapshot`
  block, a `workqueue` with typed payload fields and a `disposition` table, a `target` /
  `rebuild-group` / `projection-owner` projection catalog, and a `readmodel`, so both suites can
  check that the new family leaves the rest of the file tokenizing normally. It is also where both
  suites pin the three collisions the two new words bring with them, all of them inside this one
  file: the **unquoted** Haskell module path `module=Conformance.RefinedBase16.Domain`, where the
  capitalised `Refined` and `Base16` must stay plain because both packages match case-sensitively;
  the **quoted** `shape-hash="refined-base16-v1"`, the corpus's only place where a keyword spelling
  sits inside a string that is not a comment, where the string rule must win; and the context name
  `context refined-base16`, whose first segment both packages *do* colour — `-` is not a word
  character in either engine — exactly as they colour `structural` inside
  `context structural-text-sets`. It is upstream's authoritative fixture for the feature —
  `keiro-dsl/test/Main.hs` reads it with `readTestText`, parses it with `checkedServiceFromText`,
  round-trips it through the pretty-printer, scaffolds generated modules from it, asserts the
  runtime profile carries `RefinedBase16Mappings`, and asserts that the same text under a
  `language keiro-dsl 5` preamble is refused — so a verbatim copy proves both packages tokenize text
  that really is valid keiro-dsl. It backs the reconciliation recorded in
  `docs/plans/21-highlight-the-keiro-dsl-mapped-refined-declaration-family-and-its-base16-bytes-wire-policy.md`.
- `id-admission-domains.keiro` — copied on 2026-09-20 at keiro-dsl commit
  `6b89cb5173c4aa5e73598c2ca41437d9fd07a6df`, from that commit's
  `keiro-dsl/test/fixtures/id-admission-domains.keiro`. It is the corpus's sample of the **explicit
  id admission domain**: the optional trailing clause on an `id` declaration, written
  `id LegacyId prefix=legacy domain=typeid-v5-or-v7`, which names in the source text which canonical
  identifier values the declared type admits. It is the corpus's only sample of that clause, and the
  only file in which two of the three words keiro-dsl `6b89cb51` added appear at all: the bare clause
  label `domain` and the dashed value `typeid-v5-or-v7`. (The third, the explicit default
  `typeid-v7`, appears only in `language-version-6-reactions-and-selection.keiro` below, because
  upstream's fixture never writes it — omitting the clause means the same thing.) Beneath the
  declaration the file consumes the declared id again as a direct wire field, as an `Optional`, and
  as a `Map[LegacyId]` key inside a `mapped structural record`, then in an `aggregate IdentityLedger`
  with a `replay-only` transition, a `workqueue` with typed payload fields and a `disposition` table,
  and a `contract identities` with a declared id in an event field, so both suites can check that the
  new clause leaves the rest of the file tokenizing normally. It is also where both suites pin the
  three collisions the new words bring with them. Two are prefix collisions: `domain` is the head of
  the older dashed `domain-outcomes`, and `typeid` — the lowercase legacy workqueue payload *type* —
  is the head of both new values, which makes it the first word in Section 6's Primitive-type row
  ever to need the match-before-bare-words treatment. The third is the digits: the `v5` and `v7`
  inside `typeid-v5-or-v7` really are preceded by a word boundary, unlike the `1` of `base16`, so
  only rule ordering keeps the version-number rules of both packages out of them. The file's context
  name, `context id-admission-domains`, is a fourth thing worth knowing about rather than a
  collision: its first segment `id` is coloured as a declaration introducer because a dash is not a
  word character in either engine, exactly as `refined` is coloured inside `context refined-base16`.
  It is upstream's authoritative fixture for the feature — `keiro-dsl/test/conformance-baseline.json`
  registers it as the `source` of the compiled conformance suite
  `keiro-dsl-conformance-id-admission-domains`, and `keiro-dsl/test/Main.hs` names it among the
  fixtures deliberately kept outside published Language 4 — so a verbatim copy proves both packages
  tokenize text that really is valid keiro-dsl. It backs the reconciliation recorded in
  `docs/plans/22-highlight-the-keiro-dsl-explicit-id-admission-domain-clause-and-its-typeid-v5-or-v7-and-typeid-v7-values.md`.

The remaining files are **hand-written for this repository**:

- `comments-and-literals.keiro` — authored here to exercise `#` line comments and every
  literal form (strings, plain integers, `v2`-style versions, `5m`-style durations) so both
  packages have something to assert comment / number / string highlighting against.
- `router-readmodel-snapshot.keiro` — authored here (2026-07-15) to exercise the lexical
  surface added since the initial corpus: the `module`/`layout` header, an aggregate
  `snapshot` block, a `readmodel` node (`columns`/`feed`/`scope`/`shape`), a `router`
  (`resolve stable via read-model …`, `dispatch-each`), a `workqueue` with provisioning
  vocabulary, a `workflow` with `patch`/`continueAsNew`, string escape sequences
  (`"…\n…"`), and signed (`-1`) / fractional (`1.5`) numeric literals. It backs the
  reconciliation recorded in
  `docs/plans/4-reconcile-highlighters-with-keiro-dsl-lexical-surface-20-new-reserved-words-string-escapes-signed-decimal-numbers.md`.
- `mapped-type-spellings.keiro` — authored here (2026-07-29) to cover the two mapped-type
  spellings that no *single* upstream fixture exercises together: the
  `unknown-fields=ignore` policy (only `keiro-dsl/test/fixtures/structural-conformance.keiro`
  has it, and that file drops `Natural`, `Json`, and `Map`) and the `UTCTime` alias for
  `Time`, which appears in no upstream fixture at all even though the parser accepts it
  (`pMappedTypeExpr`: `TTime <$ (keyword "Time" <|> keyword "UTCTime")`). Its leading comment
  deliberately contains mapped-type keywords so both suites can confirm a comment still wins
  over the words inside it. It backs the same reconciliation as
  `consumer-mapped-types.keiro`.
- `aggregate-scalar-types.keiro` — authored here (2026-07-31) to exercise the two type slots
  keiro-dsl commit `da09736` widened from a bare identifier to the whole `pMappedTypeExpr`
  grammar: an **aggregate register's** type (`regs observedAt Time = "…"`) and an **aggregate
  command/event field's** type (`command Record { observedAt:Time revision:Natural }`). Its
  first aggregate covers the spellings an aggregate may actually carry — `Time`, `Natural`,
  `Int`, `Bool`, `Text`, `UTCTime`, and a reference to the `mapped` type declared above it —
  plus a bare (untyped) field and the register initializer forms. Its second aggregate,
  `ProbeLedger`, covers the shapes that *parse* in those slots and are then rejected by a
  later semantic pass — `Optional(Text)`, `List(Text)`, `Map(Text)`, `Json`, and a fractional
  register initializer `-1.5` — because an editor must tokenize a file while its author is
  still fixing the diagnostic. No single upstream fixture spans that surface: keiro-dsl's
  `aggregate-scalars.keiro` omits the constructors, `UTCTime`, and the fractional
  initializer, and `aggregate-scalars-invalid-capabilities.keiro` omits `UTCTime` and the
  mapped-type reference. It backs the reconciliation recorded in
  `docs/plans/9-reconcile-the-widened-aggregate-type-slots-and-fractional-register-initials.md`.
- `language-preamble.keiro` — authored here (2026-07-31) to exercise the **optional version
  preamble** keiro-dsl commit `4523b52` added above `context`: `language keiro-dsl 1`. It is
  hand-written because no upstream fixture uses the preamble at all — every versioned source
  in that commit is an inline string literal in `keiro-dsl/test/Main.hs`. The file
  deliberately puts a comment banner *above* the preamble, because the parser strips comments
  and blank lines before deciding which line is first, so a highlighter must not anchor the
  clause to line 1. It also declares a command field named `language`, since the word is not
  reserved and stays legal as an identifier mid-line — a highlighter colours it as a keyword
  regardless, which is Section 1 of `spec/keiro-dsl-language-model.md` working as designed.
  The `context`/`module`/`layout` header and the small `aggregate` beneath let both suites
  confirm a preamble leaves the rest of the file tokenizing normally. It backs the
  reconciliation recorded in
  `docs/plans/10-highlight-the-language-keiro-dsl-version-preamble.md`.
- `transition-implementation-hole.keiro` — authored here (2026-07-31) to cover the parts of
  keiro-dsl commit `8b0f55b`'s scalar surface that no *single* upstream fixture holds together:
  the **`implementation hole` transition clause**, which hands one transition's behaviour to
  consumer-written Haskell, and the two scalar **literal shapes** that appear in no upstream
  fixture at all — a qualified enum literal (`reg.status == TicketStatus.Open`) and an id
  literal (`reg.ticketId == TicketId("tkt_01h4…")`). Upstream's only fixture containing
  `implementation hole` is `nominal-scalars.keiro`, already copied here at an earlier commit as
  `consumer-nominal-bindings.keiro` and pinned there (see the note on that file above). The
  file also carries a second, ordinary generated transition so both suites can check that the
  hole clause leaves the rest of the aggregate tokenizing normally, and a leading comment that
  names the new keywords so the comment-wins check has something to bite on. It backs the same
  reconciliation as `aggregate-scalar-expressions.keiro`.
- `language-version-3.keiro` — authored here (2026-08-01) to exercise the **third released
  language version** keiro-dsl commit `e41e989` added: `language keiro-dsl 3`. It is
  hand-written for the same reason `language-preamble.keiro` is — no upstream fixture uses the
  preamble; upstream's version-3 test builds its source by string-substituting the preamble line
  of a version-2 fixture. Its value is that it is the corpus's **third distinct version
  number**: before it, every preamble here read `1` or `2`, so a highlighter that special-cased
  those two digits would have passed every assertion, even though Section 1 of
  `spec/keiro-dsl-language-model.md` has always claimed the version is an ordinary Number
  whatever its value. Unlike `language-preamble.keiro` it puts the preamble on line 1 with the
  comment banner *below* it, because both suites anchor on the first occurrence of a literal and
  a `3` in a banner would shadow the version under test. The body is deliberately ordinary
  version-2 surface — a `mapped nominal` binding, an `id … using { … }` block, and a transition
  using the scalar roots `reg.` and `cmd.` with `Integer` — because version 3 binds the *same*
  body grammar as version 2 (`LanguageBodyParserV2`) and so adds no spelling of its own; the
  suites assert it colours exactly as the same surface does under a `2`. Its `id` prefix is
  spelled to satisfy version 3's new TypeID prefix rule, which is a semantic check no
  highlighter models, so that pasting the file into `keiro check` is not a trap. It backs the
  reconciliation recorded in
  `docs/plans/14-record-keiro-dsl-language-version-3-and-prove-the-preamble-version-stays-an-ordinary-number.md`.
- `language-version-4.keiro` — authored here (2026-08-02) to exercise the **fourth released
  language version**, which keiro-dsl commit `b49b11f` designated the one **stable** contract
  while marking versions 1 through 3 compatibility-only: `language keiro-dsl 4`. It is
  hand-written for the same reasons `language-version-3.keiro` is, and it earns its place twice
  over. First, it is the corpus's **fourth distinct version number**, and the one that matters
  most in practice: the same upstream commit changed `Keiro/Dsl/Skeleton.hs` so that every
  starter file `keiro new <kind>` writes now opens `language keiro-dsl 4`, so this is the
  preamble an editor will meet most often. Like `language-version-3.keiro` it puts the preamble
  on line 1 with the comment banner *below* it, because both suites anchor on the first
  occurrence of a literal and a `4` in a banner would shadow the version under test. Second, its
  body is shaped after upstream's freshly **migrated** fixtures rather than after the minimal
  starter: keiro-dsl commits `bce4b35` and `cd22e7f` moved 225 fixtures onto version 4 and in the
  process deleted each aggregate's hand-maintained state-vertex register and qualified every
  transition operand — `guard divertStatus != TotalDivert` became
  `guard cmd.divertStatus != DivertStatus.TotalDivert`. The **qualified enum member** in that
  shape (here `EntryStatus.Active`) had appeared in this corpus only once, in
  `transition-implementation-hole.keiro` as `TicketStatus.Open`, and was asserted by neither
  suite; this file is where both suites pin it. Version 4 binds the *same* body grammar and
  syntax profile as versions 2 and 3, so it adds no spelling of its own and the suites assert the
  body colours exactly as the same surface does under a `2` or a `3`. Its `id` prefix satisfies
  the TypeID prefix rule and its state names avoid its enum's member names, so pasting the file
  into `keiro check` is not a trap. It backs the reconciliation recorded in
  `docs/plans/15-record-keiro-dsl-language-version-4-as-the-stable-contract-and-cover-a-version-4-preamble-in-the-corpus.md`.
- `field-aliases.keiro` — authored here (2026-08-05) to exercise the **field aliases**
  keiro-dsl commit `b31896cf` added to language version 4 (the first feature of the new
  syntax profile 3): an optional `haskell <selector>` and `as "<wire-key>"` between a
  field's name and its type, legal on an aggregate command/event field and on a contract
  event field. It is hand-written because no single upstream fixture spans both homes —
  `keiro-dsl/test/fixtures/aggregate-field-alias.keiro` has the aggregate side only, and
  the alias-carrying contract fields live in `keiro-dsl/test/fixtures/contract.keiro` and
  its siblings, which have no aggregate. The alias spellings themselves are copied from
  those fixtures, including the two vocabulary collisions upstream leans on deliberately:
  an aliased command field *named* `type` (`type haskell payloadType:Text`) and a field
  literally named `as` (`as:Text`) — both ordinary identifiers to the parser, both coloured
  as keywords by Section 1 of `spec/keiro-dsl-language-model.md` working as designed. The
  markers add no new word — `haskell` and `as` have been curated contextual keywords since
  the mapped type declaration — so neither package needed a rule change; this file is where
  both suites prove the markers colour as control keywords in the new positions, the
  selector identifier stays plain, and the wire key stays a String. Its fields are ordered
  so the file's first bare `as` is the alias marker, which the Shiki suite's first-match
  helper depends on. It backs the reconciliation recorded in
  `docs/plans/16-record-the-keiro-dsl-field-alias-syntax-haskell-as-on-aggregate-and-contract-fields-and-cover-it-in-the-corpus.md`.
- `language-version-5-projection-catalog.keiro` — authored here (2026-09-18) to exercise the
  **Language 5** surface of the keiro-dsl range `d7be0fe6..9fb54d56` (keiro-dsl 0.17.0.0), under
  which version 5 became the stable contract: the five projection-catalog declarations
  (`target`, `rebuild-group`, `projection-revision` with all three `promotion` kinds,
  `projection-owner` with both `delivery` values, `checkpoint-on-missing`, and both `replay`
  forms), a `readmodel` with `query input`/`query result`, `freshness = immediate` and
  `wait-for-head entire-log`, and `backing`, an `external-read` contract, a workqueue with typed
  `:` payload fields and the lowercase `bool` type, and an aggregate with `domain-outcomes` and
  all three `outcome` clauses. Its constructs are shaped after upstream's
  `projection-catalog.keiro` and `domain-command-outcomes.keiro` fixtures, condensed into one
  file that passes `keiro-dsl check` at 0.17.0.0. Its comment banner sits at the **end** of the
  file so both suites' first-match anchors land on code.
- `language-version-6-reactions-and-selection.keiro` — authored here (2026-09-18) for the
  **Language 6** (candidate) surface of the same range: a `process` using `reactions version 1`
  with guarded `when`/`otherwise` arms, an `accepted … silent no-action` block, `schedule … once`,
  `cancel`, `no-action`, `timers max-attempts …`, and per-timer blocks; a `router` with a typed
  `:` input and `resolve declarative { … }`; `idempotence delegated` on an intake; `ordering
  fifo-heads` on a workqueue; an identifier-keyed `Map[TemplateId] Text`; and a declared id type
  in a contract field. It is shaped after upstream's `process-timers.keiro`,
  `structural-nominal-leaves.keiro`, `intake-delegated.keiro`, and `workqueue-fifo-heads.keiro`
  fixtures, and passes `keiro-dsl check` at 0.17.0.0 with warnings only. Both files back the
  reconciliation recorded in
  `docs/plans/17-highlight-the-keiro-dsl-language-5-and-6-surface-projection-catalog-process-reactions-declarative-router-selection-and-domain-outcomes.md`.
  On 2026-09-20 its `id TemplateId` declaration gained one more token, ` domain=typeid-v7`, so the
  corpus carries the **explicit default spelling** of the id admission domain clause keiro-dsl
  `6b89cb51` added (see `id-admission-domains.keiro` above, which writes only the other value).
  The extension is semantically inert and does not change what the file is a sample of: the parser
  stores the same `TypeIdV7` whether the clause is written or omitted, and `docId` in
  `keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs` prints nothing for `TypeIdV7`, so the explicit spelling
  round-trips back to the implicit one. This file was chosen for it because the clause requires
  `language keiro-dsl 6`, which it already declares. It backs the reconciliation recorded in
  `docs/plans/22-highlight-the-keiro-dsl-explicit-id-admission-domain-clause-and-its-typeid-v5-or-v7-and-typeid-v7-values.md`.

## Rules for consumers

These files are **read-only inputs**. The Vim and Shiki packages must **not** edit them;
each package adds its own per-package expectation fixtures that point at these files. If a
corpus file must change, the change is owned by the shared-language-model plan
(`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md`), and both packages
re-validate against the updated corpus.
