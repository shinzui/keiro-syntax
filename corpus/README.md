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

## Rules for consumers

These files are **read-only inputs**. The Vim and Shiki packages must **not** edit them;
each package adds its own per-package expectation fixtures that point at these files. If a
corpus file must change, the change is owned by the shared-language-model plan
(`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md`), and both packages
re-validate against the updated corpus.
