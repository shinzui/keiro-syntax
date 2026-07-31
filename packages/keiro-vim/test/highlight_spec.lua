-- Headless syntax assertions for the keiro-vim plugin.
-- Run via test/run.sh, which passes the plugin dir as the first script arg.
local plugin_dir = (arg and arg[1]) or vim.fn.getcwd()
local repo_root = vim.fn.fnamemodify(plugin_dir, ':h:h')  -- packages/keiro-vim -> repo root

vim.opt.runtimepath:prepend(plugin_dir)
vim.cmd('filetype on')
vim.cmd('syntax on')

local failures = 0
local checks = 0

local function group_at(lnum, col)
  -- trans=1 returns the topmost syntax item name, e.g. "keiroKeyword".
  return vim.fn.synIDattr(vim.fn.synID(lnum, col, 1), 'name')
end

-- Find the first (lnum, col) where `word` appears as text in the buffer.
local function locate(word)
  for lnum = 1, vim.fn.line('$') do
    local line = vim.fn.getline(lnum)
    local s = vim.fn.match(line, '\\V' .. vim.fn.escape(word, '\\'))
    if s >= 0 then
      return lnum, s + 1  -- columns are 1-based
    end
  end
  return nil, nil
end

-- Assert that `word` carries `want` on **every** character, not just its first.
--
-- expect() above reads the group at the located phrase's first character, which is silent
-- about a literal the syntax file split. `1.5` is the case that matters: with the number
-- matches declared longest-first, Vim's last-definition-wins tie-break handed `1` to the
-- plain-integer rule and left the `.` uncoloured, and the first-character check passed
-- anyway. It had passed that way since the assertion was written in plan 4. Same technique
-- expect_all_keywordish uses below for dashed keywords, hoisted so single literals can use it.
local function expect_uniform(word, want)
  checks = checks + 1
  local lnum, col = locate(word)
  if not lnum then
    failures = failures + 1
    print(string.format('MISSING token %q in current buffer', word))
    return
  end
  for c = col, col + #word - 1 do
    local got = group_at(lnum, c)
    if got ~= want then
      failures = failures + 1
      print(string.format('FAIL %q: want %s on every character, got %s at offset %d (%q) — a '
        .. 'shorter rule is claiming part of the literal; see the number matches in '
        .. 'syntax/keiro.vim', word, want, got == '' and '(none)' or got, c - col,
        word:sub(c - col + 1, c - col + 1)))
      return
    end
  end
  print(string.format('ok   %q -> %s (all %d characters)', word, want, #word))
end

local function open(relpath)
  vim.cmd('silent! edit! ' .. repo_root .. '/' .. relpath)
  vim.cmd('syntax sync fromstart')
  assert(vim.bo.filetype == 'keiro',
    'expected filetype=keiro for ' .. relpath .. ', got ' .. vim.bo.filetype)
end

local function expect(word, want)
  checks = checks + 1
  local lnum, col = locate(word)
  if not lnum then
    failures = failures + 1
    print(string.format('MISSING token %q in current buffer', word))
    return
  end
  local got = group_at(lnum, col)
  if got ~= want then
    failures = failures + 1
    print(string.format('FAIL %q: want %s, got %s', word, want, got))
  else
    print(string.format('ok   %q -> %s', word, got))
  end
end

open('corpus/comments-and-literals.keiro')
expect('# keiro-dsl', 'keiroComment')
expect('context', 'keiroKeyword')
expect('aggregate', 'keiroKeyword')
expect('"demo.events"', 'keiroString')
expect('Int', 'keiroType')

open('corpus/reservation.keiro')
expect('guard', 'keiroStatement')
expect('-->', 'keiroOperator')
expect(':=', 'keiroOperator')
expect('true', 'keiroBoolean')
expect('schemaVersion', 'keiroStatement')

-- Current lexical surface: 20 new reserved words, string escapes, decimals.
-- Several of these words also appear in the file's header comment, so anchor on
-- code-only phrases; group_at reads the group at the phrase's first character.
open('corpus/router-readmodel-snapshot.keiro')
expect('router incidentRouter', 'keiroKeyword')
expect('readmodel hospitalReadiness', 'keiroKeyword')
expect('snapshot every', 'keiroStatement')
expect('resolve stable', 'keiroStatement')
expect('dispatch-each ActivateSurge', 'keiroStatement')
expect('patch retry-window', 'keiroStatement')
expect('\\n', 'keiroStringEscape')
expect('1.5', 'keiroNumber')

-- The `replay-only` transition prefix (keiro-dsl 6c2c8fc). The guard/== checks prove the
-- rest of the marked transition line still tokenizes normally.
open('corpus/reservation-guard-tightened-twin.keiro')
expect('replay-only', 'keiroModifier')
expect('guard', 'keiroStatement')
expect('==', 'keiroOperator')

-- The `retiring` event prefix (keiro-dsl 451acf2) and its `deprecated` sibling. The two
-- `event ...` anchors prove the prefix does not disturb the declaration that follows it:
-- the second reads the group at `event` on the *prefixed* line. (`keiroTypeName` is not
-- asserted here — see docs/plans/6-highlight-the-retiring-event-marker.md, Surprises.)
open('corpus/reservation-retiring.keiro')
expect('retiring', 'keiroModifier')
expect('event TransferReservationCreated', 'keiroStatement')
expect('event TransferReservationConfirmed', 'keiroStatement')

open('corpus/reservation-deprecated-replay-only.keiro')
expect('deprecated', 'keiroModifier')
expect('replay-only', 'keiroModifier')
expect('goto', 'keiroStatement')

-- Consumer-owned mapped types (keiro-dsl 430c3d2). `mapped structural record|enum|union` and
-- `mapped opaque` declare a Haskell type owned by another package plus its wire encoding.
--
-- expect() reads the group at the *first character* of the literal and finds the *first* line
-- containing it, so several of these anchor on a phrase rather than a bare word: `record`
-- alone would first be found inside `mapped structural record`, which is harmless, but `type`
-- alone would be found inside `canonical-type` on an earlier line and `as` inside `canonical`.
open('corpus/consumer-mapped-types.keiro')
expect('mapped structural record', 'keiroKeyword')
expect('structural record', 'keiroModifier')
expect('record ArtifactInfo', 'keiroModifier')
expect('union ArtifactLocation', 'keiroModifier')
expect('opaque VendorGeometry', 'keiroModifier')
-- `keiroTypeName` is deliberately not asserted: the Vim rule for the optional
-- Declaration-site-type-name refinement has never fired for *any* introducer, because Vim's
-- 'syntax keyword' outranks the '\zs' match and consumes the introducer before the match is
-- tried. Section 6 of the spec marks that class optional, so Vim stays compliant. See this
-- range's plan for the evidence and the fix a future plan would apply.
expect('haskell package', 'keiroStatement')
expect('package=artifact-domain', 'keiroStatement')
expect('type=ArtifactInfo', 'keiroStatement')
expect('constructor=ArtifactInfo', 'keiroStatement')
expect('as "key"', 'keiroStatement')
expect('required', 'keiroModifier')
expect('optional on-missing=Guide', 'keiroModifier')
-- The dashed clause labels: each assertion reads the group at the leading segment, so a
-- passing check here plus the character-by-character probe in the plan's Validation section
-- together prove the whole spelling is claimed by one rule.
expect('binding-version', 'keiroStatement')
expect('canonical-type', 'keiroStatement')
expect('unknown-fields=reject', 'keiroStatement')
expect('tagged-object', 'keiroStatement')
expect('on-missing=Guide', 'keiroStatement')
expect('reject {', 'keiroStatement')
expect('Natural', 'keiroType')
expect('Json', 'keiroType')
expect('Optional Text', 'keiroType')
expect('List Text', 'keiroType')
expect('Map Text', 'keiroType')
expect('null', 'keiroConstant')
-- A mapped declaration must not disturb the aggregate beneath it.
expect('aggregate Catalog', 'keiroKeyword')
expect('guard', 'keiroStatement')
expect(':=', 'keiroOperator')

-- The two spellings no single upstream fixture pairs: `unknown-fields=ignore` and the
-- `UTCTime` alias for `Time`.
open('corpus/mapped-type-spellings.keiro')
expect('unknown-fields=ignore', 'keiroStatement')
expect('ignore {', 'keiroStatement')
expect('UTCTime', 'keiroType')
-- The leading comment deliberately contains mapped-type keywords; the comment must win.
expect('# keiro-dsl mapped-type', 'keiroComment')

-- Widened aggregate type slots (keiro-dsl da09736). `pRegDecl` and the new `pAggregateField`
-- swapped a bare identifier for the full `pMappedTypeExpr` grammar, so the ten type spellings
-- that used to appear only inside a `mapped` declaration's wire block now appear in an
-- aggregate's `regs` block and in its command/event field lists. keiro.vim matches them with
-- unconditional 'syntax keyword' rules, so this needed no syntax-file change — these
-- assertions exist to keep it that way.
--
-- expect() reads the group at the *first character* of the literal and finds the *first* line
-- containing it, so every anchor here must begin with the token under test. Several words are
-- also named in the file's leading comment, which is why the register assertions carry the
-- ` = `-aligned tail: `Natural` alone would be found in the comment on line 4.
open('corpus/aggregate-scalar-types.keiro')
expect('# keiro-dsl aggregate', 'keiroComment')
expect('# regs, command, event, Natural, Optional, Map', 'keiroComment')
expect('aggregate ScalarLedger', 'keiroKeyword')
-- The register type slot.
expect('Time       =', 'keiroType')
expect('Natural    =', 'keiroType')
expect('Int        =', 'keiroType')
expect('Bool       =', 'keiroType')
expect('Text       =', 'keiroType')
expect('placeholder', 'keiroConstant')
-- The command/event field type slot, including the parenthesised one-argument constructors.
-- `keiroTypeName` is deliberately not asserted for the `LedgerNote` register and field: the
-- Vim rule for that optional refinement has never fired for any introducer (see plan 8), and
-- Section 6 of spec/keiro-dsl-language-model.md marks the class optional.
expect('Time revision', 'keiroType')
expect('Natural balance', 'keiroType')
expect('UTCTime', 'keiroType')
expect('Optional(Text)', 'keiroType')
expect('List(Text)', 'keiroType')
expect('Map(Text)', 'keiroType')
expect('Json }', 'keiroType')
-- The aggregate around the widened slots is undisturbed.
expect('command Record', 'keiroStatement')
expect('guard observedAt', 'keiroStatement')
expect(':=', 'keiroOperator')
-- A fractional register initializer is one whole number token. `-` is not an operator in
-- either package (Section 5 lists `-->`, `--`, and `->` but no bare `-`), so `-1.5` is an
-- uncoloured `-` followed by this token.
expect_uniform('1.5', 'keiroNumber')

-- The same whole-token guard on the file that has carried the fractional assertion since
-- plan 4, plus the other two multi-character numeric forms. Before this range keiro.vim
-- declared its number matches longest-first and Vim's last-definition-wins tie-break split
-- `1.5` into a coloured `1`, an uncoloured `.`, and a coloured `5`; expect() could not see it.
open('corpus/router-readmodel-snapshot.keiro')
expect_uniform('1.5', 'keiroNumber')
expect_uniform('2s', 'keiroNumber')
expect_uniform('v2', 'keiroNumber')

-- Spec word-list coverage guards.
--
-- `retiring` joined the parser's `reservedWords` in keiro-dsl 75286d7 without changing how the
-- word is spelled or where it may appear, so that range needed no syntax-file edit. The
-- standing risk it exposed is that the *next* word to join a spec word list would simply not
-- be in keiro.vim, and no hand-named assertion above would notice. keiro-dsl 430c3d2 then
-- added 33 words at once, 26 of them to Section 4 — which had no guard at all. This block
-- closes both gaps: it reads the reserved-keyword list out of Section 3 of
-- spec/keiro-dsl-language-model.md (a verbatim copy of `reservedWords`) and the two curated
-- contextual lists out of Section 4, and asserts every word gets some keyword group.
--
-- The check is deliberately loose about *which* group. Section 6 of the spec splits these
-- words across four classes, and pinning each word to one would freeze that split instead of
-- catching the failure that matters: a keyword rendering as plain text.

-- Collect the words out of the first `count` ```text fenced blocks under a "## Section N"
-- heading, stopping at the next "## Section" heading. `count` matters because Section 4 has a
-- *third* fenced block — the `replay-only` worked example, which is .keiro code rather than a
-- word list — so taking only the leading blocks skips it structurally.
local function word_blocks_from_spec(heading, count)
  local lines = vim.fn.readfile(repo_root .. '/spec/keiro-dsl-language-model.md')
  local start
  for i, line in ipairs(lines) do
    if line:sub(1, #heading) == heading then start = i break end
  end
  assert(start, 'spec has no "' .. heading .. '" heading')
  local blocks = {}
  local i = start + 1
  while i <= #lines and #blocks < count do
    if lines[i]:sub(1, 10) == '## Section' then break end
    if lines[i] == '```text' then
      local close_fence
      for j = i + 1, #lines do
        if lines[j] == '```' then close_fence = j break end
      end
      assert(close_fence, heading .. ' fenced block is unterminated')
      local words = {}
      for k = i + 1, close_fence - 1 do
        for word in lines[k]:gmatch('%S+') do words[#words + 1] = word end
      end
      blocks[#blocks + 1] = words
      i = close_fence
    end
    i = i + 1
  end
  assert(#blocks == count,
    string.format('%s has %d ```text blocks, expected %d', heading, #blocks, count))
  return blocks
end

local KEYWORDISH_GROUPS = {
  keiroKeyword = true,    -- Declaration introducer
  keiroStatement = true,  -- Control / section keyword
  keiroModifier = true,   -- Modifier
  keiroBoolean = true,    -- Language constant (true / false)
  keiroConstant = true,   -- Language constant (HOLE, null, ...)
}

-- Probe a list of words, one per line, in a scratch buffer. 'buftype=nofile' keeps it off
-- disk; without it the unsaved changes make the closing 'quitall' fail with E37. Fill the
-- buffer *before* setting the filetype: setting 'filetype' fires the FileType autocommand that
-- sources syntax/keiro.vim, and doing that last means the rules apply to contents already
-- present.
-- Probing column 1 alone is not enough, and this is the failure mode it misses. Vim's
-- 'syntax keyword' outranks a 'syntax match' beginning at the same column, so a bare keyword
-- that is a *prefix* of a dashed keyword claims only the head: before the fixes in this
-- range, `on-ok` read as a colored `on` plus a grey `-ok`, and column 1 was `keiroStatement`
-- either way. So check **every** character of the word and require one uniform group.
local function expect_all_keywordish(label, words)
  vim.cmd('enew!')
  vim.bo.buftype = 'nofile'
  vim.bo.bufhidden = 'wipe'
  vim.bo.swapfile = false
  vim.api.nvim_buf_set_lines(0, 0, -1, false, words)
  vim.bo.filetype = 'keiro'
  vim.cmd('syntax sync fromstart')

  for i, word in ipairs(words) do
    checks = checks + 1
    local got = group_at(i, 1)
    local split_at
    for c = 2, #word do
      if group_at(i, c) ~= got then split_at = c break end
    end
    if not KEYWORDISH_GROUPS[got] then
      failures = failures + 1
      print(string.format('FAIL %s %q: want a keyword group, got %s', label, word, got))
    elseif split_at then
      failures = failures + 1
      print(string.format('FAIL %s %q: %s stops before %q (column %d) — a bare keyword is '
        .. 'shadowing the dashed spelling; see the -\\@! matches in syntax/keiro.vim',
        label, word, got, word:sub(split_at), split_at))
    else
      print(string.format('ok   %s %q -> %s', label, word, got))
    end
  end

  vim.bo.modified = false
end

local function expect_count(label, got, want)
  checks = checks + 1
  if got ~= want then
    failures = failures + 1
    print(string.format('FAIL %s count: want %d, got %d', label, want, got))
  else
    print(string.format('ok   %s count -> %d', label, got))
  end
end

local reserved = word_blocks_from_spec('## Section 3', 1)[1]
local contextual = word_blocks_from_spec('## Section 4', 2)
local bare, dashed = contextual[1], contextual[2]

expect_count('reserved-word', #reserved, 72)
expect_count('bare contextual-keyword', #bare, 96)
expect_count('dashed contextual-keyword', #dashed, 31)

expect_all_keywordish('reserved', reserved)
expect_all_keywordish('contextual', bare)
expect_all_keywordish('contextual-dashed', dashed)

print(string.format('\n%d checks, %d failures', checks, failures))
if failures > 0 then
  vim.cmd('cquit 1')
else
  vim.cmd('quitall')
end
