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
-- The optional third argument is an anchor phrase: locate *that* first, then find `word`
-- inside the line it matched. Needed when the word under test also appears earlier in the
-- file inside a comment — `corpus/language-preamble.keiro` deliberately names `language` and
-- `keiro-dsl` in its banner so the comment-wins check has something to bite on, which would
-- otherwise send this helper to a comment line and fail for the wrong reason.
local function expect_uniform(word, want, anchor)
  checks = checks + 1
  local lnum, col
  if anchor then
    local alnum, acol = locate(anchor)
    if alnum then
      local rel = vim.fn.match(vim.fn.getline(alnum), '\\V' .. vim.fn.escape(word, '\\'), acol - 1)
      if rel >= 0 then lnum, col = alnum, rel + 1 end
    end
  else
    lnum, col = locate(word)
  end
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

-- Assert that the character `offset` positions into `anchor` carries NO highlight group at all.
-- This is the negative form neither expect() nor expect_uniform() can express: both report a
-- group, and "" is exactly what they treat as failure. Needed for the wire word in
-- `id CommandId prefix=cmd`, which the scalar-root rule must leave alone because no '.' follows
-- it — see the reg/cmd match in syntax/keiro.vim.
local function expect_no_group(anchor, offset)
  checks = checks + 1
  local lnum, col = locate(anchor)
  if not lnum then
    failures = failures + 1
    print(string.format('MISSING anchor %q in current buffer', anchor))
    return
  end
  local got = group_at(lnum, col + offset)
  if got ~= '' then
    failures = failures + 1
    print(string.format('FAIL %q at offset %d: want no highlight group, got %s — a rule is '
      .. 'claiming text that must stay plain', anchor, offset, got))
  else
    print(string.format('ok   %q at offset %d -> (no group)', anchor, offset))
  end
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

-- The language version preamble (keiro-dsl 4523b52). A `.keiro` source may now open with
-- `language keiro-dsl <positive-decimal>`, the only clause that sits above `context`. Both
-- words are new to keiro.vim; neither is reserved.
--
-- The file's comment banner names both words, so the code anchors below must begin with the
-- token under test: expect() finds the *first* line containing the literal.
open('corpus/language-preamble.keiro')
expect('# keiro-dsl language version preamble', 'keiroComment')
expect('# deciding which line is first', 'keiroComment')
expect('language keiro-dsl 1', 'keiroKeyword')
-- `keiro-dsl` must be claimed by the dashed match across its whole spelling, not split into a
-- plain `keiro` and a plain `-dsl`. expect() reads only the first character, so use the
-- uniform helper — the same blind spot plans 8 and 9 had to close for dashed words.
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 1')
expect_uniform('language', 'keiroKeyword', 'language keiro-dsl 1')
-- The preamble's version is an ordinary number; there is no separate version class.
expect('1', 'keiroNumber')
-- The preamble leaves the header clauses and the aggregate below it undisturbed.
expect('context journal-service', 'keiroKeyword')
expect('module Acme.Services', 'keiroStatement')
expect('layout prefixed', 'keiroStatement')
expect('aggregate Journal', 'keiroKeyword')
expect('regs', 'keiroStatement')
expect('Natural = 0', 'keiroType')
expect('placeholder', 'keiroConstant')
expect(':=', 'keiroOperator')

-- Consumer-owned nominal bindings (keiro-dsl fcd6748). The third `mapped` family:
-- `mapped nominal X : R { ... }` declares a consumer-owned Haskell type whose identity matters
-- even though its wire representation is a plain scalar, and a trailing `using { ... }` clause
-- attaches the same block of facts to an `id` or `enum` declaration the file already had. Only
-- two words are new: `nominal` and `using`.
--
-- The anchors matter here. `nominal` also appears as the leading segment of this file's context
-- wire word (`context nominal-scalars` on line 2), where a bare keyword rule ends at the `-` —
-- pre-existing behaviour for every dashed wire word, not something this range changed — so a
-- bare `expect('nominal', ...)` would read that line instead of a declaration.
open('corpus/consumer-nominal-bindings.keiro')
expect('nominal AccountNumber', 'keiroModifier')
expect('nominal RiskScore', 'keiroModifier')
-- `keiroTypeName` is deliberately not asserted for `AccountNumber`: the Vim rule for the
-- optional Declaration-site-type-name refinement has never fired for any introducer, because
-- Vim's 'syntax keyword' outranks the '\zs' match and consumes the introducer before the match
-- is tried (see docs/plans/8-highlight-consumer-owned-mapped-types-and-their-wire-shapes.md).
-- Section 6 of spec/keiro-dsl-language-model.md marks that class optional, so Vim stays
-- compliant; `nominal` was still added to the rule so it matches Section 6 when a future plan
-- makes it fire.
--
-- `using` at both parser call sites: `pIdDecl` and `pEnumDecl`. The enum case is the
-- language's first declaration body that continues *after* a closing brace, so assert it
-- separately rather than trusting the id case to cover both.
expect('using {', 'keiroStatement')
expect_uniform('using', 'keiroStatement', 'enum OrderStatus')
-- The representation slot. Upstream parses it as a bare `ident` and narrows it later in
-- NominalType.hs to Text / Int / Natural / Bool / Time / UTCTime, all of which keiro.vim
-- already matches unconditionally, so this needed no syntax-file change.
expect('Text {', 'keiroType')
expect('Int {', 'keiroType')
expect('Natural {', 'keiroType')
expect('Bool {', 'keiroType')
expect('Time {', 'keiroType')
-- The binding block is not new: `pNominalClause` is a choice over rules the mapped-type
-- declaration already had, so every label below has been matched since keiro-dsl 430c3d2.
expect('haskell package', 'keiroStatement')
expect('binding-version', 'keiroStatement')
expect('canonical-type', 'keiroStatement')
expect('fixtures = ', 'keiroStatement')
expect('initial = ', 'keiroStatement')
-- Nominal syntax requires `language keiro-dsl 2`; the version is an ordinary number whatever
-- its value, and there is no per-version token class.
expect('language keiro-dsl 2', 'keiroKeyword')
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 2')
expect('2', 'keiroNumber')
-- The aggregate below the declarations is undisturbed.
expect('aggregate NominalLedger', 'keiroKeyword')
expect('regs', 'keiroStatement')
expect('states', 'keiroStatement')
expect('guard', 'keiroStatement')
expect('goto', 'keiroStatement')
expect(':=', 'keiroOperator')

