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

print(string.format('\n%d checks, %d failures', checks, failures))
if failures > 0 then
  vim.cmd('cquit 1')
else
  vim.cmd('quitall')
end
