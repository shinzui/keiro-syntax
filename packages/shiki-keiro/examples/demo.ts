import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createHighlighter } from 'shiki'
import { keiro } from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../../..')
const src = readFileSync(resolve(repoRoot, 'corpus/reservation.keiro'), 'utf8')

const hl = await createHighlighter({ themes: ['github-light'], langs: [keiro] })
const html = hl.codeToHtml(src, { lang: 'keiro', theme: 'github-light' })

const out = resolve(here, 'keiro-demo.html')
writeFileSync(out, `<!doctype html><meta charset="utf8"><body>${html}</body>`)
console.log('wrote', out)