-- The typed scalar expression language (keiro-dsl 8b0f55b). Under `language keiro-dsl 2` an
-- aggregate transition's `guard` and `write` clauses are a real expression language: values
-- reached through the `reg.` and `cmd.` roots, arithmetic with `+`, `-`, and `*`, and literals
-- as operands. The same commit added the `Integer` type spelling and the `implementation hole`
-- clause. Four spellings are new to keiro.vim — `Integer`, `implementation`, `reg`, `cmd` —
-- plus the operator `*`.
--
-- This file has no comments (it is a verbatim upstream fixture), so bare anchors are safe; each
-- one still begins with the token under test, because expect() reads the group at the anchor's
-- first character.
open('corpus/aggregate-scalar-expressions.keiro')
expect('Integer = 0', 'keiroType')
expect('Integer requested:Natural', 'keiroType')
expect('Natural = 0', 'keiroType')
-- The two expression roots, whole-token: the rule must claim `reg`/`cmd` and stop at the '.',
-- which is uncoloured punctuation. expect() alone reads only the first character and would pass
-- even if the rule leaked into the dotted tail.
expect('cmd.balance', 'keiroStatement')
expect('reg.balance', 'keiroStatement')
expect_uniform('cmd', 'keiroStatement', 'guard cmd.balance')
expect_uniform('reg', 'keiroStatement', 'guard cmd.balance')
-- The reserved word `regs` must survive the new `reg` rule: '\>' in the match requires a word
-- boundary, and `regs` has none after `reg`.
expect_uniform('regs', 'keiroStatement')
expect('*', 'keiroOperator')
expect('+', 'keiroOperator')
-- A negative operand is one whole number token with an uncoloured sign, exactly as a signed
-- register initializer is (Section 2 of spec/keiro-dsl-language-model.md).
expect_uniform('100', 'keiroNumber', '>= -100')
-- The clauses around the new expressions still tokenize.
expect('guard cmd.balance', 'keiroStatement')
expect('write balance', 'keiroStatement')
expect(':=', 'keiroOperator')
expect('goto Closed', 'keiroStatement')

-- The `implementation hole` clause, and the two literal shapes no upstream fixture uses. This
-- file's leading comment deliberately names the new keywords, so the anchors below are chosen
-- so expect()/expect_uniform() cannot land on it: the comment says "implementation ownership",
-- never "implementation hole", and "Integer, reg, cmd" never "reserved Integer".
open('corpus/transition-implementation-hole.keiro')
expect('# keiro-dsl transition implementation', 'keiroComment')
expect('# named in this comment', 'keiroComment')
expect('implementation hole', 'keiroStatement')
expect_uniform('implementation', 'keiroStatement', 'implementation hole')
-- Only the first word is new. `hole` has been a constant in keiro.vim since plan 4, as the
-- `derive "..." hole` and `resolve ... hole` marker; this clause is its third parser site.
expect_uniform('hole', 'keiroConstant', 'implementation hole')
expect_uniform('Integer', 'keiroType', 'reserved Integer')
-- The literal shapes need no rule of their own: a qualified enum literal is an identifier, a
-- '.', and an identifier, and an id literal is an identifier and a parenthesised string. What
-- must hold is that the string inside the id literal is still a String.
expect('"tkt_01h455vb4pex5vsknk084sn02q"', 'keiroString')
expect('==', 'keiroOperator')
-- The aggregate around the hole clause is undisturbed.
expect('aggregate TicketDesk', 'keiroKeyword')
expect('states Idle', 'keiroStatement')
expect('emit TicketHeld', 'keiroKeyword')
expect('goto Holding', 'keiroStatement')
expect('guard reg.reserved', 'keiroStatement')
expect(':=', 'keiroOperator')

