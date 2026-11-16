import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { checkedTailwindStyles } from './tailwind-check.ts'
import { tailwindFoundations } from './tailwind-foundations.ts'
import { inspectTailwindCss, type Foundation, type PinnedStylesheet } from './tailwind-policy.ts'

const foundations: readonly Foundation[] = [
  {
    file: 'theme.css',
    owner: 'Fluid',
    reason: 'Theme tokens and browser focus defaults',
    selectors: [':root, .light', ':focus-visible'],
    properties: ['outline', 'outline-offset'],
    utilities: ['typeset'],
  },
]
const inspect = (text: string, file = 'theme.css') => inspectTailwindCss(file, text, foundations)

describe('Tailwind authoring boundary', () => {
  test('accepts registered token scopes and browser foundations', () => {
    expect(
      inspect(':root,\n.light { --surface: white } :focus-visible { outline: 1px solid blue }'),
    ).toEqual([])
    expect(
      inspect(
        '@theme inline { --color-surface: var(--surface) } @property --progress { syntax: "<number>"; inherits: true; initial-value: 0 } @keyframes enter { to { opacity: 1 } } @font-face { font-family: Test; src: url(test.woff2) }',
      ),
    ).toEqual([])
  })
  test('rejects component declarations at every ordinary layer', () => {
    for (const sheet of [
      '.card { display: flex }',
      '@layer base { .card { display: flex } }',
      '@media (width > 20rem) { .card { display: flex } }',
    ])
      expect(inspect(sheet)).toHaveLength(1)
    expect(inspect(':root, .light { padding: 20px }')).toHaveLength(1)
    expect(inspect(':focus-visible { outline: 0 }', 'new-component.css')).toHaveLength(1)
    expect(inspect('.card { :focus-visible { outline: 0 } }')).toHaveLength(1)
    expect(inspect('@scope (.card) { :focus-visible { outline: 0 } }')).toHaveLength(1)
    expect(
      inspect('@media (pointer: fine) { :focus-visible { outline: 1px solid blue } }'),
    ).toEqual([])
  })
  test('allows only explicit public utilities and rejects apply aliases', () => {
    expect(inspect('@utility typeset { :where(& h1) { font-size: 28px } }')).toEqual([])
    expect(inspect('@utility card { display: flex }')).toHaveLength(1)
    expect(inspect('@utility typeset { @apply flex }')).toHaveLength(1)
  })
  test('permits original source CSS only with its exact pinned content and path', () => {
    const original = '.source { display: flex }\n'
    const upstream: readonly PinnedStylesheet[] = [
      {
        kind: 'upstream',
        file: 'original.css',
        sha256: '5f49ec7ea0cdcd5b3fbb5055a7c009ab4d4a3d89160ad417bada147360b39b16',
        source: 'https://example.com/pinned/source.css',
      },
    ]
    expect(inspectTailwindCss('original.css', original, [], upstream)).toEqual([])
    expect(
      inspectTailwindCss('original.css', original.replace('flex', 'grid'), [], upstream),
    ).toEqual([
      'original.css: original stylesheet differs from the pinned source at https://example.com/pinned/source.css',
    ])
    expect(inspectTailwindCss('other.css', original, [], upstream)).toHaveLength(1)
  })
  test('refuses malformed stylesheets rather than treating missing evidence as clean', () => {
    expect(() => inspect('.card {')).toThrow()
  })
})

test('maintained scanner excludes frozen sources exactly and discovers new stylesheets', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'tailwind-policy-'))
  try {
    for (const directory of [
      'registry/fluid/src',
      'registry/charts/src',
      'app/src',
      'registry/fluid/examples',
      'components/docs',
      'tests/parity/accordion',
      'registry/charts/examples/source-baseline',
    ])
      mkdirSync(path.join(root, directory), { recursive: true })
    writeFileSync(path.join(root, 'tests/parity/accordion/source-style.css'), 'unclosed {')
    writeFileSync(
      path.join(root, 'registry/charts/examples/source-baseline/frozen.css'),
      'unclosed {',
    )
    writeFileSync(path.join(root, 'registry/charts/examples/family-consumer.css'), 'unclosed {')
    expect(() => checkedTailwindStyles(root)).not.toThrow()
    const entry = path.join(root, 'registry/charts/examples/native.ts')
    for (const specifier of [
      './family-consumer.css',
      './family-consumer.css?inline',
      './family-consumer.css#reference',
    ]) {
      writeFileSync(entry, `import '${specifier}'`)
      expect(() => checkedTailwindStyles(root)).toThrow('reference-only family-consumer.css')
    }
    rmSync(entry)
    const cssEntry = path.join(root, 'registry/charts/examples/native.css')
    for (const statement of [
      '@import url("./family-consumer.css");',
      "@import url('./family-consumer.css?inline') layer(reference);",
      '@import url(./family-consumer.css#reference);',
      '@import "family-consumer.css";',
      '@import "/registry/charts/examples/family-consumer.css";',
      '@import "./family%2dconsumer.css";',
    ]) {
      writeFileSync(cssEntry, statement)
      expect(() => checkedTailwindStyles(root)).toThrow('reference-only family-consumer.css')
    }
    rmSync(cssEntry)
    const translated = path.join(root, 'registry/charts/src/translated.ts')
    for (const value of ['[:is(&,&_*):is(.mark)]:opacity-0', '[html:has(&)_*]:transition-none!']) {
      writeFileSync(translated, `export const className = '${value}'`)
      expect(() => checkedTailwindStyles(root)).toThrow('copy original owner classes')
    }
    rmSync(translated)
    writeFileSync(
      path.join(root, 'tests/parity/accordion/source-style.css-extra.css'),
      '.card { display: flex }',
    )
    expect(() => checkedTailwindStyles(root)).toThrow('source-style.css-extra.css')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('registered browser defaults do not authorize component styling through a different selector', () => {
  expect(
    inspectTailwindCss(
      'registry/fluid/src/styles/scroll-area.css',
      '* { width: 10px; height: 10px; border: 3px solid transparent; background-color: red }',
      tailwindFoundations,
    ),
  ).toHaveLength(4)
  expect(
    inspectTailwindCss(
      'app/src/styles.css',
      'button { background: red; font-size: 32px; margin: 20px }',
      tailwindFoundations,
    ),
  ).toHaveLength(3)
  expect(
    inspectTailwindCss(
      'registry/fluid/src/styles/scroll-area.css',
      '@media (pointer: fine) { * { scrollbar-width: thin; scrollbar-color: gray transparent } }',
      tailwindFoundations,
    ),
  ).toEqual([])
  expect(
    inspectTailwindCss('app/src/styles.css', 'button { cursor: pointer }', tailwindFoundations),
  ).toEqual([])
})
