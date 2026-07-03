import { LanguageRegistration } from 'shiki';

/**
 * Shiki language registration for keiro-dsl.
 *
 * Usage:
 *   import { createHighlighter } from 'shiki'
 *   import { keiro } from 'shiki-keiro'
 *   const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
 *   hl.codeToHtml(src, { lang: 'keiro', theme: 'github-light' })
 */
declare const keiro: LanguageRegistration;

export { keiro as default, keiro };