-- Keyword-spelled identifiers (keiro-dsl 9ea8f85). This range added no token to keiro.vim.
-- What it added is a *file*: upstream's `language-identifier-v1.keiro`, copied here as
-- corpus/language-identifier-collisions.keiro, in which the five spellings that collide with
-- version-2 syntax all appear as ordinary data. Before the range keiro-dsl scanned a source as
-- raw lines before any grammar ran and rejected it for containing `using`, `Integer`,
-- `implementation hole`, `reg.`, or `cmd.` anywhere on a non-comment line, and read any line
-- whose first word was `language` as a version preamble — so no such file could be valid. It
-- now is. keiro.vim has always coloured these words unconditionally and still should; these
-- assertions keep it that way now that such files exist.
open('corpus/language-identifier-collisions.keiro')
expect('# `using Integer implementation hole', 'keiroComment')
-- `language` at the head of a wire word, and — the case the old parser rejected outright — at
-- the head of its own register declaration line. Both whole-token: '-' is not a keyword
-- character, so `language-collisions` is a complete `language` keyword followed by plain text,
-- the same pre-existing behaviour `nominal` has in `context nominal-scalars`.
expect_uniform('language', 'keiroKeyword', 'context language-collisions')
expect_uniform('language', 'keiroKeyword', 'language Text = ')
-- A mapped wire field named `using`, one named `implementation`, and an enum named `Integer`.
-- `keiroType` rather than `keiroTypeName` for the enum name: the Vim rule for the optional
-- Declaration-site-type-name refinement has never fired for any introducer (see plan 8), so the
-- unconditional type keyword wins. The Shiki package claims it as a declaration-site name
-- instead; Section 6 of spec/keiro-dsl-language-model.md marks that class optional and permits
-- exactly this divergence.
expect_uniform('using', 'keiroStatement', 'using          as')
expect_uniform('implementation', 'keiroStatement', 'implementation as')
expect_uniform('Integer', 'keiroType', 'enum Integer {')
-- Strings made entirely of words keiro.vim colours elsewhere. keiroString is a region that
-- contains only keiroStringEscape, so no bare-word rule can reach inside it — asserted
-- character by character, because a leak shows up as a split rather than a missing group.
expect_uniform('"Integer"', 'keiroString')
expect_uniform('"implementation hole"', 'keiroString')
expect_uniform('"using Integer implementation hole reg. cmd."', 'keiroString')
-- The follow-'.' guard on the two roots, from a different direction than the `prefix=cmd` check
-- below: here `reg` and `cmd` are a mapped wire field name and a command field name, followed by
-- whitespace and by ':'. An unconditional root rule would recolour four positions in this file.
expect_no_group('reg             as', 0)
expect_no_group('cmd             as', 0)
expect_no_group('reg:Text', 0)
expect_no_group('cmd:Text', 0)
-- The file tokenizes normally around the colliding names.
expect('mapped structural record', 'keiroKeyword')
expect('aggregate LanguageAggregate', 'keiroKeyword')
expect('regs', 'keiroStatement')
expect('states Open', 'keiroStatement')
expect('emit LanguageObserved', 'keiroKeyword')
expect('goto Open', 'keiroStatement')
expect('-->', 'keiroOperator')

-- A third released language version (keiro-dsl e41e989). Upstream released version 3, bound to
-- the SAME body grammar as version 2, so it adds no spelling; what it adds is a semantic rule
-- on `id ... prefix=` values, which no highlighter models. These assertions exist because until
-- now every preamble in the corpus read `1` or `2` — a rule that special-cased those two digits
-- would have passed everything above.
--
-- This corpus file puts the preamble on line 1 with its comment banner *below*, because expect()
-- reads the first line containing the literal and a `3` in a banner would shadow the version.
open('corpus/language-version-3.keiro')
expect('language keiro-dsl 3', 'keiroKeyword')
expect_uniform('language', 'keiroKeyword', 'language keiro-dsl 3')
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 3')
expect('3', 'keiroNumber')
-- The version-2-gated body beneath must colour exactly as the same surface does under a `2`
-- preamble in corpus/aggregate-scalar-expressions.keiro and corpus/consumer-nominal-bindings.keiro.
expect('nominal EntryLabel', 'keiroModifier')
expect_uniform('using', 'keiroStatement', 'id LedgerId prefix=ledger')
expect_uniform('Integer', 'keiroType', 'balance Integer = 0')
expect_uniform('reg', 'keiroStatement', 'guard reg.balance')
expect_uniform('cmd', 'keiroStatement', 'guard reg.balance')
expect('aggregate VersionThreeLedger', 'keiroKeyword')
expect('states Open', 'keiroStatement')
expect('emit Posted', 'keiroKeyword')
expect(':=', 'keiroOperator')
-- `prefix=ledger` is a legal TypeID prefix under version 3's new semantic rule; the point here
-- is that keiro.vim colours the `prefix` modifier the same way regardless of that rule.
expect('prefix=ledger', 'keiroModifier')

-- The stable fourth language version (keiro-dsl b49b11f, cd22e7f). b49b11f marked version 4 the
-- one `Stable` registry entry and versions 1-3 `CompatibilityOnly`, and changed
-- `Keiro/Dsl/Skeleton.hs` so every `keiro new <kind>` starter file opens `language keiro-dsl 4`;
-- cd22e7f then migrated upstream's 225-file fixture corpus onto it. When these assertions were
-- written version 4 bound the SAME body grammar and syntax profile as versions 2 and 3;
-- keiro-dsl b31896cf has since rebound it to syntax profile 3, whose one feature is the
-- field-alias clause covered over corpus/field-aliases.keiro below — this corpus file
-- deliberately contains only version-2 surface, so nothing here moves. These assertions exist
-- because `4` is now the version an editor will meet most often and the corpus had never
-- carried it.
--
-- Like the version-3 file, this corpus file puts the preamble on line 1 with its comment banner
-- *below*, because expect() reads the first line containing the literal and a `4` in a banner
-- would shadow the version.
open('corpus/language-version-4.keiro')
expect('language keiro-dsl 4', 'keiroKeyword')
expect_uniform('language', 'keiroKeyword', 'language keiro-dsl 4')
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 4')
expect('4', 'keiroNumber')
-- The body beneath must colour exactly as the same surface does under a `2` or `3` preamble.
expect('aggregate StableLedger', 'keiroKeyword')
expect('enum EntryStatus', 'keiroKeyword')
expect('states Recording', 'keiroStatement')
expect_uniform('Integer', 'keiroType', 'balance Integer')
expect_uniform('cmd', 'keiroStatement', 'guard cmd.amount')
expect_uniform('reg', 'keiroStatement', 'guard cmd.amount')
expect('emit EntrySettled', 'keiroKeyword')
expect(':=', 'keiroOperator')
expect('prefix=entry', 'keiroModifier')

-- The qualified enum member, pinned here for the first time in this repository. Upstream's
-- migration rewrote `guard divertStatus != TotalDivert` as
-- `guard cmd.divertStatus != DivertStatus.TotalDivert`, making this the standard way to write an
-- enum operand; it had reached the corpus only once, as `TicketStatus.Open` in
-- transition-implementation-hole.keiro, and neither suite asserted it.
--
-- This is the other half of the follow-'.' decision the two expect_uniform calls above exercise.
-- `cmd` and `reg` become keiroStatement precisely BECAUSE a '.' follows them; an enum type name
-- in the same position must stay plain, or every qualified operand in upstream's migrated corpus
-- would light up. The anchor carries the `== ` prefix so locate() finds the guard line rather
-- than the comment banner, which names the same spelling.
expect_no_group('== EntryStatus.Active', 3)   -- the 'E' of the qualifier
expect_no_group('== EntryStatus.Active', 14)  -- the '.' itself
expect_no_group('== EntryStatus.Active', 15)  -- the 'A' of the member

