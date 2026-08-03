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
  default value shape, and nine of the ten spellings the wire type slot accepts — including
  `Natural`, `Json`, `Optional`, `List`, and `Map`. The `aggregate` beneath the declarations
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

## Rules for consumers

These files are **read-only inputs**. The Vim and Shiki packages must **not** edit them;
each package adds its own per-package expectation fixtures that point at these files. If a
corpus file must change, the change is owned by the shared-language-model plan
(`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md`), and both packages
re-validate against the updated corpus.
