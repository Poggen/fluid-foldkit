import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import postcss, { Rule } from 'postcss'

const styles = new URL('../../registry/charts/src/styles/', import.meta.url)
const read = (file: string) => readFileSync(new URL(file, styles), 'utf8')
const sourceSelectors = [
  'body .ts-chart-surface > .ts-chart-tooltip',
  'body .ts-chart-surface:not(:hover):not(:focus-within) > .ts-chart-tooltip:not(.bkm-heatmap-tooltip)',
  'body .ts-chart-surface:not(:hover):not(:has(:focus-visible)) > .ts-chart-tooltip:not(.bkm-heatmap-tooltip)',
]

test('runtime chart source differs only by three native tooltip owner exclusions', () => {
  const original = read('upstream.css')
  expect(createHash('sha256').update(original).digest('hex')).toBe(
    '10d3b87fb1b41c4ec16a498381eb194124bb5a611411c159e17f711927ae185c',
  )
  let expected = original
  for (const selector of sourceSelectors) {
    const before = `${selector} {`
    expect(expected.split(before)).toHaveLength(2)
    expected = expected.replace(before, `${selector}:not([data-bkm-tooltip-motion]) {`)
  }
  const runtime = read('upstream-native.css')
  expect(runtime).toBe(expected)
  const declarations = (css: string) => {
    const values: string[] = []
    postcss.parse(css).walkDecls((declaration) => {
      values.push(declaration.toString())
    })
    return values
  }
  expect(declarations(runtime)).toEqual(declarations(original))
})

test('public stylesheet loads the owner-adapted source and never restores important native opacity', () => {
  const entry = read('../styles.css')
  expect(entry).toContain("@import './styles/upstream-native.css';")
  expect(entry).not.toContain("@import './styles/upstream.css';")
  const adapter = read('native-adapter.css')
  expect(adapter).not.toContain('revert-layer')
  postcss.parse(adapter).walkDecls('opacity', (declaration) => {
    const owner = declaration.parent
    if (!(owner instanceof Rule)) return
    const positiveSelector = owner.selector.replaceAll(':not([data-bkm-tooltip-motion])', '')
    if (positiveSelector.includes('[data-bkm-tooltip-motion]')) {
      expect(declaration.important).toBeFalsy()
    }
  })
})