-- Field aliases (keiro-dsl b31896cf). Under `language keiro-dsl 4` — which that commit rebound
-- to the new syntax profile 3, whose one feature is FieldAliasSyntax — a field of an aggregate
-- command/event or of a contract event may carry `haskell <selector>` and `as "<wire-key>"`
-- between its name and its `:` type. Both markers are mapped-type words keiro.vim has matched
-- unconditionally since keiro-dsl 430c3d2, the selector is a plain identifier, and the wire key
-- an ordinary string, so no syntax-file edit was needed; these assertions keep the markers
-- coloured in the clause's two new grammatical homes.
--
-- Anchoring matters twice over here. expect() and expect_uniform() find the first line
-- containing the anchor, so the aggregate lines (type `:Text`, no space) and the contract lines
-- (`: text`, spaced, lowercase) are told apart by their type spelling. And an expect_uniform
-- anchor for the bare word `as` must *start* with `as`, because the anchored word is matched
-- from the anchor's own column and `as` is a substring of the `haskell` that precedes it on
-- every full-alias line.
open('corpus/field-aliases.keiro')
expect('# keiro-dsl field aliases', 'keiroComment')
expect('language keiro-dsl 4', 'keiroKeyword')
-- The aggregate field list: both markers, whole-word.
expect('haskell payloadType', 'keiroStatement')
expect_uniform('haskell', 'keiroStatement', 'type haskell payloadType:Text')
expect('as "region_code"', 'keiroStatement')
expect_uniform('as', 'keiroStatement', 'as "region_code"')
-- The wire key is an ordinary string, and the selector between the markers stays plain.
expect('"region_code"', 'keiroString')
expect_no_group('payloadType:Text', 0)
expect_no_group('serviceRegion', 0)
-- The two vocabulary collisions upstream's own fixtures lean on: an aliased field *named*
-- `type`, and a field literally named `as`. Neither word is reserved; both keep the keyword
-- colour the words have everywhere (Section 1 of spec/keiro-dsl-language-model.md).
expect_uniform('type', 'keiroStatement', 'type haskell payloadType:Text')
expect_uniform('as', 'keiroStatement', 'as:Text')
-- The contract field list: the same clause before a mandatory `typeid`/`text`/`int` type.
expect_uniform('haskell', 'keiroStatement', 'type haskell payloadType: text')
expect_uniform('as', 'keiroStatement', 'as "region_code": text')
expect('typeid "parcel"', 'keiroType')
expect_uniform('text', 'keiroType', 'family: text')
expect_uniform('int', 'keiroType', 'redCount: int')
-- The aggregate and contract around the aliases are undisturbed.
expect('contract parcelSignals', 'keiroKeyword')
expect('emit Observed', 'keiroKeyword')
expect('goto Dispatched', 'keiroStatement')
expect('-->', 'keiroOperator')

-- The Language 5 surface (keiro-dsl d7be0fe6..9fb54d56). Version 5 is now the stable contract and
-- admits the projection catalog, readmodel freshness and query types, the external read
-- contract, typed workqueue payloads, and domain command outcomes — 63 new words across Language
-- 5 and 6, none reserved. The word-list guard at the bottom of this file already proves each word
-- is claimed whole by some keyword group; these assertions pin the *class* each one takes and
-- that the constructs tokenize in real code. The corpus file's comment banner is at its end, so
-- first-match anchors land on code.
open('corpus/language-version-5-projection-catalog.keiro')
expect('language keiro-dsl 5', 'keiroKeyword')
expect('5', 'keiroNumber')
-- The four dashed catalog introducers, whole-token: the bare `projection` heads two of them and
-- must not claim the head (its '-\@!' guard), and `group` / `read` sit in the interior.
expect_uniform('rebuild-group', 'keiroKeyword')
expect_uniform('projection-revision', 'keiroKeyword')
expect_uniform('projection-owner', 'keiroKeyword')
expect_uniform('external-read', 'keiroKeyword')
-- `target` as a top-level declaration keeps its long-standing Statement class.
expect('target order_summary {', 'keiroStatement')
expect('reset = clear', 'keiroStatement')
expect_uniform('clear', 'keiroStatement', 'reset = clear')
expect_uniform('preserve', 'keiroStatement', 'reset = preserve')
expect_uniform('depends-on', 'keiroStatement')
expect('targets = [', 'keiroStatement')
expect('order = [', 'keiroStatement')
-- `schema`, `provisioner`, and `validator` each head a dashed label: both the bare and the dashed
-- spelling must come out whole.
expect_uniform('schema', 'keiroStatement', 'schema = "sales"')
expect_uniform('schema-version', 'keiroStatement')
expect_uniform('provisioner', 'keiroStatement', 'provisioner = ')
expect_uniform('provisioner-version', 'keiroStatement')
expect_uniform('expected-shape', 'keiroStatement')
expect_uniform('validator', 'keiroStatement', 'validator = ')
expect_uniform('validator-version', 'keiroStatement')
expect('promotion index', 'keiroStatement')
expect_uniform('index', 'keiroStatement', 'promotion index')
expect_uniform('constraint', 'keiroStatement', 'promotion constraint')
expect_uniform('owned-sequence', 'keiroStatement')
expect('source = aggregate', 'keiroStatement')
expect_uniform('all', 'keiroStatement', 'source = all')
expect('delivery = inline', 'keiroStatement')
expect_uniform('subscription', 'keiroStatement', 'delivery = subscription')
expect_uniform('subscription', 'keiroStatement', 'subscription = "')
-- `replay` heads the older dashed Modifier `replay-only`, so it too is a guarded match.
expect_uniform('replay', 'keiroStatement', 'replay = explicit')
expect_uniform('explicit', 'keiroStatement', 'replay = explicit')
expect_uniform('live-only', 'keiroStatement')
expect_uniform('checkpoint-on-missing', 'keiroStatement')
-- `from` is a Modifier that heads a dashed Control value — the first Modifier to need the guard.
expect_uniform('from-current-head', 'keiroStatement')
expect('freshness = immediate', 'keiroStatement')
expect_uniform('immediate', 'keiroStatement', 'freshness = immediate')
expect_uniform('wait-for-head', 'keiroStatement')
expect('backing = ', 'keiroStatement')
expect('query input = Text', 'keiroStatement')
expect_uniform('input', 'keiroStatement', 'query input = Text')
expect_uniform('result', 'keiroStatement', 'query result = ')
expect_uniform('result-schema', 'keiroStatement')
expect_uniform('result-type', 'keiroStatement')
expect_uniform('compatible-revisions', 'keiroStatement')
expect_uniform('surface-generation', 'keiroStatement')
-- The typed workqueue payload and the new lowercase `bool` payload type.
expect_uniform('bool', 'keiroType', '"urgent"   bool')
expect_uniform('Text', 'keiroType', '"order_id" : Text')
-- Domain command outcomes.
expect_uniform('domain-outcomes', 'keiroStatement')
expect_uniform('rejection', 'keiroStatement', 'domain-outcomes rejection=')
expect_uniform('no-op', 'keiroStatement', 'no-op=OrderNoOp')
expect('outcome accepted', 'keiroStatement')
expect_uniform('accepted', 'keiroStatement', 'outcome accepted')
expect_uniform('rejected', 'keiroStatement', 'outcome rejected')
expect_uniform('no-op', 'keiroStatement', 'outcome no-op')
-- The aggregate around the outcomes is undisturbed, and the catalog's own `projection` guard did
-- not break the reserved word: it still colours when no '-' follows (asserted in the grid guard).
expect('aggregate Orders', 'keiroKeyword')
expect('guard cmd.requestId', 'keiroStatement')
expect('goto Closed', 'keiroStatement')
expect('-->', 'keiroOperator')
expect('# keiro-dsl Language 5 sample', 'keiroComment')

