import { expect, test } from '@playwright/test'
import { Effect } from 'effect'
import { loadBuiltStyles } from './style-contract-helpers'
import { renderGeometrySsr } from './chart-geometry-contracts-ssr'

test('SSR geometry consumes production clipping, category positions and inherited SVG paint', async ({
  page,
}) => {
  const rendered = await Effect.runPromise(renderGeometrySsr(18))
  await loadBuiltStyles(page, '/charts/bar', rendered.html)
  const bar = page.locator('[data-bkm-native-chart="geometry-bar-ssr"]')
  const front = bar.locator('rect[data-ts-key="bars:0:value"]')
  await expect(front).toHaveAttribute('width', '7')
  const width = await front.evaluate((element) => {
    if (!(element instanceof SVGRectElement)) throw new Error('SVG Bar front required')
    return {
      transport: getComputedStyle(element).getPropertyValue('--bkm-bar-target-width').trim(),
      actual: element.getBBox().width,
    }
  })
  expect(width.transport).toBe('7px')
  expect(width.actual).toBe(7)
  for (const resource of await bar.locator('svg[aria-hidden="true"]').all()) {
    await expect(resource).toHaveCSS('width', '0px')
    await expect(resource).toHaveCSS('height', '0px')
    await expect(resource).toHaveCSS('position', 'absolute')
    await expect(resource).toHaveCSS('overflow', 'hidden')
    await expect(resource).toHaveCSS('transform', 'none')
  }
  const marks = bar.locator('.ts-chart__marks')
  await expect(marks).toHaveCSS('clip-path', /inset\(0(?:px)?\) view-box/u)
  await expect(bar.locator('.ts-chart-surface')).not.toHaveCSS('overflow', 'hidden')
  const axes = bar.locator('[data-ts-key$=":source-y-axes"]')
  await expect(axes).toHaveCount(1)
  await expect(axes).toHaveCSS('clip-path', 'none')
  await expect(axes.locator('text').filter({ hasText: '<b>2000</b>' })).toHaveCount(1)
  const square = bar.locator('rect[data-ts-key^="squares:other:0:"]').first()
  const gradientId = await square.getAttribute('fill')
  expect(gradientId).toMatch(/^url\(#.+\)$/u)
  const paintId = /^url\(#(?<id>[^)]+)\)$/u.exec(gradientId ?? '')?.groups?.id
  if (paintId === undefined) throw new Error('Square must reference its owned gradient')
  const gradient = bar.locator(`linearGradient[id="${paintId}"]`)
  await expect(gradient).toHaveCount(1)
  await expect(gradient).toHaveAttribute('y1', '370')
  await expect(gradient.locator('stop').first()).toHaveCSS('stop-color', 'rgb(209, 78, 131)')
  await expect(gradient.locator('stop').last()).toHaveCSS('stop-color', 'rgb(102, 51, 153)')
  const gradientGeometry = await gradient.evaluate((element) => Number(element.getAttribute('y2')))
  const columnTop = await bar
    .locator('rect[data-ts-key^="squares:other:0:"]')
    .evaluateAll((cells) => Math.min(...cells.map((cell) => Number(cell.getAttribute('y')))))
  expect(gradientGeometry).toBe(columnTop)

  for (const id of ['geometry-scatter-ssr', 'geometry-candle-ssr', 'geometry-composed-ssr']) {
    const chart = page.locator(`[data-bkm-native-chart="${id}"]`)
    const reserve = chart.locator('[data-bkm-server-reserve]')
    await expect(reserve).toHaveCSS('width', '640px')
    await expect(reserve).toHaveCSS('height', '321px')
    await expect(reserve.locator('.ts-chart-surface')).not.toHaveCSS('overflow', 'hidden')
    await expect(reserve).toHaveCSS('color', 'rgb(102, 51, 153)')
    await expect(reserve).toHaveCSS('color-interpolation', 'linearrgb')
    const resources = page.locator(`#${id}-resources`)
    await expect(resources).toHaveCSS('width', '0px')
    await expect(resources).toHaveCSS('height', '0px')
    await expect(resources).toHaveCSS('position', 'absolute')
    await expect(resources).toHaveCSS('overflow', 'hidden')
    await expect(resources).toHaveCSS('color', 'rgb(102, 51, 153)')
    await expect(resources).toHaveCSS('color-interpolation', 'linearrgb')
  }
  await expect(page.locator('#geometry-scatter-ssr-ink circle')).toHaveCSS(
    'fill',
    'rgb(209, 78, 131)',
  )
  await expect(page.locator('#geometry-composed-ssr-ink circle')).toHaveCSS(
    'fill',
    'rgb(209, 78, 131)',
  )
  const candle = page.locator('[data-bkm-native-chart="geometry-candle-ssr"]')
  await expect(candle.locator('[data-ts-key$=":source-y-axes"]')).toHaveCSS('clip-path', 'none')
  await expect(candle.locator('.ts-chart-surface')).not.toHaveCSS('overflow', 'hidden')
  await expect(candle.locator('.ts-chart__marks')).toHaveCSS(
    'clip-path',
    /inset\(0(?:px)?\) view-box/u,
  )
  const body = candle.locator('rect[class$="-body"]').first()
  await expect(body).toHaveAttribute('height', '66.28')
  const candleGeometry = await body.evaluate((element) => {
    if (!(element instanceof SVGRectElement)) throw new Error('Actual candle body required')
    return {
      raw: getComputedStyle(element).getPropertyValue('--bkm-candle-height').trim(),
      height: element.getBBox().height,
    }
  })
  expect(candleGeometry.raw).toBe('66.275px')
  expect(Math.abs(candleGeometry.height - (241 * (21 - 10)) / 40)).toBeLessThan(0.0001)
})

for (const [width, expected] of [
  [0, []],
  [18, [9, 209]],
  [450, [225, 425]],
] satisfies ReadonlyArray<readonly [number, ReadonlyArray<number>]>) {
  test(`SSR category labels follow supplied Bar width ${width}`, async ({ page }) => {
    const rendered = await Effect.runPromise(renderGeometrySsr(width))
    await loadBuiltStyles(page, '/charts/bar', rendered.html)
    const labels = page.locator('[data-bkm-bar-category-x-axis] > div')
    expect(
      await labels.evaluateAll((elements) =>
        elements.map((element) => Number.parseFloat(getComputedStyle(element).left)),
      ),
    ).toEqual(expected)
    for (const label of await labels.all()) await expect(label).toHaveCSS('bottom', '12px')
  })
}

test('SSR focused category label hides only the active text', async ({ page }) => {
  const rendered = await Effect.runPromise(renderGeometrySsr(18, true))
  await loadBuiltStyles(page, '/charts/bar', rendered.html)
  const labels = page.locator('[data-bkm-bar-category-x-axis] span')
  await expect(labels.nth(0)).toHaveCSS('opacity', '0')
  await expect(labels.nth(1)).toHaveCSS('opacity', '1')
})

test('SSR fractional Bar width retains exact CSS geometry beyond rounded SVG attributes', async ({
  page,
}) => {
  const rendered = await Effect.runPromise(renderGeometrySsr(18.25))
  await loadBuiltStyles(page, '/charts/bar', rendered.html)
  const front = page.locator(
    '[data-bkm-native-chart="geometry-bar-ssr"] rect[data-ts-key="bars:0:value"]',
  )
  await expect(front).toHaveAttribute('width', '7.13')
  const width = await front.evaluate((element) => {
    if (!(element instanceof SVGRectElement)) throw new Error('Actual Bar front required')
    return {
      raw: getComputedStyle(element).getPropertyValue('--bkm-bar-target-width').trim(),
      width: element.getBBox().width,
    }
  })
  expect(width.raw).toBe('7.125px')
  expect(width.width).toBe(7.125)
})
