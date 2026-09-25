local plugin_dir = (arg and arg[1]) or vim.fn.getcwd()
local repo_root = vim.fn.fnamemodify(plugin_dir, ':h:h')

vim.opt.runtimepath:prepend(plugin_dir)
vim.cmd('filetype plugin on')
vim.cmd('syntax on')

local function open(path)
  vim.cmd('edit ' .. repo_root .. '/corpus/' .. path)
  vim.cmd('syntax sync fromstart')
  assert(vim.bo.filetype == 'keiro-workspace', 'wrong filetype for ' .. path)
  assert(vim.b.current_syntax == 'keiro-workspace', 'workspace syntax was not loaded')
  assert(vim.bo.commentstring == '# %s', 'workspace comment settings were not loaded')
end

local function expect(line, token, group)
  local lnum = vim.fn.search('\\V' .. vim.fn.escape(line, '\\'), 'nw')
  assert(lnum > 0, 'missing line: ' .. line)
  local start = vim.fn.getline(lnum):find(token, 1, true)
  assert(start, 'missing token: ' .. token)
  for col = start, start + #token - 1 do
    local actual = vim.fn.synIDattr(vim.fn.synID(lnum, col, 1), 'name')
    assert(actual == group, token .. ' at column ' .. col .. ': expected ' .. group .. ', got ' .. actual)
  end
end

open('service.keiro-workspace')
expect('# One durable service', '# One durable service', 'keiroWorkspaceComment')
expect('service workspace-proof', 'service', 'keiroWorkspaceKeyword')
expect('service workspace-proof', 'workspace-proof', 'keiroWorkspaceService')
expect('runtime-package keiro-dsl-conformance-service-runtime', 'runtime-package', 'keiroWorkspaceKeyword')
expect('runtime-package keiro-dsl-conformance-service-runtime', 'keiro-dsl-conformance-service-runtime', 'keiroWorkspaceRuntimePackage')
expect('module Proof', 'module', 'keiroWorkspaceKeyword')
expect('module Proof', 'Proof', 'keiroWorkspaceModule')
expect('layout collocated', 'layout', 'keiroWorkspaceKeyword')
expect('layout collocated', 'collocated', 'keiroWorkspaceLayout')
expect('spec domain/alpha.keiro', 'spec', 'keiroWorkspaceKeyword')
expect('spec domain/alpha.keiro', 'domain/alpha.keiro', 'keiroWorkspacePath')

open('prefixed.keiro-workspace')
expect('module Example.Service', 'Example.Service', 'keiroWorkspaceModule')
expect('layout prefixed', 'prefixed', 'keiroWorkspaceLayout')
expect('spec domain/module.keiro', 'domain/module.keiro', 'keiroWorkspacePath')
expect('spec domain/module.keiro', '# member source', 'keiroWorkspaceComment')

print('workspace syntax checks passed')
vim.cmd('quitall')