-- The Language 6 surface (the same range). Version 6 is the `Candidate` registry entry: process
-- reactions, declarative router selection, `ordering fifo-heads`, `idempotence delegated`,
-- identifier-keyed maps, and a declared id in a contract field.
open('corpus/language-version-6-reactions-and-selection.keiro')
expect('language keiro-dsl 6', 'keiroKeyword')
expect('6', 'keiroNumber')
-- The keyed map: `Map` is still a type, and the brackets are uncoloured punctuation.
expect('Map[TemplateId]', 'keiroType')
expect_no_group('Map[TemplateId]', 3)
expect('idempotence delegated', 'keiroStatement')
expect_uniform('delegated', 'keiroStatement', 'idempotence delegated')
-- Process reactions.
expect('reactions version 1', 'keiroStatement')
expect('on IncidentReported', 'keiroStatement')
expect('when input.severity', 'keiroStatement')
expect('otherwise', 'keiroStatement')
expect('advance RecordCritical', 'keiroStatement')
expect_uniform('accepted', 'keiroStatement', '        accepted')
expect('silent no-action', 'keiroModifier')
expect_uniform('no-action', 'keiroStatement', 'silent no-action')
expect('schedule escalation', 'keiroStatement')
expect_uniform('once', 'keiroModifier', 'schedule reminder once')
expect('cancel reminder', 'keiroStatement')
expect('timers max-attempts', 'keiroStatement')
expect_uniform('max-attempts', 'keiroStatement', 'timers max-attempts')
expect('timer escalation', 'keiroStatement')
expect_uniform('5m', 'keiroNumber')
-- Declarative router selection.
expect('resolve declarative', 'keiroStatement')
expect_uniform('declarative', 'keiroModifier', 'resolve declarative')
expect('identity = ', 'keiroStatement')
expect_uniform('read-model', 'keiroStatement', 'query = read-model')
expect_uniform('with', 'keiroStatement', 'template_lookup with input')
expect('where = ', 'keiroStatement')
expect('recipient = ', 'keiroStatement')
expect_uniform('max-recipients', 'keiroStatement')
expect('empty => ack', 'keiroStatement')
expect_uniform('ack', 'keiroStatement', 'empty => ack')
expect('failure => retry', 'keiroStatement')
expect('redelivery = ', 'keiroStatement')
-- The selection policy values are identifiers, not parser literals: the `-` of `stable-union`
-- is uncoloured, and `union` keeps the Modifier class it has everywhere (Section 4).
expect_no_group('stable-union', 6)
-- The typed router input's ':' and the router tail are undisturbed.
expect('dispatch-each RouteTemplate', 'keiroStatement')
-- `ordering fifo-heads`, whole-token.
expect_uniform('fifo-heads', 'keiroStatement')
expect('aggregate IncidentSaga', 'keiroKeyword')
expect('# keiro-dsl Language 6 sample', 'keiroComment')

