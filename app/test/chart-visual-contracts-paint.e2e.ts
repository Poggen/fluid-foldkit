import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers.js'

let code = ''
test.beforeAll(async () => {
  code = await bundleRuntimeFixture(
    fileURLToPath(new URL('./chart-visual-contracts-paint-fixture.ts', import.meta.url)),
  )
})
test.beforeEach(async ({ page }) => {
  await mountRuntimeFixture(page, '/charts/bar', code)
  await expect(page.locator('#bar-section svg.ts-chart')).toBeVisible()
})

test('Bar and Squares consume tooltip stroke/fill fallbacks and independent dot paint', async ({
  page,
}) => {
  const tooltip = page.locator('#visual-bar-tooltip')
  const colors = ['rgb(255, 85, 0)', 'rgb(255, 85, 0)', 'rgb(0, 0, 255)', 'rgb(0, 0, 255)']
  for (let index = 0; index < 5; index += 1) {
    if (index > 0) await page.getByRole('button', { name: 'Next bar paint' }).click()
    await page.getByRole('button', { name: 'Focus bar', exact: true }).click()
    await expect(tooltip).toContainText('B')
    await expect(tooltip).toContainText('-10')
    const swatches = tooltip.locator('span').filter({ hasNot: page.locator('*') })
    const painted = await swatches.evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            getComputedStyle(element).width === '10px' &&
            getComputedStyle(element).height === '10px',
        )
        .map((element) => getComputedStyle(element).backgroundColor),
    )
    const color =
      colors[index] ??
      (await page.locator('#bar-section').evaluate((element) => {
        const probe = document.createElement('span')
        probe.style.color = 'var(--chart-line-primary)'
        element.append(probe)
        const result = getComputedStyle(probe).color
        probe.remove()
        return result
      }))
    const expectedColors = [color, index === 0 ? 'rgb(0, 170, 136)' : color]
    expect(painted).toEqual(expectedColors)
    const marks = page.locator('#bar-section .bkm-hov-dot circle, #bar-section .bkm-hov-dot rect')
    await expect(marks).toHaveCount(2)
    for (const [markIndex, mark] of (await marks.all()).entries())
      await expect(mark).toHaveCSS('fill', expectedColors[markIndex] ?? '')
  }
})

test('Bar real overlay consumes ring override while preserving series fill', async ({ page }) => {
  await page.getByRole('button', { name: 'Toggle ring' }).click()
  await page.getByRole('button', { name: 'Focus bar', exact: true }).click()
  const marks = page.locator('#bar-section .bkm-hov-dot circle, #bar-section .bkm-hov-dot rect')
  await expect(marks).toHaveCount(2)
  await expect(marks.nth(0)).toHaveCSS('stroke', 'rgb(255, 85, 0)')
  await expect(marks.nth(1)).toHaveCSS('stroke', 'rgb(0, 170, 136)')
  const bar = page.locator('#bar-section [class^="bkm-bar-front-"]').first()
  await expect(bar).toHaveCSS('fill', /url\(.*#external-paint/u)
  await page.getByRole('button', { name: 'Override dot color' }).click()
  for (const mark of await marks.all()) await expect(mark).toHaveCSS('stroke', 'rgb(18, 52, 86)')
  await expect(bar).toHaveCSS('fill', /url\(.*#external-paint/u)
})

test('crosshair consumes bounded fade stops, solid fill and dashed stroke', async ({ page }) => {
  const expected = [
    [
      ['0%', '0'],
      ['25%', '1'],
      ['100%', '1'],
    ],
    [
      ['0%', '1'],
      ['60%', '1'],
      ['100%', '0'],
    ],
    [
      ['0%', '0'],
      ['2%', '1'],
      ['50%', '1'],
      ['98%', '1'],
      ['100%', '0'],
    ],
    [],
    [],
  ]
  for (let mode = 0; mode < 5; mode += 1) {
    if (mode > 0) await page.getByRole('button', { name: 'Next crosshair paint' }).click()
    await page.getByRole('button', { name: 'Focus line', exact: true }).click()
    const rule = page.locator('#line-section .bkm-hov-x')
    await expect(rule).toBeVisible()
    expect(
      await rule
        .locator('stop')
        .evaluateAll((nodes) =>
          nodes.map((element) => [
            element.getAttribute('offset'),
            getComputedStyle(element).stopOpacity,
          ]),
        ),
    ).toEqual(expected[mode])
    if (mode === 4) {
      await expect(rule.locator('line')).toHaveCSS('stroke-dasharray', '6px, 4px')
      await expect(rule.locator('line')).toHaveCSS('stroke', 'rgb(29, 73, 111)')
      await expect(rule.locator('rect')).toHaveCount(0)
    } else if (mode === 3) {
      await expect(rule.locator('linearGradient')).toHaveCount(0)
      await expect(rule.locator('rect')).toHaveCSS('fill', 'rgb(29, 73, 111)')
    } else {
      await expect(rule.locator('rect')).toHaveCSS('fill', /url\(.*#.*\)/u)
    }
  }
})

test('mounted loading label keeps real UTF-16 nodes and CSS delay consumption', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Show loading label' }).click()
  const label = page.locator('#line-section output[data-slot="loading-label"]')
  await expect(label).toHaveCSS('display', 'flex')
  await expect(label).toHaveAttribute('aria-live', 'polite')
  const characters = label.locator('[aria-hidden="true"]')
  expect(
    await characters.evaluateAll((nodes) => nodes.map((element) => element.textContent)),
  ).toEqual(['A', '\uD83D', '\uDE00', 'B'])
  expect(
    await characters.evaluateAll((nodes) =>
      nodes.map((element) => getComputedStyle(element).animationDelay),
    ),
  ).toEqual(['0s', '0.25s', '0.5s', '0.75s'])
  for (const character of await characters.all()) {
    await expect(character).toHaveCSS('animation-duration', '1.2s')
    await expect(character).toHaveCSS('animation-name', 'bkm-label-char-4')
    await expect(character).toHaveCSS('animation-iteration-count', 'infinite')
  }
  await expect(label.locator('span:last-child').last()).toHaveText('A😀B')
})

test('event cluster paints capped fan with the full count in first-seen date order', async ({
  page,
}) => {
  const groups = page.locator('#line-section .bkm-evt-cluster')
  await expect(groups).toHaveCount(1)
  await expect(groups.locator('.bkm-evt-item')).toHaveCount(1)
  await expect(groups).toContainText('2')
  await expect(groups).toContainText('A')
  const fanned = groups.locator('.bkm-evt-item')
  await expect(fanned).toHaveCSS('opacity', '0')
  await groups.locator('.bkm-evt-hit').hover()
  await expect(fanned).toHaveCSS('opacity', '1')
  await expect(groups.locator('.bkm-evt-badge')).toHaveCSS('opacity', '0')
  const first = page.locator('#line-section [data-ts-key="evtmarker:0:g0"]')
  const second = page.locator('#line-section [data-ts-key="evtmarker:0:g1"]')
  const x = await Promise.all(
    [first, second].map((group) =>
      group.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).m41),
    ),
  )
  expect(x[0]).toBeGreaterThan(x[1] ?? Infinity)
})
