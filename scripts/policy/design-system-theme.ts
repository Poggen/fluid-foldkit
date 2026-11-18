import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const directories = [
  'registry/fluid/src',
  'registry/charts/src',
  'registry/fluid/examples/src',
  'registry/charts/examples/src',
  'components/docs',
  'app/src',
]

const stylesheets: (directory: string) => string[] = (directory: string) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? stylesheets(file) : file.endsWith('.css') ? [file] : []
  })

export const prepareDesignSystemTheme = (root: string) => {
  const file = path.join(root, '.verification/design-system-theme.css')
  const css = [
    '@import "tailwindcss";',
    ...directories.flatMap((directory) =>
      stylesheets(path.join(root, directory))
        .sort()
        .map((source) =>
          readFileSync(source, 'utf8').replace(/@(?:import|reference)\s+[^;]+;/gu, ''),
        ),
    ),
  ].join('\n')
  mkdirSync(path.dirname(file), { recursive: true })
  let previous = ''
  try {
    previous = readFileSync(file, 'utf8')
  } catch {}
  if (previous !== css) writeFileSync(file, css)
}