-- Bare container mappings (keiro-dsl a6110a94). `mapped structural value X { ... wire <Type> }`
-- is a fourth structural shape: the declared Haskell type *is* a container, so its encoding is
-- one unbraced `wire <Type>` line instead of a braced `wire ... { ... }` block. It adds no word
-- — `value` has been in Section 4's bare grid since plan 4 and `wire` is reserved — so keiro.vim
-- needed no matching rule and these assertions exist to keep it that way.
open('corpus/consumer-mapped-bare-containers.keiro')
expect('mapped structural value', 'keiroKeyword')
expect('structural value', 'keiroModifier')
-- `value` does NOT join `record` / `union` in the Modifier class: one word gets one class, and
-- the same word is the older workflow-signal clause label `signal ... value <Type>`. See
-- Section 6 of spec/keiro-dsl-language-model.md.
expect_uniform('value', 'keiroStatement', 'mapped structural value MaybeText')
-- `keiroTypeName` is deliberately not asserted for `MaybeText`, for the same reason it is not
-- asserted for `ArtifactInfo` or `AccountNumber` above: the Vim rule for the optional
-- Declaration-site-type-name refinement has never fired for any introducer, because Vim's
-- 'syntax keyword' outranks the '\zs' match and consumes the leading word before the match is
-- tried. Section 6 marks that class optional, so Vim stays compliant; `value` was still added to
-- the rule so it matches Section 6 when a future plan makes it fire.
--
-- The bare wire line. `wire` is reserved, and the type slot is the unchanged `pMappedTypeExpr`,
-- whose literal spellings keiro.vim already matches unconditionally.
expect('wire Optional Text', 'keiroStatement')
expect('Optional Text', 'keiroType')
expect('List Text', 'keiroType')
expect('Map Text', 'keiroType')
-- The nested, parenthesised form. `List` and `Optional` are types; the '(' and the reference to
-- another declared type stay plain, exactly as `Optional(Text)` already does.
expect('List (Optional ItemId)', 'keiroType')
expect_uniform('Optional', 'keiroType', 'wire List (Optional ItemId)')
expect_no_group('(Optional ItemId)', 0)
expect_no_group('(Optional ItemId)', 10)
-- The clause labels inside the block are the ones the older mapped families already use.
expect('haskell package', 'keiroStatement')
expect('binding-version', 'keiroStatement')
expect('canonical-type', 'keiroStatement')
-- The nodes beneath the declarations must be undisturbed.
expect('aggregate BareStore', 'keiroKeyword')
expect('workqueue bare_jobs', 'keiroKeyword')
expect_uniform('rebuild-group', 'keiroKeyword')
expect_uniform('projection-owner', 'keiroKeyword')
expect('readmodel bare_lookup', 'keiroKeyword')
-- The corpus's only type expression in a `query result =` slot.
expect_uniform('List', 'keiroType', 'query result = List TextList')

-- The non-regression that matters for the decision above: at `value`'s older site the word keeps
-- the Statement class it has everywhere. This is the first assertion either suite makes over
-- this file's signal operation.
open('corpus/workflow-signal-mismatch.keiro')
expect_uniform('value', 'keiroStatement', 'value ReservationConfirmation')

-- The calendar day type (keiro-dsl 6b92bd52). `Day` is the newest spelling of
-- `pMappedTypeExpr`: a calendar date with no time-of-day part and no time zone, so a different
-- type from `Time`, which is an instant. Unlike `Time` it has no alias. It cost one word in the
-- `keiroType` keyword list — but unlike every Language 5 and 6 word before it, a *type* spelling
-- is in neither Section 3 nor Section 4 of spec/keiro-dsl-language-model.md, so the three
-- word-list guards at the bottom of this file cannot see it arrive or go missing. This block is
-- the only thing protecting it.
--
-- Every `Day` assertion below is anchored. The file writes the spelling eleven times and
-- locate() takes the first match, so an unanchored assertion would only re-test `wire Day`.
open('corpus/mapped-calendar-days.keiro')
-- The bare `wire <Type>` line of a `mapped structural value` — plan 18's fourth shape.
expect('wire Day', 'keiroStatement')
expect_uniform('Day', 'keiroType', 'wire Day')
-- The same line wrapped in the one-argument constructor `Optional`.
expect_uniform('Optional', 'keiroType', 'wire Optional Day')
expect_uniform('Day', 'keiroType', 'wire Optional Day')
-- A required wire field of a `mapped structural record`, then an optional one, then the two
-- container forms. The anchors start at the `:` rather than at the field name because two of
-- these field names end in the spelling under test.
expect_uniform('Day', 'keiroType', ': Day required')
expect_uniform('Day', 'keiroType', ': Optional Day optional')
expect_uniform('Day', 'keiroType', ': List Day required')
expect_uniform('Day', 'keiroType', ': Map Day required')
expect_uniform('List', 'keiroType', ': List Day required')
expect_uniform('Map', 'keiroType', ': Map Day required')
-- The non-regression that matters: `Day` is a substring of `LocalDay`, `MaybeLocalDay`, and the
-- field name `optionalDay`, all of which appear in this file, and none may be touched. What
-- protects them is that 'syntax keyword' matches whole words. The offsets below land on the `D`
-- inside each identifier; a rule that matched the spelling anywhere would colour exactly there.
expect_no_group('current LocalDay = initial', 13)
expect_no_group(': MaybeLocalDay required', 12)
expect_no_group('optionalDay as "optionalDay"', 8)
-- 'syntax keyword' is also case sensitive, so the lowercase field name `day` stays plain.
expect_no_group('{ day:LocalDay', 2)
-- The declaration head and clause labels are plan 18's surface, unchanged by this range.
expect('mapped structural value', 'keiroKeyword')
expect_uniform('value', 'keiroStatement', 'mapped structural value LocalDay')
expect('haskell package', 'keiroStatement')
expect_uniform('binding-version', 'keiroStatement')
expect_uniform('unknown-fields', 'keiroStatement')
expect_uniform('on-missing', 'keiroStatement')
-- `LocalDay` at its declaration site is deliberately not asserted as keiroTypeName, for the same
-- reason `MaybeText` is not above: the Vim rule for the optional Declaration-site-type-name
-- refinement has never fired for any introducer. Section 6 marks that class optional.
--
-- The nodes beneath the declarations must be undisturbed.
expect('aggregate CalendarStore', 'keiroKeyword')
expect('workqueue calendar_jobs', 'keiroKeyword')
expect_uniform('rebuild-group', 'keiroKeyword')
expect_uniform('projection-owner', 'keiroKeyword')
expect('readmodel calendar_lookup', 'keiroKeyword')
-- The version-6 preamble this file needs, which colours as any other preamble does.
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 6')

