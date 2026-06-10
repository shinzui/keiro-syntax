# keiro-dsl shared test corpus

The `.keiro` files in this directory are the **shared test corpus** consumed by both
highlighting packages in this repository (`packages/keiro-vim/` and
`packages/shiki-keiro/`). Each package loads these files in its automated tests and asserts
that specific tokens receive specific classifications, per the taxonomy in
`spec/keiro-dsl-language-model.md`.

## Provenance

The following five files were copied **verbatim** on 2026-06-10 from the keiro project's
DSL test fixtures at
`/Users/shinzui/Keikaku/bokuno/keiro/keiro-dsl/test/fixtures/`:

- `reservation.keiro` — an `aggregate` with `regs`, `states`, `command`/`event`, `wire`,
  and a `status-map`.
- `hospital-surge.keiro` — a `process` with a `timer` (`fireAt ... + 5m`) and dispositions.
- `emit.keiro` — a `contract` with `emit` and a `publisher`.
- `intake.keiro` — an `intake` declaration.
- `workflow-signal-mismatch.keiro` — a `workflow` with an `operation`, `step`, and
  `await`/`signal`.

Together these exercise every top-level node type and every lexical feature of keiro-dsl
**except comments**, which the upstream fixtures omit.

The remaining file is **hand-written for this repository**:

- `comments-and-literals.keiro` — authored here to exercise `#` line comments and every
  literal form (strings, plain integers, `v2`-style versions, `5m`-style durations) so both
  packages have something to assert comment / number / string highlighting against.

## Rules for consumers

These files are **read-only inputs**. The Vim and Shiki packages must **not** edit them;
each package adds its own per-package expectation fixtures that point at these files. If a
corpus file must change, the change is owned by the shared-language-model plan
(`docs/plans/1-shared-keiro-dsl-language-model-and-test-corpus.md`), and both packages
re-validate against the updated corpus.
