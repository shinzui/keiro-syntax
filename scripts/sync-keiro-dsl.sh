#!/usr/bin/env bash
#
# Reconcile keiro-syntax with the keiro-dsl lexical surface.
#
# Entrypoint for the `sync-keiro-dsl` mori reaction (see mori.automation.dhall),
# which fires on a KeiroDslSurfaceChanged signal from shinzui/keiro and passes
# the triggering commit as KEIRO_DSL_COMMIT.
#
# The deterministic parts live here; only the judgment -- what the diff means for
# highlighting -- is delegated to the agent. The test suites are the gate: this
# script, not the agent, decides whether the work is committable.
#
# Runnable by hand with no environment at all, in which case it reconciles
# against keiro's current HEAD:
#
#     just sync-keiro-dsl
#
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

marker="spec/.keiro-dsl-sync"
subject_file=".keiro-dsl-sync-subject"
lock_dir=".git/keiro-dsl-sync.lock"

# Mirror of the ChangesetSelector paths in keiro's mori.automation.dhall.
watched=(
  "keiro-dsl/src/Keiro/Dsl/Parser.hs"
  "keiro-dsl/src/Keiro/Dsl/Grammar.hs"
  "keiro-dsl/src/Keiro/Dsl/PrettyPrint.hs"
  "keiro-dsl/test/fixtures"
)