-- Structural text sets (keiro-dsl 01ba6c58). `Set Text` is the language's only two-word type
-- spelling: an unordered collection of text values with no duplicates, unlike the ordered
-- `List Text`. The parser reads `Set` and then *requires* `Text`, so there is no `Set Natural`
-- and no bare `Set` — but syntax/keiro.vim matches `Set` with one ordinary 'syntax keyword',
-- which colours the phrase correctly wherever it is legal. Both halves must be keiroType, or the
-- type renders half-coloured, which is the defect this block exists to catch.
open('corpus/mapped-text-sets.keiro')
expect('wire Set Text', 'keiroStatement')
expect_uniform('Set', 'keiroType', 'wire Set Text')
expect_uniform('Text', 'keiroType', 'wire Set Text')
-- The same line wrapped in the one-argument constructor `Optional`, parenthesised as upstream's
-- fixture writes it. Parentheses are uncoloured punctuation, so they change nothing here.
expect_uniform('Optional', 'keiroType', 'wire Optional (Set Text)')
expect_uniform('Set', 'keiroType', 'wire Optional (Set Text)')
-- A required wire field of a `mapped structural record`, then an optional one, then the two
-- container forms. The anchors start at the `:` so they cannot land inside a field name.
expect_uniform('Set', 'keiroType', ': Set Text required')
expect_uniform('Set', 'keiroType', ': Optional (Set Text) optional')
expect_uniform('Set', 'keiroType', ': List (Set Text) required')
expect_uniform('Set', 'keiroType', ': Map (Set Text) required')
expect_uniform('List', 'keiroType', ': List (Set Text) required')
expect_uniform('Map', 'keiroType', ': Map (Set Text) required')
-- `module=Conformance.StructuralTextSets.Domain` is an *unquoted* slot, so no string rule
-- protects it, and both `Set` and `Text` are substrings of `StructuralTextSets`. What protects
-- them is that 'syntax keyword' matches whole words: offset 29 is the `T` of the inner `Text`
-- and offset 33 the `S` of the inner `Set`, and neither may carry a group.
expect_no_group('module=Conformance.StructuralTextSets.Domain', 29)
expect_no_group('module=Conformance.StructuralTextSets.Domain', 33)
-- 'syntax keyword' is also case sensitive and matches whole words, so the lowercase plural in
-- the context name `structural-text-sets` stays plain: offset 24 is the `s` that begins `sets`.
-- (Its neighbours do not, and that is long-standing, deliberate behaviour: `-` is not a keyword
-- character, so the segments `structural` and `text` of a dashed wire word are coloured as the
-- modifier and the lowercase type they are spelled like. Nothing here changes that.)
expect_no_group('context structural-text-sets', 24)
-- The declaration head and clause labels are plan 18's surface, unchanged by this range.
expect('mapped structural value', 'keiroKeyword')
expect_uniform('value', 'keiroStatement', 'mapped structural value TextLabels')
expect('haskell package', 'keiroStatement')
expect_uniform('binding-version', 'keiroStatement')
expect_uniform('unknown-fields', 'keiroStatement')
expect_uniform('on-missing', 'keiroStatement')
-- The nodes beneath the declarations must be undisturbed, including this file's `replay-only`
-- transition, which no other verbatim upstream sample in the corpus carries beside a new type.
expect('aggregate LabelStore', 'keiroKeyword')
expect_uniform('replay-only', 'keiroModifier')
expect('workqueue label_jobs', 'keiroKeyword')
expect_uniform('rebuild-group', 'keiroKeyword')
expect_uniform('projection-owner', 'keiroKeyword')
expect('readmodel label_lookup', 'keiroKeyword')
-- The version-6 preamble this file needs, which colours as any other preamble does.
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 6')

-- The non-regression that matters, and the first of its kind: `Set` is the *head* of `Settle`,
-- `Settled`, `SettleEntry`, `TicketSettled`, and `EntrySettled`, which have been in these three
-- corpus files since plans 12, 14, and 15 — files the upstream range that added `Set` never
-- touched, so no assertion over the new sample could notice them being recoloured. What protects
-- them is that 'syntax keyword' never matches a word prefix. Each offset below lands on the `S`
-- that begins the spelling under test.
open('corpus/language-version-4.keiro')
expect_no_group('goto Settled', 5)
expect_no_group('command SettleEntry', 8)
expect_no_group('emit EntrySettled', 10)
open('corpus/language-version-3.keiro')
expect_no_group('states Open Settled', 12)
open('corpus/transition-implementation-hole.keiro')
expect_no_group('command Settle {', 8)
expect_no_group('emit TicketSettled', 11)

-- The regression guard for the whole follow-'.' decision on the two roots. `cmd` is a
-- user-chosen wire word in five corpus files (`id CommandId prefix=cmd`), and an unconditional
-- rule would recolour every one of them. Asserted against the oldest corpus file, so a future
-- "simplification" of the rule fails here rather than silently restyling verbatim upstream
-- samples. Offset 7 is the 'c' of `cmd` within `prefix=cmd`.
open('corpus/reservation.keiro')
expect_no_group('prefix=cmd', 7)

