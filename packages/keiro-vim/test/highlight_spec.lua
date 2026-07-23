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

-- Reserved-word coverage guard (keiro-dsl 75286d7).
--
-- `retiring` joined the parser's `reservedWords` in keiro-dsl 75286d7 without changing how the
-- word is spelled or where it may appear, so that range needed no syntax-file edit. The
-- standing risk it exposes is that the *next* word to join the list would simply not be in
-- keiro.vim, and no hand-named assertion above would notice. This block closes that gap: it
-- reads the reserved-keyword list out of Section 3 of spec/keiro-dsl-language-model.md — which
-- is a verbatim copy of `reservedWords` — and asserts every word gets some keyword group.
--
-- The check is deliberately loose about *which* group. Section 6 of the spec splits the
-- reserved words across four classes, and pinning each word to one would freeze that split
-- instead of catching the failure that matters: a reserved word rendering as plain text.

-- Read the words out of the first ```text fenced block under the "## Section 3" heading.
local function reserved_words_from_spec()
  local lines = vim.fn.readfile(repo_root .. '/spec/keiro-dsl-language-model.md')
  local start, open_fence, close_fence
  for i, line in ipairs(lines) do
    if not start and line:sub(1, 12) == '## Section 3' then start = i
    elseif start and not open_fence and line == '```text' then open_fence = i
    elseif open_fence and line == '```' then close_fence = i break end
  end
  assert(start, 'spec has no "## Section 3" heading')
  assert(open_fence, 'Section 3 has no ```text fenced block')
  assert(close_fence, 'Section 3 fenced block is unterminated')
  local words = {}
  for i = open_fence + 1, close_fence - 1 do
    for word in lines[i]:gmatch('%S+') do
      words[#words + 1] = word
    end
  end
  return words
end

local KEYWORDISH_GROUPS = {
  keiroKeyword = true,    -- Declaration introducer
  keiroStatement = true,  -- Control / section keyword
  keiroModifier = true,   -- Modifier
  keiroBoolean = true,    -- Language constant (true / false)
  keiroConstant = true,   -- Language constant (HOLE, ...)
}

local reserved = reserved_words_from_spec()

checks = checks + 1
if #reserved ~= 71 then
  failures = failures + 1
  print(string.format('FAIL reserved-word count: want 71, got %d', #reserved))
else
  print(string.format('ok   reserved-word count -> %d', #reserved))
end

-- A scratch buffer with one word per line. 'buftype=nofile' keeps it off disk; without it the
-- unsaved changes below make the closing 'quitall' fail with E37. Fill the buffer *before*
-- setting the filetype: setting 'filetype' fires the FileType autocommand that sources
-- syntax/keiro.vim, and doing that last means the rules apply to contents already present.
vim.cmd('enew!')
vim.bo.buftype = 'nofile'
vim.bo.bufhidden = 'wipe'
vim.bo.swapfile = false
vim.api.nvim_buf_set_lines(0, 0, -1, false, reserved)
vim.bo.filetype = 'keiro'
vim.cmd('syntax sync fromstart')

for i, word in ipairs(reserved) do
  checks = checks + 1
  local got = group_at(i, 1)
  if KEYWORDISH_GROUPS[got] then
    print(string.format('ok   %q -> %s', word, got))
  else
    failures = failures + 1
    print(string.format('FAIL %q: want a keyword group, got %s', word, got))
  end
end

vim.bo.modified = false

print(string.format('\n%d checks, %d failures', checks, failures))
if failures > 0 then
  vim.cmd('cquit 1')
else
  vim.cmd('quitall')
end
