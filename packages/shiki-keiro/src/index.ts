import type { LanguageRegistration } from 'shiki'
import grammar from '../syntaxes/keiro.tmLanguage.json' with { type: 'json' }

/**
 * Shiki language registration for keiro-dsl.
 *
 * Usage:
 *   import { createHighlighter } from 'shiki'
 *   import { keiro } from 'shiki-keiro'
 *   const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
 *   hl.codeToHtml(src, { lang: 'keiro', theme: 'github-light' })
 */
export const keiro: LanguageRegistration = {
  ...(grammar as unknown as LanguageRegistration),
  name: 'keiro',
  scopeName: 'source.keiro',
  aliases: ['keiro-dsl'],
}

export default keiro