-- The fourth `mapped` family: refined byte policies (keiro-dsl e548fffd).
--
-- `mapped refined X { ... wire base16-bytes }` hands admission and canonicalization of a value to
-- a keiro-owned policy. It costs exactly two words — the bare family word `refined` and the dashed
-- wire policy `base16-bytes` — and every other clause label in the block is borrowed from the three
-- older families, so this block is the whole of the new surface. The defect before these rules:
-- `mapped` coloured beside a plain `refined`, and `wire` coloured beside a plain `base16-bytes`.
open('corpus/mapped-refined-base16.keiro')
expect('mapped refined ContentHash', 'keiroKeyword')
expect_uniform('refined', 'keiroModifier', 'mapped refined ContentHash')
-- The name after the family word stays plain under Vim, exactly as it does after `nominal` and
-- `opaque`: the keiroTypeName rule that would claim it has been inert since it was written, because
-- 'syntax keyword' outranks a 'syntax match' beginning at the same column and the scan resumes past
-- the introducer. Section 6 of spec/keiro-dsl-language-model.md marks that class an *optional*
-- refinement, so this is compliant; the Shiki package does claim the name. Offset 15 is the `C`.
expect_no_group('mapped refined ContentHash', 15)
-- The wire policy, in one whole token. A rule matching only a leading segment would leave `-bytes`
-- plain and a first-character check would pass anyway, which is the failure mode the dashed matches
-- exist to prevent. `base16-bytes` is also the first keyword in the language to contain a digit, so
-- requiring one uniform group over all twelve characters doubles as the guard that no keiroNumber
-- match splits it — none can, because they all require '\<' before the digits and in `base16` the
-- '1' follows the word character 'e'.
expect('wire base16-bytes', 'keiroStatement')
expect_uniform('base16-bytes', 'keiroStatement')
-- `module=Conformance.RefinedBase16.Domain` is an *unquoted* slot, so no string rule protects it,
-- and it carries both new spellings in capitalised form inside one identifier. 'syntax keyword' is
-- case sensitive, which is the only thing keeping them out of it. Offset 19 is the `R` of
-- `Refined` and offset 26 the `B` of `Base16`.
expect_no_group('module=Conformance.RefinedBase16.Domain', 19)
expect_no_group('module=Conformance.RefinedBase16.Domain', 26)
-- `shape-hash="refined-base16-v1"` is the corpus's only place where a keyword spelling sits inside
-- a string that is not a comment. keiroString is a region that admits only keiroStringEscape, so
-- every character of the literal must be keiroString and none of it a modifier — while the clause
-- label in front of it keeps its own group, proving the region wins only where it should.
expect_uniform('shape-hash', 'keiroStatement')
expect_uniform('"refined-base16-v1"', 'keiroString')
-- `context refined-base16` is a user-chosen wire word whose first segment is spelled exactly like
-- the family word, and Vim DOES colour that segment: '-' is not a keyword character, so `refined`
-- there is a whole word. That is long-standing behaviour shared by every dashed wire word in the
-- corpus (`structural` inside `context structural-text-sets`), pinned here so a future "fix" has to
-- be deliberate. What must stay plain is the tail, where the digits live: offset 16 is its `b`.
expect_uniform('refined', 'keiroModifier', 'context refined-base16')
expect_no_group('context refined-base16', 16)
-- The sibling declaration heads and the borrowed clause labels, unchanged by this range.
expect('mapped structural value MaybeContentHash', 'keiroKeyword')
expect_uniform('structural', 'keiroModifier', 'mapped structural value MaybeContentHash')
expect_uniform('value', 'keiroStatement', 'mapped structural value MaybeContentHash')
expect_uniform('record', 'keiroModifier', 'mapped structural record HashEnvelope')
expect('haskell package', 'keiroStatement')
expect_uniform('binding-version', 'keiroStatement')
expect_uniform('canonical-type', 'keiroStatement')
expect_uniform('unknown-fields', 'keiroStatement')
-- The nodes beneath the declarations must be undisturbed, including this file's `replay-only`
-- transition and its `snapshot` block, which is where the string literal above lives.
expect('aggregate HashStore', 'keiroKeyword')
expect_uniform('replay-only', 'keiroModifier')
expect('workqueue hash_jobs', 'keiroKeyword')
expect_uniform('rebuild-group', 'keiroKeyword')
expect_uniform('projection-owner', 'keiroKeyword')
expect('readmodel hash_lookup', 'keiroKeyword')
-- The version-6 preamble this file needs, which colours as any other preamble does.
expect_uniform('keiro-dsl', 'keiroStatement', 'language keiro-dsl 6')

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

-- 96 -> 97 and 31 -> 32 at keiro-dsl 4523b52, which added the version preamble's `language`
-- (bare) and `keiro-dsl` (dashed). 97 -> 99 at keiro-dsl fcd6748, which added the nominal
-- binding words `nominal` and `using`, both bare. 99 -> 100 at keiro-dsl 8b0f55b, which added
-- the transition clause word `implementation`. 100 -> 139 and 32 -> 56 at keiro-dsl 9fb54d56,
-- the Language 5 and 6 surface: 39 bare and 24 dashed words (the four dashed projection-catalog
-- introducers among them). 139 -> 140 and 56 -> 57 at keiro-dsl e548fffd, which added the fourth
-- `mapped` family: the bare family word `refined` and the dashed wire policy `base16-bytes`.
-- Section 3 is unchanged throughout: none of those words is reserved.
--
-- The scalar expression roots `reg` and `cmd` are deliberately NOT in the bare grid, even
-- though keiro.vim colours them: expect_all_keywordish probes each grid word in a scratch
-- buffer one word per line, where a root correctly is not a keyword because no '.' follows it.
-- They are covered by the hand-named assertions above instead.
expect_count('reserved-word', #reserved, 72)
expect_count('bare contextual-keyword', #bare, 140)
expect_count('dashed contextual-keyword', #dashed, 57)

expect_all_keywordish('reserved', reserved)
expect_all_keywordish('contextual', bare)
expect_all_keywordish('contextual-dashed', dashed)

print(string.format('\n%d checks, %d failures', checks, failures))
if failures > 0 then
  vim.cmd('cquit 1')
else
  vim.cmd('quitall')
end