log() { printf '[sync-keiro-dsl] %s\n' "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }

# --- single-flight ------------------------------------------------------------
# Signals can arrive faster than an agent run completes. mkdir is atomic, so a
# second run bows out rather than editing a tree the first run is mid-way through.
if ! mkdir "$lock_dir" 2>/dev/null; then
  log "another sync holds $lock_dir; exiting without work"
  exit 0
fi
trap 'rmdir "$lock_dir" 2>/dev/null || true' EXIT

command -v claude >/dev/null || die "claude not on PATH"
command -v jq >/dev/null || die "jq not on PATH"

# --- resolve the source repo --------------------------------------------------
# The reaction may fire from the launchd daemon, whose PATH can be more minimal
# than an interactive shell -- `mori` (in ~/.nix-profile/bin) is not guaranteed
# to be on it. Try the registry first, then fall back to the well-known path, so
# a daemon-PATH miss degrades gracefully instead of dying.
keiro_fallback="/Users/shinzui/Keikaku/bokuno/keiro"
keiro_path=""
if command -v mori >/dev/null 2>&1; then
  keiro_path="$(mori registry show shinzui/keiro --json 2>/dev/null | jq -re '.path' 2>/dev/null || true)"
fi
if [ -z "$keiro_path" ] || [ ! -d "$keiro_path/.git" ]; then
  log "mori registry lookup unavailable or invalid; falling back to $keiro_fallback"
  keiro_path="$keiro_fallback"
fi
[ -d "$keiro_path/.git" ] || die "keiro path is not a git repo: $keiro_path"

target="${KEIRO_DSL_COMMIT:-}"
if [ -z "$target" ]; then
  target="$(git -C "$keiro_path" rev-parse HEAD)"
  log "no KEIRO_DSL_COMMIT in env; reconciling against keiro HEAD"
fi
git -C "$keiro_path" cat-file -e "${target}^{commit}" 2>/dev/null \
  || die "commit $target not found in $keiro_path"

baseline=""
if [ -s "$marker" ]; then
  baseline="$(tr -d '[:space:]' < "$marker")"
  if ! git -C "$keiro_path" cat-file -e "${baseline}^{commit}" 2>/dev/null; then
    log "recorded baseline $baseline is not a commit in keiro (history rewrite?); doing a full reconcile"
    baseline=""
  fi
fi

if [ -n "$baseline" ] && [ "$baseline" = "$target" ]; then
  log "already synced to $target; nothing to do"
  exit 0
fi

# --- refuse to stack on a dirty tree ------------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  die "keiro-syntax working tree is dirty; commit or stash before syncing"
fi

# --- brief the agent ----------------------------------------------------------
if [ -n "$baseline" ]; then
  range="${baseline}..${target}"
  scope="the keiro-dsl changes in the range ${range}"
  diff_cmd="git -C '${keiro_path}' diff ${range} -- ${watched[*]}"
  log "reconciling range $range"
else
  scope="the CURRENT FULL keiro-dsl lexical surface (no prior sync marker exists, so treat this as a full reconciliation rather than an incremental diff)"
  diff_cmd="git -C '${keiro_path}' log --oneline -20 -- ${watched[*]}"
  log "no baseline marker; full reconciliation against $target"
fi

read -r -d '' prompt <<PROMPT || true
You are running unattended as the \`sync-keiro-dsl\` mori automation in the
keiro-syntax repository ($repo_root). A change landed in keiro-dsl, the parser for
the .keiro language that this repo provides syntax highlighting for.

Source of truth: ${keiro_path}/keiro-dsl/src/Keiro/Dsl/Parser.hs -- specifically its
\`reservedWords\` list, the comment/string/number/identifier lexing rules, and the
operators. spec/keiro-dsl-language-model.md in THIS repo states that its keyword list is
copied verbatim from \`reservedWords\` and must match it exactly.

Your job is to reconcile this repo with ${scope}.

Triggering keiro-dsl commit: ${target}
Commit subject: ${KEIRO_DSL_SUBJECT:-(unknown)}
Inspect the change with:
    ${diff_cmd}

Steps:

1. Determine what the change means for the LEXICAL SURFACE of .keiro files: new or
   removed reserved words, new operators or literals, changed comment/string/number
   rules, new token classes. Many keiro-dsl commits touch semantics only and mean
   nothing for highlighting -- if that is the case here, say so and skip to step 5.

2. Use the exec-plan skill to write an ExecPlan under docs/plans/ recording the change
   and the work it implies. Number it after the highest existing plan and follow the
   conventions of the plans already there. This ExecPlan is the durable record of why
   this repo changed -- it must name the keiro-dsl commit ${target}.

3. Implement the plan, in this order, keeping all four artifacts in agreement:
     - spec/keiro-dsl-language-model.md   (the cross-package contract; update Section 3's
       keyword list and Section 6's token-class taxonomy, and classify every new keyword)
     - packages/keiro-vim/syntax/keiro.vim
     - packages/shiki-keiro/syntaxes/keiro.tmLanguage.json
     - corpus/  (add or extend a .keiro sample exercising any new surface, so both
       packages' tests actually tokenize it)
   Extend the tests in packages/*/test/ to cover the new tokens.

4. Run both suites until green:
     (cd packages/shiki-keiro && bun install && bun test)
     ./packages/keiro-vim/test/run.sh

5. Write a single-line Conventional Commits subject describing what you did to the file
   ${subject_file} (e.g. "feat(syntax): highlight router and read-model keywords").
   If step 1 concluded there is no highlighting-relevant change, write a chore(sync)
   subject saying so and make no other edits.

Do NOT run git commit, git add, or git push, and do not write to ${marker}. The calling
script re-runs the suites itself and owns the commit. Leave your work in the tree.
PROMPT

log "invoking agent"
claude -p "$prompt" \
  --add-dir "$keiro_path" \
  --permission-mode acceptEdits \
  --allowedTools Read Write Edit Glob Grep Bash Skill TodoWrite \
  || die "agent run failed"

# --- the gate -----------------------------------------------------------------
# Authoritative: the agent claims the suites pass, this proves it.
log "verifying: shiki-keiro"
(cd packages/shiki-keiro && bun install --silent && bun test) || die "shiki-keiro tests failed; leaving tree dirty for review"

log "verifying: keiro-vim"
./packages/keiro-vim/test/run.sh || die "keiro-vim tests failed; leaving tree dirty for review"

# --- record and commit --------------------------------------------------------
subject="chore(sync): reconcile keiro-dsl lexical surface to ${target:0:12}"
if [ -s "$subject_file" ]; then
  subject="$(head -n 1 "$subject_file")"
fi
rm -f "$subject_file"

printf '%s\n' "$target" > "$marker"

if [ -z "$(git status --porcelain)" ]; then
  log "no changes produced; nothing to commit"
  exit 0
fi

git add -A
git commit -q -F - <<COMMIT
${subject}

Reconciles the keiro-dsl lexical surface into spec/, packages/keiro-vim, and
packages/shiki-keiro.

Synced to keiro-dsl ${target}.

Mori-Reaction: ${MORI_REACTION_NAME:-sync-keiro-dsl}
Mori-Signal: KeiroDslSurfaceChanged
COMMIT

log "committed: $(git log -1 --oneline)"
