# Reconcile this repo with the current keiro-dsl lexical surface.
# Entrypoint for the `sync-keiro-dsl` mori reaction; also runnable by hand.
sync-keiro-dsl:
    ./scripts/sync-keiro-dsl.sh

# Both highlighter suites.
test: test-shiki test-vim

test-shiki:
    cd packages/shiki-keiro && bun install && bun test

test-vim:
    ./packages/keiro-vim/test/run.sh
