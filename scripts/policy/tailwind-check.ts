import { moduleReferences } from '../registry/graph.ts'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
import { tailwindFoundations } from './tailwind-foundations.ts'
import { inspectTailwindCss } from './tailwind-policy.ts'
import { upstreamStylesheets } from './tailwind-upstream-styles.ts'
import { rendererStylesheets } from './tailwind-renderer-styles.ts'

const maintained = [
  'registry/fluid/src',
  'registry/charts/src',
  'registry/ramka/src',
  'app/src',
  'registry/fluid/examples',
  'registry/charts/examples',
  'registry/ramka/examples',
  'components/docs',
  'tests/parity/accordion',
]
const excluded = [
  'tests/parity/accordion/source-style.css',
  /* @license Frozen React fixtures import this shared file; maintained entries must not. */
  'registry/charts/examples/family-consumer.css',
  'registry/charts/examples/source-baseline/',
  'registry/fluid/examples/color-scroll-private/source/',
]
const files: (root: string, directory: string) => readonly string[] = (
  root: string,
  directory: string,
) =>
  readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`
    if (
      ['node_modules', 'dist', 'test-results', 'playwright-report'].includes(entry.name) ||
      excluded.some((value) => (value.endsWith('/') ? file.startsWith(value) : file === value))
    )
      return []
    return entry.isDirectory()
      ? files(root, file)
      : /\.(?:css|[cm]?[jt]sx?)$/u.test(file)
        ? [file]
        : []
  })

const importSpecifiers: (file: string, text: string) => readonly string[] = (
  file: string,
  text: string,
) => {
  if (!file.endsWith('.css'))
    return moduleReferences('source.tsx', text).map((reference) => reference.value)
  const values: string[] = []
  postcss.parse(text, { from: file }).walkAtRules('import', (rule) => {
    const match = /^(?:"([^"]+)"|'([^']+)'|url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s)]+))\s*\))/iu.exec(
      rule.params,
    )
    const value = match?.slice(1).find((candidate) => candidate !== undefined)
    if (value === undefined) throw new Error(`${file}: unsupported CSS import ${rule.params}`)
    if (value.includes('\\')) throw new Error(`${file}: escaped CSS imports are unsupported`)
    values.push(value)
  })
  return values
}

export const checkedTailwindStyles = (root: string) => {
  const targets = maintained.flatMap((directory) => files(root, directory))
  const stylesheets = targets.filter((file) => file.endsWith('.css'))
  const failures = stylesheets.flatMap((file) =>
    inspectTailwindCss(file, readFileSync(path.join(root, file), 'utf8'), tailwindFoundations, [
      ...upstreamStylesheets,
      ...rendererStylesheets,
    ]),
  )
  const oracle = path.join(root, 'registry/charts/examples/family-consumer.css')
  for (const file of targets) {
    const text = readFileSync(path.join(root, file), 'utf8')
    if (!/\.(?:test|bun-fixture)\.[cm]?[jt]sx?$/u.test(file)) {
      for (const pattern of ['[:is(&,&_*)', 'html:has(&)'])
        if (text.includes(pattern))
          failures.push(`${file}: copy original owner classes instead of ${pattern} translations`)
    }
    for (const specifier of importSpecifiers(file, text)) {
      const reference = decodeURIComponent(specifier.split(/[?#]/u)[0] ?? specifier)
      if (
        path.resolve(
          root,
          reference.startsWith('/') ? `.${reference}` : path.join(path.dirname(file), reference),
        ) === oracle
      )
        failures.push(`${file}: maintained code cannot import reference-only family-consumer.css`)
    }
  }
  if (failures.length) throw new Error(failures.join('\n'))
  console.log(`Tailwind authoring boundary passes for ${stylesheets.length} maintained stylesheets`)
}

if (import.meta.main) checkedTailwindStyles(process.cwd())
